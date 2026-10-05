# Backup e recuperação

Procedimento de cópia e restauração do Presence Atelier em produção.
Última revisão: 05/10/2026.

> **Onde guardar:** `C:\Users\Abimael\actor-presence-prototype-source\backups\`
> — **fora do repositório git**, de propósito.
>
> O dump do D1 contém **hashes de senha administrativa e dados pessoais de
> contatos** (nome, telefone, e-mail, mensagem). Esses arquivos não podem ir
> para o GitHub, nem para pasta sincronizada com nuvem pública. Trate-os como
> você trataria um backup de banco de clientes — porque é isso que são.

---

## 1. O que precisa de backup

| Recurso | Conteúdo | Perda significa | Coberto por |
|---|---|---|---|
| **D1** `presence-atelier-db` | Conteúdo do site, contatos, acessos, metadados de mídia | Site volta ao conteúdo de fábrica; contatos perdidos | `d1 export` + Time Travel (7 dias) |
| **R2** `presence-atelier-media` | Fotos e vídeos enviados pelo painel | Imagens quebradas no site, sem recuperação | **Nada ainda** — ver seção 5 |
| **Código** | Repositório | Recomeçar do zero | GitHub (desde 05/10/2026) |
| **Segredos** | `LEAD_WEBHOOK_URL`, se configurado | Reconfigurar | Não há export; anote onde você guarda senhas |

---

## 2. Backup do D1 — rotina

**Ambiente:** produção · **Risco: somente leitura.** O `export` apenas lê.

```powershell
cd C:\Users\Abimael\actor-presence-prototype-source\actor-presence-prototype

# Nome do arquivo com a data, para não sobrescrever o anterior
$data = Get-Date -Format "yyyy-MM-dd_HHmm"
npx wrangler d1 export presence-atelier-db --remote --output="..\backups\d1_$data.sql"
```

**Confira que o arquivo não saiu vazio:**

```powershell
Get-Item "..\backups\d1_$data.sql" | Select-Object Name, Length, LastWriteTime
Select-String -Path "..\backups\d1_$data.sql" -Pattern "CREATE TABLE" | Measure-Object | Select-Object Count
```

Esperado: **6 tabelas** (`admin_users`, `sessions`, `content`, `media`, `leads`,
`rate_limits`) e tamanho acima de alguns kilobytes. Um arquivo de 0 bytes ou sem
`CREATE TABLE` é backup falso — refaça antes de confiar nele.

### Variações úteis

```powershell
# Só o esquema, sem dados — para comparar estrutura entre ambientes
npx wrangler d1 export presence-atelier-db --remote --no-data --output="..\backups\schema.sql"

# Só o conteúdo do site, sem contatos — seguro para compartilhar
npx wrangler d1 export presence-atelier-db --remote --table=content --output="..\backups\conteudo.sql"
```

### Com que frequência

| Situação | Quando fazer |
|---|---|
| **Antes de qualquer migration** | Obrigatório, sem exceção |
| **Antes de um deploy que mexe em dados** | Obrigatório |
| Rotina com cliente ativo | Semanal |
| Depois de o cliente publicar muito conteúdo | Na hora |

---

## 3. Restauração do D1

> ⚠️ **Risco: DESTRUTIVO.** Restaurar sobrescreve o banco de produção.
> Nunca execute sem: (a) backup do estado atual, (b) certeza de qual arquivo
> está restaurando, (c) saber o que será perdido entre o backup e agora.

**Sempre faça um backup do estado atual antes de restaurar** — mesmo que o estado
atual esteja ruim. Se a restauração piorar as coisas, é o único caminho de volta.

```powershell
# 1. Backup do estado atual, SEMPRE
$agora = Get-Date -Format "yyyy-MM-dd_HHmm"
npx wrangler d1 export presence-atelier-db --remote --output="..\backups\antes-de-restaurar_$agora.sql"

# 2. Conferir o que você vai restaurar
Select-String -Path "..\backups\d1_ESCOLHIDO.sql" -Pattern "CREATE TABLE"

# 3. Restaurar  ← DESTRUTIVO
npx wrangler d1 execute presence-atelier-db --remote --file="..\backups\d1_ESCOLHIDO.sql"
```

**Depois de restaurar, verifique antes de considerar resolvido:**

```powershell
curl https://presence-atelier.abima9054.workers.dev/api/content
```

O conteúdo esperado precisa estar lá. Depois entre em `/admin` — se as sessões
foram restauradas de um estado antigo, pode ser necessário entrar de novo.

---

## 4. Time Travel — a rede de 7 dias

O D1 guarda o histórico dos últimos **7 dias** no plano gratuito. É mais rápido
que restaurar um dump e não exige arquivo nenhum.

```powershell
# Qual era o estado em determinado momento (somente leitura)
npx wrangler d1 time-travel info presence-atelier-db --timestamp="2026-10-05T12:00:00Z"

# Voltar para aquele momento  ← DESTRUTIVO
npx wrangler d1 time-travel restore presence-atelier-db --timestamp="2026-10-05T12:00:00Z"
```

**Quando usar cada um:**

- **Time Travel** — erro recente, dentro de 7 dias, e você quer o banco inteiro
  num ponto anterior. Mais rápido.
- **Dump** — erro com mais de 7 dias, ou você quer restaurar só uma tabela, ou
  precisa levar os dados para outro banco.

**Limitação:** o Time Travel não ajuda se você só descobrir o problema no oitavo
dia. É exatamente por isso que o dump semanal existe.

---

## 5. R2 — a lacuna conhecida

**Não há backup da mídia hoje, e o wrangler não tem comando de export em massa
para R2.** Só `r2 object get`, um arquivo por vez.

**Consequência:** apagar uma imagem no painel é **definitivo**. Não há desfazer,
não há Time Travel para R2.

Com um arquivo só no bucket, o risco é baixo. Quando o cliente tiver uma
biblioteca de verdade, isso vira problema sério — e é parte do que a Mudança 9
(exclusão de mídia com verificação de uso) precisa resolver.

**Enquanto não houver rotina automática:** guarde os originais das fotos antes de
enviá-las pelo painel. O painel comprime na subida; o arquivo no R2 nunca é o
original.

---

## 6. Teste de restauração

Backup que nunca foi restaurado é hipótese, não backup.

**Recomendação:** uma vez, contra o **banco local**, nunca contra produção:

```powershell
# Aplica o dump de producao no banco LOCAL de desenvolvimento
npx wrangler d1 execute presence-atelier-db --local --file="..\backups\d1_ESCOLHIDO.sql"
pnpm dev:full
```

Abra `localhost:8787`, confira que o conteúdo apareceu e que o login funciona.
Isso prova que o dump reconstrói o sistema — sem tocar em produção.

> ⚠️ Esse teste copia **dados reais de contatos** para a sua máquina. Apague o
> banco local (`.wrangler\state`) depois, se tiver clientes de verdade na base.

---

## 7. Pendências

| Item | Estado |
|---|---|
| Backup automático agendado | Não existe. Hoje é manual |
| Backup do R2 | Não existe. Sem comando nativo |
| Teste de restauração executado | **Nunca feito** — ver seção 6 |
| Backup fora da máquina | Os dumps ficam só no seu disco, como o código ficava antes |

O último item merece atenção: um backup que mora no mesmo disco do original não
protege contra a falha mais provável, que é perder o disco. Quando houver cliente
pagante, os dumps precisam sair da máquina — e, por conterem dados pessoais,
para um destino privado e criptografado.
