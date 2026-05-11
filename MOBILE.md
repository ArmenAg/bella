# Bella Private iPhone Companion Plan

**Decision:** implement the first mobile version as an installable private web
app inside the existing Next.js application, not as a native iOS app.

**Target user:** Bella.

**Distribution model:** Bella opens the deployed HTTPS app in Safari and adds it
to the iPhone Home Screen. No App Store submission, no TestFlight dependency,
and no `.ipa` distribution in the first release.

**Primary goal:** make capture fast, reliable, and private on Bella's iPhone.
The mobile app should reduce friction for logging pain, flares, medications,
photos, and appointment context. It is not a new product surface; it is the
same family-scoped care tracker optimized for one real device.

## Why This Shape

The repository already contains a substantial private care tracker in `app/`:

- Next.js App Router, React, TypeScript, Tailwind, shadcn-style primitives.
- Supabase auth, row-level security, storage, migrations, and seed data.
- Existing mobile shell:
  - `src/components/shell/mobile-nav.tsx`
  - `src/components/shell/desktop-nav.tsx`
  - `src/components/shell/active-flare-banner.tsx`
  - `src/components/shell/onboarding-gate.tsx`
- Existing high-value mobile flows:
  - `/pain-book`
  - `/flare`
  - `/log-book`
  - `/vasomotor`
  - `/medications`
  - `/schedule`
  - `/timeline`
  - `/sources`
  - `/import`
  - `/agent`
- Server boundary is already established:
  - frontend imports contracts from `src/server/contracts`
  - frontend calls server actions from `src/server/actions`
  - frontend does not query Supabase tables directly
- Existing upload component already supports mobile capture:
  - `src/components/upload/attachment-uploader.tsx`
  - camera input uses `accept="image/*,video/*"` and `capture="environment"`
- Existing backend design spike for offline capture:
  - `docs/backend/BE-021-offline-capture.md`

Because the current app is already responsive and private, the fastest useful
path is to make it a proper Home Screen app, then tighten the handful of flows
Bella uses repeatedly.

Native iOS should stay a later option. A real native companion would require a
mobile API boundary because Next server actions are not a stable public mobile
API. It would also require Apple signing and device distribution. For a single
private user, that is operational drag without enough immediate benefit.

## Vocabulary

**Mobile app**

In this document, "mobile app" means the installable Home Screen web app version
of the existing Next.js app.

**PWA**

Progressive Web App behavior for this repo means:

- Home Screen icon and standalone display.
- Mobile-safe metadata and icons.
- iPhone-safe viewport and safe-area layout.
- Minimal service worker used carefully.
- Optional offline capture queue for selected create-only workflows.
- Optional web push reminders after the core mobile app is stable.

**Native wrapper**

A later Capacitor or Expo shell that loads the app in a native iOS WebView or
shares code with a native React Native implementation. This is explicitly not
part of the first implementation.

**Offline**

Offline does not mean the entire medical record is browsable without network.
Offline means Bella can capture selected observations when the network is bad
and the app will sync them later without duplicating records.

## Product Principles

1. Fast capture beats full desktop parity.
2. The mobile Home Screen app should open directly into useful work.
3. The app must not silently lose a symptom, flare checkpoint, or medication
   response because the connection dropped.
4. The app must not cache protected health information casually.
5. Offline storage is a privacy tradeoff and must be visible, bounded, and
   clearable.
6. Any queued write must preserve the time Bella observed the event, not merely
   the later sync time.
7. All writes still go through existing server actions and Supabase RLS.
8. Native iOS distribution should be avoided unless a specific iOS limitation
   blocks a high-value flow.

## Non-Goals For The First Mobile Release

- No App Store listing.
- No TestFlight-first workflow.
- No native Swift app.
- No React Native rewrite.
- No direct Supabase table access from mobile components.
- No offline browsing of the full timeline, documents, images, or exports.
- No DICOM viewer.
- No background medical analysis on-device.
- No hidden analytics or third-party session recording.
- No attempt to replace clinician judgment or emergency guidance.

## User Experience Target

Bella should be able to do the following from the iPhone Home Screen app:

1. Open the app and land on an immediately useful mobile dashboard.
2. Start a flare in less than 15 seconds.
3. Add a flare checkpoint in less than 10 seconds when a flare is active.
4. Log current pain in less than 15 seconds.
5. Log medication response with before/after pain scores.
6. Take or attach left/right vasomotor photos.
7. Add a freeform note with optional body regions, symptoms, triggers, and
   attachments.
8. See whether data is online, queued, syncing, synced, or failed.
9. Retry failed queued writes.
10. Export queued text before clearing local offline data.
11. Continue using the existing desktop app without data model divergence.

