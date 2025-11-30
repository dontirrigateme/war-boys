// ---------- gifts.js ----------
const DATA_VERSION = "2025-11-29-04"; // bump when data files change

const GIFTS_URL      = "../data/gifts.json?v=" + DATA_VERSION;
const TRAITS_URL     = "../data/character_traits.json?v=" + DATA_VERSION;
const MODIFIERS_URL  = "../data/gift_modifiers.json?v=" + DATA_VERSION;
const CHARACTERS_URL = "../data/characters.json?v=" + DATA_VERSION; // for show info, if present

const giftPicker   = document.getElementById("giftPicker");
const charPicker   = document.getElementById("charPicker");
const clearBtn     = document.getElementById("clearFilters");
const summaryLine  = document.getElementById("summaryLine");
const resultsEl    = document.getElementById("results");

let gifts = [];
let charactersWithTraits = [];
let giftModifiers = [];
let charactersMeta = [];

// lookup maps
let giftsByName = new Map();
let traitsByCharacter = new Map();
let showByCommand = new Map();
let modsByGift = new Map();

init().catch(err => {
  console.error("Gift guide init failed:", err);
  resultsEl.innerHTML = `<div class="card"><p class="muted">Couldn’t load gift guide data: ${escapeHtml(String(err))}</p></div>`;
});

async function init() {
  // load all data in parallel
  const [giftsRes, traitsRes, modsRes, charsRes] = await Promise.all([
    fetch(GIFTS_URL),
    fetch(TRAITS_URL),
    fetch(MODIFIERS_URL),
    fetch(CHARACTERS_URL),
  ]);

  if (!giftsRes.ok) throw new Error("Failed to load gifts.json (HTTP " + giftsRes.status + ")");
  if (!traitsRes.ok) throw new Error("Failed to load character_traits.json (HTTP " + traitsRes.status + ")");
  if (!modsRes.ok) throw new Error("Failed to load gift_modifiers.json (HTTP " + modsRes.status + ")");
  // characters.json is optional; if it 404s, we’ll just skip show labels
  if (charsRes.ok) {
    charactersMeta = await charsRes.json().catch(() => []);
  }

  gifts            = await giftsRes.json();
  charactersWithTraits = await traitsRes.json();
  giftModifiers    = await modsRes.json();

  buildLookups();
  buildPickers();
  hookEvents();
  render(); // initial render (no filters)
}

function buildLookups() {
  // gifts
  giftsByName = new Map();
  for (const g of gifts) {
    if (!g.gift_name) continue;
    giftsByName.set(g.gift_name, g);
  }

  // characters: traits + optional show
  traitsByCharacter = new Map();
  for (const c of charactersWithTraits) {
    const name = c.command_name;
    if (!name) continue;
  
    const phys = Array.isArray(c.physical_traits) ? c.physical_traits : [];
    const pers = Array.isArray(c.personality_traits) ? c.personality_traits : [];
  
    // Normalize traits: lowercase + trimmed for case-insensitive matching
    const normalizedTraits = [...phys, ...pers]
      .filter(Boolean)
      .map(t => String(t).toLowerCase().trim());
  
    traitsByCharacter.set(name, new Set(normalizedTraits));
  }

  // show mapping from characters.json, if present
  showByCommand = new Map();
  for (const c of charactersMeta || []) {
    if (c.command_name && c.show) {
      showByCommand.set(c.command_name, c.show);
    }
  }

  // group modifiers by gift_name
  modsByGift = new Map();
  for (const m of giftModifiers) {
    if (!m || !m.gift_name) continue;
    if (!modsByGift.has(m.gift_name)) modsByGift.set(m.gift_name, []);
    modsByGift.get(m.gift_name).push(m);
  }
}

