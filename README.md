# Presence Atelier

Landing page de portfólio para atores e talentos de presença comercial.
Template white-label: todo o conteúdo vive em **um único arquivo de configuração**.

Tem painel administrativo em `/admin`: o cliente edita textos, envia fotos e
vídeos, escolhe a tipografia e lê os contatos que chegam pelo formulário.

**Stack:** React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · wouter · shadcn/ui
**Backend:** Cloudflare Worker + D1 (conteúdo e contatos) + R2 (mídia)
**Deploy:** Cloudflare — uma infraestrutura só

> Para colocar o painel no ar e entender como ele funciona: **[PAINEL.md](PAINEL.md)**.

---

## Começando

```bash
corepack enable          # habilita o pnpm que vem com o Node
pnpm install
pnpm dev                 # http://localhost:3000
```

| Comando             | O que faz                                   |
| ------------------- | ------------------------------------------- |
| `pnpm dev`          | Servidor de desenvolvimento com HMR         |
| `pnpm build`        | Build de produção em `dist/`                |
| `pnpm preview`      | Serve o build local para conferência        |
| `pnpm check`        | `tsc --noEmit` — checagem de tipos          |
| `pnpm format`       | Prettier em tudo                            |
| `pnpm images:fetch` | Baixa as imagens remotas para o repositório |
| `pnpm cf:deploy`    | Build + deploy no Cloudflare                |

---

## Como personalizar

### 1. Conteúdo — pelo painel ou pelo arquivo

Com o painel no ar, o conteúdo vive no D1 e o cliente edita em `/admin`.

`client/src/config/site.config.ts` continua sendo a **base e a rede de
segurança**: é o que o site mostra antes da primeira edição, e é para onde ele
cai se a API estiver fora do ar. Vale editá-lo para definir o ponto de partida
de uma nova instância do template. Nenhum
componente de seção tem texto fixo. O arquivo abre com um checklist de
personalização; siga-o de cima para baixo.

Campos que exigem atenção:

- **`contact`** — enquanto `whatsapp` estiver vazio, todos os CTAs mostram um
  aviso em vez de abrir a conversa. Use só dígitos com DDI: `"5511999999999"`.
- **`isDemo`** — mude para `false` ao publicar com conteúdo real; os avisos de
  "conteúdo demonstrativo" desaparecem da interface.
- **`seo.canonical`** e **`seo.ogImage`** — hoje apontam para `example.com`.

### 2. Meta tags — `client/index.html`

As tags de `<head>` (title, description, canonical, Open Graph, JSON-LD) são
**estáticas** — não são geradas a partir do config, porque a página é um SPA e
os crawlers leem o HTML antes do JavaScript rodar. Ao trocar a identidade,
atualize os dois lugares. Também substitua `client/public/favicon.svg`,
`robots.txt` e `sitemap.xml`, e adicione um `og-image.jpg` de 1200×630.

### 3. Design — `client/src/index.css`

CSS artesanal, escrito à mão, em duas partes:

1. **Tokens do shadcn/ui** — necessários para os componentes de `components/ui/`
   funcionarem. Não mexa a menos que queira trocar a paleta do kit.
2. **Design system do site** — tokens próprios (`--ink`, `--cream`, `--peach`,
   `--brown`, `--blue`) e todas as classes das seções. É aqui que se muda a
   identidade visual: trocar os 5 tokens de cor muda o site inteiro.

O arquivo está em CSS minificado por linha (uma regra por linha, densa). Está no
`.prettierignore` de propósito, para o Prettier não reformatar tudo.

### 4. Imagens

⚠️ As imagens de demonstração apontam para CDNs externas (Manus e Unsplash). A
CDN da Manus **deixará de servir esses arquivos**. Antes de publicar:

```bash
pnpm images:fetch
```

O script baixa cada imagem para `client/public/images/`, reescreve o bloco `IMG`
do config com caminhos locais e é idempotente. Depois faça commit da pasta.

---

## Estrutura

