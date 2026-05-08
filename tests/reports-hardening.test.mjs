import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const reportsRoute = readFileSync(join(root, 'app/api/reports/route.js'), 'utf8');
const aiReportRoute = readFileSync(join(root, 'app/api/ai/generate-report/route.js'), 'utf8');

function functionBody(source, functionName) {
  const marker = `export async function ${functionName}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${functionName} export must exist`);

  const braceStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(braceStart, i + 1);
  }
  throw new Error(`Could not parse ${functionName} body`);
}

test('reports POST persists student user_id and handles duplicate/raced final reports deterministically', () => {
  const postBody = functionBody(reportsRoute, 'POST');

  assert.match(postBody, /completedItems\s*===\s*['"]__AI_DRAFT__['"]/s, 'final report submissions must reject the internal AI draft sentinel value');
  assert.match(postBody, /user_id\s*:\s*booking\.user_id/, 'final report payload must persist the booking student user_id used by report read authorization');
  assert.match(postBody, /isDuplicateLearningReportError\s*\(\s*insertError\s*\)/, 'duplicate booking_id insert conflicts must be mapped explicitly');
  assert.match(postBody, /status\s*:\s*409/, 'duplicate/raced report submissions should return HTTP 409, not generic 500');
  assert.match(postBody, /\.eq\(\s*['"]completed_items['"]\s*,\s*['"]__AI_DRAFT__['"]\s*\)/, 'AI draft promotion update must be conditional on the row still being a draft');
  assert.match(postBody, /\.select\(\s*['"]id['"]\s*\)\s*\.maybeSingle\(\s*\)/s, 'report insert/update should detect affected rows');
  assert.doesNotMatch(postBody, /\.insert\(\[\{\s*\.\.\.reportPayload/s, 'report insert should use an explicit payload, not spread a shared object into insert');
  assert.doesNotMatch(postBody, /console\.error\([^\n]*,\s*err\s*\)/, 'report POST must not log raw error objects');
  assert.match(postBody, /safeErrorDetails\(\s*err\s*\)/, 'report POST should sanitize logged errors');
});

test('reports GET returns an explicit DTO instead of raw learning_reports rows', () => {
  const getBody = functionBody(reportsRoute, 'GET');

  assert.doesNotMatch(getBody, /\.select\(\s*`[\s\S]*\*[\s\S]*`\s*\)/, 'report GET must not select * from learning_reports');
  assert.match(getBody, /REPORT_DETAIL_SELECT/, 'report GET should use an explicit select allowlist constant');
  assert.match(getBody, /toReportDetailDto\s*\(/, 'report GET should map rows through an explicit DTO helper');
  assert.doesNotMatch(getBody, /NextResponse\.json\(\s*\{\s*report\s*\}\s*\)/, 'report GET must not return the raw report row');
  assert.doesNotMatch(getBody, /console\.error\([^\n]*,\s*err\s*\)/, 'report GET must not log raw error objects');
  assert.match(getBody, /safeErrorDetails\(\s*err\s*\)/, 'report GET should sanitize logged errors');
});

test('AI report draft generation cannot race-overwrite an existing final report', () => {
  const postBody = functionBody(aiReportRoute, 'POST');

  assert.doesNotMatch(postBody, /\.upsert\([\s\S]*onConflict\s*:\s*['"]booking_id['"]/i, 'AI draft route must not use unconditional upsert on booking_id because it can overwrite a raced final report');
  assert.match(postBody, /\.eq\(\s*['"]completed_items['"]\s*,\s*['"]__AI_DRAFT__['"]\s*\)/, 'AI draft update must be conditional on the row still being a draft');
  assert.match(postBody, /isDuplicateLearningReportError\s*\(\s*draftError\s*\)/, 'AI draft insert duplicate conflicts must be mapped to a deterministic conflict response');
  assert.match(postBody, /status\s*:\s*409/, 'raced AI draft/final-report conflicts should return HTTP 409');
  assert.match(postBody, /user_id\s*:\s*booking\.user_id/, 'AI draft payload should preserve student user_id for later report authorization consistency');
  assert.doesNotMatch(postBody, /console\.error\([^\n]*,\s*error\s*\)/, 'AI report route must not log raw error objects');
  assert.match(postBody, /safeErrorDetails\(\s*error\s*\)/, 'AI report route should sanitize logged errors');
});
