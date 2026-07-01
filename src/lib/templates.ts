export interface TemplateContact {
  first_name: string;
  last_name: string | null;
}

export function resolveTemplate(template: string, contact: TemplateContact): string {
  return template
    .replaceAll("{{first_name}}", contact.first_name)
    .replaceAll("{{last_name}}", contact.last_name ?? "");
}
