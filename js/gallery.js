// Planet gallery, comparison view, thumbnails, and the wheel/sky crops.
function renderThumbs(){
  thumbGrid.innerHTML = '';
  slots.forEach((slot, i) => {
    const t = document.createElement('div');
    if (!slot.dataURL){
      t.className = 'thumb empty';
      t.textContent = `slot ${i+1}`;
    } else {
      t.className = 'thumb' + (i === pinnedIdx ? ' active' : '');
      t.innerHTML = `<img src="${slot.dataURL}" alt=""><div class="thumb-label">${esc(slot.label || 'slot '+(i+1))}</div>`;
      t.addEventListener('mouseenter', () => showCompare(i));
      t.addEventListener('mouseleave', () => { pinnedIdx !== null ? showCompare(pinnedIdx) : clearCompare(); });
      t.addEventListener('click', () => { pinnedIdx = i; showCompare(i); renderThumbs(); renderRegionBoxes(); renderPlanetClickList(); });
    }
    thumbGrid.appendChild(t);
  });
  renderPlanetGallery();
}

function applySharpen(ctx, w, h, amount){
  if (w*h > 1100*1100) return; // skip only on very large canvases
  const imgData = ctx.getImageData(0,0,w,h);
  const src = imgData.data;
  const out = new Uint8ClampedArray(src.length);
  // slightly stronger unsharp kernel
  const k = [0,-1,0, -1,5,-1, 0,-1,0];
  for (let y=0; y<h; y++){
    for (let x=0; x<w; x++){
      const idx = (y*w+x)*4;
      if (x===0||y===0||x===w-1||y===h-1){
        out[idx]=src[idx]; out[idx+1]=src[idx+1]; out[idx+2]=src[idx+2]; out[idx+3]=src[idx+3];
        continue;
      }
      for (let c=0; c<3; c++){
        let sum=0, ki=0;
        for (let ky=-1; ky<=1; ky++){
          for (let kx=-1; kx<=1; kx++){
            sum += src[((y+ky)*w+(x+kx))*4+c] * k[ki++];
          }
        }
        // clamp after mix to avoid wash-out
        const v = src[idx+c]*(1-amount) + sum*amount;
        out[idx+c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      out[idx+3] = src[idx+3];
    }
  }
  imgData.data.set(out);
  ctx.putImageData(imgData,0,0);
}

// Crops the wheel image to EXACTLY the box the user drew for `region` — no padding,
// no forced square. The container's aspect-ratio is set to match so the shape on
// screen is the same shape that was drawn.
function drawWheelCrop(canvasEl, parentEl, region){
  if (!wheelData || !wheelData.img || !region) return;
  const naturalW = wheelData.naturalW, naturalH = wheelData.naturalH;
  const cropX = Math.max(0, region.x * naturalW);
  const cropY = Math.max(0, region.y * naturalH);
  const cropW = Math.max(1, Math.min(region.w * naturalW, naturalW - cropX));
  const cropH = Math.max(1, Math.min(region.h * naturalH, naturalH - cropY));
  const aspect = cropW / cropH;
  if (parentEl) parentEl.style.aspectRatio = aspect.toFixed(4) + ' / 1';
  const targetCssW = canvasEl.parentElement ? canvasEl.parentElement.clientWidth : 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const upscale = ((targetCssW || 280) * dpr) / cropW;
  const useCrisp = upscale > 2.2;
  drawSharp(canvasEl, (ctx, w, h) => {
    ctx.drawImage(wheelData.img, cropX, cropY, cropW, cropH, 0, 0, w, h);
  }, true, { crisp: useCrisp, sharpenAmount: useCrisp ? 0.55 : 0.75, aspect });
}

// Full down-the-page list: every planet that has both a region drawn on the wheel
// AND a sky screenshot gets its own row — exact wheel crop on the left, sky proof
// screenshot on the right.
function renderPlanetGallery(){
  const galleryList = document.getElementById('galleryList');
  if (!galleryList) return;
  galleryList.innerHTML = '';
  const ready = slots.filter(s => s.region && s.dataURL && s.img);
  const section = document.getElementById('gallerySection');
  if (section) section.hidden = !ready.length;
  refreshSteps();
  if (!ready.length) return;

  ready.forEach(slot => {
    const row = document.createElement('div');
    row.className = 'gallery-row';

    // Left: exact wheel crop — now with its own lock button and drag-to-pin, right here,
    // so adjusting doesn't require scrolling up to the compare view anymore.
    const leftCol = document.createElement('div');
    leftCol.className = 'gallery-col';
    const leftTitleRow = document.createElement('div');
    leftTitleRow.className = 'gallery-title-row';
    const leftTitle = document.createElement('div');
    leftTitle.className = 'gallery-title';
    leftTitle.textContent = slot.label;
    const leftLockBtn = document.createElement('button');
    leftLockBtn.type = 'button';
    leftLockBtn.className = 'gallery-lock-btn';
    leftTitleRow.appendChild(leftTitle);
    leftTitleRow.appendChild(leftLockBtn);
    const leftBox = document.createElement('div');
    leftBox.className = 'zoom-box';
    const leftCanvas = document.createElement('canvas');
    leftBox.appendChild(leftCanvas);
    const wArrow = document.createElement('div');
    wArrow.className = 'gallery-arrow wheel';
    wArrow.innerHTML = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 56 L32 20" stroke="#00f6ff" stroke-width="4" stroke-linecap="round"/>
      <path d="M20 30 L32 16 L44 30" stroke="#a742ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="12" r="5" fill="#00f6ff"/>
    </svg>`;
    leftBox.appendChild(wArrow);
    leftCol.appendChild(leftTitleRow);
    leftCol.appendChild(leftBox);

    // Right: sky-proof screenshot — same deal, its own lock button + drag-to-pin
    const rightCol = document.createElement('div');
    rightCol.className = 'gallery-col';
    const rightTitleRow = document.createElement('div');
    rightTitleRow.className = 'gallery-title-row';
    const rightTitle = document.createElement('div');
    rightTitle.className = 'gallery-title';
    rightTitle.textContent = 'Sky proof — ' + slot.label;
    const rightLockBtn = document.createElement('button');
    rightLockBtn.type = 'button';
    rightLockBtn.className = 'gallery-lock-btn';
    rightTitleRow.appendChild(rightTitle);
    rightTitleRow.appendChild(rightLockBtn);
    const rightBox = document.createElement('div');
    rightBox.className = 'zoom-box';
    const rightCanvas = document.createElement('canvas');
    rightBox.appendChild(rightCanvas);
    const arrow = document.createElement('div');
    arrow.className = 'gallery-arrow';
    arrow.innerHTML = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 56 L32 20" stroke="#00f6ff" stroke-width="4" stroke-linecap="round"/>
      <path d="M20 30 L32 16 L44 30" stroke="#ff2ee6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="12" r="5" fill="#00f6ff"/>
    </svg>`;
    rightBox.appendChild(arrow);
    rightCol.appendChild(rightTitleRow);
    rightCol.appendChild(rightBox);

    row.appendChild(leftCol);
    row.appendChild(rightCol);
    galleryList.appendChild(row);

    function refreshRowUI(){
      // wheel arrow + lock button
      const wp = slot.wheelPoint || { x: 0.5, y: 0.5 };
      wArrow.style.left = (wp.x * 100) + '%';
      wArrow.style.top = (wp.y * 100) + '%';
      wArrow.classList.toggle('locked', !!(slot.wheelPoint && slot.wheelLocked));
      if (!slot.wheelPoint){
        leftLockBtn.hidden = true;
      } else {
        leftLockBtn.hidden = false;
        leftLockBtn.textContent = slot.wheelLocked ? '🔒' : '🔓';
        leftLockBtn.classList.toggle('locked', !!slot.wheelLocked);
      }
      // sky arrow + lock button
      const pp = slot.proofPoint || { x: 0.5, y: 0.42 };
      arrow.style.left = (pp.x * 100) + '%';
      arrow.style.top = (pp.y * 100) + '%';
      arrow.classList.toggle('locked', !!(slot.proofPoint && slot.locked));
      if (!slot.proofPoint){
        rightLockBtn.hidden = true;
      } else {
        rightLockBtn.hidden = false;
        rightLockBtn.textContent = slot.locked ? '🔒' : '🔓';
        rightLockBtn.classList.toggle('locked', !!slot.locked);
      }
    }
    refreshRowUI();

    leftLockBtn.addEventListener('click', () => {
      if (!slot.wheelPoint) return;
      slot.wheelLocked = !slot.wheelLocked;
      refreshRowUI();
    });
    rightLockBtn.addEventListener('click', () => {
      if (!slot.proofPoint) return;
      slot.locked = !slot.locked;
      refreshRowUI();
    });

    // Drag-to-pin directly on this row's boxes — same magnifier interaction as the
    // compare view, just usable without scrolling back up to it.
    attachPinInteraction(
      leftBox, leftCanvas, wArrow,
      () => !!slot.wheelLocked,
      (x, y) => { slot.wheelPoint = { x, y }; refreshRowUI(); if (pinnedIdx !== null && slots[pinnedIdx] === slot) showCompare(pinnedIdx); }
    );
    attachPinInteraction(
      rightBox, rightCanvas, arrow,
      () => !!slot.locked,
      (x, y) => { slot.proofPoint = { x, y }; refreshRowUI(); if (pinnedIdx !== null && slots[pinnedIdx] === slot) showCompare(pinnedIdx); }
    );

    const drawRow = () => {
      drawWheelCrop(leftCanvas, leftBox, slot.region);
      drawSharp(rightCanvas, (ctx, w, h) => {
        const img = slot.img;
        const scale = Math.max(w / img.width, h / img.height);
        const iw = img.width * scale, ih = img.height * scale;
        ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
      }, true, { sharpenAmount: 0.45 });
    };
    drawRow();
    requestAnimationFrame(() => requestAnimationFrame(drawRow));
  });
}

function drawSharp(canvasEl, drawFn, sharpen, opts){
  opts = opts || {};
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  // clientWidth can be 0 the instant the compare panel is un-hidden on mobile — fall back hard
  let boxCss = canvasEl.parentElement ? canvasEl.parentElement.clientWidth : 0;
  if (!boxCss || boxCss < 40) {
    boxCss = Math.min(window.innerWidth - 48, 360) || 280;
  }
  // aspect = display width / display height. Defaults to 1 (square) for callers that don't care.
  const aspect = opts.aspect && isFinite(opts.aspect) && opts.aspect > 0 ? opts.aspect : 1;
  const boxCssH = boxCss / aspect;
  canvasEl.width = Math.round(boxCss * dpr);
  canvasEl.height = Math.round(boxCssH * dpr);
  canvasEl.style.width = boxCss + 'px';
  canvasEl.style.height = boxCssH + 'px';
  const ctx = canvasEl.getContext('2d');
  const forceCrisp = !!opts.crisp;
  ctx.imageSmoothingEnabled = !forceCrisp;
  if (!forceCrisp) ctx.imageSmoothingQuality = 'high';
  // Fill so a failed draw is never pure mysterious black
  ctx.fillStyle = '#0b0322';
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  try {
    drawFn(ctx, canvasEl.width, canvasEl.height);
  } catch (err) {
    console.warn('drawSharp failed', err);
  }
  if (sharpen) {
    try {
      applySharpen(ctx, canvasEl.width, canvasEl.height, opts.sharpenAmount != null ? opts.sharpenAmount : 0.72);
    } catch (e) { /* skip sharpen on failure */ }
  }
}

function getPlanetDescription(label){
  // Try to pull a matching line from the planet list textarea. Prefer the clean bullet
  // ("Sun · 31°59' Sagittarius") placement rows over any messier house-table rows that
  // might also mention the same word — those were the source of the doubled/garbled
  // degree numbers in narration.
  const lines = (planetListEl.value || '').split('\n').map(l => l.trim()).filter(Boolean);
  const lower = (label || '').toLowerCase();
  const bulletStart = lines.find(l => l.includes('·') && l.toLowerCase().startsWith(lower));
  if (bulletStart) return bulletStart;
  const bulletAny = lines.find(l => l.includes('·') && l.toLowerCase().includes(lower));
  if (bulletAny) return bulletAny;
  const hit = lines.find(l => l.toLowerCase().includes(lower));
  return hit || label || '';
}

function showCompare(i){
  const slot = slots[i];
  if (!slot || !slot.dataURL) return;
  compareEmpty.hidden = true;
  compareActive.hidden = false;
  const name = slot.label || `Slot ${i+1}`;
  const desc = getPlanetDescription(name);
  compareProofLabel.textContent = name;

  // Labels on both zoom boxes
  zoomWheelLabel.hidden = false;
  zoomWheelLabel.innerHTML = `${name}<span class="sub">${desc !== name ? desc : 'Chart placement'}</span>`;
  zoomProofLabel.hidden = false;
  zoomProofLabel.innerHTML = `Sky proof — ${name}<span class="sub">Real sky at birth time</span>`;

  // Pulsing arrow on the WHEEL side — uses saved wheelPoint if set, otherwise center
  const wp = slot.wheelPoint || { x: 0.5, y: 0.5 };
  wheelArrow.hidden = false;
  wheelArrowLabel.hidden = false;
  wheelArrow.style.left = (wp.x * 100) + '%';
  wheelArrow.style.top = (wp.y * 100) + '%';
  wheelArrowLabel.style.left = (wp.x * 100) + '%';
  wheelArrowLabel.style.top = ((wp.y * 100) + 16) + '%';
  wheelArrow.classList.toggle('locked', !!(slot.wheelPoint && slot.wheelLocked));
  wheelArrowLabel.classList.toggle('locked', !!(slot.wheelPoint && slot.wheelLocked));
  if (!slot.wheelPoint) {
    wheelArrowLabel.textContent = `↑ ${name} (drag to pin)`;
  } else if (slot.wheelLocked) {
    wheelArrowLabel.textContent = `✓ ${name} (locked)`;
  } else {
    wheelArrowLabel.textContent = `↑ ${name}`;
  }

  // Pulsing arrow on the sky-map side — uses saved proofPoint if set, otherwise center
  proofArrow.hidden = false;
  proofArrowLabel.hidden = false;
  proofArrowLabel.textContent = `↑ ${name}`;
  const pp = slot.proofPoint || { x: 0.5, y: 0.42 };
  proofArrow.style.left = (pp.x * 100) + '%';
  proofArrow.style.top = (pp.y * 100) + '%';
  proofArrowLabel.style.left = (pp.x * 100) + '%';
  proofArrowLabel.style.top = ((pp.y * 100) + 14) + '%';
  proofArrow.classList.toggle('locked', !!(slot.proofPoint && slot.locked));
  proofArrowLabel.classList.toggle('locked', !!(slot.proofPoint && slot.locked));
  // subtle hint if not yet placed
  if (!slot.proofPoint) {
    proofArrowLabel.textContent = `↑ ${name} (drag to pin)`;
  } else if (slot.locked) {
    proofArrowLabel.textContent = `✓ ${name} (locked)`;
  }

  // lock/unlock buttons reflect current state
  if (!slot.proofPoint) {
    lockBtn.hidden = true;
  } else {
    lockBtn.hidden = false;
    lockBtn.textContent = slot.locked ? '🔒 Locked' : '🔓 Lock in place';
    lockBtn.classList.toggle('locked', !!slot.locked);
    lockBtn.classList.toggle('unlocked', !slot.locked);
  }
  if (!slot.wheelPoint) {
    wheelLockBtn.hidden = true;
  } else {
    wheelLockBtn.hidden = false;
    wheelLockBtn.textContent = slot.wheelLocked ? '🔒 Locked' : '🔓 Lock in place';
    wheelLockBtn.classList.toggle('locked', !!slot.wheelLocked);
    wheelLockBtn.classList.toggle('unlocked', !slot.wheelLocked);
  }

  // proof side: sharp cover-fit, high DPR + light sharpen
  drawSharp(zoomProofCanvas, (ctx, w, h) => {
    const img = slot.img;
    const scale = Math.max(w/img.width, h/img.height);
    const iw = img.width*scale, ih = img.height*scale;
    ctx.drawImage(img, (w-iw)/2, (h-ih)/2, iw, ih);
  }, true, { sharpenAmount: 0.45 });

  // wheel side: exact crop of the box the user drew — no padding, no forced square
  if (slot.region && wheelData && wheelData.img){
    zoomWheelHint.textContent = '';
    zoomWheelHint.classList.remove('show');
    zoomWheelGlow.hidden = false;
    zoomWheelLabel.hidden = false;

    const drawWheelZoom = () => drawWheelCrop(zoomWheelCanvas, zoomWheel, slot.region);

    // Draw now, then again after layout settles (critical on mobile when panel just became visible)
    drawWheelZoom();
    requestAnimationFrame(() => {
      requestAnimationFrame(drawWheelZoom);
    });
    setTimeout(drawWheelZoom, 80);
  } else {
    zoomWheelGlow.hidden = true;
    zoomWheelLabel.hidden = true;
    zoomWheelHint.textContent = wheelData ? 'No box drawn for this planet yet. Press "Draw box on wheel" in step 3.' : 'Upload your wheel image in step 1 first.';
    zoomWheelHint.classList.add('show');
    const ctx = zoomWheelCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0b0322';
      ctx.fillRect(0,0,zoomWheelCanvas.width||1, zoomWheelCanvas.height||1);
    }
  }

  wheelOverlay.querySelectorAll('.region-box').forEach(b => b.classList.toggle('active', Number(b.dataset.idx) === i));
}


window.addEventListener('resize', () => {
  renderPlanetGallery();
});

// Floating "back to wheel" button — appears once you've scrolled past the wheel,
// jumps straight back to the top so long planet lists don't strand you.
const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn){
  const wheelEl = document.getElementById('wheelFrame');
  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('show', window.scrollY > 400);
  }, { passive: true });
  backToTopBtn.addEventListener('click', () => {
    (wheelEl || document.body).scrollIntoView({ behavior:'smooth', block:'start' });
  });
}

function clearCompare(){
  compareEmpty.hidden = false;
  compareActive.hidden = true;
  wheelOverlay.querySelectorAll('.region-box').forEach(b => b.classList.remove('active'));
  if (zoomWheelLabel) zoomWheelLabel.hidden = true;
  if (zoomProofLabel) zoomProofLabel.hidden = true;
  if (proofArrow) proofArrow.hidden = true;
  if (proofArrowLabel) proofArrowLabel.hidden = true;
  if (zoomWheelGlow) zoomWheelGlow.hidden = true;
  if (zoomWheelHint) { zoomWheelHint.classList.remove('show'); zoomWheelHint.textContent = ''; }
}

