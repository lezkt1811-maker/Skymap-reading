// Saved-chart library, chart loading, and the Interactive (viewer) mode.
const STORAGE_KEY = 'starchart13-charts-v1';

function getSavedCharts(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch(e){ return {}; }
}
function setSavedCharts(obj){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

function serializeChart(){
  return {
    title: document.getElementById('chartTitle').value || 'Untitled chart',
    planetList: planetListEl.value || '',
    wheelDataURL: wheelData ? wheelData.dataURL : null,
    slots: slots.map(s => ({
      label: s.label,
      dataURL: s.dataURL,
      region: s.region,
      proofPoint: s.proofPoint || null,
      wheelPoint: s.wheelPoint || null,
      wheelLocked: !!s.wheelLocked,
      locked: !!s.locked
    })),
    savedAt: new Date().toISOString()
  };
}

function loadChartData(data){
  if (!data) return;
  document.getElementById('chartTitle').value = data.title || '';
  planetListEl.value = data.planetList || '';
  // clear current
  slots.forEach((s,i) => {
    s.label = (data.slots && data.slots[i] && data.slots[i].label) || DEFAULT_PLANET_NAMES[i];
    s.dataURL = null; s.img = null; s.region = null; s.proofPoint = null; s.wheelPoint = null; s.locked = false; s.wheelLocked = false;
  });
  wheelData = null;
  wheelImgEl.hidden = true;
  wheelEmpty.hidden = false;
  wheelDropEl.classList.remove('filled');
  wheelDropEl.textContent = 'Click to choose your wheel image';

  const promises = [];
  if (data.wheelDataURL){
    promises.push(new Promise(res => {
      const img = new Image();
      img.onload = () => {
        wheelData = { dataURL: data.wheelDataURL, img, naturalW: img.naturalWidth, naturalH: img.naturalHeight };
        const pc = document.createElement('canvas');
        pc.width = img.naturalWidth; pc.height = img.naturalHeight;
        pc.getContext('2d').drawImage(img, 0, 0);
        wheelData.pixelCtx = pc.getContext('2d');
        wheelImgEl.src = data.wheelDataURL;
        wheelImgEl.hidden = false;
        wheelEmpty.hidden = true;
        wheelDropEl.classList.add('filled');
        wheelDropEl.textContent = 'wheel loaded';
        res();
      };
      img.src = data.wheelDataURL;
    }));
  }
  (data.slots || []).forEach((sd, i) => {
    if (i >= slots.length) return;
    slots[i].label = sd.label || slots[i].label;
    slots[i].region = sd.region || null;
    slots[i].proofPoint = sd.proofPoint || null;
    slots[i].wheelPoint = sd.wheelPoint || null;
    slots[i].wheelLocked = !!sd.wheelLocked;
    slots[i].locked = !!sd.locked;
    if (sd.dataURL){
      promises.push(new Promise(res => {
        const img = new Image();
        img.onload = () => {
          slots[i].dataURL = sd.dataURL;
          slots[i].img = img;
          const drop = document.querySelector(`.proof-row .drop[data-idx="${i}"]`);
          if (drop){ drop.classList.add('filled'); drop.textContent = 'done'; }
          res();
        };
        img.src = sd.dataURL;
      }));
    }
  });
  Promise.all(promises).then(() => {
    slots.forEach((_,i) => updateRegionButton(i));
    // sync label inputs
    document.querySelectorAll('.proof-label').forEach(inp => {
      const i = Number(inp.dataset.idx);
      inp.value = slots[i].label;
    });
    renderThumbs();
    renderRegionBoxes();
    renderPlanetClickList();
    if (pinnedIdx !== null) showCompare(pinnedIdx);
    refreshSteps();
  });
}

function renderSavedList(){
  if (!savedListEl) return;
  const charts = getSavedCharts();
  const keys = Object.keys(charts).sort((a,b) => (charts[b].savedAt||'').localeCompare(charts[a].savedAt||''));
  savedListEl.innerHTML = '';
  if (!keys.length){
    savedListEl.innerHTML = '<div class="muted-note">No saved charts yet</div>';
    return;
  }
  keys.forEach(key => {
    const c = charts[key];
    const row = document.createElement('div');
    row.className = 'saved-item';
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'saved-open';
    openBtn.textContent = c.title || key;
    openBtn.addEventListener('click', () => loadChartData(c));
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'saved-del';
    delBtn.textContent = '✕';
    delBtn.setAttribute('aria-label', `Delete saved chart ${c.title || key}`);
    delBtn.addEventListener('click', () => {
      if (confirm('Delete this saved chart?')){
        const obj = getSavedCharts();
        delete obj[key];
        setSavedCharts(obj);
        renderSavedList();
      }
    });
    row.appendChild(openBtn);
    row.appendChild(delBtn);
    savedListEl.appendChild(row);
  });
}

function renderPlanetClickList(){
  if (!planetClickList) return;
  refreshSteps();
  planetClickList.innerHTML = '';
  slots.forEach((slot, i) => {
    if (!slot.dataURL && !slot.region) return; // only show ones with something
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'planet-click-item' + (i === pinnedIdx ? ' active' : '') + (slot.dataURL ? ' has-proof' : '');
    item.innerHTML = `<span class="dot"></span><span>${esc(slot.label || 'Slot '+(i+1))}</span>`;
    item.addEventListener('click', () => {
      pinnedIdx = i;
      showCompare(i);
      renderThumbs();
      renderRegionBoxes();
      renderPlanetClickList();
    });
    planetClickList.appendChild(item);
  });
  if (!planetClickList.children.length){
    planetClickList.innerHTML = '<div class="empty-note">No proofs loaded yet</div>';
  }
}

function enterViewerMode(){
  isViewerMode = true;
  document.body.classList.add('viewer-mode');
  taglineEl.textContent = 'interactive proof viewer';
  viewerTitleEl.textContent = document.getElementById('chartTitle').value || 'Untitled chart';
  cancelAssign();
  renderPlanetClickList();
  // auto-select first available if none pinned
  if (pinnedIdx === null){
    const first = slots.findIndex(s => s.dataURL || s.region);
    if (first >= 0){ pinnedIdx = first; showCompare(first); renderThumbs(); renderRegionBoxes(); }
  } else {
    showCompare(pinnedIdx);
  }
}

function exitViewerMode(){
  isViewerMode = false;
  document.body.classList.remove('viewer-mode');
  taglineEl.textContent = 'proof dashboard builder';
  renderPlanetClickList();
}

document.getElementById('saveChartBtn').addEventListener('click', () => {
  if (!wheelData && !slots.some(s => s.dataURL)){
    toast('Add a wheel or at least one sky photo before saving.', 'warn');
    return;
  }
  const data = serializeChart();
  const key = (data.title || 'chart').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'chart';
  const charts = getSavedCharts();
  charts[key] = data;
  try {
    setSavedCharts(charts);
    renderSavedList();
    toast(`Saved "${data.title || key}". Reopen it from Saved charts in step 5.`, 'ok');
  } catch(e){
    toast('Could not save: browser storage is full. Try fewer or smaller photos, or export a PNG instead.', 'error', 7000);
  }
});

document.getElementById('enterViewerBtn').addEventListener('click', () => {
  if (!wheelData && !slots.some(s => s.dataURL)){
    toast('Build a chart first: upload a wheel and at least one sky photo.', 'warn');
    return;
  }
  enterViewerMode();
});

document.getElementById('exitViewerBtn').addEventListener('click', exitViewerMode);

