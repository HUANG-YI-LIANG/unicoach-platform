-- 建立學員匯款截圖 Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment_receipts',
  'payment_receipts',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read payment receipts'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public read payment receipts"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'payment_receipts')
    $policy$;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
