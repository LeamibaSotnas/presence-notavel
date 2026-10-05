# Auditoria Fase 0 — Presence Atelier

**Data:** 05/10/2026 · **Alvo:** `https://presence-atelier.abima9054.workers.dev`
**Versão em produção:** Worker `fdb463dd` · repositório local em `9abefce`
**Natureza desta fase:** reconhecimento. **Nenhum código, dado, configuração ou deploy foi alterado.**

---

## 1. Resumo executivo

O Presence Atelier é hoje um **produto funcional em produção**, não um protótipo. A página
pública está no ar, o painel administrativo autentica, o conteúdo vive no banco e já foi
editado por você, e uma mídia já foi enviada pelo painel. O caminho crítico
**editar → publicar → o visitante vê** está comprovadamente fechado.

A base técnica é sólida e proporcional ao tamanho do produto: uma infraestrutura só, um
Worker enxuto, latência baixa (TTFB de 193 ms), estabilidade visual excelente
(CLS 0,0008) e todas as rotas privadas recusando acesso sem sessão. **Não há nada aqui
que justifique refazer ou trocar de arquitetura.**

O que separa o estado atual de um produto vendável não é arquitetura — são **três
categorias de lacuna**:

1. **Continuidade.** O repositório não tem remoto. O código existe num único disco. Uma
   falha de hardware hoje significa perda total. É o risco mais grave do projeto e o mais
   barato de eliminar.

2. **Integridade e governança.** Publicar sobrescreve o documento inteiro, sem versão,
   sem histórico e sem registro de quem fez o quê. E existe um caminho confirmado em que
   uma falha momentânea da API faz o painel publicar o conteúdo de fábrica por cima do
   conteúdo real do cliente.

3. **Apresentação comercial.** O site anuncia `example.com` no canonical e no
   compartilhamento, exibe avisos de "conteúdo demonstrativo", e o nome que você define
   no painel não chega ao título da aba nem ao card de compartilhamento. Hoje o produto
   parece inacabado por motivos de configuração, não de engenharia.

**Veredito:** o produto está a poucos ciclos de ser vendável. A prioridade não é
construir mais — é **blindar o que já existe** e **terminar a apresentação**.

---

## 2. Escopo analisado e não analisado

### Analisado
- Repositório completo na máquina (código, migrations, configuração, histórico git)
- Worker em produção: rotas, headers, autenticação, respostas
- Banco D1: schema, índices, conteúdo publicado (via API pública de leitura)
- Página pública em produção: carregamento, recursos, métricas, DOM, acessibilidade
- Configuração Cloudflare: bindings, assets, cron, variáveis
- Fluxo de dados ponta a ponta por leitura de código

### Não analisado
- Painel autenticado **em produção** — não possuo a senha, e não a solicito
- Formulário de leads **em produção** — é operação de escrita; não executada
- Rate limit de login **em produção** — exercitá-lo bloquearia seu acesso por 15 minutos
- Logs do Cloudflare e observabilidade em tempo real — requerem acesso ao dashboard
- Restauração real do D1 (Time Travel) — operação sobre produção
- Comportamento em rede lenta, offline e em aparelhos reais

---

## 3. Limitações de evidência

Três medições ficaram inválidas e **não devem ser tratadas como resultado**:

| Medição | Por que não vale | Como obter |
|---|---|---|
| LCP | A aba ficou em segundo plano; o navegador suspende o observador. `lcp_entries: 0` | Lighthouse ou PageSpeed Insights com a aba em foco |
| FCP (20.836 ms) | Mesma causa. O número é artefato de medição, não realidade | idem |
| Cache efetivo dos assets | O header conflitante está **confirmado**; o efeito prático no cache é **provável**, não medido | Duas cargas consecutivas observando `cf-cache-status` |

O proxy de saída do meu ambiente bloqueia `workers.dev`, então as sondagens de produção
foram feitas pelo seu navegador. Nenhum segredo, token, cookie ou dado pessoal aparece
neste relatório.

---

## 4. Mapa da arquitetura atual

