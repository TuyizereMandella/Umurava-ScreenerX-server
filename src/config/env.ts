import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const config = {
  port: process.env.PORT || 3001,
  allowedOrigins: process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORGINS || '*',
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  jwtSecret: process.env.JWT_SECRET || 'super-secret-screenerx-key-change-in-prod',
  jwtExpiresIn: '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
