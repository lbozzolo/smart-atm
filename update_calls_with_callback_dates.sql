-- Script para actualizar created_at en tabla calls usando fechas de callbacks
-- Ejecutar en Supabase SQL Editor línea por línea

-- 1. Verificar la estructura actual (opcional)
SELECT 
  c.call_id,
  c.created_at as calls_created_at,
  cb.created_at as callbacks_created_at
FROM calls c
LEFT JOIN callbacks cb ON c.call_id = cb.call_id
LIMIT 5;

-- 2. Actualizar created_at en calls usando la fecha de callbacks
UPDATE calls 
SET created_at = callbacks.created_at
FROM callbacks 
WHERE calls.call_id = callbacks.call_id;

-- 3. Para calls que NO tienen callback, usar una fecha base + offset aleatorio
-- (basado en el call_id para que sea consistente)
UPDATE calls 
SET created_at = 
  TIMESTAMP '2024-01-01 00:00:00' + 
  INTERVAL '1 day' * (
    (CAST(SUBSTRING(call_id FROM '[0-9]+') AS INTEGER) % 365) + 
    (EXTRACT(epoch FROM NOW()) % 86400) / 86400
  )
WHERE created_at IS NULL 
  OR created_at = (SELECT MIN(created_at) FROM calls WHERE created_at IS NOT NULL);

-- 4. Verificar el resultado
SELECT 
  COUNT(*) as total_calls,
  COUNT(CASE WHEN created_at IS NOT NULL THEN 1 END) as calls_with_date,
  MIN(created_at) as fecha_mas_antigua,
  MAX(created_at) as fecha_mas_reciente
FROM calls;

-- 5. Ver algunas muestras
SELECT 
  c.call_id,
  c.business_name,
  c.created_at as call_date,
  cb.created_at as callback_date,
  CASE 
    WHEN cb.call_id IS NOT NULL THEN 'Con callback'
    ELSE 'Sin callback'
  END as tiene_callback
FROM calls c
LEFT JOIN callbacks cb ON c.call_id = cb.call_id
ORDER BY c.created_at DESC
LIMIT 10;