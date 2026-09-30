# Painel administrativo

Painel em `/admin`, no mesmo domínio do site, com a identidade visual dele.
O cliente entra com e-mail e senha e administra tudo: textos, fotos, vídeos,
tipografia e os contatos que chegam pelo formulário.

**Arquitetura:** Cloudflare Worker (API) + D1 (conteúdo e contatos) + R2 (mídia).
Tudo numa infraestrutura só, tudo dentro do plano gratuito para um site.

---

## 1. Colocar no ar (uma vez por site)

```powershell
# 1. Criar o banco — copie o database_id que aparece no fim
pnpm db:create

# 2. Colar esse id em wrangler.jsonc, no campo "database_id"

# 3. Criar o bucket de mídia
pnpm r2:create

# 4. Criar as tabelas
pnpm db:migrate

# 5. Criar o acesso do cliente (a senha é pedida no terminal, sem ecoar)
pnpm admin:create cliente@dominio.com "Nome do Cliente"

# 6. Publicar
npx wrangler login
pnpm cf:deploy
```

Ajuste também `"SITE_URL"` em `wrangler.jsonc` para o domínio final.

O painel fica em `https://seu-dominio/admin`.

### Trocar a senha depois

`pnpm admin:create` de novo, com o mesmo e-mail. Ele atualiza em vez de duplicar.
Não há "esqueci minha senha" por e-mail — para um painel de um usuário só, um
fluxo de recuperação é mais superfície de ataque do que conveniência. Você
redefine pelo comando.

---

## 2. Rodar localmente

O `pnpm dev` (só Vite) serve o site, mas **não** o Worker — sem API, o site cai
no conteúdo embutido em `site.config.ts` e o painel não faz login. Para mexer no
painel, rode a pilha completa:

```powershell
pnpm db:migrate:local
node scripts/create-admin.mjs voce@local.test "Teste" --local
pnpm dev:full          # http://localhost:8787
```

O banco local fica em `.wrangler/state/` e não se mistura com produção.

---

## 3. O que o cliente pode fazer

| Seção | O que administra |
|---|---|
| **Conteúdo** | Identidade, contatos, topo, sobre, portfólio, agenda, galeria, notas, campo de interesse, rodapé. Listas com adicionar, remover e reordenar. |
| **Fotos e vídeos** | Envio, biblioteca, copiar link, excluir. |
| **Contatos** | Mensagens do formulário, filtro por status, resposta em um clique, exportação CSV. |
| **Tipografia** | Seis combinações de fontes testadas. |

Nada vai ao ar sozinho: as alterações ficam como rascunho até o clique em
**Publicar**. Uma barra avisa quando há mudanças não publicadas, e o navegador
confirma antes de fechar a aba com trabalho pendente.

---

## 4. Fotos e vídeos

**Limites:** 8 MB por imagem, 120 MB por vídeo.

Imagens são otimizadas **no navegador** antes de subir: convertidas para WebP,
com no máximo 2400px no maior lado. Uma foto de celular de ~4 MB chega ao
servidor com cerca de 300 kB. Fazer isso no navegador em vez do Worker evita o
Cloudflare Images (pago) e deixa o upload mais rápido. SVG e GIF passam intactos
— vetor não se redimensiona e GIF perderia a animação.

Vídeo não é transcodificado. Oriente o cliente a subir MP4 em 1080p; o limite de
120 MB dá algo em torno de 2 minutos.

**Capacidade:** o R2 dá 10 GB e saída de dados gratuita. Um site com ~50 fotos
otimizadas e ~10 vídeos ocupa perto de 1,5 GB — cabem cerca de 6 sites de
clientes no plano gratuito.

---

## 5. Contatos e WhatsApp

O visitante preenche o formulário → o contato é salvo → se
`interest.redirectToWhatsApp` estiver ligado e houver número configurado, o
WhatsApp abre com a mensagem pronta.

**Essa ordem é deliberada:** o contato fica registrado no painel mesmo que a
pessoa desista de abrir o WhatsApp. Um botão `wa.me` sozinho perde esses casos.

Não há API da Meta envolvida — é link direto, sem intermediário e sem custo.

### Notificação de contato novo

Opcional. Qualquer endpoint que aceite POST com JSON serve (bot do Telegram,
automação, um Worker seu que dispare e-mail):

```powershell
npx wrangler secret put LEAD_WEBHOOK_URL
```

