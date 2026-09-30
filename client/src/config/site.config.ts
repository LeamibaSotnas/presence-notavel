/**
 * ============================================================================
 *  PONTO ÚNICO DE CONFIGURAÇÃO DO SITE
 * ============================================================================
 *
 *  Todo o conteúdo editável vive neste arquivo. Nenhum componente de seção
 *  contém texto fixo — eles apenas consomem o que está aqui. Para lançar uma
 *  nova instância deste template (outro cliente, outro talento), duplique o
 *  projeto e altere SOMENTE este arquivo.
 *
 *  ── CHECKLIST DE PERSONALIZAÇÃO ──────────────────────────────────────────
 *   [ ] identity      → nome, iniciais, função, localização
 *   [ ] contact       → WhatsApp / Instagram / e-mail  ⚠️ VAZIO = CTA INATIVO
 *   [ ] seo           → title, description, canonical, ogImage
 *   [ ] hero          → chamada principal
 *   [ ] about         → texto institucional
 *   [ ] portfolio     → trabalhos reais
 *   [ ] events        → agenda real
 *   [ ] gallery       → fotos reais
 *   [ ] notes         → publicações (ou defina notes: [] para ocultar a seção)
 *   [ ] images        → rodar `node scripts/fetch-remote-images.mjs`
 *
 *  ⚠️ CONTEÚDO ATUAL = DEMONSTRATIVO. A flag `isDemo` abaixo controla os
 *     avisos de "conteúdo demonstrativo" exibidos na interface. Coloque em
 *     `false` ao publicar com conteúdo real e os avisos desaparecem.
 * ============================================================================
 */

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type PortfolioItem = {
  /** Identificador estável. Usado como key de React e futura rota /projeto/:id */
  id: string;
  title: string;
  /** Alimenta automaticamente os filtros da seção de portfólio. */
  category: string;
  description: string;
  image: string;
  year: string;
  /** Selo sobreposto à imagem no modal de detalhe. */
  badge: string;
};

export type EventItem = {
  /** Formato "DD.MM" — a seção divide no ponto para montar o bloco de data. */
  date: string;
  title: string;
  place: string;
  description: string;
  image: string;
};

export type GalleryItem = {
  image: string;
  label: string;
  /** true = ocupa o dobro de altura no mosaico do desktop. */
  tall: boolean;
};

export type NoteItem = {
  category: string;
  title: string;
  /** Formato "DD.MM.AAAA". */
  date: string;
  /** Opcional: quando presente, o card se torna um link real. */
  href?: string;
};

export type NavItem = { label: string; href: string };

export type InterestField = {
  /** Opção da lista "assunto" no formulário de interesse. */
  value: string;
  label: string;
};

export type SiteConfig = {
  isDemo: boolean;
  /** Tipografia: id de um preset de config/themes.ts. */
  theme: { typography: string };
  identity: {
    name: string;
    initials: string;
    firstName: string;
    lastName: string;
    role: string;
    location: string;
    tagline: string;
  };
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    /** URL final de produção. Usada no canonical e no og:url. */
    canonical: string;
    /** Caminho ou URL absoluta da imagem de compartilhamento (1200x630). */
    ogImage: string;
    themeColor: string;
    locale: string;
  };
  contact: {
    /** Só dígitos, com DDI. Ex.: "5511999999999". Vazio desativa o CTA. */
    whatsapp: string;
    whatsappMessage: string;
    instagram: string;
    email: string;
    phone: string;
  };
  nav: NavItem[];
  hero: {
    /** Imagem de fundo do topo. Trocável pelo painel. */
    image: string;
    eyebrow: string;
    /** Renderizado em duas linhas; `titleAccent` recebe a cor de destaque. */
    titleLead: string;
    titleAccent: string;
    labelLeft: string;
    labelRight: string;
    stampLabel: string;
  };
  about: {
    kicker: string;
    titleLead: string;
    titleAccent: string;
    lead: string;
    body: string;
    quote: string;
  };
  portfolio: {
    kicker: string;
    titleLead: string;
    titleAccent: string;
    intro: string;
    items: PortfolioItem[];
  };
  events: {
    kicker: string;
    titleLead: string;
    titleAccent: string;
    intro: string;
    ctaLabel: string;
    items: EventItem[];
  };
  gallery: {
    kicker: string;
    titleLead: string;
    titleAccent: string;
    intro: string;
    items: GalleryItem[];
  };
  notes: {
    kicker: string;
    titleLead: string;
    titleAccent: string;
    items: NoteItem[];
  };
  adminConcept: {
    kicker: string;
    titleLead: string;
    titleAccent: string;
    body: string;
    ctaLabel: string;
    modalTitleLead: string;
    modalTitleAccent: string;
    modalBody: string;
    editableAreas: string[];
  };
  interest: {
    kicker: string;
    titleLead: string;
    titleAccent: string;
    intro: string;
    subjects: InterestField[];
    /** Texto do aviso de privacidade exibido junto ao checkbox (LGPD). */
    privacyNotice: string;
    successTitle: string;
    successBody: string;
    /** Abre o WhatsApp com a mensagem preenchida depois de enviar. */
    redirectToWhatsApp: boolean;
  };
  contactSection: {
    kicker: string;
    titleLead: string;
    titleAccent: string;
    lead: string;
    panelKicker: string;
    panelTitle: string;
    panelNote: string;
  };
  footer: {
    tagline: string;
    copyright: string;
    closing: string;
    links: NavItem[];
  };
};

