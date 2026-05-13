-- supabase_migration_video_stats.sql
-- Purpose: Create RPC for atomically updating video interaction stats.

CREATE OR REPLACE FUNCTION public.increment_video_stats(p_video_id UUID, p_field TEXT, p_increment INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_val INTEGER;
BEGIN
  IF p_field = 'view' THEN
    UPDATE public.coach_videos SET view_count = COALESCE(view_count, 0) + p_increment WHERE id = p_video_id RETURNING view_count INTO v_new_val;
  ELSIF p_field = 'share' THEN
    UPDATE public.coach_videos SET share_count = COALESCE(share_count, 0) + p_increment WHERE id = p_video_id RETURNING share_count INTO v_new_val;
  ELSIF p_field = 'like' THEN
    UPDATE public.coach_videos SET like_count = COALESCE(like_count, 0) + p_increment WHERE id = p_video_id RETURNING like_count INTO v_new_val;
  END IF;
  RETURN v_new_val;
END;
$$;

NOTIFY pgrst, 'reload schema';
