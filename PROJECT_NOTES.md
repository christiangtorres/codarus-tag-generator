---
name: Annie Selke Price Tags — Project Overview
description: Everything about the price tag generator for Annie Selke bedding and rug products, including file locations, logic, and rules
type: project
originSessionId: fdedd29e-c8f9-4088-824b-f8ee63aad24e
---
# Annie Selke Price Tags

**Location:** `/Users/christiantorres/Desktop/Projects/Data feed/Annie Selke Price Tags/`
**Live:** https://codarus-price-tags.vercel.app · **Repo:** https://github.com/christiangtorres/codarus-tag-generator
**Before deploy:** `node verify.js --api` (must pass) — see Guardrails below.
**Deploy:** `~/.npm-global/bin/vercel --prod --scope christiangtorres-projects --yes` then `vercel alias set <deployment-url> codarus-price-tags.vercel.app --scope christiangtorres-projects`. **Then `git push`** — Vercel deploys from the local CLI, so a deploy does NOT push to GitHub; push separately or the repo drifts from what's live.

## Guardrails (read before changing parsing)
The AS-format (Claude) path keeps the product-type list in **two places that must stay in sync**:
- `api/parse.js` → `knownTypes` — what Claude is told to produce.
- `tag-generator.html` → `AS_SMALL_TYPES` / `AS_BEDDING_TYPES` / `AS_RUG_TYPES` — what actually renders.
If Claude returns a type with no front-end bucket, those rows are **silently skipped** (this caused the rug-skip and is the #1 recurring bug). When adding a product type, add it to BOTH. `node verify.js` checks they agree and that both files parse; `--api` also smoke-tests the live endpoint.

Other invariants that have broken before:
- **Model name** (`api/parse.js`): `claude-haiku-4-5-20251001`. Old `claude-3-5-haiku-*` was retired and 404s. If the API starts 502-ing, check the model is still current.
- **Large files must batch.** The front-end sends rows to `/api/parse` in 40-row batches (`AS_BATCH_SIZE`), 4 concurrent. One giant request exceeds `vercel.json` `maxDuration` (30s) and the model's `max_tokens` → fails. Don't "simplify" back to a single call.

**Why:** Generate print-ready price tags for Annie Selke products (bedding, rugs) from spreadsheet data, replicating the physical tag format with logo, collection name, and size/SKU/price variants.

## Current Layout (updated 2026-06-02)

Tags are printed on **pre-cut 3.25″ × 7.25″ stock — one tag per page** (the print `@page` size *is* the tag). This replaced the original 3-up landscape layout.
- **Bedding & Rug:** 3.25″ × 7.25″, one per page, collection title +10% (bedding `.collection-name` 15.4px, rug `.collection` 16.5px).
- **Bedding split rule:** any collection with a **Pillowcases** and/or **Sheet Set** section moves those to their **own second tag** (logo + collection name repeated) — hard rule, regardless of available space. Implemented in `appendBeddingTags()` / `isBeddingOverflowType()`; both render paths (manual template + AS-format) route through it.
- **Spill safety net:** `break-inside: avoid` on `.type-section` and `.variant` so any too-tall tag breaks between whole units, never mid-price.
- **Print settings:** set printer paper to 3.25 × 7.25 at 100%/Actual Size (not Fit-to-page); toggle Cut Lines OFF on pre-cut stock.
- **AS-format parser:** `/api/parse` (Vercel serverless → Anthropic, model `claude-haiku-4-5-20251001`). Falls back to the local rule-based parser if the API errors.
- **index.html:** landing page with Recently Generated + Tag Library sections, plus collapsible **Archive** (hide forever) and **Trash** (30-day purge) shelves.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Landing page — open this first |
| `tag-generator.html` | Reusable drag-and-drop tool for any future spreadsheet (the main app) |
| `api/parse.js` | Vercel serverless proxy to Anthropic (AS-format parsing) |
| `annie-selke-bedding-tags.html` | Original 202 bedding products (3.66×8.5 snapshot) |
| `annie-selke-rug-tags.html` | Original 958 rug products / 135 tags (3.66×8.5 snapshot) |
| `annie-selke-bedding-tags-2026-06-02.html` | Bedding at new 3.25×7.25 (28 tags, PC/SS split) — test render |
| `annie-selke-rug-tags-2026-06-02.html` | Rugs at new 3.25×7.25 (135 tags) — test render |
| `annie-selke-dec-pillows-throws.html` | Dec drop: 9 merged tags (CV/KIT combined, $0 suppressed) |
| `annie-selke-logo.png` | Logo source file |
| `data/bedding-source.csv` | Original bedding spreadsheet |
| `data/rugs-source.xlsx` | Original rugs spreadsheet |

## Grouping Rules

**Bedding:** Parse collection name by double-stripping — first strip size variant suffix (e.g. "King", "Twin/Twin XL", "California King"), then strip product type (e.g. "Duvet Cover", "Sheet Set", "Sham"). What remains is the collection name. All items sharing a collection name go on one tag, grouped into sub-sections by product type.

**Rugs:** Group by the full product `Name` column (which encodes family + color). Each unique name = one tag. Sizes are the variants.

**Color rule:** Items with a different color in the name are always on their own separate page/tag. This is already handled naturally since color is part of the collection/name identifier.

## Layout Rules
- Variants sorted cheapest first within each section
- 2-column layout when 2+ variants; single column for 1
- Lone last item in a 2-col grid stays in column 1 (CSS: `.two-col .variant:last-child:nth-child(odd) { grid-column: 1; }`)
- All text fields are `contenteditable` for inline editing before printing
- Annie Selke logo embedded as base64 data URI (fully self-contained, no server needed)

## Data Quirks
- Rugs spreadsheet `Family` column contains Excel formulas — compute family from SKU by splitting on `-` and taking the prefix
- 46 rug product names contain `​` (zero-width space) — strip on import
- Bedding CSV uses columns: SKU, ProductName, "MSRP", "$X.XX"
- Rugs XLSX uses columns: Vendor, Family (formula), Name, SKU, Size, MSRP

## Tag Generator Tool
`tag-generator.html` works standalone (needs internet once to load SheetJS from CDN). Accepts `.csv`, `.xls`, `.xlsx`. Auto-detects columns by fuzzy name matching (family/collection/group/name, size/variant, sku, msrp/price). Supports optional sub-section labels, sort by price, 2-col layout toggle, and custom logo upload.

## How to apply
When the user brings a new Annie Selke spreadsheet, ask which column is the grouping key. Apply the color separation rule (different color = different page). Use the tag-generator.html for one-offs, or generate a new static HTML file via Python for large batches.
