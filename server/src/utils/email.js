async function sendPasswordResetEmail(toEmail, resetLink) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [toEmail],
      subject: 'إعادة تعيين كلمة المرور - نادي الأمن السيبراني',
      html: `<p>لقد طلبت إعادة تعيين كلمة المرور. اضغط على الرابط التالي لتغييرها:</p><a href="${resetLink}">${resetLink}</a>`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Resend API Error:', errorData);
    throw new Error(`Resend API failed with status ${response.status}`);
  }

  const data = await response.json();
  console.log('Reset email sent via Resend HTTP API successfully:', data);
  return data;
}

module.exports = { sendPasswordResetEmail };