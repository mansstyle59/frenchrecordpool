
-- Trigger to increment tracks.downloads on each new download record
CREATE OR REPLACE FUNCTION public.increment_track_downloads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tracks
  SET downloads = COALESCE(downloads, 0) + 1
  WHERE id = NEW.track_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_download_increment
AFTER INSERT ON public.downloads
FOR EACH ROW
EXECUTE FUNCTION public.increment_track_downloads();
