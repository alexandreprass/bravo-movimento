/* BRAVO – Movimento Conservador | script.js (vanilla, sem dependências) */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Ano no rodapé ---------- */
  const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Toast ---------- */
  const toastEl = $('#toast'); let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3600);
  };

  /* ---------- Header, progresso, voltar ao topo ---------- */
  const header = $('.site-header'), progress = $('#progress'), toTop = $('#to-top');
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle('scrolled', y > 30);
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    toTop.hidden = y < 700;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* ---------- Menu mobile ---------- */
  const toggle = $('#menu-toggle'), nav = $('#main-nav');
  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); toggle.focus(); } });
  document.addEventListener('click', e => { if (document.body.classList.contains('menu-open') && !nav.contains(e.target) && !toggle.contains(e.target)) setMenu(false); });
  matchMedia('(min-width: 981px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- Link ativo na navegação ---------- */
  const navLinks = $$('.main-nav ul a');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => spy.observe(s));
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else revealEls.forEach(el => el.classList.add('in'));

  /* ---------- Contadores animados ---------- */
  const fmt = new Intl.NumberFormat('pt-BR');
  const animateCount = (el) => {
    const target = +el.dataset.count, dur = 2000, t0 = performance.now();
    if (reduceMotion) { el.textContent = fmt.format(target); return; }
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt.format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => { if (en.isIntersecting) { animateCount(en.target); obs.unobserve(en.target); } });
    }, { threshold: .6 });
    counters.forEach(c => co.observe(c));
  } else counters.forEach(c => c.textContent = fmt.format(+c.dataset.count));

  /* ---------- Abas das pautas ---------- */
  const tabs = $$('.tab'), panels = $$('.panel');
  const selectTab = (tab, focus) => {
    tabs.forEach(t => { const on = t === tab; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    panels.forEach(p => { p.hidden = p.id !== tab.getAttribute('aria-controls'); p.classList.toggle('active', !p.hidden); });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      const k = e.key; let n = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (k === 'ArrowUp' || k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (k === 'Home') n = tabs[0]; if (k === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  /* ---------- Acordeão FAQ ---------- */
  $$('.acc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.acc-item'), panel = $('#' + btn.getAttribute('aria-controls'));
      const open = btn.getAttribute('aria-expanded') === 'true';
      // fecha os outros
      $$('.acc-btn').forEach(b => { if (b !== btn) { b.setAttribute('aria-expanded', 'false'); b.closest('.acc-item').classList.remove('open'); } });
      btn.setAttribute('aria-expanded', String(!open));
      item.classList.toggle('open', !open);
      panel.hidden = false; // controlado via CSS (grid-template-rows)
    });
  });

  /* ---------- Contribuição (apenas visual) ---------- */
  const amounts = $$('.amount'), donateVal = $('#donate-value');
  amounts.forEach(a => a.addEventListener('click', () => {
    amounts.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
    a.classList.add('active'); a.setAttribute('aria-pressed', 'true');
    donateVal.textContent = 'R$ ' + a.dataset.amount;
  }));
  $('#donate-btn').addEventListener('click', () => toast('As contribuições ainda não estão habilitadas. Seção ilustrativa.'));

  /* ---------- Formulário (front-end apenas) ---------- */
  const form = $('#signup-form'), success = $('#form-success');
  const wpp = $('#whatsapp');
  wpp.addEventListener('input', () => {
    let d = wpp.value.replace(/\D/g, '').slice(0, 11), o = d;
    if (d.length > 10) o = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    else if (d.length > 6) o = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    else if (d.length > 2) o = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    else if (d.length) o = `(${d}`;
    wpp.value = o;
  });

  const rules = {
    nome: v => v.trim().split(/\s+/).filter(Boolean).length >= 2 && v.trim().length >= 5 || 'Informe seu nome e sobrenome.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Informe um e-mail válido.',
    whatsapp: v => { const n = v.replace(/\D/g, ''); return (n.length === 11 || n.length === 10) || 'Informe DDD + número (ex.: (11) 91234-5678).'; },
    cidade: v => v.trim().length >= 2 || 'Informe sua cidade.',
    uf: v => v !== '' || 'Selecione a UF.',
    lgpd: (v, el) => el.checked || 'É necessário consentir para continuar.'
  };
  const validate = (el) => {
    const rule = rules[el.name]; if (!rule) return true;
    const res = rule(el.value, el), ok = res === true;
    const field = el.closest('.field');
    field.classList.toggle('invalid', !ok);
    $('.error', field).textContent = ok ? '' : res;
    el.setAttribute('aria-invalid', String(!ok));
    return ok;
  };
  const inputs = $$('input,select', form);
  inputs.forEach(el => {
    el.addEventListener('blur', () => { if (el.value || el.type === 'checkbox') validate(el); });
    el.addEventListener('input', () => { if (el.closest('.field').classList.contains('invalid')) validate(el); });
    el.addEventListener('change', () => { if (el.closest('.field').classList.contains('invalid')) validate(el); });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const results = inputs.map(validate);
    if (results.includes(false)) { inputs[results.indexOf(false)].focus(); return; }
    const data = Object.fromEntries(new FormData(form).entries());
    data.lgpd = true; data.consentimentoEm = new Date().toISOString();
    try {
      const list = JSON.parse(localStorage.getItem('bravo_cadastros') || '[]');
      list.push(data); localStorage.setItem('bravo_cadastros', JSON.stringify(list));
    } catch (_) { /* armazenamento indisponível: segue apenas com a mensagem */ }
    // TODO: enviar para o backend (API/CRM) quando definido.
    $('#success-name').textContent = data.nome.trim().split(/\s+/)[0];
    success.hidden = false; success.focus();
  });
  $('#form-reset').addEventListener('click', () => { form.reset(); success.hidden = true; inputs[0].focus(); });

  /* ---------- Partículas douradas no hero ---------- */
  const canvas = $('#particles');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d'); let w, h, dpr, parts = [], raf, visible = true;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const r = canvas.parentElement.getBoundingClientRect(); w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, Math.max(24, w / 22)));
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + .5,
        vy: -(Math.random() * .35 + .08), vx: (Math.random() - .5) * .15, a: Math.random() * .6 + .2, p: Math.random() * 6.28
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.p += .02;
        if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        const al = p.a * (.55 + .45 * Math.sin(p.p));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = `rgba(242,201,76,${al})`; ctx.shadowColor = 'rgba(242,201,76,.8)'; ctx.shadowBlur = 8; ctx.fill();
      }
      raf = visible ? requestAnimationFrame(draw) : null;
    };
    resize(); draw();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) draw(); }).observe(canvas);
  }
})();
