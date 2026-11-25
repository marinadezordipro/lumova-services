/**
 * LUMOVA · Backend do formulário de solicitação de orçamento
 * ---------------------------------------------------------------
 * COMO USAR
 * 1. Crie uma planilha nova no Google Sheets.
 * 2. Menu "Extensões" > "Apps Script" e cole este arquivo.
 * 3. Rode uma vez a função `setup()` para criar as abas e cabeçalhos.
 * 4. "Implantar" > "Nova implantação" > tipo "App da Web"
 *      - Executar como: eu mesmo
 *      - Quem pode acessar: qualquer pessoa
 * 5. Copie a URL gerada e cole em SHEET_ENDPOINT no script.js do form.
 *
 * O que ele faz a cada envio:
 *  - Grava uma linha em "Solicitações" e uma linha por etapa em "Etapas do processo".
 *  - Salva anexos (prints/PDFs) numa pasta do Drive e grava os links.
 *  - Gera um Google Doc resumo com estimativa prévia de orçamento, pronto para enviar.
 *  - Envia um e-mail de notificação para NOTIFY_EMAIL com o link do Doc.
 */

const NOTIFY_EMAIL = 'contato@lumova.com.br';
const DRIVE_FOLDER_NAME = 'Lumova · Orçamentos';
const DOCS_FOLDER_NAME = 'Resumos de orçamento';
const ANEXOS_FOLDER_NAME = 'Anexos';

const SHEET_SOLICITACOES = 'Solicitações';
const SHEET_ETAPAS = 'Etapas do processo';

const HEADERS_SOLICITACOES = [
  'ID', 'Data/Hora', 'Nome', 'E-mail', 'Telefone', 'Cargo',
  'Problema a resolver',
  'Empresa', 'Site', 'Cidade/UF', 'Setor', 'Porte',
  'ERP', 'Tipo de ERP', 'API/Integrações', 'Outras ferramentas',
  'Área', 'Processo', 'Objetivo', 'Dores', 'Visão da automação',
  'Frequência', 'Volume/execução', 'Tempo/execução (por pessoa)', 'Pessoa(s) envolvida(s)', 'Papéis',
  'Prazo',
  'Estimativa min (R$)', 'Estimativa max (R$)',
  'Observações',
  'Doc resumo', 'Anexos', 'Página de origem'
];

const HEADERS_ETAPAS = [
  'ID da solicitação', 'Data/Hora', 'Empresa', 'Processo', '#', 'Descrição'
];

/* ─── SETUP ───────────────────────────────────────── */

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Este projeto Apps Script não está vinculado a uma planilha. Abra sua planilha no Google Sheets e entre em Extensões → Apps Script a partir dela.');
  }
  ensureSheet(ss, SHEET_SOLICITACOES, HEADERS_SOLICITACOES);
  ensureSheet(ss, SHEET_ETAPAS, HEADERS_ETAPAS);
  Logger.log('Abas prontas: "%s" e "%s". Agora publique o Web App em "Implantar".', SHEET_SOLICITACOES, SHEET_ETAPAS);
}

function ensureSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
}

