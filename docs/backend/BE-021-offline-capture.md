# BE-021 Offline Capture Design Spike

## Queue Shape

Use a local append-only queue with one record per attempted mutation:

```ts
type OfflineQueueItem = {
  id: string;
  operation: string;
  payload: unknown;
  client_recorded_at: string;
  created_locally_at: string;
  idempotency_key: string;
  attachment_staging_ids: string[];
  status: "pending" | "syncing" | "synced" | "failed";
  last_error?: string;
};
```

## Timestamp Preservation

- Capture `client_recorded_at` at the moment the observation happened.
- Capture `created_locally_at` when the app queued the mutation.
- Server stores medical observation timestamps as `timestamptz`.
- Client renders in the user's timezone.

## Attachment Staging

- Store pending images/videos in browser storage or platform file handles.
- Queue attachment metadata separately from object upload.
- Do not create final `attachments` rows until upload succeeds and the server
  validates metadata.

## Conflict Resolution

- Prefer append-only behavior for observations.
- If a queued update conflicts with a server update, create a new note/audit
  event rather than overwriting silently.
- Soft deletes should sync after creates/updates for the same entity.

## Sync API Requirements

- Every mutation accepts an idempotency key.
- Server actions return the stable DTO shape after mutation.
- Batch sync can process independent queue items but must preserve ordering for
  operations on the same entity.
- Attachment sync must be resumable.

## Frontend Constraints

- Forms should use shared Zod schemas from `src/server/contracts`.
- Keep unsynced state visible.
- Let users export queued text records before clearing failed local data.
