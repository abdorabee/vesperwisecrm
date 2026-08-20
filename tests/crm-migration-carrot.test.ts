import { describe, expect, test } from "vitest";
import { carrotAdapter } from "../src/lib/migration/adapters/carrot";
import { suggestMapping } from "../src/lib/migration/adapters/create-adapter";
import { parseCsv } from "../src/lib/leads/csv-import";

const CARROT_CSV = `seller_first_name,seller_last_name,seller_email,seller_phone,street_address,city,state,zip_code,price_asking,motivation,campaign_name,notes,labels,pipeline
Ivy,Seller,ivy@example.com,3123121234,123 Main Street,Naples,FL,76131,500000,Hot,Campaign B,Called twice,wholesale,Pursue`;

describe("Carrot CRM adapter", () => {
  test("maps seller, property, campaign, labels, and pipeline columns", () => {
    const { headers, rows } = parseCsv(CARROT_CSV);
    const mapping = suggestMapping(carrotAdapter, headers);
    const record = carrotAdapter.mapRow(rows[0], mapping);

    expect(mapping).toMatchObject({
      seller_first_name: "firstName",
      seller_phone: "phone",
      street_address: "addressLine1",
      price_asking: "askingPrice",
      campaign_name: "source",
      labels: "tags",
      pipeline: "pipelineStageName",
    });
    expect(record.contact).toMatchObject({
      firstName: "Ivy",
      lastName: "Seller",
      email: "ivy@example.com",
      phone: "3123121234",
      source: "Campaign B",
    });
    expect(record.lead).toMatchObject({
      value: "500000",
      pipelineStageName: "Pursue",
      tags: ["wholesale"],
      notes: "Called twice",
    });
    expect(record.property).toMatchObject({
      addressLine1: "123 Main Street",
      city: "Naples",
      state: "FL",
      postalCode: "76131",
      askingPrice: "500000",
      motivation: "Hot",
    });
  });
});
