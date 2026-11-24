import crypto from 'node:crypto';
import process from 'node:process';
import nodemailer from 'nodemailer';

export const DEFAULT_OWNER_EMAIL = 'kipkiruingeno257@gmail.com';
export const CANONICAL_SITE_URL = 'https://jostec-construction.vercel.app';

export type EmailProviderKind = 'resend' | 'smtp' | 'none';
export type EmailDeliveryStatus = 'sent' | 'not_configured' | 'failed';

export interface EmailConfigStatus {
  configured: boolean;
  provider: EmailProviderKind;
  recipientMasked: string;
  recipientEmail: string;
  notificationToEnvConfigured: boolean;
  fromAddress: string;
  usingResendSandbox: boolean;
  smtpHost: string;
}

export interface EmailSendResult {
  ok: boolean;
  status: EmailDeliveryStatus;
  provider: EmailProviderKind;
  recipient: string;
  subject: string;
  detail: string;
  messageId?: string;
}

export interface InquiryWorkflowResult {
  ok: boolean;
  duplicate?: boolean;
  skippedSpam?: boolean;
  status: EmailDeliveryStatus | 'rate_limited';
  provider: EmailProviderKind;
  detail: string;
  adminEmail: EmailSendResult;
  clientEmail?: EmailSendResult;
}

export interface InquiryEmailPayload {
  inquiryId?: string;
  submissionId?: string;
  name: string;
  phone: string;
  email: string;
  serviceType: string;
  message: string;
  website?: string;
  siteOrigin?: string;
}

export interface ClientReplyEmailPayload {
  to: string;
  clientName: string;
  serviceType?: string;
  subject: string;
  message: string;
  inquiryId?: string;
}

// Sliding-window rate limit for public inquiry submissions (max 5 per 15 mins per IP)
const inquiryRateMap = new Map<string, { count: number; resetAt: number }>();
const INQUIRY_RATE_LIMIT_MAX = 5;
const INQUIRY_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// Duplicate submission guard (10 minute TTL by submissionId and content fingerprint)
const recentSubmissionCache = new Map<
  string,
  { expiresAt: number; result: InquiryWorkflowResult }
>();
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

function pruneExpiredCacheEntries(): void {
  const now = Date.now();
  for (const [key, val] of recentSubmissionCache.entries()) {
    if (now > val.expiresAt) {
      recentSubmissionCache.delete(key);
    }
  }
}

