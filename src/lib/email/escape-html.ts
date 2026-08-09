// Outbound transactional emails interpolate tenant-controlled values (account
// names come from signup metadata, which any self-registered user controls).
// Email clients render HTML, so an unescaped account name is a phishing link
// sent from our own verified sending domain.

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

// Header values must never carry CR/LF -- a newline in a Subject lets the
// caller append arbitrary headers (Bcc, Reply-To) to the outgoing message.
export function sanitizeEmailHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}
