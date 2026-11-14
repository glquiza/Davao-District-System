# Davao District System

A centralized, responsive web application (PWA-ready) for managing church programs, activities, announcements, external livestream links, invitation-based Locale onboarding, and membership transfers across **National**, **Davao District**, and **Locale** levels.

## Key Capabilities

- **Two-Step Onboarding:** Users register an account to immediately access **National** programs and activities, and can apply to join a **Davao District Locale** anytime using a Locale invitation code.
- **Readable & Copyable Invitation Codes:** Locale Admins generate, copy, monitor (`approved + pending` atomic capacity reservation), and revoke Locale-scoped invitation codes.
- **Controlled Leave & Transfer Workflow:** Active members requesting to leave or transfer remain active in their current Locale until an assigned **outgoing Locale Admin** approves the departure, preserving membership history (`left` status).
- **Strict Hierarchical Publishing & RLS:**
  - **District Admins** manage Locales, assign Locale Admins, and publish **National** & **Davao District** activities (with read-only oversight on Locale activities).
  - **Assigned Locale Admins** exclusively publish and manage **Locale** activities, review incoming membership applications, and approve outgoing leave requests.
- **In-App Notification Center & Audit Logs:** Automatic database triggers notify eligible members upon activity publishing, cancellation, schedule updates, and membership/leave decisions.

## Quick Setup

1. Copy `.env.example` to `.env.local` and fill in your Supabase project credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
2. Run the SQL migrations in order inside the **Supabase SQL Editor**:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_and_rpcs.sql`
   - `supabase/migrations/0003_seed_davao_district.sql`
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Register your account at `/register`, then promote yourself to District Admin in Supabase:
   ```sql
   update public.profiles set is_district_admin = true where email = 'your-email@example.com';
   ```
