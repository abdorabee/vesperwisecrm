import { describe, expect, test } from "vitest";

import { leadCreatedActivityText } from "@/lib/activities/lead-created-text";

describe("lead created activity text", () => {
  test("uses the lead name before the contact name", () => {
    expect(
      leadCreatedActivityText({
        title: "412 Oak St",
        contact_name: "Jane Doe",
      }),
    ).toBe("Lead created: 412 Oak St");
  });

  test("uses the contact name when the lead name is blank", () => {
    expect(
      leadCreatedActivityText({ title: "", contact_name: "Jane Doe" }),
    ).toBe("Lead created: Jane Doe");
    expect(
      leadCreatedActivityText({ title: "   ", first_name: "Jane", last_name: "Doe" }),
    ).toBe("Lead created: Jane Doe");
  });

  test("falls back to the current lead or contact, then untitled", () => {
    expect(
      leadCreatedActivityText(
        { title: "" },
        { leadName: "  ", contactName: "Marcus Whitfield" },
      ),
    ).toBe("Lead created: Marcus Whitfield");
    expect(leadCreatedActivityText({ title: "" })).toBe("Lead created: Untitled lead");
    expect(leadCreatedActivityText({})).not.toContain('""');
  });
});