```
                    ┌──────────────── Cloudflare ────────────────┐
  Visitante  ──────▶│                                            │
                    │  Worker (worker/index.ts)                  │
  Administrador ───▶│   ├─ /api/*    → API (run_worker_first)    │
                    │   ├─ /media/*  → R2 (run_worker_first)     │
                    │   └─ resto     → ASSETS (SPA fallback)     │
                    │                                            │
                    │  D1  presence-atelier-db                   │
                    │   admin_users · sessions · content         │
                    │   media · leads · rate_limits              │
                    │                                            │
                    │  R2  presence-atelier-media                │
                    │                                            │
                    │  Cron diário 04:00 UTC → limpeza           │
                    └────────────────────────────────────────────┘
```

**Stack:** React 19 · TypeScript 5.6 · Vite 7 · Tailwind 4 · wouter · shadcn/ui ·
Cloudflare Workers + D1 + R2 · pnpm 10 · wrangler 4.145

**Volume:** ~6.500 linhas de código próprio (excluindo os 53 componentes shadcn/ui),
83 linhas de SQL, 6 tabelas, 7 índices.

---

## 5. Mapa do produto e fluxo de dados

```
PUBLICAÇÃO    Admin edita em /admin → rascunho local → PUT /api/content
              → D1.content (linha única id=1) → GET /api/content
   ⚠ sem versão · sem histórico · sem estado de rascunho no servidor · sem registro de ação

VISITANTE     GET / → HTML estático → JS (110 kB) → GET /api/content
              → merge sobre site.config.ts → render
   ⚠ hero só começa a baixar depois de JS+CSS · metadados do <head> são estáticos

INTERAÇÃO     Visitante navega, filtra portfólio, abre galeria
   ✓ sem fragilidade identificada

CONTATO       Formulário → POST /api/leads → D1.leads → redirect wa.me
   ✓ honeypot · tempo mínimo · 2 limites de taxa · consentimento LGPD
   ⚠ não exercitado em produção

ADMIN         Login → PBKDF2 no navegador → SHA-256 salgado no servidor
              → sessão em cookie httpOnly 14 dias
   ⚠ sem RBAC · sem recuperação de senha · sem lista/revogação de sessões

GESTÃO        4 telas: Conteúdo · Mídia · Contatos · Tipografia
   ⚠ sem dashboard · sem indicadores · sem "o que mudou"

DADOS         D1 (conteúdo, contatos, sessões) + R2 (mídia)
   ⚠ exclusão de mídia não checa referências · listagens truncam em silêncio

AUDITORIA     ❌ NÃO EXISTE
   Único rastro: content.updated_by, sobrescrito a cada publicação
```

---

## 6. Inventário

### Endpoints (13)

| Rota | Método | Auth | Observação |
|---|---|---|---|
| `/api/health` | GET | pública | expõe só os limites de upload |
| `/api/content` | GET | pública | conteúdo do site |
| `/api/content` | PUT | sessão | **sobrescreve o documento inteiro** |
| `/api/leads` | POST | pública | honeypot + 2 limites de taxa |
| `/api/leads` | GET | sessão | LIMIT 300 fixo |
| `/api/leads/export` | GET | sessão | CSV com BOM |
| `/api/leads/:id` | PATCH, DELETE | sessão | — |
| `/api/media` | GET, POST | sessão | LIMIT 500 fixo |
| `/api/media/:key` | DELETE | sessão | **não checa uso** |
| `/api/auth/login` | POST | pública | 8 tentativas / 15 min / IP |
| `/api/auth/logout` | POST | sessão | — |
| `/api/auth/me` | GET | pública | 401 quando sem sessão |
| `/media/*` | GET | pública | R2, Range, cache imutável |

**Verificado em produção, sem sessão:** `auth/me`, `leads`, `leads/export`, `media`,
`PUT content`, `DELETE media` e uma rota inexistente **todos devolveram 401**. A rota
falsa devolver 401 em vez de 404 é desejável — não revela quais rotas existem.

### Rotas do cliente
`/` · `/admin` · `/admin/midia` · `/admin/contatos` · `/admin/tipografia` · 404

### Banco
`admin_users` · `sessions` · `content` · `media` · `leads` · `rate_limits`

### Variáveis
`SITE_URL` (pública, hoje `https://example.com`) · `LEAD_WEBHOOK_URL` (segredo, opcional,
não configurado). Nenhum segredo literal no repositório — verificado por varredura.
`.gitignore` cobre `.env`, `.dev.vars` e `.wrangler`.

