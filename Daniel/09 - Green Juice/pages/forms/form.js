/* ============================================================
   Green Juice — validação e máscara do formulário de captação
   ============================================================ */

(() => {
  const form = document.getElementById('lead-form');
  const success = document.getElementById('sucesso');
  const newOrder = document.getElementById('novo-pedido');
  const cardHead = document.querySelector('.card__head');
  const phone = document.getElementById('whatsapp');
  const saborField = document.getElementById('sabor');
  const saborNote = document.getElementById('sabor-note');
  const procura = document.getElementById('procura');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  const rules = {
    nome: (value) =>
      value.trim().split(/\s+/).filter(Boolean).length >= 2
        ? ''
        : 'Informe seu nome e sobrenome.',
    whatsapp: (value) =>
      /^\d{11}$/.test(value.replace(/\D/g, ''))
        ? ''
        : 'Informe o WhatsApp com DDD, com 11 dígitos.',
    email: (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
        ? ''
        : 'Informe um e-mail válido.',
    procura: (value) => (value ? '' : 'Escolha o que você procura.'),
    entrega: (value) =>
      value.trim().length >= 3
        ? ''
        : 'Informe o bairro e a cidade para entrega.',
    frequencia: (value) => (value ? '' : 'Escolha a quantidade de sucos.'),
  };

  function setError(id, message) {
    const input = document.getElementById(id);
    const error = document.getElementById('err-' + id);
    if (!input) return;

    if (message) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
    if (error) error.textContent = message;
  }

  function validateField(id) {
    const input = document.getElementById(id);
    if (!input || !rules[id]) return true;
    const message = rules[id](input.value);
    setError(id, message);
    return !message;
  }

  function validateForm() {
    let firstInvalid = null;
    Object.keys(rules).forEach((id) => {
      if (!validateField(id) && !firstInvalid) {
        firstInvalid = document.getElementById(id);
      }
    });
    return firstInvalid;
  }

  /* ---------- Máscara: (00) 00000-0000 ---------- */

  function formatPhone(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return '(' + digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  phone.addEventListener('input', () => {
    phone.value = formatPhone(phone.value);
  });

  /* ---------- Validação enquanto digita ---------- */

  Object.keys(rules).forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('blur', () => {
      if (input.value !== '' || input.getAttribute('aria-invalid') === 'true') {
        validateField(id);
      }
    });

    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(id);
    });
  });

  /* ---------- Envio ---------- */

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const invalid = validateForm();
    if (invalid) {
      invalid.focus({ preventScroll: true });
      invalid.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
      return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());

    form.hidden = true;
    if (cardHead) cardHead.hidden = true;
    success.hidden = false;
    success.focus();
    success.scrollIntoView({ block: 'center', behavior: scrollBehavior() });

    // Evento de conversão para a integração de analytics/CRM.
    window.dispatchEvent(new CustomEvent('greenjuice:lead', { detail: payload }));
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: 'lead_form_submit', ...payload });
    }
  });

  /* ---------- Enviar outro pedido ---------- */

  newOrder.addEventListener('click', () => {
    form.reset();
    Object.keys(rules).forEach((id) => setError(id, ''));
    saborField.value = '';
    saborNote.hidden = true;
    saborNote.textContent = '';
    success.hidden = true;
    if (cardHead) cardHead.hidden = false;
    form.hidden = false;
    form.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    document.getElementById('nome').focus({ preventScroll: true });
  });

  /* ---------- Sabor de interesse vindo da vitrine ---------- */

  const params = new URLSearchParams(window.location.search);
  const sabor = (params.get('sabor') || '').trim().slice(0, 60);

  if (sabor) {
    saborField.value = sabor;
    saborNote.textContent = 'Sabor de interesse: ' + sabor;
    saborNote.hidden = false;
    if (!procura.value) {
      procura.value = 'Kit de degustação';
    }
  }
})();
