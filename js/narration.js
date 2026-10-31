// Walkthrough video timeline: SFX, narration text, scene drawing.
// ---- Procedural "galactic" transition SFX (Web Audio API — no audio files needed).
// Unlike spoken narration, sounds generated this way CAN be routed into the actual
// recorded video file, so these play in both the silent export and the live preview.
function sfxNoiseBuffer(actx, seconds){
  const size = Math.max(1, Math.floor(actx.sampleRate * seconds));
  const buffer = actx.createBuffer(1, size, actx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0;i<size;i++) data[i] = (Math.random()*2-1) * Math.pow(1 - i/size, 1.6);
  return buffer;
}
function playTransitionSFX(actx, destination){
  if (!actx || !destination) return;
  try {
    const t0 = actx.currentTime;

    // laser zap — quick descending sweep
    const osc = actx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2000, t0);
    osc.frequency.exponentialRampToValueAtTime(180, t0+0.32);
    const oscGain = actx.createGain();
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.20, t0+0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0+0.34);
    osc.connect(oscGain); oscGain.connect(destination);
    osc.start(t0); osc.stop(t0+0.4);

    // star sparkle — a few quick high chimes, staggered
    for (let i=0;i<5;i++){
      const ts = t0 + 0.12 + i*0.055 + Math.random()*0.02;
      const sOsc = actx.createOscillator();
      sOsc.type = 'sine';
      sOsc.frequency.setValueAtTime(1400 + Math.random()*1600, ts);
      const sGain = actx.createGain();
      sGain.gain.setValueAtTime(0.0001, ts);
      sGain.gain.exponentialRampToValueAtTime(0.09, ts+0.01);
      sGain.gain.exponentialRampToValueAtTime(0.0001, ts+0.2);
      sOsc.connect(sGain); sGain.connect(destination);
      sOsc.start(ts); sOsc.stop(ts+0.22);
    }

    // low airy whoosh — filtered noise sweep
    const noise = actx.createBufferSource();
    noise.buffer = sfxNoiseBuffer(actx, 0.5);
    const filter = actx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, t0);
    filter.frequency.exponentialRampToValueAtTime(2200, t0+0.4);
    filter.Q.value = 0.8;
    const noiseGain = actx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.08, t0+0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0+0.45);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(destination);
    noise.start(t0); noise.stop(t0+0.5);
  } catch(e){ /* audio not available — visuals still play */ }
}

const VID_W = 1080, VID_H = 1920;

// ---- ElevenLabs AI narration (real, human-sounding voice — and unlike the browser's
// built-in speechSynthesis, this returns actual audio data we can decode and route into
// the Web Audio graph, which means it CAN be captured into the recorded video file). ----
function getElevenLabsConfig(){
  const apiKey = (document.getElementById('elApiKey')?.value || '').trim();
  if (!apiKey) return null;
  let voiceId = document.getElementById('elVoiceSelect')?.value;
  if (voiceId === 'custom') voiceId = (document.getElementById('elCustomVoiceId')?.value || '').trim();
  if (!voiceId) return null;
  return { apiKey, voiceId };
}
async function fetchElevenLabsAudio(text, apiKey, voiceId){
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      // lower stability + a bit of style = more natural pitch/pace variation instead of
      // a flat, monotone read
      voice_settings: { stability: 0.38, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true }
    })
  });
  if (!resp.ok){
    const errText = await resp.text().catch(() => '');
    throw new Error(`ElevenLabs error ${resp.status}: ${errText.slice(0,200)}`);
  }
  return await resp.arrayBuffer();
}
// Generates and decodes narration for every scene up front — needed so scene durations
// can be set to the AI voice's real spoken length before recording/playback even starts.
async function prefetchNarrationAudio(scenes, audioCtx, elConfig, statusCb){
  if (!elConfig || !audioCtx) return;
  for (let i=0;i<scenes.length;i++){
    const scene = scenes[i];
    const text = scene.text || scene.narration;
    if (!text) continue;
    try {
      if (statusCb) statusCb(`Generating AI voice… ${i+1}/${scenes.length}`);
      const buf = await fetchElevenLabsAudio(text, elConfig.apiKey, elConfig.voiceId);
      const audioBuffer = await audioCtx.decodeAudioData(buf.slice(0));
      scene.audioBuffer = audioBuffer;
      scene.dur = Math.max(scene.dur, Math.round(audioBuffer.duration*1000) + 2000);
    } catch(e){
      console.error(e);
      scene.audioError = e.message;
    }
  }
}
function playSceneAudio(scene, audioCtx, destination){
  if (scene.audioBuffer && audioCtx && destination){
    try {
      const src = audioCtx.createBufferSource();
      src.buffer = scene.audioBuffer;
      src.connect(destination);
      src.start();
      return true;
    } catch(e){ console.error(e); }
  }
  return false;
}

