// ---------- children.js (clean) ----------
const DATA_VERSION = "2025-11-12-06"; // bump when children.json changes
const DATA_URL = "../data/children.json?v=" + DATA_VERSION;

const results     = document.getElementById("results");
const countLine   = document.getElementById("countLine");
const fatherPicker= document.getElementById("fatherPicker");
const userPicker  = document.getElementById("userPicker");
const sortPicker  = document.getElementById("sortPicker");
const search      = document.getElementById("search");

let children = [];
let fathers  = [];
let users    = [];

init().catch(err => {
  console.error(err);
  if (results) {
    results.innerHTML = `<div class="child-card"><div class="meta">Couldn’t load children: ${escapeHtml(String(err))}</div></div>`;
  }
});

async function init() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error("HTTP " + res.status);
  children = await res.json();
  normalize();
  buildFatherPicker();
  buildUserPicker();
  hookEvents();
  render();
}

function normalize() {
  for (const c of children) {
    // age
    if (!c.age_days && c.birth_date) {
      const ts = parseBirthDate(c.birth_date);
      if (!Number.isNaN(ts)) {
        c.age_days = Math.max(0, Math.floor((Date.now() - ts) / 86400000));
      }
    }
    // names
    c._name = c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();

    const f = c.father;
    c._fatherName =
      (typeof f === "string" && f) ||
      (f && (f.display_name || f.command_name)) ||
      c.father_name ||
      "Unknown";

    // user (adopter vs birth mother)
    c._userName = c.mother_user_name || c.mother_user_id || null;
    c._birthMotherName = c.birth_mother || null;
  }

  fathers = Array.from(new Set(children.map(c => c._fatherName).filter(Boolean)))
    .sort((a,b)=>a.localeCompare(b));
  users = Array.from(new Set(children.map(c => c._userName).filter(Boolean)))
    .sort((a,b)=>a.localeCompare(b));
}

function buildFatherPicker() {
  fatherPicker.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = ""; ph.selected = true;
  ph.textContent = fathers.length ? "— All fathers —" : "No fathers found";
  fatherPicker.appendChild(ph);
  for (const f of fathers) {
    const opt = document.createElement("option");
    opt.value = f; opt.textContent = f;
    fatherPicker.appendChild(opt);
  }
}

function buildUserPicker() {
  userPicker.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = ""; ph.selected = true;
  ph.textContent = users.length ? "— All users —" : "No users found";
  userPicker.appendChild(ph);
  for (const u of users) {
    const opt = document.createElement("option");
    opt.value = u; opt.textContent = u;
    userPicker.appendChild(opt);
  }
}

function hookEvents() {
  fatherPicker.addEventListener("change", render);
  userPicker.addEventListener("change", render);
  sortPicker.addEventListener("change", render);
  search.addEventListener("input", render);
}

function render() {
  const term   = search.value.trim().toLowerCase();
  const father = fatherPicker.value;
  const user   = userPicker.value;

  let rows = children.filter(c =>
    (!father || c._fatherName === father) &&
    (!user   || c._userName   === user) &&
    (!term   || (c._name || "").toLowerCase().includes(term))
  );

  // sort
  const mode = sortPicker.value;
  rows.sort((a,b) => {
    if (mode === "age_desc")  return (b.age_days||0) - (a.age_days||0);
    if (mode === "age_asc")   return (a.age_days||0) - (b.age_days||0);
    if (mode === "name_desc") return (b._name||"").localeCompare(a._name||"");
    return (a._name||"").localeCompare(b._name||""); // name_asc
  });

  // count line
  const total = children.length;
  const shown = rows.length;
  if (countLine) {
    countLine.textContent =
      `${shown} ${shown === 1 ? "child" : "children"} shown` +
      (shown !== total ? ` (${total} total)` : "");
  }

  // render cards
  results.innerHTML = "";
  if (!rows.length) {
    results.innerHTML = `<div class="child-card"><div class="meta">No children match.</div></div>`;
    return;
  }
  for (const c of rows) {
    const div = document.createElement("div");
    div.className = "child-card";
    div.innerHTML = `
      <div class="name">${escapeHtml(c._name || "Unnamed Baby")}</div>
      <div class="meta">
        <span class="badge">${escapeHtml(c._stage || c.stage || "—")}</span>
        <span class="badge">${c.sex === "M" ? "Boy" : c.sex === "F" ? "Girl" : "—"}</span>
        ${c.adopted_out ? '<span class="badge">Adopted</span>' : ''} 
      </div>
      <div class="meta" style="margin-top:6px">
        <strong>Age:</strong> ${formatAge(c)}<br/>
        <strong>Born:</strong> ${formatBorn(c)}<br/>
        <strong>Father:</strong> ${escapeHtml(c._fatherName)}<br/>
        <strong>Mother:</strong> ${escapeHtml(c._userName || "—")}
        ${c._birthMotherName && c._birthMotherName !== c._userName
          ? `<br/><strong>Biological mother:</strong> ${escapeHtml(c._birthMotherName)}`
          : ""}
      </div>
    `;
    results.appendChild(div);
  }
}

// ----- helpers -----
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function formatAge(c){
  if (typeof c.age_days === "number") return `${c.age_days} day${c.age_days===1?"":"s"}`;
  if (c.birth_date) {
    const t = parseBirthDate(c.birth_date);
    if (!Number.isNaN(t)) return new Date(t).toLocaleDateString();
  }
  return "—";
}

// e.g., "10 July 2025 @ 03:01"
function parseBirthDate(s){
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  const m = String(s).match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*@\s*(\d{1,2}):(\d{2})/);
  if (!m) return NaN;
  const [_, d, mon, y, hh, mm] = m;
  const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const idx = months.indexOf(mon.toLowerCase());
  if (idx < 0) return NaN;
  return Date.UTC(Number(y), idx, Number(d), Number(hh), Number(mm));
}

function formatBorn(c){
  if (!c.birth_date) return "—";
  const t = parseBirthDate(c.birth_date);
  if (Number.isNaN(t)) return escapeHtml(c.birth_date);
  const d = new Date(t);
  const dateStr = d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
  const timeStr = d.toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" });
  return `${dateStr} · ${timeStr}`;
}
