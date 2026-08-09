// Inbound SMS carries no account identifier. The only trustworthy signal is
// the number that received the message, so tenant resolution keys off the
// account_phone_numbers mapping. Until that mapping is populated we fall back
// to the contact match -- but only when every match belongs to one account.
// The same seller phone worked by two tenants is routine in wholesaling, and
// guessing writes one tenant's conversation into the other's CRM.

export interface CandidateContact {
  id: string;
  account_id: string;
}

export interface ResolveInboundSmsTenantInput {
  /** Account owning the receiving number, or null when unmapped. */
  mappedAccountId: string | null;
  /** Contacts whose normalized phone digits exactly match the sender. */
  matchedContacts: CandidateContact[];
}

export type InboundSmsTenantResolution =
  | { status: "resolved"; accountId: string; contactIds: string[] }
  | { status: "quarantined"; reason: "unknown_sender" | "ambiguous_tenant" };

export function resolveInboundSmsTenant({
  mappedAccountId,
  matchedContacts,
}: ResolveInboundSmsTenantInput): InboundSmsTenantResolution {
  if (matchedContacts.length === 0) {
    return { status: "quarantined", reason: "unknown_sender" };
  }

  if (mappedAccountId) {
    const scoped = matchedContacts.filter(
      (contact) => contact.account_id === mappedAccountId,
    );
    if (scoped.length === 0) {
      return { status: "quarantined", reason: "unknown_sender" };
    }
    return {
      status: "resolved",
      accountId: mappedAccountId,
      contactIds: scoped.map((contact) => contact.id),
    };
  }

  const accountIds = new Set(
    matchedContacts.map((contact) => contact.account_id),
  );
  if (accountIds.size > 1) {
    return { status: "quarantined", reason: "ambiguous_tenant" };
  }

  const [accountId] = [...accountIds];
  return {
    status: "resolved",
    accountId,
    contactIds: matchedContacts.map((contact) => contact.id),
  };
}
