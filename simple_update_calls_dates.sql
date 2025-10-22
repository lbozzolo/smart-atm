-- Script SIMPLE para actualizar created_at en calls con fechas de callbacks
-- Ejecutar paso a paso en Supabase SQL Editor

-- PASO 1: Ver cuántos records se van a actualizar
SELECT 
  COUNT(c.call_id) as calls_con_callbacks,
  COUNT(DISTINCT c.call_id) as calls_unicos
FROM calls c
INNER JOIN callbacks cb ON c.call_id = cb.call_id;

-- PASO 2: Actualizar calls que tienen callbacks (usa la fecha del callback)
UPDATE calls 
SET created_at = (
  SELECT cb.created_at 
  FROM callbacks cb 
  WHERE cb.call_id = calls.call_id 
  LIMIT 1
)
WHERE call_id IN (
  SELECT DISTINCT call_id FROM callbacks
);

-- PASO 3: Para calls SIN callbacks, asignar fechas distribuidas en el último mes
UPDATE calls 
SET created_at = NOW() - INTERVAL '1 day' * (RANDOM() * 30)
WHERE created_at IS NULL 
   OR call_id NOT IN (SELECT DISTINCT call_id FROM callbacks);

-- PASO 4: Verificar resultado
SELECT 
  COUNT(*) as total_calls,
  MIN(created_at) as fecha_mas_antigua,
  MAX(created_at) as fecha_mas_reciente,
  COUNT(CASE WHEN call_id IN (SELECT call_id FROM callbacks) THEN 1 END) as con_callback_real
FROM calls;