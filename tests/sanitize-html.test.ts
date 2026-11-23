import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sanitizeHtml, stripHtmlTags } from "@/lib/email/sanitize-html";

describe("sanitizeHtml", () => {
  test("returns null for null, undefined, and whitespace", () => {
    expect(sanitizeHtml(null)).toBeNull();
    expect(sanitizeHtml(undefined)).toBeNull();
    expect(sanitizeHtml("")).toBeNull();
    expect(sanitizeHtml("   \n\t  ")).toBeNull();
  });

  test("strips script, img, and style while allowing p, a[href], and strong", () => {
    const clean = sanitizeHtml(
      `<p>Hello <strong>there</strong></p><script>alert(1)</script><img src="x" alt="x"><style>body{display:none}</style><a href="https://ok.example">link</a>`,
    );

    expect(clean).toContain("<p>");
    expect(clean).toContain("<strong>there</strong>");
    expect(clean).toContain("<a");
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("alert(1)");
    expect(clean).not.toContain("<img");
    expect(clean).not.toContain("<style");
  });

  test("keeps https hrefs and sets rel=noopener noreferrer on anchors", () => {
    const clean = sanitizeHtml(`<a href="https://evil.example">x</a>`);

    expect(clean).toContain('href="https://evil.example"');
    expect(clean).toContain('rel="noopener noreferrer"');
    expect(clean).toContain(">x</a>");
  });

  test("strips data attributes", () => {
    const clean = sanitizeHtml(`<p data-secret="token" data-x="1">Hi</p>`);

    expect(clean).toContain("<p>");
    expect(clean).toContain("Hi");
    expect(clean).not.toContain("data-secret");
    expect(clean).not.toContain("data-x");
    expect(clean).not.toContain("token");
  });

  test("returns null when sanitizing leaves no markup", () => {
    expect(sanitizeHtml("<script>alert(1)</script>")).toBeNull();
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBeNull();
  });
});

describe("stripHtmlTags", () => {
  test("returns empty string for null, undefined, and whitespace", () => {
    expect(stripHtmlTags(null)).toBe("");
    expect(stripHtmlTags(undefined)).toBe("");
    expect(stripHtmlTags("")).toBe("");
    expect(stripHtmlTags("   ")).toBe("");
  });

  test("leaves inner text only", () => {
    expect(stripHtmlTags("<p>Hello <strong>there</strong></p>")).toBe(
      "Hello there",
    );
    expect(stripHtmlTags('<a href="https://evil.example">click</a>')).toBe(
      "click",
    );
  });
});
