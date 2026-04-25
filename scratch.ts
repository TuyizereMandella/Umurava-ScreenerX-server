import { createClient } from '@supabase/supabase-js';
import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching job...');
  const { data: job } = await supabase.from('jobs').select('id, organization_id').limit(1).single();
  if (!job) return console.log('No job found');

  console.log('Fetching user...');
  const { data: user } = await supabase.from('users').select('id, email, password_hash').eq('organization_id', job.organization_id).limit(1).single();
  
  if (!user) return console.log('No user found');
  
  console.log('Logging in...');
  const res = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'password123' })
  });
  const loginData: any = await res.json();
  const token = loginData.data.token;
  
  console.log('Creating dummy resume...');
  fs.writeFileSync('resume.txt', 'John Doe\njohn@example.com\nSoftware Engineer with 5 years experience in React and Node.js.');
  
  console.log('Uploading...');
  const form = new FormData();
  form.append('jobId', job.id);
  form.append('resume', fs.createReadStream('resume.txt'));
  
  const uploadRes = await fetch('http://localhost:3001/api/v1/applicants/import', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...form.getHeaders()
    },
    body: form
  });
  
  console.log('Status:', uploadRes.status);
  const text = await uploadRes.text();
  console.log('Response:', text);
}

test().catch(console.error);
