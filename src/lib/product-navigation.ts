import {
  Award,
  BriefcaseBusiness,
  ClipboardCheck,
  Gauge,
  House,
  Kanban,
  PhoneCall,
  PlusCircle,
  Settings,
  Trophy,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { BillingCapability } from "@/lib/billing/entitlements";

export interface ProductNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface ProductNavGroup {
  label: string;
  items: ProductNavItem[];
}

export function getDashboardNavigation({
  isAdmin,
  isPlatformAdmin,
  billingCapabilities,
}: {
  isAdmin: boolean;
  isPlatformAdmin: boolean;
  billingCapabilities?: readonly BillingCapability[];
}): ProductNavGroup[] {
  const has = (capability: BillingCapability) =>
    billingCapabilities === undefined || billingCapabilities.includes(capability);

  return [
    { label: "Workspace", items: [{ href: "/", label: "Dashboard", icon: House, exact: true }] },
    {
      label: "Sales",
      items: [
        ...(has("pipeline") ? [{ href: "/pipeline", label: "Pipeline", icon: Kanban }] : []),
        ...(has("queue") ? [{ href: "/queue", label: "Review queue", icon: ClipboardCheck }] : []),
        ...(isAdmin ? [{ href: "/team/clients", label: "Clients", icon: BriefcaseBusiness }] : []),
      ],
    },
    { label: "Capture", items: has("pipeline") ? [{ href: "/intake", label: "Submit lead", icon: PlusCircle }] : [] },
    {
      label: "Engage",
      items: [
        ...(has("dialer") ? [{ href: "/dialer", label: "Dialer", icon: PhoneCall }] : []),
        ...(has("sequences") ? [{ href: "/sequences", label: "Sequences", icon: Gauge }] : []),
      ],
    },
    ...(has("workflows") ? [{ label: "Automate", items: [{ href: "/workflows", label: "Workflows", icon: Workflow }] }] : []),
    {
      label: "Insights",
      items: [
        { href: "/scorecard", label: "My performance", icon: Trophy },
        ...(isAdmin ? [{ href: "/team/scorecard", label: "Team performance", icon: Award }] : []),
      ],
    },
    ...(isPlatformAdmin ? [{ label: "Platform", items: [{ href: "/platform/email", label: "Administration", icon: Settings }] }] : []),
  ].filter((group) => group.items.length > 0);
}
