CREATE OR REPLACE FUNCTION public.get_monthly_billing_stats()
RETURNS TABLE (
  month text,
  total_calls bigint,
  total_cost numeric
) LANGUAGE sql STABLE AS $$
  SELECT
    to_char(created_at, 'YYYY-MM') as month,
    count(*) as total_calls,
    count(*) * 0.21 as total_cost
  FROM calls
  GROUP BY 1
  ORDER BY 1 DESC;
$$;
