-- optimize_callbacks_query.sql

-- 1. Create indexes to speed up queries
-- Callbacks table indexes
CREATE INDEX IF NOT EXISTS idx_callbacks_created_at ON callbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_callbacks_disposition ON callbacks(disposition);
CREATE INDEX IF NOT EXISTS idx_callbacks_status ON callbacks(status);
CREATE INDEX IF NOT EXISTS idx_callbacks_call_id ON callbacks(call_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_to_number ON callbacks(to_number);

-- PCA table indexes
CREATE INDEX IF NOT EXISTS idx_pca_disposition ON pca(disposition);
CREATE INDEX IF NOT EXISTS idx_pca_call_id ON pca(call_id);

-- Calls table indexes
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_to_number ON calls(to_number);

-- 2. Create RPC function for efficient filtering of "Possibly Interested" calls
-- This replaces the inefficient client-side filtering
CREATE OR REPLACE FUNCTION get_possibly_interested_calls_without_callbacks(
  p_limit INTEGER,
  p_offset INTEGER,
  p_search TEXT DEFAULT NULL,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  call_id TEXT,
  to_number TEXT,
  agent_name TEXT,
  business_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  disposition TEXT,
  full_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_calls AS (
    SELECT 
      c.call_id,
      c.to_number,
      c.agent_name,
      c.business_name,
      c.created_at,
      p.disposition
    FROM calls c
    JOIN pca p ON c.call_id = p.call_id
    WHERE p.disposition = 'possibly_interested'
    AND NOT EXISTS (
      SELECT 1 FROM callbacks cb WHERE cb.call_id = c.call_id
    )
    AND (p_search IS NULL OR 
         c.to_number ILIKE '%' || p_search || '%' OR 
         c.agent_name ILIKE '%' || p_search || '%' OR 
         c.business_name ILIKE '%' || p_search || '%')
    AND (p_date_from IS NULL OR c.created_at >= p_date_from)
    AND (p_date_to IS NULL OR c.created_at <= p_date_to)
  ),
  total AS (
    SELECT COUNT(*) AS cnt FROM filtered_calls
  )
  SELECT 
    fc.call_id,
    fc.to_number,
    fc.agent_name,
    fc.business_name,
    fc.created_at,
    fc.disposition,
    t.cnt
  FROM filtered_calls fc
  CROSS JOIN total t
  ORDER BY fc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
