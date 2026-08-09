# Compact Settings Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ambiguous compact Settings `<select>` with an explicit, grouped navigation menu that shows the current settings group and page.

**Architecture:** Move the existing settings information architecture into a small pure navigation model shared by compact and desktop renderers. Render the compact control with the existing Base UI-backed dropdown-menu primitives, while retaining the desktop sidebar, role filtering, pathname-derived active state, and unsaved-settings confirmation.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript, Tailwind CSS 4, Base UI/shadcn dropdown menu, Lucide icons, Vitest, Playwright browser verification.

## Global Constraints

- Keep existing Settings routes, server behavior, permission filtering, and business logic unchanged.
- Preserve the persistent settings sidebar at `lg` and wider widths.
- Preserve the existing unsaved-settings confirmation contract.
- Use existing dependencies and primitives; add no package.
- The active item must use text, a check icon, and `aria-current="page"`, not color alone.
- The compact trigger must be at least 44px tall, keyboard accessible, focus visible, and safe at 200% text scaling.

---

## File structure

- Create `src/components/settings/settings-navigation-model.ts`: settings groups, role filtering, active-route matching, and current-location derivation.
- Modify `src/components/settings/settings-navigation.tsx`: grouped compact dropdown and unchanged desktop sidebar driven by the shared model.
- Create `tests/settings-navigation.test.ts`: pure model behavior for role filtering and current group/page context.
- Modify `tests/product-foundations-contract.test.ts`: remove the old native-select assumption if present and keep the responsive settings-shell contract.

### Task 1: Extract and test the settings navigation model

**Files:**
- Create: `src/components/settings/settings-navigation-model.ts`
- Create: `tests/settings-navigation.test.ts`

**Interfaces:**
- Produces: `SettingsNavigationGroup`, `getSettingsNavigationGroups(isAdmin: boolean)`, `isSettingsPathActive(pathname: string, href: string)`, and `getCurrentSettingsLocation(pathname: string, groups: SettingsNavigationGroup[])`.
- Consumes: no application state or browser APIs.

- [ ] **Step 1: Write the failing model tests**

```ts
import { describe, expect, test } from "vitest";
import {
  getCurrentSettingsLocation,
  getSettingsNavigationGroups,
} from "../src/components/settings/settings-navigation-model";

describe("settings navigation", () => {
  test("ordinary members only receive supported personal and workspace destinations", () => {
    const groups = getSettingsNavigationGroups(false);
    expect(groups.map((group) => group.label)).toEqual(["Personal", "Workspace"]);
    expect(groups.flatMap((group) => group.items).map((item) => item.href)).toEqual([
      "/settings/profile",
      "/settings/workspace",
    ]);
  });

  test("describes the active page with its settings group", () => {
    const location = getCurrentSettingsLocation(
      "/settings/calling",
      getSettingsNavigationGroups(true),
    );
    expect(location).toMatchObject({ groupLabel: "Communication", label: "Calling" });
  });

  test("falls back to Profile for an unmatched settings route", () => {
    const location = getCurrentSettingsLocation(
      "/settings/unknown",
      getSettingsNavigationGroups(true),
    );
    expect(location.href).toBe("/settings/profile");
  });
});
```

- [ ] **Step 2: Run the model test and verify RED**

Run: `npx vitest run tests/settings-navigation.test.ts`

Expected: FAIL because `settings-navigation-model.ts` does not exist.

- [ ] **Step 3: Implement the pure navigation model**

```ts
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
  const fallbackGroup = groups[0];
  const fallbackItem = fallbackGroup.items[0];
  return { ...fallbackItem, groupLabel: fallbackGroup.label };
}
```

- [ ] **Step 4: Run the model test and verify GREEN**

Run: `npx vitest run tests/settings-navigation.test.ts`

Expected: 3 tests pass.

- [ ] **Step 5: Commit the tested model**

```bash
git add src/components/settings/settings-navigation-model.ts tests/settings-navigation.test.ts
git commit -m "refactor: extract settings navigation model"
```

### Task 2: Replace the compact select with the grouped navigation menu

**Files:**
- Modify: `src/components/settings/settings-navigation.tsx`
- Modify: `tests/product-foundations-contract.test.ts`

**Interfaces:**
- Consumes: `getSettingsNavigationGroups`, `getCurrentSettingsLocation`, and `isSettingsPathActive` from Task 1.
- Produces: the same exported `SettingsNavigation({ isAdmin }: { isAdmin: boolean })` component contract used by the settings layout.

