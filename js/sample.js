// Sample chart: draws a stand-in wheel and four sky photos so a new user can
// practise every step before using their own images.

const SAMPLE_SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
// angle = degrees clockwise from the top of the wheel (Aries at 0°, 30° per sign)
const SAMPLE_PLANETS = [
  { label: 'Sun',   angle: 250, color: '#f9f002', sky: [0.30, 0.34], text: "Sun · 10°00' Sagittarius" },
  { label: 'Moon',  angle: 40,  color: '#00f6ff', sky: [0.68, 0.22], text: "Moon · 10°00' Taurus" },
  { label: 'Mars',  angle: 155, color: '#ff4d6d', sky: [0.52, 0.60], text: "Mars · 05°00' Virgo" },
  { label: 'Venus', angle: 310, color: '#39ff8f', sky: [0.20, 0.72], text: "Venus · 10°00' Aquarius" }
];

// Small seeded random generator so the sample looks the same every time.
function sampleRandom(seed){
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

function drawSampleWheel(){
  const size = 1200, c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b0322'; ctx.fillRect(0, 0, size, size);
  const pt = (r, deg) => {
    const a = deg * Math.PI / 180;
    return { x: c + r * Math.sin(a), y: c - r * Math.cos(a) };
  };

  // Ring and sign dividers
  ctx.strokeStyle = '#3a1a66'; ctx.lineWidth = 4;
  [560, 400].forEach(r => { ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke(); });
  for (let i = 0; i < 12; i++){
    const a = pt(400, i * 30), b = pt(560, i * 30);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // Sign names (neutral grey, so they are not mistaken for planet colours)
  ctx.fillStyle = '#c8c8c8'; ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  SAMPLE_SIGNS.forEach((name, i) => {
    const p = pt(525, i * 30 + 15);
    ctx.fillText(name, p.x, p.y);
  });

  // Planet markers: a short leader line plus a coloured glyph
  SAMPLE_PLANETS.forEach(p => {
    const inner = pt(400, p.angle), glyph = pt(470, p.angle);
    ctx.strokeStyle = p.color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(inner.x, inner.y); ctx.lineTo(glyph.x, glyph.y); ctx.stroke();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(glyph.x, glyph.y, 16, 0, Math.PI * 2); ctx.fill();
  });
  return canvas.toDataURL('image/png');
}

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
  // The planet itself, with a soft glow
  const x = planet.sky[0] * w, y = planet.sky[1] * h;
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
    wheelDataURL: drawSampleWheel(),
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
