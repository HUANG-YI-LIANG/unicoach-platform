import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sqlPath = join(root, 'supabase_coach_plans_data_readiness_checks.sql');
const planPath = join(root, 'docs', 'coach-plans-data-cleanup-plan.md');

function read(path) {
  return readFileSync(path, 'utf8');
}

test('coach plan data readiness SQL is read-only and identifies non-salable approved coaches', () => {
  assert.equal(existsSync(sqlPath), true, 'supabase_coach_plans_data_readiness_checks.sql should exist');
  const sql = read(sqlPath);
  const normalized = sql.toLowerCase();

  assert.match(sql, /approved_coaches/i);
  assert.match(sql, /active_plan_counts/i);
  assert.match(sql, /active_rule_counts/i);
  assert.match(sql, /coach_plan_seed_candidates/i);
  assert.match(sql, /coach_availability_rule_seed_candidates/i);
  assert.match(sql, /coach_saleability_readiness_summary/i);
  assert.match(sql, /coaches_missing_active_plans/i);
  assert.match(sql, /coaches_missing_active_availability_rules/i);
  assert.match(sql, /base_price/i);
  assert.match(sql, /available_times/i);
  assert.match(sql, /approval_status\s*=\s*'approved'/i);

  assert.doesNotMatch(normalized, /\binsert\b|\bupdate\b|\bdelete\b|\balter\b|\bdrop\b|\bcreate\b/,
    'readiness SQL must be read-only; put write SQL in a separate, user-approved migration later');
});

test('coach plan data cleanup plan documents manual approval gates and no direct DB writes', () => {
  assert.equal(existsSync(planPath), true, 'docs/coach-plans-data-cleanup-plan.md should exist');
  const plan = read(planPath);

  assert.match(plan, /不直接改 DB/);
  assert.match(plan, /Supabase SQL Editor/);
  assert.match(plan, /coach_plans/);
  assert.match(plan, /coach_availability_rules/);
  assert.match(plan, /正式可售/);
  assert.match(plan, /人工確認/);
  assert.match(plan, /回滾/);
  assert.match(plan, /驗收/);
  assert.match(plan, /supabase_coach_plans_data_readiness_checks\.sql/);
});
