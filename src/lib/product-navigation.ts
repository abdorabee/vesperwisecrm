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
}: {
  isAdmin: boolean;
  isPlatformAdmin: boolean;
}): ProductNavGroup[] {
  return [
    { label: "Workspace", items: [{ href: "/", label: "Home", icon: House, exact: true }] },
    {
      label: "Sales",
      items: [
        { href: "/pipeline", label: "Pipeline", icon: Kanban },
        { href: "/queue", label: "Review queue", icon: ClipboardCheck },
        ...(isAdmin ? [{ href: "/team/clients", label: "Clients", icon: BriefcaseBusiness }] : []),
      ],
    },
    { label: "Capture", items: [{ href: "/intake", label: "Submit lead", icon: PlusCircle }] },
    {
      label: "Engage",
      items: [
        { href: "/dialer", label: "Dialer", icon: PhoneCall },
        { href: "/sequences", label: "Sequences", icon: Gauge },
      ],
    },
    { label: "Automate", items: [{ href: "/workflows", label: "Workflows", icon: Workflow }] },
    {
      label: "Insights",
      items: [
        { href: "/scorecard", label: "My performance", icon: Trophy },
        ...(isAdmin ? [{ href: "/team/scorecard", label: "Team performance", icon: Award }] : []),
      ],
    },
    ...(isPlatformAdmin ? [{ label: "Platform", items: [{ href: "/platform/email", label: "Administration", icon: Settings }] }] : []),
  ];
}
