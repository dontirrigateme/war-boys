const DATA_VERSION = "2025-11-10-02";
const DATA_URL = "../data/children.json?v=" + DATA_VERSION; // you’ll create this export

const results = document.getElementById("results");
const fatherPicker = document.getElementById("fatherPicker");
const userPicker = document.getElementById("userPicker");
const sortPicker = document.getElementById("sortPicker");
const search = document.getElementById("search");

let children = [];
let fathers = [];
let users = [];

init().catch(console.error);

async function init() {
  const res = await fetch(DATA_URL);
  children = await res.json(); // array
  normalize();
  buildFatherPicker();
  buildUserPicker();
  hookEvents();
  render();
}

function normalize() {
  for (const c of children) {
    // derive age_days if missing
    if (!c.age_days && c.birth_date) {
      c.age_days = Math.max(0, Math.floor((Date.now() - Date.parse(c.birth_date)) / 86400000));
    }
    // convenient strings
    c._name = c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();
    c._fatherName = (c.father?.display_name || c.father?.command_name || "Unknown");
    c._userName =
      (c.adopted_out && (c.adopter_name || c.adopter_user_name ||
      c.mother_user_name ||
      c.mother_user_id ||
      null;
  }
  fathers = Array.from(new Set(children.map(c => c._fatherName))).sort((a,b)=>a.localeCompare(b));
}

function buildFatherPicker() {
  fatherPicker.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "— All fathers —";
  ph.selected = true;
  fatherPicker.appendChild(ph);
  for (const f of fathers) {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    fatherPicker.appendChild(opt);
  }
}

function buildUserPicker() {
  if (!userPicker) return; // safe if HTML not updated yet
  userPicker.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "— All users —";
  ph.selected = true;
  userPicker.appendChild(ph);
  for (const u of users) {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    userPicker.appendChild(opt);
  }
}

function hookEvents() {
  fatherPicker.addEventListener("change", render);
  if (userPicker) userPicker.addEventListener("change", render);
  sortPicker.addEventListener("change", render);
  search.addEventListener("input", render);
}

function render() {
  const term = search.value.trim().toLowerCase();
  const father = fatherPicker.value;
  const user = userPicker ? userPicker.value;

  let rows = children.filter(c =>
    (!father || c._fatherName === father) &&
    (!user || c._userName === user) &&
    (!term || c._name.toLowerCase().includes(term))
  );

  // sorting
  const mode = sortPicker.value;
  rows.sort((a,b) => {
    if (mode === "age_desc") return (b.age_days||0) - (a.age_days||0);
    if (mode === "age_asc")  return (a.age_days||0) - (b.age_days||0);
    if (mode === "name_desc") return b._name.localeCompare(a._name);
    return a._name.localeCompare(b._name); // name_asc
  });

  // render
  results.innerHTML = "";
  if (rows.length === 0) {
    results.innerHTML = `<div class="child-card"><div class="meta">No children match.</div></div>`;
    return;
  }

  for (const c of rows) {
    const div = document.createElement("div");
    div.className = "child-card";
    div.innerHTML = `
      <div class="name">${escapeHtml(c._name || "Unnamed Baby")}</div>
      <div class="meta">
        <span class="badge">${escapeHtml(c.stage || "—")}</span>
        <span class="badge">${c.sex === "M" ? "Boy" : c.sex === "F" ? "Girl" : "—"}</span>
      </div>
      <div class="meta" style="margin-top:6px">
        <strong>Age:</strong> ${formatAge(c)}<br/>
        <strong>Father:</strong> ${escapeHtml(c._fatherName)}<br/>
        <strong>Mother:</strong> ${escapeHtml(c.mother_user_name || c.mother_user_id || "—")}
      </div>
    `;
    results.appendChild(div);
  }
}

// helpers
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }
function formatAge(c){
  if (typeof c.age_days === "number") return `${c.age_days} day${c.age_days===1?"":"s"}`;
  if (c.birth_date) return new Date(c.birth_date).toLocaleDateString();
  return "—";
}
