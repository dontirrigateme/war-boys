// blorbo-lab.js
const BASE_PATH = ".."; // adjust if needed
const DATA_VERSION = "20251116a"; // bump this when JSON changes

let characters = [];
let gifts = [];
let giftModifiers = [];

async function loadData() {
  const v = `?v=${DATA_VERSION}`;
  
  const [charsRes, giftsRes, modsRes] = await Promise.all([
    fetch(`${BASE_PATH}/data/character_traits.json`),
    fetch(`${BASE_PATH}/data/gifts.json`),
    fetch(`${BASE_PATH}/data/gift_modifiers.json`)
  ]);
  
  characters = await charsRes.json();
  gifts = await giftsRes.json();
  giftModifiers = await modsRes.json();

  populateSelect();
}

function populateSelect() {
  const select = document.getElementById("blorboSelect");
  characters
    .slice()
    .sort((a, b) => a.display_name.localeCompare(b.display_name))
    .forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.command_name;
      opt.textContent = c.display_name;
      select.appendChild(opt);
    });

  select.addEventListener("change", () => {
    const cmd = select.value;
    if (!cmd) {
      document.getElementById("blorboPanel").style.display = "none";
      return;
    }
    const character = characters.find(c => c.command_name === cmd);
    if (character) renderBlorbo(character);
  });
}

function renderBlorbo(character) {
  // Show panel
  document.getElementById("blorboPanel").style.display = "block";

  // Image + name
  document.getElementById("blorboName").textContent = character.display_name;
  const img = document.getElementById("blorboImg");
  img.src = `${BASE_PATH}/assets/${character.image}`; // adjust path to your portraits
  img.alt = character.display_name;

  // Traits
  fillList("physicalList", character.physical_traits);
  fillList("personalityList", character.personality_traits);

  // Gifts
  const buckets = {
    fxpPos: [],
    fxpNeg: [],
    rxpPos: [],
    rxpNeg: []
  };

  gifts.forEach(g => {
    const { fxp, rxp } = computeGiftResult(g, character);
    if (fxp > 0) buckets.fxpPos.push([g.display_name, fxp]);
    if (fxp < 0) buckets.fxpNeg.push([g.display_name, fxp]);
    if (rxp > 0) buckets.rxpPos.push([g.display_name, rxp]);
    if (rxp < 0) buckets.rxpNeg.push([g.display_name, rxp]);
  });

  fillGiftList("fxpPos", buckets.fxpPos);
  fillGiftList("fxpNeg", buckets.fxpNeg);
  fillGiftList("rxpPos", buckets.rxpPos);

}

function fillList(id, items = []) {
  const ul = document.getElementById(id);
  ul.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "— none listed —";
    ul.appendChild(li);
    return;
  }
  items.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });
}

function fillGiftList(id, arr) {
  const ul = document.getElementById(id);
  ul.innerHTML = "";
  if (!arr.length) {
    const li = document.createElement("li");
    li.textContent = "— none —";
    ul.appendChild(li);
    return;
  }
  // Optionally sort by magnitude
  arr.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  arr.forEach(([name, value]) => {
    const li = document.createElement("li");
    li.textContent = `${name} (${value > 0 ? "+" : ""}${value})`;
    ul.appendChild(li);
  });
}

function computeGiftResult(gift, character) {
  let fxp = gift.base_fxp || 0;
  let rxp = gift.base_rxp || 0;

  const charTraits = new Set([
    ...(character.physical_traits || []),
    ...(character.personality_traits || [])
  ]);

  giftModifiers
    .filter(m => m.gift_name === gift.gift_name)
    .forEach(m => {
      if (m.modifier_type === "trait" && charTraits.has(m.target)) {
        fxp += m.fxp_modifier || 0;
        rxp += m.rxp_modifier || 0;
      } else if (m.modifier_type === "character" && m.target === character.command_name) {
        fxp += m.fxp_modifier || 0;
        rxp += m.rxp_modifier || 0;
      }
      // You can add "category" or other types here later.
    });

  return { fxp, rxp };
}

loadData().catch(err => {
  console.error("Failed to load blorbo data", err);
});
