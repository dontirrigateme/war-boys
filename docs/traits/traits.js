const DATA_VERSION = "2025-11-29-01";

const TRAITS_URL     = "../data/character_traits.json?v=" + DATA_VERSION;
const CHARACTERS_URL = "../data/characters.json?v=" + DATA_VERSION;
const IMG_BASE       = "../assets/images/";

const SHOW_LABEL = {
  band_of_brothers: "Band of Brothers",
  the_pacific: "The Pacific",
  masters_of_the_air: "Masters of the Air",
  generation_kill: "Generation Kill",
  preacher: "Preacher",
  ncis: "NCIS",
};

const charPicker = document.getElementById("charPicker");
const summaryEl  = document.getElementById("summary");
const cardEl     = document.getElementById("traitCard");

let traitsList = [];
let charactersMeta = [];
let traitsByCommand = new Map();
let metaByCommand = new Map();

init().catch(err => {
  console.error("Traits init failed:", err);
  summaryEl.textContent = "Couldn’t load traits data: " + String(err);
});

async function init() {
  const [traitsRes, charsRes] = await Promise.all([
    fetch(TRAITS_URL),
    fetch(CHARACTERS_URL),
  ]);

  if (!traitsRes.ok) throw new Error("character_traits.json HTTP " + traitsRes.status);
  if (!charsRes.ok)   throw new Error("characters.json HTTP " + charsRes.status);

  traitsList     = await traitsRes.json();
  charactersMeta = await charsRes.json();

  buildLookups();
  buildPicker();
  hookEvents();
}

function buildLookups() {
  traitsByCommand.clear();
  for (const t of traitsList) {
    if (!t || !t.command_name) continue;
    traitsByCommand.set(t.command_name, t);
  }

  metaByCommand.clear();
  for (const c of charactersMeta) {
    if (!c || !c.command_name) continue;
    metaByCommand.set(c.command_name, c);
  }
}

function buildPicker() {
  // clear any existing options except placeholder
  while (charPicker.options.length > 1) {
    charPicker.remove(1);
  }

  const sorted = traitsList.slice().sort((a, b) => {
    const A = (a.display_name || a.command_name || "").toLowerCase();
    const B = (b.display_name || b.command_name || "").toLowerCase();
    return A.localeCompare(B);
  });

  for (const t of sorted) {
    const opt = document.createElement("option");
    opt.value = t.command_name;
    opt.textContent = t.display_name || t.command_name;
    charPicker.appendChild(opt);
  }
}

function hookEvents() {
  charPicker.addEventListener("change", () => {
    const cmd = charPicker.value || "";
    if (!cmd) {
      summaryEl.textContent = "Pick a character from the menu above.";
      cardEl.innerHTML = "";
      return;
    }
    renderCharacter(cmd);
  });
}

function renderCharacter(commandName) {
  const t = traitsByCommand.get(commandName);
  const meta = metaByCommand.get(commandName) || {};
  if (!t) {
    summaryEl.textContent = "Character not found in trait data.";
    cardEl.innerHTML = "";
    return;
  }

  const name = t.display_name || meta.title || commandName;
  const showKey = meta.show || t.show || null;
  const showLabel = showKey ? prettifyShow(showKey) : null;

  const phys = Array.isArray(t.physical_traits) ? t.physical_traits : [];
  const pers = Array.isArray(t.personality_traits) ? t.personality_traits : [];

  // image: prefer trait image, then characters image
  const imgFile = t.image || meta.image || null;
  const imgSrc  = imgFile ? (IMG_BASE + imgFile) : null;

  summaryEl.textContent = showLabel
    ? `${name} · ${showLabel}`
    : name;

  cardEl.innerHTML = `
    <article class="trait-card">
      <div class="trait-left">
        <div class="trait-header">
          ${imgSrc ? `
            <img class="portrait" src="${escapeHtml(imgSrc)}"
                 alt="${escapeHtml(name)} thumbnail" loading="lazy" decoding="async">
          ` : ""}
          <div>
            <h2>${escapeHtml(name)}</h2>
            ${showLabel ? `<span class="badge">${escapeHtml(showLabel)}</span>` : ""}
          </div>
        </div>
      </div>
      <div class="trait-right">
        <div class="trait-columns">
          <div class="trait-column">
            <h3>Physical traits</h3>
            ${phys.length ? `<ul>${phys.map(tr => `<li>${escapeHtml(tr)}</li>`).join("")}</ul>` : `<p class="muted">No physical traits listed.</p>`}
          </div>
          <div class="trait-column">
            <h3>Personality traits</h3>
            ${pers.length ? `<ul>${pers.map(tr => `<li>${escapeHtml(tr)}</li>`).join("")}</ul>` : `<p class="muted">No personality traits listed.</p>`}
          </div>
        </div>
      </div>
    </article>
  `;
}

function prettifyShow(key) {
  if (!key) return "";
  if (SHOW_LABEL[key]) return SHOW_LABEL[key];
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
