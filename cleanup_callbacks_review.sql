-- Script para eliminar la tabla callbacks_review y su trigger
-- Ejecutar en Supabase SQL Editor

-- ====================================
-- PASO 1: Eliminar el trigger (si existe)
-- ====================================

-- Buscar triggers relacionados con callbacks_review
-- Nota: Ajusta el nombre del trigger según corresponda
-- Los triggers comunes suelen tener nombres como:
-- - on_callbacks_insert_trigger
-- - callbacks_to_review_trigger  
-- - auto_create_callback_review

-- Eliminar trigger (ajusta el nombre según tu caso)
DROP TRIGGER IF EXISTS on_callbacks_insert_trigger ON callbacks;
DROP TRIGGER IF EXISTS callbacks_to_review_trigger ON callbacks;
DROP TRIGGER IF EXISTS auto_create_callback_review ON callbacks;

-- Si no sabes el nombre exacto, usa esta consulta para encontrarlo:
/*
SELECT 
    trigger_name, 
    event_object_table, 
    trigger_schema,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'callbacks' 
   OR trigger_name ILIKE '%callback%review%'
   OR action_statement ILIKE '%callbacks_review%';
*/

-- ====================================
-- PASO 2: Eliminar la función del trigger (si existe)
-- ====================================

-- Las funciones del trigger suelen tener nombres como:
-- - create_callback_review()
-- - insert_callback_review()
-- - copy_to_callbacks_review()

DROP FUNCTION IF EXISTS create_callback_review();
DROP FUNCTION IF EXISTS insert_callback_review();
DROP FUNCTION IF EXISTS copy_to_callbacks_review();

-- Si no sabes el nombre exacto, usa esta consulta para encontrarlo:
/*
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
  AND (routine_name ILIKE '%callback%review%' 
       OR routine_definition ILIKE '%callbacks_review%');
*/

-- ====================================
-- PASO 3: Ver definición de la VIEW (OPCIONAL)
-- ====================================

-- Si quieres ver cómo está definida la vista antes de eliminarla:
/*
SELECT definition 
FROM pg_views 
WHERE viewname = 'callbacks_review' 
  AND schemaname = 'public';
*/

-- Si quieres hacer backup de los datos de la vista, descomenta:
/*
CREATE TABLE callbacks_review_backup AS 
SELECT * FROM callbacks_review;

-- Verificar que el backup se creó correctamente
SELECT COUNT(*) as total_records FROM callbacks_review_backup;
*/

-- ====================================
-- PASO 4: Eliminar la VIEW callbacks_review
-- ====================================

-- callbacks_review es una VIEW, no una tabla
-- Las vistas no tienen índices ni políticas RLS propias

-- Eliminar la vista
DROP VIEW IF EXISTS callbacks_review CASCADE;

-- ====================================
-- PASO 5: Verificación
-- ====================================

-- Verificar que la vista fue eliminada
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname = 'callbacks_review';

-- Verificar que no hay triggers restantes relacionados con callbacks
SELECT 
    trigger_name, 
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'callbacks'
  AND action_statement ILIKE '%callbacks_review%';

-- Verificar que no hay funciones restantes relacionadas
SELECT routine_name
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
  AND routine_definition ILIKE '%callbacks_review%';

-- ====================================
-- RESULTADO ESPERADO
-- ====================================

-- Todas las consultas de verificación deberían devolver 0 filas
-- Esto confirma que:
-- ✅ La vista callbacks_review fue eliminada
-- ✅ Los triggers relacionados fueron eliminados  
-- ✅ Las funciones relacionadas fueron eliminadas

SELECT 'Limpieza completada exitosamente!' as status;