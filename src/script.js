// LUMOVA · Página de Serviços
(function () {
  document.documentElement.classList.add('js');

  // Header com fundo ao rolar
  const header = document.querySelector('.header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Menu mobile
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // Entrada suave dos blocos
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 3) * 80}ms`;
      io.observe(el);
    });
  } else {
    items.forEach((el) => el.classList.add('is-visible'));
  }

  // Etapas de "Como trabalhamos"
  const STEPS = [
    { title: 'Entender', text: 'Mapear o problema real e os pontos do processo como ele acontece, não como está no manual.' },
    { title: 'Priorizar', text: 'Escolher onde o ganho é maior e o risco é gerenciável. Poucas frentes, bem escolhidas.' },
    { title: 'Redesenhar', text: 'Refazer partes do processo e colocar IA nas etapas em que ela muda o resultado.' },
    { title: 'Medir', text: 'Comparar antes e depois, ajustar e só então escalar para outras áreas.' },
  ];

  const stepper = document.getElementById('stepper');
  const buttons = stepper.querySelectorAll('[data-step]');
  const panel = stepper.querySelector('.stepper__panel');
  const titleEl = document.getElementById('step-title');
  const textEl = document.getElementById('step-text');
  const currentEl = document.getElementById('step-current');
  const barEl = document.getElementById('step-bar');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = 0;
  let timer = null;

  const goTo = (index) => {
    active = index;
    buttons.forEach((b, i) => {
      b.classList.toggle('is-active', i === index);
      b.setAttribute('aria-selected', String(i === index));
    });
    titleEl.textContent = STEPS[index].title;
    textEl.textContent = STEPS[index].text;
    currentEl.textContent = String(index + 1);
    barEl.style.width = `${((index + 1) / STEPS.length) * 100}%`;
    panel.classList.remove('is-changing');
    void panel.offsetWidth; // reinicia a animação
    panel.classList.add('is-changing');
  };

  const start = () => {
    if (reduceMotion || timer) return;
    timer = setInterval(() => goTo((active + 1) % STEPS.length), 5000);
  };
  const stop = () => { clearInterval(timer); timer = null; };

  buttons.forEach((b) => b.addEventListener('click', () => {
    stop();
    goTo(Number(b.dataset.step));
  }));

  // Avança sozinho apenas enquanto a seção estiver visível e sem interação
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), { threshold: 0.4 })
      .observe(stepper);
  }
  stepper.addEventListener('mouseenter', stop);

  // Formulário de contato
  // Envio via Formspree (serviço externo). Destino do e-mail é configurado no painel do Formspree.
  const CONTACT_EMAIL = 'contato@lumova.com.br';
  const FORM_ENDPOINT = 'https://formspree.io/f/myezvoar';
  const ERROR_MESSAGES = {
    campos: 'Confira nome, e-mail, serviço e mensagem e tente de novo.',
    limite: 'Recebemos várias mensagens seguidas deste endereço. Aguarde alguns minutos e tente de novo.',
  };

  const modal = document.getElementById('contact-modal');
  const form = document.getElementById('contact-form');
  const success = document.getElementById('form-success');
  const errorEl = document.getElementById('form-error');
  const submitBtn = document.getElementById('form-submit');
  const serviceSelect = document.getElementById('f-servico');
  const supportsDialog = typeof modal.showModal === 'function';

  const resetForm = () => {
    form.hidden = false;
    success.hidden = true;
    errorEl.hidden = true;
    form.querySelectorAll('.is-invalid').forEach((f) => f.classList.remove('is-invalid'));
  };

  const openForm = (service) => {
    resetForm();
    serviceSelect.value = service || '';
    setMenu(false);
    modal.showModal();
    document.body.classList.add('modal-open');
    document.getElementById('f-nome').focus();
  };

  const closeForm = () => modal.close();
  modal.addEventListener('close', () => document.body.classList.remove('modal-open'));
  // Fecha ao clicar fora da caixa
  modal.addEventListener('click', (e) => { if (e.target === modal) closeForm(); });
  modal.querySelectorAll('[data-close-form]').forEach((b) => b.addEventListener('click', closeForm));

  // Sem suporte a <dialog>, os botões seguem para a seção de contato
  if (supportsDialog) {
    document.querySelectorAll('[data-open-form]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openForm(el.dataset.service);
      });
    });
  }

  const showError = (html) => {
    errorEl.innerHTML = html;
    errorEl.hidden = false;
  };

  const validate = () => {
    let firstInvalid = null;
    ['f-nome', 'f-email', 'f-servico', 'f-mensagem'].forEach((id) => {
      const input = document.getElementById(id);
      const ok = input.value.trim() !== '' && input.checkValidity();
      input.closest('.field').classList.toggle('is-invalid', !ok);
      if (!ok && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      showError('Preencha nome, um e-mail válido, o serviço de interesse e a mensagem para enviar.');
      firstInvalid.focus();
      return false;
    }
    errorEl.hidden = true;
    return true;
  };

  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field');
    if (field && field.classList.contains('is-invalid') && e.target.checkValidity() && e.target.value.trim()) {
      field.classList.remove('is-invalid');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const data = Object.fromEntries(new FormData(form));
    if (data._honey) return; // provável robô

    const label = submitBtn.querySelector('span');
    submitBtn.disabled = true;
    label.textContent = 'Enviando…';

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const code = response.status === 429 ? 'limite' : 'campos';
        const error = new Error(code);
        error.code = code;
        throw error;
      }
      form.reset();
      form.hidden = true;
      success.hidden = false;
    } catch (error) {
      console.error('Error in contact form submit:', error);
      if (ERROR_MESSAGES[error.code]) return showError(ERROR_MESSAGES[error.code]);
      showError(`Não foi possível enviar agora. Tente novamente em instantes ou escreva para <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`);
    } finally {
      submitBtn.disabled = false;
      label.textContent = 'Enviar mensagem';
    }
  });

  // WhatsApp
  // Preencha com DDI + DDD + número, só dígitos (ex.: '5511999999999').
  // Enquanto estiver vazio, a seção de WhatsApp não aparece na página.
  const WHATSAPP_NUMERO = '5554999055399';
  const WHATSAPP_MENSAGEM = 'Olá, estou interessado/a nos serviços da Lumova, podemos conversar?';

  const whatsSection = document.getElementById('whatsapp');
  const whatsNumber = WHATSAPP_NUMERO.replace(/\D/g, '');
  if (whatsNumber) {
    const url = `https://wa.me/${whatsNumber}?text=${encodeURIComponent(WHATSAPP_MENSAGEM)}`;
    document.querySelectorAll('[data-whatsapp]').forEach((a) => { a.href = url; });
    whatsSection.hidden = false;
  }

  // Ano no rodapé
  document.getElementById('year').textContent = new Date().getFullYear();
})();
