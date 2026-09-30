# Auditoria técnica — `presence-atelier` (actor-presence-prototype)

**Data:** 30/09/2026 · **Auditor:** Claude (Cowork) · **Alvo:** `C:\Users\Abimael\actor-presence-prototype-source\actor-presence-prototype`
**Objetivo:** levantar o estado real do projeto e traçar o caminho até produção no Cloudflare.

---

## 1. Veredito em uma linha

É um **protótipo de landing page estática de página única**, bem executado no visual e **tecnicamente saudável** (typecheck e build limpos), mas **não é um produto**: não tem backend, banco, autenticação, painel administrativo, versionamento nem conteúdo real. Está fortemente acoplado à infraestrutura da Manus, e o desacoplamento é a primeira tarefa obrigatória antes de qualquer deploy no Cloudflare.

---

## 2. Resposta direta: é o mesmo que `presencelib-2eron2uo.manus.space`?

**Não. É a mesma linhagem de código, mas uma versão anterior e com outro conteúdo.**

| | Cópia local | Site publicado |
|---|---|---|
| `<title>` | Mateo Valença — Actor Portfolio | Rafael Villa — Ator · Host · Presença de marca |
| Nome na página | Mateo Valença | Rafael Villa |
| `theme-color` | `#18263b` (azul-tinta) | `#101111` (quase preto) |
| `og:title` | Mateo Valença — Actor Portfolio | Rafael Villa — Presença que conecta |
| `<link rel=canonical>` | ausente | presente |

**O que liga os dois:** `.project-config.json` traz `VITE_APP_ID = 2ERon2UouaSXsZRaiBcVLd` — exatamente o subdomínio `presencelib-2eron2uo`. Ou seja, é o mesmo *app* na Manus.

**Conclusão prática:** você baixou um **checkpoint de 21/09**, e o site no ar foi iterado depois disso (mudança de nome do personagem, paleta e SEO). A pasta `.manus/checkpoint_zip` está **vazia**, e não há repositório git — então **não existe histórico local para recuperar a versão publicada**. Antes de investir na cópia local, decida: (a) partir desta versão e refazer o que mudou, ou (b) exportar de novo o estado atual do app na Manus.

---

## 3. Inventário do que existe

### 3.1 Stack real
| Camada | Tecnologia |
|---|---|
| Build | Vite 7.1.9 · TypeScript 5.6.3 · pnpm 10.4.1 |
| UI | React 19.2 · Tailwind CSS 4.1 (`@tailwindcss/vite`) · shadcn/ui (53 componentes) |
| "Servidor" | Express 4.21 — apenas `static` + fallback SPA (32 linhas) |
| Dados | **nenhum** (conteúdo hardcoded em TS) |

### 3.2 Árvore de código de autoria própria
```
client/
  index.html                     ← meta tags, fontes Google
  src/
    main.tsx  App.tsx            ← 5 e 20 linhas
    pages/Home.tsx               ← 38 linhas (a página inteira; JSX densificado em 1 linha por seção)
    pages/NotFound.tsx           ← 49 linhas — INALCANÇÁVEL (sem router)
    index.css                    ← 21 linhas minificadas = todo o design system
    lib/actorContent.ts          ← 41 linhas — ÚNICA fonte de conteúdo
    lib/siteContent.ts           ← 111 linhas — CÓDIGO MORTO (outro projeto)
    components/Map.tsx           ← 155 linhas — não usado
    components/ManusDialog.tsx   ← acoplamento Manus
    components/ui/*              ← 53 componentes shadcn, 2 em uso
server/index.ts                  ← estático + fallback
shared/const.ts                  ← 2 linhas (cookie de sessão nunca usado)
```
Total de código relevante: **~300 linhas** fora do `ui/`.

### 3.3 Seções da página (consolidadas e funcionando)
`01 Início (hero)` · `02 Sobre` · `03 Portfólio (4 itens, filtro por categoria)` · `04 Eventos (3 itens)` · `05 Galeria (5 imagens, lightbox)` · `06 Notas (3 cards, sem destino)` · `Conceito admin (modal ilustrativo)` · `Contato` · `Footer`

Interações implementadas: menu mobile, filtro de portfólio, modal de detalhe, lightbox, lock de scroll, `prefers-reduced-motion`, `ErrorBoundary`, tema dark forçado.

---

## 4. O que está consolidado ✅

1. **Build e types limpos.** Validado em ambiente limpo: `tsc --noEmit` → 0 erros; `vite build` → sucesso em 3,5 s.
2. **CSS artesanal e coerente.** Design tokens em `:root`, grid assimétrico do portfólio, responsivo em `max-width:850px`, animações com `--ease` customizado. É o maior ativo do projeto.
3. **Conteúdo já desacoplado da view.** `actorContent.ts` centraliza textos, portfólio, eventos, galeria e notas — pronto para virar CMS/API sem reescrever o frontend.
4. **Arquitetura estática pura.** Zero chamadas de API no runtime da aplicação → candidato ideal a Cloudflare Pages/Workers Assets.
5. **Acessibilidade básica.** `aria-label` nos botões de menu/fechar, `alt` nas imagens, `lang="pt-BR"`, hierarquia `h1→h2→h3`, `loading="lazy"`.

