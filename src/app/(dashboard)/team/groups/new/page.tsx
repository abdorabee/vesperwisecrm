import { redirect } from "next/navigation";

export default function LegacyNewGroupPage() {
  redirect("/settings/routing/new");
}
