# Claude Goal - Frontend Phase 1

## Goal

Build the first usable frontend layer for Bella Care Tracker against the completed Codex backend foundation: onboarding/privacy disclosure, app shell, settings/access UI, Pain Book, Log Book, and reusable upload component.

## Current State

Codex completed the backend foundation. Use these as source of truth:

- `README.md`
- `UX.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `TICKETS.md`
- `docs/backend/COMPLETION_AUDIT.md`
- `src/server/contracts/*`
- `src/server/actions/entries.ts`
- `src/server/actions/attachments.ts`

Codex may run concurrently on backend phase 2 in `CODEX_NEXT_GOAL.md`. Avoid editing backend files unless a compile issue forces a small coordinated fix.

## Ownership Boundaries

Claude owns:

- Next.js route/page UI
- feature components
- shadcn/ui composition
- responsive layouts
- forms
- app shell/navigation
- empty/loading/error UX

Do not change:

- Supabase migrations/seeds
- RLS policies
- storage policies
- server action signatures
- backend services
- shared contracts, unless explicitly coordinated

Frontend must import shared Zod schemas/types from `src/server/contracts` and call server actions from `src/server/actions`. Do not query Supabase directly from UI components.

## Read First

- `UX.md` for product feel and interaction philosophy
- `DESIGN.md` for product scope
- `ARCHITECTURE.md` for technical boundaries
- `TICKETS.md` for FE tickets
- `README.md` for local setup

## Visual Direction

This is an operational health tracker, not a marketing app.

Use:

- Next.js App Router
- shadcn/ui
- Tailwind
- lucide-react icons
- quiet clinical density
- restrained neutral palette
- strong date/status/body-region hierarchy

Avoid:

- landing-page hero sections
- decorative card mosaics
- excessive gradients
- fake diagnosis language
- UI text that implies the app is diagnosing or treating

Mobile is the canonical capture surface. Desktop is the review/export surface.

## Primary Tickets

### 1. FE-000 - Onboarding Privacy Disclosure

Build first-login disclosure UI.

Message:

- This is a family-controlled personal health record, not a HIPAA-covered clinical system.
- Data is private to invited users.
- No third-party analytics should process medical text/events.
- Records are soft-deleted by default.
- The family can export all data at any time.

If backend acknowledgement persistence is not exposed yet, build the UI with a clearly isolated local placeholder and mark the integration TODO.

### 2. FE-001 - Next.js App Shell

Build authenticated app shell.

Views/nav:

- Dashboard
- Flare Mode
- Pain Book
- Log Book
- Timeline
- Diagnostic Tree
- Decisions
- Schedule
- Medications
- Procedures & Tests
- Source Library
- Export Packet
- Settings

Requirements:

- Compact left navigation on desktop.
- Bottom or drawer navigation on mobile.
- Global "Start flare" action visible from app shell.
- Empty states for views not implemented yet.
- No marketing hero.

### 3. FE-002 - Settings And Access UI

Build Settings screens for:

- Profile
- Role display
- Family users list placeholder
- MFA status placeholder
- Data export entry point placeholder
- Privacy disclosure replay

Requirements:

- Do not expose actions the current role cannot perform.
- Use clear placeholders where backend APIs are not yet available.

### 4. FE-003 - Pain Book Entry Form

Build structured pain entry UI using existing entries contracts/actions.

Fields:

- Entry type
- Date/time
- Pain current/peak/average
- Body regions
- Pain qualities
- Triggers
- Function impact
- Interventions tried
- Notes
- Attachments section using FE-006 if ready

Requirements:

- Use `react-hook-form` with `@hookform/resolvers/zod`.
- Reuse schemas from `src/server/contracts`.
- Bella-specific triggers must be one-tap options.
- Form must be fast on mobile.
- Create/edit works against backend action if action is available.

### 5. FE-004 - Log Book Entry Form

Build freeform log entry UI using existing entries contracts/actions.

Use cases:

- Arm froze after BP cuff.
- Knee color/temperature change.
- New foot/big-toe numbness.
- Medication reaction.
- ED visit.
- Cognitive/vision/speech episode.

Requirements:

- Title, notes, body regions, symptoms, triggers, attachments.
- Use shared Zod validation.
- Saved entries should be compatible with the future timeline.

### 6. FE-006 - Reusable Upload Component

Build upload UI against existing attachment actions.

Requirements:

- Drag/drop on desktop.
- Camera-friendly upload on mobile.
- Image/video/PDF preview.
- Upload progress.
- Description field.
- Attach to current entity when backend link action exists.
- Signed URL preview handling.

If direct upload flow needs a backend adjustment, document exact requested change rather than editing backend services.

### 7. FE-019 - Empty, Loading, Error, And Destructive UX

Apply consistent patterns:

- Useful empty state per major view.
- Skeletons where loading data.
- Plain-language errors.
- Destructive action confirmation.
- Soft-delete reason field placeholder for medical records.

## Optional If Time Allows

### FE-005 - Flare Mode UI Skeleton

Only build a frontend skeleton if Codex has not yet completed BE-006.

Requirements:

- Global Start flare route/action placeholder.
- Active flare banner placeholder.
- Checkpoint UI skeleton.
- No fake persistence that conflicts with backend contracts.

### FE-007 - Photo Comparison UI Skeleton

Only build isolated UI if Codex has not yet completed BE-008.

Requirements:

- Side-by-side image panel.
- Site selector.
- Left/right temperature inputs.
- Computed delta display locally.
- Clear integration TODO.

## Write Scope

Prefer writing under:

- `src/app/`
- `src/components/`
- `src/features/`
- `src/lib/`
- `UX.md` only if a UX decision needs documenting

Avoid writing under:

- `src/server/`
- `supabase/`
- `docs/backend/`

## Verification

Run:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run test`
- `npm run build`

Do not leave the dev server running at the end.

## Deliverables

- App shell with navigation.
- First-login privacy disclosure UI.
- Settings/access UI.
- Pain Book entry form.
- Log Book entry form.
- Reusable upload component.
- Clear empty states for not-yet-built pages.
- Notes on any backend blockers or contract requests.

## Definition Of Done

- A family user can navigate the app shell.
- Pain/log entries can be created through the UI against existing backend actions or the missing backend blocker is precisely documented.
- Upload component is ready for Pain Book and Log Book.
- Mobile capture flow is usable, even before full flare mode.
- No frontend code queries Supabase directly.
- Build/lint/typecheck/test pass or blockers are documented.
