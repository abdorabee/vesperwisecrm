import { redirect } from "next/navigation";

export {
  isHiddenOutreachPath,
  isOutreachUiEnabled,
} from "@/lib/features/outreach-ui-enabled";
import { isOutreachUiEnabled } from "@/lib/features/outreach-ui-enabled";

export function redirectIfOutreachUiDisabled(): void {
  if (!isOutreachUiEnabled()) {
    redirect("/");
  }
}
