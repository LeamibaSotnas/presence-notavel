# Gate 2 — Priorização e roadmap

**Data:** 05/10/2026 · **Base:** `AUDITORIA-FASE-0.md`
**Natureza desta fase:** priorização e plano. **Nenhum código, dado ou configuração alterado.**

---

## 1. Correções à Fase 0

Duas conclusões mudaram depois de medições adicionais. Registro as duas porque auditoria
que não se corrige não serve para decidir.

### R-09 — passou de "provável" a **confirmado**, com causa precisa

Na Fase 0 eu disse que o `Cache-Control` conflitante *provavelmente* impedia o cache.
Agora está medido, e a evidência é melhor do que eu esperava.

**Segunda visita à origem, mesma aba:**

| Arquivo | `transferSize` | Veredito |
|---|---|---|
| `index-BY0df9U-.css` | 300 B | revalidou (304) |
| `index-EcQ-VSPe.js` | 300 B | revalidou (304) |
| `hero.jpg` | 300 B | revalidou (304) |
| `b9da088f…` (mídia do R2) | **0 B** | **servido do cache do navegador** |

O único arquivo que o navegador reaproveitou sem ida à rede é justamente o que **não passa
pelo `_headers`** — a mídia do R2, cujo `Cache-Control` o Worker define sozinho. Os três que
passam pelo `_headers` recebem `max-age=0, must-revalidate` **e** `max-age=31536000,
immutable` na mesma resposta, e o navegador obedece ao primeiro.

**Correção importante:** o cache do **edge** está funcionando — `cf-cache-status: HIT` nos
três. O prejuízo é só no cache do **navegador**: três idas à rede por visita repetida.
Menos grave do que escrevi na Fase 0, e mais fácil de corrigir.

### TTFB — melhor que o medido antes

51 ms numa requisição com edge quente, contra os 193 ms da primeira medição. O número bom
é o de agora; o anterior incluía o custo de aquecer o cache.

---

## 2. Problemas confirmados — consolidado

26 achados da Fase 0 seguem válidos. Nenhum foi descartado. Resumo por prioridade:

**P0 (3)** — R-01 repositório sem remoto · R-02 publicação pode apagar conteúdo real ·
R-03 sem histórico nem rollback

**P1 (10)** — R-04 sem auditoria · R-05 concorrência silenciosa · R-06 `example.com` ·
R-07 metadados estáticos · R-08 `isDemo` · R-09 cache do navegador · R-10 LCP depende do JS ·
R-11 mídia órfã · R-12 SVG · R-13 sem recuperação de senha

**P2 (9)** — R-14 RBAC · R-15 CSP/HSTS · R-16 tipo de upload · R-17 truncamento ·
R-18 soft 404 · R-19 sem staging · R-20 sem testes · R-21 imagens · R-22 observabilidade

**P3 (4)** — R-23 nosniff na API · R-24 lock do git · R-25 retenção LGPD · R-26 skip link

---

## 3. Hipóteses pendentes

| # | Pendência | Nível | Como fechar | Quando |
|---|---|---|---|---|
| H-01 | **LCP real** | NÃO VERIFICADO | Lighthouse no Chrome com a aba em primeiro plano. Três tentativas falharam: meu ambiente não alcança `workers.dev`, a aba controlada fica em segundo plano, e a API do PageSpeed devolveu 429 | C0 — **você executa** |
| H-02 | Formulário de leads em produção | NÃO VERIFICADO | É escrita. Você envia uma mensagem de teste e confere em `/admin/contatos` | C0 — **você executa** |
| H-03 | Rate limit de login em produção | PROVÁVEL (confirmado em código e em teste local) | Exercitar bloquearia seu acesso por 15 min. Fica para quando houver um segundo acesso administrativo | C4 |
| H-04 | Time Travel do D1 restaura de fato | PROVÁVEL (documentado pela Cloudflare) | Testar sobre um banco de ensaio, nunca produção | C1 |
| H-05 | Comportamento em rede lenta e 4G real | NÃO VERIFICADO | Throttling no DevTools + um aparelho real | C6 |

**H-01 e H-02 bloqueiam a linha de base.** Sem eles não há como provar ganho depois, e o
item 14 do seu briefing exige linha de base antes de otimizar.

---

## 4. Análise de decisão — P0 e P1

Formato conforme o item 12 do briefing. Resumido onde a decisão é óbvia.

---

### Mudança 1 — Repositório remoto privado  · **P0** · R-01

