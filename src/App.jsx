import { useState, useRef, useCallback } from "react";

// ── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:       "#0C0C0C",
  surface:  "#141414",
  raised:   "#1C1C1C",
  border:   "#2A2A2A",
  amber:    "#F59E0B",
  amberDim: "#92600A",
  green:    "#22C55E",
  red:      "#EF4444",
  text:     "#F0EDE8",
  muted:    "#6B6863",
  faint:    "#302E2B",
};

const font = {
  display: "'Bebas Neue', 'Impact', sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  body:    "'DM Sans', 'Helvetica Neue', sans-serif",
};

// ── GLOBAL STYLES ─────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${C.bg};
    color: ${C.text};
    font-family: ${font.body};
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  .fade-up { animation: fadeUp 0.35s ease forwards; }
  .fade-up-1 { animation: fadeUp 0.35s 0.05s ease both; }
  .fade-up-2 { animation: fadeUp 0.35s 0.10s ease both; }
  .fade-up-3 { animation: fadeUp 0.35s 0.15s ease both; }
  .fade-up-4 { animation: fadeUp 0.35s 0.20s ease both; }
  .fade-up-5 { animation: fadeUp 0.35s 0.25s ease both; }

  .spin { animation: spin 0.75s linear infinite; }

  .shimmer-text {
    background: linear-gradient(90deg, ${C.amber} 0%, #FDE68A 45%, ${C.amber} 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 2s linear infinite;
  }

  input[type=file] { display: none; }
  button { cursor: pointer; border: none; background: none; font-family: inherit; }
  img { display: block; max-width: 100%; }
`;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

function fmt(n) {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

// bundle discount: 10-18% off sum of mids
function bundleDiscount(items) {
  const sumMid = items.reduce((a, i) => a + (i.ebayMid ?? 0), 0);
  const pct = items.length <= 3 ? 0.10 : items.length <= 6 ? 0.13 : 0.17;
  const bundleValue = Math.round(sumMid * (1 - pct));
  const startingBid = Math.round(bundleValue * 0.65);
  return { sumMid, pct, bundleValue, startingBid };
}

// ── CATEGORY BADGE ────────────────────────────────────────────────────────────
const CAT_COLORS = {
  Console:    { bg: "#1A1200", border: "#78350F", text: C.amber },
  Game:       { bg: "#0A1F0A", border: "#166534", text: C.green },
  Controller: { bg: "#0F0A1F", border: "#4C1D95", text: "#A78BFA" },
  Accessory:  { bg: "#1A0A0A", border: "#7F1D1D", text: "#FCA5A5" },
  Other:      { bg: "#111111", border: "#333333", text: C.muted },
};
function CategoryBadge({ cat }) {
  const s = CAT_COLORS[cat] || CAT_COLORS.Other;
  return (
    <span style={{
      fontSize: 9, fontFamily: font.mono, fontWeight: 600,
      letterSpacing: "0.12em", textTransform: "uppercase",
      padding: "3px 7px", borderRadius: 4,
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
    }}>{cat}</span>
  );
}

// ── CONDITION DOT ─────────────────────────────────────────────────────────────
function ConditionDot({ cond }) {
  const color = cond === "Excellent" ? C.green : cond === "Good" ? C.amber : C.red;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: C.muted, fontFamily: font.mono }}>{cond}</span>
    </span>
  );
}

// ── ITEM CARD ─────────────────────────────────────────────────────────────────
function ItemCard({ item, idx }) {
  const animClass = `fade-up-${Math.min(idx + 1, 5)}`;
  return (
    <div className={animClass} style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 10,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.3, marginBottom: 6 }}>
            {item.name}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <CategoryBadge cat={item.category} />
            {item.platform && item.platform !== "N/A" && (
              <span style={{ fontSize: 9, fontFamily: font.mono, color: C.muted, letterSpacing: "0.08em" }}>
                {item.platform}
              </span>
            )}
          </div>
        </div>
        {/* Price block */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontFamily: font.mono, fontSize: 20, fontWeight: 600,
            color: C.amber, letterSpacing: "-0.02em",
          }}>
            {fmt(item.ebayMid)}
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: C.muted, marginTop: 2 }}>
            {fmt(item.ebayLow)} – {fmt(item.ebayHigh)}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 10, borderTop: `1px solid ${C.faint}`,
      }}>
        <ConditionDot cond={item.condition} />
        {item.conditionNote && (
          <span style={{ fontSize: 11, color: C.muted, textAlign: "right", maxWidth: "60%", lineHeight: 1.3 }}>
            {item.conditionNote}
          </span>
        )}
      </div>

      {/* eBay label */}
      <div style={{
        marginTop: 8,
        fontSize: 9, fontFamily: font.mono, color: C.amberDim,
        letterSpacing: "0.1em", textTransform: "uppercase",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <span style={{ opacity: 0.7 }}>⬤</span> eBay Sold Listings
      </div>
    </div>
  );
}

// ── BUNDLE VIEW ───────────────────────────────────────────────────────────────
function BundleView({ items, notes }) {
  const { sumMid, pct, bundleValue, startingBid } = bundleDiscount(items);
  const savings = sumMid - bundleValue;

  return (
    <div className="fade-up">
      {/* Main bundle card */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.amber}`,
        borderRadius: 16,
        padding: "20px",
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Texture stripe */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `repeating-linear-gradient(90deg, ${C.amber} 0px, ${C.amber} 8px, transparent 8px, transparent 16px)`,
        }} />

        <div style={{ fontSize: 11, fontFamily: font.mono, color: C.amberDim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          Bundle Est. Value
        </div>
        <div style={{ fontFamily: font.display, fontSize: 52, color: C.amber, letterSpacing: "0.01em", lineHeight: 1 }}>
          {fmt(bundleValue)}
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: C.muted, marginTop: 4 }}>
          {Math.round(pct * 100)}% bundle discount applied · saves {fmt(savings)} vs. individual
        </div>

        <div style={{ height: 1, background: C.faint, margin: "16px 0" }} />

        {/* Starting bid */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: font.mono, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Suggested Starting Bid
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 28, fontWeight: 600, color: C.green, marginTop: 2 }}>
              {fmt(startingBid)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontFamily: font.mono, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Items
            </div>
            <div style={{ fontFamily: font.display, fontSize: 36, color: C.text }}>
              {items.length}
            </div>
          </div>
        </div>
      </div>

      {/* Item breakdown (compact) */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: "hidden", marginBottom: 14,
      }}>
        <div style={{
          padding: "10px 14px",
          fontSize: 10, fontFamily: font.mono, color: C.muted,
          letterSpacing: "0.12em", textTransform: "uppercase",
          borderBottom: `1px solid ${C.faint}`,
        }}>
          Item Breakdown
        </div>
        {items.map((item, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px",
            borderBottom: i < items.length - 1 ? `1px solid ${C.faint}` : "none",
          }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 2 }}>{item.name}</div>
              <CategoryBadge cat={item.category} />
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 600, color: C.amber, flexShrink: 0 }}>
              {fmt(item.ebayMid)}
            </div>
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px",
          background: C.raised,
        }}>
          <div style={{ fontSize: 11, fontFamily: font.mono, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Sum of Individuals
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 13, color: C.muted, textDecoration: "line-through" }}>
            {fmt(sumMid)}
          </div>
        </div>
      </div>

      {/* WhatNot tips */}
      {notes?.length > 0 && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 14px",
            fontSize: 10, fontFamily: font.mono, color: C.muted,
            letterSpacing: "0.12em", textTransform: "uppercase",
            borderBottom: `1px solid ${C.faint}`,
          }}>
            WhatNot Strategy
          </div>
          {notes.map((tip, i) => (
            <div key={i} style={{
              padding: "10px 14px",
              borderBottom: i < notes.length - 1 ? `1px solid ${C.faint}` : "none",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ color: C.amber, fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</span>
              <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LOADING SKELETON ──────────────────────────────────────────────────────────
function Skeleton() {
  const bar = (w, h = 12, mb = 6) => (
    <div style={{
      width: w, height: h, borderRadius: 4,
      background: `linear-gradient(90deg, ${C.raised} 0%, ${C.faint} 50%, ${C.raised} 100%)`,
      backgroundSize: "200% auto",
      animation: "shimmer 1.4s linear infinite",
      marginBottom: mb,
    }} />
  );
  return (
    <div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "14px 16px", marginBottom: 10,
        }}>
          {bar("65%", 14, 10)}
          {bar("40%", 10, 14)}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {bar("30%", 10)}
            {bar("25%", 10)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [image, setImage]     = useState(null);
  const [base64, setBase64]   = useState(null);
  const [mime, setMime]       = useState("image/jpeg");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const [view, setView]       = useState("individual"); // "individual" | "bundle"
  const fileRef = useRef();
  const cameraRef = useRef();

  const handleFile = useCallback(async (file) => {
    if (!file?.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(file));
    setMime(file.type || "image/jpeg");
    setBase64(await fileToBase64(file));
    setResult(null);
    setError(null);
    setView("individual");
  }, []);

  const handleScan = async () => {
    if (!base64 || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const systemPrompt = `You are an expert resale pricing specialist with deep knowledge of eBay SOLD listings for gaming gear, electronics, and collectibles. You specialize in WhatNot auction pricing.

Analyze the image. Return ONLY valid JSON — no markdown, no fences, no extra text.

{
  "items": [
    {
      "name": "Specific item name",
      "category": "Console | Game | Controller | Accessory | Other",
      "platform": "PS5 | PS4 | Xbox | Switch | PC | N/A",
      "condition": "Excellent | Good | Fair",
      "conditionNote": "One short phrase about visible condition",
      "ebayLow": 45,
      "ebayMid": 60,
      "ebayHigh": 75
    }
  ],
  "whatnotTips": [
    "Short WhatNot-specific auction tip 1",
    "Short WhatNot-specific auction tip 2",
    "Short WhatNot-specific auction tip 3"
  ]
}

Rules:
- All prices are integers (USD), based on eBay completed/sold listings
- ebayMid should be the realistic sold median, not the average of low/high
- Be specific with names (e.g. "Call of Duty: Black Ops 6 PS5" not just "game")
- WhatNot tips should be practical and auction-specific (starting bids, bundling order, hot items to lead with, etc.)`;

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mime, data: base64 } },
              { type: "text", text: "Inventory and price everything visible in this photo for a WhatNot auction seller. Return only the JSON." },
            ],
          }],
        }),
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text ?? "";
      const clean = raw.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch (e) {
      setError("Couldn't analyze this photo. Try a clearer, well-lit shot.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null); setBase64(null); setResult(null); setError(null); setView("individual");
  };

  const totalLow = result?.items?.reduce((a, i) => a + (i.ebayLow ?? 0), 0) ?? 0;
  const totalHigh = result?.items?.reduce((a, i) => a + (i.ebayHigh ?? 0), 0) ?? 0;
  const totalMid = result?.items?.reduce((a, i) => a + (i.ebayMid ?? 0), 0) ?? 0;

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* ── HEADER ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: C.amber,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>⚡</div>
          <div>
            <div style={{ fontFamily: font.display, fontSize: 22, letterSpacing: "0.06em", lineHeight: 1, color: C.text }}>
              LOTSCAN
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 9, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              WhatNot Pricer
            </div>
          </div>
        </div>

        {/* eBay badge */}
        <div style={{
          fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em",
          textTransform: "uppercase", color: C.amberDim,
          border: `1px solid ${C.amberDim}`, borderRadius: 4,
          padding: "3px 8px",
        }}>
          eBay Sold
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: "16px 16px 80px", maxWidth: 480, margin: "0 auto" }}>

        {/* UPLOAD ZONE */}
        {!image ? (
          <div style={{ marginBottom: 20 }}>
            {/* Hidden inputs — library and camera separate for max mobile compat */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp,image/*"
              onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
            />

            {/* Drop zone (desktop) / tap area (mobile) */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              style={{
                border: `2px dashed ${dragging ? C.amber : C.border}`,
                borderRadius: 16,
                padding: "36px 24px 28px",
                textAlign: "center",
                background: dragging ? `${C.amber}08` : "transparent",
                transition: "all 0.2s",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div style={{ fontFamily: font.display, fontSize: 28, letterSpacing: "0.06em", color: C.text, marginBottom: 16 }}>
                ADD YOUR LOT
              </div>

              {/* Two explicit buttons — critical for iOS */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    flex: 1, padding: "13px 10px",
                    background: C.amber, borderRadius: 10,
                    fontFamily: font.mono, fontSize: 11, fontWeight: 600,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: C.bg,
                  }}
                >
                  🖼 Photo Library
                </button>
                <button
                  onClick={() => cameraRef.current?.click()}
                  style={{
                    flex: 1, padding: "13px 10px",
                    background: C.raised, borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    fontFamily: font.mono, fontSize: 11, fontWeight: 600,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: C.muted,
                  }}
                >
                  📷 Camera
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Photo preview */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <img
                src={image} alt="Lot"
                style={{
                  width: "100%", borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  maxHeight: 260, objectFit: "cover",
                }}
              />
              {!result && !loading && (
                <button
                  onClick={reset}
                  style={{
                    position: "absolute", top: 10, right: 10,
                    background: "rgba(0,0,0,0.7)", border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: "5px 10px",
                    fontFamily: font.mono, fontSize: 10, color: C.muted,
                    letterSpacing: "0.06em",
                  }}
                >
                  ✕ CHANGE
                </button>
              )}
            </div>

            {/* Scan button */}
            {!result && (
              <button
                onClick={handleScan}
                disabled={loading || !base64}
                style={{
                  width: "100%", padding: "16px",
                  background: loading ? C.raised : C.amber,
                  borderRadius: 12, marginBottom: 16,
                  fontFamily: font.display, fontSize: 22, letterSpacing: "0.08em",
                  color: loading ? C.muted : C.bg,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all 0.2s",
                  border: `1px solid ${loading ? C.border : C.amber}`,
                }}
              >
                {loading ? (
                  <>
                    <div className="spin" style={{
                      width: 18, height: 18,
                      border: `2px solid ${C.muted}`,
                      borderTop: `2px solid ${C.amber}`,
                      borderRadius: "50%",
                    }} />
                    SCANNING LOT...
                  </>
                ) : "⚡ SCAN & PRICE"}
              </button>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "#1A0A0A", border: `1px solid ${C.red}`,
            borderRadius: 10, padding: "12px 14px",
            fontFamily: font.mono, fontSize: 12, color: C.red,
            marginBottom: 16,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && <Skeleton />}

        {/* RESULTS */}
        {result && (
          <>
            {/* Summary bar */}
            <div className="fade-up" style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: "14px 16px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 12,
            }}>
              <div>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                  {result.items.length} items · eBay range
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 13, color: C.muted }}>
                  <span style={{ color: C.text, fontWeight: 600 }}>{fmt(totalLow)}</span>
                  {" – "}
                  <span style={{ color: C.text, fontWeight: 600 }}>{fmt(totalHigh)}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                  Individual mid
                </div>
                <div className="shimmer-text" style={{ fontFamily: font.display, fontSize: 28, letterSpacing: "0.02em" }}>
                  {fmt(totalMid)}
                </div>
              </div>
            </div>

            {/* Toggle */}
            <div className="fade-up" style={{
              display: "flex", background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 10,
              padding: 3, marginBottom: 14,
            }}>
              {["individual", "bundle"].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    flex: 1, padding: "10px",
                    borderRadius: 8,
                    fontFamily: font.mono, fontSize: 11,
                    fontWeight: 600, letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    transition: "all 0.2s",
                    background: view === v ? C.amber : "transparent",
                    color: view === v ? C.bg : C.muted,
                  }}
                >
                  {v === "individual" ? "⊞ Individual" : "⊟ Bundle"}
                </button>
              ))}
            </div>

            {/* Individual view */}
            {view === "individual" && (
              <div>
                {result.items.map((item, i) => (
                  <ItemCard key={i} item={item} idx={i} />
                ))}
              </div>
            )}

            {/* Bundle view */}
            {view === "bundle" && (
              <BundleView items={result.items} notes={result.whatnotTips} />
            )}

            {/* Scan another */}
            <button
              onClick={reset}
              style={{
                width: "100%", marginTop: 20, padding: "14px",
                background: "transparent", border: `1px solid ${C.border}`,
                borderRadius: 12,
                fontFamily: font.mono, fontSize: 11, color: C.muted,
                letterSpacing: "0.1em", textTransform: "uppercase",
              }}
            >
              ← Scan Another Lot
            </button>
          </>
        )}
      </div>
    </>
  );
}