// Escapes text before it is placed into innerHTML (chart titles and planet names are user input).
function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
}

// Shared UI helpers: toast messages (replace alert()) and the step tracker that
// drives the step badges in the sidebar and the "what to do next" banner.

function toast(message, kind = 'info', ms = 4500){
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast' + (kind === 'info' ? '' : ' ' + kind);
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, ms);
}

// Works out which steps are finished from the current state, updates the badges,
// and writes the single instruction the user should follow next.
function refreshSteps(){
  const withShot = slots.filter(s => s.dataURL);
  const boxed = withShot.filter(s => s.region);
  const ready = slots.filter(s => s.region && s.dataURL);
  const pinned = ready.filter(s => s.proofPoint && s.wheelPoint);
  const hasList = (planetListEl.value || '').split('\n').some(l => l.trim());

  const steps = [
    { done: !!wheelData, label: wheelData ? '✓ done' : 'to do' },
    { done: hasList, label: hasList ? '✓ done' : 'to do' },
    {
      done: withShot.length > 0 && boxed.length === withShot.length,
      label: withShot.length ? `${boxed.length}/${withShot.length} boxes` : 'no photos yet'
    },
    {
      done: ready.length > 0 && pinned.length === ready.length,
      label: ready.length ? `${pinned.length}/${ready.length} pinned` : 'nothing to pin yet'
    }
  ];
  const nextIdx = steps.findIndex(s => !s.done);

  steps.forEach((s, i) => {
    const el = document.getElementById(`step${i + 1}`);
    if (!el) return;
    const isNext = i === nextIdx;
    el.classList.toggle('is-done', s.done);
    el.classList.toggle('is-next', isNext);
    const badge = el.querySelector('[data-step-status]');
    if (badge){
      badge.textContent = s.label;
      badge.className = 'step-status' + (s.done ? ' is-done' : (isNext ? ' is-next' : ''));
    }
  });

  const banner = document.getElementById('nextStep');
  if (!banner) return;
  let text;
  if (nextIdx === -1){
    text = 'All planets are matched. Step 5: export the PNG or open the interactive view to share.';
  } else if (nextIdx === 0){
    text = 'Upload your chart wheel image to begin.';
  } else if (nextIdx === 1){
    text = 'Enter the planet list: type it, paste it, or upload a screenshot of it.';
  } else if (nextIdx === 2){
    const unboxed = withShot.find(s => !s.region);
    text = !withShot.length
      ? 'Upload a sky photo for the first planet (step 3).'
      : `Press "Draw box on wheel" for ${unboxed.label || 'the next planet'}, then drag a box around its symbol (step 3).`;
  } else {
    const unpinned = ready.find(s => !(s.proofPoint && s.wheelPoint));
    text = `Click ${unpinned ? unpinned.label : 'a planet'} and drag its arrows onto the planet, then press Lock (step 4).`;
  }
  banner.hidden = isViewerMode;
  banner.className = 'next-step' + (nextIdx === -1 ? ' is-done' : '');
  banner.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = nextIdx === -1 ? 'DONE' : 'NEXT';
  banner.appendChild(strong);
  banner.appendChild(document.createTextNode(text));
}

// Text size for the sidebar (normal / large / extra large). The choice is remembered
// on this device; if storage is blocked the setting still works for the session.
const TEXT_SIZES = ['normal', 'large', 'xlarge'];
function setTextSize(size){
  if (!TEXT_SIZES.includes(size)) size = 'normal';
  document.documentElement.dataset.textSize = size;
  document.querySelectorAll('.size-control button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.size === size));
  });
  try { localStorage.setItem('starchart13-text-size', size); } catch (e) { /* storage blocked */ }
}
document.querySelectorAll('.size-control button').forEach(btn => {
  btn.addEventListener('click', () => setTextSize(btn.dataset.size));
});
let savedTextSize = 'normal';
try { savedTextSize = localStorage.getItem('starchart13-text-size') || 'normal'; } catch (e) { /* storage blocked */ }
setTextSize(savedTextSize);
