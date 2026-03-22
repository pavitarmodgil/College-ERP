const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

async function sendOTPEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"College ERP" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your login verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 400px;">
        <h2>Login Verification</h2>
        <p>Your one-time password is:</p>
        <h1 style="letter-spacing: 8px; color: #4F46E5;">${otp}</h1>
        <p>This code expires in <strong>5 minutes</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `,
  })
}

module.exports = { sendOTPEmail }
