import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  getBillingSummary: vi.fn(),
  getBillingState: vi.fn(),
  createPolarCheckout: vi.fn(),
  createPolarCustomerPortalSession: vi.fn(),
  updatePolarSubscriptionCancellation: vi.fn(),
  updatePolarSubscriptionPlan: vi.fn(),
  updatePolarSubscriptionSeats: vi.fn(),
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAdminAccountId: mocks.requireAdminAccountId,
}));

vi.mock("@/lib/billing/access", () => ({
  getBillingSummary: mocks.getBillingSummary,
  getBillingState: mocks.getBillingState,
}));

vi.mock("@/lib/billing/polar", () => ({
  createPolarCheckout: mocks.createPolarCheckout,
  createPolarCustomerPortalSession: mocks.createPolarCustomerPortalSession,
  updatePolarSubscriptionCancellation: mocks.updatePolarSubscriptionCancellation,
  updatePolarSubscriptionPlan: mocks.updatePolarSubscriptionPlan,
  updatePolarSubscriptionSeats: mocks.updatePolarSubscriptionSeats,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import {
  cancelBillingAtPeriodEnd,
  changeBillingPlan,
  changeBillingSeats,
  createBillingCheckout,
  createCustomerPortalSession,
} from "@/lib/actions/billing";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const ORIGIN = "https://app.example.com";
const SUBSCRIPTION_ID = "sub_1";
const POLAR_CUSTOMER_ID = "cus_polar";
const CHECKOUT_URL = "https://polar.example/checkout";
const PORTAL_URL = "https://polar.example/portal";
const OWNER_EMAIL = "owner@example.com";
const ACCOUNT_NAME = "Acme";

type QueryResult = { data: unknown; error: unknown };

function summary(
  overrides: {
    polarSubscriptionId?: string | null;
    providerStatus?: string | null;
    memberCount?: number;
    pendingInviteCount?: number;
    seats?: number;
    polarCustomerId?: string | null;
    cancelAtPeriodEnd?: boolean;
  } = {},
) {
  return {
    accountId: ACCOUNT_ID,
    polarSubscriptionId: "sub_1" as string | null,
    providerStatus: "active" as string | null,
    memberCount: 1,
    pendingInviteCount: 0,
    seats: 5,
    polarCustomerId: "cus_1" as string | null,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function createUserClient(options?: {
  name?: string;
  email?: string;
  accountError?: unknown;
}) {
  const name = options?.name ?? ACCOUNT_NAME;
  const email = options?.email ?? OWNER_EMAIL;
  const accountError = options?.accountError ?? null;
  const selects: Array<{ table: string; eqs: Array<[string, unknown]> }> = [];

  return {
    selects,
    auth: {
      getUser: async () => ({ data: { user: { email } }, error: null }),
    },
    from(table: string) {
      const eqs: Array<[string, unknown]> = [];
      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          eqs.push([column, value]);
          return builder;
        },
        single: async () => {
          selects.push({ table, eqs: [...eqs] });
          if (table === "accounts") {
            return {
              data: accountError ? null : { name },
              error: accountError,
            };
          }
          return { data: null, error: null };
        },
      };
      return builder;
    },
  };
}

function createServiceRoleMock() {
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
    isFilters: Array<[string, unknown]>;
  }> = [];
  const queues: Record<string, QueryResult[]> = {};
  const defaults: Record<string, QueryResult> = {};

  function key(table: string, op: string) {
    return `${table}:${op}`;
  }

  function take(table: string, op: string): QueryResult {
    const queued = queues[key(table, op)];
    if (queued && queued.length > 0) {
      return queued.shift()!;
    }
    return defaults[key(table, op)] ?? { data: null, error: null };
  }

  function from(table: string) {
    let op: "select" | "insert" | "update" | "delete" = "select";
    const eqs: Array<[string, unknown]> = [];
    const isFilters: Array<[string, unknown]> = [];

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        eqs.push([column, value]);
        return builder;
      },
      is(column: string, value: unknown) {
        isFilters.push([column, value]);
        return builder;
      },
      update(payload: unknown) {
        op = "update";
        updates.push({ table, payload, eqs, isFilters });
        return builder;
      },
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(take(table, op)).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    from,
    updates,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
  };
}

function seatsZodMessage(value: number): string {
  try {
    z.number().int().min(1).max(1000).parse(value);
    throw new Error("expected seats schema to fail");
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalVercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

describe("billing actions", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.getBillingSummary.mockReset();
    mocks.getBillingState.mockReset();
    mocks.createPolarCheckout.mockReset();
    mocks.createPolarCustomerPortalSession.mockReset();
    mocks.updatePolarSubscriptionCancellation.mockReset();
    mocks.updatePolarSubscriptionPlan.mockReset();
    mocks.updatePolarSubscriptionSeats.mockReset();
    mocks.createClient.mockReset();
    mocks.createServiceRoleClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.createPolarCheckout.mockResolvedValue({
      id: "chk_1",
      url: CHECKOUT_URL,
      polarCustomerId: POLAR_CUSTOMER_ID,
    });
    mocks.createPolarCustomerPortalSession.mockResolvedValue({
      url: PORTAL_URL,
      polarCustomerId: POLAR_CUSTOMER_ID,
    });
    mocks.updatePolarSubscriptionCancellation.mockResolvedValue(undefined);
    mocks.updatePolarSubscriptionPlan.mockResolvedValue(undefined);
    mocks.updatePolarSubscriptionSeats.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
    if (originalVercelUrl === undefined) {
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    } else {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = originalVercelUrl;
    }
  });

  describe("createBillingCheckout", () => {
    test("returns already-subscribed for a live Polar subscription", async () => {
      mocks.getBillingSummary.mockResolvedValue(
        summary({ polarSubscriptionId: SUBSCRIPTION_ID, providerStatus: "active" }),
      );

      await expect(createBillingCheckout("team", 5)).resolves.toEqual({
        ok: false,
        error: "This workspace already has a Polar subscription",
      });

      expect(mocks.createPolarCheckout).not.toHaveBeenCalled();
      expect(mocks.createClient).not.toHaveBeenCalled();
    });

    test("treats a canceled subscription as not live and proceeds to checkout", async () => {
      mocks.getBillingSummary.mockResolvedValue(
        summary({
          polarSubscriptionId: SUBSCRIPTION_ID,
          providerStatus: "canceled",
          memberCount: 1,
          pendingInviteCount: 0,
          seats: 5,
        }),
      );
      mocks.createClient.mockResolvedValue(createUserClient());
      const serviceRole = createServiceRoleMock();
      serviceRole.setResult("billing_accounts", "update", {
        data: null,
        error: null,
      });
      mocks.createServiceRoleClient.mockReturnValue(serviceRole);

      await expect(createBillingCheckout("team", 5)).resolves.toEqual({
        ok: true,
        checkoutUrl: CHECKOUT_URL,
      });

      expect(mocks.createPolarCheckout).toHaveBeenCalledTimes(1);
    });

    test("returns a paid-seats error when seats are below members plus pending invites", async () => {
      mocks.getBillingSummary.mockResolvedValue(
        summary({
          polarSubscriptionId: null,
          providerStatus: null,
          memberCount: 2,
          pendingInviteCount: 1,
          seats: 5,
        }),
      );

      const result = await createBillingCheckout("team", 2);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.error).toContain("paid seats");
      expect(mocks.createPolarCheckout).not.toHaveBeenCalled();
    });

    test("returns the ZodError message for invalid seats instead of the checkout fallback", async () => {
      await expect(createBillingCheckout("team", 0)).resolves.toEqual({
        ok: false,
        error: seatsZodMessage(0),
      });
      await expect(createBillingCheckout("team", 1001)).resolves.toEqual({
        ok: false,
        error: seatsZodMessage(1001),
      });

      expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
      expect(mocks.createPolarCheckout).not.toHaveBeenCalled();
    });

    test("creates Polar checkout, persists a new polar customer id, and returns the url", async () => {
      mocks.getBillingSummary.mockResolvedValue(
        summary({
          polarSubscriptionId: null,
          providerStatus: null,
          polarCustomerId: null,
          memberCount: 1,
          pendingInviteCount: 0,
        }),
      );
      const user = createUserClient();
      mocks.createClient.mockResolvedValue(user);
      const serviceRole = createServiceRoleMock();
      serviceRole.setResult("billing_accounts", "update", {
        data: null,
        error: null,
      });
      mocks.createServiceRoleClient.mockReturnValue(serviceRole);

      await expect(createBillingCheckout("team", 5)).resolves.toEqual({
        ok: true,
        checkoutUrl: CHECKOUT_URL,
      });

      expect(mocks.createPolarCheckout).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        plan: "team",
        seats: 5,
        customerEmail: OWNER_EMAIL,
        customerName: ACCOUNT_NAME,
        successUrl: `${ORIGIN}/settings/billing?checkout=success`,
        returnUrl: `${ORIGIN}/settings/billing`,
      });
      expect(serviceRole.updates).toHaveLength(1);
      expect(serviceRole.updates[0]?.table).toBe("billing_accounts");
      expect(serviceRole.updates[0]?.payload).toEqual(
        expect.objectContaining({ polar_customer_id: POLAR_CUSTOMER_ID }),
      );
      expect(
        (serviceRole.updates[0]?.payload as { updated_at: string }).updated_at,
      ).toEqual(expect.any(String));
      expect(serviceRole.updates[0]?.eqs).toEqual([["account_id", ACCOUNT_ID]]);
      expect(serviceRole.updates[0]?.isFilters).toEqual([
        ["polar_customer_id", null],
      ]);
    });

    test("maps a Polar throw with a message to that error, not the fallback", async () => {
      mocks.getBillingSummary.mockResolvedValue(
        summary({ polarSubscriptionId: null, providerStatus: null }),
      );
      mocks.createClient.mockResolvedValue(createUserClient());
      mocks.createPolarCheckout.mockRejectedValue({ message: "card declined" });

      await expect(createBillingCheckout("starter", 3)).resolves.toEqual({
        ok: false,
        error: "card declined",
      });
    });

    test("maps a Polar throw with no message to Could not create checkout", async () => {
      mocks.getBillingSummary.mockResolvedValue(
        summary({ polarSubscriptionId: null, providerStatus: null }),
      );
      mocks.createClient.mockResolvedValue(createUserClient());
      mocks.createPolarCheckout.mockRejectedValue({ code: "no message" });

      await expect(createBillingCheckout("team", 3)).resolves.toEqual({
        ok: false,
        error: "Could not create checkout",
      });
    });
  });

  describe("changeBillingPlan", () => {
    test("rejects scale without Polar calls", async () => {
      await expect(changeBillingPlan("scale")).resolves.toEqual({
        ok: false,
        error: "Scale plan changes are not enabled yet",
      });

      expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
      expect(mocks.updatePolarSubscriptionPlan).not.toHaveBeenCalled();
      expect(mocks.updatePolarSubscriptionCancellation).not.toHaveBeenCalled();
    });

    test("returns no-subscription when polarSubscriptionId is missing", async () => {
      mocks.getBillingState.mockResolvedValue(
        summary({ polarSubscriptionId: null }),
      );

      await expect(changeBillingPlan("team")).resolves.toEqual({
        ok: false,
        error: "No Polar subscription is connected to this workspace",
      });

      expect(mocks.updatePolarSubscriptionPlan).not.toHaveBeenCalled();
    });

    test("uncancels first when cancelAtPeriodEnd is true, then updates the plan", async () => {
      mocks.getBillingState.mockResolvedValue(
        summary({
          polarSubscriptionId: SUBSCRIPTION_ID,
          cancelAtPeriodEnd: true,
        }),
      );

      await expect(changeBillingPlan("starter")).resolves.toEqual({ ok: true });

      expect(mocks.updatePolarSubscriptionCancellation).toHaveBeenCalledWith({
        subscriptionId: SUBSCRIPTION_ID,
        cancelAtPeriodEnd: false,
      });
      expect(mocks.updatePolarSubscriptionPlan).toHaveBeenCalledWith({
        subscriptionId: SUBSCRIPTION_ID,
        plan: "starter",
      });
      const cancelOrder =
        mocks.updatePolarSubscriptionCancellation.mock.invocationCallOrder[0]!;
      const planOrder =
        mocks.updatePolarSubscriptionPlan.mock.invocationCallOrder[0]!;
      expect(cancelOrder).toBeLessThan(planOrder);
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/billing");
    });

    test("does not call cancellation when cancelAtPeriodEnd is false", async () => {
      mocks.getBillingState.mockResolvedValue(
        summary({
          polarSubscriptionId: SUBSCRIPTION_ID,
          cancelAtPeriodEnd: false,
        }),
      );

      await expect(changeBillingPlan("team")).resolves.toEqual({ ok: true });

      expect(mocks.updatePolarSubscriptionCancellation).not.toHaveBeenCalled();
      expect(mocks.updatePolarSubscriptionPlan).toHaveBeenCalledWith({
        subscriptionId: SUBSCRIPTION_ID,
        plan: "team",
      });
    });
  });

  describe("changeBillingSeats", () => {
    test("returns no-subscription when polarSubscriptionId is missing", async () => {
      mocks.getBillingSummary.mockResolvedValue(
        summary({ polarSubscriptionId: null }),
      );

      await expect(changeBillingSeats(5)).resolves.toEqual({
        ok: false,
        error: "No Polar subscription is connected to this workspace",
      });

      expect(mocks.updatePolarSubscriptionSeats).not.toHaveBeenCalled();
    });

    test("fails seat capacity before Polar when seats are below members plus invites", async () => {
      mocks.getBillingSummary.mockResolvedValue(
        summary({
          polarSubscriptionId: SUBSCRIPTION_ID,
          memberCount: 2,
          pendingInviteCount: 1,
        }),
      );

      const result = await changeBillingSeats(2);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.error).toContain("paid seats");
      expect(mocks.updatePolarSubscriptionSeats).not.toHaveBeenCalled();
    });

    test("updates Polar seats and revalidates billing", async () => {
      mocks.getBillingSummary.mockResolvedValue(
        summary({
          polarSubscriptionId: SUBSCRIPTION_ID,
          memberCount: 2,
          pendingInviteCount: 0,
        }),
      );

      await expect(changeBillingSeats(4)).resolves.toEqual({ ok: true });

      expect(mocks.updatePolarSubscriptionSeats).toHaveBeenCalledWith({
        subscriptionId: SUBSCRIPTION_ID,
        seats: 4,
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/billing");
    });
  });

  describe("cancelBillingAtPeriodEnd", () => {
    test("returns no-subscription when polarSubscriptionId is missing", async () => {
      mocks.getBillingState.mockResolvedValue(
        summary({ polarSubscriptionId: null }),
      );

      await expect(cancelBillingAtPeriodEnd()).resolves.toEqual({
        ok: false,
        error: "No Polar subscription is connected to this workspace",
      });

      expect(mocks.updatePolarSubscriptionCancellation).not.toHaveBeenCalled();
    });

    test("schedules cancellation at period end and revalidates", async () => {
      mocks.getBillingState.mockResolvedValue(
        summary({ polarSubscriptionId: SUBSCRIPTION_ID }),
      );

      await expect(cancelBillingAtPeriodEnd()).resolves.toEqual({ ok: true });

      expect(mocks.updatePolarSubscriptionCancellation).toHaveBeenCalledWith({
        subscriptionId: SUBSCRIPTION_ID,
        cancelAtPeriodEnd: true,
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/billing");
    });
  });

  describe("createCustomerPortalSession", () => {
    test("maps a generic Polar throw to Could not open the billing portal", async () => {
      mocks.getBillingState.mockResolvedValue(summary());
      mocks.createClient.mockResolvedValue(createUserClient());
      mocks.createPolarCustomerPortalSession.mockRejectedValue({});

      await expect(createCustomerPortalSession()).resolves.toEqual({
        ok: false,
        error: "Could not open the billing portal",
      });
    });

    test("returns the portal url and remembers polarCustomerId", async () => {
      mocks.getBillingState.mockResolvedValue(
        summary({ polarCustomerId: null }),
      );
      mocks.createClient.mockResolvedValue(createUserClient());
      const serviceRole = createServiceRoleMock();
      serviceRole.setResult("billing_accounts", "update", {
        data: null,
        error: null,
      });
      mocks.createServiceRoleClient.mockReturnValue(serviceRole);

      await expect(createCustomerPortalSession()).resolves.toEqual({
        ok: true,
        url: PORTAL_URL,
      });

      expect(mocks.createPolarCustomerPortalSession).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        polarCustomerId: null,
        customerEmail: OWNER_EMAIL,
        customerName: ACCOUNT_NAME,
        returnUrl: `${ORIGIN}/settings/billing`,
      });
      expect(serviceRole.updates[0]?.payload).toEqual(
        expect.objectContaining({ polar_customer_id: POLAR_CUSTOMER_ID }),
      );
      expect(serviceRole.updates[0]?.eqs).toEqual([["account_id", ACCOUNT_ID]]);
      expect(serviceRole.updates[0]?.isFilters).toEqual([
        ["polar_customer_id", null],
      ]);
    });
  });
});