- [ ] **Step 1: Add the responsive shell assertion before changing the component**

Extend the existing settings-shell contract to assert that the compact control uses a menu trigger and the old `<select>` is absent:

```ts
test("compact settings navigation identifies the active group and page", () => {
  const navigation = readFileSync(
    "src/components/settings/settings-navigation.tsx",
    "utf8",
  );
  expect(navigation).toContain("DropdownMenuTrigger");
  expect(navigation).toContain("current.groupLabel");
  expect(navigation).toContain('aria-current={isSettingsPathActive(pathname, item.href) ? "page" : undefined}');
  expect(navigation).not.toContain('<select');
});
```

- [ ] **Step 2: Run the contract test and verify RED**

Run: `npx vitest run tests/product-foundations-contract.test.ts`

Expected: FAIL because the component still renders a native select and has no dropdown trigger.

- [ ] **Step 3: Implement the compact navigation trigger and menu**

In `settings-navigation.tsx`:

- Import `Check` and `ChevronDown` from `lucide-react`.
- Import `Button` and the existing `DropdownMenu` primitives.
- Replace local `GROUPS` and `active` definitions with Task 1 model imports.
- Derive `groups` and `current` from the model.
- Replace the `lg:hidden` native select with this structure:

```tsx
<div className="lg:hidden">
  <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
    Settings
  </p>
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button
          variant="outline"
          className="h-auto min-h-11 w-full justify-between px-3 py-2 text-left font-normal"
          aria-label={`Open settings navigation. Current page: ${current.groupLabel}, ${current.label}`}
        />
      }
    >
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{current.groupLabel}</span>
        <span className="block text-sm font-medium text-foreground">{current.label}</span>
      </span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" sideOffset={6} className="max-h-[min(28rem,var(--available-height))]">
      {groups.map((group, groupIndex) => (
        <Fragment key={group.label}>
          {groupIndex > 0 && <DropdownMenuSeparator />}
          <DropdownMenuGroup>
            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            {group.items.map((item) => {
              const itemActive = isSettingsPathActive(pathname, item.href);
              return (
                <DropdownMenuItem
                  key={item.href}
                  aria-current={itemActive ? "page" : undefined}
                  className="min-h-10 px-2"
                  onClick={(event) => navigate(event, item.href)}
                >
                  <span className="flex-1 whitespace-normal">{item.label}</span>
                  {itemActive && <Check className="size-4" aria-hidden="true" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </Fragment>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

Add a local navigation function that preserves the existing guard. The item click handler calls `event.preventDefault()` only when the user cancels, which keeps the menu open and retains form state:

```ts
function navigate(event: React.MouseEvent<HTMLElement>, href: string): void {
  if (href === current.href) return;
  const hasUnsavedSettings = document.documentElement.dataset.unsavedSettings === "true";
  if (hasUnsavedSettings && !window.confirm("You have unsaved settings. Leave without saving?")) {
    event.preventDefault();
    return;
  }
  router.push(href);
}
```

Keep the desktop `<nav>` structure unchanged except for using `isSettingsPathActive` and the shared groups.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run tests/settings-navigation.test.ts tests/product-foundations-contract.test.ts
npx tsc --noEmit
npx eslint src/components/settings/settings-navigation.tsx src/components/settings/settings-navigation-model.ts tests/settings-navigation.test.ts tests/product-foundations-contract.test.ts
```

Expected: all commands exit 0.

- [ ] **Step 5: Verify the interaction in the authenticated browser**

At `http://localhost:3000/settings/calling` below `1024px`:

- Confirm the trigger visibly reads “Settings,” “Communication,” and “Calling.”
- Open it with mouse and keyboard.
- Confirm grouped destinations, active checkmark, and role-appropriate items.
- Press Escape and confirm focus returns to the trigger.
- Select another page and confirm navigation.
- On a dirty Workspace settings form, cancel the confirmation and confirm the route and form remain unchanged.
- At `1280px`, confirm the compact menu is hidden and the sticky settings sidebar remains visible.

- [ ] **Step 6: Run the full quality gate**

Run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all commands exit 0 and the Next.js build generates the Settings routes.

- [ ] **Step 7: Commit the UI implementation**

```bash
git add src/components/settings/settings-navigation.tsx tests/product-foundations-contract.test.ts
git commit -m "feat: clarify compact settings navigation"
```