// ─── Imagens ────────────────────────────────────────────────────────────────
//
// As imagens vivem em client/public/images/ e são servidas pelo próprio
// domínio. Imagens enviadas pelo painel ficam no R2 e chegam como /media/...
//
const IMG = {
  hero: "/images/hero.jpg",
  portfolio1: "/images/portfolio1.jpg",
  portfolio2: "/images/portfolio2.jpg",
  portfolio3: "/images/portfolio3.jpg",
  portfolio4: "/images/portfolio4.jpg",
  // ⚠️ O original desta entrada já não existia na CDN da Manus quando o
  //    download rodou. Apontada para uma imagem local para não deixar a
  //    galeria quebrada — troque por uma foto real pelo painel.
  gallery4: "/images/portfolio2.jpg",
  gallery5: "/images/gallery5.jpg",
  event1: "/images/event1.jpg",
  event2: "/images/event2.jpg",
  event3: "/images/event3.jpg",
} as const;

/** Exportado para o script de download e para o CSS do hero. */
export const images = IMG;

// ─── Configuração ───────────────────────────────────────────────────────────

export const siteConfig: SiteConfig = {
  isDemo: true,

  theme: {
    // Um dos ids de config/themes.ts: editorial, moderno, elegante,
    // teatral, minimal, quente.
    typography: "editorial",
  },

  identity: {
    name: "Mateo Valença",
    initials: "MV",
    firstName: "Mateo",
    lastName: "Valença",
    role: "Ator · Presença · Publicidade",
    location: "São Paulo · Brasil",
    tagline: "Imagem que conecta pessoas, marcas e experiências.",
  },

  seo: {
    title: "Mateo Valença — Actor Portfolio",
    description:
      "Mateo Valença — ator, presença comercial e portfólio profissional para eventos, campanhas e projetos audiovisuais.",
    ogTitle: "Mateo Valença — Actor Portfolio",
    ogDescription: "Imagem que conecta pessoas, marcas e experiências.",
    canonical: "https://example.com/",
    ogImage: "/og-image.jpg",
    themeColor: "#18263b",
    locale: "pt_BR",
  },

  contact: {
    whatsapp: "",
    whatsappMessage:
      "Olá, vi seu trabalho através do site e gostaria de conversar sobre uma oportunidade.",
    instagram: "",
    email: "",
    phone: "",
  },

  nav: [
    { label: "Início", href: "#inicio" },
    { label: "Sobre", href: "#sobre" },
    { label: "Portfólio", href: "#portfolio" },
    { label: "Eventos", href: "#eventos" },
    { label: "Galeria", href: "#galeria" },
    { label: "Contato", href: "#contato" },
  ],

  hero: {
    image: IMG.hero,
    eyebrow: "Ator & presença comercial",
    titleLead: "Imagem que",
    titleAccent: "fica.",
    labelLeft: "Presence / 2025",
    labelRight: "São Paulo · Brasil",
    stampLabel: "Actor\nPortfolio",
  },

  about: {
    kicker: "Uma presença, muitos contextos",
    titleLead: "Não é apenas",
    titleAccent: "estar em cena.",
    lead: "Uma presença que chega antes da fala. Mateo Valença transita entre a interpretação, a comunicação e o encontro com o público — criando conexões que permanecem depois do evento.",
    body: "Este protótipo utiliza conteúdo demonstrativo. Textos, imagens, links e contatos foram organizados para futura substituição por informações reais.",
    quote: "Presença é a soma entre o que se comunica e o que se faz sentir.",
  },

  portfolio: {
    kicker: "02 / Portfólio",
    titleLead: "Trabalhos que",
    titleAccent: "criam conexão.",
    intro:
      "Projetos organizados por linguagem, contexto e intenção. Cada imagem pode ser substituída por trabalhos reais.",
    items: [
      {
        id: "p1",
        title: "Entre cenas",
        category: "Editorial",
        description:
          "Ensaio autoral com foco em presença, expressão e narrativa visual.",
        image: IMG.portfolio1,
        year: "2025",
        badge: "Trabalho demonstrativo",
      },
      {
        id: "p2",
        title: "Presença em cena",
        category: "Audiovisual",
        description:
          "Conceito de participação para projetos audiovisuais e campanhas especiais.",
        image: IMG.portfolio2,
        year: "2025",
        badge: "Conceito visual",
      },
      {
        id: "p3",
        title: "Ritual de chegada",
        category: "Eventos",
        description:
          "Direção visual para presença, recepção e experiências de marca.",
        image: IMG.portfolio3,
        year: "2024",
        badge: "Projeto demonstrativo",
      },
      {
        id: "p4",
        title: "Forma e gesto",
        category: "Publicidade",
        description:
          "Estudo de linguagem corporal para campanhas e comunicação comercial.",
        image: IMG.portfolio4,
        year: "2024",
        badge: "Demonstração",
      },
    ],
  },

  events: {
    kicker: "03 / Agenda",
    titleLead: "Onde a presença",
    titleAccent: "acontece.",
    intro:
      "Eventos e experiências que pedem mais do que uma participação: pedem atenção, escuta e presença verdadeira.",
    ctaLabel: "Tem um evento em mente?",
    items: [
      {
        date: "18.10",
        title: "Noite de estreia",
        place: "São Paulo · SP",
        description:
          "Presença, recepção de convidados e participação em encontro cultural.",
        image: IMG.event1,
      },
      {
        date: "07.11",
        title: "Encontro de marcas",
        place: "Rio de Janeiro · RJ",
        description:
          "Experiência de relacionamento para convidados e parceiros.",
        image: IMG.event2,
      },
      {
        date: "22.11",
        title: "Sessão especial",
        place: "Belo Horizonte · MG",
        description:
          "Participação em conteúdo audiovisual e conversa com o público.",
        image: IMG.event3,
      },
    ],
  },

  gallery: {
    kicker: "04 / Galeria",
    titleLead: "Um pouco do",
    titleAccent: "que fica.",
    intro:
      "Uma seleção visual em constante construção. Clique em qualquer imagem para ampliar.",
    items: [
      { image: IMG.hero, label: "Editorial / 01", tall: true },
      { image: IMG.portfolio4, label: "Editorial / 02", tall: false },
      { image: IMG.portfolio1, label: "Retrato / 03", tall: true },
      { image: IMG.gallery4, label: "Presença / 04", tall: false },
      { image: IMG.gallery5, label: "Evento / 05", tall: true },
    ],
  },

  notes: {
    kicker: "05 / Diário",
    titleLead: "Notas de",
    titleAccent: "presença.",
    items: [
      {
        category: "Diário",
        title: "Presença também é escuta",
        date: "12.08.2025",
      },
      {
        category: "Agenda",
        title: "Como se preparar para um evento de marca",
        date: "28.07.2025",
      },
      {
        category: "Bastidores",
        title: "Entre luz, gesto e intenção",
        date: "06.06.2025",
      },
    ],
  },

  adminConcept: {
    kicker: "Pensado para evoluir",
    titleLead: "Conteúdo organizado.",
    titleAccent: "Liberdade para atualizar.",
    body: "As áreas administráveis já estão separadas em um único arquivo de configuração, prontas para virar painel sem refazer o frontend.",
    ctaLabel: "Ver estrutura editável",
    modalTitleLead: "O que poderá ser",
    modalTitleAccent: "editado.",
    modalBody:
      "Esta lista representa a estrutura de conteúdo preparada para evoluir para um painel administrativo sem refazer o frontend.",
    editableAreas: [
      "Configurações do site",
      "Hero e chamadas",
      "Portfólio e categorias",
      "Eventos e agenda",
      "Galeria de imagens",
      "Notícias e novidades",
      "Canais de contato",
    ],
  },

  interest: {
    kicker: "Fale comigo",
    titleLead: "Conte o que",
    titleAccent: "você precisa.",
    intro:
      "Descreva o projeto, a data e o formato. Respondo pelo WhatsApp ou pelo e-mail que você deixar.",
    subjects: [
      { value: "evento", label: "Evento ou recepção" },
      { value: "campanha", label: "Campanha publicitária" },
      { value: "audiovisual", label: "Projeto audiovisual" },
      { value: "parceria", label: "Parceria ou colaboração" },
      { value: "outro", label: "Outro assunto" },
    ],
    privacyNotice:
      "Autorizo o contato por WhatsApp ou e-mail e o armazenamento dos dados informados para esta finalidade. Os dados não são compartilhados com terceiros e podem ser excluídos a pedido.",
    successTitle: "Mensagem recebida.",
    successBody:
      "Obrigado pelo contato. Vou responder pelo canal que você informou.",
    redirectToWhatsApp: true,
  },

  contactSection: {
    kicker: "06 / Contato",
    titleLead: "Vamos criar",
    titleAccent: "uma presença?",
    lead: "Disponível para eventos, campanhas, projetos audiovisuais e colaborações especiais.",
    panelKicker: "Fale diretamente",
    panelTitle: "Tem um projeto\nem mente?",
    panelNote: "Mensagem pré-preenchida · canal configurável",
  },

  footer: {
    tagline: "Actor · Presence · Commercial Portfolio",
    copyright: "© 2025 Mateo Valença",
    closing: "Imagem que conecta.",
    links: [
      { label: "Sobre", href: "#sobre" },
      { label: "Portfólio", href: "#portfolio" },
      { label: "Contato", href: "#contato" },
    ],
  },
};

export default siteConfig;
