---
name: Annie Selke Price Tags — Project Overview
description: Everything about the price tag generator for Annie Selke bedding and rug products, including file locations, logic, and rules
type: project
originSessionId: fdedd29e-c8f9-4088-824b-f8ee63aad24e
---
# Annie Selke Price Tags

**Location:** `/Users/christiantorres/Desktop/Data feed/Annie Selke Price Tags/`

**Why:** Generate print-ready price tags for Annie Selke products (bedding, rugs) from spreadsheet data, replicating the physical tag format with logo, collection name, and size/SKU/price variants.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Landing page — open this first |
| `annie-selke-bedding-tags.html` | 202 bedding products, grouped by collection |
| `annie-selke-rug-tags.html` | 958 rug products, 135 tags |
| `tag-generator.html` | Reusable drag-and-drop tool for any future spreadsheet |
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
- Lone last item in a 2-col grid spans full width (CSS: `.two-col .variant:last-child:nth-child(odd) { grid-column: 1 / -1; }`)
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