```
client/
  index.html                   meta tags, fontes, JSON-LD
  public/                      favicon, robots, sitemap, _headers, images/
  src/
    config/site.config.ts      ★ conteúdo padrão (base e fallback)
    config/themes.ts           presets de tipografia
    index.css                  design system (shadcn tokens + CSS próprio)
    App.tsx                    router (wouter) + providers
    main.tsx                   bootstrap
    pages/
      Home.tsx                 orquestra as seções e o estado dos overlays
      NotFound.tsx             404
    components/
      layout/                  SiteHeader, MobileMenu, SiteFooter, BrandMark
      sections/                Hero, About, Portfolio, Events, Gallery,
                               Notes, AdminConcept, Contact
      overlays/                Overlay (base), ProjectDetailModal,
                               Lightbox, EditableAreasModal
      ui/                      shadcn/ui — 53 componentes disponíveis
      ErrorBoundary.tsx
    pages/admin/               painel administrativo (carregado sob demanda)
    contexts/SiteContext.tsx   carrega o conteúdo da API e mescla sobre o padrão
    lib/api.ts                 cliente da API
    lib/media-compress.ts      compressão de imagem no navegador
    hooks/
      useContactActions.ts     WhatsApp / Instagram / e-mail + aviso de config
      useScrollLock.ts         trava scroll com overlay aberto
      useComposition.ts        IME em input/textarea
      usePersistFn.ts
    contexts/ThemeContext.tsx  tema (dark fixo por padrão)
    lib/utils.ts               cn()
worker/                        API: auth, conteúdo, mídia, contatos
migrations/                    schema do D1
scripts/fetch-remote-images.mjs
scripts/create-admin.mjs
wrangler.jsonc                 configuração do deploy e dos bindings
```

### Como adicionar uma seção

1. Acrescente o conteúdo em `site.config.ts` (com o tipo correspondente).
2. Crie `components/sections/MinhaSection.tsx` lendo do config.
3. Estilize em `index.css`.
4. Monte em `pages/Home.tsx` e adicione o item em `siteConfig.nav`.

### Como adicionar uma rota

O router já está montado. Em `App.tsx`, antes do fallback:

```tsx
<Route path="/projeto/:id" component={ProjectPage} />
```

Funciona com URL direta e refresh porque o Cloudflare está configurado com
`not_found_handling: "single-page-application"`.

---

## Deploy no Cloudflare

Primeira vez:

```bash
npx wrangler login
pnpm cf:deploy
```

A configuração está em `wrangler.jsonc`: serve `dist/` direto do CDN, sem Worker
script. `client/public/_headers` define o cache (assets imutáveis, HTML
revalidado) e os headers de segurança.

Domínio próprio: adicione um Custom Domain ao Worker no painel da Cloudflare.

Antes do primeiro deploy é preciso criar o banco e o bucket e preencher o
`database_id` em `wrangler.jsonc` — o passo a passo está em
[PAINEL.md](PAINEL.md).

---

## Notas de manutenção

- **`components/ui/` tem 53 componentes, 2 em uso** (sonner, tooltip). Mantidos
  de propósito, como kit. Eles custam ~80 kB no CSS final (21 kB gzip) porque o
  Tailwind varre os arquivos. Se em algum momento você fixar quais usa, apagar
  o resto derruba o CSS para ~43 kB.
- **Sem testes automatizados.** `vitest` está instalado e não há nenhum arquivo
  de teste. A API e o painel foram validados manualmente ponta a ponta.
- **Origem:** o projeto nasceu na plataforma Manus. Todo o acoplamento foi
  removido — runtime, coletor de debug, proxy de storage, OAuth e o servidor
  Express que só servia estáticos. O histórico anterior a este repositório não
  existe localmente. Uma versão posterior desta base foi publicada em
  `presencelib-2eron2uo.manus.space` com outra identidade ("Rafael Villa") e
  não está neste código.
- **Auditoria completa:** `AUDITORIA.md`.
