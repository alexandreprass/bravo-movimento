/* Cadastro de membro: máscaras, validação (CPF com dígitos verificadores) e envio. */
(() => {
  'use strict';
  const { $, $$, url, api, maskCpf, maskPhoneBR, isValidCpf, digits, setError, clearErrors, applyServerErrors, showAlert, busy, initPwToggles, setCsrf } = window.BRAVO;
  const form = $('#register-form'), alertBox = $('#form-alert');
  const el = (n) => form.elements[n];
  initPwToggles(form);

  const isBrazil = () => el('pais').value === 'Brasil';
  const countryValue = () => (el('pais').value === '__outro' ? el('paisOutro').value.trim() : el('pais').value);
  const stateEl = () => (isBrazil() ? el('estado') : el('estadoTxt'));

  function syncCountry() {
    const br = isBrazil();
    const outro = el('pais').value === '__outro';
    el('paisOutro').hidden = !outro;
    el('estado').hidden = !br; el('estado').disabled = !br;
    el('estadoTxt').hidden = br; el('estadoTxt').disabled = br;
    $('#cpf-req').hidden = !br; $('#cpf-opt').hidden = br;
    el('cpf').required = br;
    el('telefone').placeholder = br ? '(11) 91234-5678' : '+351 912 345 678';
    el('telefone').maxLength = br ? 16 : 20;
    $('#estado-label').firstChild.textContent = br ? 'Estado ' : 'Estado / província ';
    el('telefone').value = br ? maskPhoneBR(el('telefone').value) : el('telefone').value;
  }
  el('pais').addEventListener('change', () => { syncCountry(); if (el('pais').value === '__outro') el('paisOutro').focus(); });

  el('cpf').addEventListener('input', () => { el('cpf').value = maskCpf(el('cpf').value); });
  el('telefone').addEventListener('input', () => { if (isBrazil()) el('telefone').value = maskPhoneBR(el('telefone').value); else el('telefone').value = el('telefone').value.replace(/[^\d+()\-\s]/g, ''); });

  /* força da senha (indicativo) */
  const bar = $('#pw-strength'), label = $('#pw-strength-label');
  el('senha').addEventListener('input', () => {
    const v = el('senha').value; let s = 0;
    if (v.length >= 8) s++; if (v.length >= 12) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
    const pct = v ? Math.max(12, s * 20) : 0, names = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'];
    bar.style.width = pct + '%'; bar.style.background = s <= 1 ? '#b3261e' : s <= 2 ? '#c9811a' : s <= 3 ? '#b88a22' : '#1d7a46';
    label.textContent = v ? 'Força da senha: ' + names[s] : '\u00a0';
  });

  const NAME_RE = /^[\p{L}][\p{L}\p{M}'’.\- ]{1,59}$/u;
  const rules = {
    nome: (v) => NAME_RE.test(v.trim()) || 'Informe seu nome (apenas letras).',
    sobrenome: (v) => NAME_RE.test(v.trim()) || 'Informe seu sobrenome (apenas letras).',
    pais: () => countryValue().length >= 2 || 'Informe o país.',
    paisOutro: () => (el('pais').value !== '__outro' || el('paisOutro').value.trim().length >= 2) || 'Digite o nome do país.',
    cpf: (v) => { if (!isBrazil() && !v.trim()) return true; if (!v.trim()) return 'Informe seu CPF.'; return isValidCpf(v) || 'CPF inválido. Confira os números.'; },
    estado: (v) => (!isBrazil() || v !== '') || 'Selecione o estado.',
    estadoTxt: (v) => (isBrazil() || v.trim().length >= 2) || 'Informe o estado/província.',
    cidade: (v) => v.trim().length >= 2 || 'Informe sua cidade.',
    telefone: (v) => { const n = digits(v); return (isBrazil() ? (n.length === 10 || n.length === 11) : (n.length >= 7 && n.length <= 15)) || (isBrazil() ? 'Informe DDD + número (ex.: (11) 91234-5678).' : 'Informe um telefone válido com DDI.'); },
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Informe um e-mail válido.',
    senha: (v) => v.length >= 8 || 'A senha deve ter no mínimo 8 caracteres.',
    confirmarSenha: (v) => (v === el('senha').value && v.length > 0) || 'As senhas não conferem.',
    lgpd: () => el('lgpd').checked || 'É necessário consentir para criar a conta.'
  };
  /* Redes sociais: ao menos uma; cada uma deve ser @usuário ou link http(s) */
  const REDES = ['instagram', 'facebook', 'x', 'tiktok', 'youtube', 'telegram', 'outro'];
  const HANDLE_RE = /^@?[A-Za-z0-9._-]{2,60}$/;
  function socialMsg(k, v) {
    v = v.trim(); if (!v) return '';
    if (/^https?:\/\//i.test(v)) { try { const u = new URL(v); return /\./.test(u.hostname) ? '' : 'Link inválido.'; } catch (_) { return 'Link inválido.'; } }
    if (k === 'outro') return /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(\/\S*)?$/.test(v) ? '' : 'Informe um link completo (https://…).';
    return HANDLE_RE.test(v) ? '' : 'Informe o @usuário ou o link do perfil.';
  }
  function setRedesError(msg) { $('#redes-error').textContent = msg || ''; $('#redes-box').classList.toggle('invalid', !!msg); }
  function validateRedes(showEmpty = true) {
    let ok = true, filled = 0;
    REDES.forEach((k) => { const i = el('rede_' + k), m = socialMsg(k, i.value); if (i.value.trim()) filled++; setError(i, m); if (m) ok = false; });
    if (!filled) { if (showEmpty) setRedesError('Informe ao menos uma rede social.'); return false; }
    setRedesError(''); return ok;
  }
  REDES.forEach((k) => { const i = el('rede_' + k); i.addEventListener('blur', () => { if (i.value.trim()) validateRedes(false); }); i.addEventListener('input', () => { if ($('#redes-box').classList.contains('invalid') || i.closest('.field').classList.contains('invalid')) validateRedes(false); }); });
  const redesBody = () => Object.fromEntries(REDES.map((k) => [k, el('rede_' + k).value.trim()]).filter(([, v]) => v));

  const fieldsToCheck = ['nome', 'sobrenome', 'pais', 'paisOutro', 'cpf', 'estado', 'estadoTxt', 'cidade', 'telefone', 'email', 'senha', 'confirmarSenha', 'lgpd'];
  function validate(name) {
    const input = el(name); if (!input || input.disabled || input.hidden && name !== 'paisOutro') { return true; }
    const r = rules[name](input.value || '');
    if (name === 'paisOutro') { if (el('pais').value !== '__outro') return true; setError(el('paisOutro'), r === true ? '' : r); return r === true; }
    setError(input, r === true ? '' : r);
    return r === true;
  }
  fieldsToCheck.forEach((n) => {
    const input = el(n); if (!input) return;
    input.addEventListener('blur', () => { if (input.value || input.type === 'checkbox') validate(n); });
    const re = () => { if (input.closest('.field').classList.contains('invalid')) validate(n); if (n === 'senha' && el('confirmarSenha').value) validate('confirmarSenha'); };
    input.addEventListener('input', re); input.addEventListener('change', re);
  });

  /* Pré-preenchimento vindo do formulário rápido da página inicial */
  try {
    const raw = sessionStorage.getItem('bravo_prefill');
    if (raw) {
      const p = JSON.parse(raw); sessionStorage.removeItem('bravo_prefill');
      const parts = String(p.nome || '').trim().split(/\s+/);
      el('nome').value = parts.shift() || ''; el('sobrenome').value = parts.join(' ');
      el('email').value = p.email || ''; el('telefone').value = maskPhoneBR(p.telefone || ''); el('cidade').value = p.cidade || '';
      if (/^[A-Z]{2}$/.test(p.uf || '')) el('estado').value = p.uf;
    }
  } catch (_) { /* ignorar */ }
  syncCountry();

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); showAlert(alertBox, '');
    const bad = fieldsToCheck.filter((n) => !validate(n));
    const redesOk = validateRedes(true);
    if (!redesOk) bad.push('rede_' + (REDES.find((k) => el('rede_' + k).closest('.field').classList.contains('invalid')) || 'instagram'));
    bad.sort((a, b) => (el(a).compareDocumentPosition(el(b)) & 4 ? -1 : 1));
    if (bad.length) { const f = el(bad[0]); f.focus(); showAlert(alertBox, 'Corrija os campos destacados para continuar.'); return; }
    const btn = $('#submit-btn'); busy(btn, true, 'Criando conta…');
    try {
      const res = await api('POST', '/api/auth/register', {
        nome: el('nome').value.trim(), sobrenome: el('sobrenome').value.trim(),
        pais: countryValue(), estado: isBrazil() ? el('estado').value : el('estadoTxt').value.trim(),
        cidade: el('cidade').value.trim(), cpf: el('cpf').value.trim(), telefone: el('telefone').value.trim(),
        email: el('email').value.trim(), senha: el('senha').value, confirmarSenha: el('confirmarSenha').value, lgpd: el('lgpd').checked, redes: redesBody()
      }, { noRedirect: true });
      location.href = url('/membros') + '?bemvindo=1';
    } catch (err) {
      busy(btn, false);
      const errs = { ...err.errors };
      if (errs.estado && !isBrazil()) { errs.estadoTxt = errs.estado; delete errs.estado; }
      if (errs.pais && el('pais').value === '__outro') { errs.paisOutro = errs.pais; delete errs.pais; }
      if (errs.redes) { setRedesError(errs.redes); delete errs.redes; if (!Object.keys(errs).length) el('rede_instagram').focus(); }
      const had = applyServerErrors(form, errs) || !!err.errors.redes;
      showAlert(alertBox, had ? (err.message || 'Corrija os campos destacados.') : err.message);
      alertBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
})();
