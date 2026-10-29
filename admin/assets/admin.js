/* Painel administrativo: CRUD de anúncios/eventos/materiais e gestão de membros. */
(() => {
  'use strict';
  const B = window.BRAVO;
  const { $, $$, h, icon, url, api, saveBlob, downloadMaterial, fileToBase64, toast, fmtDate, fmtDateTime, eventParts, fmtSize, safeHttpUrl, initials, clearErrors, applyServerErrors, showAlert, busy, initPwToggles } = B;
  const S = { me: null, stats: null, ann: [], ev: [], mat: [], memPage: 1, memSize: 25, loaded: {} };
  $$('[data-ico]').forEach((s) => s.replaceWith(icon(s.dataset.ico)));

  /* ---------- Abas ---------- */
  const TABS = ['visao', 'pendentes', 'anuncios', 'eventos', 'materiais', 'membros'];
  const loaders = { visao: loadStats, pendentes: loadPend, anuncios: loadAnn, eventos: loadEv, materiais: loadMat, membros: loadMembers };
  function showTab(id, focus) {
    if (!TABS.includes(id)) id = 'visao';
    TABS.forEach((t) => { const on = t === id; const tab = $('#tab-' + t); tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; $('#panel-' + t).hidden = !on; if (on && focus) tab.focus(); });
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    loaders[id]().catch((e) => toast(e.message));
  }
  $$('.m-tab').forEach((tab) => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
    tab.addEventListener('keydown', (e) => {
      const i = TABS.indexOf(tab.dataset.tab); let n = null;
      if (['ArrowDown', 'ArrowRight'].includes(e.key)) n = (i + 1) % TABS.length; else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) n = (i + TABS.length - 1) % TABS.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = TABS.length - 1;
      if (n != null) { e.preventDefault(); showTab(TABS[n], true); }
    });
  });
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
  $('#logout-btn').addEventListener('click', B.logout);

  /* ---------- Diálogos ---------- */
  $$('dialog').forEach((d) => { $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close())); d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); });
  const formDlg = $('#form-dlg'), dlgForm = $('#dlg-form');
  let formHandler = null, lastFocus = null;
  function field(f) {
    const id = 'f-' + f.name;
    let input;
    if (f.type === 'textarea') input = h('textarea', { id, name: f.name, maxlength: f.max || 5000, rows: f.rows || 5 });
    else if (f.type === 'checkbox') input = h('input', { type: 'checkbox', id, name: f.name });
    else if (f.type === 'select') input = h('select', { id, name: f.name }, f.options.map((o) => h('option', { value: o, text: o })));
    else input = h('input', { type: f.type || 'text', id, name: f.name, maxlength: f.max, placeholder: f.placeholder, autocomplete: 'off' });
    if (f.type !== 'file' && f.value != null) { if (f.type === 'checkbox') input.checked = !!f.value; else input.value = f.value; }
    if (f.list) input.setAttribute('list', 'list-' + f.name);
    if (f.required) input.required = true;
    if (f.type === 'checkbox') return h('div', { class: 'field check' }, input, h('label', { for: id, text: f.label }), h('span', { class: 'error', 'aria-live': 'polite' }));
    return h('div', { class: 'field' }, h('label', { for: id }, f.label, f.required ? h('span', { class: 'req', text: ' *' }) : null),
      input, f.list ? h('datalist', { id: 'list-' + f.name }, f.list.map((o) => h('option', { value: o }))) : null,
      f.help ? h('span', { class: 'help', text: f.help }) : null, h('span', { class: 'error', 'aria-live': 'polite' }));
  }
  function openForm({ title, fields, submit = 'Salvar', onSubmit }) {
    lastFocus = document.activeElement;
    $('#form-dlg-title').textContent = title; $('#dlg-fields').replaceChildren(...fields.map(field));
    $('#dlg-submit').textContent = submit; showAlert($('#dlg-alert'), ''); $('#dlg-progress').hidden = true;
    formHandler = onSubmit; formDlg.showModal(); const first = $('input,textarea,select', $('#dlg-fields')); if (first) first.focus();
  }
  formDlg.addEventListener('close', () => { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  dlgForm.addEventListener('submit', async (e) => {
    e.preventDefault(); clearErrors(dlgForm); showAlert($('#dlg-alert'), '');
    const btn = $('#dlg-submit'); busy(btn, true);
    try { await formHandler(dlgForm); formDlg.close(); }
    catch (err) { applyServerErrors(dlgForm, err.errors); showAlert($('#dlg-alert'), err.message || 'Falha ao salvar.'); }
    busy(btn, false);
  });
  const val = (f, n) => (f.elements[n].type === 'checkbox' ? f.elements[n].checked : f.elements[n].value);

  const cDlg = $('#confirm-dlg'), cForm = $('#confirm-form');
  let cHandler = null;
  function confirmBox({ title, body, okLabel = 'Confirmar', danger = true, extra, onOk }) {
    $('#confirm-title').textContent = title; $('#confirm-body').replaceChildren(...[].concat(body)); showAlert($('#confirm-alert'), '');
    const ok = $('#confirm-ok'); ok.textContent = okLabel; ok.className = 'btn btn-sm ' + (danger ? 'btn-danger' : 'btn-gold');
    cHandler = onOk; cDlg.showModal(); const f = $('input', $('#confirm-body')); if (f) f.focus(); else ok.focus();
  }
  cForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const ok = $('#confirm-ok'); busy(ok, true); showAlert($('#confirm-alert'), '');
    try { await cHandler(cForm); cDlg.close(); } catch (err) { showAlert($('#confirm-alert'), err.message || 'Falha.'); }
    busy(ok, false);
  });

  /* ---------- Visão geral ---------- */
  async function loadStats() {
    const s = await api('GET', '/api/admin/stats'); S.stats = s; $('#max-mb').textContent = s.limiteMb || 4;
    const c = $('#count-pend'); c.textContent = s.pendentes; c.hidden = !s.pendentes;
    const k = [[s.membros, 'Cadastros'], [s.pendentes, 'Pendentes de verificação'], [s.verificados, 'Verificados'], [s.banidos, 'Recusados/banidos'], [s.admins, 'Administradores'], [s.novos7d, 'Novos (7 dias)'], [s.anuncios, 'Anúncios'], [s.eventosFuturos, 'Eventos futuros'], [s.materiais, 'Materiais'], [fmtSize(s.armazenamento) + ' / 300 MB', 'Armazenamento']];
    $('#kpis').replaceChildren(...k.map(([n, l]) => h('div', { class: 'kpi' }, h('strong', { text: n }), h('span', { text: l }))));
  }

  /* ---------- Pendentes de verificação ---------- */
  const REDE_LABEL = { instagram: 'Instagram', facebook: 'Facebook', x: 'X / Twitter', tiktok: 'TikTok', youtube: 'YouTube', telegram: 'Telegram', outro: 'Outro' };
  const socialLinks = (r) => h('div', { class: 'soc-links' }, Object.entries(r || {}).map(([k, v]) => { const u = safeHttpUrl(v); return u ? h('a', { class: 'soc-link', href: u, target: '_blank', rel: 'noopener noreferrer', title: u }, h('span', { class: 'soc-dot soc-' + k, 'aria-hidden': 'true' }), REDE_LABEL[k] || k, icon('external', 'lead-ico')) : null; }));
  const ST_LABEL = { verificado: 'Verificado', nao_verificado: 'Não verificado', banido: 'Recusado/banido' };
  const stBadge = (st) => h('span', { class: 'st-badge st-' + st, text: ST_LABEL[st] || st });
  async function loadPend() {
    const { items } = await api('GET', '/api/admin/pending'); const box = $('#adm-pend');
    const c = $('#count-pend'); c.textContent = items.length; c.hidden = !items.length;
    if (!items.length) return box.replaceChildren(h('div', { class: 'empty', text: 'Nenhum cadastro aguardando verificação.' }));
    box.replaceChildren(...items.map((u) => h('article', { class: 'pend' },
      h('h3', {}, `${u.nome} ${u.sobrenome} `, stBadge(u.status)),
      h('dl', {}, h('dt', { text: 'E-mail' }), h('dd', { text: u.email }), h('dt', { text: 'Telefone' }), h('dd', { text: u.telefone }),
        h('dt', { text: 'CPF' }), h('dd', { class: 'mono', text: u.cpfMasked || 'Não informado' }),
        h('dt', { text: 'Local' }), h('dd', { text: `${u.cidade}/${u.estado} · ${u.pais}` }), h('dt', { text: 'Cadastro' }), h('dd', { text: fmtDateTime(u.criadoEm) })),
      h('strong', { text: 'Redes sociais:', style: 'font-size:.9rem' }), socialLinks(u.redes),
      h('div', { class: 'pend-actions' },
        h('button', { type: 'button', class: 'btn btn-sm btn-approve', 'aria-label': `Aprovar ${u.nome}`, onclick: () => setStatus(u, 'verificado', true) }, icon('check', 'lead-ico'), ' Aprovar'),
        h('button', { type: 'button', class: 'btn btn-sm btn-outline-danger', 'aria-label': `Recusar ou banir ${u.nome}`, text: 'Recusar/Banir', onclick: () => setStatus(u, 'banido') })))));
  }
  const ACT = { verificado: ['Aprovar cadastro', 'Aprovar', 'Cadastro aprovado.'], banido: ['Recusar/banir cadastro', 'Recusar/Banir', 'Cadastro recusado.'], nao_verificado: ['Voltar para não verificado', 'Reverter', 'Situação revertida para não verificado.'] };
  function setStatus(u, status, quick) {
    const [title, ok, msg] = ACT[status];
    const run = async () => { await api('PATCH', `/api/admin/members/${u.id}`, { status }); toast(msg); loadPend().catch(() => {}); loadStats().catch(() => {}); if (!$('#panel-membros').hidden) loadMembers().catch(() => {}); };
    confirmBox({ title, okLabel: ok, danger: status !== 'verificado', body: h('p', {}, `${title}: `, h('strong', { text: `${u.nome} ${u.sobrenome}` }), ` (${u.email})?`), onOk: run });
  }

  /* ---------- Anúncios ---------- */
  const annFields = (a = {}) => [
    { name: 'titulo', label: 'Título', required: true, max: 140, value: a.titulo },
    { name: 'texto', label: 'Texto', type: 'textarea', required: true, max: 5000, rows: 7, value: a.texto },
    { name: 'fixado', label: 'Fixar no topo do mural', type: 'checkbox', value: a.fixado }
  ];
  async function loadAnn() {
    S.ann = (await api('GET', '/api/admin/announcements')).items; const box = $('#adm-ann');
    if (!S.ann.length) return box.replaceChildren(h('div', { class: 'empty', text: 'Nenhum anúncio. Crie o primeiro!' }));
    box.replaceChildren(...S.ann.map((a) => h('div', { class: 'item-row' },
      h('div', {}, h('h4', {}, a.fixado ? h('span', { class: 'pin-badge', style: 'margin-right:.5rem' }, icon('pin'), 'Fixado') : null, a.titulo),
        h('p', { text: `${fmtDate(a.criadoEm)} · ${a.texto.length > 140 ? a.texto.slice(0, 140) + '…' : a.texto}` })),
      h('div', { class: 'row-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost-dark btn-xs', onclick: () => editAnn(a), text: 'Editar' }),
        h('button', { type: 'button', class: 'btn btn-outline-danger btn-xs', onclick: () => delItem('anúncio', a.titulo, `/api/admin/announcements/${a.id}`, loadAnn), text: 'Excluir' })))));
  }
  const editAnn = (a) => openForm({ title: a ? 'Editar anúncio' : 'Novo anúncio', fields: annFields(a), submit: a ? 'Salvar' : 'Publicar', onSubmit: async (f) => {
    const body = { titulo: val(f, 'titulo'), texto: val(f, 'texto'), fixado: val(f, 'fixado') };
    await (a ? api('PUT', `/api/admin/announcements/${a.id}`, body) : api('POST', '/api/admin/announcements', body)); toast(a ? 'Anúncio atualizado.' : 'Anúncio publicado.'); loadAnn(); } });
  $('#new-ann').addEventListener('click', () => editAnn());

  function delItem(kind, name, url, reload) {
    confirmBox({ title: `Excluir ${kind}`, okLabel: 'Excluir', body: h('p', {}, 'Excluir ', h('strong', { text: name }), '? Esta ação não pode ser desfeita.'),
      onOk: async () => { await api('DELETE', url); toast('Excluído.'); reload(); loadStats().catch(() => {}); } });
  }

  /* ---------- Eventos ---------- */
  const evFields = (e = {}) => [
    { name: 'titulo', label: 'Título', required: true, max: 140, value: e.titulo },
    { name: 'inicio', label: 'Data e hora (Brasília)', type: 'datetime-local', required: true, value: e.inicio },
    { name: 'local', label: 'Local', required: true, max: 200, value: e.local },
    { name: 'descricao', label: 'Descrição', type: 'textarea', max: 3000, rows: 5, value: e.descricao }
  ];
  async function loadEv() {
    S.ev = (await api('GET', '/api/admin/events')).items; const box = $('#adm-ev');
    if (!S.ev.length) return box.replaceChildren(h('div', { class: 'empty', text: 'Nenhum evento. Crie o primeiro!' }));
    box.replaceChildren(...S.ev.map((e) => h('div', { class: 'item-row' },
      h('div', {}, h('h4', { text: e.titulo }), h('p', { text: `${eventParts(e.inicio).text} · ${e.local} · ${e.confirmados} confirmado(s)` })),
      h('div', { class: 'row-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost-dark btn-xs', onclick: () => showRsvps(e), text: 'Confirmados' }),
        h('button', { type: 'button', class: 'btn btn-ghost-dark btn-xs', onclick: () => editEv(e), text: 'Editar' }),
        h('button', { type: 'button', class: 'btn btn-outline-danger btn-xs', onclick: () => delItem('evento', e.titulo, `/api/admin/events/${e.id}`, loadEv), text: 'Excluir' })))));
  }
  const editEv = (e) => openForm({ title: e ? 'Editar evento' : 'Novo evento', fields: evFields(e), submit: e ? 'Salvar' : 'Criar evento', onSubmit: async (f) => {
    const body = { titulo: val(f, 'titulo'), inicio: val(f, 'inicio'), local: val(f, 'local'), descricao: val(f, 'descricao') };
    await (e ? api('PUT', `/api/admin/events/${e.id}`, body) : api('POST', '/api/admin/events', body)); toast(e ? 'Evento atualizado.' : 'Evento criado.'); loadEv(); } });
  $('#new-ev').addEventListener('click', () => editEv());
  async function showRsvps(e) {
    const d = $('#rsvp-dlg'); $('#rsvp-title').textContent = 'Confirmados: ' + e.titulo; $('#rsvp-body').replaceChildren(h('div', { class: 'loading', text: 'Carregando…' })); d.showModal();
    try {
      const { items } = await api('GET', `/api/admin/events/${e.id}/rsvps`);
      $('#rsvp-body').replaceChildren(items.length ? h('ul', { style: 'display:grid;gap:.5rem' }, items.map((r) => h('li', {}, h('strong', { text: r.nome }), h('span', { style: 'color:var(--muted)', text: ` · ${r.cidade}/${r.estado} · ${fmtDateTime(r.confirmadoEm)}` })))) : h('div', { class: 'empty', text: 'Ninguém confirmou ainda.' }));
    } catch (err) { $('#rsvp-body').replaceChildren(h('div', { class: 'empty', text: err.message })); }
  }

  /* ---------- Materiais ---------- */
  const TYPE_LABEL = { pdf: 'PDF', doc: 'Documento', sheet: 'Planilha', slides: 'Apresentação', image: 'Imagem', video: 'Vídeo', audio: 'Áudio', archive: 'Compactado', link: 'Link', other: 'Arquivo' };
  async function loadMat() {
    S.mat = (await api('GET', '/api/admin/materials')).items; const box = $('#adm-mat');
    if (!S.mat.length) return box.replaceChildren(h('div', { class: 'empty', text: 'Nenhum material. Envie o primeiro!' }));
    box.replaceChildren(...S.mat.map((m) => h('div', { class: 'item-row' },
      h('div', { style: 'display:flex;gap:.9rem;align-items:center;min-width:0' },
        h('div', { class: `mat-ico t-${m.tipo}`, style: 'width:42px;height:48px', 'aria-hidden': 'true' }, icon('t_' + m.tipo), h('b', { text: (m.ext || 'url').slice(0, 4), style: 'font-size:.55rem;bottom:3px' })),
        h('div', { style: 'min-width:0' }, h('h4', { text: m.titulo }), h('p', { text: `${TYPE_LABEL[m.tipo] || 'Arquivo'} · ${m.categoria}${m.tipo !== 'link' ? ' · ' + fmtSize(m.tamanho) : ''} · ${fmtDate(m.criadoEm)}${m.nomeOriginal ? ' · ' + m.nomeOriginal : ''}` }))),
      h('div', { class: 'row-actions' },
        m.tipo !== 'link' ? h('button', { type: 'button', class: 'btn btn-ghost-dark btn-xs', text: 'Baixar', onclick: (e) => { const b = e.currentTarget; busy(b, true, 'Baixando…'); downloadMaterial(m.id).catch((err) => toast(err.message)).finally(() => busy(b, false)); } }) : null,
        h('button', { type: 'button', class: 'btn btn-ghost-dark btn-xs', onclick: () => editMat(m), text: 'Editar' }),
        h('button', { type: 'button', class: 'btn btn-outline-danger btn-xs', onclick: () => delItem('material', m.titulo, `/api/admin/materials/${m.id}`, loadMat), text: 'Excluir' })))));
  }
  const cats = () => [...new Set(S.mat.map((m) => m.categoria))];
  function editMat(m) {
    openForm({ title: 'Editar material', fields: [
      { name: 'titulo', label: 'Título', required: true, max: 140, value: m.titulo },
      m.tipo === 'link' ? { name: 'url', label: 'Link (http/https)', type: 'url', required: true, max: 500, value: m.url } : null,
      { name: 'categoria', label: 'Categoria', max: 40, value: m.categoria, list: cats() },
      { name: 'descricao', label: 'Descrição', type: 'textarea', max: 1000, rows: 3, value: m.descricao }].filter(Boolean),
    onSubmit: async (f) => { await api('PUT', `/api/admin/materials/${m.id}`, { titulo: val(f, 'titulo'), url: m.tipo === 'link' ? val(f, 'url') : undefined, categoria: val(f, 'categoria'), descricao: val(f, 'descricao') }); toast('Material atualizado.'); loadMat(); } });
  }
  $('#new-link').addEventListener('click', () => openForm({ title: 'Novo link externo', submit: 'Adicionar', fields: [
    { name: 'titulo', label: 'Título', required: true, max: 140 }, { name: 'url', label: 'Link (http/https)', type: 'url', required: true, max: 500, placeholder: 'https://…' },
    { name: 'categoria', label: 'Categoria', max: 40, value: 'Geral', list: cats() }, { name: 'descricao', label: 'Descrição', type: 'textarea', max: 1000, rows: 3 }],
  onSubmit: async (f) => { await api('POST', '/api/admin/materials', { titulo: val(f, 'titulo'), url: val(f, 'url'), categoria: val(f, 'categoria'), descricao: val(f, 'descricao') }); toast('Link adicionado.'); loadMat(); } }));
  $('#new-file').addEventListener('click', () => openForm({ title: 'Enviar arquivo', submit: 'Enviar', fields: [
    { name: 'file', label: 'Arquivo (qualquer formato)', type: 'file', required: true, help: `Tamanho máximo: ${(S.stats && S.stats.limiteMb) || 4} MB por arquivo (plano gratuito).` },
    { name: 'titulo', label: 'Título', max: 140, help: 'Se vazio, usa o nome do arquivo.' },
    { name: 'categoria', label: 'Categoria', max: 40, value: 'Geral', list: cats() }, { name: 'descricao', label: 'Descrição', type: 'textarea', max: 1000, rows: 3 }],
  onSubmit: (f) => uploadFile(f) }));
  async function uploadFile(f) {
    const file = f.elements.file.files[0];
    if (!file) { const e = new B.ApiError('Selecione um arquivo.', 422, { errors: { file: 'Selecione um arquivo.' } }); throw e; }
    const max = ((S.stats && S.stats.limiteMb) || 4) * 1024 * 1024;
    if (file.size > max) throw new B.ApiError('Arquivo maior que o limite de 4 MB.', 413, { errors: { file: 'Arquivo maior que o limite de 4 MB.' } });
    const bar = $('#dlg-progress'); bar.hidden = false; const fill = $('i', bar); fill.style.width = '15%';
    const dados = await fileToBase64(file); fill.style.width = '45%';
    try { await api('POST', '/api/admin/materials', { titulo: val(f, 'titulo'), categoria: val(f, 'categoria'), descricao: val(f, 'descricao'), nome: file.name, dados }); }
    finally { fill.style.width = '100%'; }
    toast('Arquivo enviado.'); loadMat(); loadStats().catch(() => {});
  }
  /* ---------- Membros ---------- */
  const filters = () => ({ q: $('#mem-q').value.trim(), role: $('#mem-role').value, status: $('#mem-status').value });
  const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString();
  async function loadMembers() {
    const f = filters(); const d = await api('GET', '/api/admin/members?' + qs({ ...f, page: S.memPage, size: S.memSize }));
    const body = $('#mem-body');
    if (!d.items.length) body.replaceChildren(h('tr', {}, h('td', { colspan: 8, class: 'loading', text: 'Nenhum membro encontrado.' })));
    else body.replaceChildren(...d.items.map(memberRow));
    const pages = Math.max(1, Math.ceil(d.total / d.size));
    $('#mem-info').textContent = `${d.total} membro(s) · página ${d.page} de ${pages}`;
    $('#mem-prev').disabled = d.page <= 1; $('#mem-next').disabled = d.page >= pages;
  }
  function memberRow(u) {
    const self = S.me && u.id === S.me.id;
    const td = (label, ...kids) => h('td', { 'data-label': label }, ...kids);
    return h('tr', {},
      td('Nome', h('strong', { text: `${u.nome} ${u.sobrenome}` })), td('E-mail', u.email), td('CPF', h('span', { class: 'mono', text: u.cpfMasked || '—' })),
      td('Local', `${u.cidade}/${u.estado}${u.pais !== 'Brasil' ? ' · ' + u.pais : ''}`),
      td('Papel', h('span', { class: 'badge' + (u.role === 'admin' ? ' admin' : ''), text: u.role === 'admin' ? 'Admin' : 'Membro' })),
      td('Situação', stBadge(u.status)),
      td('Cadastro', fmtDate(u.criadoEm)),
      td('Ações', self ? h('small', { text: '(você)' }) : h('div', { class: 'row-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost-dark btn-xs', text: u.role === 'admin' ? 'Rebaixar' : 'Promover', 'aria-label': `${u.role === 'admin' ? 'Rebaixar' : 'Promover'} ${u.nome}`, onclick: () => patchMember(u, { role: u.role === 'admin' ? 'member' : 'admin' }, u.role === 'admin' ? 'Rebaixar a membro' : 'Promover a administrador') }),
        u.status !== 'verificado' ? h('button', { type: 'button', class: 'btn btn-xs btn-approve', text: 'Aprovar', 'aria-label': `Aprovar ${u.nome}`, onclick: () => setStatus(u, 'verificado') }) : null,
        u.status !== 'nao_verificado' && u.role !== 'admin' ? h('button', { type: 'button', class: 'btn btn-ghost-dark btn-xs', text: 'Não verificado', 'aria-label': `Voltar ${u.nome} para não verificado`, onclick: () => setStatus(u, 'nao_verificado') }) : null,
        u.status !== 'banido' && u.role !== 'admin' ? h('button', { type: 'button', class: 'btn btn-xs btn-outline-danger', text: 'Recusar/Banir', 'aria-label': `Recusar ou banir ${u.nome}`, onclick: () => setStatus(u, 'banido') }) : null,
        u.redes && Object.keys(u.redes).length ? h('button', { type: 'button', class: 'btn btn-ghost-dark btn-xs', text: 'Redes', onclick: () => confirmBox({ title: `Redes sociais: ${u.nome}`, okLabel: 'Fechar', danger: false, body: socialLinks(u.redes), onOk: async () => {} }) }) : null,
        h('button', { type: 'button', class: 'btn btn-ghost-dark btn-xs', text: 'Link de senha', onclick: () => resetLink(u) }))));
  }
  async function resetLink(u) {
    try {
      const r = await api('POST', `/api/admin/members/${u.id}/reset-link`, {});
      const link = url('/membros/redefinir-senha') + '?token=' + r.token;
      const inp = h('input', { type: 'text', readonly: true, value: link, style: 'width:100%', 'aria-label': 'Link de redefinição' });
      confirmBox({ title: 'Link de redefinição de senha', okLabel: 'Copiar link', danger: false, body: [h('p', { text: `Envie este link para ${u.nome} (válido por 24 horas, uso único):` }), inp],
        onOk: async () => { inp.select(); try { await navigator.clipboard.writeText(link); toast('Link copiado.'); } catch (_) { document.execCommand('copy'); } } });
    } catch (err) { toast(err.message); }
  }
  function patchMember(u, body, label) {
    confirmBox({ title: label, okLabel: label.split(' ')[0], danger: body.role === 'member', body: h('p', {}, `${label}: `, h('strong', { text: `${u.nome} ${u.sobrenome}` }), ` (${u.email})?`),
      onOk: async () => { await api('PATCH', `/api/admin/members/${u.id}`, body); toast('Membro atualizado.'); loadMembers(); } });
  }
  let t; const reload = () => { clearTimeout(t); t = setTimeout(() => { S.memPage = 1; loadMembers().catch((e) => toast(e.message)); }, 250); };
  $('#mem-q').addEventListener('input', reload); $('#mem-role').addEventListener('change', reload); $('#mem-status').addEventListener('change', reload);
  $('#mem-prev').addEventListener('click', () => { S.memPage--; loadMembers(); }); $('#mem-next').addEventListener('click', () => { S.memPage++; loadMembers(); });
  $('#csv-link').addEventListener('click', async () => {
    try { const r = await api('GET', '/api/admin/members.csv?' + qs(filters())); saveBlob(new Blob([r.csv], { type: 'text/csv;charset=utf-8' }), 'membros-bravo.csv'); } catch (err) { toast(err.message); }
  });
  $('#csv-full').addEventListener('click', () => {
    const conf = h('input', { type: 'text', id: 'cf-confirm', name: 'confirm', autocomplete: 'off', placeholder: 'CONFIRMO' });
    const pass = h('input', { type: 'password', id: 'cf-pass', name: 'senha', autocomplete: 'current-password', maxlength: 72 });
    confirmBox({ title: 'Exportar CPF completo', okLabel: 'Exportar', body: [
      h('div', { class: 'alert alert-info', text: 'Atenção (LGPD): o arquivo conterá CPFs completos. Use apenas quando indispensável, guarde com segurança e não compartilhe. A ação fica registrada em auditoria.' }),
      h('div', { class: 'field' }, h('label', { for: 'cf-confirm', text: 'Digite CONFIRMO para continuar' }), conf),
      h('div', { class: 'field' }, h('label', { for: 'cf-pass', text: 'Sua senha de administrador' }), pass)],
    onOk: async () => {
      const r = await api('POST', '/api/admin/members/export-full', { confirm: conf.value.trim(), senha: pass.value });
      saveBlob(new Blob([r.csv], { type: 'text/csv;charset=utf-8' }), 'membros-cpf-completo.csv');
    } });
  });

  /* ---------- Início ---------- */
  (async () => {
    try {
      S.me = (await api('GET', '/api/me')).user;
      if (S.me.role !== 'admin' || S.me.status !== 'verificado') { location.href = url('/membros'); return; }
      $('#user-name').textContent = S.me.nome; $('#user-avatar').textContent = initials(S.me.nome, S.me.sobrenome);
    } catch (_) { return; }
    loadStats().then(() => {}).catch(() => {});
    showTab(location.hash.slice(1));
  })();
})();
