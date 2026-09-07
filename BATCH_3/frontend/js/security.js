// Security Enhancement Module
class HospitalSecurity {
  constructor() {
    this.initCSRFProtection();
    this.initXSSProtection();
    this.initRateLimiting();
    this.initSecureStorage();
  }
  
  // CSRF Protection
  initCSRFProtection() {
    const token = this.generateCSRFToken();
    sessionStorage.setItem('csrf_token', token);
    
    // Add CSRF token to all forms
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('form').forEach(form => {
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrf_token';
        csrfInput.value = token;
        form.appendChild(csrfInput);
      });
    });
  }
  
  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // XSS Protection
  initXSSProtection() {
    // Content Security Policy enforcement
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;";
    document.head.appendChild(meta);
  }
  
  sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }
  
  // Rate Limiting
  initRateLimiting() {
    this.requestCounts = new Map();
    this.rateLimits = {
      login: { max: 5, window: 300000 }, // 5 attempts per 5 minutes
      register: { max: 3, window: 600000 }, // 3 attempts per 10 minutes
      booking: { max: 10, window: 300000 } // 10 bookings per 5 minutes
    };
  }
  
  checkRateLimit(action) {
    const now = Date.now();
    const key = `${action}_${this.getClientId()}`;
    
    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, []);
    }
    
    const requests = this.requestCounts.get(key);
    const limit = this.rateLimits[action];
    
    if (!limit) return true;
    
    // Remove old requests outside the time window
    const validRequests = requests.filter(time => now - time < limit.window);
    
    if (validRequests.length >= limit.max) {
      return false;
    }
    
    validRequests.push(now);
    this.requestCounts.set(key, validRequests);
    return true;
  }
  
  getClientId() {
    let clientId = localStorage.getItem('client_id');
    if (!clientId) {
      clientId = this.generateCSRFToken();
      localStorage.setItem('client_id', clientId);
    }
    return clientId;
  }
  
  // Secure Storage
  initSecureStorage() {
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }
  
  getOrCreateEncryptionKey() {
    let key = sessionStorage.getItem('enc_key');
    if (!key) {
      key = this.generateCSRFToken();
      sessionStorage.setItem('enc_key', key);
    }
    return key;
  }
  
  encryptData(data) {
    try {
      // Simple XOR encryption (in production, use proper crypto)
      const jsonStr = JSON.stringify(data);
      let encrypted = '';
      for (let i = 0; i < jsonStr.length; i++) {
        encrypted += String.fromCharCode(
          jsonStr.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      return btoa(encrypted);
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }
  
  decryptData(encryptedData) {
    try {
      const encrypted = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }
  
  // Secure token storage
  setSecureToken(key, token) {
    const encryptedToken = this.encryptData({ token, timestamp: Date.now() });
    if (encryptedToken) {
      localStorage.setItem(key, encryptedToken);
    }
  }
  
  getSecureToken(key) {
    const encryptedToken = localStorage.getItem(key);
    if (!encryptedToken) return null;
    
    const decrypted = this.decryptData(encryptedToken);
    if (!decrypted) return null;
    
    // Check if token is expired (24 hours)
    if (Date.now() - decrypted.timestamp > 86400000) {
      localStorage.removeItem(key);
      return null;
    }
    
    return decrypted.token;
  }
  
  // Password security
  validatePasswordStrength(password) {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      noCommonPatterns: !this.isCommonPassword(password)
    };
    
    const score = Object.values(requirements).filter(Boolean).length;
    const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong';
    
    return { requirements, score, strength };
  }
  
  isCommonPassword(password) {
    const commonPasswords = [
      '123456', 'password', '123456789', '12345678', '12345',
      '1234567', '1234567890', 'qwerty', 'abc123', 'password123'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }
  
  hashPassword(password, salt = null) {
    if (!salt) {
      salt = this.generateCSRFToken().substring(0, 16);
    }
    
    // Simple hash function (in production, use bcrypt or similar)
    let hash = 0;
    const combined = password + salt;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return {
      hash: Math.abs(hash).toString(16),
      salt: salt
    };
  }
  
  // Input validation and sanitization
  validateInput(input, type) {
    const sanitized = this.sanitizeHTML(input.trim());
    
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized);
      case 'phone':
        return /^05\d{8}$/.test(sanitized);
      case 'name':
        return /^[\u0600-\u06FFa-zA-Z\s]{2,50}$/.test(sanitized);
      case 'id':
        return /^\d+$/.test(sanitized);
      default:
        return sanitized.length > 0 && sanitized.length < 1000;
    }
  }
  
  // Session management
  createSecureSession(userData) {
    const sessionData = {
      user: userData,
      created: Date.now(),
      lastActivity: Date.now(),
      sessionId: this.generateCSRFToken()
    };
    
    this.setSecureToken('user_session', JSON.stringify(sessionData));
    return sessionData.sessionId;
  }
  
  validateSession() {
    const sessionData = this.getSecureToken('user_session');
    if (!sessionData) return false;
    
    try {
      const session = JSON.parse(sessionData);
      const now = Date.now();
      
      // Check if session is expired (30 minutes of inactivity)
      if (now - session.lastActivity > 1800000) {
        this.destroySession();
        return false;
      }
      
      // Update last activity
      session.lastActivity = now;
      this.setSecureToken('user_session', JSON.stringify(session));
      return true;
    } catch (error) {
      this.destroySession();
      return false;
    }
  }
  
  destroySession() {
    localStorage.removeItem('user_session');
    localStorage.removeItem('patient_token');
    localStorage.removeItem('admin_token');
    sessionStorage.clear();
  }
  
  // Audit logging
  logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event,
      details: details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      clientId: this.getClientId()
    };
    
    // Store in local storage for now (in production, send to server)
    const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
    logs.push(logEntry);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem('security_logs', JSON.stringify(logs));
    console.log('Security Event:', logEntry);
  }
  
  // Secure API requests
  async secureRequest(url, options = {}) {
    // Check rate limiting
    const action = this.getActionFromUrl(url);
    if (!this.checkRateLimit(action)) {
      this.logSecurityEvent('rate_limit_exceeded', { url, action });
      throw new Error('تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.');
    }
    
    // Add security headers
    const secureOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': sessionStorage.getItem('csrf_token'),
        ...options.headers
      }
    };
    
    // Add authentication token
    const token = this.getSecureToken('patient_token') || this.getSecureToken('admin_token');
    if (token) {
      secureOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, secureOptions);
      
      if (response.status === 401) {
        this.logSecurityEvent('unauthorized_access', { url });
        this.destroySession();
        window.location.href = '/login.html';
        return null;
      }
      
      if (response.status === 429) {
        this.logSecurityEvent('rate_limited_by_server', { url });
        throw new Error('تم تجاوز الحد المسموح من الطلبات من الخادم.');
      }
      
      if (!response.ok) {
        this.logSecurityEvent('api_error', { url, status: response.status });
        throw new Error(`خطأ في الخادم: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      this.logSecurityEvent('request_failed', { url, error: error.message });
      throw error;
    }
  }
  
  getActionFromUrl(url) {
    if (url.includes('/login')) return 'login';
    if (url.includes('/register')) return 'register';
    if (url.includes('/appointments')) return 'booking';
    return 'general';
  }
}

// Initialize security manager
const security = new HospitalSecurity();

// Override localStorage and sessionStorage to use encryption
const originalSetItem = localStorage.setItem;
const originalGetItem = localStorage.getItem;

localStorage.setItem = function(key, value) {
  if (key.includes('token') || key.includes('session')) {
    security.setSecureToken(key, value);
  } else {
    originalSetItem.call(this, key, value);
  }
};

localStorage.getItem = function(key) {
  if (key.includes('token') || key.includes('session')) {
    return security.getSecureToken(key);
  } else {
    return originalGetItem.call(this, key);
  }
};

// Global security event handlers
document.addEventListener('DOMContentLoaded', () => {
  // Prevent right-click context menu on sensitive elements
  document.querySelectorAll('input[type="password"], .secure-content').forEach(element => {
    element.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  
  // Detect and prevent basic XSS attempts
  document.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      const value = e.target.value;
      if (/<script|javascript:|on\w+=/i.test(value)) {
        security.logSecurityEvent('xss_attempt', { 
          field: e.target.name || e.target.id,
          value: value.substring(0, 100)
        });
        e.target.value = security.sanitizeHTML(value);
        alert('تم اكتشاف محتوى غير آمن وتم إزالته.');
      }
    }
  });
  
  // Monitor for suspicious activity
  let rapidClicks = 0;
  document.addEventListener('click', () => {
    rapidClicks++;
    setTimeout(() => rapidClicks--, 1000);
    
    if (rapidClicks > 20) {
      security.logSecurityEvent('suspicious_activity', { 
        type: 'rapid_clicking',
        count: rapidClicks
      });
    }
  });
  
  // Validate session on page load
  if (!security.validateSession() && 
      (localStorage.getItem('patient_token') || localStorage.getItem('admin_token'))) {
    security.destroySession();
    if (window.location.pathname !== '/login.html' && 
        window.location.pathname !== '/register.html' &&
        window.location.pathname !== '/index.html') {
      window.location.href = '/login.html';
    }
  }
});

// Export security manager for use in other scripts
window.HospitalSecurity = security;