-- Script SQL para agregar columna created_at a la tabla calls
-- Ejecutar en Supabase SQL Editor

-- Agregar columna created_at si no existe
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Actualizar registros existentes sin fecha con una fecha por defecto
UPDATE calls 
SET created_at = NOW() - INTERVAL '1 day' * RANDOM() * 30
WHERE created_at IS NULL;

-- Crear índice para mejorar performance en ordenamiento por fecha
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);

-- Verificar que la columna fue agregada correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'calls' AND column_name = 'created_at';