import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/match/page.js', import.meta.url), 'utf8');

test('/match renders a standalone client-side matching form instead of redirecting to coaches', () => {
  assert.match(source, /['"]use client['"]/, 'match page should be a client component for form interactions');
  assert.doesNotMatch(source, /redirect\s*\(\s*['"]\/coaches['"]\s*\)/, 'match page should not immediately redirect to /coaches');
  assert.match(source, /useRouter\s*\(/, 'match page should navigate after the user submits the form');
  assert.match(source, /handleSubmit/, 'match page should have an explicit submit handler');
});

test('/match captures the minimum one-minute matching requirements', () => {
  for (const label of ['想學的運動', '學員身份', '學員程度', '想上課的地區', '課程形式', '學習目標']) {
    assert.match(source, new RegExp(label), `missing field label: ${label}`);
  }

  for (const option of ['籃球', '羽球', '網球', '排球', '桌球', '還不確定']) {
    assert.match(source, new RegExp(option), `missing sport option: ${option}`);
  }

  assert.match(source, /audience=student/, 'student audience copy/source should be supported');
  assert.match(source, /audience=parent/, 'parent audience copy/source should be supported');
});

test('/match submit maps form answers into /coaches query parameters and preserves UTM source', () => {
  assert.match(source, /new URLSearchParams\s*\(/, 'should construct query parameters safely');
  assert.match(source, /params\.set\(['"]sport['"]/, 'should map selected sport to coaches sport filter');
  assert.match(source, /params\.set\(['"]region['"]/, 'should map region to coaches region filter');
  assert.match(source, /params\.set\(['"]utm_source['"]/, 'should preserve or set source tracking');
  assert.match(source, /router\.push\(`\/coaches\?\$\{params\.toString\(\)\}`\)/, 'should navigate to filtered coaches results');
});
