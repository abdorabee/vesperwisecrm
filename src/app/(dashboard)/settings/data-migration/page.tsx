import { requireSettingsAdmin } from "@/lib/settings-access";
import { getStages } from "@/lib/queries/pipeline";
import {
  SettingsPageHeader,
  SettingsSection,
} from "@/components/settings/settings-primitives";
import { MigrationWizard } from "./_components/migration-wizard";

export default async function DataMigrationSettingsPage() {
  await requireSettingsAdmin();
  const stages = await getStages();

  return (
    <div>
      <SettingsPageHeader
        eyebrow="Integrations"
        title="Migrate data"
        description="Move contacts, properties, and pipeline records from another CRM into this workspace with a CSV export."
      />
      <SettingsSection
        title="Import from another CRM"
        description="Choose the source, upload the export, confirm column mapping, and we will create leads without firing automations on historical records."
      >
        <MigrationWizard stages={stages} />
      </SettingsSection>
    </div>
  );
}
