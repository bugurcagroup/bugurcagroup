import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const adminEmail = process.env.ADMIN_EMAIL || 'bugurcagroup@gmail.com';
const smtpUser = process.env.SMTP_USER || adminEmail;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const escapeHtml = (value: unknown) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const sendNewOrderMail = onDocumentCreated(
  {
    document: 'orders/{orderId}',
    region: 'europe-west1',
  },
  async event => {
    const data = event.data?.data();
    if (!data || data.orderRole === 'sub') return;

    const orderId = escapeHtml(event.params.orderId);
    const total = escapeHtml(data.totalAmount || data.total || data.totalPrice || 0);
    const customer = escapeHtml(data.customerName || data.email || 'Müşteri');

    try {
      await transporter.sendMail({
        from: `"Bugurca Grup" <${smtpUser}>`,
        to: adminEmail,
        subject: `Yeni Sipariş Geldi! #${event.params.orderId}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #2c3e50;">Yeni Sipariş Bildirimi</h2>
            <p><b>Sipariş No:</b> #${orderId}</p>
            <p><b>Müşteri:</b> ${customer}</p>
            <p><b>Tutar:</b> <span style="color: #27ae60; font-weight: bold;">${total} TL</span></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;" />
            <p style="font-size: 12px; color: #7f8c8d;">Bu bildirim otomatik olarak gönderilmiştir.</p>
          </div>
        `,
      });
      console.log(`Mail başarıyla gönderildi: #${event.params.orderId}`);
    } catch (error) {
      console.error('Mail gönderim hatası (akışı bozmaz):', error);
    }
  },
);
