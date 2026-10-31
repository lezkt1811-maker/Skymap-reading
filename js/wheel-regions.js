// Builder: wheel upload, region drawing on the wheel, and the drag-to-pin arrows.
// Make region boxes selectable in viewer mode
wheelOverlay.addEventListener('click', e => {
  if (!isViewerMode) return;
  const box = e.target.closest('.region-box');
  if (!box) return;
  const i = Number(box.dataset.idx);
  if (isNaN(i)) return;
  pinnedIdx = i;
  showCompare(i);
  renderThumbs();
  renderRegionBoxes();
  renderPlanetClickList();
});

// Shared drag-to-pin interaction with a zoomed magnifier loupe that follows the finger.
// The real arrow itself now moves live with the finger (not just the magnifier preview),
// so there's no disconnect between what you see while dragging and where it actually lands —
// touch-action:none on the box (see CSS) stops the browser from fighting the gesture too,
// which was the main cause of the choppy/inaccurate placement.
const pinMagnifier = document.getElementById('pinMagnifier');
const pinMagCtx = pinMagnifier.getContext('2d');
function attachPinInteraction(boxEl, canvasEl, arrowEl, isLockedFn, onCommit){
  const ZOOM = 3;
  let dragging = false;

  // Finger touches are reported a bit below where a person is actually looking/aiming —
  // the pad of the finger covers the target, so the raw touch point reads low. This nudges
  // committed touch pins up slightly to match what the magnifier already shows the user.
  // Mouse input (desktop testing) is precise and left untouched.
  const TOUCH_Y_NUDGE_PX = 26;

  function project(clientX, clientY, isTouch){
    const rect = boxEl.getBoundingClientRect();
    const adjY = isTouch ? clientY - TOUCH_Y_NUDGE_PX : clientY;
    let x = (clientX - rect.left) / rect.width;
    let y = (adjY - rect.top) / rect.height;
    x = Math.min(1, Math.max(0, x));
    y = Math.min(1, Math.max(0, y));
    return { x, y };
  }

  function drawMagnifier(x, y, clientX, clientY){
    const magSize = 150;
    let magLeft = clientX - magSize/2;
    let magTop = clientY - magSize - 36; // float above the finger
    if (magTop < 8) magTop = clientY + 36; // flip below if too close to top
    magLeft = Math.min(Math.max(8, magLeft), window.innerWidth - magSize - 8);
    pinMagnifier.style.left = magLeft + 'px';
    pinMagnifier.style.top = magTop + 'px';
    pinMagnifier.hidden = false;

    if (canvasEl.width && canvasEl.height){
      const sw = canvasEl.width / ZOOM, sh = canvasEl.height / ZOOM;
      const sx = Math.min(Math.max(0, x*canvasEl.width - sw/2), Math.max(0, canvasEl.width - sw));
      const sy = Math.min(Math.max(0, y*canvasEl.height - sh/2), Math.max(0, canvasEl.height - sh));
      pinMagCtx.imageSmoothingEnabled = true;
      pinMagCtx.clearRect(0,0,pinMagnifier.width, pinMagnifier.height);
      pinMagCtx.drawImage(canvasEl, sx, sy, sw, sh, 0, 0, pinMagnifier.width, pinMagnifier.height);
    }
    pinMagCtx.strokeStyle = '#39ff8f'; pinMagCtx.lineWidth = 3;
    const cx = pinMagnifier.width/2, cy = pinMagnifier.height/2;
    pinMagCtx.beginPath(); pinMagCtx.moveTo(cx-18,cy); pinMagCtx.lineTo(cx+18,cy);
    pinMagCtx.moveTo(cx,cy-18); pinMagCtx.lineTo(cx,cy+18); pinMagCtx.stroke();
    pinMagCtx.strokeStyle = '#00f6ff'; pinMagCtx.lineWidth = 2;
    pinMagCtx.beginPath(); pinMagCtx.arc(cx,cy,10,0,Math.PI*2); pinMagCtx.stroke();
  }

  function updateLive(clientX, clientY, isTouch){
    const { x, y } = project(clientX, clientY, isTouch);
    if (arrowEl){
      arrowEl.style.left = (x*100) + '%';
      arrowEl.style.top = (y*100) + '%';
    }
    drawMagnifier(x, y, clientX, clientY);
    return { x, y };
  }

  function start(clientX, clientY, isTouch){
    if (isLockedFn()) return false;
    dragging = true;
    updateLive(clientX, clientY, isTouch);
    return true;
  }
  function move(clientX, clientY, isTouch){
    if (!dragging) return;
    updateLive(clientX, clientY, isTouch);
  }
  function end(clientX, clientY, isTouch){
    if (!dragging) return;
    dragging = false;
    pinMagnifier.hidden = true;
    const { x, y } = project(clientX, clientY, isTouch);
    if (arrowEl){ arrowEl.style.left = (x*100)+'%'; arrowEl.style.top = (y*100)+'%'; }
    onCommit(x, y);
  }

  boxEl.addEventListener('touchstart', e => {
    if (!e.touches[0]) return;
    if (start(e.touches[0].clientX, e.touches[0].clientY, true)) e.preventDefault();
  }, { passive:false });
  boxEl.addEventListener('touchmove', e => {
    if (!dragging || !e.touches[0]) return;
    move(e.touches[0].clientX, e.touches[0].clientY, true);
    e.preventDefault();
  }, { passive:false });
  boxEl.addEventListener('touchend', e => {
    if (!dragging) return;
    const t = e.changedTouches[0];
    if (t) end(t.clientX, t.clientY, true);
  });
  boxEl.addEventListener('touchcancel', () => { dragging = false; pinMagnifier.hidden = true; });

  // mouse fallback for desktop testing — precise as-is, no nudge
  boxEl.addEventListener('mousedown', e => { if (start(e.clientX, e.clientY, false)) e.preventDefault(); });
  window.addEventListener('mousemove', e => { if (dragging) move(e.clientX, e.clientY, false); });
  window.addEventListener('mouseup', e => { if (dragging) end(e.clientX, e.clientY, false); });
}

