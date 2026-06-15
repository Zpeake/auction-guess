export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // STEP 1: Haiku inventory
    const inventoryRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 5000,
        system: `You are an inventory scanner. Your only job is to identify every single item visible in the image. Return ONLY a JSON array — no markdown, no explanation.
[
  { "name": "Exact item name", "category": "Console | Game | Controller | Accessory | Other", "platform": "PS5 | PS4 | Xbox | Switch | N64 | SNES | PC | N/A", "condition": "Excellent | Good | Fair", "conditionNote": "one short phrase" }
]
Rules:
- List EVERY item individually, no grouping ever
- For games, read the exact title carefully — especially spines
- For consoles, note the model (e.g. Nintendo Switch V2, not just Switch)
- If unsure of a title, make your best read — never skip an item`,
        messages: body.messages,
      }),
    });

    const inventoryData = await inventoryRes.json();
    if (inventoryData.error) {
      return res.status(500).json({ error: "Inventory step failed", detail: inventoryData.error });
    }

    const inventoryText = inventoryData.content?.find(b => b.type === "text")?.text ?? "";
    const cleanInventory = inventoryText.replace(/```json|```/g, "").trim();
    const items = JSON.parse(cleanInventory);

    // STEP 2: Sonnet pricing
    const pricingRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 5000,
        system: `You are an expert resale pricing specialist with deep knowledge of eBay SOLD listings. You will receive a JSON inventory list and must return pricing for every item.
Return ONLY valid JSON — no markdown, no fences.
{
  "items": [
    {
      "name": "item name",
      "category": "category",
      "platform": "platform",
      "condition": "condition",
      "conditionNote": "conditionNote",
      "ebayLow": 45,
      "ebayMid": 60,
      "ebayHigh": 75
    }
  ],
  "whatnotTips": ["tip 1", "tip 2", "tip 3"]
}
Rules:
- All prices integers (USD) based on eBay completed/sold listings
- ebayMid is the realistic sold median
- Preserve all fields from the input inventory exactly
- Return every item, no skipping`,
        messages: [
          {
            role: "user",
            content: `Price each item in this inventory based on eBay sold listings:\n\n${JSON.stringify(items, null, 2)}`,
          },
        ],
      }),
    });

    const pricingData = await pricingRes.json();
    if (pricingData.error) {
      return res.status(500).json({ error: "Pricing step failed", detail: pricingData.error });
    }

    const pricingText = pricingData.content?.find(b => b.type === "text")?.text ?? "";
    const cleanPricing = pricingText.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanPricing);

    res.status(200).json(result);

  } catch (err) {
    console.error("scan error:", err);
    res.status(500).json({ error: err.message });
  }
}
