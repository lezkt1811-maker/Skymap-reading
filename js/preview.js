// Live preview, browser voices, and ElevenLabs AI voice controls.
// ---- Live voice preview: plays the walkthrough on screen with narration and sound ----
const previewOverlay = document.getElementById('previewOverlay');
const previewCanvas = document.getElementById('previewCanvas');
const previewStartCard = document.getElementById('previewStartCard');
const previewStatus = document.getElementById('previewStatus');
const voiceSelect = document.getElementById('voiceSelect');
const testVoiceBtn = document.getElementById('testVoiceBtn');
let previewRunning = false;
let previewAudioCtx = null;
let selectedVoice = null;

function loadVoicesAsync(){
  return new Promise(resolve => {
    let voices = speechSynthesis.getVoices();
    if (voices.length){ resolve(voices); return; }
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1000);
  });
}

async function populateVoiceSelect(){
  const voices = (await loadVoicesAsync()).filter(v => /en/i.test(v.lang || ''));
  const list = voices.length ? voices : speechSynthesis.getVoices();
  voiceSelect.innerHTML = '';
  if (!list.length){
    voiceSelect.innerHTML = '<option value="">No voices found on this device</option>';
    return;
  }
  // Male-sounding voices first (best guess from name), so the calm-male ask is easy to find —
  // but every voice on the device is listed, since actual availability/quality varies by phone.
  const scored = list.map(v => {
    const n = v.name.toLowerCase();
    const maleHint = /male|david|daniel|fred|alex|mark|tom|guy|ryan|arthur|thomas|james|paul/.test(n) && !/female/.test(n);
    return { v, maleHint };
  }).sort((a,b) => (b.maleHint - a.maleHint));
  scored.forEach(({v}) => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });
  selectedVoice = scored[0].v;
  voiceSelect.value = selectedVoice.voiceURI;
}

voiceSelect.addEventListener('change', () => {
  const v = speechSynthesis.getVoices().find(v => v.voiceURI === voiceSelect.value);
  if (v) selectedVoice = v;
});

function speakLine(text){
  if (!text) return;
  try {
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utter.voice = selectedVoice;
    // Slightly slower + slightly lower pitch reads as calmer and less "announcer-y"
    // on most TTS engines, regardless of which specific voice is picked.
    utter.rate = 0.93;
    utter.pitch = 0.9;
    speechSynthesis.speak(utter);
  } catch(e){ /* speech not available — visuals still play */ }
}

testVoiceBtn.addEventListener('click', () => {
  speakLine("Hey — this is what this voice sounds like. If it's calm and clear, you're good to go.");
});

// Sidebar AI-voice (ElevenLabs) controls: toggle the custom-ID field, and a test button
// that generates one short line so the person can check the voice before committing to
// a full render (each test costs a small amount of their ElevenLabs quota).
const elVoiceSelectField = document.getElementById('elVoiceSelect');
const elCustomVoiceIdField = document.getElementById('elCustomVoiceId');
const elCustomVoiceIdWrap = document.getElementById('elCustomVoiceIdWrap');
const elApiKeyField = document.getElementById('elApiKey');

// Remember the API key / voice choice on THIS device only (localStorage never leaves the
// browser and is separate from the committed site code), so it doesn't need retyping.
const EL_STORAGE_KEY = 'starchart13_el_key';
const EL_STORAGE_VOICE = 'starchart13_el_voice';
const EL_STORAGE_CUSTOM = 'starchart13_el_custom_voice';
try {
  const savedKey = localStorage.getItem(EL_STORAGE_KEY);
  const savedVoice = localStorage.getItem(EL_STORAGE_VOICE);
  const savedCustom = localStorage.getItem(EL_STORAGE_CUSTOM);
  if (savedKey) elApiKeyField.value = savedKey;
  if (savedVoice && elVoiceSelectField) elVoiceSelectField.value = savedVoice;
  if (savedCustom) elCustomVoiceIdField.value = savedCustom;
  if (elVoiceSelectField) elCustomVoiceIdWrap.hidden = elVoiceSelectField.value !== 'custom';
} catch(e){ /* localStorage unavailable — key just won't persist */ }

elApiKeyField.addEventListener('input', () => {
  try { localStorage.setItem(EL_STORAGE_KEY, elApiKeyField.value.trim()); } catch(e){}
});
if (elVoiceSelectField){
  elVoiceSelectField.addEventListener('change', () => {
    elCustomVoiceIdWrap.hidden = elVoiceSelectField.value !== 'custom';
    try { localStorage.setItem(EL_STORAGE_VOICE, elVoiceSelectField.value); } catch(e){}
  });
}
elCustomVoiceIdField.addEventListener('input', () => {
  try { localStorage.setItem(EL_STORAGE_CUSTOM, elCustomVoiceIdField.value.trim()); } catch(e){}
});
// Fallback explicit Paste button — some mobile browsers suppress the native long-press
// paste bubble on small inputs, so this reads the clipboard directly on tap instead.
document.getElementById('pasteVoiceIdBtn')?.addEventListener('click', async () => {
  const elStatus = document.getElementById('elStatus');
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.trim()){
      elCustomVoiceIdField.value = text.trim();
      elCustomVoiceIdField.dispatchEvent(new Event('input'));
      elStatus.textContent = 'Pasted.';
    } else {
      elStatus.textContent = 'Clipboard was empty — copy the voice ID first, then tap Paste.';
    }
  } catch(e){
    elStatus.textContent = 'Couldn\'t read clipboard automatically — tap the box above and paste manually, or type the ID in.';
  }
});
document.getElementById('forgetElKey')?.addEventListener('click', (e) => {
  e.preventDefault();
  elApiKeyField.value = '';
  try {
    localStorage.removeItem(EL_STORAGE_KEY);
    localStorage.removeItem(EL_STORAGE_VOICE);
    localStorage.removeItem(EL_STORAGE_CUSTOM);
  } catch(err){}
  document.getElementById('elStatus').textContent = 'Forgotten.';
});

