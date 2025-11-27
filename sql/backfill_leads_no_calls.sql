-- Backfill created_at para leads sin llamadas
-- Regla: si el phone_number del lead NO aparece en calls.to_number,
--        fijar created_at a 2025-11-26 00:00:00+00 y updated_at a NOW().

BEGIN;

-- (Opcional) Índices recomendados para acelerar el NOT EXISTS
-- CREATE INDEX IF NOT EXISTS idx_leads_phone_number ON leads(phone_number);
-- CREATE INDEX IF NOT EXISTS idx_calls_to_number ON calls(to_number);

UPDATE leads AS l
SET created_at = TIMESTAMPTZ '2025-11-26 00:00:00+00',
    updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM calls AS c
  WHERE c.to_number = l.phone_number
);

-- Alternativa si hay diferencias de formato en los teléfonos (sólo dígitos):
-- UPDATE leads AS l
-- SET created_at = TIMESTAMPTZ '2025-11-26 00:00:00+00',
--     updated_at = NOW()
-- WHERE NOT EXISTS (
--   SELECT 1
--   FROM calls AS c
--   WHERE regexp_replace(c.to_number, '\\D', '', 'g') = regexp_replace(l.phone_number, '\\D', '', 'g')
-- );

COMMIT;
