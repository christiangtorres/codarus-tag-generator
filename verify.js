#!/usr/bin/env node
/*
 * Pre-deploy sanity check for the Annie Selke / Codarus tag generator.
 * Run:  node verify.js          (static checks only)
 *       node verify.js --api    (also smoke-tests the live /api/parse endpoint)
 *
 * Catches the two failure modes we've actually hit:
 *  1. A product type Claude is told to use (api/parse.js knownTypes) that the
 *     front-end has no render bucket for (tag-generator.html AS_*_TYPES) ->
 *     those rows get SILENTLY SKIPPED. This is the rug bug.
 *  2. A JS syntax error in either file (a bad edit) before it ships.
 */
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const DIR = __dirname;
let failures = 0;
const fail = (m) => { console.error('  ✗ ' + m); failures++; };
const ok   = (m) => console.log('  ✓ ' + m);

// Pull every "quoted string" out of a chunk of source.
const strings = (chunk) => [...chunk.matchAll(/"([^"]+)"/g)].map(m => m[1]);

// Grab a [...] or new Set([...]) literal that follows a given name.
function literalAfter(src, name) {
  const i = src.indexOf(name);
  if (i === -1) return null;
  const open = src.indexOf('[', i);
  const close = src.indexOf(']', open);
  if (open === -1 || close === -1) return null;
  return strings(src.slice(open, close + 1));
}

console.log('\n1. Syntax check');
for (const f of ['api/parse.js', 'tag-generator.html']) {
  const p = path.join(DIR, f);
  try {
    if (f.endsWith('.js')) {
      execSync(`node --check "${p}"`, { stdio: 'pipe' });
    } else {
      const html = fs.readFileSync(p, 'utf8');
      const js = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
        .map(m => m[1]).join('\n;\n');
      const tmp = path.join(require('os').tmpdir(), 'as-verify-inline.js');
      fs.writeFileSync(tmp, js);
      execSync(`node --check "${tmp}"`, { stdio: 'pipe' });
    }
    ok(`${f} parses`);
  } catch (e) {
    fail(`${f} has a syntax error:\n${e.stderr || e.message}`);
  }
}

console.log('\n2. Type lists are in sync (api knownTypes <-> front-end buckets)');
const apiSrc = fs.readFileSync(path.join(DIR, 'api/parse.js'), 'utf8');
const feSrc  = fs.readFileSync(path.join(DIR, 'tag-generator.html'), 'utf8');

const known   = literalAfter(apiSrc, 'knownTypes');
const small   = literalAfter(feSrc, 'AS_SMALL_TYPES');
const bedding = literalAfter(feSrc, 'AS_BEDDING_TYPES');
const rug     = literalAfter(feSrc, 'AS_RUG_TYPES');

if (!known || !small || !bedding || !rug) {
  fail('could not extract one of the type lists (did a variable get renamed?)');
} else {
  const buckets = new Set([...small, ...bedding, ...rug]);
  const orphanApi = known.filter(t => !buckets.has(t));
  const orphanFe  = [...buckets].filter(t => !known.includes(t));

  if (orphanApi.length === 0) {
    ok(`all ${known.length} API types have a render bucket`);
  } else {
    fail(`API knows these types but the front-end has NO bucket (rows would be SKIPPED): ${orphanApi.join(', ')}`);
  }
  // Front-end-only types aren't fatal (the local fallback parser can still use
  // them) but usually mean Claude won't be told about a type it should produce.
  if (orphanFe.length) console.log(`  · note: front-end buckets a type the API doesn't list: ${orphanFe.join(', ')}`);
}

if (process.argv.includes('--api')) {
  console.log('\n3. Live /api/parse smoke test');
  const body = JSON.stringify({ rows: [
    { name: 'Caldera Modern Indoor/Outdoor Rug Blue 5x8', sku: 'R-58', price: 238 },
    { name: 'Amity Navy Duvet Cover King', sku: 'D-K', price: 268 },
    { name: 'Tirzah Decorative Pillow 22 Sq', sku: 'P-22', price: 88 },
  ]});
  (async () => {
    try {
      const r = await fetch('https://codarus-price-tags.vercel.app/api/parse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      });
      const d = await r.json();
      if (!r.ok || !d.parsed) { fail(`API returned ${r.status}: ${JSON.stringify(d).slice(0,200)}`); return done(); }
      const types = d.parsed.map(p => p.type);
      const want = ['Indoor/Outdoor Rug', 'Duvet Cover'];
      for (const w of want) types.includes(w) ? ok(`classifies "${w}"`) : fail(`expected a "${w}" in: ${types.join(', ')}`);
      done();
    } catch (e) { fail('API request failed: ' + e.message); done(); }
  })();
} else {
  done();
}

function done() {
  console.log('');
  if (failures) { console.error(`✗ ${failures} check(s) failed — do NOT deploy.\n`); process.exit(1); }
  console.log('✓ All checks passed.\n');
}