## Release Strategy

Build this in five phases.

### Phase 1: Installable Home Screen App

Make the existing app install cleanly on iPhone and behave like a focused app
when launched from the Home Screen.

Deliverables:

- App manifest.
- iOS Home Screen metadata.
- App icons.
- Safe-area layout fixes.
- Standalone-mode detection.
- Install instructions for Safari.
- Conservative service worker that does not cache PHI pages.
- Mobile QA checklist.

Expected effort: small.

Risk: low.

### Phase 2: Mobile Capture Refinement

Keep the existing backend and routes, but make the high-frequency mobile flows
feel purpose-built on iPhone.

Deliverables:

- Mobile dashboard tuned for "what should Bella do right now?"
- Quick capture entry points.
- Better active flare state on mobile.
- Shorter pain, flare checkpoint, medication response, and vasomotor capture.
- Reduced scrolling in repeated workflows.
- Better keyboard and input modes.
- Better file/camera affordances.

Expected effort: moderate.

Risk: medium, because it touches user-facing forms.

### Phase 3: Offline Capture Queue

Add a create-only offline queue for selected mutation types.

Deliverables:

- IndexedDB queue.
- Operation adapters for selected creates.
- Idempotency support on the server.
- Visible sync status.
- Retry, failure, and clear/export controls.
- Foreground sync on app launch, online event, and user tap.
- Tests for duplicate prevention and queue ordering.

Expected effort: medium to high.

Risk: high, because it touches medical data integrity and local PHI storage.

### Phase 4: Optional Push Reminders

Only after the core mobile app is stable, add opt-in reminders for appointments,
tasks, medication follow-up, and flare checkpoints.

Deliverables:

- Web Push subscription storage.
- Notification permission UI.
- Push service worker handler.
- Server-side push sender.
- Reminder scheduling source of truth.
- Unsubscribe and device management.

Expected effort: medium.

Risk: medium, mostly around permission UX and delivery reliability.

### Phase 5: Native Wrapper Decision

Revisit native only if a concrete limitation remains after Phases 1-4.

Potential reasons to go native later:

- Reliable local scheduled notifications are required.
- Background sync behavior is not good enough.
- Camera/file handling in Safari is insufficient.
- Home Screen web app auth/session behavior is unacceptable.
- Apple Health integration needs more than manual export upload.

Expected effort: medium for a wrapper, high for a real native app.

Risk: high operationally because of Apple signing and private distribution.

## Phase 1 Implementation Details

### 1. Add Next.js Manifest

Create:

```text
src/app/manifest.ts
```

Purpose:

- Defines app name, short name, start URL, display mode, colors, and icons.
- Gives non-iOS browsers a standard installable web app description.
- Keeps install metadata in code rather than hand-written JSON.

Expected shape:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bella Care Tracker",
    short_name: "Bella",
    description: "Private care tracker for Bella.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#196b75",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
```

Use the existing color palette:

- `--background: 210 20% 98%`
- `--primary: 188 64% 28%`

Do not use a loud or medical-emergency-looking icon. This app is private and
should look calm on Bella's phone.

### 2. Add iOS Metadata In Root Layout

Update:

```text
src/app/layout.tsx
```

Add `viewport` and expanded `metadata`.

Implementation notes:

- Include `viewportFit: "cover"` so CSS safe-area insets can be used.
- Include `appleWebApp.capable = true`.
- Include an Apple-specific app title.
- Include `formatDetection.telephone = false` unless a view deliberately links
  phone numbers.
- Include icons using the generated icon files.
- Keep the existing app title and description from `strings`.

Expected shape:

```ts
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#196b75",
};

