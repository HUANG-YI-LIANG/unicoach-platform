# Phase 6 Smoke Test Checklist

Purpose: use this checklist before applying the Stage 2/4/5 database migrations to a shared or production Supabase database, and again after applying them in a test/staging database.

Do not paste secrets, API keys, database passwords, service-role keys, or connection strings into this file or the session log. Write `[REDACTED]` if a credential appears in terminal output.

## Migration order

Apply migrations in this dependency order after the preflight checks are clean:

1. `supabase_migration_booking_transaction_guards.sql`
   - Adds booking transaction / concurrency guards.
   - Run only after duplicate or conflicting active booking rows are cleaned.
2. `supabase_migration_payment_workflow_columns.sql`
   - Adds `bookings.payment_status` and `bookings.paid_at` for Stage 3 payment confirmation and Stage 5 settlement eligibility.
   - Backfills legacy scheduled/in-progress/completed/disputed bookings as paid using `completed_at`, `created_at`, or `NOW()` for `paid_at`.
   - Run before schema consistency guards because later constraints reference these columns.
3. `supabase_migration_schema_consistency_guards.sql`
   - Adds API-required tables, columns, and schema consistency guards.
   - Some constraints may be `NOT VALID`; clean legacy data before validating them.
4. `supabase_migration_settlement_financial_guards.sql`
   - Adds settlement financial guards and same-coach/same-month active batch uniqueness.
   - Run only after duplicate active settlement batches are cleaned.

## Preflight checks

Run `supabase_migration_preflight_checks.sql` against the target database before applying the migrations.

Expected result:
- `booking_time_conflicts`: zero rows
- `booking_money_violations`: zero rows
- `booking_paid_state_violations`: zero rows
- `settlement_duplicate_active_batches`: zero rows
- `settlement_total_violations`: zero rows
- `report_integrity_violations`: zero rows

The final `optional_payment_ready_settlement_preview` query is informational and may return rows.

If any violation query returns rows:
1. Export or record the affected IDs in an internal issue or migration note.
2. Decide whether to fix, cancel, refund, merge, or intentionally exclude each row.
3. Re-run the preflight SQL until violation sections return zero rows.
4. Only then apply the migrations.

## Authentication and profile smoke test

- Register a normal student account.
  - Expected: role is `user`; response does not include password/hash/token fields.
- Attempt to register with a forged `admin` role from the client request.
  - Expected: account is not created as admin.
- Log in and call profile endpoint.
  - Expected: profile returns only safe user-facing fields.
- Freeze or downgrade a user in DB, then retry a protected high-risk API using an old session.
  - Expected: fresh DB auth guard rejects the old privilege.

## Coach approval gate smoke test

- Register or create a coach whose approval status is not approved.
  - Expected: coach may complete onboarding/profile data only.
- Attempt to create coach plans, edit availability, upload videos, or save video metadata as the unapproved coach.
  - Expected: request is rejected.
- Approve the coach, then retry the same allowed commercial actions.
  - Expected: request succeeds if the payload is otherwise valid.

## Booking and pricing smoke test

- Attempt to create a booking in the past.
  - Expected: request is rejected.
- Attempt to create a booking outside the coach availability rules or inside an exception period.
  - Expected: request is rejected.
- Create a valid future booking with a coupon ID.
  - Expected: server calculates discount and final price; client-supplied discount value is ignored.
- Attempt to adjust a booking price as a user who is neither admin nor the booking coach.
  - Expected: request is rejected.
- Attempt to adjust price after the booking has left `pending_payment`.
  - Expected: request is rejected.

## Payment, report, and completion smoke test

- Confirm payment for a `pending_payment` booking as an admin.
  - Expected: `status = scheduled`, `payment_status = paid`, `paid_at` is set, `payment_expires_at` is cleared.
- Attempt to jump directly from `scheduled` to `completed` as coach.
  - Expected: request is rejected.
- Move the booking through the allowed workflow toward report creation.
  - Expected: coach/admin can create the formal learning report only at the allowed stage.
- Generate an AI report draft when no formal report exists.
  - Expected: draft can be saved under draft fields.
- Generate an AI report draft after a formal report exists.
  - Expected: formal report is not overwritten.
- Mark completion as student only after the required report/confirmation state exists.
  - Expected: completed state is accepted only through the allowed transition.

## Settlement smoke test

- Create completed but unpaid bookings.
  - Expected: settlement generation excludes them.
- Create completed, paid, un-settled bookings with positive coach payout.
  - Expected: settlement generation groups them by coach and creates settlement batches.
- Try generating another active batch for the same coach and month.
  - Expected: duplicate batch is skipped or rejected by the DB guard; response includes skipped coach information.
- Mark a settlement as paid.
  - Expected: status becomes paid.
- Attempt to roll a paid settlement back to pending/cancelled.
  - Expected: request is rejected.
- Cancel a settlement batch.
  - Expected: cancelled batch cannot later be restored or marked paid.

## Rollback notes

Code rollback:
- Restore the relevant `_bak.js` route files.
- Restore `supabase_schema.sql` from the appropriate `supabase_schema_bak.sql` snapshot for the phase being rolled back.
- Remove newly added helper, test, and migration files from that phase if necessary.

Database rollback:
- Prefer restoring a database backup/snapshot taken immediately before migration.
- If no full snapshot is available, write explicit down-migration SQL for each applied index/constraint/table/column.
- Do not drop constraints or indexes blindly on production; first confirm no later code depends on them.

Post-rollback verification:
- Re-run the local Node tests.
- Re-run `npm run build`.
- Re-run the relevant smoke-test sections against the restored environment.