attachPinInteraction(
  zoomProof, zoomProofCanvas, proofArrow,
  () => pinnedIdx === null || !slots[pinnedIdx] || !slots[pinnedIdx].dataURL || !!slots[pinnedIdx].locked,
  (x, y) => {
    slots[pinnedIdx].proofPoint = { x, y };
    showCompare(pinnedIdx);
    renderPlanetGallery();
  }
);

attachPinInteraction(
  zoomWheel, zoomWheelCanvas, wheelArrow,
  () => pinnedIdx === null || !slots[pinnedIdx] || !slots[pinnedIdx].region || !!slots[pinnedIdx].wheelLocked,
  (x, y) => {
    slots[pinnedIdx].wheelPoint = { x, y };
    showCompare(pinnedIdx);
    renderPlanetGallery();
  }
);

const lockBtn = document.getElementById('lockBtn');
lockBtn.addEventListener('click', () => {
  if (pinnedIdx === null || !slots[pinnedIdx]) return;
  const slot = slots[pinnedIdx];
  if (!slot.proofPoint) return; // nothing placed yet, nothing to lock
  slot.locked = !slot.locked;
  showCompare(pinnedIdx);
  renderPlanetGallery();
});

const wheelLockBtn = document.getElementById('wheelLockBtn');
wheelLockBtn.addEventListener('click', () => {
  if (pinnedIdx === null || !slots[pinnedIdx]) return;
  const slot = slots[pinnedIdx];
  if (!slot.wheelPoint) return; // nothing placed yet, nothing to lock
  slot.wheelLocked = !slot.wheelLocked;
  showCompare(pinnedIdx);
  renderPlanetGallery();
});

renderSavedList();

slots.forEach((slot, i) => {
  const row = document.createElement('div');
  row.className = 'proof-row';
  row.innerHTML = `
    <div class="proof-row-top">
      <input type="text" placeholder="Planet name" class="proof-label" data-idx="${i}" value="${esc(slot.label)}">
      <div class="drop" data-idx="${i}">Choose image</div>
      <input type="file" accept="image/*" class="proof-file" data-idx="${i}">
    </div>
    <button class="region-btn" data-idx="${i}" disabled>Draw box on wheel</button>
  `;
  proofListEl.appendChild(row);
});

document.querySelectorAll('.proof-label').forEach(inp => {
  inp.addEventListener('input', e => {
    const i = e.target.dataset.idx;
    slots[i].label = e.target.value;
    renderThumbs();
    renderPlanetClickList();
    if (Number(i) === pinnedIdx) compareProofLabel.textContent = slots[i].label || `Slot ${Number(i)+1}`;
  });
});

document.querySelectorAll('.proof-row .drop').forEach(drop => {
  drop.addEventListener('click', () => document.querySelector(`.proof-file[data-idx="${drop.dataset.idx}"]`).click());
});

