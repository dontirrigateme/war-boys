(async function () {
  const params = new URLSearchParams(location.search);
  const cmd = (params.get("c") || "").trim().toLowerCase();
  const data = await fetch("../data/claims.json?v=1").then(r=>r.json()).catch(()=>({blorbos:[]}));

  const b = data.blorbos.find(x => (x.command_name||"").toLowerCase() === cmd);
  const nameEl = document.getElementById("charName");
  const keyEl  = document.getElementById("charKey");
  const box    = document.getElementById("claimers");

  if (!b) {
    nameEl.textContent = "Not found";
    keyEl.textContent = "";
    box.innerHTML = '<span class="small">No data for that character.</span>';
    return;
  }

  nameEl.textContent = b.display_name || b.command_name;
  keyEl.textContent  = `(${b.command_name})`;

  if (!b.claimed_by || !b.claimed_by.length) {
    box.innerHTML = '<span class="small">No one has claimed this blorbo yet.</span>';
  } else {
    box.innerHTML = "";
    for (const u of b.claimed_by) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = u.user_name || u.user_id;
      box.appendChild(chip);
    }
  }
})();

function charImg(cmd) {
  const slug = String(cmd).toLowerCase().replace(/\s+/g, "_");
  return `../assets/characters/${slug}.webp`;
}

