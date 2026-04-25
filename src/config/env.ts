import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in production');
}

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
  resendApiKey: process.env.RESEND_API_KEY || '',
};
