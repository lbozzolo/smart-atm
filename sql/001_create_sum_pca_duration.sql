-- Migration: create RPC to sum duration_ms from pca
CREATE OR REPLACE FUNCTION public.sum_pca_duration_ms()
RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(duration_ms), 0)::bigint FROM pca;
$$;