### Estado em produção, medido
- Conteúdo publicado: **16 seções, 7 kB**, `identity.name = "LUCAS"`
- Mídia: **1 arquivo no R2** (o fundo do topo), 12 referências a arquivos estáticos
- `isDemo: true` · `theme: editorial` · WhatsApp **preenchido**

---

## 7. Pontos fortes — não mexer

1. **Autorização correta e comprovada.** Toda rota privada recusa sem sessão. Verificado
   em produção, não presumido.
2. **Alongamento de senha no navegador.** 210.000 iterações PBKDF2 no cliente, SHA-256
   salgado no servidor. Contorna o teto de 100.000 iterações e o limite de 10 ms de CPU do
   Workers **sem perder o fator de trabalho**. A senha crua não sai do navegador.
3. **Sessão bem construída.** Cookie httpOnly + Secure + SameSite=Lax; só o SHA-256 do
   token no banco; conferência de Origin nas escritas; limpeza por cron.
4. **Estabilidade visual.** CLS de **0,0008**. Praticamente zero. As alturas fixas no CSS
   resolvem sem precisar de `width`/`height` nas imagens.
5. **Latência.** TTFB de **193 ms**.
6. **Enxutez.** 9 requisições, 434 kB. O painel é carregado sob demanda — o visitante não
   baixa um byte dele.
7. **Headers de segurança nos estáticos.** `nosniff`, `SAMEORIGIN`, `Referrer-Policy`,
   `Permissions-Policy` confirmados em produção. O `_headers` **funciona** com Workers Assets.
8. **Defesa do formulário em camadas.** Honeypot, tempo mínimo, dois limites de taxa
   separados, validação estrita no servidor, consentimento LGPD, IP nunca armazenado.
9. **Fallback do conteúdo.** Se a API cair, o site renderiza com o config embutido. O
   visitante nunca vê erro. *(O mesmo mecanismo gera um risco no painel — ver R-02.)*
10. **Design system próprio.** CSS artesanal, tipografia por variáveis, seis presets
    testados. É o ativo comercial do produto.

---

## 8. Matriz de risco

Legenda — **G**ravidade · **P**robabilidade · **D**etectabilidade · **R**eversibilidade

