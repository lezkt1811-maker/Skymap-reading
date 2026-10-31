// Composite PNG export.
document.getElementById('exportBtn').addEventListener('click', () => {
  if (!wheelData && !slots.some(s => s.dataURL)){
    toast('Nothing to export yet. Upload a wheel and at least one sky photo first.', 'warn');
    return;
  }
  const canvas = document.createElement('canvas');
  // Bumped way up across the board — this used to render at a size where the placements
  // list and thumbnail grid were unreadable once actually viewed on a phone.
  const wheelH_forSize = 760, gridCols_forSize = 2, cellH_forSize = 340, gap_forSize = 26;
  const rowsNeeded = Math.ceil(slots.length / gridCols_forSize);
  canvas.width = 2000;
  canvas.height = 190 + wheelH_forSize + 60 + 36 + rowsNeeded*(cellH_forSize+gap_forSize+38) + 90;
  const ctx = canvas.getContext('2d');
  const C = { void:'#050014', line:'#3a1a66', cyan:'#00f6ff', magenta:'#ff2ee6', yellow:'#f9f002', text:'#eafcff', textDim:'#8b8fc4' };

  ctx.fillStyle = C.void; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.textBaseline = 'top';
  ctx.fillStyle = C.magenta; ctx.font = '700 18px "JetBrains Mono"';
  ctx.fillText('SKY-VERIFICATION PROOF DASHBOARD', 60, 56);
  const grad = ctx.createLinearGradient(60,0,1000,0);
  grad.addColorStop(0, C.magenta); grad.addColorStop(0.5, C.cyan); grad.addColorStop(1, C.yellow);
  ctx.fillStyle = grad; ctx.font = '800 54px "Orbitron", sans-serif';
  ctx.fillText(document.getElementById('chartTitle').value || 'Untitled chart', 60, 88);

  const wheelX=60, wheelY=190, wheelW=760, wheelH=760;
  ctx.lineWidth = 2; ctx.strokeStyle = C.line; roundRectPathV(ctx,wheelX,wheelY,wheelW,wheelH,12); ctx.stroke();
  if (wheelData){
    ctx.save(); roundRectPathV(ctx,wheelX,wheelY,wheelW,wheelH,12); ctx.clip();
    const scale = Math.max(wheelW/wheelData.naturalW, wheelH/wheelData.naturalH);
    const iw = wheelData.naturalW*scale, ih = wheelData.naturalH*scale;
    ctx.drawImage(wheelData.img, wheelX+(wheelW-iw)/2, wheelY+(wheelH-ih)/2, iw, ih);
    ctx.restore();
  }

  const listX = wheelX+wheelW+40, listY = wheelY, listW = canvas.width-listX-60;
  ctx.strokeStyle = C.line; roundRectPathV(ctx,listX,listY,listW,wheelH,12); ctx.stroke();
  ctx.fillStyle = C.textDim; ctx.font = '700 16px "JetBrains Mono"';
  ctx.fillText('PLACEMENTS', listX+28, listY+26);
  const lines = (document.getElementById('planetList').value || '').split('\n').filter(l=>l.trim());
  let ly = listY+68; ctx.font = '20px "JetBrains Mono"';
  lines.forEach(line => {
    if (ly > listY + wheelH - 30) return; // don't overflow the box on very long lists
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(listX+28, ly+32); ctx.lineTo(listX+listW-28, ly+32); ctx.stroke();
    ctx.fillStyle = C.text; ctx.fillText(line.trim(), listX+28, ly); ly += 48;
  });

  const gridY = wheelY+wheelH+60, gridCols=2, gap=26;
  const gridW = canvas.width-120, cellW = (gridW-gap*(gridCols-1))/gridCols, cellH = 340;
  ctx.fillStyle = C.textDim; ctx.font = '700 16px "JetBrains Mono"';
  ctx.fillText('SKY-MAP VERIFICATION', 60, gridY-34);
  slots.forEach((slot,i) => {
    const col = i%gridCols, row = Math.floor(i/gridCols);
    const cx = 60+col*(cellW+gap), cy = gridY+row*(cellH+gap+38);
    ctx.lineWidth = 2; ctx.strokeStyle = C.line; roundRectPathV(ctx,cx,cy,cellW,cellH,10); ctx.stroke();
    if (slot.img){
      ctx.save(); roundRectPathV(ctx,cx,cy,cellW,cellH,10); ctx.clip();
      const scale = Math.max(cellW/slot.img.width, cellH/slot.img.height);
      const iw = slot.img.width*scale, ih = slot.img.height*scale;
      ctx.drawImage(slot.img, cx+(cellW-iw)/2, cy+(cellH-ih)/2, iw, ih);
      ctx.restore();
    }
    // Bake the arrow permanently into the exported image — this is the piece that used
    // to vanish once you moved to another planet or hit export.
    if (slot.proofPoint){
      const ax = cx + slot.proofPoint.x * cellW, ay = cy + slot.proofPoint.y * cellH;
      const arrowColor = slot.locked ? '#39ff8f' : C.cyan;
      ctx.save();
      ctx.shadowColor = arrowColor; ctx.shadowBlur = 26;
      ctx.strokeStyle = arrowColor; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay+32); ctx.lineTo(ax, ay-14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax-16, ay-2); ctx.lineTo(ax, ay-26); ctx.lineTo(ax+16, ay-2); ctx.stroke();
      ctx.fillStyle = arrowColor;
      ctx.beginPath(); ctx.arc(ax, ay-30, 6.5, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = C.cyan; ctx.font = '700 22px "JetBrains Mono"';
    ctx.fillText(slot.label || `slot ${i+1}`, cx, cy+cellH+14);
  });

  ctx.fillStyle = C.textDim; ctx.font = '15px "JetBrains Mono"';
  ctx.fillText('starchart13.com — generated proof dashboard', 60, canvas.height-40);

  const link = document.createElement('a');
  link.download = 'starchart13-proof-dashboard.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

function roundRectPathV(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

