/* ============================================================
   Green Juice — integrações de contato (WhatsApp / Instagram)

   Preencha os dados abaixo (ou defina window.GREEN_JUICE_CONTACT
   antes deste script, em outra tag <script>). Enquanto estiverem
   vazios, os links e o botão flutuante ficam ocultos.
   ============================================================ */

(() => {
  const CONTACT = Object.assign(
    {
      whatsapp: '', // ex.: '5511999999999' (DDI + DDD + número, só dígitos)
      instagram: '', // ex.: 'https://instagram.com/greenjuice'
      message: 'Olá! Quero saber mais sobre o kit de degustação da Green Juice.',
    },
    window.GREEN_JUICE_CONTACT || {}
  );

  const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
  const whatsapp = onlyDigits(CONTACT.whatsapp);

  if (whatsapp) {
    document.documentElement.classList.add('has-wa');
  }

  const hide = (el) => {
    el.hidden = true;
    const item = el.closest('li');
    if (item) item.hidden = true;
  };

  document.querySelectorAll('[data-wa]').forEach((el) => {
    if (!whatsapp) {
      hide(el);
      return;
    }
    el.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(CONTACT.message)}`;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });

  document.querySelectorAll('[data-instagram]').forEach((el) => {
    if (!CONTACT.instagram) {
      hide(el);
      return;
    }
    el.href = CONTACT.instagram;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });

  document.querySelectorAll('[data-contact-block]').forEach((block) => {
    const hasLink = block.querySelector(
      '[data-wa]:not([hidden]), [data-instagram]:not([hidden])'
    );
    if (!hasLink) block.hidden = true;
  });

  if (!whatsapp) {
    console.info(
      '[Green Juice] WhatsApp não configurado: preencha CONTACT.whatsapp em main.js para exibir o botão flutuante e os links.'
    );
  }
})();