/* ─── ENDPOINT ────────────────────────────────────── */

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheet(ss, SHEET_SOLICITACOES, HEADERS_SOLICITACOES);
    ensureSheet(ss, SHEET_ETAPAS, HEADERS_ETAPAS);

    const id = Utilities.getUuid().slice(0, 8).toUpperCase();
    const when = new Date();
    const etapas = normalizarEtapas(payload.etapas);

    const rootFolder = getOrCreateFolder(DRIVE_FOLDER_NAME);
    const subFolderName = id + ' · ' + (payload.empresa || 'sem-empresa') + ' · ' +
      Utilities.formatDate(when, 'GMT-3', 'yyyy-MM-dd HH-mm');
    const envioFolder = rootFolder.createFolder(subFolderName);

    const linksAnexos = saveAttachments(payload.anexos, envioFolder);
    const estimativa = estimarOrcamento(payload, etapas);
    const docUrl = createSummaryDoc(payload, id, when, etapas, estimativa, envioFolder, linksAnexos);

    const sh = ss.getSheetByName(SHEET_SOLICITACOES);
    sh.appendRow([
      id,
      when,
      payload.nome || '',
      payload.email || '',
      payload.telefone || '',
      payload.cargo || '',
      payload.problema || '',
      payload.empresa || '',
      payload.site || '',
      payload.cidade || '',
      payload.setor || '',
      payload.porte || '',
      payload.erp || '',
      payload.erp_tipo || '',
      payload.erp_api || '',
      arr(payload.ferramentas).join(', '),
      payload.area || '',
      payload.processo_nome || '',
      payload.processo_objetivo || '',
      arr(payload.dores).join(', '),
      payload.visao_automacao || '',
      payload.frequencia || '',
      payload.volume || '',
      payload.tempo_valor ? payload.tempo_valor + ' ' + (payload.tempo_unidade || 'min') : '',
      payload.pessoas_qtd || '',
      payload.pessoas_papeis || '',
      payload.prazo || '',
      estimativa.min,
      estimativa.max,
      payload.observacoes || '',
      docUrl,
      linksAnexos.join('\n'),
      payload.pagina || '',
    ]);

    if (etapas.length) {
      const shE = ss.getSheetByName(SHEET_ETAPAS);
      etapas.forEach((desc, i) => {
        shE.appendRow([id, when, payload.empresa || '', payload.processo_nome || '', i + 1, desc]);
      });
    }

    notify(payload, id, docUrl, linksAnexos, estimativa);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, id: id, doc: docUrl }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('Lumova · orçamento · OK').setMimeType(ContentService.MimeType.TEXT);
}

/* ─── ANEXOS ──────────────────────────────────────── */

function saveAttachments(anexos, envioFolder) {
  if (!Array.isArray(anexos) || !anexos.length) return [];
  const folder = envioFolder.createFolder(ANEXOS_FOLDER_NAME);
  return anexos.map((a) => {
    try {
      const blob = Utilities.newBlob(Utilities.base64Decode(a.data), a.type || 'application/octet-stream', a.name || 'anexo');
      const file = folder.createFile(blob);
      return file.getUrl();
    } catch (_) {
      return '(falha ao salvar: ' + (a.name || 'arquivo') + ')';
    }
  });
}

function getOrCreateFolder(name, parent) {
  const where = parent || DriveApp;
  const it = where.getFoldersByName(name);
  return it.hasNext() ? it.next() : where.createFolder(name);
}

/* ─── ESTIMATIVA DE ORÇAMENTO ─────────────────────── */
/**
 * Heurística prévia (NÃO é proposta final).
 * Usada apenas como ancoragem para o retorno da Lumova.
 *
 * Ajuste os pesos aqui se quiser recalibrar.
 */
function estimarOrcamento(payload, etapas) {
  const FREQ_MES = {
    'Várias vezes ao dia': 60,
    'Diária': 22,
    'Semanal': 4,
    'Quinzenal': 2,
    'Mensal': 1,
    'Esporádica': 0.5,
  };

  const mes = FREQ_MES[payload.frequencia] || 0;
  const tv = Number(payload.tempo_valor || 0);
  const mult = payload.tempo_unidade === 'h' ? 60 : 1;
  const horasMesPorPessoa = tv ? (mes * tv * mult) / 60 : 0;
  const pessoas = Number(payload.pessoas_qtd || 0) || 1;
  const horasMesTotal = horasMesPorPessoa * pessoas;    // horas totais operadas por mês
  const nEtapas = etapas.length;
  const nFerramentas = arr(payload.ferramentas).length;
  const nDores = arr(payload.dores).length;

  // Base e incrementos (R$)
  let base = 5000;                                      // escopo mínimo
  base += Math.min(horasMesTotal * 80, 40000);          // volume real do processo (teto 40k)
  base += nEtapas * 1500;                               // complexidade de fluxo
  if (payload.erp_api === 'Não' || payload.erp_api === 'Não sei') base += 5000; // esforço de automação sem API
  if (nFerramentas > 2) base += (nFerramentas - 2) * 1500;                     // integrações extras
  if (nDores >= 4) base += 2500;                        // muitas dores → mais escopo
  if (pessoas >= 3) base += 2000;                       // mais stakeholders

  // Faixa ±25%, arredondada em R$ 500
  const round500 = (n) => Math.max(500, Math.round(n / 500) * 500);
  const min = round500(base * 0.8);
  const max = round500(base * 1.3);

  // Retorno de valor estimado (sobre o total de horas da operação)
  const horasLiberadas = horasMesTotal * 0.65;          // premissa conservadora
  const custoHora = 60;                                 // premissa R$/hora de operação
  const economiaMes = horasLiberadas * custoHora;
  const paybackMeses = economiaMes > 0 ? Math.max(1, Math.ceil(base / economiaMes)) : null;

  return {
    min: min,
    max: max,
    base: Math.round(base),
    horasPorPessoa: round1(horasMesPorPessoa),
    horasMes: round1(horasMesTotal),
    pessoas: pessoas,
    horasLiberadas: round1(horasLiberadas),
    economiaMes: Math.round(economiaMes),
    paybackMeses: paybackMeses,
    nEtapas: nEtapas,
    nFerramentas: nFerramentas,
  };
}

