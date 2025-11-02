export const MIGRATION_0002 = `
CREATE TABLE IF NOT EXISTS provider_models (
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  label TEXT,
  enabled INTEGER DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, model_id)
);
`;

