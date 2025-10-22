-- Script para investigar la confusión de disposition
-- Ejecutar en Supabase SQL Editor

-- 1. Ver structure de ambas tablas
SELECT 'calls' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calls' AND column_name = 'disposition'
UNION ALL
SELECT 'callbacks' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'callbacks' AND column_name = 'disposition';

-- 2. Comparar valores de disposition en ambas tablas
SELECT 
  c.call_id,
  c.disposition as calls_disposition,
  cb.disposition as callbacks_disposition,
  CASE 
    WHEN c.disposition IS NOT NULL AND cb.disposition IS NOT NULL THEN 'Ambos tienen'
    WHEN c.disposition IS NOT NULL THEN 'Solo calls'
    WHEN cb.disposition IS NOT NULL THEN 'Solo callbacks'
    ELSE 'Ninguno'
  END as quien_tiene_disposition
FROM calls c
LEFT JOIN callbacks cb ON c.call_id = cb.call_id
LIMIT 10;

-- 3. Contar dónde está el disposition más frecuentemente
SELECT 
  COUNT(c.call_id) as total_calls,
  COUNT(c.disposition) as calls_con_disposition,
  COUNT(cb.disposition) as callbacks_con_disposition,
  COUNT(CASE WHEN c.disposition IS NOT NULL AND cb.disposition IS NOT NULL THEN 1 END) as ambos_con_disposition
FROM calls c
LEFT JOIN callbacks cb ON c.call_id = cb.call_id;

-- 4. Ver valores únicos en cada tabla
SELECT 'calls' as origen, disposition, COUNT(*) as count
FROM calls 
WHERE disposition IS NOT NULL
GROUP BY disposition
UNION ALL
SELECT 'callbacks' as origen, disposition, COUNT(*) as count
FROM callbacks 
WHERE disposition IS NOT NULL
GROUP BY disposition
ORDER BY origen, count DESC;