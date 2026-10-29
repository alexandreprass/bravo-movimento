/* BRAVO – Área de Membros | common.js (vanilla). Expõe window.BRAVO */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- DOM seguro: nunca usa innerHTML com dados do usuário ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const svg = (inner, cls) => { // somente constantes confiáveis deste arquivo
    const t = document.createElement('template');
    t.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"${cls ? ` class="${cls}"` : ''}>${inner}</svg>`;
    return t.content.firstChild;
  };
  const ICONS = {
    megaphone: '<path d="M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1z"/><path d="M15 9a4 4 0 010 6M18 6a8 8 0 010 12"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14.5c2 .6 3.5 2.5 3.5 5.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    pin: '<path d="M12 17v5M8 3h8l-1 7 3 3v2H6v-2l3-3-1-7z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 004.2 4.2"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    logout: '<path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M6 12.5l4 4 8-9"/>',
    // tipos de arquivo
    t_pdf: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9.5 15.5c1.5 0 3-1.8 3.4-4 .3 1.6 1.4 3 3 3.4-1.6.2-3 .9-4 1.8"/>',
    t_doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 12h6M10 15h6M10 18h4"/>',
    t_sheet: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>',
    t_slides: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M8 12l2.5-3 2 2 2.5-3"/>',
    t_image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 17l-5-5-9 8"/>',
    t_video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
    t_audio: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    t_archive: '<path d="M5 4h14v16H5z"/><path d="M12 4v3M12 9v2M12 13v2"/><rect x="10" y="15" width="4" height="3" rx=".8"/>',
    t_link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1"/>',
    t_other: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>'
  };
  const icon = (name, cls) => svg(ICONS[name] || ICONS.t_other, cls);

  /* ---------- Formatação ---------- */
  const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', ''); };
  const fmtDateTime = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };
  // starts_at vem como 'YYYY-MM-DDTHH:MM' (horário de Brasília): exibe sem converter fuso.
  const parseLocal = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s || ''); return m ? { y: +m[1], mo: +m[2], d: +m[3], hh: m[4], mm: m[5] } : null; };
  const WEEK = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  function eventParts(s) {
    const p = parseLocal(s); if (!p) return { day: '--', mon: '---', text: '' };
    const wd = WEEK[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()];
    return { day: String(p.d).padStart(2, '0'), mon: MONTHS[p.mo - 1], text: `${wd}, ${String(p.d).padStart(2, '0')}/${String(p.mo).padStart(2, '0')}/${p.y} às ${p.hh}h${p.mm === '00' ? '' : p.mm}` };
  }
  function fmtSize(b) {
    if (!b) return '—';
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0, n = b;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : n.toFixed(n >= 100 ? 0 : 1)).toString().replace('.', ',') + ' ' + u[i];
  }
  const safeHttpUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch (_) { return null; } };
  const initials = (n, s) => ((n || '?')[0] + ((s || '')[0] || '')).toUpperCase();

  /* ---------- Máscaras e CPF ---------- */
  const digits = (s) => String(s || '').replace(/\D/g, '');
  function maskCpf(v) {
    const d = digits(v).slice(0, 11);
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  function maskPhoneBR(v) {
    const d = digits(v).slice(0, 11);
    if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return d ? `(${d}` : '';
  }
  function isValidCpf(v) {
    const c = digits(v);
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    const calc = (len) => { let s = 0; for (let i = 0; i < len; i++) s += +c[i] * (len + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return calc(9) === +c[9] && calc(10) === +c[10];
  }

  /* ---------- API (Neon Data API → função api.call) ---------- */
  // Raiz do site calculada a partir deste script (funciona em /bravo-movimento/ no GitHub Pages).
  const ROOT = new URL('../../', document.currentScript ? document.currentScript.src : location.href).href;
  const API_URL = 'https://ep-shy-sound-b6fx82yf.apirest.c-2.sa-east-1.aws.neon.tech/neondb/rest/v1/rpc/call';
  // Token PÚBLICO de acesso anônimo à API (só permite executar api.call; não é segredo).
  const PUBLIC_JWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImJyYXZvLWFub24tMSJ9.eyJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImJyYXZvLWFwaSIsImlzcyI6ImJyYXZvLW1vdmltZW50byIsInN1YiI6ImFub24iLCJpYXQiOjE3OTMyODE2MjksImV4cCI6MTk1MDk2MTYyOX0.cHVi8LjQQ7KGUMbdwm78dFATxEJ8-U0S79fR7nFjTE4th2oRl60lJrx2KBhKlkZ7iGrTSmxeLYK49zzEIfYKH0U7IiTdNGZA4bDAMqxyDOGX-ZSJ0y9w2jQqjR7a5OG66BCeCphgYTFALt0oBO9xucaUla3-2iZ5iAZzdPuY8WnXjnCq4FnRL1XaOXSOjktEdTrY3BcjKIZiENxR8YLvEpznBXxPmkoGFYOGrCc84Wh_DQ8siI6iTsxLUoV_tWPU40IHim4-YwQd9UXAeDiDgdJz6o2T3WXcnTFpO7nr6AsMU6enpyWQXLBTJO0U69HdFL2mooHrESksseeAg6VQHQ';
  const TK = 'bravo_sessao';
  const getToken = () => { try { return localStorage.getItem(TK); } catch (_) { return null; } };
  const setToken = (t) => { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (_) {} };
  // Converte caminhos antigos ('/membros/login?x', '/admin', '/') em URLs relativas à raiz publicada.
  function url(path) {
    const m = /^([^?#]*)(.*)$/.exec(path || '/'); let p = m[1];
    if (p === '/membros' || p === '/membros/') p = 'membros/index.html';
    else if (p === '/admin' || p === '/admin/') p = 'admin/index.html';
    else if (/^\/membros\/[a-z\-]+$/.test(p)) p = p.slice(1) + '.html';
    else p = p.replace(/^\//, '');
    return ROOT + p + m[2];
  }
  class ApiError extends Error { constructor(msg, status, data) { super(msg); this.status = status; this.data = data || {}; this.errors = (data && data.errors) || {}; this.code = data && data.code; } }
  const ensureCsrf = async () => null; const setCsrf = () => {};
  async function api(method, path, body, opts = {}) {
    const [p, qs] = String(path).split('?');
    const query = {}; new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
    let res, out;
    const payload = JSON.stringify({ p_token: getToken(), p_method: method, p_path: p, p_body: body && typeof body === 'object' ? body : {}, p_query: query });
    // A Data API às vezes recusa o token público antes de executar qualquer coisa ("jwk not found")
    // ou devolve 5xx enquanto o banco acorda; nesses casos a requisição não rodou e é seguro repetir.
    for (let tent = 0; tent < 6; tent++) {
      try {
        res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + PUBLIC_JWT }, body: payload });
        out = await res.json().catch(() => null);
      } catch (_) { if (tent < 2) { await new Promise((r) => setTimeout(r, 600)); continue; } throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.', 0, {}); }
      const authGlitch = !res.ok && out && typeof out.message === 'string' && /jwk|jwt|jws/i.test(out.message);
      if (!(authGlitch || res.status >= 500) || tent === 5) break;
      await new Promise((r) => setTimeout(r, 250 + tent * 350));
    }
    if (!res.ok || !out || typeof out.status !== 'number') throw new ApiError('Serviço indisponível no momento. Tente novamente em instantes.', res.status, {});
    const status = out.status, data = out.body || {};
    if (data.token) setToken(data.token);
    if (status === 401 && !opts.noRedirect) { setToken(null); location.href = url('/membros/login') + '?next=' + encodeURIComponent(location.pathname + location.search + location.hash); throw new ApiError('Sessão expirada', 401, data); }
    if (status === 403 && data.code === 'nao_verificado' && !opts.noRedirect && typeof window.BRAVO_onPending === 'function') window.BRAVO_onPending();
    if (status >= 400) throw new ApiError(data.error || 'Erro inesperado. Tente novamente.', status, data);
    return data;
  }
  // Baixa um material (arquivo guardado no banco) e entrega como Blob.
  async function fetchFile(id) {
    const r = await api('GET', `/api/materials/${id}/download`);
    const bin = atob(r.dados), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return { blob: new Blob([u8], { type: r.mime || 'application/octet-stream' }), nome: r.nome || 'arquivo' };
  }
  function saveBlob(blob, nome) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function downloadMaterial(id) { const f = await fetchFile(id); saveBlob(f.blob, f.nome); }
  function fileToBase64(file) {
    return new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => fail(r.error); r.readAsDataURL(file); });
  }

  /* ---------- Toast ---------- */
  let toastEl, toastTimer;
  function toast(msg) {
    toastEl = toastEl || $('#toast');
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4200);
  }

  /* ---------- Erros de formulário ---------- */
  function setError(input, msg) {
    const field = input.closest('.field'); if (!field) return;
    field.classList.toggle('invalid', !!msg);
    const err = $('.error', field); if (err) err.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function clearErrors(form) { $$('.field', form).forEach((f) => { f.classList.remove('invalid'); const e = $('.error', f); if (e) e.textContent = ''; }); $$('[aria-invalid]', form).forEach((i) => i.setAttribute('aria-invalid', 'false')); }
  function applyServerErrors(form, errors) {
    let first = null;
    for (const [name, msg] of Object.entries(errors || {})) {
      const input = form.elements[name]; if (!input) continue;
      setError(input.length && !input.tagName ? input[0] : input, msg);
      if (!first) first = input;
    }
    if (first && first.focus) first.focus();
    return !!first;
  }
  function showAlert(el, msg, kind = 'error') {
    if (!el) return;
    el.hidden = !msg; el.textContent = msg || '';
    el.className = `alert alert-${kind}`; if (!msg) el.hidden = true;
  }
  const busy = (btn, on, label) => { if (!btn) return; if (on) { btn.dataset.label = btn.textContent; btn.setAttribute('aria-busy', 'true'); if (label) btn.textContent = label; } else { btn.removeAttribute('aria-busy'); if (btn.dataset.label) btn.textContent = btn.dataset.label; } };

  /* Botões de mostrar/ocultar senha */
  function initPwToggles(root = document) {
    $$('.pw-toggle', root).forEach((b) => {
      const input = $('input', b.parentElement);
      b.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        b.setAttribute('aria-pressed', String(show));
        b.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
        b.replaceChildren(icon(show ? 'eyeoff' : 'eye'));
      });
      b.replaceChildren(icon('eye'));
    });
  }
  const safeNext = (n) => { try { const u = new URL(n, location.href); if (u.origin === location.origin && u.href.startsWith(ROOT) && /\/(membros|admin)\//.test(u.pathname)) return u.href; } catch (_) {} return url('/membros'); };

  async function logout() {
    try { await api('POST', '/api/auth/logout', {}, { noRedirect: true }); } catch (_) {}
    setToken(null); location.href = url('/membros/login') + '?saiu=1';
  }
  function setYear() { const y = $('#year'); if (y) y.textContent = new Date().getFullYear(); }
  setYear();

  window.BRAVO = { url, ROOT, getToken, setToken, fetchFile, saveBlob, downloadMaterial, fileToBase64, $, $$, h, svg, icon, api, ApiError, ensureCsrf, setCsrf, toast, fmtDate, fmtDateTime, eventParts, fmtSize, safeHttpUrl, initials, maskCpf, maskPhoneBR, isValidCpf, digits, setError, clearErrors, applyServerErrors, showAlert, busy, initPwToggles, safeNext, logout };
})();