function buildPickers() {
  // Gift dropdown
  giftPicker.innerHTML = "";
  const giftPlaceholder = document.createElement("option");
  giftPlaceholder.value = "";
  giftPlaceholder.textContent = "— Filter by gift —";
  giftPicker.appendChild(giftPlaceholder);

  const sortedGifts = gifts.slice().sort((a, b) => {
    const A = (a.display_name || a.gift_name || "").toLowerCase();
    const B = (b.display_name || b.gift_name || "").toLowerCase();
    return A.localeCompare(B);
  });

  for (const g of sortedGifts) {
    const opt = document.createElement("option");
    opt.value = g.gift_name;
    opt.textContent = g.display_name || g.gift_name;
    giftPicker.appendChild(opt);
  }

  // Character dropdown (only those with traits, since modifiers are trait-based)
  charPicker.innerHTML = "";
  const charPlaceholder = document.createElement("option");
  charPlaceholder.value = "";
  charPlaceholder.textContent = "— Filter by character —";
  charPicker.appendChild(charPlaceholder);

  const sortedChars = charactersWithTraits.slice().sort((a, b) => {
    const A = (a.display_name || a.command_name || "").toLowerCase();
    const B = (b.display_name || b.command_name || "").toLowerCase();
    return A.localeCompare(B);
  });

  for (const c of sortedChars) {
    const opt = document.createElement("option");
    opt.value = c.command_name;
    opt.textContent = c.display_name || c.command_name;
    charPicker.appendChild(opt);
  }
}

function hookEvents() {
  giftPicker.addEventListener("change", render);
  charPicker.addEventListener("change", render);
  clearBtn.addEventListener("click", () => {
    giftPicker.value = "";
    charPicker.value = "";
    render();
  });
}

function render() {
  const giftName = giftPicker.value || "";
  const charName = charPicker.value || "";

  // nothing picked yet
  if (!giftName && !charName) {
    summaryLine.textContent = "Pick a gift, a character, or both to see XP effects.";
    resultsEl.innerHTML = "";
    return;
  }

  // both selected → single row
  if (giftName && charName) {
    const g = giftsByName.get(giftName);
    const c = charactersWithTraits.find(x => x.command_name === charName);
    if (!g || !c) {
      summaryLine.textContent = "Selection not found in data.";
      resultsEl.innerHTML = "";
      return;
    }

    const effect = computeEffect(c, g);
    const labelGift = g.display_name || g.gift_name;
    const labelChar = c.display_name || c.command_name;
    const show = showByCommand.get(c.command_name) || null;

    summaryLine.textContent = `Showing XP effect for “${labelGift}” → ${labelChar}${show ? " (" + prettifyShow(show) + ")" : ""}.`;

    resultsEl.innerHTML = `
      <table class="guide">
        <thead>
          <tr>
            <th>Character</th>
            <th>Gift</th>
            <th>FXP</th>
            <th>RXP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(labelChar)}${show ? `<span class="badge">${escapeHtml(prettifyShow(show))}</span>` : ""}</td>
            <td>${escapeHtml(labelGift)}</td>
            <td>${formatDelta(effect.fxp)}</td>
            <td>${formatDelta(effect.rxp)}</td>
          </tr>
        </tbody>
      </table>
    `;
    return;
  }

  // gift only → list all characters for that gift
  if (giftName && !charName) {
    const g = giftsByName.get(giftName);
    if (!g) {
      summaryLine.textContent = "Gift not found.";
      resultsEl.innerHTML = "";
      return;
    }
    const labelGift = g.display_name || g.gift_name;

    const rows = charactersWithTraits.map(c => {
      const effect = computeEffect(c, g);
      return { char: c, effect };
    }).sort((a, b) => (b.effect.fxp + b.effect.rxp) - (a.effect.fxp + a.effect.rxp));

    summaryLine.textContent = `Showing ${rows.length} characters for “${labelGift}”. Sorted by total XP (FXP + RXP).`;

    resultsEl.innerHTML = renderGiftTableForGift(g, rows);
    return;
  }

  // character only → list all gifts for that character
  if (!giftName && charName) {
    const c = charactersWithTraits.find(x => x.command_name === charName);
    if (!c) {
      summaryLine.textContent = "Character not found.";
      resultsEl.innerHTML = "";
      return;
    }
    const labelChar = c.display_name || c.command_name;
    const show = showByCommand.get(c.command_name) || null;

    const rows = gifts.map(g => {
      const effect = computeEffect(c, g);
      return { gift: g, effect };
    }).sort((a, b) => (b.effect.fxp + b.effect.rxp) - (a.effect.fxp + a.effect.rxp));

    summaryLine.textContent = `Showing ${rows.length} gifts for ${labelChar}${show ? " (" + prettifyShow(show) + ")" : ""}. Sorted by total XP.`;

    resultsEl.innerHTML = renderGiftTableForCharacter(c, rows, show);
  }
}

