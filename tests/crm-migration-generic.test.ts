import { describe, expect, test } from "vitest";
import { genericAdapter } from "../src/lib/migration/adapters/generic";
import { suggestMapping } from "../src/lib/migration/adapters/create-adapter";
import { guessMapping, parseCsv } from "../src/lib/leads/csv-import";

const GENERIC_CSV = `Name,Email,Phone,Property Address,Asking Price,Notes
Jane Doe,jane@example.com,555-1234,123 Main St,195000,Motivated seller`;

describe("generic CRM adapter", () => {
  test("guessMapping still maps generic CSV headers for pipeline import", () => {
    const mapping = guessMapping([
      "Name",
      "Email",
      "Phone",
      "Property Address",
      "Asking Price",
    ]);
    expect(mapping).toMatchObject({
      Name: "fullName",
      Email: "email",
      Phone: "phone",
      "Property Address": "addressLine1",
      "Asking Price": "askingPrice",
    });
  });

  test("mapRow produces a canonical contact, lead, and property", () => {
    const { headers, rows } = parseCsv(GENERIC_CSV);
    const mapping = suggestMapping(genericAdapter, headers);
    const record = genericAdapter.mapRow(rows[0], mapping);

    expect(record.contact).toMatchObject({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "555-1234",
      source: "Generic CSV",
    });
    expect(record.lead.value).toBe("195000");
    expect(record.lead.notes).toBe("Motivated seller");
    expect(record.property.addressLine1).toBe("123 Main St");
    expect(record.property.askingPrice).toBe("195000");
  });
});
