const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const xss = require('xss');
const jwt = require('jsonwebtoken');

// حماية من Brute Force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات كحد أقصى
  message: { error: 'تم تجاوز عدد محاولات تسجيل الدخول المسموح. حاول مرة أخرى بعد 15 دقيقة.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// حماية عامة من الطلبات المتكررة
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب كحد أقصى
  message: { error: 'تم تجاوز عدد الطلبات المسموح. حاول مرة أخرى لاحقاً.' }
});

// تنظيف وتحقق من المدخلات
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return xss(input.trim());
}

function validateInput(req, res, next) {
  // تنظيف جميع المدخلات
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }
  
  if (req.query) {
    for (let key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    }
  }
  
  next();
}

// التحقق من صحة البريد الإلكتروني
function validateEmail(email) {
  return validator.isEmail(email);
}

// التحقق من صحة رقم الهاتف
function validatePhone(phone) {
  return validator.isMobilePhone(phone, 'any');
}

// التحقق من قوة كلمة المرور
function validatePassword(password) {
  return validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  });
}

// middleware للتحقق من انتهاء الجلسة
function checkSessionTimeout(req, res, next) {
  const token = req.headers.authorization?.slice(7);
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const now = Date.now();
      const tokenAge = now - (decoded.iat * 1000);
      const timeout = parseInt(process.env.SESSION_TIMEOUT) || 3600000; // ساعة واحدة افتراضياً
      
      if (tokenAge > timeout) {
        return res.status(401).json({ error: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.' });
      }
    } catch (error) {
      return res.status(401).json({ error: 'رمز غير صالح' });
    }
  }
  next();
}

// حماية صفحة الإدارة
function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح لك بالوصول' });
  }
  
  const token = auth.slice(7);
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    if (!data.user) {
      return res.status(403).json({ error: 'صلاحيات إدارية مطلوبة' });
    }
    req.admin = data.user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'رمز غير صالح' });
  }
}

module.exports = {
  loginLimiter,
  generalLimiter,
  validateInput,
  validateEmail,
  validatePhone,
  validatePassword,
  sanitizeInput,
  checkSessionTimeout,
  adminAuth
};