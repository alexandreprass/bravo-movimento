/* Painel do membro: mural, eventos (RSVP), materiais (busca/filtro/preview) e perfil. */
(() => {
  'use strict';
  const B = window.BRAVO;
  const { $, $$, h, icon, url, api, fetchFile, saveBlob, downloadMaterial, toast, fmtDate, fmtDateTime, eventParts, fmtSize, safeHttpUrl, initials, maskPhoneBR, setError, clearErrors, applyServerErrors, showAlert, busy, initPwToggles } = B;
  const state = { user: null, ann: [], events: [], mats: [], evView: 'next', cat: '', loaded: {} };

  const hydrate = (root = document) => $$('[data-ico]', root).forEach((s) => s.replaceWith(icon(s.dataset.ico)));
  hydrate();

  /* ---------- Abas (acessível: setas, Home/End, hash) ---------- */
  const TABS = ['mural', 'eventos', 'materiais', 'perfil'];
  function showTab(id, focus) {
    if (!TABS.includes(id)) id = 'mural';
    TABS.forEach((t) => {
      const on = t === id, tab = $('#tab-' + t), panel = $('#panel-' + t);
      tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; panel.hidden = !on;
      if (on && focus) tab.focus();
    });
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    if (id === 'perfil') fillProfile();
  }
  $$('.m-tab').forEach((tab) => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
    tab.addEventListener('keydown', (e) => {
      const i = TABS.indexOf(tab.dataset.tab); let n = null;
      if (['ArrowDown', 'ArrowRight'].includes(e.key)) n = (i + 1) % TABS.length;
      else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) n = (i + TABS.length - 1) % TABS.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = TABS.length - 1;
      if (n != null) { e.preventDefault(); showTab(TABS[n], true); }
    });
  });
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

  /* ---------- Cabeçalho / sessão ---------- */
  function paintUser() {
    const u = state.user;
    $('#user-name').textContent = u.nome; $('#welcome-name').textContent = u.nome;
    $('#user-avatar').textContent = initials(u.nome, u.sobrenome);
    if (u.role === 'admin') { $('#admin-link').hidden = false; $('#welcome-title').append(h('span', { class: 'role-pill', text: 'Admin' })); }
    document.title = `Área de Membros | BRAVO`;
  }
  $('#logout-btn').addEventListener('click', B.logout);

  function paintStats() {
    const next = state.events.filter((e) => !e.passado), going = state.events.filter((e) => e.confirmado && !e.passado);
    const items = [[state.ann.length, 'Anúncios'], [next.length, 'Próximos eventos'], [going.length, 'Presenças confirmadas'], [state.mats.length, 'Materiais']];
    $('#stats').replaceChildren(...items.map(([n, l]) => h('div', { class: 'stat' }, h('strong', { text: n }), h('span', { text: l }))));
    const c1 = $('#count-mural'), c2 = $('#count-eventos');
    c1.textContent = state.ann.length; c1.hidden = !state.ann.length;
    c2.textContent = next.length; c2.hidden = !next.length;
  }

  /* ---------- Mural ---------- */
  function renderAnn() {
    const list = $('#ann-list');
    if (!state.ann.length) return list.replaceChildren(h('div', { class: 'empty', text: 'Nenhum anúncio publicado ainda.' }));
    list.replaceChildren(...state.ann.map((a) => h('article', { class: 'ann' + (a.fixado ? ' pinned' : '') },
      a.fixado ? h('span', { class: 'pin-badge' }, icon('pin'), 'Fixado') : null,
      h('h3', { text: a.titulo }),
      h('div', { class: 'body', text: a.texto }),
      h('p', { class: 'post-meta', style: 'margin-top:.9rem' }, `${a.autor} · ${fmtDate(a.criadoEm)}`))));
  }

  /* ---------- Eventos ---------- */
  function renderEvents() {
    const list = $('#ev-list'), past = state.evView === 'past';
    const items = state.events.filter((e) => e.passado === past);
    if (past) items.reverse();
    if (!items.length) return list.replaceChildren(h('div', { class: 'empty', text: past ? 'Nenhum evento realizado.' : 'Nenhum evento agendado no momento.' }));
    list.replaceChildren(...items.map((ev) => {
      const p = eventParts(ev.inicio);
      const btn = ev.passado ? null : h('button', {
        type: 'button', class: 'btn btn-sm ' + (ev.confirmado ? 'btn-rsvp-on' : 'btn-gold'), 'aria-pressed': String(ev.confirmado),
        'aria-label': `${ev.confirmado ? 'Cancelar presença em' : 'Confirmar presença em'} ${ev.titulo}`,
        text: ev.confirmado ? '✓ Presença confirmada' : 'Confirmar presença', onclick: (e) => rsvp(ev, e.currentTarget)
      });
      return h('article', { class: 'event m-event' + (ev.passado ? ' past' : ''), dataset: { id: ev.id } },
        h('div', { class: 'event-date', 'aria-hidden': 'true' }, h('strong', { text: p.day }), h('span', { text: p.mon })),
        h('div', { class: 'event-body' }, h('h3', { text: ev.titulo }),
          h('p', { class: 'meta' }, h('span', { text: p.text }), ev.local ? h('span', { text: ' · ' + ev.local }) : null),
          ev.descricao ? h('p', { text: ev.descricao }) : null),
        h('div', { class: 'rsvp-box' }, btn,
          h('small', { class: 'rsvp-count', text: `${ev.confirmados} ${ev.confirmados === 1 ? 'confirmado' : 'confirmados'}` }),
          ev.confirmado && ev.passado ? h('small', { text: 'Você participou ✓' }) : null));
    }));
  }
  async function rsvp(ev, btn) {
    busy(btn, true);
    try {
      const r = await api('POST', `/api/events/${ev.id}/rsvp`, { going: !ev.confirmado });
      ev.confirmado = r.confirmado; ev.confirmados = r.confirmados;
      toast(r.confirmado ? 'Presença confirmada! Nos vemos lá.' : 'Presença cancelada.');
      renderEvents(); paintStats();
      const nb = $(`.m-event[data-id="${ev.id}"] button`); if (nb) nb.focus();
    } catch (err) { busy(btn, false); toast(err.message); if (err.status === 409) load(); }
  }
  $$('.seg button').forEach((b) => b.addEventListener('click', () => {
    state.evView = b.dataset.ev; $$('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); renderEvents();
  }));

  /* ---------- Materiais ---------- */
  const TYPE_LABEL = { pdf: 'PDF', doc: 'Documento', sheet: 'Planilha', slides: 'Apresentação', image: 'Imagem', video: 'Vídeo', audio: 'Áudio', archive: 'Compactado', link: 'Link', other: 'Arquivo' };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function renderCats() {
    const cats = [...new Set(state.mats.map((m) => m.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const mk = (val, label) => h('button', { type: 'button', 'aria-pressed': String(state.cat === val), text: label, onclick: () => { state.cat = val; renderCats(); renderMats(); } });
    $('#mat-cats').replaceChildren(mk('', 'Todas'), ...cats.map((c) => mk(c, c)));
  }
  function renderMats() {
    const q = norm($('#mat-search').value.trim()), type = $('#mat-type').value;
    const items = state.mats.filter((m) => (!state.cat || m.categoria === state.cat) && (!type || m.tipo === type) &&
      (!q || norm([m.titulo, m.descricao, m.nomeOriginal, m.categoria].join(' ')).includes(q)));
    const list = $('#mat-list');
    if (!items.length) return list.replaceChildren(h('div', { class: 'empty', style: 'grid-column:1/-1', text: state.mats.length ? 'Nenhum material encontrado com esses filtros.' : 'Nenhum material disponível ainda.' }));
    list.replaceChildren(...items.map(matCard));
  }
  function matCard(m) {
    const ext = (m.ext || (m.tipo === 'link' ? 'url' : 'arq')).slice(0, 5);
    const actions = [];
    if (m.tipo === 'link') {
      const u = safeHttpUrl(m.url);
      if (u) actions.push(h('a', { class: 'btn btn-gold btn-xs', href: u, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir link ', icon('external', 'lead-ico')));
    } else {
      if (m.previsualizavel) actions.push(h('button', { type: 'button', class: 'btn btn-ghost-dark btn-xs', onclick: () => openPreview(m) }, 'Visualizar'));
      actions.push(h('button', { type: 'button', class: 'btn btn-gold btn-xs', onclick: (e) => dl(m, e.currentTarget) }, 'Baixar'));
    }
    return h('article', { class: 'mat' },
      h('div', { class: 'mat-top' },
        h('div', { class: `mat-ico t-${m.tipo}`, 'aria-hidden': 'true' }, icon('t_' + m.tipo), h('b', { text: ext })),
        h('div', { style: 'min-width:0' }, h('h3', { text: m.titulo }),
          h('div', { class: 'mat-meta' }, h('span', { class: 'chip', text: TYPE_LABEL[m.tipo] || 'Arquivo' }),
            m.categoria ? h('span', { text: m.categoria }) : null,
            m.tipo !== 'link' ? h('span', { text: fmtSize(m.tamanho) }) : null, h('span', { text: fmtDate(m.criadoEm) })))),
      m.descricao ? h('p', { class: 'desc', text: m.descricao }) : null,
      m.nomeOriginal && m.tipo !== 'link' ? h('p', { class: 'desc', style: 'font-size:.78rem;opacity:.8', text: m.nomeOriginal }) : null,
      h('div', { class: 'mat-actions' }, actions));
  }
  async function dl(m, btn) {
    busy(btn, true, 'Baixando…');
    try { await downloadMaterial(m.id); } catch (err) { toast(err.message || 'Não foi possível baixar o arquivo.'); }
    busy(btn, false);
  }
  $('#mat-search').addEventListener('input', renderMats);
  $('#mat-type').addEventListener('change', renderMats);

  const dlg = $('#preview-dlg');
  let lastFocus = null;
  let previewUrl = null, previewFile = null;
  $('#preview-dl').addEventListener('click', (e) => { e.preventDefault(); if (previewFile) saveBlob(previewFile.blob, previewFile.nome); });
  async function openPreview(m) {
    lastFocus = document.activeElement;
    const stage = $('#preview-stage'); stage.replaceChildren(h('div', { class: 'loading', text: 'Carregando…' }));
    $('#preview-title').textContent = m.titulo; previewFile = null;
    dlg.showModal();
    try { previewFile = await fetchFile(m.id); } catch (err) { stage.replaceChildren(h('div', { class: 'empty', text: err.message })); return; }
    if (!dlg.open) return;
    const src = previewUrl = URL.createObjectURL(previewFile.blob); stage.replaceChildren();
    let node;
    if (m.tipo === 'image') node = h('img', { src, alt: m.titulo });
    else if (m.tipo === 'video') node = h('video', { src, controls: true, preload: 'metadata' });
    else if (m.tipo === 'audio') node = h('audio', { src, controls: true, preload: 'metadata' });
    else node = h('iframe', { src, title: `Pré-visualização: ${m.titulo}` });
    stage.append(node);
  }
  function closePreview() { dlg.close(); }
  dlg.addEventListener('close', () => { $('#preview-stage').replaceChildren(); if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; } if (lastFocus) lastFocus.focus(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closePreview(); });
  $('#preview-close').addEventListener('click', closePreview); $('#preview-close2').addEventListener('click', closePreview);

  /* ---------- Perfil ---------- */
  const pf = $('#profile-form'), el = (n) => pf.elements[n];
  initPwToggles(pf); initPwToggles($('#pw-form')); initPwToggles($('#delete-form'));
  const isBR = () => el('pais').value === 'Brasil';
  const countryVal = () => (el('pais').value === '__outro' ? el('paisOutro').value.trim() : el('pais').value);
  function syncP() {
    const br = isBR();
    el('paisOutro').hidden = el('pais').value !== '__outro';
    el('estado').hidden = !br; el('estado').disabled = !br; el('estadoTxt').hidden = br; el('estadoTxt').disabled = br;
  }
  el('pais').addEventListener('change', syncP);
  el('telefone').addEventListener('input', () => { if (isBR()) el('telefone').value = maskPhoneBR(el('telefone').value); });
  function fillProfile() {
    const u = state.user; clearErrors(pf); showAlert($('#profile-alert'), '');
    el('nome').value = u.nome; el('sobrenome').value = u.sobrenome; el('email').value = u.email;
    const known = [...el('pais').options].some((o) => o.value === u.pais);
    el('pais').value = known ? u.pais : '__outro'; el('paisOutro').value = known ? '' : u.pais;
    syncP();
    el('telefone').value = u.pais === 'Brasil' ? maskPhoneBR(u.telefone) : u.telefone;
    el('cidade').value = u.cidade; if (u.pais === 'Brasil') el('estado').value = u.estado; else el('estadoTxt').value = u.estado;
    $('#p-cpf').textContent = u.cpfMasked || 'Não informado (residente no exterior)';
    el('senhaAtual').value = ''; $('#p-senha-wrap').hidden = true;
  }
  pf.addEventListener('submit', async (e) => {
    e.preventDefault(); clearErrors(pf); const box = $('#profile-alert'); showAlert(box, '');
    const btn = $('#profile-save'); busy(btn, true, 'Salvando…');
    try {
      const r = await api('PUT', '/api/me', {
        nome: el('nome').value.trim(), sobrenome: el('sobrenome').value.trim(), telefone: el('telefone').value.trim(),
        pais: countryVal(), estado: isBR() ? el('estado').value : el('estadoTxt').value.trim(), cidade: el('cidade').value.trim(), senhaAtual: el('senhaAtual').value
      });
      state.user = r.user; paintUser(); fillProfile(); showAlert(box, 'Dados atualizados com sucesso.', 'ok'); toast('Perfil atualizado.');
    } catch (err) {
      const errs = { ...err.errors }; if (errs.estado && !isBR()) { errs.estadoTxt = errs.estado; delete errs.estado; } if (errs.pais && el('pais').value === '__outro') { errs.paisOutro = errs.pais; delete errs.pais; }
      if (errs.senhaAtual) $('#p-senha-wrap').hidden = false;
      applyServerErrors(pf, errs); showAlert(box, err.message, 'error');
    }
    busy(btn, false);
  });

  const pw = $('#pw-form');
  pw.addEventListener('submit', async (e) => {
    e.preventDefault(); clearErrors(pw); const box = $('#pw-alert'); showAlert(box, '');
    const { senhaAtual, novaSenha, confirmarSenha } = pw.elements;
    if (novaSenha.value.length < 8) { setError(novaSenha, 'A senha deve ter no mínimo 8 caracteres.'); novaSenha.focus(); return; }
    if (novaSenha.value !== confirmarSenha.value) { setError(confirmarSenha, 'As senhas não conferem.'); confirmarSenha.focus(); return; }
    const btn = $('#pw-save'); busy(btn, true, 'Alterando…');
    try {
      await api('POST', '/api/me/password', { senhaAtual: senhaAtual.value, novaSenha: novaSenha.value, confirmarSenha: confirmarSenha.value });
      pw.reset(); showAlert(box, 'Senha alterada com sucesso. Outras sessões foram encerradas.', 'ok'); toast('Senha alterada.');
    } catch (err) { applyServerErrors(pw, err.errors); showAlert(box, err.message, 'error'); }
    busy(btn, false);
  });

  $('#export-btn').addEventListener('click', async () => {
    try {
      const data = await api('GET', '/api/me/export');
      const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), download: 'meus-dados-bravo.json' });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (err) { toast(err.message); }
  });
  const dd = $('#delete-dlg'), df = $('#delete-form');
  $('#delete-btn').addEventListener('click', () => { df.reset(); clearErrors(df); showAlert($('#delete-alert'), ''); dd.showModal(); $('#del-senha').focus(); });
  $$('[data-close]', dd).forEach((b) => b.addEventListener('click', () => dd.close()));
  df.addEventListener('submit', async (e) => {
    e.preventDefault(); clearErrors(df); const s = df.elements.senha;
    if (!s.value) { setError(s, 'Informe sua senha.'); s.focus(); return; }
    const btn = $('#delete-confirm'); busy(btn, true, 'Excluindo…');
    try { await api('DELETE', '/api/me', { senha: s.value }); B.setToken(null); location.href = url('/') + '?conta=excluida'; }
    catch (err) { busy(btn, false); applyServerErrors(df, err.errors); showAlert($('#delete-alert'), err.message); }
  });

  /* ---------- Carga inicial ---------- */
  async function load() {
    const [ann, ev, mat] = await Promise.all([api('GET', '/api/announcements'), api('GET', '/api/events'), api('GET', '/api/materials')]);
    state.ann = ann.items; state.events = ev.items; state.mats = mat.items;
    renderAnn(); renderEvents(); renderCats(); renderMats(); paintStats();
  }
  /* ---------- Tela de espera (não verificado / recusado) ---------- */
  function showPending(banned) {
    $('#dash-hero').hidden = true; $('#conteudo').hidden = true; $('#wa-slot').replaceChildren();
    $('.header-actions').hidden = true; $('#pending-screen').hidden = false;
    if (banned) {
      $('#pending-card').classList.add('banned'); $('#pending-title').textContent = 'CADASTRO NÃO APROVADO';
      $('#pending-text').textContent = 'Após a verificação de segurança, seu cadastro não foi aprovado pela coordenação.'; $('#pending-text2').textContent = 'Em caso de dúvida, fale com a coordenação do BRAVO.';
    }
    document.title = 'Aguarde a verificação | BRAVO';
  }
  window.BRAVO_onPending = () => showPending(false);
  $('#pending-logout').addEventListener('click', B.logout);

  /* ---------- Grupo de verificados (link entregue só pela API) ---------- */
  const WA_SVG = '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.85 9.85 0 0012.04 2zm5.8 14.07c-.24.68-1.43 1.32-1.97 1.37-.5.05-.98.23-3.3-.69-2.8-1.1-4.56-3.96-4.7-4.15-.14-.18-1.12-1.49-1.12-2.85 0-1.35.71-2.02.96-2.29.25-.27.55-.34.73-.34l.53.01c.17 0 .4-.06.62.48.24.56.8 1.94.87 2.08.07.14.12.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.89 1.04.93 1.92 1.22 2.19 1.35.27.14.43.12.59-.07.16-.18.68-.8.86-1.07.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.34z"/>';
  async function paintGroup() {
    try {
      const g = await api('GET', '/api/grupo'); const link = B.safeHttpUrl(g.url); if (!link) return;
      const ico = () => B.svg(WA_SVG);
      $('#wa-slot').replaceChildren(h('section', { class: 'wa-card', 'aria-labelledby': 'wa-title' },
        h('div', { class: 'wa-ico', 'aria-hidden': 'true' }, ico()),
        h('div', { class: 'wa-txt' }, h('strong', { id: 'wa-title', text: g.nome || 'Grupo de Verificados BRAVO' }), h('span', { text: 'Grupo exclusivo para membros verificados. Participe para receber avisos e conversar com a coordenação.' })),
        h('a', { class: 'btn-wa', href: link, target: '_blank', rel: 'noopener noreferrer' }, ico(), 'Entrar no grupo do WhatsApp')));
    } catch (_) { /* sem card */ }
  }

  (async () => {
    try {
      const me = await api('GET', '/api/me'); state.user = me.user;
      if (me.user.status !== 'verificado') { showPending(me.user.status === 'banido'); return; }
      paintUser(); $('#dash-hero').hidden = false; $('#conteudo').hidden = false;
      await Promise.all([paintGroup(), load()]);
      if (new URLSearchParams(location.search).get('bemvindo')) { toast('Cadastro concluído! Bem-vindo(a) ao BRAVO.'); history.replaceState(null, '', location.pathname + location.hash); }
    } catch (err) { if (err.code === 'nao_verificado') return showPending(false); if (err.status !== 401) $('#ann-list').replaceChildren(h('div', { class: 'empty', text: 'Não foi possível carregar os dados. Atualize a página.' })); }
    showTab(location.hash.slice(1));
  })();
})();
