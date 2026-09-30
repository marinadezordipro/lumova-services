// ============================================================
//  ARQUIVO DE CONTEÚDO — LUMOVA · Página de Serviços
//
//  COMO USAR:
//  - Edite os textos abaixo para atualizar a página
//  - Não altere os nomes das chaves (ex: "headline:", "tagline:")
//  - Salve o arquivo e recarregue o navegador
//  - Para adicionar/remover itens de listas, basta editar dentro dos [ ]
// ============================================================

const CONTENT = {

  // ── META ────────────────────────────────────────────────
  meta: {
    titulo_pagina:   "Serviços — Lumova",
    descricao_seo:   "Diagnóstico, Assessoria e Radar CaptaGov. Processos inteligentes com IA responsável para empresas brasileiras.",
  },

  // ── NAVEGAÇÃO ───────────────────────────────────────────
  nav: {
    logo:       "LUMOVA",
    link_cta:   "Agende seu diagnóstico",
    link_href:  "#contato",
  },

  // ── HERO ────────────────────────────────────────────────
  hero: {
    badge:         "O que fazemos",

    // A segunda linha aparece em cobre — edite as duas separadamente
    headline_1:    "Processos inteligentes.",
    headline_2:    "Resultado em cada etapa.",

    subtitulo:     "Da análise ao acompanhamento, construímos junto com você a forma certa de aplicar IA no seu negócio — sem promessa vazia, sem consultoria que some.",

    cta_primario:       "Agende seu diagnóstico gratuito",
    cta_primario_href:  "#contato",

    cta_secundario:       "Conheça o Radar CaptaGov",
    cta_secundario_href:  "https://radarcaptagov.com.br",
  },

  // ── INTRODUÇÃO ──────────────────────────────────────────
  intro: {
    titulo:  "Cada serviço é uma etapa de uma jornada.",
    texto:   "Antes de propor qualquer solução, a Lumova entende o negócio. Depois, constrói junto. Depois, fica — medindo resultado em cada passo.",
  },

  // ── SERVIÇO 01 · DIAGNÓSTICO ────────────────────────────
  diagnostico: {
    numero:   "01",
    nome:     "Diagnóstico de Processos",
    tagline:  "Entenda onde a IA pode gerar impacto real no seu negócio — antes de investir qualquer real.",

    descricao: "Mapeamos os processos da sua empresa, identificamos gargalos e sinalizamos os pontos onde a inteligência artificial e a automação podem gerar eficiência mensurável. Nada de tecnologia por tecnologia: o diagnóstico é conduzido com olhar de negócio.",

    entregaveis_titulo: "O que você recebe:",
    entregaveis: [
      "Mapeamento dos processos operacionais críticos",
      "Identificação de gargalos e pontos de desperdício",
      "Diagnóstico de maturidade digital da sua empresa",
      "Mapa de oportunidades de IA e automação com priorização",
      "Relatório claro com os próximos passos recomendados",
    ],

    detalhe:  "Conduzido por nós, com entrevistas estruturadas e análise do fluxo de trabalho real.",

    cta:       "Agende seu diagnóstico gratuito",
    cta_href:  "#contato",
  },

  // ── SERVIÇO 02 · ASSESSORIA ─────────────────────────────
  assessoria: {
    numero:   "02",
    nome:     "Assessoria em IA",
    tagline:  "Da solução certa à adoção real — acompanhamos cada etapa da implementação.",

    descricao: "Com o diagnóstico em mãos, construímos e implementamos as soluções identificadas. Cada etapa tem uma métrica de sucesso definida antes de começar. Só avançamos quando o passo anterior está funcionando. E não saímos até a sua empresa operar diferente.",

    pilares_titulo: "Como funciona:",
    pilares: [
      "Desenho da solução junto com o seu time — você aprova cada etapa",
      "Implementação com acompanhamento contínuo",
      "Treinamento da equipe incluso no processo",
      "Documentação de todos os fluxos criados",
      "Métricas de resultado definidas no kickoff e monitoradas",
    ],

    detalhe:  "Disponível para empresas que já realizaram o diagnóstico ou têm clareza sobre o que precisam.",

    cta:       "Fale com a gente",
    cta_href:  "#contato",
  },

  // ── PRODUTO · RADAR CAPTAGOV ─────────────────────────────
  // Descrição baseada na LP oficial — confirme se quer ajustar o texto
  radar: {
    badge:    "Produto",
    nome:     "Radar CaptaGov",
    tagline:  "Inteligência para prefeituras captarem recursos públicos com mais eficiência e resultado.",

    descricao: "O Radar CaptaGov é a plataforma que monitora editais e oportunidades de captação de recursos públicos, avalia automaticamente a aderência ao perfil da prefeitura e apoia a elaboração de projetos com inteligência artificial — tudo em um único ambiente.",

    features_titulo: "O que a plataforma entrega:",
    features: [
      "Monitoramento automatizado de editais e programas federais",
      "Avaliação de aderência por perfil de município",
      "Elaboração de projetos assistida por IA",
      "Dashboard centralizado com histórico e alertas",
    ],

    cta:       "Conhecer o Radar CaptaGov",
    cta_href:  "https://radarcaptagov.com.br",
  },

  // ── COMO FUNCIONA ────────────────────────────────────────
  como_funciona: {
    titulo:     "Como funciona",
    subtitulo:  "Um processo simples e estruturado — do diagnóstico ao resultado.",

    passos: [
      {
        numero:    "1",
        titulo:    "Diagnóstico",
        descricao: "Entendemos o seu negócio, mapeamos os processos e identificamos onde a IA pode gerar impacto real.",
      },
      {
        numero:    "2",
        titulo:    "Desenho",
        descricao: "Construímos juntos a solução certa para a sua realidade. Você aprova cada etapa antes da implementação.",
      },
      {
        numero:    "3",
        titulo:    "Implementação",
        descricao: "Executamos, medimos e ajustamos. Só avançamos quando o resultado do passo anterior está confirmado.",
      },
    ],
  },

  // ── CTA FINAL ────────────────────────────────────────────
  cta_final: {
    titulo:    "Pronto para entender como a IA pode mudar a sua operação?",
    subtitulo: "30 minutos. Sem compromisso. Começamos pelo diagnóstico.",

    cta:       "Agende seu diagnóstico gratuito",
    cta_href:  "#contato",  // Substitua pelo link do WhatsApp, Calendly, etc.

    cta_sec:       "ou entre em contato",
    cta_sec_href:  "mailto:contato@lumova.com.br",  // Substitua pelo e-mail correto
  },

  // ── SEÇÃO DE CONTATO (âncora #contato) ──────────────────
  contato: {
    titulo:    "Vamos conversar?",
    subtitulo: "Conte brevemente sobre seu negócio e o que você quer melhorar.",
    botao:     "Enviar mensagem",

    // Substitua pelo link do WhatsApp ou formulário
    whatsapp_href: "https://wa.me/5500000000000?text=Quero%20agendar%20um%20diagn%C3%B3stico%20da%20Lumova",
    email:         "contato@lumova.com.br",
  },

  // ── FOOTER ───────────────────────────────────────────────
  footer: {
    tagline:    "Clareza em movimento.",
    copyright:  "© 2026 Lumova. Todos os direitos reservados.",
  },
};