const testElBtn = document.getElementById('testElBtn');
if (testElBtn){
  testElBtn.addEventListener('click', async () => {
    const elStatus = document.getElementById('elStatus');
    const elConfig = getElevenLabsConfig();
    if (!elConfig){
      elStatus.textContent = 'Enter an API key (and voice ID if using "Custom") first.';
      return;
    }
    testElBtn.disabled = true;
    elStatus.textContent = 'Generating…';
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const actx = new AC();
      const buf = await fetchElevenLabsAudio("Hey — this is what this voice sounds like. Calm and clear, right?", elConfig.apiKey, elConfig.voiceId);
      const audioBuffer = await actx.decodeAudioData(buf.slice(0));
      const src = actx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(actx.destination);
      src.start();
      elStatus.textContent = 'Playing…';
      src.onended = () => { elStatus.textContent = ''; };
    } catch(e){
      console.error(e);
      elStatus.textContent = 'Failed — check your API key and voice ID. ' + e.message;
    } finally {
      testElBtn.disabled = false;
    }
  });
}

document.getElementById('previewVoiceBtn').addEventListener('click', async () => {
  const ready = slots.filter(s => s.region && s.dataURL && s.img);
  if (!wheelData || !ready.length){
    toast('To preview, upload the wheel and at least one sky photo, then press "Draw box on wheel" for that planet.', 'warn', 6000);
    return;
  }
  if (!previewAudioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) previewAudioCtx = new AC();
  }
  previewOverlay.classList.add('show');
  previewStartCard.hidden = false;
  previewStatus.textContent = 'ready';
  const usingAI = !!getElevenLabsConfig();
  document.getElementById('fallbackVoiceRow').hidden = usingAI;
  document.getElementById('previewIntroText').textContent = usingAI
    ? 'This plays the walkthrough right here, using the AI voice key you entered under Advanced.'
    : 'No AI key entered, so this preview uses your device\'s built-in voice. Pick one below and test it, or add an ElevenLabs key under Advanced for a more natural voice.';
  if (!usingAI && typeof speechSynthesis !== 'undefined') populateVoiceSelect();
});

document.getElementById('previewCloseBtn').addEventListener('click', () => {
  try { speechSynthesis.cancel(); } catch(e){}
  previewRunning = false;
  previewOverlay.classList.remove('show');
});

async function playPreviewTimeline(){
  const ready = slots.filter(s => s.region && s.dataURL && s.img);
  if (!ready.length) return;
  previewStartCard.hidden = true;
  previewRunning = true;
  previewCanvas.width = VID_W; previewCanvas.height = VID_H;
  const ctx = previewCanvas.getContext('2d');
  const chartTitle = document.getElementById('chartTitle').value || 'My birth chart';
  const scenes = buildScenes(ready, chartTitle);
  const elConfig = getElevenLabsConfig();

  try { speechSynthesis.cancel(); } catch(e){}

  if (elConfig && previewAudioCtx){
    await prefetchNarrationAudio(scenes, previewAudioCtx, elConfig, msg => { previewStatus.textContent = msg; });
  }

  await runTimeline(ctx, scenes, {
    onSceneStart: scene => {
      if (!previewRunning) return;
      if (previewAudioCtx) playTransitionSFX(previewAudioCtx, previewAudioCtx.destination);
      const playedAI = elConfig && previewAudioCtx ? playSceneAudio(scene, previewAudioCtx, previewAudioCtx.destination) : false;
      if (!playedAI) speakLine(scene.text || scene.narration);
    },
    onProgress: pct => { if (previewRunning) previewStatus.textContent = `playing… ${pct}%`; }
  });

  if (previewRunning){
    previewStatus.textContent = 'done';
    previewStartCard.innerHTML = `<div class="preview-done">✓ Finished</div><p>Looks and sounds right? Close the preview to go back, then export your PNG in step 5.</p><button id="previewReplayBtn" class="primary-btn" type="button">↻ Play again</button>`;
    previewStartCard.hidden = false;
    document.getElementById('previewReplayBtn').addEventListener('click', playPreviewTimeline);
  }
}

document.getElementById('previewPlayBtn').addEventListener('click', playPreviewTimeline);

renderThumbs();
renderPlanetClickList();
