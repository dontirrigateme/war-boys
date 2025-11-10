// /docs/character/character.js
(async function () {
  const DATA_VERSION = "2025-11-09-03"; // bump when data changes

  function charImg(cmd, override) {
    const file = override || `${String(cmd).toLowerCase().replace(/\s+/g, "_")}.webp`;
    return `../assets/images/${file}`;
  }

  const qs = new URLSearchParams(location.search);
  const key = (qs.get("c") || "").trim().toLowerCase();

  const portraitEl = document.getElementById("portrait");
  const nameEl     = document.getElementById("name");
  const akaEl      = document.getElementById("aka");
  const bioEl      = document.getElementById("bio");
  const factsEl    = document.getElementById("facts");
  const claimBox   = document.getElementById("claimers");

  // Load claims.json (claimed_by list) and characters.json (title/bio/facts)
  let claims = { blorbos: [] }, chars = [];
  try {
    const [r1, r2] = await Promise.all([
      fetch(`../data/claims.json?v=${DATA_VERSION}`,      { cache: "no-store" }),
      fetch(`../data/characters.json?v=${DATA_VERSION}`,  { cache: "no-store" })
    ]);
    if (!r1.ok) throw new Error(`claims.json HTTP ${r1.status}`);
    if (!r2.ok) throw new Error(`characters.json HTTP ${r2.status}`);
    claims = await r1.json();
    chars  = await r2.json();
  } catch (err) {
    console.error("Data load failed:", err);
  }

  const b = (claims.blorbos || []).find(x => (x.command_name || "").toLowerCase() === key);
  const meta = (chars || []).find(x => (x.command_name || "").toLowerCase() === key) || {};

  if (!b && !meta.command_name) {
    if (nameEl) nameEl.textContent = "Character not found";
    if (akaEl)  akaEl.textContent  = key ? `(${key})` : "";
    if (bioEl)  bioEl.textContent  = "—";
    if (factsEl) { factsEl.innerHTML = "<li>No facts available.</li>"; }
    if (claimBox) claimBox.innerHTML = '<span class="small">—</span>';
    if (portraitEl) {
      portraitEl.alt = "Not found";
      portraitEl.src = "../assets/images/_placeholder.webp";
    }
    return;
  }

  // Preferred display name
  const display = meta.title || (b && b.display_name) || (b && b.command_name) || meta.command_name || key;

  // Header
  if (nameEl) nameEl.textContent = display;
  if (akaEl)  akaEl.textContent  = (b && b.command_name) ? `(${b.command_name})` : (meta.command_name ? `(${meta.command_name})` : "");

  // Portrait
  if (portraitEl) {
    const imgFile = meta.image; // optional override
    const imgSrc = charImg((b && b.command_name) || meta.command_name || key, imgFile);
    portraitEl.alt = `${display} portrait`;
    portraitEl.src = imgSrc + `?v=${DATA_VERSION}`;
    portraitEl.onerror = () => { portraitEl.src = "../assets/images/_placeholder.webp"; };
  }

  // Bio + Facts (from characters.json)
  if (bioEl)   bioEl.textContent = meta.bio || "—";
  if (factsEl) {
    factsEl.innerHTML = "";
    if (Array.isArray(meta.facts) && meta.facts.length) {
      for (const f of meta.facts) {
        const li = document.createElement("li");
        li.textContent = f;
        factsEl.appendChild(li);
      }
    } else {
      factsEl.innerHTML = "<li>No facts added yet.</li>";
    }
  }

  // Claimed by (from claims.json)
  if (claimBox) {
    claimBox.innerHTML = "";
    const claimedBy = (b && b.claimed_by) || [];
    if (!claimedBy.length) {
      claimBox.innerHTML = '<span class="small">No one has claimed this blorbo yet.</span>';
    } else {
      for (const u of claimedBy) {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = u.user_name || u.user_id;
        claimBox.appendChild(chip);
      }
    }
  }
})();