export function checkInquiryEmailRateLimit(ipKey: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const entry = inquiryRateMap.get(ipKey);
  if (!entry || now > entry.resetAt) {
    inquiryRateMap.set(ipKey, { count: 1, resetAt: now + INQUIRY_RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (entry.count >= INQUIRY_RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function stripHeaderBreaks(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function isValidEmailAddress(value: string): boolean {
  const clean = value.trim();
  if (!clean || clean.length > 120 || /[\r\n]/.test(clean)) return false;
  return /^[^\s@<>()[\],;:]+@[^\s@<>()[\],;:]+\.[^\s@<>()[\],;:]{2,}$/.test(clean);
}

export function isValidPhoneNumber(value: string): boolean {
  const clean = value.trim();
  if (clean.length < 6 || clean.length > 30) return false;
  const digitCount = clean.replace(/[^0-9]/g, '').length;
  return digitCount >= 6;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function maskEmail(email: string): string {
  const clean = email.trim();
  const atIdx = clean.indexOf('@');
  if (atIdx <= 1) return clean;
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx);
  if (local.length <= 3) {
    return `${local[0]}***${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-2)}${domain}`;
}

function getResolvedSmtpSettings() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  let host = (process.env.SMTP_HOST || '').trim();
  if (
    !host &&
    (user.toLowerCase().endsWith('@gmail.com') || user.toLowerCase().endsWith('@googlemail.com'))
  ) {
    host = 'smtp.gmail.com';
  }
  const rawPort = Number(process.env.SMTP_PORT || (host === 'smtp.gmail.com' ? 465 : 587));
  const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 587;
  const secureEnv = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure =
    secureEnv === 'true' || secureEnv === '1'
      ? true
      : secureEnv === 'false' || secureEnv === '0'
        ? false
        : port === 465;

  return { host, port, secure, user, pass };
}

export function getDefaultNotificationRecipient(): string {
  const configured = (process.env.NOTIFICATION_TO_EMAIL || '').trim();
  if (isValidEmailAddress(configured)) return configured;
  const smtpUser = (process.env.SMTP_USER || '').trim();
  if (isValidEmailAddress(smtpUser)) return smtpUser;
  return DEFAULT_OWNER_EMAIL;
}

export function getEmailConfigStatus(): EmailConfigStatus {
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const smtp = getResolvedSmtpSettings();
  const recipientEmail = getDefaultNotificationRecipient();
  const notificationToEnvConfigured = isValidEmailAddress(
    (process.env.NOTIFICATION_TO_EMAIL || '').trim()
  );

  if (resendKey) {
    const rawFrom = (process.env.EMAIL_FROM || '').trim();
    const fromAddress = rawFrom || 'JOSTEC Construction <onboarding@resend.dev>';
    const usingResendSandbox = fromAddress.toLowerCase().includes('onboarding@resend.dev');
    return {
      configured: true,
      provider: 'resend',
      recipientMasked: maskEmail(recipientEmail),
      recipientEmail,
      notificationToEnvConfigured,
      fromAddress,
      usingResendSandbox,
      smtpHost: 'api.resend.com',
    };
  }

  if (smtp.host && smtp.user && smtp.pass) {
    const fromAddress =
      (process.env.EMAIL_FROM || '').trim() || `JOSTEC Construction <${smtp.user}>`;
    return {
      configured: true,
      provider: 'smtp',
      recipientMasked: maskEmail(recipientEmail),
      recipientEmail,
      notificationToEnvConfigured,
      fromAddress,
      usingResendSandbox: false,
      smtpHost: smtp.host,
    };
  }

  return {
    configured: false,
    provider: 'none',
    recipientMasked: maskEmail(recipientEmail),
    recipientEmail,
    notificationToEnvConfigured,
    fromAddress: (process.env.EMAIL_FROM || '').trim() || 'Not configured',
    usingResendSandbox: false,
    smtpHost: 'Not configured',
  };
}

async function dispatchEmail(params: {
  to: string;
  subject: string;
  replyTo?: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}): Promise<EmailSendResult> {
  const status = getEmailConfigStatus();
  const cleanTo = stripHeaderBreaks(params.to);
  const cleanSubject = stripHeaderBreaks(params.subject).slice(0, 180);
  const cleanReplyTo =
    params.replyTo && isValidEmailAddress(params.replyTo)
      ? stripHeaderBreaks(params.replyTo)
      : undefined;

  if (!isValidEmailAddress(cleanTo)) {
    return {
      ok: false,
      status: 'failed',
      provider: status.provider,
      recipient: cleanTo,
      subject: cleanSubject,
      detail: 'Invalid recipient email address.',
    };
  }

  if (!status.configured) {
    return {
      ok: false,
      status: 'not_configured',
      provider: 'none',
      recipient: cleanTo,
      subject: cleanSubject,
      detail:
        'Resend email delivery is not configured yet (set RESEND_API_KEY and NOTIFICATION_TO_EMAIL in server environment variables).',
    };
  }

  if (status.provider === 'resend') {
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      };
      if (params.idempotencyKey) {
        headers['Idempotency-Key'] = params.idempotencyKey.slice(0, 250);
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: status.fromAddress,
          to: [cleanTo],
          subject: cleanSubject,
          ...(cleanReplyTo ? { reply_to: cleanReplyTo } : {}),
          html: params.html,
          text: params.text,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        name?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        const msg =
          data.message || data.error?.message || `Resend returned HTTP ${response.status}`;
        return {
          ok: false,
          status: 'failed',
          provider: 'resend',
          recipient: cleanTo,
          subject: cleanSubject,
          detail: msg,
        };
      }
      return {
        ok: true,
        status: 'sent',
        provider: 'resend',
        recipient: cleanTo,
        subject: cleanSubject,
        detail: 'Delivered via Resend.',
        messageId: data.id,
      };
    } catch (err) {
      return {
        ok: false,
        status: 'failed',
        provider: 'resend',
        recipient: cleanTo,
        subject: cleanSubject,
        detail: err instanceof Error ? err.message : 'Resend network error.',
      };
    }
  }

  // Optional fallback SMTP transport via nodemailer if Resend is not configured
  const smtp = getResolvedSmtpSettings();
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    const info = await transporter.sendMail({
      from: status.fromAddress,
      to: cleanTo,
      subject: cleanSubject,
      ...(cleanReplyTo ? { replyTo: cleanReplyTo } : {}),
      html: params.html,
      text: params.text,
    });

    return {
      ok: true,
      status: 'sent',
      provider: 'smtp',
      recipient: cleanTo,
      subject: cleanSubject,
      detail: `Delivered via SMTP (${smtp.host}).`,
      messageId: info.messageId,
    };
  } catch (err) {
    return {
      ok: false,
      status: 'failed',
      provider: 'smtp',
      recipient: cleanTo,
      subject: cleanSubject,
      detail: err instanceof Error ? err.message : 'SMTP delivery error.',
    };
  }
}

function resolveAdminConsoleUrl(siteOrigin?: string): string {
  const rawPath = (process.env.VITE_ADMIN_PATH || '/admin').trim();
  const normalizedPath =
    (rawPath.startsWith('/') ? rawPath : `/${rawPath}`).replace(/\/+$/, '') || '/admin';
  const base =
    siteOrigin && /^https:\/\/[a-zA-Z0-9.-]+(:\d+)?$/.test(siteOrigin)
      ? siteOrigin
      : CANONICAL_SITE_URL;
  return `${base}${normalizedPath}`;
}

export async function sendInquiryWorkflowEmails(
  payload: InquiryEmailPayload
): Promise<InquiryWorkflowResult> {
  const recipient = getDefaultNotificationRecipient();

  // Honeypot silent drop for automated bots
  if (payload.website && payload.website.trim().length > 0) {
    const botResult: EmailSendResult = {
      ok: true,
      status: 'sent',
      provider: 'none',
      recipient,
      subject: 'Ignored bot submission',
      detail: 'Ignored automated submission.',
    };
    return {
      ok: true,
      skippedSpam: true,
      status: 'sent',
      provider: 'none',
      detail: 'Submission processed.',
      adminEmail: botResult,
    };
  }

  const name = stripHeaderBreaks(String(payload.name || '')).slice(0, 100);
  const phone = stripHeaderBreaks(String(payload.phone || '')).slice(0, 30);
  const clientEmail = stripHeaderBreaks(String(payload.email || '')).slice(0, 120);
  const serviceType = stripHeaderBreaks(String(payload.serviceType || 'Project Inquiry')).slice(
    0,
    80
  );
  const message = String(payload.message || '').trim().slice(0, 2000);
  const inquiryId = stripHeaderBreaks(String(payload.inquiryId || '')).slice(0, 128);
  const submissionId = stripHeaderBreaks(String(payload.submissionId || '')).slice(0, 128);

  pruneExpiredCacheEntries();

  const contentFingerprint = crypto
    .createHash('sha256')
    .update(`${clientEmail.toLowerCase()}|${serviceType.toLowerCase()}|${message}`)
    .digest('hex')
    .slice(0, 32);

  const dedupeKeys = [`fp:${contentFingerprint}`];
  if (submissionId) {
    dedupeKeys.push(`sub:${submissionId}`);
  }

  for (const key of dedupeKeys) {
    const cached = recentSubmissionCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.result,
        duplicate: true,
        detail: 'Duplicate submission prevented; inquiry was already delivered.',
      };
    }
  }

  const adminUrl = resolveAdminConsoleUrl(payload.siteOrigin);
  const submittedAt = new Date().toUTCString();
  const safeName = escapeHtml(name);
  const safePhone = escapeHtml(phone);
  const safeEmail = escapeHtml(clientEmail);
  const safeService = escapeHtml(serviceType);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const safeInquiryId = escapeHtml(inquiryId);
  const safeAdminUrl = escapeHtml(adminUrl);
  const telHref = `tel:${encodeURIComponent(phone.replace(/[^+\d]/g, ''))}`;
  const mailtoHref = `mailto:${encodeURIComponent(clientEmail)}`;

  // 1. Admin Lead Notification -> NOTIFICATION_TO_EMAIL
  const adminSubject = `[JOSTEC Quote Request] ${serviceType} — ${name}`;
  const adminText = [
    `New Project Inquiry — JOSTEC Construction`,
    `=========================================`,
    `Service Requested: ${serviceType}`,
    `Client Name: ${name}`,
    `Phone / WhatsApp: ${phone}`,
    `Client Email: ${clientEmail}`,
    inquiryId ? `Reference ID: ${inquiryId}` : '',
    `Submitted: ${submittedAt}`,
    ``,
    `Project Description & Site Location:`,
    message,
    ``,
    `Open Admin Console: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  const adminHtml = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#0B1B2B;padding:22px 28px;border-bottom:4px solid #EA580C;">
          <p style="margin:0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#FB923C;font-weight:700;">JOSTEC Construction · Lead Alert</p>
          <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">New Project Quote Request</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:26px 28px;">
          <p style="margin:0 0 18px;font-size:14px;color:#475569;line-height:1.5;">
            A prospective client has submitted a new project inquiry on your website.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;font-size:14px;">
            <tr>
              <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;color:#0B1B2B;width:155px;">Service Requested</td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#EA580C;font-weight:700;">${safeService}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;color:#0B1B2B;">Client Name</td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;color:#0B1B2B;">Phone / WhatsApp</td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;"><a href="${telHref}" style="color:#0B1B2B;text-decoration:none;font-weight:600;">${safePhone}</a></td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;color:#0B1B2B;">Email Address</td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;"><a href="${mailtoHref}" style="color:#EA580C;text-decoration:none;">${safeEmail}</a></td>
            </tr>
            ${
              safeInquiryId
                ? `<tr>
              <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;color:#0B1B2B;">Reference ID</td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;font-family:monospace;font-size:12px;color:#475569;">${safeInquiryId}</td>
            </tr>`
                : ''
            }
          </table>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:22px;">
            <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;font-weight:700;">Project Description &amp; Site Location</p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#1e293b;">${safeMessage}</p>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:10px;">
                <a href="${mailtoHref}" style="display:inline-block;padding:11px 18px;background:#EA580C;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">Reply to Client</a>
              </td>
              <td>
                <a href="${safeAdminUrl}" style="display:inline-block;padding:11px 18px;background:#0B1B2B;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">Open Admin Console</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          Sent automatically by JOSTEC Construction · ${escapeHtml(submittedAt)}
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const adminIdempotencyKey = `jostec-admin-${submissionId || contentFingerprint}`;
  const adminEmail = await dispatchEmail({
    to: recipient,
    subject: adminSubject,
    replyTo: clientEmail,
    html: adminHtml,
    text: adminText,
    idempotencyKey: adminIdempotencyKey,
  });

  if (!adminEmail.ok) {
    return {
      ok: false,
      status: adminEmail.status,
      provider: adminEmail.provider,
      detail: adminEmail.detail,
      adminEmail,
    };
  }

  // 2. Professional Client Confirmation Email -> clientEmail
  const clientSubject = `We Received Your ${serviceType} Inquiry — JOSTEC Construction`;
  const clientText = [
    `Hello ${name},`,
    ``,
    `Thank you for contacting JOSTEC Construction. We have received your inquiry regarding ${serviceType} and logged it for engineering review.`,
    ``,
    `Summary of Your Request:`,
    inquiryId ? `Reference ID: ${inquiryId}` : '',
    `Service Requested: ${serviceType}`,
    `Phone / WhatsApp: ${phone}`,
    `Project Description: ${message}`,
    ``,
    `Our team will review your project specifications and follow up with you directly regarding next steps, site survey scheduling, or your estimate.`,
    `If you have additional measurements or site photos to share, simply reply directly to this email.`,
    ``,
    `Best regards,`,
    `JOSTEC Construction`,
    CANONICAL_SITE_URL,
  ]
    .filter(Boolean)
    .join('\n');

  const clientHtml = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#0B1B2B;padding:22px 28px;border-bottom:4px solid #EA580C;">
          <p style="margin:0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#FB923C;font-weight:700;">JOSTEC Construction · Inquiry Confirmation</p>
          <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">Thank You for Your Project Inquiry</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:26px 28px;font-size:14px;line-height:1.6;color:#334155;">
          <p style="margin:0 0 14px;">Hello <strong style="color:#0B1B2B;">${safeName}</strong>,</p>
          <p style="margin:0 0 18px;">
            Thank you for reaching out to <strong>JOSTEC Construction</strong>. We have received your request for <strong style="color:#EA580C;">${safeService}</strong> and our team will review your specifications and follow up with you directly.
          </p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 18px;margin-bottom:20px;">
            <p style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;font-weight:700;">Submitted Inquiry Summary</p>
            <p style="margin:0 0 6px;font-size:13px;"><strong>Service:</strong> ${safeService}</p>
            <p style="margin:0 0 6px;font-size:13px;"><strong>Phone / WhatsApp:</strong> ${safePhone}</p>
            ${
              safeInquiryId
                ? `<p style="margin:0 0 6px;font-size:13px;"><strong>Reference ID:</strong> <span style="font-family:monospace;font-size:12px;">${safeInquiryId}</span></p>`
                : ''
            }
            <p style="margin:10px 0 4px;font-size:13px;"><strong>Project Scope:</strong></p>
            <p style="margin:0;font-size:13px;color:#1e293b;">${safeMessage}</p>
          </div>

          <p style="margin:0 0 18px;font-size:13px;color:#475569;">
            If you would like to share gate measurements, drawings, or site photos before we call, simply reply to this email.
          </p>

          <p style="margin:0;font-size:13px;color:#0B1B2B;border-top:1px solid #e2e8f0;padding-top:16px;">
            <strong>JOSTEC Construction</strong><br />
            <a href="${CANONICAL_SITE_URL}" style="color:#EA580C;text-decoration:none;">${CANONICAL_SITE_URL}</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const clientIdempotencyKey = `jostec-client-${submissionId || contentFingerprint}`;
  const clientEmailResult = await dispatchEmail({
    to: clientEmail,
    subject: clientSubject,
    replyTo: recipient,
    html: clientHtml,
    text: clientText,
    idempotencyKey: clientIdempotencyKey,
  });

  const finalResult: InquiryWorkflowResult = {
    ok: true,
    status: 'sent',
    provider: adminEmail.provider,
    detail: clientEmailResult.ok
      ? 'Inquiry alert and client confirmation email delivered.'
      : `Admin alert delivered. Client confirmation note: ${clientEmailResult.detail}`,
    adminEmail,
    clientEmail: clientEmailResult,
  };

  const expiresAt = Date.now() + DEDUPE_WINDOW_MS;
  for (const key of dedupeKeys) {
    recentSubmissionCache.set(key, { expiresAt, result: finalResult });
  }

  return finalResult;
}

export async function sendTestNotificationEmail(targetEmail?: string): Promise<EmailSendResult> {
  const recipient =
    targetEmail && isValidEmailAddress(targetEmail)
      ? targetEmail.trim()
      : getDefaultNotificationRecipient();
  const adminUrl = resolveAdminConsoleUrl();
  const timestamp = new Date().toUTCString();
  const subject = 'JOSTEC Construction — Resend Email Notifications Verified';

  const text = [
    'This is a test notification from your JOSTEC Construction Admin Console.',
    `Recipient: ${recipient}`,
    `Timestamp: ${timestamp}`,
    `Admin Console: ${adminUrl}`,
    '',
    'Your server is ready to deliver instant inquiry alerts and client confirmation emails via Resend.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#0B1B2B;padding:20px 26px;border-bottom:4px solid #EA580C;">
          <p style="margin:0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#FB923C;font-weight:700;">JOSTEC Construction</p>
          <h1 style="margin:6px 0 0;font-size:19px;color:#ffffff;font-weight:700;">Email Notifications Active</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 26px;font-size:14px;line-height:1.6;color:#334155;">
          <p style="margin:0 0 12px;">Your Resend email delivery integration is configured and delivering messages cleanly.</p>
          <p style="margin:0 0 18px;">New quote inquiries submitted on your live website will arrive directly in this inbox (<strong style="color:#0B1B2B;">${escapeHtml(recipient)}</strong>) and trigger client confirmation receipts.</p>
          <a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:10px 16px;background:#0B1B2B;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">Open Admin Console</a>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 26px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          Verified at ${escapeHtml(timestamp)}
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return dispatchEmail({
    to: recipient,
    subject,
    html,
    text,
  });
}

export async function sendClientReplyEmail(
  payload: ClientReplyEmailPayload
): Promise<EmailSendResult> {
  const to = stripHeaderBreaks(String(payload.to || ''));
  const clientName = stripHeaderBreaks(String(payload.clientName || 'Client')).slice(0, 100);
  const serviceType = stripHeaderBreaks(String(payload.serviceType || 'Project Inquiry')).slice(
    0,
    80
  );
  const subject = stripHeaderBreaks(String(payload.subject || '')).slice(0, 180);
  const message = String(payload.message || '').trim().slice(0, 4000);

  if (!isValidEmailAddress(to)) {
    return {
      ok: false,
      status: 'failed',
      provider: getEmailConfigStatus().provider,
      recipient: to,
      subject,
      detail: 'Client email address is invalid.',
    };
  }
  if (subject.length < 2 || message.length < 5) {
    return {
      ok: false,
      status: 'failed',
      provider: getEmailConfigStatus().provider,
      recipient: to,
      subject,
      detail: 'Please provide a valid subject and reply message.',
    };
  }

  const replyTo = getDefaultNotificationRecipient();
  const safeName = escapeHtml(clientName);
  const safeService = escapeHtml(serviceType);
  const safeBody = escapeHtml(message).replace(/\n/g, '<br />');

  const text = [
    `Hello ${clientName},`,
    '',
    message,
    '',
    `Regards,`,
    `JOSTEC Construction`,
    CANONICAL_SITE_URL,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#0B1B2B;padding:20px 26px;border-bottom:4px solid #EA580C;">
          <p style="margin:0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#FB923C;font-weight:700;">JOSTEC Construction · ${safeService}</p>
          <h1 style="margin:6px 0 0;font-size:18px;color:#ffffff;font-weight:700;">${escapeHtml(subject)}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:26px;font-size:14px;line-height:1.65;color:#1e293b;">
          <p style="margin:0 0 14px;">Hello <strong>${safeName}</strong>,</p>
          <div style="margin:0 0 22px;">${safeBody}</div>
          <p style="margin:0;font-size:13px;color:#475569;border-top:1px solid #e2e8f0;padding-top:14px;">
            <strong>JOSTEC Construction</strong><br />
            <a href="${CANONICAL_SITE_URL}" style="color:#EA580C;text-decoration:none;">${CANONICAL_SITE_URL}</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return dispatchEmail({
    to,
    subject,
    replyTo,
    html,
    text,
  });
}
