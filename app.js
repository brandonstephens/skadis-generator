(function () {
  const $ = (id) => document.getElementById(id);
  const ids = ["w","h","m","r","sw","sl","p","hd","hi","t","oc"];
  const checks = ["outline","stagger","flip","horiz","holes","guides","mat","anchor"];
  const fmt = (n) => +n.toFixed(3);
  let lastSVG = "";

  // All lengths are stored in millimetres; inputs show the chosen unit.
  const IN_MM = 25.4;
  const FINE = new Set(["sw", "sl", "hd", "t", "oc"]);
  let unit = "mm";
  try { if (localStorage.getItem("skadis-unit") === "in") unit = "in"; } catch (e) {}
  const state = {};
  ids.forEach((id) => { const v = parseFloat($(id).value); state[id] = isFinite(v) ? v : 0; });

  function num(id) { return state[id]; }
  function toUnit(mm) { return unit === "in" ? mm / IN_MM : mm; }
  function showLen(mm, digits) {
    if (unit === "in") return `${+(mm / IN_MM).toFixed(digits ?? 3)} in`;
    return `${+mm.toFixed(digits ?? 2)} mm`;
  }
  function otherLen(mm) {
    return unit === "in" ? `${+mm.toFixed(2)} mm` : `${+(mm / IN_MM).toFixed(3)} in`;
  }
  function setField(id, mm) {
    state[id] = mm;
    $(id).value = unit === "in" ? +(mm / IN_MM).toFixed(4) : +mm.toFixed(3);
  }
  function applyUnit() {
    ids.forEach((id) => {
      setField(id, state[id]);
      const el = $(id);
      el.step = unit === "in" ? (FINE.has(id) ? "0.01" : "0.125") : (FINE.has(id) ? "0.1" : "1");
      const span = el.previousElementSibling;
      if (span && span.dataset.label) span.textContent = `${span.dataset.label} (${unit})`;
    });
    document.querySelectorAll(".units button").forEach((b) => {
      b.setAttribute("aria-pressed", b.dataset.unit === unit ? "true" : "false");
    });
  }

  function stadium(cx, cy, w, l, horiz) {
    const r = w / 2;
    const h = Math.max(0, (l - w) / 2);
    if (h === 0) {
      return `M${fmt(cx - r)} ${fmt(cy)}A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx + r)} ${fmt(cy)}A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx - r)} ${fmt(cy)}Z`;
    }
    if (!horiz) {
      return `M${fmt(cx - r)} ${fmt(cy - h)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(cx + r)} ${fmt(cy - h)}L${fmt(cx + r)} ${fmt(cy + h)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(cx - r)} ${fmt(cy + h)}Z`;
    }
    return `M${fmt(cx - h)} ${fmt(cy + r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(cx - h)} ${fmt(cy - r)}L${fmt(cx + h)} ${fmt(cy - r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(cx + h)} ${fmt(cy + r)}Z`;
  }

  function roundedRect(W, H, r) {
    r = Math.max(0, Math.min(r, W / 2, H / 2));
    if (r === 0) return `M0 0H${fmt(W)}V${fmt(H)}H0Z`;
    return `M${fmt(r)} 0H${fmt(W - r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(W)} ${fmt(r)}V${fmt(H - r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(W - r)} ${fmt(H)}H${fmt(r)}A${fmt(r)} ${fmt(r)} 0 0 1 0 ${fmt(H - r)}V${fmt(r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(r)} 0Z`;
  }

  function circle(cx, cy, d) {
    const r = d / 2;
    return `M${fmt(cx - r)} ${fmt(cy)}A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx + r)} ${fmt(cy)}A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx - r)} ${fmt(cy)}Z`;
  }

  function compute() {
    const W = num("w"), H = num("h"), m = num("m"), R = num("r");
    const sw = num("sw"), sl = Math.max(num("sl"), sw), P = num("p");
    const stagger = $("stagger").checked, flip = $("flip").checked, horiz = $("horiz").checked;
    const bw = horiz ? sl : sw;   // slot bounding box
    const bh = horiz ? sw : sl;
    const step = stagger ? P / 2 : P;
    const availX = W - 2 * m - bw;
    const availY = H - 2 * m - bh;
    const slots = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    if (availX >= 0 && availY >= 0 && step > 0) {
      const nX = Math.floor(availX / step + 1e-9);
      const nY = Math.floor(availY / step + 1e-9);
      const offX = m + bw / 2 + (availX - nX * step) / 2;
      const offY = m + bh / 2 + (availY - nY * step) / 2;
      const parity = flip ? 1 : 0;
      for (let b = 0; b <= nY; b++) {
        for (let a = 0; a <= nX; a++) {
          if (stagger && (a + b) % 2 !== parity) continue;
          const x = offX + a * step, y = offY + b * step;
          slots.push([x, y]);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
    }
    const holes = [];
    let collide = false;
    if ($("holes").checked) {
      const d = num("hd"), i = num("hi");
      [[i, i], [W - i, i], [i, H - i], [W - i, H - i]].forEach(([x, y]) => {
        holes.push([x, y]);
        for (const [sx, sy] of slots) {
          const dx = Math.max(Math.abs(x - sx) - bw / 2, 0);
          const dy = Math.max(Math.abs(y - sy) - bh / 2, 0);
          if (Math.hypot(dx, dy) < d / 2 + 3) { collide = true; break; }
        }
      });
    }
    return { W, H, m, R, sw, sl, P, bw, bh, horiz, step, stagger, slots, holes, collide,
      bounds: slots.length ? { minX, maxX, minY, maxY } : null };
  }

  const ANCHOR_SHORT = 10, ANCHOR_LONG = 20;
  function anchorPoint(g) {
    const mode = $("anchor").value;
    if (mode === "none") return null;
    if (mode === "c") return [g.W / 2, g.H / 2];
    if (mode === "slot" && g.slots.length) {
      let best = g.slots[0];
      for (const s of g.slots) {
        if (s[1] > best[1] + 1e-6 || (Math.abs(s[1] - best[1]) < 1e-6 && s[0] < best[0])) best = s;
      }
      return best;
    }
    return [0, g.H];
  }
  function anchorPath(x, y) {
    // Right angle at (x, y); short leg along +X, long leg along +Y (up on screen).
    return `M${fmt(x)} ${fmt(y)}L${fmt(x + ANCHOR_SHORT)} ${fmt(y)}L${fmt(x)} ${fmt(y - ANCHOR_LONG)}Z`;
  }
  function cutDepth() {
    return Math.max(0, num("t")) + Math.max(0, num("oc"));
  }

  function buildSVG(g) {
    const d = fmt(cutDepth());
    const depthAttr = d > 0 ? ` shaper:cutDepth="${d}mm"` : "";
    const out = [];
    out.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:shaper="http://www.shapertools.com/namespaces/shaper" width="${fmt(g.W)}mm" height="${fmt(g.H)}mm" viewBox="0 0 ${fmt(g.W)} ${fmt(g.H)}">`);
    if ($("guides").checked && g.bounds) {
      const lines = [];
      const b = g.bounds;
      for (let x = b.minX; x <= b.maxX + 1e-6; x += g.step) lines.push(`M${fmt(x)} 0V${fmt(g.H)}`);
      for (let y = b.minY; y <= b.maxY + 1e-6; y += g.step) lines.push(`M0 ${fmt(y)}H${fmt(g.W)}`);
      if (lines.length) out.push(`  <path id="guides" d="${lines.join("")}" fill="none" stroke="#0068FF" stroke-width="0.1"/>`);
    }
    out.push(`  <g id="slots">`);
    g.slots.forEach(([x, y]) => {
      out.push(`    <path d="${stadium(x, y, g.sw, g.sl, g.horiz)}" fill="#FFFFFF" stroke="#000000" stroke-width="0.1"${depthAttr}/>`);
    });
    out.push(`  </g>`);
    if (g.holes.length) {
      const hd = num("hd");
      out.push(`  <g id="mounting-holes">`);
      g.holes.forEach(([x, y]) => {
        out.push(`    <path d="${circle(x, y, hd)}" fill="#FFFFFF" stroke="#000000" stroke-width="0.1"${depthAttr}/>`);
      });
      out.push(`  </g>`);
    }
    if ($("outline").checked) {
      out.push(`  <path id="outline" d="${roundedRect(g.W, g.H, g.R)}" fill="#000000" stroke="#000000" stroke-width="0.1"${depthAttr}/>`);
    }
    const a = anchorPoint(g);
    if (a) out.push(`  <path id="anchor" d="${anchorPath(a[0], a[1])}" fill="#FF0000" stroke="none"/>`);
    out.push(`</svg>`);
    return out.join("\n");
  }

  const IN = 25.4;
  const BITS = {
    eighth: { dia: 3.175, label: "1/8 in", doc: 3.175, feed: 8 },
    quarter: { dia: 6.35, label: "1/4 in", doc: 6.35, feed: 10 }
  };
  const RPM = { 4: "19,600", 5: "22,800" };

  function renderPlan(g) {
    const mat = $("mat").value;
    const t = num("t");
    const depth = cutDepth();
    const minFeature = Math.min(g.sw, $("holes").checked ? num("hd") : Infinity);
    const smallBit = minFeature > BITS.quarter.dia + 0.5 ? BITS.quarter : BITS.eighth;
    const ply = mat === "birch";
    const flute = ply ? "downcut" : "upcut";
    const outlineFlute = ply && t >= 9 ? "compression" : flute;
    const rows = [];
    const row = (name, bit, fluteName, note) => {
      const passes = Math.max(1, Math.ceil(depth / bit.doc - 1e-9));
      const perPass = depth / passes;
      rows.push(`<tr><td>${name}${note ? `<small>${note}</small>` : ""}</td><td>${bit.label} 2-flute ${fluteName}</td><td>5 <small>${RPM[5]} rpm</small></td><td>${unit === "in" ? `${bit.feed} in/min <small>${Math.round(bit.feed * IN)} mm/min</small>` : `${Math.round(bit.feed * IN)} mm/min <small>${bit.feed} in/min</small>`}</td><td>${showLen(perPass)} <small>${otherLen(perPass)}</small></td><td>${passes} <small>to ${showLen(depth)}</small></td></tr>`);
    };
    if (g.slots.length) {
      if (minFeature <= smallBit.dia + 0.3) {
        rows.push(`<tr><td colspan="6">Slots or holes are narrower than a 1/8 in bit. Widen them or use a smaller cutter.</td></tr>`);
      } else {
        row(`Slots (${g.slots.length})`, smallBit, flute, "Inside cut");
      }
    }
    if ($("holes").checked) row(`Mounting holes (${g.holes.length})`, smallBit, flute, "Inside cut");
    if ($("outline").checked) row("Outline", BITS.quarter, outlineFlute, "Outside cut, last");
    $("planRows").innerHTML = rows.join("");

    const fit = $("fit");
    let fitText, warn = false;
    if (t < 4) { fitText = `${showLen(t)} is thin for SKÅDIS: IKEA hooks will sit loose. Fine for printed hooks sized to this stock.`; warn = true; }
    else if (t <= 5.5) { fitText = `${showLen(t)} matches SKÅDIS: IKEA accessories should seat normally.`; }
    else if (t <= 6.5) { fitText = `${showLen(t)} is tight for IKEA hooks. Test one before cutting a full panel.`; warn = true; }
    else { fitText = `${showLen(t)} is too thick for IKEA hooks. Use printed hooks designed for this thickness.`; warn = true; }
    fit.textContent = fitText;
    fit.className = warn ? "fit warn" : "fit";

    const steps = [];
    steps.push("Set up ShaperTape and scan the workspace, then place the design using the custom anchor.");
    if (ply) steps.push("Birch ply tears out at the top face: downcut bits keep that face clean. Blue tape over the cut area helps too.");
    else steps.push("MDF dust is fine and heavy: run dust collection and wear a respirator.");
    steps.push("Put a spoilboard under the panel. The encoded depth includes the overcut, so the bit enters it.");
    steps.push("Cut slots and holes first while the panel is fully supported, then the outline.");
    if (smallBit === BITS.eighth) steps.push("Swap to the 1/4 in bit for the outline and re-touch the Z height after the change.");
    $("planSteps").innerHTML = steps.map((s) => `<li>${s}</li>`).join("");

    document.querySelectorAll(".thick button").forEach((b) => {
      b.setAttribute("aria-pressed", Math.abs(parseFloat(b.dataset.t) - t) < 0.01 ? "true" : "false");
    });
  }

  function renderPreview(g) {
    const svg = $("preview");
    const pad = Math.max(g.W, g.H) * 0.06;
    svg.setAttribute("viewBox", `${fmt(-pad)} ${fmt(-pad)} ${fmt(g.W + pad * 2)} ${fmt(g.H + pad * 2)}`);
    const sw = Math.max(g.W, g.H) / 700;
    const fs = Math.max(g.W, g.H) * 0.022;
    let s = "";
    s += `<path d="${roundedRect(g.W, g.H, g.R)}" fill="var(--board)" stroke="var(--board-edge)" stroke-width="${sw * 2}"/>`;
    if (g.m > 0) {
      s += `<rect x="${g.m}" y="${g.m}" width="${Math.max(0, g.W - 2 * g.m)}" height="${Math.max(0, g.H - 2 * g.m)}" fill="none" stroke="var(--guide)" stroke-width="${sw}" stroke-dasharray="${sw * 6} ${sw * 4}" opacity="0.7"/>`;
    }
    const slotPath = g.slots.map(([x, y]) => stadium(x, y, g.sw, g.sl, g.horiz)).join("");
    if (slotPath) s += `<path d="${slotPath}" fill="var(--slot)"/>`;
    if (g.holes.length) {
      const d = num("hd");
      s += `<path d="${g.holes.map(([x, y]) => circle(x, y, d)).join("")}" fill="var(--slot)" stroke="${g.collide ? "var(--warn)" : "none"}" stroke-width="${sw * 2}"/>`;
    }
    const ap = anchorPoint(g);
    if (ap) s += `<path d="${anchorPath(ap[0], ap[1])}" fill="#E0301E"/>`;
    s += `<text x="${g.W / 2}" y="${-pad * 0.35}" text-anchor="middle" font-size="${fs}" fill="var(--muted)" font-family="Barlow, sans-serif">${showLen(g.W)}</text>`;
    s += `<text x="${-pad * 0.35}" y="${g.H / 2}" text-anchor="middle" font-size="${fs}" fill="var(--muted)" font-family="Barlow, sans-serif" transform="rotate(-90 ${-pad * 0.35} ${g.H / 2})">${showLen(g.H)}</text>`;
    svg.innerHTML = s;
  }

  function update() {
    const g = compute();
    renderPreview(g);
    lastSVG = buildSVG(g);
    $("code").value = lastSVG;
    renderPlan(g);
    $("sCount").textContent = g.slots.length;
    const u = (v) => unit === "in" ? +(v / IN_MM).toFixed(3) : +v.toFixed(2);
    const o = (v) => unit === "in" ? +v.toFixed(1) : +(v / IN_MM).toFixed(2);
    $("sSize").textContent = `${u(g.W)} × ${u(g.H)} ${unit} (${o(g.W)} × ${o(g.H)} ${unit === "in" ? "mm" : "in"})`;
    if (g.bounds) {
      const l = g.bounds.minX - g.bw / 2, r = g.W - (g.bounds.maxX + g.bw / 2);
      const t = g.bounds.minY - g.bh / 2, bt = g.H - (g.bounds.maxY + g.bh / 2);
      $("sMargin").textContent = `${u(l)}/${u(r)}, ${u(t)}/${u(bt)} ${unit}`;
    } else {
      $("sMargin").textContent = "–";
    }
    const msg = $("msg");
    if (!g.slots.length) {
      msg.textContent = "No slots fit. Increase the panel size or reduce the edge margin.";
      msg.className = "msg warn";
    } else if (g.collide) {
      msg.textContent = "A mounting hole sits within 3 mm (1/8 in) of a slot. Change the inset or diameter.";
      msg.className = "msg warn";
    } else {
      msg.textContent = "";
      msg.className = "msg";
    }
  }

  ids.forEach((id) => $(id).addEventListener("input", () => {
    const v = parseFloat($(id).value);
    if (!isFinite(v)) return;
    state[id] = unit === "in" ? v * IN_MM : v;
    update();
  }));
  document.querySelectorAll(".units button").forEach((b) => {
    b.addEventListener("click", () => {
      unit = b.dataset.unit;
      try { localStorage.setItem("skadis-unit", unit); } catch (e) {}
      applyUnit();
      update();
    });
  });
  checks.forEach((id) => $(id).addEventListener("change", update));
  document.querySelectorAll(".presets button").forEach((b) => {
    b.addEventListener("click", () => { setField("w", parseFloat(b.dataset.w)); setField("h", parseFloat(b.dataset.h)); update(); });
  });
  document.querySelectorAll(".thick button").forEach((b) => {
    b.addEventListener("click", () => { setField("t", parseFloat(b.dataset.t)); update(); });
  });
  $("reset").addEventListener("click", () => {
    setField("sw", 5); setField("sl", 15); setField("p", 40);
    $("stagger").checked = true; $("flip").checked = false; $("horiz").checked = false;
    update();
  });

  function filename() {
    return `skadis-${fmt(num("w"))}x${fmt(num("h"))}mm.svg`;
  }
  function note(text, warn) {
    const msg = $("msg");
    msg.textContent = text;
    msg.className = warn ? "msg warn" : "msg";
  }

  let downloads = null;
  (async () => {
    try {
      if (window.claude && typeof window.claude.use === "function") {
        downloads = await window.claude.use("downloads");
      }
    } catch (e) { downloads = null; }
  })();

  $("download").addEventListener("click", async () => {
    if (downloads) {
      try {
        await downloads.save({ filename: filename(), data: lastSVG });
        note("Saved " + filename() + ".");
      } catch (e) {
        if (e && e.code === "declined") return;
        if (e && e.code === "rate_limited") { note("A save prompt is already open.", true); return; }
        note("Download isn't available here. Open SVG source and copy it into a .svg file.", true);
      }
      return;
    }
    try {
      const blob = new Blob([lastSVG], { type: "image/svg+xml" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      note("Download isn't available here. Open SVG source and copy it into a .svg file.", true);
    }
  });

  $("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastSVG);
      note("SVG copied.");
    } catch (e) {
      const d = document.querySelector("details");
      d.open = true;
      $("code").focus();
      $("code").select();
      note("Clipboard is blocked here. The source is selected; press Cmd+C.", true);
    }
  });

  applyUnit();
  update();
})();
