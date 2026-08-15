# VesperWise CRM — Six-Stage Void Landing Design System

## Product context

VesperWise CRM is the conversion system in the VesperWise ecosystem. It receives leads, qualifies and routes them, keeps every seller interaction attached to the record, coordinates pipeline ownership, schedules email and SMS follow-up, supports outbound calling, and gives operators and managers a shared view of next actions and performance.

This landing page must sell the CRM itself. Do not blur it with the separate VesperWise intent-intelligence product. Do not claim unverified outcomes, customer counts, revenue impact, prices, testimonials, client names, or logos. Interface examples must be clearly illustrative and should demonstrate product mechanics rather than pretend to be customer proof.

## Core narrative: six stages through the void

The page is a guided descent from scattered lead activity to decisive human action. It borrows the reference's dark editorial atmosphere and spatial rhythm, but not its agency copy, orange accent, floating hands, stock logos, composition, or assets.

1. **00 — Signal / Enter the pipeline**: full-viewport hero. Sparse lead fragments emerge from darkness around the VesperWise wordmark. Headline: “Every lead enters as a signal.” Supporting idea: capture calls, forms, imports, and replies in one acquisition pipeline. Primary CTA: “See the system.” Secondary CTA: “Sign in.”
2. **01 — Noise / Find what matters**: a dense field of unsorted lead cards resolves into a calm qualification queue. Explain intake, shared records, and prioritization without invented metrics.
3. **02 — Context / Build the complete record**: one lead becomes the visual center while notes, motivation, timeline, source, owner, tasks, and communication history orbit or connect to it.
4. **03 — Intelligence / Decide the next move**: show AI-assisted lead scoring, call-note structuring, and qualification recommendations as evidence with visible reasons and human control—not a magical black box.
5. **04 — Motion / Keep work moving**: an asymmetric pair of oversized editorial cards presents the live pipeline and automated follow-up. The dialer, email/SMS sequences, workflows, routing, and ownership turn insight into coordinated action.
6. **05 — Action / No lead without a next step**: the environment opens into a calm final conversion scene. Show a short three-step adoption path and CTAs to get started or sign in. Close with the VesperWise wordmark at monumental scale.

The six stages should read as one continuous scroll narrative, not six unrelated marketing blocks. Persistent stage numerals or a minimal vertical progress rail may orient the user. No precision gestures or game-like gates are required for this landing-page draft.

## Visual direction

- Mood: cinematic, technical, restrained, nocturnal, precise, quietly confident.
- Primary background: `#090a08`; deepest void: `#050505`.
- Primary foreground: `#f7f8f2`; warm editorial highlight: `#efece2`.
- Brand accent: acid lime `#dfff00`. Use it for one decisive focal element per viewport, never as a flood fill across the whole page.
- Surfaces: `#10110e`, near-black transparent panels, and 10% white borders.
- Supporting status colors only inside product UI: green `#4ade80`, amber `#f5b544`, cold gray `#8a8f98`.
- Never introduce orange, purple, pink, blue gradients, or unrelated neon colors.
- No generic SaaS gradient blobs, glass-card grids, floating feature pills, fake dashboards, handshake imagery, robots, brains, stock portraits, or copied surreal hands.
- Atmosphere comes from grain, vignette, sparse lime particles, scan lines, thin relationship arcs, subdued depth haze, and fragments of authentic product UI.

## Typography

- Display/editorial: Playfair Display, high contrast, large and sparse; italics may emphasize one phrase per major scene.
- Interface and body: Geist or Inter.
- Metadata, stages, scores, timestamps, and evidence labels: JetBrains Mono or Geist Mono, uppercase with measured tracking.
- Hero scale: approximately 72–112px desktop and 48–64px mobile, with no more than three lines.
- Section statements: 48–80px desktop with generous leading.
- Body copy: 16–19px and no wider than 620px.
- Avoid six-line headline wraps, center-aligned paragraphs longer than three lines, and decorative typography inside product UI.

## Layout and composition

- Desktop canvas: 1440px reference viewport; content column max 1180–1240px.
- Hero and final scene occupy at least one viewport height.
- Alternate centered cinematic statements with asymmetric evidence compositions.
- Use large negative space; content should feel suspended in darkness.
- The qualification and context stages may use a dominant 60/40 composition.
- The Motion stage uses two staggered 4:5 cards inspired by the reference rhythm: acid-lime pipeline card and near-black follow-up card. Content and geometry must be original to VesperWise.
- Navigation is minimal and fixed: VesperWise wordmark, stage anchors or Product/How it works, Sign in, and one high-contrast CTA.
- Mobile collapses to a single vertical story; preserve the narrative order and make all product evidence readable without horizontal scrolling.

## Product evidence

- Prefer recognizable, simplified renderings of real product patterns: qualification queue, Kanban pipeline, sequence steps, call summary, tasks, owner routing, workflow rule, and KPI/scorecard shell.
- Any names, addresses, dollar values, scores, or performance numbers are illustrative placeholders and must be labeled “Illustrative interface” when visible.
- Do not use the existing demo wordmarks, testimonials, aggregate metrics, or pricing as proof.
- Do not say “every lead is automatically scored” unless the interface copy makes clear that AI actions are optional/configurable.
- CTAs may link conceptually to `/login`; do not invent a live demo booking flow.

## Component styling

- Primary CTA: acid-lime background, black text, compact pill or softly rounded rectangle; no glow by default.
- Secondary CTA: transparent, 15% white border, warm-white text.
- Editorial cards: 24px radius at large sizes; inner product UI retains the app's 12px radius system.
- Product frames: flat dark surfaces, thin borders, tiny mono labels, restrained shadows.
- Stage labels: `00—05`, 11–12px mono, lime or 45% white.
- Dividers: hairline white at 8–12% opacity.
- Icons: simple Lucide-like line icons; never use decorative icon tiles as the main visual.

## Motion and interaction

- Slow reveal transitions using opacity plus 20–30px vertical travel.
- Slight opposing parallax for the two Motion cards.
- Hero fragments drift by no more than 12–18px; no constant high-amplitude floating.
- Product data may resolve from noisy/disordered to aligned/legible as each stage enters.
- Navigation may gain a translucent black surface after scrolling.
- Respect `prefers-reduced-motion`: show the same semantic content immediately, remove parallax, and preserve all CTAs and stage navigation.
- Avoid scroll hijacking, mandatory audio, precision interactions, and effects that obscure text or controls.

## Accessibility and performance guardrails

- Warm-white on void and black on acid lime must meet WCAG AA.
- Visible focus ring uses `#dfff00` with at least 2px offset.
- All narrative content must remain semantic DOM text; visual particles and arcs are decorative.
- Product diagrams need accessible summaries or captions.
- Keep image/video payload optional and progressively loaded. The concept should still read with CSS-only atmospheric layers.
- Preserve meaningful reading order on mobile and reduced motion.

## Design-system fidelity

Use only the fonts, colors, spacing, and component styles defined here and in the repository theme. The supplied Superdesign HTML is a mood and composition reference, not content to copy. Maintain VesperWise's black/off-white/acid-lime identity throughout.
