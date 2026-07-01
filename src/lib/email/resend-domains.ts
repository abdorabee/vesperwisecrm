import { getResendClient } from "@/lib/resend/client";
import { mapResendDomainStatus } from "@/lib/email/account-settings";

export interface DnsRecordRow {
  record: string;
  type: string;
  name: string;
  value: string;
  status: string;
}

export interface SendingDomainDetails {
  id: string;
  name: string;
  status: "pending" | "verified" | "failed";
  records: DnsRecordRow[];
}

function mapRecords(
  records: Array<{
    record: string;
    type: string;
    name: string;
    value: string;
    status: string;
  }>,
): DnsRecordRow[] {
  return records.map((record) => ({
    record: record.record,
    type: record.type,
    name: record.name,
    value: record.value,
    status: record.status,
  }));
}

export async function createSendingDomain(
  domainName: string,
): Promise<SendingDomainDetails> {
  const resend = getResendClient();
  const { data, error } = await resend.domains.create({ name: domainName });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to register domain with Resend");
  }

  return {
    id: data.id,
    name: data.name,
    status: mapResendDomainStatus(data.status),
    records: mapRecords(data.records),
  };
}

export async function getSendingDomain(
  resendDomainId: string,
): Promise<SendingDomainDetails> {
  const resend = getResendClient();
  const { data, error } = await resend.domains.get(resendDomainId);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to load domain from Resend");
  }

  return {
    id: data.id,
    name: data.name,
    status: mapResendDomainStatus(data.status),
    records: mapRecords(data.records),
  };
}

export async function verifySendingDomain(
  resendDomainId: string,
): Promise<SendingDomainDetails> {
  const resend = getResendClient();
  const { error: verifyError } = await resend.domains.verify(resendDomainId);

  if (verifyError) {
    throw new Error(verifyError.message);
  }

  return getSendingDomain(resendDomainId);
}

export function getRecommendedDmarcRecord(domain: string): DnsRecordRow {
  return {
    record: "DMARC",
    type: "TXT",
    name: `_dmarc.${domain}`,
    value: "v=DMARC1; p=none;",
    status: "recommended",
  };
}
