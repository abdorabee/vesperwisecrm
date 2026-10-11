import DOMPurify from "isomorphic-dompurify";

const EMAIL_TAGS = ["p", "br", "a", "strong", "em", "ul", "ol", "li", "blockquote"];
const EMAIL_ATTRS = ["href"];

let relHookInstalled = false;

function ensureLinkRelHook(): void {
  if (relHookInstalled) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName !== "A") return;
    node.setAttribute("rel", "noopener noreferrer");
  });
  relHookInstalled = true;
}

export function sanitizeHtml(html: string | null | undefined): string | null {
  if (!html?.trim()) {
    return null;
  }

  ensureLinkRelHook();
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: EMAIL_TAGS,
    ALLOWED_ATTR: EMAIL_ATTRS,
    ALLOW_DATA_ATTR: false,
  }).trim();

  return clean.length > 0 ? clean : null;
}

export function stripHtmlTags(html: string | null | undefined): string {
  if (!html?.trim()) {
    return "";
  }

  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).trim();
}