function estimateSpeechMs(text){
  const words = (text||'').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1400, (words / 2.3) * 1000); // ~140 words/min
}

// Personality pools so the narration doesn't repeat the same sentence shape every planet.
// The FACT line states the actual placement (sign + degree only — no arc-minutes, they
// made the AI stumble and aren't needed to make the point).
const NARR_FACT = [
  (l,s,d) => `${l} in ${s}, ${d} degrees.`,
  (l,s,d) => `That's ${l} in ${s}, at ${d} degrees.`,
  (l,s,d) => `${s}, ${d} degrees — that's ${l}.`,
  (l,s,d) => `${l} sits in ${s}, ${d} degrees.`
];
const NARR_COMPARE = [
  `Top's the wheel. Bottom's the real sky, same moment.`,
  `Chart on top, the actual night sky underneath.`,
  `Wheel up top, real sky on the bottom.`,
  `Astrology on top, a real photo of the sky below it.`
];
const NARR_MATCH = [
  `And there it is — they line up.`,
  `Dead on.`,
  `Spot on, right where it should be.`,
  `Same moment — it matches.`,
  `That's not luck. That's real.`,
  `Line 'em up — they match.`
];
// The three "explainer" beats the video needs, inserted as their own short standalone
// scenes (not folded into every planet) so they land as clear, deliberate moments.
const NARR_NOTES = [
  `This is a thirteen-sign astrology wheel — matched exactly against the Skymap astronomy app.`,
  `This astrology wheel is generated from starchart13 dot com.`,
  `When the chart lines up with the real sky like this, that's what real accuracy looks like.`
];

