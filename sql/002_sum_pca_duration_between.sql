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
  WITH filtered AS (
    SELECT *
    FROM public.pca AS p
    WHERE (p_start_timestamp IS NULL OR p.created_at >= p_start_timestamp)
      AND (p_end_timestamp IS NULL OR p.created_at <= p_end_timestamp)
  ),
  meta AS (
    SELECT
      DATE_TRUNC('month', MIN(created_at)) AS min_month,
      DATE_TRUNC('month', MAX(created_at)) AS max_month
    FROM filtered
  ),
  bounds AS (
    SELECT
      CASE
        WHEN (SELECT min_month FROM meta) IS NULL AND p_start_timestamp IS NULL THEN DATE_TRUNC('month', NOW())
        WHEN (SELECT min_month FROM meta) IS NULL THEN DATE_TRUNC('month', p_start_timestamp)
        WHEN p_start_timestamp IS NULL THEN (SELECT min_month FROM meta)
        ELSE GREATEST(DATE_TRUNC('month', p_start_timestamp), (SELECT min_month FROM meta))
      END AS series_start,
      CASE
        WHEN (SELECT max_month FROM meta) IS NULL AND p_end_timestamp IS NULL THEN DATE_TRUNC('month', NOW())
        WHEN (SELECT max_month FROM meta) IS NULL THEN DATE_TRUNC('month', p_end_timestamp)
        WHEN p_end_timestamp IS NULL THEN (SELECT max_month FROM meta)
        ELSE LEAST(DATE_TRUNC('month', p_end_timestamp), (SELECT max_month FROM meta))
      END AS series_end
  ),
  months AS (
    SELECT
      generate_series(
        (SELECT series_start FROM bounds),
        (SELECT series_end FROM bounds),
        '1 month'::interval
      ) AS month_start
  )
  SELECT
    months.month_start::date,
    COALESCE(SUM(filtered.duration_ms), 0)::bigint AS total_ms
  FROM months
  LEFT JOIN filtered
    ON DATE_TRUNC('month', filtered.created_at) = months.month_start
  GROUP BY months.month_start
  ORDER BY months.month_start DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pca_duration_monthly(timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pca_duration_monthly(timestamptz, timestamptz) TO authenticated;
