// Practice chart built from a real chart wheel screenshot and a planet table.
// The sky photos are generated stand-ins, because no real sky photos were supplied.
// Practise on this: draw a box around each planet on the wheel, then point the arrows.

// Planet list transcribed from the sample planet table. Sun and Venus are left out
// because their degree readings in that screenshot are outside a sign (0–29°).
const SAMPLE_PLANETS = [
  { label: 'Moon',    text: "Moon · 1°07' Gemini",         color: '#00f6ff' },
  { label: 'Mercury', text: "Mercury · 10°04' Libra",      color: '#c8ff3d' },
  { label: 'Mars',    text: "Mars · 19°25' Cancer",        color: '#ff4d6d' },
  { label: 'Jupiter', text: "Jupiter · 4°47' Leo",         color: '#ffb347' },
  { label: 'Saturn',  text: "Saturn · 17°04' Pisces",      color: '#a742ff' },
  { label: 'Uranus',  text: "Uranus · 11°25' Taurus",      color: '#39ff8f' },
  { label: 'Neptune', text: "Neptune · 9°48' Pisces",      color: '#4d9dff' },
  { label: 'Pluto',   text: "Pluto · 2°47' Capricorn",     color: '#ff2ee6' }
];

// Small seeded random generator so the stand-in sky photos look the same every time.
function sampleRandom(seed){
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

// Generated stand-in sky photo: a dark starfield with the planet marked at a random spot.
function drawSampleSky(planet, index){
  const w = 1080, h = 1440;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#050014'); grad.addColorStop(1, '#1a0840');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  const rand = sampleRandom(1000 + index * 97);
  for (let i = 0; i < 260; i++){
    ctx.globalAlpha = 0.3 + rand() * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(rand() * w, rand() * h, 0.8 + rand() * 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const x = (0.15 + rand() * 0.7) * w, y = (0.15 + rand() * 0.7) * h;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 90);
  glow.addColorStop(0, planet.color); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 90, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = planet.color; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eafcff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('SAMPLE SKY — ' + planet.label.toUpperCase(), 40, h - 50);
  return canvas.toDataURL('image/png');
}

function buildSampleChart(){
  return {
    title: 'Sample chart (practice)',
    planetList: SAMPLE_PLANETS.map(p => p.text).join('\n'),
    wheelDataURL: SAMPLE_WHEEL_DATA_URL,
    slots: SAMPLE_PLANETS.map((p, i) => ({
      label: p.label,
      dataURL: drawSampleSky(p, i),
      region: null,
      proofPoint: null,
      wheelPoint: null,
      wheelLocked: false,
      locked: false
    })),
    savedAt: new Date().toISOString()
  };
}

document.getElementById('loadSampleBtn').addEventListener('click', () => {
  const hasWork = !!wheelData || slots.some(s => s.dataURL);
  if (hasWork && !confirm('Replace your current chart with the sample? Anything you have not saved will be lost.')) return;
  loadChartData(buildSampleChart());
  toast('Sample loaded. Draw a box on the wheel for each planet (step 3), then point the arrows (step 4).', 'ok', 7000);
});