| # | Achado | Categoria | Evidência | G | P | D | R | Prio |
|---|---|---|---|---|---|---|---|---|
| R-01 | **Repositório sem remoto.** `git remote -v` vazio. Código existe num disco só | Governança | CONFIRMADO | Crítico | Média | Fácil | **Difícil** | **P0** |
| R-02 | **Publicação pode apagar o conteúdo real.** Se `/api/content` falhar, o painel inicializa com o config de fábrica e publicar sobrescreve o banco | Integridade | CONFIRMADO | Crítico | Média | **Difícil** | Difícil | **P0** |
| R-03 | **Sem histórico nem rollback de conteúdo.** Publicar sobrescreve a linha id=1 | Integridade | CONFIRMADO | Alto | Alta | Difícil | Difícil | **P0** |
| R-04 | **Sem registro de ações.** Nenhuma tabela de auditoria | Governança | CONFIRMADO | Alto | Alta | Difícil | Fácil | **P1** |
| R-05 | **Concorrência silenciosa.** Duas abas publicando: a última vence, sem aviso | Integridade | CONFIRMADO | Alto | Média | Difícil | Difícil | **P1** |
| R-06 | **`canonical`, `og:image`, `og:url`, JSON-LD e sitemap apontam para `example.com`** | Negócio | CONFIRMADO | Alto | Alta | Fácil | Fácil | **P1** |
| R-07 | **Metadados não acompanham o painel.** Banco diz "LUCAS"; `<title>` e OG dizem "Mateo Valença" | Negócio | CONFIRMADO | Alto | Alta | Fácil | Fácil | **P1** |
| R-08 | **`isDemo: true` em produção.** O site anuncia que é demonstração | Negócio | CONFIRMADO | Alto | Alta | Fácil | Fácil | **P1** |
| R-09 | **`Cache-Control` duplicado e conflitante** nos assets: `max-age=0, must-revalidate` **e** `max-age=31536000, immutable` na mesma resposta | Performance | CONFIRMADO | Médio | Alta | Moderada | Fácil | **P1** |
| R-10 | **LCP depende do JS.** O fundo do topo é `background-image` de um `div` que só existe após o React montar. Sem `preload` | Performance | CONFIRMADO | Alto | Alta | Moderada | Fácil | **P1** |
| R-11 | **Exclusão de mídia não checa referências.** Apagar uma imagem em uso quebra o site em silêncio | Integridade | CONFIRMADO | Alto | Média | Difícil | **Difícil** | **P1** |
| R-12 | **SVG aceito no upload** e servido na mesma origem do painel → XSS armazenado | Segurança | CONFIRMADO | Alto | Baixa | Difícil | Moderada | **P1** |
| R-13 | **Sem recuperação de senha.** Redefinição só por linha de comando | Operação | CONFIRMADO | Médio | Alta | Fácil | Fácil | **P1** |
| R-14 | **Sem RBAC.** Todo usuário do painel tem poder total | Segurança | CONFIRMADO | Médio | Baixa | Fácil | Fácil | P2 |
| R-15 | **Sem CSP nem HSTS** | Segurança | CONFIRMADO | Médio | Média | Fácil | Fácil | P2 |
| R-16 | **Tipo do upload vem do cliente** (`file.type`), sem verificação de assinatura | Segurança | CONFIRMADO | Médio | Baixa | Difícil | Fácil | P2 |
| R-17 | **Listagens truncam em silêncio** (300 contatos, 500 mídias) | Negócio | CONFIRMADO | Médio | Média | Difícil | Fácil | P2 |
| R-18 | **Soft 404.** Rota inexistente devolve HTTP 200 com o SPA | SEO | CONFIRMADO | Médio | Alta | Moderada | Fácil | P2 |
| R-19 | **Sem staging.** Só existe produção | Estabilidade | CONFIRMADO | Médio | Alta | Fácil | Fácil | P2 |
| R-20 | **Sem testes automatizados** | Manutenção | CONFIRMADO | Médio | Alta | Fácil | Fácil | P2 |
| R-21 | **Imagens em JPEG**, hero de 291 kB, sem WebP/AVIF nem `srcset` | Performance | CONFIRMADO | Médio | Alta | Fácil | Fácil | P2 |
| R-22 | **Sem painel de observabilidade.** `observability.enabled` grava logs, mas não há alerta nem consulta | Governança | CONFIRMADO | Médio | Média | Moderada | Fácil | P2 |
| R-23 | **Respostas da API sem `nosniff`** | Segurança | CONFIRMADO | Baixo | Alta | Fácil | Fácil | P3 |
| R-24 | **`.git/index.lock` pendente** no repositório | Manutenção | CONFIRMADO | Baixo | Alta | Fácil | Fácil | P3 |
| R-25 | **Sem política de retenção de contatos** (LGPD) | Governança | CONFIRMADO | Baixo | Média | Fácil | Fácil | P3 |
| R-26 | **Sem link "pular para o conteúdo"** | Acessibilidade | CONFIRMADO | Baixo | Alta | Fácil | Fácil | P3 |

**Critério de prioridade:** P0 é tudo que pode causar perda irreversível de código ou de
dados do cliente. P1 é o que impede vender (apresentação) ou pode corromper dados em uso
normal. P2 é endurecimento e maturidade. P3 é refinamento.

---

## 9. Os dois riscos que exigem atenção imediata

### R-01 — O código existe em um disco só

`git remote -v` não retorna nada. Os 136 arquivos versionados e todo o histórico vivem
apenas em `C:\Users\Abimael\...`. Não há cópia no GitHub nem em lugar algum.

**Impacto:** perda de hardware, ransomware ou uma pasta apagada por engano significam
recomeçar. O Worker em produção continuaria no ar, mas sem código-fonte para corrigir
nada. Para um produto que você pretende vender e manter, isso é inaceitável.

**Correção:** criar um repositório privado e empurrar. Cinco minutos, risco zero,
totalmente reversível. **É o próximo passo recomendado.**

### R-02 — Uma falha de rede pode apagar o conteúdo do cliente

Confirmado por leitura de código, em três pontos que se encaixam:

1. `SiteContext` captura qualquer erro de `/api/content` **em silêncio** e segue com o
   config de fábrica — comportamento correto para o visitante.
2. `useContentDraft` inicializa o rascunho a partir dessa configuração efetiva.
3. `save()` envia **o documento inteiro**, não um diff.

