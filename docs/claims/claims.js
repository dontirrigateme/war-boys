(async function () {
  const DATA_VERSION = "2025-11-05-01";
  const DATA_URL = `../data/claims.json?v=${DATA_VERSION}`;
  const data = await fetch(DATA_URL).then(r => r.json()).catch(() => ({users:[], blorbos:[]}));
  const stamp = document.getElementById("stamp");
  if (data.generated_at) stamp.textContent = `Last updated: ${new Date(data.generated_at).toLocaleString()}`;

  // Elements
  const tabUsers = document.getElementById("tabUsers");
  const tabBlorbos = document.getElementById("tabBlorbos");
  const picker = document.getElementById("picker");
  const search = document.getElementById("search");
  const results = document.getElementById("results");

  let mode = "users"; // or "blorbos"
  let options = [];

  function setActiveTab() {
    tabUsers.classList.toggle("active", mode === "users");
    tabBlorbos.classList.toggle("active", mode === "blorbos");
  }

  function buildOptions() {
    if (mode === "users") {
      options = data.users
        .map(u => ({ key: u.user_id, label: u.user_name }))
        .sort((a,b) => a.label.localeCompare(b.label));
    } else {
      options = data.blorbos
        .map(b => {
          const disp = b.display_name || b.command_name;
          const cmd  = b.command_name;
          const same = disp.trim().toLowerCase() === cmd.trim().toLowerCase();
          return { key: cmd, label: same ? disp : `${disp} (${cmd})` };
        })
        .sort((a,b) => a.label.localeCompare(b.label));
    }
  }

  function renderPicker(filterText = "") {
    picker.innerHTML = "";
    const norm = filterText.trim().toLowerCase();
    const filtered = norm ? options.filter(o => o.label.toLowerCase().includes(norm)) : options;
    for (const o of filtered) {
      const opt = document.createElement("option");
      opt.value = o.key;
      opt.textContent = o.label;
      picker.appendChild(opt);
    }
    if (picker.options.length) picker.selectedIndex = 0;
    renderResult();
  }

  function renderResult() {
    results.innerHTML = "";
    if (!picker.value) return;
    if (mode === "users") {
      const u = data.users.find(x => x.user_id === picker.value);
      if (!u) return;
      ard = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<h3>${u.user_name}</h3><div class="small">User ID: ${u.user_id}</div>`;
      const wrap = document.createElement("div");
      wrap.className = "kv";
      if (!u.claims?.length) {
        wrap.innerHTML = `<span class="small">No claims yet.</span>`;
      } else {
        for (const c of u.claims) {
        const chip = document.createElement("a");
        chip.className = "chip";
        chip.href = `../character/?c=${encodeURIComponent(c.command_name)}`;
        chip.textContent = c.display_name;  // pretty name
        wrap.appendChild(chip);
      }
      card.appendChild(wrap);
      results.appendChild(card);
    } else {
      const b = data.blorbos.find(x => x.command_name === picker.value);
      if (!b) return;
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<h3>${b.display_name} <span class="small">(${b.command_name})</span></h3>`;
      const wrap = document.createElement("div");
      wrap.className = "kv";
      if (!b.claimed_by?.length) {
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

  // events
  tabUsers.onclick = () => { mode = "users"; setActiveTab(); buildOptions(); renderPicker(search.value); };
  tabBlorbos.onclick = () => { mode = "blorbos"; setActiveTab(); buildOptions(); renderPicker(search.value); };
  picker.onchange = renderResult;
  search.oninput = () => renderPicker(search.value);

  // init
  setActiveTab();
  buildOptions();
  renderPicker();
})();
