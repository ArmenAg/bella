# BE-003a Auth Method Decision

## Decision

Use Supabase email magic link as the initial production auth method.

Local/demo fixtures also include password credentials to make development and UI
testing easier. That does not change the production recommendation.

## MFA

- Primary and caregiver roles should be MFA-capable.
- MFA is recommended before production sharing for primary/caregiver accounts.
- Viewer and clinician read-only users can start without MFA while the invite
  model is private-family only.

## Sessions

- Recommended production session duration: 8 hours for primary/caregiver, 4
  hours for clinician read-only.
- Refresh tokens should use Supabase defaults during local development.
- Frontend should handle expired sessions by returning users to the magic-link
  request screen without losing unsynced local form state.

## Invite Flow

1. Primary/caregiver invites a user by email.
2. Backend/admin process creates or updates Supabase Auth user metadata with
   `family_id` and desired `role`.
3. `handle_new_auth_user()` creates the profile row.
4. Primary/caregiver can later change the role through an admin/server-only
   flow.

## Supabase Settings

Local:

- Enable email provider.
- Magic link redirect URL: `http://localhost:3000/auth/callback`.
- Optional local password auth is allowed for fixture users.

Development:

- Enable email provider.
- Restrict redirect URLs to the Vercel preview domain and localhost.
- Keep storage bucket private.

Production:

- Enable email provider.
- Restrict redirect URLs to the production domain.
- Require MFA for primary/caregiver where practical.
- Review session timeout settings before family sharing.