// Pulls "11°26' Sagittarius" style text out of the placement line and returns just the
// sign + whole degree — the arc-minutes number is dropped on purpose (see above).
function parsePlacement(desc){
  // Require the "· 31°59' Sagittarius" shape specifically (bullet, degree, optional
  // minutes, sign) so we can never accidentally pick up a second stray number from
  // anywhere else in a messier line — only the very first degree number is ever used.
  const m = /·\s*([0-9]{1,2})°\s*(?:[0-9]{1,2}'?)?\s*([A-Za-z]+)/.exec(desc || '')
    || /([0-9]{1,2})°\s*(?:[0-9]{1,2}'?)?\s*([A-Za-z]+)/.exec(desc || '');
  if (!m) return null;
  return { degree: m[1], sign: m[2] };
}

function buildNarration(slot, index){
  const raw = getPlanetDescription(slot.label);
  const parsed = parsePlacement(raw);
  const factLine = parsed
    ? NARR_FACT[index % NARR_FACT.length](slot.label, parsed.sign, parsed.degree)
    : `${slot.label}.`;
  const matchLine = NARR_MATCH[index % NARR_MATCH.length];
  // Compare line only every 3rd planet — keeps most planets to two short beats
  // (fact + match) so the video doesn't drag.
  const compareLine = (index % 3 === 0) ? ' ' + NARR_COMPARE[Math.floor(index/3) % NARR_COMPARE.length] : '';
  return `${factLine}${compareLine} ${matchLine}`;
}

// Builds the shared scene timeline used by BOTH the silent recorded export and the
// live voice preview, so the two always look and pace identically. Kept snappy on
// purpose — nobody watches a slow social video all the way through.
function buildScenes(ready, chartTitle){
  const scenes = [];
  // Opening scene shows the actual rendered wheel right away instead of burning the
  // first seconds on plain text — the wheel + title + brand all appear together.
  const introText = `This is ${chartTitle}, generated with starchart13 dot com — every planet, checked against the real sky.`;
  scenes.push({ type:'title', text: introText, dur: Math.max(2600, estimateSpeechMs(introText)+500), chartTitle });

  // Sprinkle the three explainer notes at roughly the quarter, half, and three-quarter
  // marks — each one carries the nearest planet's images along so it's not just bare text.
  const noteIdxs = [...new Set([
    Math.floor(ready.length/4),
    Math.floor(ready.length/2),
    Math.floor(ready.length*3/4)
  ])].filter(i => i > 0 && i < ready.length);

  ready.forEach((slot, i) => {
    const narration = buildNarration(slot, i);
    scenes.push({ type:'planet', slot, narration, dur: Math.max(4400, estimateSpeechMs(narration)+500) });
    const noteAt = noteIdxs.indexOf(i);
    if (noteAt !== -1){
      const t = NARR_NOTES[noteAt % NARR_NOTES.length];
      scenes.push({ type:'note', text: t, nearSlot: slot, dur: Math.max(2600, estimateSpeechMs(t)+400) });
    }
  });

  const outroText = 'This is 13-sign, 13-house astrology — matched with real astronomy proof.';
  scenes.push({ type:'outro', text: outroText, dur: Math.max(2200, estimateSpeechMs(outroText)+400) });
  return scenes;
}

// Fixed starfield (generated once) so the background twinkles instead of sitting flat —
// the "cyberpunk / starry background" ask.
const STAR_FIELD = Array.from({length:150}, () => ({
  x: Math.random(), y: Math.random(), r: 0.6+Math.random()*1.7,
  phase: Math.random()*Math.PI*2, speed: 0.0018+Math.random()*0.0022
}));

function drawSceneBg(ctx){
  ctx.fillStyle = '#050014'; ctx.fillRect(0,0,VID_W,VID_H);
  const now = performance.now();
  STAR_FIELD.forEach(s => {
    const tw = 0.3 + 0.7*Math.abs(Math.sin(now*s.speed + s.phase));
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#eafcff';
    ctx.beginPath(); ctx.arc(s.x*VID_W, s.y*VID_H, s.r, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.strokeStyle='rgba(167,66,255,0.10)'; ctx.lineWidth=1;
  for(let x=0;x<VID_W;x+=54){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,VID_H); ctx.stroke(); }
  for(let y=0;y<VID_H;y+=54){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(VID_W,y); ctx.stroke(); }
  ctx.restore();
}
function drawBrandTag(ctx){
  ctx.textAlign='center';
  ctx.save();
  ctx.shadowColor='#ff2ee6'; ctx.shadowBlur=16;
  ctx.fillStyle='#ff2ee6'; ctx.font='700 28px "JetBrains Mono", monospace';
  // Sits well clear of the bottom edge on purpose — TikTok/Instagram overlay their own
  // caption/button UI across roughly the bottom 12-15% of a vertical video, so anything
  // placed right at the very edge (as this used to be) is invisible in practice.
  ctx.fillText('✦ starchart13.com', VID_W/2, VID_H-130);
  ctx.restore();
  ctx.textAlign='left';
}
// "Plasma" glow box — border hue slowly cycles through the rainbow instead of sitting
// on one fixed neon color, for the cyberpunk/plasma look.
function drawGlowBox(ctx,x,y,w,h,elapsed,hueOffset=0){
  const hue = ((elapsed/16) + hueOffset) % 360;
  const color = `hsl(${hue}, 100%, 62%)`;
  ctx.save(); ctx.shadowColor=color; ctx.shadowBlur=40; ctx.strokeStyle=color; ctx.lineWidth=5;
  roundRectPathV(ctx,x,y,w,h,22); ctx.stroke(); ctx.restore();
}
// Shared pulsing-arrow marker: a glowing dot sits exactly on the real point, with a
// chevron/shaft above it. Sized big and bold on purpose — this has to read clearly on
// a phone screen at video scale, not just in the editor.
function drawPulseArrow(ctx, x, y, pulse, color){
  ctx.save(); ctx.translate(x,y); ctx.scale(pulse,pulse);
  ctx.shadowColor=color; ctx.shadowBlur=42;
  ctx.fillStyle=color; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=color; ctx.lineWidth=11; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(0,-92); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-26,-56); ctx.lineTo(0,-92); ctx.lineTo(26,-56); ctx.stroke();
  ctx.restore();
}
function wrapTextC(ctx, text, cx, cy, maxWidth, lineHeight){
  const words = text.split(' '); let lines=[], cur='';
  words.forEach(w=>{
    const test = cur? cur+' '+w : w;
    if (ctx.measureText(test).width > maxWidth && cur){ lines.push(cur); cur=w; } else cur=test;
  });
  if (cur) lines.push(cur);
  const totalH = lines.length*lineHeight;
  lines.forEach((line,i)=> ctx.fillText(line, cx, cy - totalH/2 + i*lineHeight + lineHeight/2));
}

// Opening scene: the actual rendered wheel front and center immediately (not wasted
// on plain text), with the title + brand overlaid around it.
function drawTitleScene(ctx, scene, elapsed){
  drawSceneBg(ctx); ctx.textAlign='center';
  ctx.fillStyle='#00f6ff'; ctx.font='700 13px "JetBrains Mono", monospace';
  ctx.fillText('SKY-VERIFICATION WALKTHROUGH', VID_W/2, 160);
  ctx.fillStyle='#eafcff'; ctx.font='800 44px "Orbitron", sans-serif';
  wrapTextC(ctx, scene.chartTitle, VID_W/2, 250, VID_W-140, 52);

  const boxW = VID_W*0.84, boxH = VID_H*0.58;
  const boxX = (VID_W-boxW)/2, boxY = 330;
  if (wheelData){
    const nw = wheelData.naturalW, nh = wheelData.naturalH;
    const scale = Math.min(boxW/nw, boxH/nh), dw = nw*scale, dh = nh*scale;
    ctx.save(); roundRectPathV(ctx,boxX,boxY,boxW,boxH,24); ctx.clip();
    ctx.fillStyle='#0b0322'; ctx.fillRect(boxX,boxY,boxW,boxH);
    ctx.drawImage(wheelData.img, boxX+(boxW-dw)/2, boxY+(boxH-dh)/2, dw, dh);
    ctx.restore();
  }
  drawGlowBox(ctx, boxX, boxY, boxW, boxH, elapsed);

  ctx.fillStyle='#f9f002'; ctx.font='500 20px "JetBrains Mono", monospace';
  wrapTextC(ctx, 'every planet, checked against the real sky', VID_W/2, boxY+boxH+50, VID_W-180, 30);
  ctx.textAlign='left'; drawBrandTag(ctx);
}

// Explainer beat — full wheel image on top, a representative sky screenshot on the
// bottom (from whichever planet the note landed near), with the text sitting in a
// translucent panel over the gap between them, instead of wasting the space on plain text.
function drawNoteScene(ctx, scene, elapsed){
  drawSceneBg(ctx);
  const boxW = VID_W*0.86;
  const topY = 170, gap = 280;
  const boxH = (VID_H - topY - gap - 160) / 2;
  const topX = (VID_W-boxW)/2;
  const bottomY = topY + boxH + gap;

  if (wheelData){
    const nw = wheelData.naturalW, nh = wheelData.naturalH;
    const scale = Math.min(boxW/nw, boxH/nh), dw = nw*scale, dh = nh*scale;
    ctx.save(); roundRectPathV(ctx,topX,topY,boxW,boxH,20); ctx.clip();
    ctx.fillStyle='#0b0322'; ctx.fillRect(topX,topY,boxW,boxH);
    ctx.drawImage(wheelData.img, topX+(boxW-dw)/2, topY+(boxH-dh)/2, dw, dh);
    ctx.restore();
  }
  drawGlowBox(ctx, topX, topY, boxW, boxH, elapsed);

  const img = scene.nearSlot && scene.nearSlot.img;
  if (img){
    const scale = Math.max(boxW/img.width, boxH/img.height);
    const iw = img.width*scale, ih = img.height*scale;
    ctx.save(); roundRectPathV(ctx,topX,bottomY,boxW,boxH,20); ctx.clip();
    ctx.fillStyle='#0b0322'; ctx.fillRect(topX,bottomY,boxW,boxH);
    ctx.drawImage(img, topX+(boxW-iw)/2, bottomY+(boxH-ih)/2, iw, ih);
    ctx.restore();
  }
  drawGlowBox(ctx, topX, bottomY, boxW, boxH, elapsed, 180);

  const midY = topY + boxH + gap/2;
  ctx.save();
  ctx.fillStyle = 'rgba(5,0,20,0.6)';
  roundRectPathV(ctx, topX, midY-gap/2+10, boxW, gap-20, 16);
  ctx.fill();
  ctx.restore();
  ctx.textAlign='center';
  ctx.fillStyle='#eafcff'; ctx.font='700 30px "Orbitron", sans-serif';
  wrapTextC(ctx, scene.text, VID_W/2, midY, boxW-90, 40);
  ctx.textAlign='left'; drawBrandTag(ctx);
}

// STACKED layout: wheel-zoom box on top, sky-proof box on bottom, planet name + captions
// between them so both images are visible together the whole time. Both boxes now get
// a synced glowing/pulsing arrow pinned to the actual planet — one on the wheel crop,
// one on the sky photo — so the visual match reads clearly.
function drawPlanetScene(ctx, scene, elapsed){
  const slot = scene.slot;
  drawSceneBg(ctx);
  const boxW = VID_W*0.86;
  const topY = 210, gap = 150;
  const boxH = (VID_H - topY - gap - 190) / 2;
  const topX = (VID_W-boxW)/2;
  const bottomY = topY + boxH + gap;
  const pulse = 0.7 + 0.35*Math.sin(elapsed/210);

  // TOP: wheel crop, with a synced pulsing arrow at the user-pinned glyph point
  // (falls back to crop-center only if they never tapped to pin it)
  let wheelCenterX = topX + boxW/2, wheelCenterY = topY + boxH/2;
  if (slot.region && wheelData){
    const nw = wheelData.naturalW, nh = wheelData.naturalH;
    const cropX = slot.region.x*nw, cropY = slot.region.y*nh;
    const cropW = Math.max(1,slot.region.w*nw), cropH = Math.max(1,slot.region.h*nh);
    const scale = Math.min(boxW/cropW, boxH/cropH), dw = cropW*scale, dh = cropH*scale;
    const offX = topX+(boxW-dw)/2, offY = topY+(boxH-dh)/2;
    ctx.save(); roundRectPathV(ctx,topX,topY,boxW,boxH,20); ctx.clip();
    ctx.fillStyle='#0b0322'; ctx.fillRect(topX,topY,boxW,boxH);
    ctx.drawImage(wheelData.img, cropX,cropY,cropW,cropH, offX, offY, dw, dh);
    ctx.restore();
    const wp = slot.wheelPoint;
    wheelCenterX = wp ? offX + wp.x*dw : offX + dw/2;
    wheelCenterY = wp ? offY + wp.y*dh : offY + dh/2;
  }
  drawGlowBox(ctx, topX, topY, boxW, boxH, elapsed);
  drawPulseArrow(ctx, wheelCenterX, wheelCenterY, pulse, slot.wheelLocked ? '#39ff8f' : '#00f6ff');
  ctx.textAlign='center';
  ctx.fillStyle='#a742ff'; ctx.font='600 18px "JetBrains Mono", monospace';
  ctx.fillText('ON THE CHART WHEEL — where astrology places it', VID_W/2, topY-14);

  // Planet name, centered in the gap between the two boxes
  const midY = topY + boxH + gap/2;
  ctx.fillStyle='#eafcff'; ctx.font='800 60px "Orbitron", sans-serif';
  ctx.fillText(slot.label, VID_W/2, midY - 6);

  // BOTTOM: sky-proof photo + synced pulsing arrow, tight to the actual saved point
  const img = slot.img;
  if (img){
    const scale = Math.max(boxW/img.width, boxH/img.height);
    const iw = img.width*scale, ih = img.height*scale;
    ctx.save(); roundRectPathV(ctx,topX,bottomY,boxW,boxH,20); ctx.clip();
    ctx.fillStyle='#0b0322'; ctx.fillRect(topX,bottomY,boxW,boxH);
    ctx.drawImage(img, topX+(boxW-iw)/2, bottomY+(boxH-ih)/2, iw, ih);
    ctx.restore();
  }
  drawGlowBox(ctx, topX, bottomY, boxW, boxH, elapsed, 180);
  ctx.fillStyle='#00f6ff'; ctx.font='600 18px "JetBrains Mono", monospace';
  ctx.fillText('IN THE REAL SKY — a real photo, same moment', VID_W/2, bottomY + boxH + 34);

  const pp = slot.proofPoint || {x:0.5,y:0.42};
  const ax = topX + pp.x*boxW, ay = bottomY + pp.y*boxH;
  drawPulseArrow(ctx, ax, ay, pulse, slot.locked ? '#39ff8f' : '#ff2ee6');

  // "match" confirmation caption timed to roughly when the narration actually lands
  // on the payoff line, instead of a fixed delay that drifts out of sync with the voice
  if (elapsed > scene.dur * 0.55){
    ctx.fillStyle='#39ff8f'; ctx.font='700 24px "JetBrains Mono", monospace';
    ctx.fillText('✓ SEE HOW THEY MATCH', VID_W/2, midY + 44);
  }
  ctx.textAlign='left'; drawBrandTag(ctx);
}

function drawOutroScene(ctx, scene){
  drawSceneBg(ctx); ctx.textAlign='center';
  ctx.fillStyle='#eafcff'; ctx.font='700 36px "Orbitron", sans-serif';
  wrapTextC(ctx, '13-sign, 13-house astrology —', VID_W/2, VID_H/2-40, VID_W-120, 46);
  ctx.fillStyle='#39ff8f'; ctx.font='800 40px "Orbitron", sans-serif';
  wrapTextC(ctx, 'matched with real astronomy proof.', VID_W/2, VID_H/2+40, VID_W-100, 48);
  ctx.textAlign='left';
  drawBrandTag(ctx);
}

function drawScene(ctx, scene, elapsed){
  if (scene.type === 'title') drawTitleScene(ctx, scene, elapsed);
  else if (scene.type === 'note') drawNoteScene(ctx, scene, elapsed);
  else if (scene.type === 'planet') drawPlanetScene(ctx, scene, elapsed);
  else if (scene.type === 'outro') drawOutroScene(ctx, scene);
}

function fadeOverlay(ctx, elapsed, dur, fade){
  let a = 1;
  if (elapsed < fade) a = elapsed/fade;
  else if (elapsed > dur-fade) a = Math.max(0,(dur-elapsed)/fade);
  if (a < 1){
    ctx.save(); ctx.globalAlpha = 1-a; ctx.fillStyle='#050014'; ctx.fillRect(0,0,VID_W,VID_H); ctx.restore();
  }
}

// Drives the shared timeline against any ctx. onSceneStart(scene) fires once per scene
// (used to trigger speech in the live preview — recording ignores it).
async function runTimeline(ctx, scenes, { onSceneStart, onProgress, fade = 200 } = {}){
  const totalDur = scenes.reduce((a,s)=>a+s.dur,0);
  let elapsedTotal = 0, sceneIdx = -1, sceneStart = performance.now();
  await new Promise(resolve => {
    function loop(now){
      const scene = scenes[Math.max(sceneIdx,0)];
      if (sceneIdx === -1 || (now - sceneStart) >= scene.dur){
        if (sceneIdx >= 0) elapsedTotal += scenes[sceneIdx].dur;
        sceneIdx++;
        sceneStart = now;
        if (sceneIdx >= scenes.length){ resolve(); return; }
        if (onSceneStart) onSceneStart(scenes[sceneIdx]);
      }
      const scene2 = scenes[sceneIdx];
      const elapsed = now - sceneStart;
      drawScene(ctx, scene2, elapsed);
      fadeOverlay(ctx, elapsed, scene2.dur, fade);
      if (onProgress) onProgress(Math.min(100, Math.round(((elapsedTotal+elapsed)/totalDur)*100)));
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
}