- **Problema:** `git remote -v` vazio. Código e histórico num disco só.
- **Evidência:** CONFIRMADO — comando executado no repositório.
- **Causa:** o repositório nasceu de um export da Manus; o `git init` foi local e o push nunca aconteceu.
- **Impacto:** técnico — perda total do fonte. Comercial — impossível manter ou vender um produto sem código. Operacional — nenhum enquanto nada der errado, catastrófico quando der.
- **Alternativas:** (a) backup manual em nuvem — não versiona, não resolve; (b) segundo disco — não protege contra apagar a pasta; (c) **repositório privado no GitHub** — versiona, protege e já é seu fluxo.
- **Proporcionalidade:** você já usa GitHub privado. Zero tecnologia nova.
- **Risco:** nenhum para produção. Não toca Worker, D1 nem R2.
- **Validação:** `git log` no remoto bate com o local; clonar em outra pasta e rodar `pnpm check`.
- **Reversão:** apagar o repositório remoto.

---

### Mudança 2 — Impedir que uma falha de carga apague o conteúdo · **P0** · R-02

- **Problema:** se `/api/content` falhar, o painel inicializa o rascunho com o conteúdo de fábrica, sem avisar. Publicar sobrescreve o conteúdo real.
- **Evidência:** CONFIRMADO — três trechos encaixados: `SiteContext.load()` engole o erro; `useContentDraft` inicializa a partir da configuração efetiva; `save()` envia o documento inteiro.
- **Causa:** o fallback silencioso é correto para o **visitante** e foi herdado pelo **painel**, onde é perigoso. Erro meu de projeto: um comportamento, dois contextos com necessidades opostas.
- **Impacto:** perda do conteúdo de um cliente pagante, em uso normal, sem sinal prévio. Com R-03 em aberto, sem desfazer.
- **Alternativas:** (a) remover o fallback — quebraria o site do visitante quando a API oscilar; (b) salvar diff em vez de documento inteiro — resolve, mas é mudança grande e muda o contrato da API; (c) **distinguir "não há conteúdo" de "não consegui carregar", e bloquear a publicação no segundo caso** — corrige a causa com o mínimo de superfície.
- **Proporcionalidade:** (c) mexe em dois arquivos do cliente, nenhum no Worker, e não altera o contrato da API.
- **Risco:** baixo. Nenhuma alteração de schema nem de produção além do deploy.
- **Validação:** simular falha da API no DevTools, abrir o painel, confirmar que o botão Publicar fica desabilitado com mensagem clara; e que, com a API normal, tudo segue igual.
- **Reversão:** `git revert` + deploy.

---

### Mudança 3 — Histórico de conteúdo com restauração · **P0** · R-03

- **Problema:** publicar sobrescreve a linha `id=1`. Não há versão anterior.
- **Evidência:** CONFIRMADO — `INSERT … ON CONFLICT(id) DO UPDATE SET data = excluded.data`.
- **Impacto:** qualquer erro de edição é definitivo. É também a rede de segurança que torna a Mudança 2 tolerável a falhas residuais.
- **Alternativas:** (a) confiar no Time Travel do D1 — 7 dias, exige linha de comando, inacessível ao cliente; (b) versionar no R2 — mistura responsabilidades; (c) **tabela `content_versions` com as últimas 20 versões e restauração pelo painel** — simples, dentro do limite de 500 MB do D1 com folga (7 kB por versão).
- **Proporcionalidade:** uma tabela, um índice, duas rotas. Nada de novo na stack.
- **Risco:** migration em produção. Mitigável: `CREATE TABLE IF NOT EXISTS`, aditiva, sem tocar em tabela existente.
- **Validação:** publicar três vezes, conferir três versões, restaurar a primeira, conferir no site.
- **Reversão:** a tabela é aditiva; basta parar de escrever nela. `DROP TABLE` só se você quiser.

---

### Mudança 4 — Registro de ações administrativas · **P1** · R-04

- **Problema:** nenhuma tabela registra o que foi feito. `content.updated_by` guarda só o último autor.
- **Evidência:** CONFIRMADO — schema completo inspecionado.
- **Impacto:** governança. Você pediu "quem fez o quê, quando, onde e qual foi o resultado" — hoje não há resposta. Para vender a terceiros, é requisito.
- **Alternativas:** (a) só logs do Cloudflare — voláteis, não consultáveis pelo painel, sem contexto de negócio; (b) **tabela `audit_log`** gravada no mesmo ponto das ações; (c) serviço externo — dependência nova sem necessidade.
- **Proporcionalidade:** uma tabela, uma função, uma chamada por rota de escrita.
- **Risco:** baixo. Aditivo. Cuidado único: **não registrar dado pessoal nem segredo** — só identificadores e tipo de ação.
- **Validação:** executar cada ação administrativa e conferir a linha correspondente.
- **Reversão:** aditiva.