---

## 5. O que NÃO está pronto ❌ — riscos e bloqueios

### 🔴 Bloqueadores (resolver antes de qualquer deploy)

**B1 — Segredos em texto puro no arquivo `.project-config.json`**
```
JWT_SECRET, BUILT_IN_FORGE_API_KEY, VITE_FRONTEND_FORGE_API_KEY,
OWNER_OPEN_ID, e um token git (art_v2_x_[redigido], expirado em 21/09)
```
O arquivo está no `.gitignore` (bom), mas **existe em claro no seu disco**. Como esta pasta veio do GitHub, confirme que ele nunca foi commitado. Todas essas chaves são da Manus → **rotacione/descarte e delete o arquivo** ao migrar.

**B2 — Sem controle de versão.** Não é repositório git. Sem histórico, sem branch, sem rollback. Qualquer erro é irreversível.

**B3 — Acoplamento total à Manus.** Precisa sair antes do Cloudflare:
| Ponto | Arquivo |
|---|---|
| `vitePluginManusRuntime()` | `vite.config.ts` |
| `vitePluginManusDebugCollector()` (grava logs em `.manus-logs/`) | `vite.config.ts` |
| `vitePluginStorageProxy()` → `forge.manus.ai` | `vite.config.ts` |
| `allowedHosts: [".manusvm.computer", …]` | `vite.config.ts` |
| `/__manus__/debug-collector.js` + `version.json` | `client/public/` |
| OAuth contra `manus.im` (`getLoginUrl`) | `client/src/const.ts` |
| Google Maps via proxy Forge | `client/src/components/Map.tsx` |
| `ManusDialog.tsx` | `client/src/components/` |

**B4 — `index.html` de 368 kB.** O runtime da Manus é **inlinado dentro do HTML** (105 kB gzip, não cacheável separadamente). Medição real:

| Build | index.html | CSS | JS |
|---|---|---|---|
| Como está | **368,1 kB** (105,7 gzip) | 107,2 kB | 332,6 kB |
| Sem plugins Manus | **1,2 kB** (0,6 gzip) | 107,2 kB | 321,9 kB |
| Sem plugins + sem `ui/` não usado | **1,2 kB** | **43,2 kB** (9,7 gzip) | 321,9 kB |

Ou seja: **−367 kB no HTML e −64 kB no CSS** só limpando. Ganho gigante de LCP, direto.

**B5 — Todas as imagens são hotlink externo.** 9 de `files.manuscdn.com` (CDN da Manus — **vai cair quando você sair**) + 3 do Unsplash. Nenhuma imagem própria no repositório.

**B6 — Contato não funciona.** `contact: { whatsapp: "", instagram: "", email: "", phone: "" }`. Todos os botões "Fale comigo" caem no aviso "configure o número". O CTA principal do site é inoperante.

### 🟡 Importantes

- **B7 — Conteúdo 100% fictício.** Nome, textos, portfólio, eventos e notas são demonstrativos (o próprio texto admite: *"Este protótipo utiliza conteúdo demonstrativo"*). Não há cliente real definido.
- **B8 — Sem painel admin.** A seção "Pensado para evoluir" é um **modal com uma lista** do que *poderia* ser editável. Não existe backend, banco, auth nem CRUD.
- **B9 — Sem rotas reais.** `wouter` está instalado (com patch!) mas não usado; `App.tsx` renderiza `<Home />` direto. `NotFound.tsx` é inalcançável. Navegação é só âncora `#`.
- **B10 — SEO incompleto.** Sem `canonical`, `og:image`, `og:url`, `robots.txt`, `sitemap.xml`, favicon, dados estruturados (`Person`/`JSON-LD`). Cards de compartilhamento sairão sem imagem.
- **B11 — Cards de "Notas" sem destino.** Renderizam seta de link mas não são clicáveis.
- **B12 — `node_modules` inutilizável fora do Windows.** A instalação pnpm usa junctions que não resolvem pelo bridge Linux, e `pnpm` não está no PATH da máquina. Precisa `corepack enable` + reinstalação limpa.
- **B13 — Zero testes.** `vitest` instalado, nenhum arquivo de teste. `test_command` configurado mas vazio.

### 🟢 Dívida menor

