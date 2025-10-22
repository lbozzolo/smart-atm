-- Test para verificar si la columna disposition se puede ordenar
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que la columna disposition existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calls' AND column_name = 'disposition';

-- 2. Ver valores únicos de disposition
SELECT disposition, COUNT(*) as count
FROM calls 
GROUP BY disposition
ORDER BY count DESC;

-- 3. Test de ordenamiento manual
SELECT call_id, business_name, disposition
FROM calls 
ORDER BY disposition DESC 
LIMIT 10;