"use client";

import { FormEvent } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import type { Tables } from "@/lib/supabase/types";
import type { MemberProfile } from "@/lib/queries/members";

interface FilterBarProps {
  stages: Tables<"pipeline_stages">[];
  tags: Tables<"tags">[];
  members: MemberProfile[];
}

const ALL = "__all__";
const UNASSIGNED = "unassigned";

export function FilterBar({ stages, tags, members }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStage = searchParams.get("stage") ?? ALL;
  const currentTag = searchParams.get("tag") ?? ALL;
  const currentOwner = searchParams.get("owner") ?? ALL;
  const currentQuery = searchParams.get("q") ?? "";

  function updateParam(
    key: "stage" | "tag" | "owner" | "q",
    value: string | null,
  ) {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedValue = value?.trim();
    if (!normalizedValue || normalizedValue === ALL) {
      params.delete(key);
    } else {
      params.set(key, normalizedValue);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function submitSmartSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    updateParam("q", String(formData.get("q") ?? ""));
  }

  const hasFilters =
    currentStage !== ALL ||
    currentTag !== ALL ||
    currentOwner !== ALL ||
    currentQuery.length > 0;

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <form
        key={currentQuery}
        className="w-full lg:max-w-md"
        onSubmit={submitSmartSearch}
      >
        <InputGroup>
          <InputGroupAddon>
            <Search className="size-4" />
            <InputGroupText>Smart Search</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            name="q"
            defaultValue={currentQuery}
            placeholder="Name, phone, company, tag, note..."
          />
          {currentQuery && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Clear Smart Search"
                size="icon-xs"
                onClick={() => updateParam("q", null)}
              >
                <X className="size-3.5" />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </form>

      <div className="flex flex-wrap items-center gap-2">
      <Select value={currentStage} onValueChange={(value) => updateParam("stage", value)}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue placeholder="Stage">
            {(value: string) =>
              value === ALL
                ? "All stages"
                : (stages.find((stage) => stage.id === value)?.name ?? "Stage")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All stages</SelectItem>
          {stages.map((stage) => (
            <SelectItem key={stage.id} value={stage.id}>
              {stage.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentTag} onValueChange={(value) => updateParam("tag", value)}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue placeholder="Tag">
            {(value: string) =>
              value === ALL
                ? "All tags"
                : (tags.find((tag) => tag.id === value)?.name ?? "Tag")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All tags</SelectItem>
          {tags.map((tag) => (
            <SelectItem key={tag.id} value={tag.id}>
              {tag.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentOwner} onValueChange={(value) => updateParam("owner", value)}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue placeholder="Owner">
            {(value: string) => {
              if (value === ALL) return "All owners";
              if (value === UNASSIGNED) return "Unassigned";
              return (
                members.find((member) => member.userId === value)?.email ??
                "Owner"
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All owners</SelectItem>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.userId} value={member.userId}>
              {member.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Clear filters
        </Button>
      )}
      </div>
    </div>
  );
}
