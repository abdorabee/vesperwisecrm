import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { LeadDetail } from "@/lib/queries/leads";
import type { WorkspaceSettings } from "@/lib/workspace-settings";

const mocks = vi.hoisted(() => ({
  getAuthorizedGoogleClient: vi.fn(),
  getWorkspaceSettingsForAccount: vi.fn(),
  documentsCreate: vi.fn(),
  documentsBatchUpdate: vi.fn(),
  filesGet: vi.fn(),
  filesUpdate: vi.fn(),
}));

vi.mock("@/lib/google/client", () => ({
  getAuthorizedGoogleClient: mocks.getAuthorizedGoogleClient,
}));

vi.mock("@/lib/queries/workspace-settings", () => ({
  getWorkspaceSettingsForAccount: mocks.getWorkspaceSettingsForAccount,
}));

vi.mock("googleapis", () => ({
  google: {
    docs: () => ({
      documents: {
        create: mocks.documentsCreate,
        batchUpdate: mocks.documentsBatchUpdate,
      },
    }),
    drive: () => ({
      files: {
        get: mocks.filesGet,
        update: mocks.filesUpdate,
      },
    }),
  },
}));

import { generatePropertyReportDoc } from "@/lib/google/generate-report";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENT_ID = "doc-1";
const NOW = new Date("2026-11-18T12:00:00.000Z");

const workspace: WorkspaceSettings = {
  id: ACCOUNT_ID,
  name: "Acme",
  timezone: "UTC",
  currencyCode: "USD",
  dateFormat: "iso",
  timeFormat: "24h",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function leadDetail(overrides: Partial<LeadDetail> = {}): LeadDetail {
  return {
    id: "lead-1",
    account_id: ACCOUNT_ID,
    title: "123 Main St",
    contact: {
      first_name: "",
      last_name: null,
      phone: null,
      email: null,
    },
    property: null,
    ...overrides,
  } as LeadDetail;
}

function insertedText(): string {
  const request = mocks.documentsBatchUpdate.mock.calls[0]?.[0] as {
    requestBody: {
      requests: Array<{ insertText: { text: string } }>;
    };
  };
  return request.requestBody.requests[0]?.insertText.text ?? "";
}

describe("generatePropertyReportDoc", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.getAuthorizedGoogleClient.mockReset();
    mocks.getWorkspaceSettingsForAccount.mockReset();
    mocks.documentsCreate.mockReset();
    mocks.documentsBatchUpdate.mockReset();
    mocks.filesGet.mockReset();
    mocks.filesUpdate.mockReset();
    mocks.getAuthorizedGoogleClient.mockResolvedValue({
      client: { kind: "oauth" },
      integration: { drive_folder_id: null },
    });
    mocks.getWorkspaceSettingsForAccount.mockResolvedValue(workspace);
    mocks.documentsCreate.mockResolvedValue({
      data: { documentId: DOCUMENT_ID },
    });
    mocks.documentsBatchUpdate.mockResolvedValue({ data: {} });
    mocks.filesGet.mockResolvedValue({ data: { parents: ["old-folder"] } });
    mocks.filesUpdate.mockResolvedValue({ data: { id: DOCUMENT_ID } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("throws when Google Docs omits documentId and does not update or move", async () => {
    mocks.documentsCreate.mockResolvedValue({ data: {} });

    await expect(
      generatePropertyReportDoc(ACCOUNT_ID, leadDetail(), null),
    ).rejects.toThrow("Google Docs did not return a document id");

    expect(mocks.documentsBatchUpdate).not.toHaveBeenCalled();
    expect(mocks.filesGet).not.toHaveBeenCalled();
    expect(mocks.filesUpdate).not.toHaveBeenCalled();
  });

  test("inserts an empty-property report with em dashes and skips Drive when no folder is set", async () => {
    const url = await generatePropertyReportDoc(
      ACCOUNT_ID,
      leadDetail(),
      null,
    );

    expect(url).toBe(
      `https://docs.google.com/document/d/${DOCUMENT_ID}/edit`,
    );
    const text = insertedText();
    expect(text).toContain("No property details captured yet.");
    expect(text).toContain("Name: —");
    expect(text).toContain("Phone: —");
    expect(text).toContain("Email: —");
    expect(mocks.filesUpdate).not.toHaveBeenCalled();
  });

  test("includes joined address, beds/baths/sqft, and notes when property is present", async () => {
    await generatePropertyReportDoc(
      ACCOUNT_ID,
      leadDetail({
        contact: {
          first_name: "Jane",
          last_name: "Doe",
          phone: "555-0100",
          email: "jane@example.com",
        } as LeadDetail["contact"],
        property: {
          address_line1: "123 Main St",
          address_line2: "Unit 4",
          city: "Austin",
          state: "TX",
          postal_code: "78701",
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1400,
          notes: "Needs roof work",
        } as LeadDetail["property"],
      }),
      null,
    );

    const text = insertedText();
    expect(text).toContain(
      "Address: 123 Main St, Unit 4, Austin, TX, 78701",
    );
    expect(text).toContain("Beds / Baths / Sq ft: 3 / 2 / 1400");
    expect(text).toContain("Needs roof work");
    expect(text).not.toContain("No property details captured yet.");
  });

  test("moves the doc into folderIdOverride even when integration has a folder", async () => {
    mocks.getAuthorizedGoogleClient.mockResolvedValue({
      client: { kind: "oauth" },
      integration: { drive_folder_id: "folder-integration" },
    });

    await generatePropertyReportDoc(
      ACCOUNT_ID,
      leadDetail(),
      "folder-override",
    );

    expect(mocks.filesGet).toHaveBeenCalledWith({
      fileId: DOCUMENT_ID,
      fields: "parents",
    });
    expect(mocks.filesUpdate).toHaveBeenCalledWith({
      fileId: DOCUMENT_ID,
      addParents: "folder-override",
      removeParents: "old-folder",
      fields: "id, parents",
    });
  });

  test("uses the integration drive folder when override is null", async () => {
    mocks.getAuthorizedGoogleClient.mockResolvedValue({
      client: { kind: "oauth" },
      integration: { drive_folder_id: "folder-integration" },
    });
    mocks.filesGet.mockResolvedValue({
      data: { parents: ["old-a", "old-b"] },
    });

    await generatePropertyReportDoc(ACCOUNT_ID, leadDetail(), null);

    expect(mocks.filesUpdate).toHaveBeenCalledWith({
      fileId: DOCUMENT_ID,
      addParents: "folder-integration",
      removeParents: "old-a,old-b",
      fields: "id, parents",
    });
  });
});
