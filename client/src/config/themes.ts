/**
 * Presets de tipografia.
 *
 * Cada preset é uma combinação testada: uma fonte de display (títulos) e uma
 * de texto, com o ajuste de escala e espaçamento que aquele par precisa. O
 * cliente escolhe por preview no painel — não há campo de fonte livre, porque
 * o par errado destrói a hierarquia visual do template.
 *
 * Para acrescentar um preset: adicione a entrada aqui com a URL do Google
 * Fonts e os ajustes. Nada mais precisa mudar.
 */

export type TypographyPreset = {
  id: string;
  name: string;
  description: string;
  /** Família aplicada em títulos e destaques em itálico. */
  display: string;
  /** Família aplicada em corpo de texto, botões e rótulos. */
  body: string;
  /** URL do Google Fonts com os pesos usados pelo layout. */
  fontsUrl: string;
  /** Ajustes finos que cada par precisa para manter o ritmo do layout. */
  tuning: {
    /** Entrelinha dos títulos grandes. */
    displayLineHeight: string;
    /** Espaçamento entre letras dos títulos (negativo aproxima). */
    displayTracking: string;
    /** Multiplicador do tamanho dos títulos. */
    displayScale: string;
    /** Peso dos títulos. */
    displayWeight: string;
  };
};

export const typographyPresets: TypographyPreset[] = [
  {
    id: "editorial",
    name: "Editorial",
    description: "Serifada clássica e sans neutra. O padrão do template.",
    display: '"Cormorant Garamond", Georgia, serif',
    body: '"DM Sans", system-ui, sans-serif',
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:wght@400;500;600&display=swap",
    tuning: {
      displayLineHeight: "0.82",
      displayTracking: "-0.075em",
      displayScale: "1",
      displayWeight: "300",
    },
  },
  {
    id: "moderno",
    name: "Moderno",
    description:
      "Sans geométrica em tudo. Direto, contemporâneo, sem ornamento.",
    display: '"Sora", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Sora:wght@200;300;400;600&family=Inter:wght@400;500;600&display=swap",
    tuning: {
      displayLineHeight: "0.95",
      displayTracking: "-0.045em",
      displayScale: "0.82",
      displayWeight: "200",
    },
  },
  {
    id: "elegante",
    name: "Elegante",
    description: "Didone de alto contraste. Luxo, moda, editorial de capa.",
    display: '"Playfair Display", Georgia, serif',
    body: '"Jost", system-ui, sans-serif',
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Jost:wght@300;400;500&display=swap",
    tuning: {
      displayLineHeight: "0.92",
      displayTracking: "-0.035em",
      displayScale: "0.86",
      displayWeight: "400",
    },
  },
  {
    id: "teatral",
    name: "Teatral",
    description: "Serifada de display com presença forte. Cartaz, cena, drama.",
    display: '"Bodoni Moda", Georgia, serif',
    body: '"Karla", system-ui, sans-serif',
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Karla:wght@400;500;600&display=swap",
    tuning: {
      displayLineHeight: "0.9",
      displayTracking: "-0.03em",
      displayScale: "0.84",
      displayWeight: "400",
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Grotesca suíça, peso leve. Silencioso, técnico, galeria.",
    display: '"Archivo", system-ui, sans-serif',
    body: '"Archivo", system-ui, sans-serif',
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Archivo:wght@200;300;400;500;600&display=swap",
    tuning: {
      displayLineHeight: "0.94",
      displayTracking: "-0.05em",
      displayScale: "0.8",
      displayWeight: "200",
    },
  },
  {
    id: "quente",
    name: "Quente",
    description: "Serifada humanista e sans arredondada. Acolhedor, próximo.",
    display: '"Fraunces", Georgia, serif',
    body: '"Nunito Sans", system-ui, sans-serif',
    fontsUrl:
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&family=Nunito+Sans:wght@400;500;600&display=swap",
    tuning: {
      displayLineHeight: "0.9",
      displayTracking: "-0.04em",
      displayScale: "0.84",
      displayWeight: "300",
    },
  },
];

export const DEFAULT_PRESET_ID = "editorial";

export function findPreset(id: string | undefined) {
  return (
    typographyPresets.find(preset => preset.id === id) ??
    typographyPresets.find(preset => preset.id === DEFAULT_PRESET_ID)!
  );
}

/**
 * Aplica o preset ao documento: variáveis CSS no <html> e o <link> do Google
 * Fonts. Idempotente — chamar de novo com o mesmo id não faz nada.
 */
export function applyPreset(id: string | undefined) {
  const preset = findPreset(id);
  const root = document.documentElement;

  if (root.dataset.typography === preset.id) return preset;

  root.style.setProperty("--font-display", preset.display);
  root.style.setProperty("--font-body", preset.body);
  root.style.setProperty(
    "--display-line-height",
    preset.tuning.displayLineHeight
  );
  root.style.setProperty("--display-tracking", preset.tuning.displayTracking);
  root.style.setProperty("--display-scale", preset.tuning.displayScale);
  root.style.setProperty("--display-weight", preset.tuning.displayWeight);
  root.dataset.typography = preset.id;

  const LINK_ID = "typography-fonts";
  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== preset.fontsUrl) link.href = preset.fontsUrl;

  return preset;
}
