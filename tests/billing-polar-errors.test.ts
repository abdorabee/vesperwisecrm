import { describe, expect, it } from "vitest";

import {
  clientBillingErrorMessage,
  isPolarNotFound,
  isSeatPricingError,
  mapPolarRequestError,
  polarErrorMessage,
} from "@/lib/billing/polar-errors";

describe("polar error mapping", () => {
  it("extracts Polar validation detail from HTTP bodies", () => {
    const error = {
      statusCode: 422,
      body: JSON.stringify({
        detail: [
          {
            loc: ["body", "seats"],
            msg: "Seats can only be set for seat-based pricing.",
            type: "value_error",
          },
        ],
      }),
      message: "API error occurred",
    };

    expect(polarErrorMessage(error)).toBe(
      "Seats can only be set for seat-based pricing.",
    );
    expect(isSeatPricingError(error)).toBe(true);
  });

  it("treats 404 Polar responses as missing resources", () => {
    const error = {
      statusCode: 404,
      detail: "Customer not found",
      body: JSON.stringify({ error: "ResourceNotFound", detail: "Customer not found" }),
    };

    expect(isPolarNotFound(error)).toBe(true);
    expect(polarErrorMessage(error)).toBe("Customer not found");
  });

  it("maps credential failures to a safe Polar message", () => {
    expect(
      mapPolarRequestError({ statusCode: 401, message: "Unauthorized" }, "failed").message,
    ).toMatch(/POLAR_ACCESS_TOKEN/);
    expect(
      mapPolarRequestError({ statusCode: 404, message: "missing" }, "failed", "product").message,
    ).toMatch(/POLAR_STARTER_PRODUCT_ID/);
  });

  it("replaces Next.js production digest toasts with a fallback", () => {
    expect(
      clientBillingErrorMessage(
        new Error(
          "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details.",
        ),
        "Could not create checkout",
      ),
    ).toBe("Could not create checkout");
  });
});
