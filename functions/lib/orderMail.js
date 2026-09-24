"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewOrderMail = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
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
const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
exports.sendNewOrderMail = (0, firestore_1.onDocumentCreated)({
    document: 'orders/{orderId}',
    region: 'europe-west1',
}, async (event) => {
    const data = event.data?.data();
    if (!data || data.orderRole === 'sub')
        return;
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
    }
    catch (error) {
        console.error('Mail gönderim hatası (akışı bozmaz):', error);
    }
});