---

### Mudança 5 — Concorrência na publicação · **P1** · R-05

- **Problema:** duas abas publicando: a última vence, em silêncio.
- **Evidência:** CONFIRMADO — o `PUT` não compara versão.
- **Alternativas:** (a) bloqueio pessimista — complexidade desproporcional para 1 usuário; (b) **`If-Match` com o `updated_at` que o painel carregou; conflito devolve 409 e o painel oferece recarregar** — padrão HTTP, sem estado novo.
- **Proporcionalidade:** uma coluna já existe (`updated_at`). Só passa a ser conferida.
- **Risco:** baixo. Depende da Mudança 3 estar pronta, para que o conflito tenha para onde voltar.
- **Validação:** duas abas, publicar em ambas, confirmar o 409 e a mensagem.

---

### Mudança 6 — Fechar a apresentação comercial · **P1** · R-06, R-07, R-08

Três defeitos com a mesma causa: **o `<head>` é estático e não conhece o conteúdo do banco.**

- **Evidência:** CONFIRMADO — banco diz `identity.name = "LUCAS"`; `<title>` e OG dizem "Mateo Valença"; canonical e `og:image` apontam para `example.com`; `isDemo: true`.
- **Impacto:** é o que mais faz o produto parecer inacabado. Link compartilhado sai sem imagem e com o nome errado. Buscadores recebem canonical de outro domínio.
- **Alternativas:** (a) deixar estático e documentar que o integrador edita o HTML — transfere trabalho manual para cada venda; (b) atualizar o `<head>` no cliente após carregar — resolve para humanos, **não para a maioria dos crawlers**; (c) **o Worker injetar as meta tags no HTML antes de servir** — resolve para ambos, custa uma transformação de resposta.
- **Proporcionalidade:** (c) é a única que funciona de verdade para compartilhamento e SEO, e cabe em uma função no Worker usando `HTMLRewriter`, que é nativo da plataforma.
- **Risco:** médio — toca o caminho de todo visitante. Mitigação: se a leitura do conteúdo falhar, servir o HTML intacto.
- **Validação:** `curl` do HTML conferindo as tags; validador de card do WhatsApp e do LinkedIn.
- **Reversão:** `git revert` + deploy.

---

### Mudança 7 — Cache do navegador · **P1** · R-09

- **Problema:** `Cache-Control` duplicado; assets com hash revalidam a cada visita.
- **Evidência:** CONFIRMADO — tabela do item 1.
- **Causa:** as regras `/*` e `/assets/*` do `_headers` **se somam** em vez de a mais específica sobrepor.
- **Solução:** retirar `Cache-Control` da regra `/*` e declará-lo explicitamente por grupo.
- **Risco:** baixo, mas **a validação precisa ser feita com cuidado**: um `immutable` errado em `index.html` prenderia o site numa versão antiga nos navegadores. Por isso o HTML continua com revalidação explícita.
- **Validação:** duas visitas, conferir `transferSize: 0` nos assets e `304` no HTML.

---

### Mudança 8 — LCP do topo · **P1** · R-10

- **Problema:** o fundo do topo é `background-image` de um `div` que só existe depois do React montar. Sem `preload`.
- **Evidência:** CONFIRMADO por código e DOM. **O ganho em milissegundos é HIPÓTESE até H-01 fechar.**
- **Alternativas:** (a) SSR — mudança de arquitetura, descartada; (b) `<img>` com `fetchpriority="high"` no HTML — exige saber a URL no servidor, o que a Mudança 6 passa a permitir; (c) **`<link rel="preload" as="image">` injetado pelo Worker junto das meta tags**.
- **Decisão:** fazer junto da Mudança 6, que já abre o HTML. Uma passagem, dois ganhos.
- **Pré-condição:** H-01 medido antes, senão não há como provar o ganho.

---

### Mudança 9 — Exclusão de mídia e SVG · **P1** · R-11, R-12

- **R-11:** `deleteMedia` apaga do R2 e do D1 sem checar se a URL está no conteúdo. **Exclusão no R2 é definitiva — não há reversão.** Solução: contar referências antes e exigir confirmação explícita quando houver.
- **R-12:** SVG é aceito e servido na mesma origem do painel. Um SVG com script executaria no contexto da sessão administrativa. Hoje só o próprio admin sobe arquivos, o que mantém a probabilidade baixa — mas com RBAC (R-14) o risco sobe. Solução: remover SVG dos tipos aceitos, ou servir mídia com `Content-Disposition: attachment` e CSP restritiva.
- **Risco:** baixo. Nenhuma mídia existente é afetada.

