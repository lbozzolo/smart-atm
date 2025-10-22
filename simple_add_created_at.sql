-- Script simple para agregar created_at a la tabla calls
-- Copiar y pegar línea por línea en el SQL Editor de Supabase

-- 1. Agregar la columna
ALTER TABLE calls ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Actualizar registros existentes con fechas recientes aleatorias
UPDATE calls SET created_at = NOW() - INTERVAL '1 day' * (RANDOM() * 30) WHERE created_at IS NULL;

-- 3. Verificar que funciona
SELECT call_id, created_at FROM calls LIMIT 5;