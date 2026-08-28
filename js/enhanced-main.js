// Enhanced Security and UX JavaScript
class SecurityManager {
  static hashPassword(password) {
    // Simple client-side hashing (in production, use proper crypto)
    return btoa(password + 'hospital_salt_2024');
  }
  
  static validatePassword(password) {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const score = Object.values(requirements).filter(Boolean).length;
    return { requirements, score, strength: this.getStrength(score) };
  }
  
  static getStrength(score) {
    if (score < 2) return 'weak';
    if (score < 4) return 'medium';
    return 'strong';
  }
  
  static sanitizeInput(input) {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/[<>]/g, '');
  }
}

class UIManager {
  static showLoading(element, text = 'جارٍ التحميل...') {
    if (element.tagName === 'BUTTON') {
      element.disabled = true;
      element.dataset.originalText = element.textContent;
      element.innerHTML = `<span class="loading-spinner"></span> ${text}`;
    } else {
      element.innerHTML = `<div style="text-align: center; padding: 2rem;"><div class="loading-spinner"></div><p style="margin-top: 1rem;">${text}</p></div>`;
    }
  }
  
  static hideLoading(element) {
    if (element.tagName === 'BUTTON') {
      element.disabled = false;
      element.textContent = element.dataset.originalText || 'إرسال';
    }
  }
  
  static showAlert(message, type = 'info', container = null) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.textContent = message;
    
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
    } else {
      document.body.insertBefore(alertDiv, document.body.firstChild);
    }
    
    setTimeout(() => alertDiv.remove(), 5000);
  }
  
  static showConfirmation(message, onConfirm, onCancel = null) {
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    overlay.innerHTML = `
      <div class="confirmation-dialog">
        <h3>تأكيد العملية</h3>
        <p>${message}</p>
        <div class="confirmation-actions">
          <button class="btn primary confirm-yes">تأكيد</button>
          <button class="btn ghost confirm-no">إلغاء</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.querySelector('.confirm-yes').onclick = () => {
      overlay.remove();
      onConfirm();
    };
    
    overlay.querySelector('.confirm-no').onclick = () => {
      overlay.remove();
      if (onCancel) onCancel();
    };
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        if (onCancel) onCancel();
      }
    };
  }
}

class FormValidator {
  static validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const required = field.required;
    const fieldContainer = field.closest('.form-field') || field.parentElement;
    
    // Remove existing error messages
    const existingError = fieldContainer.querySelector('.field-error');
    if (existingError) existingError.remove();
    
    fieldContainer.classList.remove('error', 'success');
    
    if (required && !value) {
      this.showFieldError(fieldContainer, 'هذا الحقل مطلوب');
      return false;
    }
    
    if (value) {
      switch (type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            this.showFieldError(fieldContainer, 'البريد الإلكتروني غير صحيح');
            return false;
          }
          break;
        case 'tel':
          if (!/^05\d{8}$/.test(value)) {
            this.showFieldError(fieldContainer, 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
            return false;
          }
          break;
        case 'password':
          const validation = SecurityManager.validatePassword(value);
          if (validation.score < 3) {
            this.showFieldError(fieldContainer, 'كلمة المرور ضعيفة. يجب أن تحتوي على 8 أحرف على الأقل مع أرقام وأحرف كبيرة وصغيرة');
            return false;
          }
          break;
      }
    }
    
    fieldContainer.classList.add('success');
    return true;
  }
  
  static showFieldError(container, message) {
    container.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
  }
  
  static validateForm(form) {
    const fields = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });
    
    return isValid;
  }
}

// Enhanced API Manager with better error handling
class APIManager {
  static async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const token = localStorage.getItem('patient_token') || localStorage.getItem('admin_token');
    if (token) {
      defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (response.status === 401) {
        localStorage.removeItem('patient_token');
        localStorage.removeItem('admin_token');
        window.location.href = '/login.html';
        throw new Error('انتهت صلاحية الجلسة');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `خطأ في الخادم: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('خطأ في الاتصال بالخادم. تحقق من اتصال الإنترنت');
      }
      throw error;
    }
  }
}

