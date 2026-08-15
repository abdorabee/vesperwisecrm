# Extractable Components

## MarketingNav
- Source: `src/components/marketing/marketing-nav.tsx`
- Category: layout
- Description: Fixed public navigation with VesperWise logo, three section anchors, and auth CTAs.
- Extractable props: activeItem (string, default: ""), showCta (boolean, default: true)
- Hardcoded: wordmark, link labels, iconography, Tailwind classes

## MarketingFooter
- Source: `src/components/marketing/marketing-footer.tsx`
- Category: layout
- Description: Public footer with product positioning, navigation links, and copyright.
- Extractable props: none
- Hardcoded: wordmark, footer copy, link labels, CSS classes

## VesperWiseLogo
- Source: `src/components/vesper-wise-logo.tsx`
- Category: layout
- Description: VESPER wordmark paired with the acid-lime WISE block.
- Extractable props: size (string, default: "sm"), href (string), iconOnly (boolean, default: false)
- Hardcoded: letters, shape, and brand colors

## DashboardSidebar
- Source: `src/components/dashboard-nav.tsx`
- Category: layout
- Description: Desktop authenticated product navigation and workspace identity.
- Extractable props: activeItem (string), workspaceName (string), showOnboarding (boolean, default: false)
- Hardcoded: group labels and icon set

## MobileNavigation
- Source: `src/components/dashboard-nav.tsx`
- Category: layout
- Description: Responsive mobile navigation for the authenticated product.
- Extractable props: activeItem (string), isOpen (boolean, default: false)
- Hardcoded: menu labels, icon set, CSS classes

## PageHeader
- Source: `src/components/page-header.tsx`
- Category: layout
- Description: Reusable authenticated page title, description, eyebrow, and action row.
- Extractable props: title (string), description (string), eyebrow (string)
- Hardcoded: structure and CSS classes

## MockBrowserFrame
- Source: `src/components/marketing/mock/mock-browser-frame.tsx`
- Category: basic
- Description: Marketing-only browser chrome used to frame real-product-inspired UI demonstrations.
- Extractable props: url (string), title (string)
- Hardcoded: chrome controls and visual styling

## SectionHeading
- Source: `src/components/marketing/section-heading.tsx`
- Category: basic
- Description: Shared marketing eyebrow, heading, and supporting-copy treatment.
- Extractable props: eyebrow (string), title (string), description (string), align (string)
- Hardcoded: typography and spacing classes

## Button
- Source: `src/components/ui/button.tsx`
- Category: basic
- Description: Shared Base UI button with primary, outline, ghost, destructive, and link variants.
- Extractable props: variant (string, default: "default"), size (string, default: "default"), disabled (boolean, default: false)
- Hardcoded: variant class definitions

## Card
- Source: `src/components/ui/card.tsx`
- Category: basic
- Description: Flat bordered content surface with header, body, footer, title, and description slots.
- Extractable props: none
- Hardcoded: structure and CSS classes

## Badge
- Source: `src/components/ui/badge.tsx`
- Category: basic
- Description: Compact status and category label.
- Extractable props: variant (string, default: "default")
- Hardcoded: variant classes

## Tabs
- Source: `src/components/ui/tabs.tsx`
- Category: basic
- Description: Base UI tab container, list, trigger, and content primitives.
- Extractable props: activeItem (string)
- Hardcoded: interaction semantics and CSS classes

## Input
- Source: `src/components/ui/input.tsx`
- Category: basic
- Description: Shared text input.
- Extractable props: disabled (boolean, default: false)
- Hardcoded: field styling

## Field
- Source: `src/components/ui/field.tsx`
- Category: basic
- Description: Form-field composition system for labels, descriptions, errors, and grouped controls.
- Extractable props: orientation (string, default: "vertical"), invalid (boolean, default: false)
- Hardcoded: semantic structure and CSS classes