**Cenário:** o cliente abre `/admin` num momento de instabilidade. A chamada falha. O
painel carrega os textos de fábrica — e **não há nada na tela dizendo isso**. Ele corrige
uma palavra, clica em Publicar. O conteúdo real é substituído pelo de fábrica.

**Por que é grave:** silencioso, plausível em uso normal, e sem histórico (R-03) não há
como desfazer além do Time Travel do D1, que tem 7 dias e exige linha de comando.

**Correção proporcional:** distinguir "não há conteúdo salvo" de "não consegui carregar",
e bloquear a publicação no segundo caso com uma mensagem clara. Mudança pequena,
localizada em dois arquivos.

---

## 10. Dívida técnica: perigosa × apenas inconveniente

**Perigosa** — pode causar perda ou incidente:
R-01 (sem remoto) · R-02 (sobrescrita) · R-03 (sem histórico) · R-05 (concorrência) ·
R-11 (mídia órfã) · R-12 (SVG)

**Inconveniente** — custa tempo, não causa dano:
R-13 (senha por CLI) · R-17 (truncamento) · R-19 (sem staging) · R-20 (sem testes) ·
R-24 (lock) · 51 componentes shadcn não usados (custo: ~80 kB de CSS, 21 kB comprimido —
decisão consciente sua, mantida)

---

## 11. Oportunidades de produto

| Oportunidade | Por que eleva o produto | Esforço |
|---|---|---|
| **Metadados dinâmicos** | Hoje o cliente renomeia o site e a aba continua com o nome anterior. É o detalhe que mais denuncia produto inacabado | Baixo |
| **Dashboard com indicadores** | O admin abre o painel e cai num formulário. Deveria ver: contatos novos, última publicação, o que está pendente | Médio |
| **Estados de conteúdo** (rascunho → publicado) | Hoje "Publicar" é tudo ou nada. Estados dão confiança para editar sem medo | Médio |
| **Histórico com restauração** | "Voltar para a versão de ontem" é o que transforma o painel em ferramenta de gestão | Médio |
| **Registro de ações** | Responde "quem mudou isso e quando" — exigência de qualquer produto vendido a terceiros | Médio |
| **Provisionamento de nova instância** | Hoje cada cliente exige uma sequência manual de 6 comandos. Um script reduz a 1 | Baixo |
| **Preload do topo + WebP** | Ganho direto de LCP, que é a métrica que o cliente percebe como "rápido" | Baixo |

---

## 12. Roadmap até novembro de 2026

Hoje é **05/10**. Até o fim de novembro há cerca de **8 semanas**. O roadmap abaixo cabe
nesse prazo **se a ordem for respeitada**. A ordem obedece à sua prioridade declarada:
segurança → estabilidade → integridade → governança → lógica → UX → UI → performance →
conversão.

| Ciclo | Período | Foco | Entrega |
|---|---|---|---|
| **C0** | 06–07/10 | Continuidade | Repositório remoto, limpeza do lock, backup do D1 documentado |
| **C1** | 08–14/10 | Integridade | R-02, R-05, R-11 — o conteúdo do cliente deixa de poder se perder |
| **C2** | 15–21/10 | Governança | Registro de ações, histórico de conteúdo com restauração |
| **C3** | 22–28/10 | Estados e lógica | Rascunho/publicado, validação servidor, paginação |
| **C4** | 29/10–04/11 | Segurança | CSP, HSTS, SVG, assinatura de arquivo, recuperação de senha, RBAC mínimo |
| **C5** | 05–11/11 | Experiência admin | Dashboard, indicadores, feedback, confirmações |
| **C6** | 12–18/11 | Página pública | LCP, WebP, metadados dinâmicos, SEO, soft 404, a11y |
| **C7** | 19–25/11 | Comercialização | Provisionamento, testes de regressão, documentação de entrega |
| **C8** | 26–30/11 | Validação | Linha de base comparada, checklist de aceitação, folga para imprevistos |

**O que fica de fora por decisão, não por esquecimento:** staging dedicado, CI/CD,
multi-tenant, transcodificação de vídeo, i18n. Nenhum é necessário para vender em
novembro. Entram como oportunidade futura.

**Risco do cronograma:** C1 e C2 são os únicos realmente indivisíveis. Se algo atrasar,
corte C5 e C7 antes de tocar em C0–C4.

---

## 13. Dependências e pré-condições

