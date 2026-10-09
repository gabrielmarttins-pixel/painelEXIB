CREATE TABLE IF NOT EXISTS relatorios_exibicao (
  id TEXT PRIMARY KEY,
  dados TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_relatorios_atualizado_em
  ON relatorios_exibicao (atualizado_em);
