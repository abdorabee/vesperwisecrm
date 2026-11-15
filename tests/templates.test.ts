import { describe, expect, test } from "vitest";

import { resolveTemplate } from "@/lib/templates";

describe("resolveTemplate", () => {
  test("replaces first_name and last_name tokens", () => {
    expect(
      resolveTemplate("Hi {{first_name}} {{last_name}}", {
        first_name: "Jane",
        last_name: "Doe",
      }),
    ).toBe("Hi Jane Doe");
  });

  test("replaces a null last_name with an empty string, not 'null'", () => {
    expect(
      resolveTemplate("Hi {{first_name}} {{last_name}}.", {
        first_name: "Jane",
        last_name: null,
      }),
    ).toBe("Hi Jane .");
    expect(
      resolveTemplate("{{last_name}}", { first_name: "Jane", last_name: null }),
    ).not.toContain("null");
  });

  test("leaves unknown tokens unchanged", () => {
    expect(
      resolveTemplate("Hello {{first_name}} {{company}}", {
        first_name: "Jane",
        last_name: "Doe",
      }),
    ).toBe("Hello Jane {{company}}");
  });

  test("replaces every first_name occurrence", () => {
    expect(
      resolveTemplate("{{first_name}}, this is for {{first_name}}", {
        first_name: "Jane",
        last_name: "Doe",
      }),
    ).toBe("Jane, this is for Jane");
  });
});