| Antes de mexer em | É preciso entender/ter |
|---|---|
| Qualquer coisa | Repositório remoto funcionando (C0) — é a rede de segurança de tudo |
| Conteúdo e publicação | Que `content` é **uma linha única** e o PUT substitui o documento inteiro |
| Histórico | Que o limite é 256 kB por documento e o D1 free dá 500 MB por banco |
| Mídia | Que a URL fica embutida no JSON do conteúdo, não há chave estrangeira |
| Autenticação | Que o alongamento é no navegador; mexer nas constantes **invalida todos os acessos** |
| Headers | Que `_headers` e o Worker são camadas distintas e podem se somar (foi o que gerou R-09) |
| Deploy | Que não há staging: todo deploy é produção |

---

## 14. Plano de execução

**Como vamos trabalhar, por mudança:**

1. Mudança pequena e isolada, um assunto por vez.
2. Ambiente e risco declarados antes de qualquer comando.
3. Leitura e inspeção antes de escrita.
4. Backup ou ponto de retorno identificado antes de alterar.
5. Validação local com `pnpm dev:full` e banco local — nunca `--remote` para teste.
6. Testes de regressão do item 18 do seu briefing, conforme aplicável.
7. Commit atômico com justificativa.
8. Deploy só com rollback descrito.

**Rollback disponível hoje:**
- Código: `git revert <commit>` + `pnpm cf:deploy`
- Worker: o dashboard da Cloudflare permite voltar a uma versão anterior pelo Version ID
- Banco: Time Travel do D1, 7 dias no plano gratuito
- Mídia: **não há** — exclusão no R2 é definitiva (reforça R-11)

---

## 15. Linha de base e métricas de sucesso

**Medido em 05/10/2026, produção, desktop:**

| Métrica | Hoje | Meta novembro |
|---|---|---|
| TTFB | 193 ms | manter < 250 ms |
| CLS | 0,0008 | manter < 0,01 |
| Requisições | 9 | manter ≤ 12 |
| Peso total | 434 kB | < 350 kB |
| JS (comprimido) | 110 kB | < 100 kB |
| CSS (comprimido) | 26 kB | manter |
| Maior imagem | 291 kB JPEG | < 120 kB WebP |
| LCP | **não medido** | < 2,5 s, medido com Lighthouse |
| Rotas privadas sem sessão | 100% recusadas | manter |
| Ações auditadas | 0% | 100% das ações administrativas |
| Conteúdo com histórico | não | últimas 20 versões restauráveis |
| Cobertura de testes | 0 | fluxos críticos cobertos |

**Primeira tarefa de medição em C0:** rodar Lighthouse em produção para fechar a lacuna
de LCP. Sem isso não há como provar ganho de performance depois.

---

## 16. Próximo passo seguro recomendado

**Criar o repositório remoto privado e empurrar o código.**

- **Ambiente:** local → GitHub. **Não toca em produção, banco, R2 nem Worker.**
- **Risco:** somente leitura do lado de produção. Risco de perda: zero.
- **Por que primeiro:** é o único item em que o custo de adiar é irreversível. Todo o
  resto do roadmap pressupõe poder reverter uma mudança — e reverter pressupõe ter o
  histórico guardado em outro lugar.
- **Depois dele:** R-02, porque é o único risco que pode destruir o conteúdo de um
  cliente pagante em uso normal.

---

## 17. Fechamento da Fase 0

**Analisado:** repositório integral, Worker em produção, schema, configuração Cloudflare,
página pública, headers, métricas de carregamento, acessibilidade básica e fluxo de dados
ponta a ponta.

**Confirmado:** 26 achados com evidência direta — leitura de código ou medição em
produção. Os pontos fortes do item 7 também são confirmados, não presumidos.

**Alterado:** **nada.** Nenhum arquivo, dado, configuração ou deploy foi tocado.

**Não confirmado:** LCP real, formulário de leads em produção, rate limit de login em
produção, restauração do D1, comportamento em rede lenta e em aparelhos reais.

**Riscos remanescentes enquanto nada for feito:** R-01 (perda total do código) e R-02
(perda do conteúdo do cliente). Ambos silenciosos: não dão sinal antes de acontecer.

**Aguardando sua aprovação** para seguir ao Gate 2 (priorização detalhada) ou autorização
direta do passo do item 16.
