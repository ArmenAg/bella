# BE-007 Private Storage And Attachment API

## Implemented Foundation

- Private Supabase bucket: `bella-private-uploads`.
- Bucket upload limit: 50 MB.
- Allowed mime types:
  - JPEG, PNG, WebP, HEIC, HEIF
  - MP4, QuickTime
  - PDF
  - plain text and Markdown
- Storage object paths are scoped as:

  ```text
  {family_id}/{profile_id}/{uuid}-{sanitized_file_name}
  ```

- `createUploadUrl` returns a Supabase signed upload URL.
- `createAttachment` records metadata after upload.
- `linkAttachment` creates polymorphic links.
- `getSignedAttachmentUrl` returns short-lived signed URLs.
- `softDeleteAttachment` preserves the object and hides metadata through
  `deleted_at`.

## Server-Side Mime Sniffing

The service includes `sniffMimeFromBytes` for the supported signatures. With the
current signed-upload flow, the server does not receive bytes before upload, so
the first frontend integration should call a server finalize/check route or
server action with a small byte prefix if stricter sniffing is required before
metadata creation.

## GPS EXIF Handling

The schema records `gps_stripped` and preserves `captured_at` plus
`capture_timezone`. The recommended production path is:

1. Client uploads original image to a temporary private path.
2. Server worker reads the object.
3. Server strips GPS EXIF while preserving capture timestamp if present.
4. Server writes the sanitized object to the final private path.
5. Server creates the `attachments` row with `gps_stripped = true`.

The foundation stores the metadata and blocks public URLs; the sanitizing worker
is a required hardening item before production sharing.
