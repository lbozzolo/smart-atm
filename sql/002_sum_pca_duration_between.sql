-- RPC helpers for minutes view

DROP FUNCTION IF EXISTS public.sum_pca_duration_ms_between(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_pca_duration_monthly(timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.sum_pca_duration_ms_between(
  p_start_timestamp timestamptz DEFAULT NULL,
  p_end_timestamp timestamptz DEFAULT NULL
)
RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(duration_ms), 0)::bigint
  FROM public.pca AS p
  WHERE (p_start_timestamp IS NULL OR p.created_at >= p_start_timestamp)
    AND (p_end_timestamp IS NULL OR p.created_at <= p_end_timestamp);
$$;

GRANT EXECUTE ON FUNCTION public.sum_pca_duration_ms_between(timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.sum_pca_duration_ms_between(timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_pca_duration_monthly(
  p_start_timestamp timestamptz DEFAULT NULL,
  p_end_timestamp timestamptz DEFAULT NULL
)
RETURNS TABLE (
  month_start date,
  total_ms bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    DATE_TRUNC('month', p.created_at)::date AS month_start,
    COALESCE(SUM(p.duration_ms), 0)::bigint AS total_ms
  FROM public.pca AS p
  WHERE (p_start_timestamp IS NULL OR p.created_at >= p_start_timestamp)
    AND (p_end_timestamp IS NULL OR p.created_at <= p_end_timestamp)
  GROUP BY 1
  ORDER BY month_start DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pca_duration_monthly(timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pca_duration_monthly(timestamptz, timestamptz) TO authenticated;
