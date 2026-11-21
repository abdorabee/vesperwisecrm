import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAuthorizedCronRequest: vi.fn(),
  createServiceRoleClient: vi.fn(),
  processPendingImportJobs: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/cron/authorize", () => ({
  isAuthorizedCronRequest: mocks.isAuthorizedCronRequest,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/migration/process-job", () => ({
  processPendingImportJobs: mocks.processPendingImportJobs,
}));

const { GET } = await import("@/app/api/cron/process-import-jobs/route");

async function getProcessImportJobs(): Promise<Response> {
  return GET(new Request("http://localhost/api/cron/process-import-jobs"));
}

describe("GET /api/cron/process-import-jobs", () => {
  beforeEach(() => {
    mocks.isAuthorizedCronRequest.mockReset();
    mocks.createServiceRoleClient.mockReset();
    mocks.processPendingImportJobs.mockReset();
  });

  test("returns 401 and does not process jobs when unauthorized", async () => {
    mocks.isAuthorizedCronRequest.mockReturnValue(false);

    const response = await getProcessImportJobs();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(mocks.processPendingImportJobs).not.toHaveBeenCalled();
  });

  test("calls the processor with the service-role client and returns its result", async () => {
    const supabase = { from: vi.fn() };
    const result = { jobs: 2, imported: 4, failed: 1 };
    mocks.isAuthorizedCronRequest.mockReturnValue(true);
    mocks.createServiceRoleClient.mockReturnValue(supabase);
    mocks.processPendingImportJobs.mockResolvedValue(result);

    const response = await getProcessImportJobs();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ importJobs: result });
    expect(mocks.processPendingImportJobs).toHaveBeenCalledTimes(1);
    expect(mocks.processPendingImportJobs).toHaveBeenCalledWith(supabase);
  });
});
