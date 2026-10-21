// Runs inside the page (Chromium) after the HTML loads. Plain browser JavaScript.
// 1. Sizes each image frame (crop, contain/cover) and draws boxes and circles.
// 2. Shrinks any text that does not fit its box, down to a floor.
// 3. Returns a list of notes/warnings for the command line.
window.__runLayout = async function () {
  const CFG = window.__CFG;
  const issues = [];
  const note = (level, field, msg) => issues.push({ level, field, msg });

  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));

  // ---- 1. image frames -------------------------------------------------------
  for (const fr of document.querySelectorAll('[data-frame]')) {
    const area = fr.parentElement;
    const img = fr.querySelector('img');
    const aw = area.clientWidth;
    const ah = area.clientHeight;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (!natW || !natH) { note('error', 'image', 'Image could not be decoded.'); continue; }

    const crop = JSON.parse(fr.dataset.crop || '{"x":0,"y":0,"w":100,"h":100}');
    const mode = fr.dataset.mode || 'contain';
    const cw = (crop.w / 100) * natW;
    const ch = (crop.h / 100) * natH;

    let fw, fh, s, offX, offY;
    if (mode === 'cover') {
      fw = aw; fh = ah;
      s = Math.max(aw / cw, ah / ch);
      const dx = (fw - cw * s) / 2; // centre sideways
      const dy = fr.dataset.anchor === 'center' ? (fh - ch * s) / 2 : 0; // otherwise keep the top
      offX = dx - (crop.x / 100) * natW * s;
      offY = dy - (crop.y / 100) * natH * s;
    } else {
      s = Math.min(aw / cw, ah / ch);
      fw = cw * s; fh = ch * s;
      offX = -(crop.x / 100) * natW * s;
      offY = -(crop.y / 100) * natH * s;
    }
    fr.style.width = fw + 'px';
    fr.style.height = fh + 'px';
    Object.assign(img.style, { left: offX + 'px', top: offY + 'px', width: natW * s + 'px', height: natH * s + 'px' });

    if (s > 1.6) {
      note('warn', 'image', `Image is low resolution for this crop (it is enlarged ${s.toFixed(1)}x and may look blurry). Use a bigger screenshot or a looser crop.`);
    }

    // ---- annotations: coordinates are % of the ORIGINAL image ---
    const annots = JSON.parse(fr.dataset.annot || '[]');
    const svg = fr.querySelector('svg.annot');
    svg.setAttribute('width', fw);
    svg.setAttribute('height', fh);
    svg.setAttribute('viewBox', `0 0 ${fw} ${fh}`);
    const X = (p) => offX + (p / 100) * natW * s;
    const Y = (p) => offY + (p / 100) * natH * s;
    const R = (p) => (p / 100) * natW * s;
    const pad = CFG.annot.stroke / 2 + CFG.annot.gap;
    const shapes = [];
    for (const a of annots) {
      let attrs, inside;
      if (a.type === 'box') {
        const x = X(a.x) - pad, y = Y(a.y) - pad, w = R(a.w) + pad * 2, h = (a.h / 100) * natH * s + pad * 2;
        attrs = `<rect x="${x}" y="${y}" width="${w}" height="${h}" `;
        inside = a.x >= crop.x - 0.5 && a.y >= crop.y - 0.5 && a.x + a.w <= crop.x + crop.w + 0.5 && a.y + a.h <= crop.y + crop.h + 0.5;
      } else {
        const r = R(a.r) + pad;
        attrs = `<circle cx="${X(a.cx)}" cy="${Y(a.cy)}" r="${r}" `;
        const rx = a.r, ry = (a.r * natW) / natH;
        inside = a.cx - rx >= crop.x - 0.5 && a.cx + rx <= crop.x + crop.w + 0.5 && a.cy - ry >= crop.y - 0.5 && a.cy + ry <= crop.y + crop.h + 0.5;
      }
      if (!inside) note('warn', 'annotation', `A ${a.type} falls outside the cropped part of the image, so it will be cut off or hidden. Check its coordinates or the crop.`);
      const common = `fill="none" stroke-linejoin="miter"`;
      shapes.push(
        attrs + `${common} stroke="${CFG.annot.halo}" stroke-width="${CFG.annot.stroke + CFG.annot.haloExtra}"/>`,
        attrs + `${common} stroke="${CFG.annot.color}" stroke-width="${CFG.annot.stroke}"/>`
      );
    }
    // halos first, then strokes, so overlapping shapes keep clean lines
    const halos = shapes.filter((_, i) => i % 2 === 0);
    const strokes = shapes.filter((_, i) => i % 2 === 1);
    svg.innerHTML = halos.join('') + strokes.join('');
  }

  // ---- 2. text fitting ---------------------------------------------------------
  // Glyphs can poke a few px past the line box (display faces have tall ascenders), so allow a
  // fraction of the font size vertically. A real overflow is at least one whole line.
  const overflows = (el) => {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    return el.scrollHeight > el.clientHeight + fs * 0.2 || el.scrollWidth > el.clientWidth + 1;
  };
  for (const el of document.querySelectorAll('[data-fit]')) {
    const field = el.dataset.field || 'text';
    const floor = parseFloat(el.dataset.floor || '16');
    const start = parseFloat(getComputedStyle(el).fontSize);
    let size = start;
    while (overflows(el) && size > floor) {
      size = Math.max(floor, size - 2);
      el.style.fontSize = size + 'px';
    }
    if (overflows(el)) {
      const t = el.innerText.trim().replace(/\s+/g, ' ');
      note('warn', field, `Text does not fit even at the smallest size (${Math.round(size)}px). Shorten it: "${t.length > 70 ? t.slice(0, 70) + '…' : t}"`);
    } else if (size < start) {
      note('info', field, `Text was shrunk from ${Math.round(start)}px to ${Math.round(size)}px to fit.`);
    }
  }
  return issues;
};