// ---------- core XP math ----------

function computeEffect(character, gift) {
  const baseFxp = Number(gift.base_fxp || 0);
  const baseRxp = Number(gift.base_rxp || 0);

  let fxp = baseFxp;
  let rxp = baseRxp;

  const charTraits = traitsByCharacter.get(character.command_name) || new Set();
  const show = showByCommand.get(character.command_name) || null;
  const mods = modsByGift.get(gift.gift_name) || [];

  for (const m of mods) {
    if (!m) continue;

    const type   = m.modifier_type;
    const target = m.target;
    const dF     = Number(m.fxp_modifier || 0);
    const dR     = Number(m.rxp_modifier || 0);

    if (type === "trait") {
      const targetNorm = String(target || "").toLowerCase().trim();
      if (targetNorm && charTraits.has(targetNorm)) {
        fxp += dF;
        rxp += dR;
      }
    } else if (type === "character") {
      if (character.command_name === target || character.display_name === target) {
        fxp += dF;
        rxp += dR;
      }
    } else if (type === "show" && show) {
      if (show === target) {
        fxp += dF;
        rxp += dR;
      }
    }
    // you can add more modifier types here later if you invent them
  }

  return { fxp, rxp };
}

// ---------- rendering helpers ----------

function renderGiftTableForGift(gift, rows) {
  const labelGift = gift.display_name || gift.gift_name;
  let html = `
    <table class="guide">
      <thead>
        <tr>
          <th>Character</th>
          <th>Show</th>
          <th>FXP</th>
          <th>RXP</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const { char, effect } of rows) {
    const labelChar = char.display_name || char.command_name;
    const show = showByCommand.get(char.command_name) || "";
    const total = effect.fxp + effect.rxp;
    html += `
      <tr>
        <td>${escapeHtml(labelChar)}</td>
        <td>${escapeHtml(show ? prettifyShow(show) : "—")}</td>
        <td>${formatDelta(effect.fxp)}</td>
        <td>${formatDelta(effect.rxp)}</td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  return html;
}

function renderGiftTableForCharacter(character, rows, show) {
  const labelChar = character.display_name || character.command_name;

  let html = `
    <table class="guide">
      <thead>
        <tr>
          <th>Gift</th>
          <th>Base FXP</th>
          <th>Base RXP</th>
          <th>Final FXP</th>
          <th>Final RXP</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const { gift, effect } of rows) {
    const labelGift = gift.display_name || gift.gift_name;
    const baseFxp = Number(gift.base_fxp || 0);
    const baseRxp = Number(gift.base_rxp || 0);
    const total = effect.fxp + effect.rxp;
    html += `
      <tr>
        <td>${escapeHtml(labelGift)}</td>
        <td>${formatDelta(baseFxp)}</td>
        <td>${formatDelta(baseRxp)}</td>
        <td>${formatDelta(effect.fxp)}</td>
        <td>${formatDelta(effect.rxp)}</td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  return html;
}

function formatDelta(n) {
  const v = Number(n || 0);
  const cls = v > 0 ? "delta-pos" : v < 0 ? "delta-neg" : "";
  const sign = v > 0 ? "+" : "";
  return `<span class="${cls}">${sign}${v}</span>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function prettifyShow(key) {
  const map = {
    band_of_brothers: "Band of Brothers",
    the_pacific: "The Pacific",
    masters_of_the_air: "Masters of the Air",
    generation_kill: "Generation Kill",
    preacher: "Preacher",
    ncis: "NCIS",
  };
  return map[key] || String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}