---

### Mudança 10 — Recuperação de senha · **P1** · R-13

- **Problema:** redefinir senha exige seu terminal.
- **Impacto:** cada cliente que esquecer a senha vira chamado de suporte para você. Com vários clientes, não escala.
- **Alternativas:** (a) link por e-mail — exige provedor de envio, dependência nova; (b) **segunda credencial de recuperação entregue na implantação**; (c) **você redefine pelo painel**, já que haverá RBAC.
- **Decisão:** adiar para C4 e decidir junto do RBAC. Enquanto houver um cliente só, (c) basta.

---

## 5. Roadmap priorizado

| Ciclo | Período | Mudanças | Encerra |
|---|---|---|---|
| **C0** | 06–07/10 | Repositório remoto · backup do D1 documentado · lock do git · **H-01 e H-02 (você)** | R-01, R-24; linha de base fechada |
| **C1** | 08–14/10 | M2 · M3 · M9 | R-02, R-03, R-11, R-12 |
| **C2** | 15–21/10 | M4 · M5 | R-04, R-05 |
| **C3** | 22–28/10 | Estados rascunho/publicado · paginação · validação servidor | R-17 |
| **C4** | 29/10–04/11 | CSP · HSTS · assinatura de arquivo · RBAC mínimo · M10 | R-13, R-14, R-15, R-16, R-23; fecha H-03 |
| **C5** | 05–11/11 | Dashboard · indicadores · feedback de ações | Experiência administrativa |
| **C6** | 12–18/11 | M6 · M7 · M8 · WebP · soft 404 · acessibilidade | R-06, R-07, R-08, R-09, R-10, R-18, R-21, R-26; fecha H-05 |
| **C7** | 19–25/11 | Provisionamento · testes de regressão · documentação | R-19, R-20 |
| **C8** | 26–30/11 | Validação final contra a linha de base · folga | — |

**Por que a apresentação comercial (C6) vem depois da governança (C1–C4):** a ordem é a sua,
e está certa. R-06/R-07/R-08 são visíveis e constrangedores, mas reversíveis em minutos.
R-02 e R-03 destroem dados de forma irreversível. Corrigir a vitrine antes do alicerce
aumentaria o tempo de exposição ao único risco que não dá para desfazer.

**Se o prazo apertar:** corte C5 e C7, nessa ordem. Nunca C0–C2.

**Fora de escopo por decisão:** staging dedicado, CI/CD, multi-tenant, transcodificação de
vídeo, internacionalização, notificação de lead por e-mail. Nenhum é necessário para vender
em novembro.

---

## 6. Dependências entre mudanças

```
M1 (remoto) ──── pré-requisito de todas as demais
                  │
M3 (histórico) ───┼──▶ M5 (concorrência)   ← o conflito precisa de versão para onde voltar
                  │
M2 (sobrescrita) ─┘    independente, mas M3 é a rede caso algo escape

M6 (meta no Worker) ──▶ M8 (preload do topo)   ← a mesma passagem no HTML
H-01 (LCP medido) ────▶ M8                     ← sem linha de base não há prova de ganho
R-14 (RBAC) ──────────▶ M10 (recuperação)      ← quem pode redefinir a senha de quem
```

---

## 7. Fechamento do Gate 2

**Analisado:** medições adicionais de cache, TTFB e tentativa de Lighthouse.

**Confirmado:** R-09 subiu de provável a confirmado, com causa isolada — e com severidade
**menor** do que eu havia escrito: o cache do edge funciona, o do navegador não.

**Alterado:** **nada.**

**Não confirmado:** H-01 (LCP) e H-02 (leads em produção) dependem de você. H-03 a H-05
estão agendados.

**Riscos remanescentes:** R-01 e R-02 seguem ativos e silenciosos. Cada dia sem o
repositório remoto é um dia de exposição a perda irreversível.

**Próximo passo — Gate 3 da Mudança 1:**

- **Ambiente:** local → GitHub. Produção intocada.
- **Risco:** somente leitura do lado de produção.
- **Pré-condição:** resolver o `.git/index.lock` pendente (arquivo vazio, resíduo de um
  processo interrompido).
- **Backup:** o próprio push é o backup.
- **Reversão:** apagar o repositório remoto.

Aprovando, eu apresento o plano detalhado da Mudança 1 no formato do item 17 e executo.
Em paralelo, peço que você rode H-01 e H-02 — são os dois itens da linha de base que só
podem ser feitos por você.
