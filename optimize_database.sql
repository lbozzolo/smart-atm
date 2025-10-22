-- Índices de optimización para Smart ATM
-- Ejecutar en Supabase SQL Editor

-- Habilitar extensión para búsquedas de texto (DEBE SER PRIMERO)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices para tabla calls
CREATE INDEX IF NOT EXISTS idx_calls_to_number ON calls(to_number);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_business_name ON calls(business_name);
CREATE INDEX IF NOT EXISTS idx_calls_owner_name ON calls(owner_name);
CREATE INDEX IF NOT EXISTS idx_calls_disposition ON calls(disposition);

-- Índices para tabla pca
CREATE INDEX IF NOT EXISTS idx_pca_call_id ON pca(call_id);
CREATE INDEX IF NOT EXISTS idx_pca_disposition ON pca(disposition);

-- Índices para tabla callbacks
CREATE INDEX IF NOT EXISTS idx_callbacks_to_number ON callbacks(to_number);
CREATE INDEX IF NOT EXISTS idx_callbacks_created_at ON callbacks(created_at);
CREATE INDEX IF NOT EXISTS idx_callbacks_disposition ON callbacks(disposition);

-- Índices compuestos para consultas comunes
CREATE INDEX IF NOT EXISTS idx_calls_to_number_call_id ON calls(to_number, call_id DESC);
CREATE INDEX IF NOT EXISTS idx_callbacks_to_number_created_at ON callbacks(to_number, created_at DESC);

-- Índice para búsquedas de texto (búsqueda global)
CREATE INDEX IF NOT EXISTS idx_calls_search ON calls 
USING gin((
  coalesce(business_name, '') || ' ' ||
  coalesce(owner_name, '') || ' ' ||
  coalesce(owner_email, '') || ' ' ||
  coalesce(address_street, '') || ' ' ||
  coalesce(call_id, '')
) gin_trgm_ops);

-- Análisis de estadísticas para el optimizador
ANALYZE calls;
ANALYZE pca;
ANALYZE callbacks;