document.querySelectorAll('.proof-file').forEach(fileInp => {
  fileInp.addEventListener('change', e => {
    const idx = Number(e.target.dataset.idx);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        slots[idx].dataURL = ev.target.result;
        slots[idx].img = img;
        slots[idx].region = null;
        slots[idx].proofPoint = null;
        slots[idx].locked = false;
        document.querySelector(`.proof-row .drop[data-idx="${idx}"]`).classList.add('filled');
        document.querySelector(`.proof-row .drop[data-idx="${idx}"]`).textContent = 'done';
        updateRegionButton(idx);
        renderThumbs();
        renderRegionBoxes();
        renderPlanetClickList();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
});

document.querySelectorAll('.region-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const i = Number(btn.dataset.idx);
    if (assigningIdx === i) { cancelAssign(); return; }
    if (!wheelData || !slots[i].dataURL){
      toast('Upload the wheel (step 1) and this planet\'s sky photo (step 3) first.', 'warn');
      return;
    }
    assigningIdx = i;
    modeLabel.textContent = slots[i].label || `Slot ${i+1}`;
    modeBanner.hidden = false;
    // Bring the wheel into view: on phones and small screens the sidebar sits above it
    document.getElementById('wheelFrame').scrollIntoView({ behavior: 'smooth', block: 'center' });
    wheelOverlay.classList.add('assign-mode');
    document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('assigning'));
    btn.classList.add('assigning');
  });
});

function updateRegionButton(i){
  const btn = document.querySelector(`.region-btn[data-idx="${i}"]`);
  btn.disabled = !(wheelData && slots[i].dataURL);
  btn.classList.toggle('done', !!slots[i].region);
  btn.textContent = slots[i].region ? 'Box drawn ✓ (redraw)' : 'Draw box on wheel';
}

function cancelAssign(){
  assigningIdx = null;
  modeBanner.hidden = true;
  wheelOverlay.classList.remove('assign-mode');
  document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('assigning'));
}

wheelDropEl.addEventListener('click', () => wheelInputEl.click());
wheelInputEl.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      wheelData = { dataURL: ev.target.result, img, naturalW: img.naturalWidth, naturalH: img.naturalHeight };
      const pc = document.createElement('canvas');
      pc.width = img.naturalWidth; pc.height = img.naturalHeight;
      pc.getContext('2d').drawImage(img, 0, 0);
      wheelData.pixelCtx = pc.getContext('2d');
      wheelImgEl.src = ev.target.result;
      wheelImgEl.hidden = false;
      wheelEmpty.hidden = true;
      wheelDropEl.classList.add('filled');
      wheelDropEl.textContent = file.name.slice(0,24);
      slots.forEach((s,i) => { s.region = null; updateRegionButton(i); });
      renderRegionBoxes();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

const DEFAULT_REGION_FRAC = 0.22; // larger default so glyph + leader line fit

function findSmartRegion(fx, fy){
  if (!wheelData || !wheelData.pixelCtx) return null;
  const naturalW = wheelData.naturalW, naturalH = wheelData.naturalH;
  const px = fx*naturalW, py = fy*naturalH;
  // bigger search radius so we catch the glyph AND the short leader line
  const radius = Math.max(55, naturalW*0.09);
  const winX = Math.max(0, Math.floor(px-radius)), winY = Math.max(0, Math.floor(py-radius));
  const winW = Math.min(naturalW-winX, Math.floor(radius*2));
  const winH = Math.min(naturalH-winY, Math.floor(radius*2));
  if (winW <= 0 || winH <= 0) return null;
  let data;
  try { data = wheelData.pixelCtx.getImageData(winX, winY, winW, winH).data; }
  catch(e){ return null; }
  let minX=winW, minY=winH, maxX=0, maxY=0, count=0;
  for (let y=0; y<winH; y++){
    for (let x=0; x<winW; x++){
      const idx = (y*winW+x)*4;
      const r=data[idx], g=data[idx+1], b=data[idx+2];
      const maxC = Math.max(r,g,b), minC = Math.min(r,g,b);
      const colorful = (maxC-minC) > 16 && maxC > 55;
      if (colorful){
        if (x<minX) minX=x; if (x>maxX) maxX=x;
        if (y<minY) minY=y; if (y>maxY) maxY=y;
        count++;
      }
    }
  }
  if (count < 10) return null;
  // generous padding so the box always includes the glyph + connecting line
  const padX = (maxX-minX)*0.65 + 18, padY = (maxY-minY)*0.65 + 18;
  let bx0 = Math.max(0, winX+minX-padX), by0 = Math.max(0, winY+minY-padY);
  let bx1 = Math.min(naturalW, winX+maxX+padX), by1 = Math.min(naturalH, winY+maxY+padY);
  // enforce a minimum size so tiny glyphs still get a readable box
  let w = bx1-bx0, h = by1-by0;
  const minSide = naturalW * 0.12;
  if (w < minSide){ const extra = (minSide-w)/2; bx0 = Math.max(0, bx0-extra); bx1 = Math.min(naturalW, bx1+extra); w = bx1-bx0; }
  if (h < minSide){ const extra = (minSide-h)/2; by0 = Math.max(0, by0-extra); by1 = Math.min(naturalH, by1+extra); h = by1-by0; }
  return {
    x: bx0/naturalW, y: by0/naturalH,
    w: w/naturalW, h: h/naturalH
  };
}

