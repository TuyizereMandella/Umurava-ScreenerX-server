-- Set up Storage for resumes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all resume files
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT 
USING (bucket_id = 'resumes');

-- Allow service role (our backend) to upload resumes.
-- Since we use our own JWT auth (not Supabase Auth), the service role key bypasses RLS entirely.
-- This policy covers the anon/authenticated paths as a safety net.
CREATE POLICY "Allow backend uploads" 
ON storage.objects FOR INSERT 
TO service_role
WITH CHECK (bucket_id = 'resumes');

-- Also allow authenticated to insert for Supabase Auth users
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');
