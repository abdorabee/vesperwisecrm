import { describe, expect, test } from "vitest";
import { detectSourceCrm } from "../src/lib/migration/detect-source";
import { hubspotAdapter } from "../src/lib/migration/adapters/hubspot";
import { goHighLevelAdapter } from "../src/lib/migration/adapters/gohighlevel";
import { pipedriveAdapter } from "../src/lib/migration/adapters/pipedrive";
import { followUpBossAdapter } from "../src/lib/migration/adapters/follow-up-boss";
import { suggestMapping } from "../src/lib/migration/adapters/create-adapter";

describe("detectSourceCrm", () => {
  test("prefers Carrot when seller_* opportunity headers are present", () => {
    const adapter = detectSourceCrm([
      "seller_first_name",
      "seller_phone",
      "street_address",
      "price_asking",
      "motivation",
      "campaign_name",
      "notes",
      "labels",
    ]);
    expect(adapter.id).toBe("carrot");
  });

  test("respects an explicit source even when headers look generic", () => {
    const adapter = detectSourceCrm(["Name", "Email"], "hubspot");
    expect(adapter.id).toBe("hubspot");
  });

  test("falls back to generic below the detection threshold", () => {
    const adapter = detectSourceCrm(["foo", "bar"]);
    expect(adapter.id).toBe("generic");
  });
});

describe("other source adapters", () => {
  test("maps HubSpot deal export headers", () => {
    const mapping = suggestMapping(hubspotAdapter, [
      "firstname",
      "lastname",
      "email",
      "phone",
      "dealname",
      "amount",
      "dealstage",
      "closedate",
    ]);
    expect(mapping).toMatchObject({
      firstname: "firstName",
      dealname: "title",
      amount: "value",
      dealstage: "pipelineStageName",
      closedate: "contractCloseDate",
    });
  });

  test("maps GoHighLevel opportunity headers", () => {
    const mapping = suggestMapping(goHighLevelAdapter, [
      "firstName",
      "lastName",
      "email",
      "phone",
      "companyName",
      "monetaryValue",
      "pipelineStage",
      "address1",
      "postalCode",
      "tags",
    ]);
    expect(mapping).toMatchObject({
      firstName: "firstName",
      companyName: "company",
      monetaryValue: "value",
      pipelineStage: "pipelineStageName",
      address1: "addressLine1",
      tags: "tags",
    });
  });

  test("maps Pipedrive people/deal headers", () => {
    const mapping = suggestMapping(pipedriveAdapter, [
      "name",
      "email",
      "phone",
      "org_name",
      "title",
      "value",
      "stage",
    ]);
    expect(mapping).toMatchObject({
      name: "fullName",
      org_name: "company",
      stage: "pipelineStageName",
    });
  });

  test("maps Follow Up Boss people headers", () => {
    const mapping = suggestMapping(followUpBossAdapter, [
      "firstName",
      "lastName",
      "Email 1",
      "Phone 1",
      "Street",
      "City",
      "State",
      "Code",
      "stage",
      "price",
      "source",
    ]);
    expect(mapping).toMatchObject({
      firstName: "firstName",
      "Email 1": "email",
      "Phone 1": "phone",
      Street: "addressLine1",
      Code: "postalCode",
      stage: "pipelineStageName",
      price: "value",
    });
  });
});
