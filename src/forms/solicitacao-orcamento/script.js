// LUMOVA · Solicitação de Orçamento
// Formulário standalone — envia para um Google Apps Script Web App
// que grava cada submissão em uma planilha (data, contato, empresa, processo, etc.).
// O endpoint fica em SHEET_ENDPOINT, abaixo. Veja apps-script.gs para o backend.

(function () {
  'use strict';

  /* ═════ CONFIG ═════ */
  const SHEET_ENDPOINT = ''; // cole aqui a URL do Web App do Google Apps Script
  const CONTACT_EMAIL = 'contato@lumova.com.br';
  const STORAGE_KEY = 'lumova_orc_draft_v2';
  const MAX_FILES = 6;
  const MAX_FILE_MB = 5;

  /* ═════ REVEAL ═════ */
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    revealItems.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 3) * 70}ms`;
      io.observe(el);
    });
  } else {
    revealItems.forEach((el) => el.classList.add('is-visible'));
  }

  /* ═════ WIZARD ═════ */
  const form = document.getElementById('orc-form');
  const steps = Array.from(form.querySelectorAll('.step'));
  const tabs = Array.from(document.querySelectorAll('.wizard__tabs [data-goto]'));
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnSubmit = document.getElementById('btn-submit');
  const stepCurrent = document.getElementById('step-current');
  const stepTotal = document.getElementById('step-total');
  const stepLabel = document.getElementById('step-label');
  const stepBar = document.getElementById('step-bar');
  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('success');
  const saveBadge = document.getElementById('btn-save');

  const STEP_LABELS = ['Contato', 'Empresa', 'Sistemas', 'Processo', 'Volume', 'Anexos importantes'];
  stepTotal.textContent = String(steps.length);

  let active = 0;

  const showStep = (i, doScroll = true) => {
    active = Math.max(0, Math.min(i, steps.length - 1));
    steps.forEach((s, idx) => {
      const show = idx === active;
      s.hidden = !show;
      s.classList.toggle('is-active', show);
    });
    tabs.forEach((t, idx) => {
      t.classList.toggle('is-active', idx === active);
      t.classList.toggle('is-done', idx < active);
      t.setAttribute('aria-selected', String(idx === active));
    });
    stepCurrent.textContent = String(active + 1);
    stepLabel.textContent = STEP_LABELS[active];
    stepBar.style.width = `${((active + 1) / steps.length) * 100}%`;

    btnPrev.hidden = active === 0;
    const last = active === steps.length - 1;
    btnNext.hidden = last;
    btnSubmit.hidden = !last;

    if (last) renderSummary();
    if (doScroll) scrollToWizard();
  };

  const scrollToWizard = () => {
    const top = document.querySelector('.wizard__progress').getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  document.getElementById('btn-start').addEventListener('click', scrollToWizard);

  const validateStep = () => {
    const step = steps[active];
    const required = step.querySelectorAll('[required]');
    let firstInvalid = null;
    let firstInvalidField = null;
    step.querySelectorAll('.is-invalid').forEach((f) => f.classList.remove('is-invalid'));
    required.forEach((input) => {
      const ok = input.value.trim() !== '' && input.checkValidity();
      input.closest('.field').classList.toggle('is-invalid', !ok);
      if (!ok && !firstInvalid) firstInvalid = input;
    });

    // Etapa 3 (processo): exige ao menos 2 etapas preenchidas no builder
    let builderError = '';
    if (step.contains(builderList)) {
      const filled = readSteps();
      const builderField = document.getElementById('builder-field');
      const needsMore = filled.length < 2;
      builderField.classList.toggle('is-invalid', needsMore);
      if (needsMore) {
        builderError = filled.length === 0
          ? 'Descreva pelo menos 2 etapas do processo.'
          : 'Adicione mais uma etapa do processo (mínimo 2).';
        if (!firstInvalid) firstInvalidField = builderField;
      }
    }

    if (firstInvalid || firstInvalidField) {
      errorEl.hidden = false;
      errorEl.textContent = builderError && !firstInvalid
        ? builderError
        : 'Preencha os campos destacados para continuar.';
      const field = firstInvalid ? firstInvalid.closest('.field') : firstInvalidField;
      if (field) field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (firstInvalid) {
        const chip = firstInvalid.type === 'radio' || firstInvalid.type === 'checkbox';
        if (!chip) { try { firstInvalid.focus({ preventScroll: true }); } catch (_) {} }
      } else {
        const input = firstInvalidField.querySelector('.js-step-desc');
        if (input) { try { input.focus({ preventScroll: true }); } catch (_) {} }
      }
      return false;
    }
    errorEl.hidden = true;
    return true;
  };

  btnNext.addEventListener('click', () => { if (validateStep()) showStep(active + 1); });
  btnPrev.addEventListener('click', () => showStep(active - 1));
  tabs.forEach((t) => t.addEventListener('click', () => {
    const target = Number(t.dataset.goto);
    if (target <= active || validateStep()) showStep(target);
  }));

  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field');
    if (field && field.classList.contains('is-invalid') && e.target.checkValidity() && e.target.value.trim()) {
      field.classList.remove('is-invalid');
    }
  });

  /* ═════ BUILDER DE ETAPAS ═════ */
  const builderList = document.getElementById('builder-list');
  const builderAdd = document.getElementById('builder-add');
  const tpl = document.getElementById('tpl-step');

  const refreshBuilderValidity = () => {
    const field = document.getElementById('builder-field');
    if (!field || !field.classList.contains('is-invalid')) return;
    if (readSteps().length >= 2) field.classList.remove('is-invalid');
  };

  const addStep = (data = {}) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const desc = typeof data === 'string' ? data : data.desc;
    if (desc) node.querySelector('.js-step-desc').value = desc;
    node.querySelector('.builder__remove').addEventListener('click', () => {
      node.remove();
      if (!builderList.children.length) addStep();
      saveDraft();
      refreshBuilderValidity();
    });
    node.querySelectorAll('input').forEach((i) => {
      i.addEventListener('input', saveDraft);
      i.addEventListener('input', refreshBuilderValidity);
    });
    builderList.appendChild(node);
  };
  builderAdd.addEventListener('click', () => { addStep(); saveDraft(); });

  const readSteps = () => Array.from(builderList.children)
    .map((li) => li.querySelector('.js-step-desc').value.trim())
    .filter((desc) => desc);

  /* ═════ ESTIMADOR DE VOLUME ═════ */
  const estimator = document.getElementById('estimator');
  const estHoras = document.getElementById('est-horas');
  const estRegistros = document.getElementById('est-registros');
  const estPessoas = document.getElementById('est-pessoas');
  const estTotal = document.getElementById('est-total');
  const freqSel = document.getElementById('f-freq');
  const volumeIn = document.getElementById('f-volume');
  const tempoValor = document.getElementById('f-tempo-valor');
  const tempoUnidade = document.getElementById('f-tempo-unidade');
  const pessoasQtd = document.getElementById('f-pessoas-qtd');

  const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  const recalc = () => {
    const freqOpt = freqSel.options[freqSel.selectedIndex];
    const mes = Number(freqOpt?.dataset.mes || 0);
    const vol = Number(volumeIn.value || 0);
    const tv = Number(tempoValor.value || 0);
    const pessoas = Number(pessoasQtd.value || 0);
    const mult = tempoUnidade.value === 'h' ? 60 : 1;
    const minPorExecucao = tv * mult;

    if (!mes && !vol && !tv && !pessoas) { estimator.hidden = true; return; }

    const horasMesPorPessoa = mes && tv ? (mes * minPorExecucao) / 60 : null;
    const registros = mes && vol ? mes * vol : null;
    const horasTotal = horasMesPorPessoa != null && pessoas ? horasMesPorPessoa * pessoas : null;

    estHoras.textContent = horasMesPorPessoa != null ? nf.format(horasMesPorPessoa) + 'h' : '—';
    estRegistros.textContent = registros != null ? nf.format(registros) : '—';
    estPessoas.textContent = pessoas ? String(pessoas) : '—';
    estTotal.textContent = horasTotal != null ? nf.format(horasTotal) + 'h' : '—';
    estimator.hidden = false;
  };
  [freqSel, volumeIn, tempoValor, tempoUnidade, pessoasQtd].forEach((el) => el.addEventListener('input', recalc));

  /* ═════ DROPZONE / ARQUIVOS ═════ */
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('f-files');
  const fileList = document.getElementById('file-list');
  const files = [];

  const prettySize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const renderFiles = () => {
    fileList.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="file__icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>
        <span class="file__name"></span>
        <span class="file__size"></span>
        <button type="button" class="file__remove" aria-label="Remover arquivo">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>`;
      li.querySelector('.file__name').textContent = f.name;
      li.querySelector('.file__size').textContent = prettySize(f.size);
      li.querySelector('.file__remove').addEventListener('click', () => {
        files.splice(i, 1);
        renderFiles();
      });
      fileList.appendChild(li);
    });
  };

  const addFiles = (list) => {
    const limitMB = MAX_FILE_MB * 1024 * 1024;
    Array.from(list).forEach((f) => {
      if (files.length >= MAX_FILES) return;
      if (f.size > limitMB) {
        errorEl.hidden = false;
        errorEl.textContent = `${f.name} excede ${MAX_FILE_MB} MB e foi ignorado.`;
        return;
      }
      files.push(f);
    });
    renderFiles();
  };

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener('change', (e) => addFiles(e.target.files));
  ['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); dropzone.classList.add('is-drag');
  }));
  ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); dropzone.classList.remove('is-drag');
  }));
  dropzone.addEventListener('drop', (e) => { if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });

  /* ═════ AUTOSAVE (rascunho local) ═════ */
  let saveTimer = null;
  const collectData = () => {
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v, k) => {
      if (k === '_honey' || k === 'files') return;
      if (data[k] !== undefined) {
        data[k] = [].concat(data[k], v);
      } else {
        data[k] = v;
      }
    });
    data.etapas = readSteps();
    return data;
  };

  const saveDraft = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
        saveBadge.querySelector('span').textContent = 'Rascunho salvo';
      } catch (_) { /* storage cheio ou bloqueado — ignora */ }
    }, 400);
  };

  const seedSteps = () => { addStep(); addStep(); };

  const restoreDraft = () => {
    let raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (_) { return; }
    if (!raw) { seedSteps(); return; }
    try {
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'etapas') return;
        const inputs = form.querySelectorAll(`[name="${k}"]`);
        if (!inputs.length) return;
        const values = [].concat(v);
        inputs.forEach((input) => {
          if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = values.includes(input.value);
          } else if (!Array.isArray(v)) {
            input.value = v;
          }
        });
      });
      if (Array.isArray(data.etapas) && data.etapas.length) {
        data.etapas.forEach((s) => addStep(s));
        while (builderList.children.length < 2) addStep();
      } else {
        seedSteps();
      }
      recalc();
    } catch (_) { seedSteps(); }
  };

  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);

  /* ═════ RESUMO ═════ */
  const summaryList = document.getElementById('summary-list');
  const LABELS = {
    nome: 'Nome', email: 'E-mail', telefone: 'Telefone', cargo: 'Cargo',
    problema: 'Problema a resolver',
    empresa: 'Empresa', site: 'Site', cidade: 'Localização', setor: 'Setor', porte: 'Porte',
    erp: 'ERP', erp_tipo: 'Tipo de ERP', erp_api: 'API/Integrações', ferramentas: 'Ferramentas',
    area: 'Área', processo_nome: 'Processo', processo_objetivo: 'Objetivo', dores: 'Dores',
    visao_automacao: 'Visão da automação',
    frequencia: 'Frequência', volume: 'Volume por execução', tempo_valor: 'Tempo por execução',
    pessoas_qtd: 'Pessoa(s) envolvida(s)', pessoas_papeis: 'Papéis',
    prazo: 'Prazo', observacoes: 'Observações',
  };

  const renderSummary = () => {
    const data = collectData();
    summaryList.innerHTML = '';
    Object.entries(LABELS).forEach(([k, label]) => {
      const div = document.createElement('div');
      let val = data[k];
      if (Array.isArray(val)) val = val.join(', ');
      if (k === 'tempo_valor' && data.tempo_valor) val = `${data.tempo_valor} ${data.tempo_unidade || 'min'}`;
      const empty = !val || !String(val).trim();
      div.innerHTML = `<dt>${label}</dt><dd${empty ? ' class="is-empty"' : ''}>${empty ? '—' : escapeHtml(val)}</dd>`;
      summaryList.appendChild(div);
    });
    const steps = readSteps();
    if (steps.length) {
      const div = document.createElement('div');
      div.style.gridColumn = '1 / -1';
      const lines = steps.map((desc, i) => `${String(i + 1).padStart(2, '0')}. ${desc}`).join('<br>');
      div.innerHTML = `<dt>Etapas (${steps.length})</dt><dd>${escapeHtml(lines, true)}</dd>`;
      summaryList.appendChild(div);
    }
    if (files.length) {
      const div = document.createElement('div');
      div.style.gridColumn = '1 / -1';
      div.innerHTML = `<dt>Anexos</dt><dd>${files.map((f) => escapeHtml(f.name)).join(', ')}</dd>`;
      summaryList.appendChild(div);
    }
  };

  const escapeHtml = (str, keepBr = false) => {
    const s = String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return keepBr ? s.replace(/&lt;br&gt;/g, '<br>') : s;
  };

  /* ═════ ENVIO ═════ */
  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve({
      name: file.name,
      type: file.type,
      size: file.size,
      data: String(fr.result).split(',')[1] || '',
    });
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const submit = async () => {
    if (!validateStep()) return;
    if (form.querySelector('[name="_honey"]').value) return; // robô

    btnSubmit.disabled = true;
    const label = btnSubmit.querySelector('span') || btnSubmit;
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<span>Enviando…</span>';

    const payload = collectData();
    payload.data_envio = new Date().toISOString();
    payload.pagina = location.href;

    try {
      if (files.length) {
        payload.anexos = await Promise.all(files.map(readFileAsBase64));
      }

      if (!SHEET_ENDPOINT) {
        console.warn('SHEET_ENDPOINT não configurado. Payload:', payload);
        throw new Error('endpoint-missing');
      }

      const response = await fetch(SHEET_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS no Apps Script
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('bad-status');

      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      form.hidden = true;
      document.querySelector('.wizard__progress').hidden = true;
      document.querySelector('.wizard__tabs').hidden = true;
      successEl.hidden = false;
      const successTop = successEl.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top: Math.max(0, successTop), behavior: 'smooth' });
      try { successEl.focus({ preventScroll: true }); } catch (_) {}
    } catch (err) {
      console.error('Erro ao enviar:', err);
      errorEl.hidden = false;
      errorEl.innerHTML = `Não foi possível enviar agora. Tente de novo em instantes ou escreva para <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`;
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalText;
    }
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });

  document.getElementById('btn-new').addEventListener('click', () => {
    form.reset();
    files.length = 0;
    renderFiles();
    builderList.innerHTML = '';
    seedSteps();
    estimator.hidden = true;
    form.hidden = false;
    document.querySelector('.wizard__progress').hidden = false;
    document.querySelector('.wizard__tabs').hidden = false;
    successEl.hidden = true;
    showStep(0);
  });

  /* ═════ INIT ═════ */
  restoreDraft();
  showStep(0, false);
  window.scrollTo({ top: 0 });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
