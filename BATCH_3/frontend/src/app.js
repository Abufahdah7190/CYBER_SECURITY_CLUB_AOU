'use strict';

const path = require('path');
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

const FRONTEND_ROOT = path.join(__dirname, '..', '..'); // project root: index.html, css/, js/, locales/

const app = express();

// Render/Railway/most PaaS sit behind a reverse proxy — needed for
// req.ip and secure cookies to work correctly.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
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

// Serve the existing static frontend completely untouched — same files,
// same paths (index.html, css/style.css, js/*, locales/*).
app.use(express.static(FRONTEND_ROOT, { index: 'index.html' }));

app.use('/api', notFoundHandler);

// Frontend catch-all: browser navigation such as /learn/... must receive an
// HTML shell instead of Express returning Cannot GET. API routes are already
// handled above and are therefore not swallowed by this fallback.
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_ROOT, 'index.html'));
});

app.use(errorHandler);

module.exports = app;
