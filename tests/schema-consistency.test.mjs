import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const schemaPath = join(root, 'supabase_schema.sql');
const migrationPath = join(root, 'supabase_migration_schema_consistency_guards.sql');
const schema = readFileSync(schemaPath, 'utf8');
const combinedSql = existsSync(migrationPath)
  ? `${schema}\n${readFileSync(migrationPath, 'utf8')}`
  : schema;

function assertSqlContains(sql, pattern, message) {
  assert.match(sql.replace(/\s+/g, ' '), pattern, message);
}

test('canonical schema defines API-required settings and reset-token tables', () => {
  assertSqlContains(combinedSql, /CREATE TABLE (IF NOT EXISTS )?(public\.)?platform_settings\s*\(/i, 'platform_settings table is required by /api/admin/settings');
  assertSqlContains(combinedSql, /key\s+TEXT\s+(PRIMARY KEY|UNIQUE|NOT NULL)/i, 'platform_settings.key must be constrained for upsert');
  assertSqlContains(combinedSql, /value\s+TEXT\s+NOT NULL/i, 'platform_settings.value is required by settings API');

  assertSqlContains(combinedSql, /CREATE TABLE (IF NOT EXISTS )?(public\.)?password_reset_tokens\s*\(/i, 'password_reset_tokens table is required by forgot/reset password APIs');
  assertSqlContains(combinedSql, /user_id\s+UUID\s+NOT NULL\s+REFERENCES (public\.)?users\(id\)/i, 'password_reset_tokens.user_id must reference users');
  assertSqlContains(combinedSql, /token\s+TEXT\s+NOT NULL\s+UNIQUE/i, 'password reset token hash must be unique');
  assertSqlContains(combinedSql, /UNIQUE\s*\(\s*user_id\s*\)/i, 'forgot-password upsert uses onConflict user_id');
});

test('bookings schema includes API-written money and workflow fields plus database invariants', () => {
  assertSqlContains(combinedSql, /price_adjustment\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/i, 'adjust-price API writes bookings.price_adjustment');
  assertSqlContains(combinedSql, /payment_status\s+TEXT\s+[^,]*CHECK\s*\(\s*payment_status\s+IN\s*\([^)]*'pending'[^)]*'paid'[^)]*'refunded'[^)]*\)/i, 'booking payment_status enum must be constrained');
  assertSqlContains(combinedSql, /paid_at\s+TIMESTAMPTZ/i, 'confirm-payment API writes paid_at');
  assertSqlContains(combinedSql, /payment_expires_at\s+TIMESTAMPTZ/i, 'booking payment expiry is required');
  assertSqlContains(combinedSql, /bookings_non_negative_money/i, 'bookings need non-negative money CHECK constraint');
  assertSqlContains(combinedSql, /bookings_paid_state_consistency/i, 'paid bookings need DB-level paid_at/status consistency guard');
});

test('learning reports schema matches report and AI draft APIs', () => {
  assertSqlContains(combinedSql, /CREATE TABLE (IF NOT EXISTS )?(public\.)?learning_reports\s*\(/i, 'learning_reports table must exist');
  assertSqlContains(combinedSql, /booking_id\s+UUID\s+NOT NULL\s+UNIQUE\s+REFERENCES (public\.)?bookings\(id\)/i, 'learning_reports.booking_id must be unique and reference bookings');
  assertSqlContains(combinedSql, /user_id\s+UUID\s+REFERENCES (public\.)?users\(id\)/i, 'reports API inserts learning_reports.user_id');
  assertSqlContains(combinedSql, /ai_draft_observation\s+TEXT/i, 'AI draft observation column is required');
  assertSqlContains(combinedSql, /ai_draft_suggestions\s+TEXT/i, 'AI draft suggestions column is required');
});
