'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const learningRoutes = require('./routes/learning.routes');
const userRoutes = require('./routes/user.routes');
const { generalLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errors');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SERVER_ROOT = path.join(__dirname, '..');
// Support both Render layouts: repository root or Root Directory=server.
const FRONTEND_ROOT = fs.existsSync(path.join(SERVER_ROOT, 'public', 'index.html'))
  ? path.join(SERVER_ROOT, 'public')
  : PROJECT_ROOT;

const app = express();

// Render/Railway/most PaaS sit behind a reverse proxy — needed for
// req.ip and secure cookies to work correctly.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https://*.supabase.co', 'https://*.supabase.in'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  })
);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const maintenancePage = path.join(FRONTEND_ROOT, 'maintenance.html');
app.locals.maintenancePage = maintenancePage;
const pageAcceptsHtml = (req) => req.method === 'GET' && !req.path.startsWith('/api') && (req.headers.accept || '').includes('text/html');
app.use((req, res, next) => {
  if (env.MAINTENANCE_MODE && pageAcceptsHtml(req) && req.path !== '/maintenance.html') {
    return res.sendFile(maintenancePage);
  }
  return next();
});

if (!env.isProd) {
  app.use(morgan('dev'));
}

app.use('/api', generalLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/user', userRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, env: env.NODE_ENV }));

// Dedicated LMS classroom route. The client reads :courseId from the path.
const sendLmsPage = (req, res) => res.sendFile(path.join(FRONTEND_ROOT, 'course.html'));
app.get('/learn/:courseId', sendLmsPage);

// Student dashboard route. Keep it separate from the public home page.
const sendStudentProfile = (req, res) => res.sendFile(path.join(FRONTEND_ROOT, 'profile.html'));
app.get('/student/profile', sendStudentProfile);

// Serve static assets before any HTML fallback. A missing CSS/JS file must
// never receive index.html, otherwise the browser reports a MIME error because
// it receives text/html where a stylesheet or script was expected.
app.use(express.static(FRONTEND_ROOT, {
  index: 'index.html',
  fallthrough: true,
  etag: true,
  maxAge: env.isProd ? '1h' : 0,
}));

// Never rewrite asset-like URLs to the SPA shell. Return a real 404 so a
// deployment error is visible immediately instead of being cached as HTML.
app.use((req, res, next) => {
  const looksLikeAsset = /\.[a-z0-9]{1,12}$/i.test(req.path);
  if (req.method === 'GET' && looksLikeAsset && !req.path.startsWith('/api/')) {
    return res.status(404).type('text/plain').send('Static asset not found');
  }
  return next();
});

app.use('/api', notFoundHandler);

// Frontend catch-all is reserved for browser document navigations only.
app.get('*', (req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  const acceptsHtml = (req.headers.accept || '').includes('text/html');
  if (!acceptsHtml) return res.status(404).type('text/plain').send('Not found');
  return res.sendFile(path.join(FRONTEND_ROOT, 'index.html'));
});

app.use(errorHandler);

module.exports = app;
