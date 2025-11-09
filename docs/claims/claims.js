// /docs/claims/claims.js
(async function () {
  // --- config + DOM ---
  const DATA_VERSION = "2025-11-09-01"; // bump when JSON changes (prevents caching)
  const DATA_URL = `../data/claims.json?v=${DATA_VERSION}`;

  const tabUsers   = document.getElementById("tabUsers");
  const tabBlorbos = document.getElementById("tabBlorbos");
  const picker     = document.getElementById("picker");
  const search     = document.getElementById("search");
  const results    = document.getElementById("results");
  const stamp      = document.getElementById("stamp");

  console.log("[claims] script loaded");
  console.log("[claims] fetching", DATA_URL);

  // --- load data with visible error on failure ---
  let data;
  try {
    const r = await fetch(DATA_URL, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    data = await r.json();
  } catch (err) {
    console.error("Failed to load", DATA_URL, err);
    if (results) {
      results.innerHTML =
        `<div class="card"><p class="small">Couldn’t load ${DATA_URL}: ${err.message}</p></div>`;
    }
    data = { users: [], blorbos: [], generated_at: null };
  }
  if (data.generated_at && stamp) {
    try { stamp.textContent = new Date(data.generated_at).toLocaleString(); } catch {}
  }
  console.log("[claims] fetched ok:", {
    users: Array.isArray(data.users) ? data.users.length : "no users key",
    blorbos: Array.isArray(data.blorbos) ? data.blorbos.length : "no blorbos key"
  });

  // --- state + helpers ---
  let mode = "users"; // "users" | "blorbos"
  let options = [];

  function setActiveTab() {
    tabUsers.classList.toggle("active", mode === "users");
    tabBlorbos.classList.toggle("active", mode === "blorbos");
  }

  function buildOptions() {
    options = [];
    if (mode === "users") {
      for (const u of (data.users || [])) {
        options.push({ value: u.user_id, label: u.user_name || u.user_id });
      }
    } else {
      for (const b of (data.blorbos || [])) {
        options.push({ value: b.command_name, label: b.display_name || b.command_name });
      }
    }
    console.log("[claims] buildOptions ->", mode, options.length);
  }

  function renderPicker(q = "") {
    const term = q.trim().toLowerCase();
    const filtered = term
      ? options.filter(o => o.label.toLowerCase().includes(term))
      : options;

    picker.innerHTML = "";
    if (filtered.length === 0) {
      results.innerHTML = `<div class="card"><p class="small">
        Nothing to show. If this isn’t expected, make sure <code>${DATA_URL}</code> exists and has users/blorbos.
      </p></div>`;
      return;
    }

    for (const o of filtered) {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      picker.appendChild(opt);
    }
    results.innerHTML = "";
  }

  function renderResult() {
    const val = picker.value;
    results.innerHTML = "";
    if (!val) return;

    if (mode === "users") {
      const u = (data.users || []).find(x => x.user_id === val);
      if (!u) return;

      const card = document.createElement("div");
      card.className = "card";
      const h = document.createElement("h3");
      h.textContent = u.user_name || u.user_id;
      card.appendChild(h);

      const wrap = document.createElement("div");
      wrap.className = "kv";
      if (!u.claims || u.claims.length === 0) {
        wrap.innerHTML = `<span class="small">No claims yet.</span>`;
      } else {
        for (const c of u.claims) {
          const chip = document.createElement("a");
          chip.className = "chip";
          chip.href = `../character/?c=${encodeURIComponent(c.command_name)}`;
          chip.textContent = c.display_name || c.command_name;
          wrap.appendChild(chip);
        }
      }
      card.appendChild(wrap);
      results.appendChild(card);
    } else {
      const b = (data.blorbos || []).find(x => x.command_name === val);
      if (!b) return;

      const card = document.createElement("div");
      card.className = "card";
      const h = document.createElement("h3");
      h.textContent = b.display_name || b.command_name;
      card.appendChild(h);

      const wrap = document.createElement("div");
      wrap.className = "kv";
      if (!b.claimed_by || b.claimed_by.length === 0) {
        wrap.innerHTML = `<span class="small">No one has claimed this blorbo yet.</span>`;
      } else {
        for (const u of b.claimed_by) {
          const chip = document.createElement("span");
          chip.className = "chip";
          chip.textContent = u.user_name || u.user_id;
          wrap.appendChild(chip);
        }
      }
      card.appendChild(wrap);
      results.appendChild(card);
    }
  }

  // --- events ---
  tabUsers.onclick   = () => { mode = "users";   setActiveTab(); buildOptions(); renderPicker(search.value); };
  tabBlorbos.onclick = () => { mode = "blorbos"; setActiveTab(); buildOptions(); renderPicker(search.value); };
  picker.onchange    = renderResult;
  search.oninput     = () => renderPicker(search.value);

  // --- init ---
  setActiveTab();
  buildOptions();
  console.log("[claims] mode:", mode, "options:", options.length);
  renderPicker("");
})();
