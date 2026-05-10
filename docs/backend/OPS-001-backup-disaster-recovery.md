# OPS-001 Backup And Disaster Recovery Note

## Supabase Backup Expectations

- Use Supabase managed daily backups for production.
- Confirm point-in-time recovery availability for the chosen project tier before
  production sharing.
- Keep raw SQL migrations in source control as the schema reconstruction path.

## Manual Export Cadence

- During active use: run a family-owned structured export monthly.
- Before major schema changes: run a full export.
- Before deleting or archiving uploads: run a full export including files.

## Bulk Export Process

The planned bulk export should include:

- Structured JSON or CSV tables.
- Uploaded files from the private bucket.
- Generated clinician export packets.
- A manifest with export timestamp, included filters, row counts, and file
  hashes.

Normal exports exclude soft-deleted records unless a primary/caregiver explicitly
requests them.

## Restore Path

1. Restore Supabase database from managed backup or SQL dump.
2. Re-apply migrations if restoring into a fresh project.
3. Restore private storage objects from exported archive or Supabase backup.
4. Verify auth profiles, roles, and RLS policies.
5. Run smoke tests for login, entry read/write, attachment signing, and export.
