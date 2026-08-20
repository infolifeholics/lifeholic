const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
  console.log('Using SMTP Settings:');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);
  console.log('From:', process.env.SMTP_FROM);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: 'support@thelifeholics.com',
      subject: 'SMTP Test Mail',
      html: '<h3>SMTP test is successful!</h3><p>If you see this, notifications will work.</p>',
    });
    console.log('Email sent successfully!', info.messageId);
  } catch (error) {
    console.error('SMTP test failed:', error);
  }
}

testSMTP();
