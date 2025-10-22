-- Índices para optimizar búsquedas en la tabla calls
-- Usar estos comandos en tu base de datos Supabase

-- Índices B-tree estándar para búsquedas (funcionan sin extensiones)
CREATE INDEX IF NOT EXISTS idx_calls_business_name ON calls (business_name);
CREATE INDEX IF NOT EXISTS idx_calls_owner_name ON calls (owner_name);
CREATE INDEX IF NOT EXISTS idx_calls_owner_email ON calls (owner_email);
CREATE INDEX IF NOT EXISTS idx_calls_address_street ON calls (address_street);
CREATE INDEX IF NOT EXISTS idx_calls_owner_phone ON calls (owner_phone);

-- Índices adicionales útiles para ordenamiento y filtros
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls (created_at);
CREATE INDEX IF NOT EXISTS idx_calls_disposition ON calls (disposition);

-- Si quieres índices más avanzados para búsquedas de texto (opcional)
-- Primero habilita la extensión pg_trgm:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Luego puedes crear índices GIN para búsquedas de texto más eficientes:
-- CREATE INDEX IF NOT EXISTS idx_calls_business_name_gin ON calls USING gin(business_name gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_calls_owner_name_gin ON calls USING gin(owner_name gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_calls_owner_email_gin ON calls USING gin(owner_email gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_calls_address_street_gin ON calls USING gin(address_street gin_trgm_ops);

-- Verificar índices creados:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'calls';