/* ─── GERAÇÃO DO DOC RESUMO ───────────────────────── */

function createSummaryDoc(payload, id, when, etapas, estimativa, envioFolder, linksAnexos) {
  const docsFolder = getOrCreateFolder(DOCS_FOLDER_NAME, envioFolder);
  const title = 'Resumo · ' + (payload.empresa || payload.nome || id) +
    ' · ' + (payload.processo_nome || 'Processo');
  const doc = DocumentApp.create(title);
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(docsFolder);

  const body = doc.getBody();
  body.clear();

  // Cabeçalho
  body.appendParagraph('Lumova · Solicitação de orçamento').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('ID ' + id + ' · ' +
    Utilities.formatDate(when, 'GMT-3', 'dd/MM/yyyy HH:mm'))
    .setItalic(true).setForegroundColor('#8C95B8');

  // Contato
  section(body, 'Contato');
  bullets(body, [
    pair('Nome', payload.nome),
    pair('E-mail', payload.email),
    pair('Telefone', payload.telefone),
    pair('Cargo', payload.cargo),
  ]);

  // Empresa
  section(body, 'Empresa');
  bullets(body, [
    pair('Empresa', payload.empresa),
    pair('Site', payload.site),
    pair('Cidade/UF', payload.cidade),
    pair('Setor', payload.setor),
    pair('Porte', payload.porte),
  ]);

  // Problema & objetivo
  section(body, 'Problema a resolver');
  body.appendParagraph(payload.problema || '—');

  if (payload.processo_objetivo) {
    section(body, 'Objetivo do processo');
    body.appendParagraph(payload.processo_objetivo);
  }

  // Sistemas
  section(body, 'Sistemas e ferramentas');
  bullets(body, [
    pair('ERP', payload.erp),
    pair('Tipo de ERP', payload.erp_tipo),
    pair('API / integrações', payload.erp_api),
    pair('Outras ferramentas', arr(payload.ferramentas).join(', ')),
  ]);

  // Processo
  section(body, 'Processo');
  bullets(body, [
    pair('Área', payload.area),
    pair('Nome do processo', payload.processo_nome),
    pair('Dores apontadas', arr(payload.dores).join(', ')),
  ]);

  if (etapas.length) {
    body.appendParagraph('Etapas do processo').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    etapas.forEach((desc, i) => {
      body.appendListItem(desc).setGlyphType(DocumentApp.GlyphType.NUMBER);
    });
  }

  if (payload.visao_automacao) {
    section(body, 'Visão da automação (como o cliente imagina)');
    body.appendParagraph(payload.visao_automacao);
  }

  // Volume
  section(body, 'Volume e pessoas');
  bullets(body, [
    pair('Frequência', payload.frequencia),
    pair('Volume por execução', payload.volume),
    pair('Tempo por execução', payload.tempo_valor ? payload.tempo_valor + ' ' + (payload.tempo_unidade || 'min') : ''),
    pair('Pessoa(s) envolvida(s)', payload.pessoas_qtd),
    pair('Papéis / cargos', payload.pessoas_papeis),
    pair('Horas/mês por pessoa', estimativa.horasPorPessoa + 'h'),
    pair('Total de horas/mês (processo todo)', estimativa.horasMes + 'h'),
  ]);

  // Observações
  if (payload.observacoes) {
    section(body, 'Observações');
    body.appendParagraph(payload.observacoes);
  }

  // Prazo informado
  if (payload.prazo) {
    section(body, 'Prazo informado');
    bullets(body, [
      pair('Prazo desejado', payload.prazo),
    ]);
  }

  // Anexos
  if (linksAnexos.length) {
    section(body, 'Anexos');
    linksAnexos.forEach((url) => body.appendListItem(url));
  }

  // Estimativa de orçamento
  body.appendParagraph('—').setForegroundColor('#8C95B8');
  body.appendParagraph('Estimativa prévia de orçamento').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(
    'Faixa estimada: ' + money(estimativa.min) + ' a ' + money(estimativa.max)
  ).setBold(true);

  const premissas = [
    'Operação de ' + estimativa.horasMes + ' h/mês (' + estimativa.horasPorPessoa + ' h/mês × ' + estimativa.pessoas + ' pessoa(s))',
    estimativa.nEtapas + ' etapas descritas',
    estimativa.nFerramentas + ' ferramentas envolvidas',
    'Potencial de ' + estimativa.horasLiberadas + ' h/mês liberadas com automação (premissa: 65% de ganho)',
    'Economia estimada: ' + money(estimativa.economiaMes) + '/mês (a R$ 60/h operacional)',
    estimativa.paybackMeses ? 'Payback estimado em ' + estimativa.paybackMeses + ' meses' : null,
  ].filter(Boolean);

  body.appendParagraph('Como chegamos nessa faixa').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  premissas.forEach((p) => body.appendListItem(p));

  body.appendParagraph(
    'Esta é uma estimativa prévia a partir do que foi informado no formulário. ' +
    'O orçamento final sai depois do diagnóstico, quando entendemos a fundo o processo, ' +
    'as integrações necessárias e o plano de automação.'
  ).setItalic(true).setForegroundColor('#8C95B8');

  body.appendParagraph('Próximos passos').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendListItem('Marcar uma conversa de 30 min para validar o processo mapeado.');
  body.appendListItem('Visita técnica / sessão de descoberta (remota ou presencial).');
  body.appendListItem('Proposta formal com escopo, prazos e condições comerciais.');

  body.appendParagraph(' ');
  body.appendParagraph('Lumova · IA · Processos · Resultados')
    .setItalic(true).setForegroundColor('#4B7DFF');

  doc.saveAndClose();

  // Compartilha com visualização via link
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}

  return doc.getUrl();
}

