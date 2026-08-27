'use strict';

require('dotenv').config();

/**
 * Centralized, validated environment configuration.
 *
 * Fails fast at startup (instead of surfacing confusing errors later, or
 * silently running with an insecure default secret) if a required
 * production secret is missing.
 */
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
if (isProd) {
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

module.exports = {
  NODE_ENV,
  isProd,
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL,

  // Never ship with these fallback secrets in production — env.js throws
  // above if they're missing while NODE_ENV=production.
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-only-insecure-access-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-only-insecure-refresh-secret',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || '15m',
  JWT_REFRESH_TTL_DAYS: parseInt(process.env.JWT_REFRESH_TTL_DAYS || '30', 10),

  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Email (Resend) — optional in dev; auth flows degrade gracefully
  // (log to console) when not configured, per Phase 4 scope.
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'AOU Cyber Security Club <onboarding@resend.dev>',

  // Registration is restricted to university student email addresses.
  // Configurable (not hardcoded) so the club can change/add domains later
  // without a code change. Format confirmed by the club: student ID + "ksa"
  // @aou.edu.sa, e.g. 01345678ksa@aou.edu.sa
  ALLOWED_EMAIL_DOMAIN: (process.env.ALLOWED_EMAIL_DOMAIN || 'aou.edu.sa').toLowerCase(),
  // Loose sanity check on the local part (before the @). Kept permissive
  // (digit count is flexible) so it doesn't wrongly reject real student
  // IDs of varying length. Set to 'false' to disable this extra check
  // and only enforce the domain.
  REQUIRE_STUDENT_ID_LOCAL_PART: process.env.REQUIRE_STUDENT_ID_LOCAL_PART !== 'false',
};
