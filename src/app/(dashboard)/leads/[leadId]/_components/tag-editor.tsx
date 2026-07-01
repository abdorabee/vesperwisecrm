"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addTagToLead, removeTagFromLead, createTag } from "@/lib/actions/tags";
import type { Tables } from "@/lib/supabase/types";

type TagSummary = Pick<Tables<"tags">, "id" | "name" | "color">;

interface TagEditorProps {
  leadId: string;
  leadTags: TagSummary[];
  allTags: Tables<"tags">[];
}

export function TagEditor({ leadId, leadTags, allTags }: TagEditorProps) {
  const [tags, setTags] = useState<TagSummary[]>(leadTags);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const attachedIds = new Set(tags.map((t) => t.id));
  const available = allTags.filter((t) => !attachedIds.has(t.id));
  const trimmedSearch = search.trim();
  const exactMatch = available.some(
    (t) => t.name.toLowerCase() === trimmedSearch.toLowerCase(),
  );

  function handleAdd(tag: TagSummary) {
    setTags((current) => [...current, tag]);
    setOpen(false);
    setSearch("");

    startTransition(async () => {
      try {
        await addTagToLead(leadId, tag.id, tag.name);
      } catch (error) {
        setTags((current) => current.filter((t) => t.id !== tag.id));
        toast.error(
          error instanceof Error ? error.message : "Failed to add tag",
        );
      }
    });
  }

  function handleCreateAndAdd() {
    if (!trimmedSearch) return;

    startTransition(async () => {
      try {
        const tag = await createTag(trimmedSearch);
        handleAdd(tag);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create tag",
        );
      }
    });
  }

  function handleRemove(tag: TagSummary) {
    setTags((current) => current.filter((t) => t.id !== tag.id));

    startTransition(async () => {
      try {
        await removeTagFromLead(leadId, tag.id, tag.name);
      } catch (error) {
        setTags((current) => [...current, tag]);
        toast.error(
          error instanceof Error ? error.message : "Failed to remove tag",
        );
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
          {tag.name}
          <button
            type="button"
            onClick={() => handleRemove(tag)}
            aria-label={`Remove ${tag.name}`}
            className="rounded-full hover:bg-foreground/10"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="ghost" size="icon-xs" />}>
          <Plus className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or create tag..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {trimmedSearch && !exactMatch ? (
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={handleCreateAndAdd}
                  >
                    Create &quot;{trimmedSearch}&quot;
                  </button>
                ) : (
                  "No tags found."
                )}
              </CommandEmpty>
              <CommandGroup>
                {available.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleAdd(tag)}
                  >
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
