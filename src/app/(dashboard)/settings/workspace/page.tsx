import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { getWorkspaceSettingsState } from "@/lib/queries/workspace-settings";
import { SettingsPageHeader } from "@/components/settings/settings-primitives";
import { WorkspaceSettingsForm } from "./_components/workspace-settings-form";

export default async function WorkspaceSettingsPage() {
  const [{ settings, schemaAvailable }, membership] = await Promise.all([
    getWorkspaceSettingsState(),
    getCurrentMembership(),
  ]);
  const canEdit = schemaAvailable && (membership ? isAdminRole(membership.role) : false);
  return (
    <div>
      <SettingsPageHeader eyebrow="Workspace" title="General" description="Manage the workspace identity and regional defaults your team uses across VesperWise." />
      <WorkspaceSettingsForm
        settings={settings}
        canEdit={canEdit}
        schemaAvailable={schemaAvailable}
      />
    </div>
  );
}
