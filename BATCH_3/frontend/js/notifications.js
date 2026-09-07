// نظام التنبيهات والإشعارات
class NotificationSystem {
  constructor() {
    this.notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  }

  // إرسال تأكيد الحجز بالبريد الإلكتروني (محاكاة)
  async sendBookingConfirmation(appointment) {
    try {
      // محاكاة إرسال البريد الإلكتروني
      const emailData = {
        to: appointment.email,
        subject: 'تأكيد حجز موعد - مستشفى المستقبل',
        body: this.generateEmailTemplate(appointment)
      };

      // في التطبيق الحقيقي، سيتم إرسال البريد عبر API
      console.log('إرسال بريد إلكتروني:', emailData);
      
      // إضافة إشعار للمستخدم
      this.addNotification({
        type: 'email_sent',
        title: 'تم إرسال تأكيد الحجز',
        message: `تم إرسال تأكيد الحجز إلى ${appointment.email}`,
        appointment_id: appointment.id,
        created_at: new Date().toISOString()
      });

      return { success: true, message: 'تم إرسال تأكيد الحجز بنجاح' };
    } catch (error) {
      console.error('خطأ في إرسال البريد:', error);
      return { success: false, message: 'فشل في إرسال تأكيد الحجز' };
    }
  }

  // إرسال تذكير بالرسائل النصية (محاكاة)
  async sendSMSReminder(appointment) {
    try {
      const smsData = {
        to: appointment.phone,
        message: `تذكير: موعدك مع ${appointment.doctor_name} غداً في ${new Date(appointment.appointment_time).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}. مستشفى المستقبل`
      };

      console.log('إرسال رسالة نصية:', smsData);
      
      this.addNotification({
        type: 'sms_sent',
        title: 'تم إرسال تذكير نصي',
        message: `تم إرسال تذكير إلى ${appointment.phone}`,
        appointment_id: appointment.id,
        created_at: new Date().toISOString()
      });

      return { success: true, message: 'تم إرسال التذكير بنجاح' };
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      return { success: false, message: 'فشل في إرسال التذكير' };
    }
  }

  // إنشاء قالب البريد الإلكتروني
  generateEmailTemplate(appointment) {
    return `
      <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
        <div style="background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">مستشفى المستقبل</h1>
            <p style="color: #6b7280; margin: 5px 0;">تأكيد حجز موعد</p>
          </div>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e40af; margin-top: 0;">مرحباً ${appointment.name}</h2>
            <p>تم تأكيد حجز موعدك بنجاح. إليك تفاصيل الموعد:</p>
          </div>
          
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">الطبيب:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">${appointment.doctor_name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">القسم:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">${appointment.department}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">التاريخ:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">${new Date(appointment.appointment_time).toLocaleDateString('ar-SA')}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold;">الوقت:</td>
                <td style="padding: 10px 0;">${new Date(appointment.appointment_time).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e;"><strong>تذكير مهم:</strong> يرجى الحضور قبل 15 دقيقة من موعدك المحدد.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px;">شكراً لاختيارك مستشفى المستقبل</p>
            <p style="color: #6b7280; font-size: 14px;">للاستفسارات: 920000000</p>
          </div>
        </div>
      </div>
    `;
  }

  // إضافة إشعار جديد
  addNotification(notification) {
    this.notifications.unshift({
      id: Date.now(),
      ...notification,
      read: false
    });
    
    // الاحتفاظ بآخر 50 إشعار فقط
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
    this.updateNotificationBadge();
  }

  // الحصول على الإشعارات
  getNotifications(unreadOnly = false) {
    return unreadOnly ? 
      this.notifications.filter(n => !n.read) : 
      this.notifications;
  }

  // تحديد إشعار كمقروء
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
      this.updateNotificationBadge();
    }
  }

  // تحديد جميع الإشعارات كمقروءة
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
    this.updateNotificationBadge();
  }

  // تحديث شارة الإشعارات
  updateNotificationBadge() {
    const unreadCount = this.getNotifications(true).length;
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
  }

  // جدولة التذكيرات
  scheduleReminders() {
    const appointments = JSON.parse(localStorage.getItem('user_appointments') || '[]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.appointment_time);
      const appointmentDay = new Date(appointmentDate);
      appointmentDay.setHours(0, 0, 0, 0);

      // إرسال تذكير للمواعيد التي في اليوم التالي
      if (appointmentDay.getTime() === tomorrow.getTime() && 
          appointment.status === 'confirmed') {
        this.sendSMSReminder(appointment);
      }
    });
  }
}

// إنشاء مثيل عام لنظام التنبيهات
window.notificationSystem = new NotificationSystem();

// تشغيل جدولة التذكيرات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  window.notificationSystem.scheduleReminders();
  window.notificationSystem.updateNotificationBadge();
});