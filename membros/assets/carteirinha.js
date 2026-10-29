/* BRAVO — Carteirinha virtual: foto de perfil, exibição e exportação (PNG/PDF). */
(function () {
  'use strict';
  const B = window.BRAVO; const $ = (s) => document.querySelector(s);
  let user = null, photoUrl = null, photoImg = null;
  const fmtNo = (n) => (n != null ? String(n) : '—');
  const since = (d) => { try { return new Date(d).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }); } catch (_) { return '—'; } };
  const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

  function paint() {
    if (!user) return;
    $('#mcard-name').textContent = `${user.nome} ${user.sobrenome}`.trim();
    $('#mcard-no').textContent = fmtNo(user.numero);
    $('#mcard-since').textContent = since(user.criadoEm);
    const box = $('#mcard-photo'), av = $('#user-avatar');
    if (photoUrl) {
      box.replaceChildren(B.h('img', { src: photoUrl, alt: 'Foto de ' + user.nome }));
      if (av) { av.textContent = ''; av.style.backgroundImage = `url("${photoUrl}")`; av.classList.add('has-photo'); }
    } else {
      box.replaceChildren(B.h('span', { text: B.initials(user.nome, user.sobrenome) }));
      if (av) { av.style.backgroundImage = ''; av.classList.remove('has-photo'); }
    }
    $('#photo-del').hidden = !photoUrl;
  }
  async function fetchPhoto() {
    photoUrl = null; photoImg = null;
    if (user && user.temFoto) {
      try { const d = await B.api('GET', '/api/me/photo'); photoUrl = `data:${d.mime};base64,${d.dados}`; photoImg = await loadImg(photoUrl); } catch (_) { photoUrl = null; }
    }
    paint();
  }
  // Reduz para no máx. 512px (recorte quadrado central) em JPEG ≤ 1 MB
  async function resize(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImg(url); const side = Math.min(img.naturalWidth, img.naturalHeight);
      const out = Math.min(512, side); const c = document.createElement('canvas'); c.width = c.height = out;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, out, out);
      g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
      for (const q of [0.86, 0.75, 0.6, 0.45]) { const d = c.toDataURL('image/jpeg', q); if (d.length * 0.75 < 1024 * 1024) return d.split(',')[1]; }
      throw new Error('Imagem muito grande.');
    } finally { URL.revokeObjectURL(url); }
  }
  async function upload(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return B.toast('Use uma imagem JPG, PNG ou WebP.', 'error');
    if (file.size > 15 * 1024 * 1024) return B.toast('Imagem muito grande (máx. 15 MB antes da redução).', 'error');
    const btn = $('#photo-btn'); btn.disabled = true;
    try {
      const dados = await resize(file);
      const d = await B.api('PUT', '/api/me/photo', { mime: 'image/jpeg', dados });
      user = Object.assign({}, user, d.user || { temFoto: true }); await fetchPhoto(); B.toast('Foto atualizada!', 'success');
    } catch (e) { B.toast(e.message || 'Não foi possível enviar a foto.', 'error'); }
    finally { btn.disabled = false; $('#photo-input').value = ''; }
  }
  async function removePhoto() {
    if (!confirm('Remover sua foto de perfil?')) return;
    try { const d = await B.api('DELETE', '/api/me/photo'); user = Object.assign({}, user, d.user || { temFoto: false }); await fetchPhoto(); B.toast('Foto removida.', 'success'); }
    catch (e) { B.toast(e.message || 'Erro ao remover.', 'error'); }
  }

  /* ---------- Desenho em canvas (1012×638 ≈ cartão CR80 em alta) ---------- */
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  async function drawCard() {
    const W = 1012, H = 638, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b3d24'); bg.addColorStop(0.55, '#0f5132'); bg.addColorStop(1, '#062615');
    rr(g, 0, 0, W, H, 36); g.save(); g.clip(); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    try { const lion = await loadImg('../assets/lion.png'); g.globalAlpha = 0.09; g.drawImage(lion, W - 470, H - 470, 520, 520); g.globalAlpha = 1; } catch (_) {}
    const gold = g.createLinearGradient(0, 0, W, 0); gold.addColorStop(0, '#b8892b'); gold.addColorStop(0.5, '#f3d27a'); gold.addColorStop(1, '#b8892b');
    g.fillStyle = gold; g.fillRect(0, 0, W, 10); g.fillRect(0, H - 74, W, 2);
    try { const logo = await loadImg('../assets/logo.jpg'); g.save(); rr(g, 48, 44, 84, 84, 18); g.clip(); g.drawImage(logo, 48, 44, 84, 84); g.restore(); } catch (_) {}
    g.fillStyle = '#f3d27a'; g.font = '800 46px Montserrat, Inter, sans-serif'; g.fillText('BRAVO', 152, 92);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '600 20px Inter, sans-serif'; g.fillText('CARTEIRINHA DE MEMBRO', 154, 122);
    // chip verificado
    g.font = '700 20px Inter, sans-serif'; const chip = '✓ MEMBRO VERIFICADO', cw = g.measureText(chip).width + 40;
    rr(g, W - 48 - cw, 62, cw, 46, 23); g.fillStyle = 'rgba(243,210,122,.16)'; g.fill(); g.strokeStyle = '#f3d27a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#f3d27a'; g.fillText(chip, W - 48 - cw + 20, 92);
    // foto
    const px = 56, py = 172, ps = 300; rr(g, px - 6, py - 6, ps + 12, ps + 12, 30); g.fillStyle = gold; g.fill();
    g.save(); rr(g, px, py, ps, ps, 26); g.clip(); g.fillStyle = '#e9efe9'; g.fillRect(px, py, ps, ps);
    if (photoImg) g.drawImage(photoImg, px, py, ps, ps);
    else { g.fillStyle = '#0f5132'; g.font = '800 120px Montserrat, sans-serif'; g.textAlign = 'center'; g.fillText(B.initials(user.nome, user.sobrenome), px + ps / 2, py + ps / 2 + 42); g.textAlign = 'left'; }
    g.restore();
    const tx = 408; const lab = (t, y) => { g.fillStyle = 'rgba(255,255,255,.62)'; g.font = '600 20px Inter, sans-serif'; g.fillText(t.toUpperCase(), tx, y); };
    lab('Nome', 200); g.fillStyle = '#fff'; let fs = 46; const nm = `${user.nome} ${user.sobrenome}`.trim();
    do { g.font = `800 ${fs}px Montserrat, Inter, sans-serif`; fs -= 2; } while (g.measureText(nm).width > W - tx - 48 && fs > 22);
    g.fillText(nm, tx, 252);
    lab('Nº de membro', 318); g.fillStyle = '#f3d27a'; g.font = '800 54px Montserrat, monospace'; g.fillText(fmtNo(user.numero), tx, 376);
    g.save(); g.translate(300, 0); lab('Membro desde', 318); g.fillStyle = '#fff'; g.font = '700 40px Montserrat, sans-serif'; g.fillText(since(user.criadoEm), tx, 372); g.restore();
    lab('Situação', 430); g.fillStyle = '#7ee2a8'; g.font = '700 30px Inter, sans-serif'; g.fillText('● Verificado', tx, 470);
    g.fillStyle = '#f3d27a'; g.font = 'italic 700 28px Montserrat, serif'; g.textAlign = 'center'; g.fillText('Deus, Pátria, Família e Liberdade', W / 2, H - 26); g.textAlign = 'left';
    g.restore(); return c;
  }
  const fname = (ext) => `carteirinha-bravo-${fmtNo(user.numero)}.${ext}`;
  async function exportPng() { const c = await drawCard(); c.toBlob((b) => B.saveBlob(b, fname('png')), 'image/png'); }
  // PDF mínimo (1 página, imagem JPEG) sem bibliotecas externas
  async function exportPdf() {
    const c = await drawCard(); const jpg = atob(c.toDataURL('image/jpeg', 0.92).split(',')[1]);
    const pw = 595.28, ph = 841.89, iw = 480, ih = iw * c.height / c.width, ix = (pw - iw) / 2, iy = ph - 120 - ih;
    const content = `q ${iw} 0 0 ${ih.toFixed(2)} ${ix.toFixed(2)} ${iy.toFixed(2)} cm /Im0 Do Q`;
    const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
      `<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n${jpg}\nendstream`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = pdf.length; pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = new Uint8Array(pdf.length); for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 255;
    B.saveBlob(new Blob([bytes], { type: 'application/pdf' }), fname('pdf'));
  }

  window.addEventListener('bravo:user', (e) => { user = e.detail; fetchPhoto(); });
  document.addEventListener('DOMContentLoaded', () => {
    $('#photo-btn').addEventListener('click', () => $('#photo-input').click());
    $('#photo-input').addEventListener('change', (e) => upload(e.target.files[0]));
    $('#photo-del').addEventListener('click', removePhoto);
    $('#card-png').addEventListener('click', () => exportPng().catch(() => B.toast('Falha ao gerar PNG.', 'error')));
    $('#card-pdf').addEventListener('click', () => exportPdf().catch(() => B.toast('Falha ao gerar PDF.', 'error')));
  });
})();
