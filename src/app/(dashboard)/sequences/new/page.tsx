import { SequenceForm } from "../_components/sequence-form";

export default function NewSequencePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New sequence</h1>
      <SequenceForm />
    </div>
  );
}
