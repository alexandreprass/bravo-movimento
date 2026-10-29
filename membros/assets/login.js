(() => {
  'use strict';
  const { $, url, api, setError, clearErrors, showAlert, busy, initPwToggles, setCsrf, safeNext } = window.BRAVO;
  const form = $('#login-form'), alertBox = $('#form-alert');
  initPwToggles(form);
  const q = new URLSearchParams(location.search);
  if (q.get('saiu')) { showAlert(alertBox, 'Você saiu da sua conta com segurança.', 'ok'); }
  else if (q.get('senha')) { showAlert(alertBox, 'Senha alterada! Entre com a nova senha.', 'ok'); }
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); clearErrors(form); showAlert(alertBox, '');
    const email = form.elements.email, senha = form.elements.senha; let ok = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { setError(email, 'Informe um e-mail válido.'); ok = false; }
    if (!senha.value) { setError(senha, 'Informe sua senha.'); ok = false; }
    if (!ok) { (form.querySelector('.invalid input') || email).focus(); return; }
    const btn = $('#submit-btn'); busy(btn, true, 'Entrando…');
    try {
      const res = await api('POST', '/api/auth/login', { email: email.value.trim(), senha: senha.value }, { noRedirect: true });
      setCsrf(res.csrf);
      location.href = safeNext(q.get('next') || url('/membros'));
    } catch (err) {
      busy(btn, false); showAlert(alertBox, err.message); senha.value = ''; senha.focus();
    }
  });
})();
