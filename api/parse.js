module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rows, instructions } = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'rows array required' });

  const knownTypes = [
    "Quilted Coverlet Sham", "Matelasse Coverlet", "Matelasse Sham",
    "Quilted Coverlet", "Quilted Sham", "Duvet Cover", "Duvet Sham",
    "Coverlet Sham", "Sheet Set", "Pillowcases", "Coverlet",
    "Decorative Pillow", "Indoor/Outdoor Pillow",
    "Blanket", "Throw", "Quilt", "Sham", "Rug Ottoman"
  ];

  const system = `You are a product data parser for a home goods price tag generator. \
Return ONLY valid JSON — no explanation, no markdown, no code blocks.`;

  const user = `Parse each product row into structured fields for price tags.

Known product types (use these when they match): ${knownTypes.join(', ')}

Rules:
- collection: the product family/design name (e.g. "Amity Navy", "Oliver Ombre Denim")
- type: match to a known type above; use your best judgment for anything unfamiliar
- variant: size or configuration (e.g. "King", "Twin/Twin XL", '16" × 24"', '22" Sq'). Empty string if none.
- sku: return exactly as provided in input
- price: return exactly as provided in input (number)
- suppress: true only if price is 0 or the item is clearly a placeholder that shouldn't print
- If a SKU ends in CV, note "Cover Only" in the variant field
- If a SKU ends in KIT, note "With Insert" in the variant field
- Strip any zero-width or invisible characters from names
${instructions ? `\nAdditional instructions from user: ${instructions}` : ''}

Input rows:
${JSON.stringify(rows)}

Return a JSON array with exactly ${rows.length} objects, one per input row, in this format:
[{"collection":"...","type":"...","variant":"...","sku":"...","price":0,"suppress":false}]`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return res.status(502).json({ error: 'Anthropic API error', detail });
    }

    const data = await resp.json();
    const text = data.content[0].text.trim();

    // Extract JSON array robustly — handles any stray text
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(502).json({ error: 'Could not extract JSON from response', raw: text.slice(0, 400) });

    const parsed = JSON.parse(match[0]);
    return res.json({ parsed });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
