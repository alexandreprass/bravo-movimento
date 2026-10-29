(() => {
  'use strict';
  const { $, url, api, setError, clearErrors, showAlert, busy, initPwToggles } = window.BRAVO;
  const alertBox = $('#form-alert');
  const f1 = $('#forgot-form'), f2 = $('#reset-form');
  if (f1) f1.addEventListener('submit', async (e) => {
    e.preventDefault(); clearErrors(f1); showAlert(alertBox, '');
    const email = f1.elements.email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { setError(email, 'Informe um e-mail válido.'); email.focus(); return; }
    const btn = $('#submit-btn'); busy(btn, true, 'Enviando…');
    try {
      const r = await api('POST', '/api/auth/forgot', { email: email.value.trim() }, { noRedirect: true });
      showAlert(alertBox, r.message || 'Se o e-mail estiver cadastrado, você receberá as instruções em instantes.', 'ok');
      f1.reset();
    } catch (err) { showAlert(alertBox, err.message); }
    busy(btn, false);
  });
  if (f2) {
    initPwToggles(f2);
    const token = new URLSearchParams(location.search).get('token') || '';
    if (!token) showAlert(alertBox, 'Link inválido. Solicite uma nova redefinição de senha.', 'error');
    f2.addEventListener('submit', async (e) => {
      e.preventDefault(); clearErrors(f2); showAlert(alertBox, '');
      const s = f2.elements.senha, c = f2.elements.confirmarSenha;
      if (s.value.length < 8) { setError(s, 'A senha deve ter no mínimo 8 caracteres.'); s.focus(); return; }
      if (s.value !== c.value) { setError(c, 'As senhas não conferem.'); c.focus(); return; }
      const btn = $('#submit-btn'); busy(btn, true, 'Salvando…');
      try {
        await api('POST', '/api/auth/reset', { token, senha: s.value, confirmarSenha: c.value }, { noRedirect: true });
        location.href = url('/membros/login') + '?senha=1';
      } catch (err) { busy(btn, false); showAlert(alertBox, err.message); }
    });
  }
})();
