import { SequenceForm } from "../_components/sequence-form";
import { redirectIfOutreachUiDisabled } from "@/lib/features/outreach-ui";

export default function NewSequencePage() {
  redirectIfOutreachUiDisabled();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New sequence</h1>
      <SequenceForm />
    </div>
  );
}
