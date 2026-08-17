export function polarStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as { statusCode?: unknown }).statusCode;
  return typeof status === "number" ? status : null;
}

function messagesFromDetail(detail: unknown): string[] {
  if (typeof detail === "string" && detail.trim()) {
    return [detail.trim()];
  }
  if (!Array.isArray(detail)) {
    return [];
  }
  return detail.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [item.trim()];
    if (item && typeof item === "object" && "msg" in item) {
      const msg = (item as { msg?: unknown }).msg;
      return typeof msg === "string" && msg.trim() ? [msg.trim()] : [];
    }
    return [];
  });
}

function messagesFromBody(body: unknown): string[] {
  if (typeof body !== "string" || !body.trim()) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object") return [];
    const record = parsed as { detail?: unknown; error?: unknown; message?: unknown };
    const fromDetail = messagesFromDetail(record.detail);
    if (fromDetail.length > 0) return fromDetail;
    if (typeof record.message === "string" && record.message.trim()) {
      return [record.message.trim()];
    }
    if (typeof record.error === "string" && record.error.trim() && record.error !== "ResourceNotFound") {
      return [record.error.trim()];
    }
  } catch {
    if (body.length <= 280) return [body];
  }
  return [];
}

export function polarErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Billing request failed";
  }

  const polar = error as {
    body?: unknown;
    detail?: unknown;
    message?: unknown;
  };

  const fromDetail = messagesFromDetail(polar.detail);
  if (fromDetail.length > 0) return fromDetail.join("; ");

  const fromBody = messagesFromBody(polar.body);
  if (fromBody.length > 0) return fromBody.join("; ");

  if (typeof polar.message === "string" && polar.message.trim()) {
    return polar.message.trim();
  }

  return "Billing request failed";
}

export function isPolarNotFound(error: unknown): boolean {
  if (polarStatusCode(error) === 404) return true;
  const message = polarErrorMessage(error).toLowerCase();
  return message.includes("not found") || message.includes("does not exist");
}

export function isSeatPricingError(error: unknown): boolean {
  const message = polarErrorMessage(error).toLowerCase();
  if (!message.includes("seat")) return false;
  return (
    message.includes("seat-based") ||
    message.includes("can only") ||
    message.includes("required")
  );
}

export function mapPolarRequestError(
  error: unknown,
  fallback: string,
  kind: "product" | "generic" = "generic",
): Error {
  const status = polarStatusCode(error);
  if (status === 401 || status === 403) {
    return new Error(
      "Polar rejected the billing credentials. Confirm POLAR_ACCESS_TOKEN and its checkout scopes.",
    );
  }
  if (status === 404 && kind === "product") {
    return new Error(
      "Polar could not find that product. Confirm POLAR_STARTER_PRODUCT_ID / POLAR_TEAM_PRODUCT_ID match POLAR_ENVIRONMENT.",
    );
  }
  const message = polarErrorMessage(error);
  return new Error(message === "Billing request failed" ? fallback : message);
}

export function clientBillingErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (
    message.includes("Server Components render") ||
    message.includes("omitted in production")
  ) {
    return fallback;
  }
  return message;
}
