import { describe, expect, test } from "vitest";
import { applyMapping, parseCsv, parseCsvLine } from "@/lib/leads/csv-import";

describe("parseCsvLine", () => {
  test("keeps a comma inside a quoted field", () => {
    expect(parseCsvLine('"Portland, OR",Jane,Doe')).toEqual([
      "Portland, OR",
      "Jane",
      "Doe",
    ]);
  });

  test("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsvLine('"She said ""hello""",next')).toEqual([
      'She said "hello"',
      "next",
    ]);
  });

  test("splits unquoted simple fields", () => {
    expect(parseCsvLine("Jane,Doe,555-0100")).toEqual([
      "Jane",
      "Doe",
      "555-0100",
    ]);
  });

  test("preserves a trailing empty field", () => {
    expect(parseCsvLine("Jane,Doe,")).toEqual(["Jane", "Doe", ""]);
  });
});

describe("parseCsv", () => {
  test("strips a UTF-8 BOM from the header row", () => {
    const parsed = parseCsv("\uFEFFName,Email\nJane,jane@example.com");

    expect(parsed.headers).toEqual(["Name", "Email"]);
    expect(parsed.rows).toEqual([{ Name: "Jane", Email: "jane@example.com" }]);
  });

  test("accepts CRLF line endings", () => {
    const parsed = parseCsv("Name,Email\r\nJane,jane@example.com\r\n");

    expect(parsed.headers).toEqual(["Name", "Email"]);
    expect(parsed.rows).toEqual([{ Name: "Jane", Email: "jane@example.com" }]);
  });

  test("throws when the text is empty", () => {
    expect(() => parseCsv("")).toThrow(
      "CSV must include a header row and at least one lead row",
    );
  });

  test("throws when only a header row is present", () => {
    expect(() => parseCsv("Name,Email")).toThrow(
      "CSV must include a header row and at least one lead row",
    );
  });
});

describe("applyMapping", () => {
  test("splits an unmapped fullName into firstName and lastName", () => {
    const mapped = applyMapping(
      { "Full Name": "Jane Q Doe" },
      { "Full Name": "fullName" },
    );

    expect(mapped.contact.firstName).toBe("Jane");
    expect(mapped.contact.lastName).toBe("Q Doe");
  });

  test("does not overwrite an explicit firstName with fullName", () => {
    const mapped = applyMapping(
      { "Full Name": "Jane Q Doe", First: "Janet" },
      { "Full Name": "fullName", First: "firstName" },
    );

    expect(mapped.contact.firstName).toBe("Janet");
    expect(mapped.contact.lastName).toBe("");
  });

  test("keeps the first mapped header when two headers map to email", () => {
    const mapped = applyMapping(
      {
        "Work Email": "work@example.com",
        "Home Email": "home@example.com",
      },
      {
        "Work Email": "email",
        "Home Email": "email",
      },
    );

    expect(mapped.contact.email).toBe("work@example.com");
  });

  test("skips empty mapping values", () => {
    const mapped = applyMapping(
      { Email: "jane@example.com", Notes: "Motivated seller" },
      { Email: "email", Notes: "" },
    );

    expect(mapped.contact.email).toBe("jane@example.com");
    expect(mapped.property).toEqual({});
  });
});
