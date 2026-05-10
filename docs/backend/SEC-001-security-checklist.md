# SEC-001 Security Review Checklist

## RLS Coverage Matrix

Covered by `supabase/migrations/20260510000000_initial_backend_foundation.sql`:

- Reference tables: authenticated read only.
- Profiles: authenticated users can read same-family profiles and update only
  their own profile.
- Medical/domain tables: same-family authenticated reads; primary/caregiver
  writes; viewer/clinician read-only.
- Audit log: same-family reads; writes only through security-definer audit
  trigger or service role.
- Storage objects: private bucket, same-family path prefix, primary/caregiver
  writes.

## Negative Cross-Account Tests

`supabase/tests/rls_verification.sql` is the live SQL verification script to run
after migrations and seeds:

```bash
npm run supabase:verify
```

It checks:

- Account A cannot read Account B family rows.
- Viewer cannot create/update/soft-delete records.
- Clinician read-only cannot create/update/soft-delete records.
- Soft-deleted rows are hidden from normal authenticated reads.
- No public table has anon policies.
- Anon has no direct table privileges on medical tables.
- The private storage bucket exists, is not public, and has the 50 MB limit.

Add object-level signed URL negative tests before production sharing:

- Account A cannot sign or read Account B storage paths.

## Signed URL TTL Audit

- App default: 300 seconds.
- Contract cap: 15 minutes.
- No public bucket URLs are used.

## MFA And Session Timeout

- MFA is documented as recommended for primary/caregiver before production.
- Session timeout settings must be checked in Supabase dashboard before sharing.

## File Upload Checks

- Allowed mime list is enforced in contracts and services.
- Max upload size is 50 MB in contracts and bucket config.
- Path traversal is blocked by storage path validation.
- Server-side mime sniff helper exists; production finalize route/worker must
  call it on uploaded bytes.
- GPS EXIF stripping plan is documented; production worker is still required
  before sharing real photos.

## Analytics And Trackers

- No third-party analytics or trackers are included in the scaffold.

## Status

First-pass backend checklist is complete for the foundation. Production sharing
requires live RLS/storage tests plus the image sanitizing worker.
