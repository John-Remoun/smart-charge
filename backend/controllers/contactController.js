const ContactMessage = require('../models/ContactMessage');
const nodemailer = require('nodemailer');

exports.submitContact = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 120);
    const email = String(req.body.email || '').trim().slice(0, 200);
    const message = String(req.body.message || '').trim();
    if (message.length < 3) return res.status(400).json({ message: 'Message is too short' });
    if (message.length > 5000) return res.status(400).json({ message: 'Message is too long' });

    await ContactMessage.create({ name, email, message });

    if (process.env.SMTP_HOST && process.env.ADMIN_EMAIL) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth:
            process.env.SMTP_USER && process.env.SMTP_PASS
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
              : undefined
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@smartcharge.local',
          to: process.env.ADMIN_EMAIL,
          subject: '[Smart Charge] Contact form',
          text: `From: ${name || '—'}\nEmail: ${email || '—'}\n\n${message}`
        });
      } catch (mailErr) {
        console.error('Contact email failed:', mailErr.message);
      }
    }

    res.status(201).json({ success: true, message: 'Message received' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
