/**
 * MuziMind Email Service
 *
 * Uses Nodemailer + Gmail SMTP (free, no external service required).
 *
 * Setup in .env:
 *   EMAIL_USER=youraddress@gmail.com
 *   EMAIL_PASS=xxxx xxxx xxxx xxxx   ← Gmail "App Password"
 *
 * To create a Gmail App Password:
 *   1. Go to myaccount.google.com → Security → 2-Step Verification
 *   2. Scroll to "App passwords" and generate one for "Mail / Other"
 *   3. Paste the 16-char password (spaces optional) into EMAIL_PASS
 */

import nodemailer from 'nodemailer';
import crypto from 'crypto';

// ─── Transporter ────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS on port 587
  family: 4,     // force IPv4 — Railway blocks IPv6 SMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Token helpers ──────────────────────────────────────────────────────────

/** Six-digit numeric code for email verification */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** 64-char hex token for password resets */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** SHA-256 hash — stored in DB so raw token never touches the database */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Shared email styles ────────────────────────────────────────────────────

const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const emailWrapper = (body: string) => `
<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MuziMind</title>
</head>
<body style="margin:0;padding:0;background:#0a0818;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Top accent bar -->
  <div style="background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa);height:4px;"></div>

  <!-- Outer padding -->
  <div style="padding:40px 20px 60px;background:#0a0818;">

    <!-- Card -->
    <div style="max-width:500px;margin:0 auto;background:#12103a;border:1px solid #6366f1;border-radius:20px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.7);">

      <!-- Card header -->
      <div style="padding:32px 36px 0;text-align:center;">
        <div style="display:inline-block;background:#1e1a4a;border:1px solid #8b5cf6;border-radius:12px;padding:10px 18px;margin-bottom:24px;">
          <span style="font-size:16px;margin-right:6px;">♪</span>
          <span style="font-size:15px;font-weight:700;color:#c4b5fd;letter-spacing:0.5px;">MuziMind</span>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:0 36px 36px;">
        ${body}
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid rgba(99,102,241,0.25);padding:20px 36px;text-align:center;">
        <p style="margin:0;color:#a78bfa;font-size:11px;letter-spacing:0.3px;">
          © 2025 MuziMind · Твоята музикална вселена<br/>
          <span style="color:#a78bfa;">Ако не си поискал това, просто игнорирай имейла.</span>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
`;

// ─── Verification email ──────────────────────────────────────────────────────

export async function sendVerificationEmail(
  toEmail: string,
  username: string,
  code: string
): Promise<void> {
  const verifyUrl = `${BASE_URL}/verify-email?code=${code}&email=${encodeURIComponent(toEmail)}`;

  const html = emailWrapper(`
    <h1 style="margin:0 0 10px;color:#ffffff;font-size:22px;font-weight:600;text-align:center;">
      Потвърди имейл адреса си
    </h1>
    <p style="margin:0 0 28px;color:#c4b5fd;font-size:14px;line-height:1.7;text-align:center;">
      Здравей, <strong style="color:#ffffff;">${username}</strong>! Въведи кода по-долу,
      за да активираш акаунта си.
    </p>

    <!-- Code block — clickable, opens verify page with code pre-filled -->
    <a href="${verifyUrl}"
       style="display:block;text-decoration:none;background:#1e1a4a;border:2px solid #8b5cf6;border-radius:14px;padding:28px 20px 20px;text-align:center;margin-bottom:14px;">
      <div style="font-size:52px;font-weight:800;letter-spacing:18px;color:#ffffff;font-family:'Courier New',Courier,monospace;line-height:1;padding-left:18px;">
        ${code}
      </div>
      <div style="margin-top:14px;display:inline-block;background:#2d1f6e;border:1px solid #8b5cf6;border-radius:20px;padding:5px 14px;">
        <span style="font-size:11px;color:#c4b5fd;letter-spacing:0.8px;text-transform:uppercase;font-weight:600;">Натисни за автоматично попълване</span>
      </div>
    </a>

    <p style="margin:0 0 28px;color:#c4b5fd;font-size:12px;text-align:center;">
      или го въведи ръчно в приложението · важи <strong style="color:#ffffff;">24 часа</strong>
    </p>

    <!-- Security notice -->
    <div style="background:#1e1a4a;border:1px solid #6366f1;border-radius:10px;padding:14px 18px;">
      <p style="margin:0;color:#c4b5fd;font-size:12px;line-height:1.65;">
        🔒&nbsp; Ако не си създавал акаунт в MuziMind, можеш спокойно да игнорираш този имейл.
        Кодът изтича автоматично.
      </p>
    </div>
  `);

  await transporter.sendMail({
    from: `"MuziMind" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${code} е твоят код за верификация — MuziMind`,
    html,
  });
}

// ─── Password reset email ────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  toEmail: string,
  username: string,
  token: string
): Promise<void> {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

  const html = emailWrapper(`
    <h1 style="margin:0 0 10px;color:#ffffff;font-size:22px;font-weight:600;text-align:center;">
      Нулиране на паролата
    </h1>
    <p style="margin:0 0 28px;color:#c4b5fd;font-size:14px;line-height:1.7;text-align:center;">
      Здравей, <strong style="color:#ffffff;">${username}</strong>! Получихме заявка
      за нулиране на паролата за твоя акаунт.
    </p>

    <!-- CTA Button -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 24px rgba(99,102,241,0.5);">
        Нулирай паролата
      </a>
    </div>

    <!-- Fallback URL -->
    <div style="background:#1e1a4a;border:1px solid #6366f1;border-radius:10px;padding:14px 18px;margin-bottom:14px;">
      <p style="margin:0 0 6px;color:#c4b5fd;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600;">
        Или копирай линка
      </p>
      <p style="margin:0;color:#a78bfa;font-size:11px;word-break:break-all;font-family:'Courier New',monospace;line-height:1.5;">
        ${resetUrl}
      </p>
    </div>

    <p style="margin:0 0 20px;color:#c4b5fd;font-size:12px;text-align:center;">
      Линкът е валиден <strong style="color:#ffffff;">1 час</strong>
    </p>

    <!-- Security notice -->
    <div style="background:#1e1a4a;border:1px solid #6366f1;border-radius:10px;padding:14px 18px;">
      <p style="margin:0;color:#c4b5fd;font-size:12px;line-height:1.65;">
        🔒&nbsp; Ако не си поискал нулиране на паролата, игнорирай имейла — акаунтът ти е в безопасност.
        Линкът изтича автоматично след 1 час.
      </p>
    </div>
  `);

  await transporter.sendMail({
    from: `"MuziMind" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Нулиране на парола — MuziMind',
    html,
  });
}

// ─── Verify transporter (non-fatal, just logs) ───────────────────────────────

export async function verifyEmailConfig(): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  EMAIL_USER / EMAIL_PASS not set — email sending disabled');
    return;
  }
  try {
    await transporter.verify();
    console.log(`✅ Email service ready (${process.env.EMAIL_USER})`);
  } catch (err) {
    console.warn('⚠️  Email transporter could not connect:', (err as Error).message);
  }
}
