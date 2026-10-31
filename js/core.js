// Core state: DOM references, planet slots, and the planet-list OCR reader.
const planetOcrDrop = document.getElementById('planetOcrDrop');
const planetOcrInput = document.getElementById('planetOcrInput');
const ocrStatus = document.getElementById('ocrStatus');
const planetListEl = document.getElementById('planetList');
planetListEl.addEventListener('input', () => refreshSteps());

planetOcrDrop.addEventListener('click', () => {
  if (planetOcrDrop.classList.contains('busy')) return;
  planetOcrInput.click();
});

planetOcrInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    const dataURL = ev.target.result;
    planetOcrDrop.classList.remove('filled');
    planetOcrDrop.classList.add('busy');
    planetOcrDrop.textContent = '🔎 Reading image…';
    ocrStatus.textContent = 'Running OCR in your browser — this can take 10–30s on a full table screenshot.';
    try {
      const result = await Tesseract.recognize(dataURL, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            ocrStatus.textContent = `Reading… ${Math.round((m.progress||0)*100)}%`;
          }
        }
      });
      const cleaned = result.data.text
        .split('\n')
        .map(l => l.replace(/\s+/g,' ').trim())
        .filter(l => l.length > 1)
        .join('\n');
      planetListEl.value = cleaned ? (planetListEl.value ? planetListEl.value + '\n' + cleaned : cleaned) : planetListEl.value;
      refreshSteps();
      planetOcrDrop.classList.remove('busy');
      planetOcrDrop.classList.add('filled');
      planetOcrDrop.textContent = '✓ Text extracted — check & edit below';
      ocrStatus.textContent = 'Done. OCR on table screenshots is imperfect — review the list below and fix anything misread.';
    } catch (err) {
      planetOcrDrop.classList.remove('busy');
      planetOcrDrop.textContent = '📷 Upload a screenshot of the list';
      ocrStatus.textContent = 'OCR failed to read that image — try a clearer, more cropped screenshot, or type the list manually.';
    }
  };
  reader.readAsDataURL(file);
});

const wheelDropEl = document.getElementById('wheelDrop');
const wheelInputEl = document.getElementById('wheelInput');
const wheelEmpty = document.getElementById('wheelEmpty');
const wheelImgEl = document.getElementById('wheelImgEl');
const wheelOverlay = document.getElementById('wheelOverlay');
const wheelFrame = document.getElementById('wheelFrame');
const modeBanner = document.getElementById('modeBanner');
const modeLabel = document.getElementById('modeLabel');
const proofListEl = document.getElementById('proofList');
const thumbGrid = document.getElementById('thumbGrid');
const compareEmpty = document.getElementById('compareEmpty');
const compareActive = document.getElementById('compareActive');
const zoomWheel = document.getElementById('zoomWheel');
const zoomWheelCanvas = document.getElementById('zoomWheelCanvas');
const zoomWheelGlow = document.getElementById('zoomWheelGlow');
const zoomWheelHint = document.getElementById('zoomWheelHint');
const zoomWheelLabel = document.getElementById('zoomWheelLabel');
const zoomProof = document.getElementById('zoomProof');
const zoomProofCanvas = document.getElementById('zoomProofCanvas');
const zoomProofLabel = document.getElementById('zoomProofLabel');
const proofArrow = document.getElementById('proofArrow');
const proofArrowLabel = document.getElementById('proofArrowLabel');
const wheelArrow = document.getElementById('wheelArrow');
const wheelArrowLabel = document.getElementById('wheelArrowLabel');
const compareProofLabel = document.getElementById('compareProofLabel');
const planetClickList = document.getElementById('planetClickList');
const viewerTitleEl = document.getElementById('viewerTitle');
const taglineEl = document.getElementById('taglineEl');
const savedListEl = document.getElementById('savedList');

let wheelData = null; // {dataURL, img, naturalW, naturalH}
const DEFAULT_PLANET_NAMES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const slots = DEFAULT_PLANET_NAMES.map(name => ({ label: name, dataURL:null, img:null, region:null, proofPoint:null, wheelPoint:null, locked:false, wheelLocked:false }));
let assigningIdx = null;
let pinnedIdx = null;
let dragStart = null;
let isViewerMode = false;

