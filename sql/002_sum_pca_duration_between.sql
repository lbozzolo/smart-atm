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
  WITH data_in_range AS (
    SELECT
      DATE_TRUNC('month', created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date as month_date,
      duration_ms
    FROM public.pca
    WHERE (p_start_timestamp IS NULL OR created_at >= p_start_timestamp)
      AND (p_end_timestamp IS NULL OR created_at <= p_end_timestamp)
  ),
  monthly_sums AS (
    SELECT
      month_date,
      SUM(duration_ms)::bigint as total_ms
    FROM data_in_range
    GROUP BY month_date
  ),
  range_bounds AS (
     SELECT
        MIN(month_date) as first_month,
        MAX(month_date) as last_month
     FROM monthly_sums
  ),
  all_months AS (
    SELECT generate_series(
       (SELECT first_month FROM range_bounds),
       (SELECT last_month FROM range_bounds),
       '1 month'::interval
    )::date as month_start
  )
  SELECT
    am.month_start,
    COALESCE(ms.total_ms, 0)
  FROM all_months am
  LEFT JOIN monthly_sums ms ON am.month_start = ms.month_date
  ORDER BY am.month_start DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pca_duration_monthly(timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pca_duration_monthly(timestamptz, timestamptz) TO authenticated;
