// /docs/character/character.js
(async function () {
  // --- helpers ---
  function charImg(cmd){
    const slug = String(cmd).toLowerCase().replace(/\s+/g, "_");
    return `../assets/images/${slug}.webp`; // your image folder
  }

  // --- read query ---
  const params = new URLSearchParams(location.search);
  const cmd = (params.get("c") || "").trim().toLowerCase();

  // --- dom refs (must match /docs/character/index.html) ---
  const portraitEl = document.getElementById("portrait");
  const nameEl     = document.getElementById("name");
  const akaEl      = document.getElementById("aka");
  const bioEl      = document.getElementById("bio");
  const factsEl    = document.getElementById("facts");
  const claimBox   = document.getElementById("claimers");

  // --- load data (using claims.json for now; can swap to characters.json later) ---
  const DATA_VERSION = "2025-11-09-01";
  let data = { blorbos: [] };
  try {
    const r = await fetch(`../data/claims.json?v=${DATA_VERSION}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    data = await r.json();
  } catch (err) {
    console.error("Failed to load claims.json", err);
  }

  // --- find character ---
  const b = (data.blorbos || []).find(x => (x.command_name || "").toLowerCase() === cmd);

  if (!b) {
    if (nameEl) nameEl.textContent = "Character not found";
    if (akaEl)  akaEl.textContent  = cmd ? `(${cmd})` : "";
    if (bioEl)  bioEl.textContent  = "We couldn’t find that character.";
    if (factsEl){
      factsEl.innerHTML = "";
      const li = document.createElement("li");
      li.textContent = "No facts available.";
      factsEl.appendChild(li);
    }
    if (claimBox) claimBox.innerHTML = '<span class="small">—</span>';
    if (portraitEl){
      portraitEl.alt = "Not found";
      portraitEl.src = "../assets/images/_placeholder.webp";
    }
    return;
  }

  // --- header (name, aka, portrait) ---
  if (nameEl) nameEl.textContent = b.display_name || b.command_name;
  if (akaEl)  akaEl.textContent  = b.command_name ? `(${b.command_name})` : "";

  if (portraitEl){
    portraitEl.alt = `${b.display_name || b.command_name} portrait`;
    portraitEl.src = charImg(b.command_name);
    portraitEl.onerror = () => { portraitEl.src = "../assets/images/_placeholder.webp"; };
  }

  // --- bio & facts (claims.json doesn’t have these yet; placeholders for now) ---
  if (bioEl)   bioEl.textContent = b.bio || "—";
  if (factsEl){
    factsEl.innerHTML = "";
    if (Array.isArray(b.facts) && b.facts.length){
      for (const f of b.facts){
        const li = document.createElement("li");
        li.textContent = f;
        factsEl.appendChild(li);
      }
    } else {
      const li = document.createElement("li");
      li.textContent = "No facts added yet.";
      factsEl.appendChild(li);
    }
  }

  // --- claimed by ---
  if (claimBox){
    claimBox.innerHTML = "";
    if (!b.claimed_by || !b.claimed_by.length) {
      claimBox.innerHTML = '<span class="small">No one has claimed this blorbo yet.</span>';
    } else {
      for (const u of b.claimed_by) {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = u.user_name || u.user_id;
        claimBox.appendChild(chip);
      }
    }
  }
})();
