import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(html: string | null | undefined): string | null {
  if (!html?.trim()) {
    return null;
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}

export function stripHtmlTags(html: string | null | undefined): string {
  if (!html?.trim()) {
    return "";
  }

  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).trim();
}
