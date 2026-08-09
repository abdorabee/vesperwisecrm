# Compact settings navigation design

## Goal

Make navigation between VesperWise settings pages immediately understandable at widths where the persistent settings sidebar does not fit. The current native select shows only a value such as “Calling,” so it resembles a form field and hides both its navigational purpose and the current section.

## Scope

Replace only the compact settings section select in `SettingsNavigation`. Preserve:

- The existing grouped information architecture and role-based filtering.
- The persistent settings sidebar at `lg` and wider widths.
- Existing routes and server behavior.
- The unsaved-settings confirmation contract.
- Calling, dialer, email, workspace, member, routing, and integration business logic.

## Approved interaction

At compact widths, show an explicit settings navigator rather than a native select:

```text
SETTINGS

Communication
[ Calling                                      › ]
```

The small “Settings” label identifies the control as navigation. The group label gives context, and the button names the current page. Activating the button opens a grouped menu:

```text
Personal
  Profile

Workspace
  General
  Members
  Lead routing

Communication
  Email
  ✓ Calling

Integrations
  Overview
  Google
```

Only routes available to the current role appear. The active item uses a check icon, text treatment, and `aria-current="page"`; it does not rely on color alone.

## Component design

Keep `GROUPS` as the single source of truth for compact and desktop navigation. Add a focused compact-navigation component within `settings-navigation.tsx` or a small adjacent component if that keeps the file easier to understand.

The compact control consists of:

- A visible “Settings” navigation label.
- The current group as secondary text.
- A full-width trigger showing the current page and a chevron.
- A popover-style grouped menu using existing UI primitives and no new dependency.

The desktop sidebar remains unchanged.

## Navigation and state

Selecting a different item closes the menu and calls `router.push` with the existing route. Selecting the current page closes the menu without navigating.

Before navigation, retain the current unsaved-settings guard. If the user cancels the confirmation, keep the current route, current item, menu state, and form data unchanged.

The menu derives the selected item from `usePathname`, so browser back/forward navigation and direct route entry remain synchronized without separate persistent state.

## Accessibility

- Use a real button trigger with an accessible name that includes the current destination.
- Expose expanded state and menu relationship through the existing popover primitive.
- Support Enter/Space to open, arrow-key traversal, Enter to select, and Escape to close.
- Return focus to the trigger after dismissal.
- Maintain a minimum 44px compact trigger height and visible focus indicators.
- Keep group labels available to assistive technology.
- Mark the active route using text/checkmark plus `aria-current`, not lime color alone.
- Allow labels to wrap rather than truncate at 200% text scaling.

## Responsive behavior

- Below `lg`: show the compact navigation menu above the page header.
- At `lg` and above: show the existing sticky settings sidebar and hide the compact control.
- Do not move the breakpoint in this change; the settings form needs the available content width at the user’s current viewport.

## Error and edge cases

- If the current path does not match an available item, fall back to Profile, matching current behavior.
- If role filtering removes an entire group, omit its heading.
- If client navigation fails, Next.js route error handling remains authoritative; the menu must not display a false success state.
- The unsaved-settings confirmation remains the only interruptive dialog in this interaction.

## Testing

Add focused coverage for:

- The compact trigger exposes “Settings,” the active group, and active page.
- The menu displays role-appropriate grouped destinations.
- The active route is marked accessibly.
- Selecting a destination navigates and closes the menu.
- Cancelling the unsaved-settings confirmation prevents navigation.
- Keyboard open, selection, Escape, and focus restoration.
- Compact and desktop visibility at representative widths.

Run targeted tests, TypeScript, lint, the production build, and an authenticated browser check on `/settings/calling`.

## Out of scope

- Changes to the settings information architecture or route names.
- Changes to Twilio credential setup or dialer configuration.
- A settings search feature.
- New dependencies or backend/database changes.
