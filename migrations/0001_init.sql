-- Schema inicial do painel administrativo.
-- Aplicar com:  wrangler d1 migrations apply presence-atelier-db

-- ─── Usuário administrador ──────────────────────────────────────────────────
-- Um site = um cliente. A tabela aceita mais de um registro caso você queira
-- um acesso seu além do acesso do cliente.
CREATE TABLE IF NOT EXISTS admin_users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  -- PBKDF2-SHA256, formato "pbkdf2$<iteracoes>$<salt_b64>$<hash_b64>"
  password    TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  last_login  INTEGER
);

-- ─── Sessões ────────────────────────────────────────────────────────────────
-- Guardamos apenas o SHA-256 do token. Se o banco vazar, os cookies em
-- circulação não podem ser reconstruídos a partir dele.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ─── Conteúdo do site ───────────────────────────────────────────────────────
-- Linha única (id = 1) com o JSON editável. O formato é o mesmo de
-- client/src/config/site.config.ts, que serve de padrão e de fallback: se esta
-- tabela estiver vazia ou a API cair, o site renderiza com o config embutido.
CREATE TABLE IF NOT EXISTS content (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  data        TEXT NOT NULL,
  updated_at  INTEGER NOT NULL,
  updated_by  TEXT
);

-- ─── Biblioteca de mídia ────────────────────────────────────────────────────
-- Os bytes ficam no R2; aqui guardamos só os metadados para listar no painel.
CREATE TABLE IF NOT EXISTS media (
  key          TEXT PRIMARY KEY,
  filename     TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  width        INTEGER,
  height       INTEGER,
  alt          TEXT,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_kind ON media(kind);

-- ─── Leads (campo de interesse) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  contact      TEXT NOT NULL,           -- telefone ou e-mail, como a pessoa digitou
  contact_kind TEXT NOT NULL CHECK (contact_kind IN ('phone', 'email')),
  subject      TEXT,                    -- assunto escolhido (evento, campanha...)
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  consent      INTEGER NOT NULL,        -- LGPD: 1 = aceitou o aviso de privacidade
  source_path  TEXT,
  user_agent   TEXT,
  country      TEXT,                    -- de request.cf, sem guardar IP
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- ─── Controle de taxa ───────────────────────────────────────────────────────
-- Janela deslizante por chave ("login:<hash_ip>", "lead:<hash_ip>"). Guardamos
-- o hash do IP, nunca o IP em si.
CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT PRIMARY KEY,
  count       INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_window ON rate_limits(window_start);