- `siteContent.ts` (111 linhas do *seu* portfólio pessoal) é código morto vindo de outra iteração — remover.
- ~40 dependências instaladas e não usadas: `axios`, `recharts`, `embla-carousel-react`, `react-day-picker`, `react-hook-form`, `zod`, `@hookform/resolvers`, `cmdk`, `vaul`, `streamdown`, `next-themes`, `input-otp`, `react-resizable-panels`, `framer-motion`, `nanoid`, `@types/google.maps`, e ~25 pacotes `@radix-ui/*`.
- `server/index.ts` + `express` → desnecessários no Cloudflare Pages (o fallback SPA é configuração, não código).
- Todo o JSX de `Home.tsx` está comprimido em linhas gigantes — funciona, mas é hostil a manutenção e a diffs.
- `.manus-logs/` (36 kB de logs de sessão) deve sair do projeto.

---

## 6. Viabilidade Cloudflare — validada ✅

A aplicação é **100% estática, sem nenhuma chamada a API própria**. Isso a torna praticamente ideal para Cloudflare. Recomendação:

**Cloudflare Workers Assets (ou Pages)** — build `vite build`, diretório `dist/public`, sem runtime de servidor. Custo zero no plano free, CDN global, SSL automático.

O `server/index.ts` em Express **não é portado** — seu único trabalho (servir estáticos + fallback para `index.html`) é resolvido declarativamente:

```jsonc
// wrangler.jsonc
{
  "name": "presence-atelier",
  "compatibility_date": "2026-09-30",
  "assets": {
    "directory": "./dist/public",
    "not_found_handling": "single-page-application"
  }
}
```

Quando (e se) surgir backend real para o painel admin, o caminho natural dentro do seu stack já conhecido é **Workers + D1** (ou Supabase, que você já usa) + **R2/Cloudflare Images** para as fotos.

---

## 7. Roadmap até produção

### Fase 0 — Decisões (antes de tocar no código)
1. **Esta versão ou a publicada?** Reexportar o app atual da Manus, ou seguir do checkpoint local e refazer as mudanças (nome, paleta, canonical)?
2. **Quem é o cliente real?** "Mateo Valença"/"Rafael Villa" são fictícios. Sem cliente, o conteúdo real não existe.
3. **Site institucional ou produto?** Uma landing de portfólio estática, ou uma plataforma multi-ator com painel (o que muda a arquitetura por completo)?

### Fase 1 — Fundação (1 sessão)
- `git init`, primeiro commit, repositório privado em `LeamibaSotnas`
- Deletar `.project-config.json` e `.manus-logs/`; descartar as chaves da Manus
- Remover o `_audit_tmp/src.tar.gz` que deixei na pasta (o bridge não tem permissão de delete)

### Fase 2 — Desacoplamento da Manus (1 sessão)
- `vite.config.ts` limpo: só `react()` + `tailwindcss()`; fora debug collector, storage proxy, jsx-loc, `allowedHosts`
- Deletar `client/public/__manus__/`, `ManusDialog.tsx`, `Map.tsx`, `siteContent.ts`, `client/src/const.ts`, `shared/const.ts`
- Remover `server/` e `express`; ajustar scripts de `package.json`
- Podar `client/src/components/ui/` para o que é usado + as ~40 deps mortas
- **Resultado medido: HTML 368 → 1,2 kB · CSS 107 → 43 kB**

### Fase 3 — Ativos e conteúdo próprios (1–2 sessões)
- Baixar as 12 imagens, otimizar (WebP/AVIF, responsive `srcset`) e servir do próprio domínio ou R2
- Preencher `contact` com WhatsApp/Instagram/e-mail reais → CTAs passam a funcionar
- Substituir textos, portfólio, eventos e galeria por conteúdo real
- SEO: canonical, `og:image`, favicon, `robots.txt`, `sitemap.xml`, JSON-LD `Person`

### Fase 4 — Deploy Cloudflare (1 sessão)
- `wrangler.jsonc` + `wrangler deploy`; domínio custom + DNS
- Cache headers (`assets/*` imutável, HTML curto)
- Validar Lighthouse (meta: 95+ em performance com o HTML enxuto)

### Fase 5 — Robustez (opcional, conforme Fase 0)
- Router real (`wouter`, já pago) para `/projeto/:slug` e 404 de verdade
- Testes de smoke com vitest; CI no GitHub Actions
- Analytics próprio (Cloudflare Web Analytics substitui `manus-analytics.com`)
- **Se for produto:** Workers + D1/Supabase, auth, CRUD e o painel admin que hoje é maquete

---

## 8. Próximo passo sugerido

Fases 1 e 2 são mecânicas, de baixo risco e entregam o maior ganho por esforço (o site fica 367 kB mais leve e livre da Manus). Posso executá-las na sua máquina agora, entregando os arquivos completos alterados. Só preciso da sua resposta à **pergunta 1 da Fase 0**: seguir deste checkpoint ou reexportar da Manus primeiro?
