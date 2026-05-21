const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendOTPEmail(toEmail, message) {
  const isOTP = /^\d{6}$/.test(message)

  await resend.emails.send({
    from: 'College ERP <onboarding@resend.dev>',
    to: toEmail,
    subject: isOTP ? 'Your login verification code' : 'Password Reset — College ERP',
    html: isOTP
      ? `<div style="font-family:sans-serif;max-width:400px">
           <h2>Login Verification</h2>
           <p>Your one-time password is:</p>
           <h1 style="letter-spacing:8px;color:#4F46E5">${message}</h1>
           <p>Expires in <strong>5 minutes</strong>.</p>
         </div>`
      : `<div style="font-family:sans-serif;max-width:400px">
           <h2>Password Reset</h2>
           <p>${message.replace(/\n/g, '<br>')}</p>
         </div>`,
  })
}

module.exports = { sendOTPEmail }
