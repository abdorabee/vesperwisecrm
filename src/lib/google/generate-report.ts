import { google } from "googleapis";
import { getAuthorizedGoogleClient } from "@/lib/google/client";
import type { LeadDetail } from "@/lib/queries/leads";

const EMPTY = "—";

function formatCurrency(value: number | null): string {
  return value == null ? EMPTY : `$${Number(value).toLocaleString()}`;
}

function buildReportText(lead: LeadDetail): string {
  const contact = lead.contact;
  const property = lead.property;
  const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const address = property
    ? [
        property.address_line1,
        property.address_line2,
        property.city,
        property.state,
        property.postal_code,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const lines = [
    `Property Report — ${lead.title}`,
    "",
    "Contact",
    `Name: ${contactName || EMPTY}`,
    `Phone: ${contact.phone ?? EMPTY}`,
    `Email: ${contact.email ?? EMPTY}`,
    "",
  ];

  if (property) {
    lines.push(
      "Property",
      `Address: ${address || EMPTY}`,
      `Beds / Baths / Sq ft: ${property.bedrooms ?? EMPTY} / ${property.bathrooms ?? EMPTY} / ${property.square_feet ?? EMPTY}`,
      `Asking price: ${formatCurrency(property.asking_price)}`,
      "",
      "Condition",
      `Overall: ${property.condition ?? EMPTY}`,
      `Updates done: ${property.updates_done ?? EMPTY}`,
      `Updates needed: ${property.updates_needed ?? EMPTY}`,
      `Roof: ${property.roof_condition ?? EMPTY}`,
      `Flooring: ${property.flooring_condition ?? EMPTY}`,
      `Kitchen / bath: ${property.kitchen_bath_condition ?? EMPTY}`,
      `Frame / siding: ${property.frame_siding_condition ?? EMPTY}`,
      `Windows: ${property.windows_condition ?? EMPTY}`,
      `Basement: ${property.basement_type ?? EMPTY}`,
      `Walls: ${property.walls_condition ?? EMPTY}`,
      `Electrical / plumbing: ${property.electrical_plumbing_condition ?? EMPTY}`,
      `Furnace: ${property.furnace_condition ?? EMPTY}`,
      `Water heater: ${property.water_heater_condition ?? EMPTY}`,
      `AC: ${property.ac_condition ?? EMPTY}`,
      `Mortgage: ${property.mortgage ?? EMPTY}`,
      "",
      "Deal",
      `Occupancy: ${property.occupancy_status ?? EMPTY}`,
      `Tenant duration / rent: ${property.tenant_duration_rent ?? EMPTY}`,
      `Motivation: ${property.motivation ?? EMPTY}`,
      `Timeline: ${property.timeline ?? EMPTY}`,
      `Follow-up contact: ${property.follow_up_contact ?? EMPTY}`,
      "",
      "Notes",
      property.notes ?? EMPTY,
    );
  } else {
    lines.push("No property details captured yet.");
  }

  return lines.join("\n");
}

export async function generatePropertyReportDoc(
  accountId: string,
  lead: LeadDetail,
): Promise<string> {
  const { client, integration } = await getAuthorizedGoogleClient(accountId);
  const docs = google.docs({ version: "v1", auth: client });
  const drive = google.drive({ version: "v3", auth: client });

  const title = `Property Report — ${lead.title} — ${new Date().toLocaleDateString()}`;

  const { data: doc } = await docs.documents.create({ requestBody: { title } });
  const documentId = doc.documentId;
  if (!documentId) {
    throw new Error("Google Docs did not return a document id");
  }

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: buildReportText(lead),
          },
        },
      ],
    },
  });

  if (integration.drive_folder_id) {
    const file = await drive.files.get({ fileId: documentId, fields: "parents" });
    const previousParents = (file.data.parents ?? []).join(",");
    await drive.files.update({
      fileId: documentId,
      addParents: integration.drive_folder_id,
      removeParents: previousParents,
      fields: "id, parents",
    });
  }

  return `https://docs.google.com/document/d/${documentId}/edit`;
}
