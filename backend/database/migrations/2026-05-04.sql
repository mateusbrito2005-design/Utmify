-- 2026-05-04: Adicionar business_id à tabela facebook_accounts
-- Permite salvar o BM ID vinculado a cada conta para sincronização automática

ALTER TABLE facebook_accounts
ADD COLUMN IF NOT EXISTS business_id VARCHAR(100) DEFAULT NULL;

-- 2026-05-04: Adicionar token_valid à tabela facebook_accounts
-- Permite suprimir chamadas à Meta API quando o token está inválido (evita pico de CPU)

ALTER TABLE facebook_accounts
ADD COLUMN IF NOT EXISTS token_valid BOOLEAN NOT NULL DEFAULT TRUE;