/* ─── NOTIFICAÇÃO POR E-MAIL ──────────────────────── */

function notify(payload, id, docUrl, linksAnexos, estimativa) {
  if (!NOTIFY_EMAIL) return;
  const linhas = [
    'Nova solicitação de orçamento (' + id + ')',
    '',
    'Contato: ' + (payload.nome || '') + ' <' + (payload.email || '') + '>',
    'Telefone: ' + (payload.telefone || ''),
    'Empresa: ' + (payload.empresa || '') + ' · ' + (payload.cidade || ''),
    'Área: ' + (payload.area || ''),
    'Processo: ' + (payload.processo_nome || ''),
    'Problema: ' + (payload.problema || '—'),
    '',
    'Estimativa prévia: ' + money(estimativa.min) + ' a ' + money(estimativa.max),
    'Operação: ' + estimativa.horasMes + ' h/mês (total) · payback ~' + (estimativa.paybackMeses || '—') + ' meses',
    '',
    'Resumo pronto para enviar ao cliente:',
    docUrl,
    '',
    'Anexos:',
    linksAnexos.length ? linksAnexos.join('\n') : '-',
  ];
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: '[Lumova] Novo orçamento · ' + (payload.empresa || payload.nome || id),
    body: linhas.join('\n'),
  });
}

/* ─── HELPERS ─────────────────────────────────────── */

function arr(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
function round1(n) { return Math.round(n * 10) / 10; }
function money(n) {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
function pair(label, value) { return { label: label, value: value }; }
function section(body, title) {
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
}
function bullets(body, items) {
  items.filter((i) => i.value).forEach((i) => {
    const p = body.appendParagraph('');
    p.appendText(i.label + ': ').setBold(true);
    p.appendText(String(i.value)).setBold(false);
  });
}
function normalizarEtapas(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => {
    if (typeof e === 'string') return e.trim();
    if (e && typeof e === 'object') {
      const bits = [e.desc, e.who, e.sys, e.time].filter(Boolean);
      return bits.join(' — ');
    }
    return '';
  }).filter(Boolean);
}
