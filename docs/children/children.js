(async function(){
  const CHILDREN_URL = "../data/children.json";
  const CLAIMS_URL   = "../data/claims.json"; // for user_id -> display name map
  const picker = document.getElementById("userPicker");
  const raisingBox = document.getElementById("raising");
  const adoptedBox = document.getElementById("adoptedOut");
  const stamp = document.getElementById("stamp");

  const qs = new URLSearchParams(location.search);
  const initialUser = (qs.get("u") || "").trim();

  // load data
  let children = [], users = [];
  try {
    const [rKids, rClaims] = await Promise.all([
      fetch(CHILDREN_URL, { cache: "no-store" }),
      fetch(CLAIMS_URL,   { cache: "no-store" })
    ]);
    const kidsJson = await rKids.json();
    const claimsJson = await rClaims.json();
    children = Array.isArray(kidsJson.children) ? kidsJson.children : [];
    users = Array.isArray(claimsJson.users) ? claimsJson.users : [];
    if (kidsJson.generated_at && stamp) {
      try { stamp.textContent = new Date(kidsJson.generated_at).toLocaleString(); } catch {}
    }
  } catch (err) {
    raisingBox.innerHTML = `<div class="card"><p class="muted">Couldn’t load data: ${err.message}</p></div>`;
    return;
  }

  // helpers
  const nameMap = new Map(users.map(u => [String(u.user_id), u.user_name || String(u.user_id)]));
  const uidLabel = (uid) => nameMap.get(String(uid)) || String(uid);

  function card(child, viewerId){
    const full = child.baby_full || [child.baby_first, child.baby_middle, child.baby_last].filter(Boolean).join(" ");
    const birthStr = child.birth_date ? new Date(child.birth_date).toLocaleString() : "—";
    const isViewerCaregiver = viewerId && String(child.user_id) === String(viewerId);
    const isViewerBirthPar  = viewerId && String(child.birth_parent_id) === String(viewerId);
    const adoptedElsewhere  = child.adopted_out && String(child.user_id) !== String(child.birth_parent_id);

    const el = document.createElement("div");
    el.className = "card";
    
    const idLine = child.baby_id != null
      ? `<p class="muted">ID: ${child.baby_id}</p>`
      : "";
    
    el.innerHTML = `
      <h3>${full || "(unnamed baby)"}</h3>
      <p class="muted">Born: ${birthStr} • Stage: ${child.stage || "—"}</p>
      <p><strong>Father:</strong> ${child.father || "—"}</p>
      <div class="kv" id="flags"></div>
    `;

    const flags = el.querySelector("#flags");

    // Show adoption/birth-parent info based on viewer
    if (isViewerCaregiver && adoptedElsewhere) {
      // you are raising a child who was born to someone else
      const tag = document.createElement("span");
      tag.className = "badge note";
      tag.textContent = `Birth parent: ${uidLabel(child.birth_parent_id)}`;
      flags.appendChild(tag);
    } else if (isViewerBirthPar && adoptedElsewhere) {
      // you gave birth; someone else is raising
      const tag = document.createElement("span");
      tag.className = "badge note";
      tag.textContent = `Adopted by: ${uidLabel(child.user_id)}`;
      flags.appendChild(tag);
    } else if (String(child.user_id) !== String(child.birth_parent_id)) {
      // generic view (no specific viewer): show both roles if they differ
      const tag1 = document.createElement("span");
      tag1.className = "badge note";
      tag1.textContent = `Caregiver: ${uidLabel(child.user_id)}`;
      flags.appendChild(tag1);

      const tag2 = document.createElement("span");
      tag2.className = "badge note";
      tag2.textContent = `Birth parent: ${uidLabel(child.birth_parent_id)}`;
      flags.appendChild(tag2);
    }

    return el;
  }

  // build picker (all known users from claims.json + any stray IDs from children.json)
  const userIds = new Set(users.map(u => String(u.user_id)));
  for (const ch of children){
    if (ch.user_id) userIds.add(String(ch.user_id));
    if (ch.birth_parent_id) userIds.add(String(ch.birth_parent_id));
  }
  const sortedIds = [...userIds].sort((a,b)=> uidLabel(a).localeCompare(uidLabel(b)));
  picker.innerHTML = "";
  for (const id of sortedIds){
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${uidLabel(id)} (${id})`;
    picker.appendChild(opt);
  }
  if (initialUser && userIds.has(initialUser)) picker.value = initialUser;

  function render(){
    const viewerId = picker.value;
    raisingBox.innerHTML = "";
    adoptedBox.innerHTML = "";

    // Kids the viewer is raising (user_id == viewer)
    const raising = children.filter(ch => String(ch.user_id) === String(viewerId));
    if (raising.length === 0){
      raisingBox.innerHTML = `<div class="card"><p class="muted">No children found.</p></div>`;
    } else {
      for (const ch of raising){ raisingBox.appendChild(card(ch, viewerId)); }
    }

    // Kids the viewer gave birth to but are adopted by others
    const adoptedOut = children.filter(ch =>
      String(ch.birth_parent_id) === String(viewerId) &&
      String(ch.user_id) !== String(viewerId)
    );
    if (adoptedOut.length === 0){
      adoptedBox.innerHTML = `<div class="card"><p class="muted">None.</p></div>`;
    } else {
      for (const ch of adoptedOut){ adoptedBox.appendChild(card(ch, viewerId)); }
    }
  }

  picker.addEventListener("change", ()=>{
    const u = picker.value;
    const url = new URL(location.href);
    url.searchParams.set("u", u);
    history.replaceState(null, "", url.toString());
    render();
  });

  render();
})();