export const metadata: Metadata = {
  title: strings.app.name,
  description: strings.app.tagline,
  applicationName: strings.app.name,
  appleWebApp: {
    capable: true,
    title: "Bella",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};
```

### 3. Generate Icons

Create:

```text
public/apple-touch-icon.png
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/icon-maskable-512.png
```

Icon requirements:

- PNG format.
- No transparent-only edges for the Apple touch icon.
- Legible at small sizes.
- Should not include PHI, initials that expose health context, or anything
  alarming.
- Use the product color system rather than a new palette.
- Prefer an abstract mark tied to care tracking, not a hospital cross.

The first pass can use a generated or simple designed raster asset. If a brand
system appears later, replace the icon set in one pass.

### 4. Fix Safe-Area Layout

Update:

```text
src/app/globals.css
src/components/shell/mobile-nav.tsx
src/app/(app)/layout.tsx
```

Problems to solve:

- Home Screen web apps on iPhone can use the full screen area.
- The bottom nav must not sit under the iOS home indicator.
- Sticky top chrome must not clash with the status bar.
- Main content bottom padding must account for the fixed bottom nav plus the
  safe-area inset.

CSS tokens to add:

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --mobile-bottom-nav-height: 4rem;
}
```

Expected changes:

- Mobile header gets `padding-top: var(--safe-top)` when standalone/fullscreen.
- Bottom nav gets `padding-bottom: var(--safe-bottom)`.
- Main content mobile bottom padding becomes:

```css
calc(var(--mobile-bottom-nav-height) + var(--safe-bottom) + 1rem)
```

Avoid using viewport-width based font scaling. It causes unpredictable text
wrapping in form controls.

### 5. Add Standalone Detection

Create:

```text
src/lib/mobile/standalone.ts
src/components/mobile/install-instructions.tsx
```

Purpose:

- Detect whether the app is running as a Home Screen app.
- Show install instructions only when helpful.
- Hide browser-only copy in standalone mode.

Detection logic:

```ts
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legacy signal:
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}
```

Install instruction behavior:

- Show only on iPhone Safari when not standalone.
- Do not show every time. Dismiss for at least 14 days using local storage.
- Do not show on desktop.
- Do not block use of the app.
- Copy should be short:
  - "Open Share"
  - "Add to Home Screen"
  - "Name it Bella"

Potential placement:

- Settings page.
- Onboarding page.
- A dismissible mobile-only banner on dashboard after sign-in.

### 6. Add A Conservative Service Worker

Create:

```text
public/sw.js
src/components/mobile/service-worker-registration.tsx
```

Register from the root app shell after hydration.

Important privacy rule:

Do not cache authenticated HTML responses or Supabase signed attachment URLs.
The app contains private health information. Offline support should come from
the explicit IndexedDB queue, not from a broad page cache.

Initial service worker behavior:

- Cache static Next assets under `/_next/static/`.
- Cache icons and install assets.
- Cache a generic offline page.
- For navigation requests:
  - try network first
  - if network fails, return `/offline`
  - do not serve a stale authenticated page
- For `POST`, `PUT`, `PATCH`, `DELETE`:
  - never intercept for caching
  - let the request fail normally
- For Supabase storage signed URLs:
  - never cache
- For `/login`, auth callback routes, and any future `/api/auth/*`:
  - never cache

Service worker cache names must be versioned:

```js
const STATIC_CACHE = "bella-static-v1";
const OFFLINE_CACHE = "bella-offline-v1";
```

Add an activation cleanup so old caches are deleted.

Do not implement background sync in the service worker in Phase 1. iOS support
and behavior are not reliable enough to make it the source of truth. Phase 3
will do foreground sync from the app runtime.

### 7. Add Offline Page

Create:

```text
src/app/offline/page.tsx
```

Purpose:

- Give Bella a clear state when the app cannot reach the network.
- Avoid a browser error page.
- Avoid showing stale medical data.

Content:

- "Offline"
- "Open the app again when the connection is back."
- If Phase 3 is complete, include queued item count.
- Link back to `/dashboard`.

Do not put sensitive record content on the offline page.

### 8. Install Instructions Runbook

Document in `README.md` or this file after implementation:

1. Deploy the app to a stable HTTPS URL.
2. On Bella's iPhone, open Safari.
3. Visit the app URL.
4. Sign in.
5. Tap Share.
6. Tap Add to Home Screen.
7. Name it `Bella`.
8. Launch from the Home Screen icon.
9. Confirm it opens without Safari address bars.
10. Confirm login persists after force-closing and reopening.

## Phase 2 Implementation Details

### 1. Mobile Dashboard Reframe

Current route:

```text
src/app/(app)/dashboard/page.tsx
```

The desktop dashboard can remain analytics-heavy. The mobile dashboard should
prioritize action.

Mobile dashboard order:

1. Active flare state:
   - if active: checkpoint button, end flare button, latest pain, elapsed time
   - if inactive: start flare button
2. Quick log row:
   - Pain
   - Note
   - Medication
   - Photo
3. Today:
   - upcoming appointment or task
   - last medication response
   - last pain entry
4. Recent timeline preview.
5. Charts lower down.

Do not remove desktop analytics. Use responsive composition so desktop keeps
the richer dashboard while mobile gets the task-first order.

### 2. Quick Capture Entry Point

Create either:

```text
src/app/(app)/quick/page.tsx
```

or keep quick capture embedded on `/dashboard`.

Preferred approach:

- Add a route `/quick` only if it meaningfully reduces complexity.
- Otherwise, add a `QuickCapturePanel` component used by dashboard and maybe
  the active flare view.

Potential files:

```text
src/components/mobile/quick-capture-panel.tsx
src/components/mobile/quick-capture-action.tsx
```

Actions:

- Pain
- Flare
- Medication response
- Vasomotor photo
- Freeform note

Each action should deep-link to the existing route with sensible defaults:

- `/pain-book/new?quick=1`
- `/flare`
- `/medications/responses/new?quick=1`
- `/vasomotor/new?quick=1`
- `/log-book/new?quick=1`

If the existing routes do not support query defaults cleanly, add support in
the page components rather than creating duplicate forms.

### 3. Pain Capture

Current relevant areas:

```text
src/app/(app)/pain-book/new/page.tsx
src/components/entries/entry-form.tsx
src/server/contracts/entries.ts
src/server/actions/entries.ts
```

Mobile requirements:

- Default `occurred_at` to now.
- Preserve `client_recorded_at` as the actual capture time.
- Pain score control must be thumb-friendly.
- Title should auto-fill to something useful if Bella does not type one.
- Notes should be optional and not visually dominate the form.
- Body region, symptoms, and triggers should be quick chips.
- Submit button must remain reachable above the bottom nav.
- After save, return to:
  - active flare page if logged from flare context
  - dashboard otherwise

Do not require excessive structured data. The mobile flow should accept a
minimal pain score plus optional note.

### 4. Flare Capture

Current relevant areas:

```text
src/app/(app)/flare/page.tsx
src/components/flares/flare-page-client.tsx
src/components/flares/flare-start-form.tsx
src/components/flares/flare-checkpoint-form.tsx
src/components/flares/end-flare-dialog.tsx
src/server/contracts/flares.ts
src/server/actions/flares.ts
```

Mobile requirements:

- If no flare is active:
  - primary action is Start Flare
  - pain and notes are enough to start
  - body region and symptoms are optional
- If flare is active:
  - primary action is Add Checkpoint
  - secondary action is End Flare
  - show elapsed time
  - show latest pain score
  - show next suggested checkpoint
- Checkpoint form:
  - default `checkpoint_at` to now
  - checkpoint type defaults based on elapsed time if possible
  - pain score first
  - notes second
  - symptoms optional

When offline queue is implemented, start flare and checkpoint are high-priority
queued operations. End flare is more delicate because it mutates an existing
record; queue it only after create-only flows are stable.

### 5. Medication Response Capture

Current relevant areas:

```text
src/app/(app)/medications/responses/new/page.tsx
src/components/medications/response-form.tsx
src/server/contracts/medications.ts
src/server/actions/medications.ts
```

Mobile requirements:

- Default `taken_at` to now.
- Medication select should prioritize active medications.
- Pain before and after fields should use the existing 0-10 control.
- The form should support "I just took this" even if after scores are unknown.
- Follow-up reminders are Phase 4, not required for first mobile release.
- The app should make it easy to edit later with 30m, 60m, or 120m values.

Offline queue MVP can support creating a medication response with the known
fields at capture time. Follow-up edits should remain online until update
idempotency and conflict behavior are designed.

### 6. Vasomotor Photo Capture

Current relevant areas:

```text
src/app/(app)/vasomotor/new/page.tsx
src/components/vasomotor/vasomotor-form.tsx
src/components/upload/attachment-uploader.tsx
src/server/contracts/vasomotor.ts
src/server/actions/vasomotor.ts
src/server/actions/attachments.ts
```

Mobile requirements:

- Camera capture must remain obvious.
- Left and right photo fields should be clearly labeled.
- Lighting notes should be easy to add but optional.
- Temperature fields should use numeric keyboards.
- Measurement time defaults to now.
- If a flare is active, offer linking to the active flare entry.

Offline attachments are complicated. The first offline release may queue text
metadata and require network for actual image upload. If offline photo capture
is included, store the image blobs in IndexedDB with strict size limits and a
visible "photos waiting to upload" state.

### 7. Freeform Log Capture

Current relevant areas:

```text
src/app/(app)/log-book/new/page.tsx
src/components/entries/entry-form.tsx
```

Mobile requirements:

- One large note field.
- Optional pain score.
- Optional body regions, symptoms, triggers.
- Attachments remain available.
- Minimal submit friction.

This is the fallback when Bella wants to record something quickly without
classifying it.

### 8. Navigation Adjustments

Current mobile bottom bar:

```text
const BOTTOM_BAR_HREFS = ["/dashboard", "/pain-book", "/flare", "/log-book"];
```

The existing bottom bar renders four fixed destinations plus `More`.

Recommended bottom bar for mobile:

- Dashboard
- Pain
- Flare
- Log
- More

Keep this for the first release. Do not churn navigation until real use shows a
better order.

Possible later change:

- Replace Log with Quick if Bella uses quick capture more than freeform notes.

### 9. Forms And Keyboard Behavior

Across mobile forms:

- Use `inputMode="numeric"` for integer pain values if a text/number input is
  used.
- Use `inputMode="decimal"` for temperatures.
- Use `autoComplete` only where appropriate.
- Avoid tiny select triggers.
- Avoid buttons below fixed nav.
- Ensure destructive actions are not next to primary submit buttons.
- Keep labels visible. Placeholder-only fields are not enough.
- Keep validation messages close to the field.
- Prevent layout jumps when dynamic sections open.

## Phase 3 Offline Capture Details

### 1. Data Model

Use IndexedDB, not local storage.

Add a tiny IndexedDB wrapper. Recommended dependency:

```text
idb
```

Potential files:

```text
src/lib/offline/db.ts
src/lib/offline/queue.ts
src/lib/offline/operations.ts
src/lib/offline/sync.ts
src/lib/offline/types.ts
src/components/offline/offline-status-bar.tsx
src/components/offline/offline-queue-panel.tsx
src/components/offline/use-offline-sync.ts
```

IndexedDB database:

```text
bella-mobile-offline
```

Object stores:

```text
queue_items
queue_attachments
sync_events
```

`queue_items` shape:

```ts
type OfflineQueueItem = {
  id: string;
  family_id: string;
  actor_profile_id: string;
  operation: OfflineOperationName;
  payload: unknown;
  client_recorded_at: string;
  created_locally_at: string;
  idempotency_key: string;
  attachment_staging_ids: string[];
  status: "pending" | "syncing" | "synced" | "failed";
  attempts: number;
  last_attempt_at?: string;
  last_error?: string;
  server_record_id?: string;
};
```

`queue_attachments` shape:

```ts
type OfflineAttachment = {
  id: string;
  queue_item_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  blob: Blob;
  created_locally_at: string;
  status: "pending" | "uploading" | "uploaded" | "failed";
  uploaded_attachment_id?: string;
  last_error?: string;
};
```

`sync_events` shape:

```ts
type OfflineSyncEvent = {
  id: string;
  queue_item_id?: string;
  level: "info" | "warning" | "error";
  message: string;
  created_at: string;
};
```

### 2. Operation Allowlist

Do not create a generic "call any server action from offline" system. Use a
small allowlist.

MVP allowed operations:

```ts
type OfflineOperationName =
  | "entries.createPain"
  | "entries.createFreeform"
  | "flares.start"
  | "flares.createCheckpoint"
  | "medications.createResponse"
  | "vasomotor.createMeasurement";
```

Not allowed in MVP:

- updates
- deletes
- source linking
- diagnostic-tree edits
- decisions
- schedule edits
- import commit/reject flows
- AI agent messages
- exports

Reason:

Create-only observations are append-friendly and safer to retry. Updates and
deletes need conflict handling so the app does not overwrite newer server data.

### 3. Server Idempotency

Offline sync must be idempotent before it ships. Otherwise retries can duplicate
medical records.

Add `client_mutation_id` to create input schemas for queued create flows:

```text
src/server/contracts/entries.ts
src/server/contracts/flares.ts
src/server/contracts/medications.ts
src/server/contracts/vasomotor.ts
```

Schema pattern:

```ts
client_mutation_id: uuidSchema.optional();
```

Add nullable columns to the relevant tables:

```sql
alter table public.entries
  add column client_mutation_id uuid;

create unique index entries_client_mutation_id_unique
  on public.entries (family_id, created_by, client_mutation_id)
  where client_mutation_id is not null;
```

Repeat for tables that can be created from offline queue:

- `entries`
- `flare_checkpoints`
- `medication_responses`
- `vasomotor_measurements`

If `created_by` can be null for some service-created rows, use the user/profile
column that correctly identifies Bella's actor profile. The unique key should
scope to family plus actor plus client mutation ID.

Service behavior:

1. Parse input.
2. If `client_mutation_id` is present, check for an existing row for this
   family/actor/operation.
3. If found, return the existing DTO.
4. If not found, create normally and store the `client_mutation_id`.
5. If insert hits unique conflict, select and return the existing DTO.

This makes retry safe when the first response was lost after the server
committed the record.

### 4. Queue Creation Flow

When Bella submits a queue-enabled form:

1. Build the normal server-action payload.
2. Add:
   - `client_recorded_at`
   - `client_mutation_id`
3. If `navigator.onLine` is true:
   - try direct server action call first
   - if it succeeds, finish normally
   - if it fails with a network-shaped error, enqueue it
   - if it fails validation/auth/business rules, show the error and do not
     enqueue
4. If offline:
   - validate locally with the shared Zod schema where possible
   - enqueue
   - show "Saved on this iPhone. Will sync when online."

Do not enqueue unknown server errors blindly unless they are clearly network or
timeout failures. A malformed payload should fail loudly.

### 5. Sync Flow

Sync triggers:

- app launch
- `window` `online` event
- tab/app visibility returning to visible
- explicit user tap on "Sync now"

Sync algorithm:

1. Load pending and failed queue items ordered by `created_locally_at`.
2. Skip failed items unless user has chosen retry, or attempts are below the
   automatic retry threshold.
3. Mark item `syncing`.
4. Dispatch through the operation adapter.
5. On success:
   - save `server_record_id`
   - mark `synced`
   - keep item for 7 days for audit/debug visibility, or delete after a
     successful export policy is chosen
6. On validation/auth error:
   - mark `failed`
   - preserve `last_error`
   - require user action
7. On network error:
   - mark `pending` or `failed` depending on attempt count
   - back off retries

Ordering:

- Preserve global order for MVP.
- Later, independent operations can run in parallel.
- Never sync a checkpoint before its locally queued start-flare dependency.

Dependency handling:

- A checkpoint created for a flare started offline cannot know the server
  `entry_id` yet.
- Represent local dependencies explicitly:

```ts
type OfflineQueueItem = {
  depends_on_local_item_ids?: string[];
  local_entity_refs?: Record<string, string>;
};
```

Example:

- queued flare start has local ref `local-entry:abc`
- queued checkpoint references `local-entry:abc`
- after flare start syncs, update dependent payloads with the real server
  `entry_id`

If this is too much for the first pass, do not allow offline checkpointing for
offline-started flares. Allow checkpointing only for flares that already exist
on the server. That is less powerful but safer.

### 6. Queue UI

Add a persistent but quiet sync indicator.

Potential files:

```text
src/components/offline/offline-status-bar.tsx
src/components/offline/offline-queue-panel.tsx
```

Display states:

- Online
- Offline
- 1 item waiting
- 3 items syncing
- 1 item failed

Rules:

- Failed state must be visible.
- Pending state must be visible enough that Bella knows the record is not yet
  on the server.
- Synced state can be quiet.
- Never imply a queued item is saved to the medical record until the server
  confirms it.

Queue panel actions:

- Sync now
- Retry failed
- Export queued text
- Clear synced
- Clear failed/pending only after confirmation

Export queued text:

- Generate a local `.json` or `.txt` representation.
- Include operation, timestamp, and text fields.
- Do not include binary attachments in the first export pass.
- This is a safety valve before clearing corrupted or failed queue data.

### 7. Local Privacy Controls

Offline queue creates local PHI on the iPhone. Treat that as a deliberate
privacy decision.

Controls:

- Settings page shows whether offline capture is enabled.
- Settings page shows queued item count.
- Settings page can clear local queue after confirmation.
- Signing out should warn if unsynced queue items exist.
- After sign-out, do not sync queued data under another account.
- Queue records must include the actor/family identity and refuse to sync if
  the current session does not match.

Storage expectations:

- IndexedDB data is protected by the iPhone's normal device security.
- It is not a substitute for server-side encrypted storage.
- Do not store long-lived auth tokens in custom offline stores.
- Do not store signed attachment URLs offline.

### 8. Attachment Staging

MVP recommendation:

- Queue text observations first.
- Require network for attachment upload in the first offline release.

If offline attachment staging is included:

- Store blobs in IndexedDB only.
- Apply size caps:
  - image: 10 MB each
  - video: do not queue offline in MVP
  - total offline attachments: 50 MB
- Compress images client-side only if quality remains clinically useful.
- Upload attachments before final record creation if the record references
  attachment IDs.
- If a record can exist before attachments, sync record first, then upload and
  link attachments.
- Failed attachment uploads must not silently mark the whole capture complete
  if the photo was the important evidence.

### 9. Testing Offline

Unit tests:

- queue add/read/update
- operation allowlist
- idempotency key generation
- retry state transitions
- dependency resolution
- export queued text

Server tests:

- duplicate `client_mutation_id` returns same DTO
- duplicate insert does not create a second row
- queued operation validates same as online operation
- auth mismatch cannot replay another family/user's queued item

Browser tests:

- submit pain entry online
- submit pain entry while offline and sync later
- duplicate retry does not duplicate record
- failed validation remains failed with visible error
- sign out with pending queue warns user

Real iPhone manual tests:

- airplane mode capture
- kill app while queue has pending item
- reopen app, reconnect, sync
- weak connection retry
- photo capture
- Home Screen launch
- session persistence
- safe area on current iPhone size

## Phase 4 Push Reminder Details

Push is useful, but it is not needed to make the private app viable. Add it
after the core mobile app is reliable.

Apple supports standards-based web push for Safari/web apps on modern iOS Home
Screen apps. This does not require App Store distribution, but it does require
the user to grant permission from a user gesture.

Potential use cases:

- appointment reminder
- task due reminder
- medication response follow-up at 30/60/120 minutes
- flare checkpoint reminder
- "you have failed offline items" reminder

Potential files:

```text
src/server/contracts/push.ts
src/server/actions/push.ts
src/server/services/push.ts
src/components/settings/push-settings.tsx
public/sw.js
```

Potential migration:

```sql
create table public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id),
  profile_id uuid not null references public.profiles(id),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (profile_id, endpoint)
);
```

Environment variables:

```text
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
WEB_PUSH_SUBJECT=mailto:...
```

Client flow:

1. User taps "Enable reminders".
2. App checks service worker registration.
3. App calls `Notification.requestPermission()` from that tap handler.
4. If granted, app calls `registration.pushManager.subscribe(...)`.
5. App sends subscription to server.
6. Server stores subscription under the current family/profile.

Server flow:

1. Determine reminder due.
2. Build notification payload.
3. Send to each enabled subscription.
4. If push endpoint returns gone/expired, mark subscription disabled.

Notification content rules:

- Keep lock-screen content privacy-preserving.
- Avoid detailed medical content.
- Prefer:
  - "Bella reminder"
  - "Time to add a follow-up."
  - "A queued item needs attention."
- Do not put pain scores, medications, or diagnosis names in push text unless
  Bella explicitly chooses detailed notifications.

Scheduling source:

- For one-user private deployment, Vercel Cron or Supabase scheduled functions
  are acceptable.
- The database should remain the source of truth for due reminders.
- Client-side timers are not reliable enough for medical reminder delivery.

## Phase 5 Native Wrapper Details

Do not start here. Use this only if PWA limitations remain painful.

### Option A: Capacitor Wrapper Around Hosted App

What it is:

- Native iOS project.
- WebView loads the hosted HTTPS app.
- Can add selected native plugins later.

Pros:

- Faster than native rewrite.
- Reuses existing UI and server actions.
- Can get closer to native app behavior.

Cons:

- Still needs Apple signing.
- Private install is operationally annoying.
- WebView auth/session/cookie behavior must be tested.
- Still depends on hosted Next/Supabase backend.
- App updates may require native rebuild if plugins/config change.

### Option B: React Native Companion

What it is:

- Separate mobile UI in React Native or Expo.
- Talks to a real backend API, not Next server actions.

Pros:

- Best native mobile UX.
- Better local notification and background behavior.
- More control over camera/files.

Cons:

- Requires building route handlers or a separate API layer.
- Duplicates substantial UI logic.
- Needs mobile-specific auth/session handling.
- Requires more tests.
- Significantly higher maintenance.

### Option C: Swift Native App

What it is:

- Full native iOS app.

Pros:

- Best platform integration.
- Strongest native HealthKit/notification/camera path.

Cons:

- Largest rewrite.
- Least code reuse.
- Requires Swift/iOS maintenance.
- Still needs backend API work.

Recommendation:

- Stay PWA unless a measured problem justifies native.
- If native becomes necessary, start with Capacitor before React Native or
  Swift.

## Backend And Security Requirements

### Auth

Current app supports password form login:

```text
src/app/login/login-form.tsx
src/server/actions/auth.ts
```

Mobile requirements:

- Login must work in Safari and Home Screen standalone mode.
- Session persistence must survive force close/reopen.
- Auth errors must be readable on small screens.
- If magic links are added later, test whether the link opens Safari or the
  Home Screen app. Password/passkey-style login is simpler for the first
  private mobile release.

### RLS And Role Boundary

No mobile code should bypass current role rules.

Write roles remain:

```text
primary
caregiver
```

Readonly roles remain:

```text
viewer
clinician_readonly
```

Do not add client-side-only role checks as security boundaries. They are UI
affordances only. Server actions and RLS remain authoritative.

### Storage

Current private bucket:

```text
bella-private-uploads
```

Requirements:

- No public storage URLs.
- Continue using signed URLs for previews.
- Do not cache signed URLs in service worker or IndexedDB.
- Do not store file bytes offline unless explicitly implementing attachment
  staging with size limits and clear UI.

### Audit

Queued writes should preserve:

- actual observed time: `client_recorded_at`
- local queue time: `created_locally_at`
- server commit time: existing `created_at`
- actor profile
- idempotency key

If a queued write fails and Bella manually re-enters the same information,
support staff should be able to understand what happened from UI state and
server audit rows.

## Deployment Requirements

The Home Screen app requires a stable HTTPS deployment.

Minimum deployment checklist:

- Next app deployed behind HTTPS.
- Supabase project reachable from the deployed app.
- `NEXT_PUBLIC_SUPABASE_URL` configured.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured.
- `SUPABASE_SERVICE_ROLE_KEY` configured only server-side.
- Auth redirect URLs include the production domain.
- Cookies/session behavior tested in standalone iOS mode.
- No staging banner or debug credential copy visible in production.
- Error logging avoids PHI.

For a private one-person deployment, a password-protected production URL is
acceptable. Do not rely on obscurity of the URL as the only access control.

## QA Matrix

### Automated Gates

Run from `app/`:

```bash
npm run typecheck
npm run lint
npm run format
npm run test
npm run build
```

If database prerequisites are available:

```bash
npm run db:verify:local-postgres
npm run supabase:verify
```

### Responsive Browser QA

Viewports:

- iPhone SE width
- iPhone 14/15 width
- iPhone Pro Max width
- iPad narrow split view if relevant
- Desktop to verify no regression

Core checks:

- no text overlap
- no button hidden under bottom nav
- no field unreachable with keyboard open
- no horizontal scrolling
- active nav state correct
- dialogs/sheets fit vertically
- destructive confirmations readable
- chart sections degrade cleanly

### PWA QA

Checks:

- `manifest.webmanifest` resolves.
- icons load.
- Home Screen icon appears correctly.
- launch opens standalone.
- status bar/safe area looks correct.
- direct launch goes to `/dashboard`.
- refresh/reopen preserves auth.
- offline launch shows offline page rather than browser failure.
- service worker does not cache authenticated pages.

### Capture QA

Flows:

1. Start flare.
2. Add flare checkpoint.
3. End flare.
4. Create pain entry.
5. Create freeform log entry.
6. Create medication response.
7. Create vasomotor measurement with photos.
8. Upload attachment from camera.
9. Upload attachment from Files.
10. View the new records in timeline.

Each flow should be tested:

- online
- after app relaunch
- on small viewport
- with keyboard open
- with slow network if possible

### Offline QA

Only after Phase 3:

1. Open app online and sign in.
2. Enable airplane mode.
3. Create pain entry.
4. Confirm queued state.
5. Kill the Home Screen app.
6. Reopen while offline.
7. Confirm queued item still exists.
8. Disable airplane mode.
9. Tap Sync now.
10. Confirm server record appears once.
11. Retry same queued item.
12. Confirm no duplicate appears.
13. Create a queued item with invalid payload in a test build.
14. Confirm failure state is visible and clearable.

## Definition Of Done

Phase 1 is done when:

- App can be added to Bella's iPhone Home Screen.
- Home Screen launch uses standalone display.
- Layout respects iPhone safe areas.
- Install instructions exist.
- Service worker is registered and conservative.
- Authenticated pages are not cached for offline replay.
- Existing tests/build pass.

Phase 2 is done when:

- Bella's top capture flows are reachable in one tap from mobile dashboard or
  bottom nav.
- Pain, flare, medication response, and vasomotor capture are comfortable on
  iPhone.
- Mobile changes do not degrade desktop.
- Existing tests/build pass.
- Manual mobile checklist passes.

Phase 3 is done when:

- Queue-enabled forms can save while offline.
- Queued records sync once when online.
- Duplicate retries do not create duplicate records.
- Failed items are visible.
- Bella can export queued text before clearing local queue.
- Sign-out protects unsynced queue items.
- Server idempotency tests pass.

Phase 4 is done when:

- Push permission is opt-in.
- Subscription can be enabled and disabled.
- Reminder payloads are privacy-preserving.
- Expired push endpoints are handled.
- Real iPhone delivery is verified.

## Initial Implementation Order

Do the work in this order:

1. Add manifest, metadata, and icons.
2. Add safe-area CSS and verify mobile shell.
3. Add install instructions and standalone detection.
4. Add conservative service worker and offline page.
5. QA Home Screen install on iPhone.
6. Refine mobile dashboard and quick capture entry points.
7. Tighten pain, flare, medication response, and vasomotor mobile forms.
8. Add idempotency fields and server support for create-only queued operations.
9. Add IndexedDB queue and foreground sync.
10. Add queue UI and settings controls.
11. Run automated, browser, and real-device QA.
12. Consider push reminders only after the above is stable.

## References

- Apple web app configuration:
  <https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html>
- Apple Web Push for web apps and browsers:
  <https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers>
- Apple TestFlight overview:
  <https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview>
- Apple Ad Hoc provisioning profile:
  <https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile>

## Current Recommendation

Implement Phases 1 and 2 first. They deliver the private iPhone companion Bella
can actually use without dragging the project into native distribution. Treat
Phase 3 as the first serious data-integrity project after the mobile shell is
proven on the real device.
