(function(){
  const DATA_VERSION = "2025-11-09-12";
  const DATA_URL = `../data/characters.json?v=${DATA_VERSION}`;
  const IMG_BASE = "../assets/images/";

  const SHOW_LABEL = {
    band_of_brothers: "Band of Brothers",
    the_pacific: "The Pacific",
    masters_of_the_air: "Masters of the Air",
    generation_kill: "Generation Kill",
    preacher: "Preacher",
    ncis: "NCIS"
  };
  const SHOW_ORDER = [
    "band_of_brothers",
    "the_pacific",
    "masters_of_the_air",
    "generation_kill",
    "preacher",
    "ncis"
  ];

  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  let all = [];

  function charImg(entry){
    const file = entry.image || `${String(entry.command_name).toLowerCase().replace(/\s+/g,"_")}.webp`;
    return IMG_BASE + file;
  }

  function card(entry){
    const a = document.createElement("a");
    a.href = `../character/?c=${encodeURIComponent(entry.command_name)}`;

    const img = document.createElement("img");
    img.className = "portrait";
    img.alt = `${entry.title || entry.command_name} portrait`;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 160; img.height = 160;
    img.src = charImg(entry);
    img.onerror = () => { img.src = IMG_BASE + "_placeholder.webp"; };

    const h = document.createElement("h3");
    h.style.textAlign = "center";
    h.textContent = entry.title || entry.command_name;

    const wrap = document.createElement("div");
    wrap.className = "card";
    a.appendChild(img);
    a.appendChild(h);
    wrap.appendChild(a);
    return wrap;
  }

  function render(items){
    listEl.innerHTML = "";
    // group by show
    const byShow = new Map();
    for (const c of items){
      const key = (c.show || "other").toLowerCase();
      if (!byShow.has(key)) byShow.set(key, []);
      byShow.get(key).push(c);
    }
    // order shows
    const keys = [...byShow.keys()].sort((a,b)=>{
      const ia = SHOW_ORDER.indexOf(a), ib = SHOW_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    for (const k of keys){
      const secTitle = document.createElement("h2");
      secTitle.className = "section";
      secTitle.textContent = SHOW_LABEL[k] || k.replace(/_/g," ").replace(/\b\w/g, c=>c.toUpperCase());
      listEl.appendChild(secTitle);

      const grid = document.createElement("div");
      grid.className = "grid";

      const arr = byShow.get(k).slice().sort((a,b)=>{
        const A = (a.title || a.command_name).toLowerCase();
        const B = (b.title || b.command_name).toLowerCase();
        return A.localeCompare(B);
      });

      for (const c of arr) grid.appendChild(card(c));
      listEl.appendChild(grid);
    }
  }

  function applySearch(){
    const q = (searchEl.value || "").trim().toLowerCase();
    if (!q) { render(all); return; }
    const filtered = all.filter(c => {
      const hay = [
        c.title, c.command_name,
        ...(Array.isArray(c.aka) ? c.aka : [])
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    render(filtered);
  }

  async function load(){
    try{
      const r = await fetch(DATA_URL, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      all = await r.json();
    }catch(err){
      console.error("Failed to load characters.json", err);
      listEl.innerHTML = `<div class="card"><p class="muted">Couldn’t load character list.</p></div>`;
      return;
    }
    render(all);
  }

  searchEl.addEventListener("input", applySearch);
  load();
})();