A chamada roda em `waitUntil`, fora do caminho da resposta: se o webhook falhar
ou demorar, o visitante não percebe e o contato já está salvo.

### Proteções do formulário

- **Honeypot** — campo escondido que só bot preenche. Responde 201 e descarta.
- **Tempo mínimo** — envio em menos de 1,5 s é recusado.
- **Dois limites por IP/hora** — 40 requisições e 8 mensagens gravadas. São
  separados de propósito: quem erra o telefone duas vezes não gasta a cota de
  mensagens, porque só a validação falhou e nada foi salvo.
- **Validação estrita** no servidor, sem confiar no formulário.

### LGPD

A caixa de consentimento é obrigatória e o aceite fica registrado junto do
contato. O texto do aviso é editável no painel. **O IP nunca é armazenado** —
o controle de taxa usa um hash dele. Guardamos o país (vem do Cloudflare), o
user-agent e o que a pessoa digitou. O cliente pode excluir qualquer contato
pelo painel.

---

## 6. Tipografia

Seis presets em `client/src/config/themes.ts`. Cada um traz o par de fontes e os
ajustes de entrelinha, peso, escala e espaçamento que aquele par precisa — o CSS
lê tudo por variáveis (`--font-display`, `--display-scale`...).

Não existe campo de fonte livre de propósito: o par errado desmonta a hierarquia
visual, e o design é justamente o que você está vendendo. Para acrescentar um
preset, adicione a entrada no arquivo; nada mais precisa mudar.

---

## 7. Segurança

- Senha com **PBKDF2-SHA256, 210.000 iterações**, salt derivado do e-mail. O
  alongamento roda **no navegador** (`client/src/lib/password.ts`): o Workers
  recusa PBKDF2 acima de 100.000 iterações, e o plano gratuito dá 10 ms de CPU
  por requisição — 100.000 iterações custam ~114 ms. Fazendo no cliente, o
  fator de trabalho contra vazamento do banco é o mesmo e cabe no gratuito.
  A senha crua nunca chega ao servidor; o que trafega é o valor alongado,
  protegido pelo TLS como a senha estaria.
- No banco fica um **SHA-256 salgado** do valor alongado. Um hash rápido basta
  porque a entrada já tem 256 bits de entropia — não há dicionário a atacar.
- Sessão em **cookie httpOnly, Secure, SameSite=Lax** — nenhum token em
  `localStorage`, onde qualquer script da página poderia lê-lo.
- No banco fica só o **SHA-256 do token**: um vazamento não permite reconstruir
  os cookies em circulação.
- Login com **mensagem idêntica** para e-mail inexistente e senha errada, e
  comparação em tempo constante.
- **8 tentativas de login por IP a cada 15 minutos.**
- Conferência de **Origin** nos métodos que alteram estado, somada ao SameSite.
- **Lista de campos aceitos** na escrita de conteúdo: o painel não injeta
  chaves arbitrárias no banco.
- Sessões vencidas são apagadas por cron diário.

---

## 8. Estrutura

```
worker/
  index.ts     roteamento: /api/*, /media/*, resto vai para os assets
  auth.ts      senha, sessão, cookie, guarda de rota
  content.ts   leitura e escrita do conteúdo
  media.ts     upload, listagem, exclusão e entrega do R2
  leads.ts     captação, listagem, status, CSV
  util.ts      respostas, cripto, rate limit, validação
migrations/
  0001_init.sql
client/src/
  contexts/SiteContext.tsx   carrega da API e mescla sobre o config embutido
  lib/api.ts                 cliente da API
  lib/media-compress.ts      compressão no navegador
  pages/admin/               painel (carregado sob demanda)
```

### Se a API cair

O site continua no ar com o conteúdo de `site.config.ts`. `SiteContext` falha em
silêncio de propósito — o visitante vê a página, não um erro. O painel, esse
sim, mostra o que deu errado.

---

## 9. O que ainda não existe

- **Recuperação de senha por e-mail.** Redefinição é por comando.
- **Múltiplos usuários com permissões.** A tabela aceita mais de um registro,
  mas todos têm o mesmo acesso.
- **Histórico de versões do conteúdo.** Publicar sobrescreve. O D1 tem Time
  Travel de 7 dias no plano gratuito, que serve de rede de segurança.
- **Transcodificação de vídeo.** O arquivo é servido como foi enviado.
- **Pré-visualização ao vivo dentro do painel.** Há o link "Ver o site"; a
  edição direto na página é um passo possível daqui.
