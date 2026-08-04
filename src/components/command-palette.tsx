"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Briefcase,
  ClipboardCheck,
  FolderKanban,
  Kanban,
  Trophy,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  type CommandPaletteResult,
  searchCommandPalette,
} from "@/lib/actions/search";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/components/dashboard-nav";

interface NavCommand {
  href: string;
  label: string;
  icon: LucideIcon;
}

const SEARCH_DEBOUNCE_MS = 200;

function buildNavCommands(isAdmin: boolean): NavCommand[] {
  const links: NavCommand[] = [
    { href: "/pipeline", label: "Pipeline", icon: Kanban },
    { href: "/queue", label: "Lead Queue", icon: ClipboardCheck },
    { href: "/sequences", label: "Sequences", icon: Workflow },
    { href: "/workflows", label: "Workflows", icon: FolderKanban },
    { href: "/scorecard", label: "My Scorecard", icon: Trophy },
  ];

  if (isAdmin) {
    links.push(
      { href: "/team", label: "Team", icon: Users },
      { href: "/team/clients", label: "Clients", icon: Briefcase },
      { href: "/team/scorecard", label: "Employee Scorecard", icon: Award },
    );
  }

  return links;
}

interface CommandPaletteProps {
  isAdmin: boolean;
}

export function CommandPalette({ isAdmin }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandPaletteResult[]>([]);
  const [isSearching, startSearch] = useTransition();

  const navCommands = buildNavCommands(isAdmin);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    function handleOpenEvent() {
      setOpen(true);
    }

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenEvent);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || !trimmed) {
      return;
    }

    const timeout = setTimeout(() => {
      startSearch(async () => {
        const nextResults = await searchCommandPalette(trimmed);
        setResults(nextResults);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query, open]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
    }
  }

  function closeAndReset() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  function goTo(href: string) {
    router.push(href);
    closeAndReset();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search leads, or jump to a page..."
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? "Searching..." : "No results found."}
          </CommandEmpty>

          {results.length > 0 && (
            <CommandGroup heading="Leads">
              {results.map((result) => (
                <CommandItem
                  key={result.leadId}
                  value={`lead-${result.leadId}`}
                  onSelect={() => goTo(`/leads/${result.leadId}`)}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{result.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {result.contactName || "No contact name"}
                      {result.matchReasons.length > 0 &&
                        ` · ${result.matchReasons[0]}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.length > 0 && <CommandSeparator />}

          <CommandGroup heading="Go to">
            {navCommands.map((command) => (
              <CommandItem
                key={command.href}
                value={`nav-${command.label}`}
                onSelect={() => goTo(command.href)}
              >
                <command.icon className="size-4" />
                {command.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