// Enhanced Main Application
document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }
  
  // Form validation for all forms
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => FormValidator.validateField(input));
      input.addEventListener('input', () => {
        if (input.type === 'password') {
          updatePasswordStrength(input);
        }
      });
    });
    
    form.addEventListener('submit', (e) => {
      if (!FormValidator.validateForm(form)) {
        e.preventDefault();
        UIManager.showAlert('يرجى تصحيح الأخطاء في النموذج', 'error');
      }
    });
  });
  
  // Password strength indicator
  function updatePasswordStrength(passwordField) {
    const validation = SecurityManager.validatePassword(passwordField.value);
    let strengthContainer = passwordField.parentElement.querySelector('.password-strength');
    
    if (!strengthContainer) {
      strengthContainer = document.createElement('div');
      strengthContainer.className = 'password-strength';
      passwordField.parentElement.appendChild(strengthContainer);
    }
    
    const strengthText = {
      weak: 'ضعيفة',
      medium: 'متوسطة',
      strong: 'قوية'
    };
    
    strengthContainer.innerHTML = `
      <div class="strength-${validation.strength}">
        قوة كلمة المرور: ${strengthText[validation.strength]}
      </div>
    `;
  }
  
  // Enhanced appointment form
  const appointmentForm = document.getElementById('appointmentForm');
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = appointmentForm.querySelector('button[type="submit"]');
      const formMsg = document.getElementById('formMsg');
      
      if (!FormValidator.validateForm(appointmentForm)) {
        UIManager.showAlert('يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح', 'error');
        return;
      }
      
      UIManager.showLoading(submitBtn, 'جارٍ إرسال الطلب...');
      
      try {
        const formData = new FormData(appointmentForm);
        const data = Object.fromEntries(formData);
        
        // Sanitize inputs
        Object.keys(data).forEach(key => {
          data[key] = SecurityManager.sanitizeInput(data[key]);
        });
        
        const response = await APIManager.request('/api/appointments', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          UIManager.showAlert('تم إرسال طلب الحجز بنجاح!', 'success');
          appointmentForm.reset();
          
          // Redirect to payment if appointment ID is provided
          if (response.id) {
            setTimeout(() => {
              window.location.href = `/payment.html?appointmentId=${response.id}`;
            }, 2000);
          }
        }
      } catch (error) {
        UIManager.showAlert(error.message, 'error');
      } finally {
        UIManager.hideLoading(submitBtn);
      }
    });
  }
  
  // Enhanced booking confirmation
  const bookingForms = document.querySelectorAll('#bookingForm, #regForm, #loginForm');
  bookingForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formType = form.id;
      let confirmMessage = '';
      
      switch (formType) {
        case 'bookingForm':
          confirmMessage = 'هل تريد تأكيد حجز هذا الموعد؟';
          break;
        case 'regForm':
          confirmMessage = 'هل تريد إنشاء حساب جديد بهذه البيانات؟';
          break;
        case 'loginForm':
          // No confirmation needed for login
          handleFormSubmission(form);
          return;
      }
      
      UIManager.showConfirmation(confirmMessage, () => {
        handleFormSubmission(form);
      });
    });
  });
  
  async function handleFormSubmission(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const formId = form.id;
    
    UIManager.showLoading(submitBtn);
    
    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      // Sanitize and hash password if present
      Object.keys(data).forEach(key => {
        data[key] = SecurityManager.sanitizeInput(data[key]);
        if (key === 'password') {
          data[key] = SecurityManager.hashPassword(data[key]);
        }
      });
      
      let endpoint = '';
      switch (formId) {
        case 'bookingForm':
          endpoint = '/api/appointments';
          break;
        case 'regForm':
          endpoint = '/api/users/register';
          break;
        case 'loginForm':
          endpoint = '/api/users/login';
          break;
      }
      
      const response = await APIManager.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        if (response.token) {
          localStorage.setItem('patient_token', response.token);
        }
        
        UIManager.showAlert('تمت العملية بنجاح!', 'success');
        
        // Redirect based on form type
        setTimeout(() => {
          switch (formId) {
            case 'regForm':
            case 'loginForm':
              window.location.href = '/patient.html';
              break;
            case 'bookingForm':
              if (response.id) {
                window.location.href = `/payment.html?appointmentId=${response.id}`;
              }
              break;
          }
        }, 1500);
      }
    } catch (error) {
      UIManager.showAlert(error.message, 'error');
    } finally {
      UIManager.hideLoading(submitBtn);
    }
  }
  
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
      
      // Close mobile menu if open
      if (nav && nav.classList.contains('open')) {
        nav.classList.remove('open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
  
  // Auto-hide alerts after 5 seconds
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('alert')) {
      e.target.style.opacity = '0';
      setTimeout(() => e.target.remove(), 300);
    }
  });
  
  // Enhanced error handling for images
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', function() {
      this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPtmE2Kcg2KrZiNis2K8g2LXZiNix2KU8L3RleHQ+PC9zdmc+';
      this.alt = 'لا توجد صورة';
    });
  });
  
  // Session timeout warning
  let sessionTimeout;
  function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
      UIManager.showAlert('ستنتهي جلستك خلال دقيقتين. يرجى حفظ عملك.', 'warning');
      setTimeout(() => {
        localStorage.clear();
        window.location.href = '/login.html';
      }, 120000); // 2 minutes
    }, 1800000); // 30 minutes
  }
  
  // Reset timeout on user activity
  ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
    document.addEventListener(event, resetSessionTimeout);
  });
  
  // Initialize session timeout if user is logged in
  if (localStorage.getItem('patient_token') || localStorage.getItem('admin_token')) {
    resetSessionTimeout();
  }
});

// Global error handler
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  // Remove the automatic error alert
  // UIManager.showAlert('حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة.', 'error');
});

// Service Worker registration for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => console.log('SW registered'))
      .catch(error => console.log('SW registration failed'));
  });
}