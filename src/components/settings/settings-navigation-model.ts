export interface SettingsNavigationItem {
  href: string;
  label: string;
  adminOnly?: boolean;
}

export interface SettingsNavigationGroup {
  label: string;
  items: SettingsNavigationItem[];
}

const SETTINGS_GROUPS: SettingsNavigationGroup[] = [
  { label: "Personal", items: [{ href: "/settings/profile", label: "Profile" }] },
  {
    label: "Workspace",
    items: [
      { href: "/settings/workspace", label: "General" },
      { href: "/settings/members", label: "Members", adminOnly: true },
      { href: "/settings/routing", label: "Lead routing", adminOnly: true },
      { href: "/settings/billing", label: "Billing", adminOnly: true },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/settings/email", label: "Email", adminOnly: true },
      { href: "/settings/calling", label: "Calling", adminOnly: true },
    ],
  },
  {
    label: "Integrations",
    items: [
      { href: "/settings/integrations", label: "Overview", adminOnly: true },
      { href: "/settings/google", label: "Google", adminOnly: true },
    ],
  },
];

export function isSettingsPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getSettingsNavigationGroups(isAdmin: boolean): SettingsNavigationGroup[] {
  return SETTINGS_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isAdmin || !item.adminOnly),
  })).filter((group) => group.items.length > 0);
}

export function getCurrentSettingsLocation(
  pathname: string,
  groups: SettingsNavigationGroup[],
): SettingsNavigationItem & { groupLabel: string } {
  for (const group of groups) {
    const item = group.items.find((candidate) =>
      isSettingsPathActive(pathname, candidate.href),
    );
    if (item) return { ...item, groupLabel: group.label };
  }

  const fallbackGroup = groups[0] ?? SETTINGS_GROUPS[0];
  const fallbackItem = fallbackGroup.items[0] ?? SETTINGS_GROUPS[0].items[0];
  return { ...fallbackItem, groupLabel: fallbackGroup.label };
}