let dragBoxEl = null;

function pointFromEvent(e, rect){
  const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

function dragBegin(e){
  if (assigningIdx === null) return;
  const rect = wheelOverlay.getBoundingClientRect();
  const p = pointFromEvent(e, rect);
  dragStart = { x: p.x, y: p.y };
  dragBoxEl = document.createElement('div');
  dragBoxEl.className = 'drag-box';
  wheelOverlay.appendChild(dragBoxEl);
  if (e.touches) e.preventDefault();
}
function dragMove(e){
  if (!dragStart || !dragBoxEl) return;
  const rect = wheelOverlay.getBoundingClientRect();
  const p = pointFromEvent(e, rect);
  const cx = Math.max(0, Math.min(p.x, rect.width)), cy = Math.max(0, Math.min(p.y, rect.height));
  const x = Math.min(dragStart.x, cx), y = Math.min(dragStart.y, cy);
  const w = Math.abs(cx - dragStart.x), h = Math.abs(cy - dragStart.y);
  dragBoxEl.style.left = x + 'px'; dragBoxEl.style.top = y + 'px';
  dragBoxEl.style.width = w + 'px'; dragBoxEl.style.height = h + 'px';
  if (e.touches) e.preventDefault();
}
function dragEnd(e){
  if (!dragStart || assigningIdx === null) { dragStart = null; return; }
  const rect = wheelOverlay.getBoundingClientRect();
  const p = pointFromEvent(e, rect);
  const cx = Math.max(0, Math.min(p.x, rect.width)), cy = Math.max(0, Math.min(p.y, rect.height));
  const x = Math.min(dragStart.x, cx), y = Math.min(dragStart.y, cy);
  const w = Math.abs(cx - dragStart.x), h = Math.abs(cy - dragStart.y);
  if (dragBoxEl) { dragBoxEl.remove(); dragBoxEl = null; }
  const moved = w > 6 && h > 6;
  const idx = assigningIdx;
  dragStart = null;
  cancelAssign();
  if (moved){
    slots[idx].region = {
      x: x / rect.width, y: y / rect.height,
      w: w / rect.width, h: h / rect.height
    };
  } else {
    const tapFx = cx / rect.width, tapFy = cy / rect.height;
    const smart = findSmartRegion(tapFx, tapFy);
    if (smart){
      slots[idx].region = smart;
    } else {
      const half = DEFAULT_REGION_FRAC/2;
      slots[idx].region = {
        x: Math.max(0, Math.min(tapFx-half, 1-DEFAULT_REGION_FRAC)),
        y: Math.max(0, Math.min(tapFy-half, 1-DEFAULT_REGION_FRAC)),
        w: DEFAULT_REGION_FRAC, h: DEFAULT_REGION_FRAC
      };
    }
  }
  updateRegionButton(idx);
  renderRegionBoxes();
  renderPlanetClickList();
  if (pinnedIdx === idx) showCompare(idx);
  if (e.touches || e.changedTouches) e.preventDefault();
}

wheelOverlay.addEventListener('mousedown', dragBegin);
wheelOverlay.addEventListener('mousemove', dragMove);
window.addEventListener('mouseup', dragEnd);

wheelOverlay.addEventListener('touchstart', dragBegin, { passive:false });
wheelOverlay.addEventListener('touchmove', dragMove, { passive:false });
window.addEventListener('touchend', dragEnd, { passive:false });
window.addEventListener('touchcancel', dragEnd, { passive:false });

function renderRegionBoxes(){
  wheelOverlay.querySelectorAll('.region-box').forEach(el => el.remove());
  // Only show the currently selected region so boxes never stack/overlap
  const showIdx = pinnedIdx;
  slots.forEach((slot, i) => {
    if (!slot.region) return;
    // In builder mode show all lightly; in viewer (or when one is pinned) only show the active one
    if (isViewerMode || pinnedIdx !== null) {
      if (i !== showIdx) return;
    }
    const box = document.createElement('div');
    box.className = 'region-box' + (i === pinnedIdx ? ' active' : '');
    box.style.left = (slot.region.x*100) + '%';
    box.style.top = (slot.region.y*100) + '%';
    box.style.width = (slot.region.w*100) + '%';
    box.style.height = (slot.region.h*100) + '%';
    box.dataset.idx = i;
    wheelOverlay.appendChild(box);
  });
}

