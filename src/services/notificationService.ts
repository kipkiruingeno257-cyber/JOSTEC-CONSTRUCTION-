import type {
  EmailDispatchResponse,
  EmailLogRecord,
  EmailProviderKind,
} from '../types';
import { getAdminRequestHeaders } from './localMediaService';

export type { EmailDispatchResponse };

export interface NotificationStatusResponse {
  configured: boolean;
  provider: EmailProviderKind;
  recipientMasked: string;
  notificationToEnvConfigured: boolean;
  fromAddress: string;
  usingResendSandbox: boolean;
  smtpHost: string;
  localLogs?: EmailLogRecord[];
}

export async function notifyInquiryEmail(payload: {
  inquiryId?: string;
  submissionId?: string;
  name: string;
  phone: string;
  email: string;
  serviceType: string;
  message: string;
  website?: string;
}): Promise<EmailDispatchResponse> {
  try {
    const res = await fetch('/api/notify-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const rawText = await res.text().catch(() => '');
    let data: (Partial<EmailDispatchResponse> & { error?: string }) | null = null;
    if (rawText && (contentType.includes('application/json') || rawText.trim().startsWith('{'))) {
      try {
        data = JSON.parse(rawText) as Partial<EmailDispatchResponse> & { error?: string };
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      const errorMessage =
        data?.detail || data?.error || `Email service returned HTTP ${res.status}.`;
      return {
        ok: false,
        status: data?.status || (res.status === 429 ? 'rate_limited' : 'failed'),
        provider: data?.provider || 'none',
        detail: errorMessage,
        error: data?.error || errorMessage,
        adminEmail: data?.adminEmail,
        clientEmail: data?.clientEmail,
        httpStatus: res.status,
      };
    }

    if (!data || typeof data.ok !== 'boolean') {
      const msg =
        'Email notification endpoint (/api/notify-inquiry) did not return a JSON API response. If you are viewing a static preview or an older deployment, redeploy with the /api serverless functions and configure RESEND_API_KEY and NOTIFICATION_TO_EMAIL.';
      return {
        ok: false,
        status: 'failed',
        provider: 'none',
        detail: msg,
        error: msg,
        httpStatus: res.status,
      };
    }

    const ok = data.ok;
    return {
      ok,
      duplicate: Boolean(data.duplicate),
      skippedSpam: Boolean(data.skippedSpam),
      status: data.status || (ok ? 'sent' : 'failed'),
      provider: data.provider || 'resend',
      recipient: data.recipient,
      subject: data.subject,
      detail:
        data.detail ||
        data.error ||
        (ok
          ? 'Inquiry email notification sent.'
          : 'Email delivery failed without a detailed error message.'),
      error: data.error,
      adminEmail: data.adminEmail,
      clientEmail: data.clientEmail,
      httpStatus: res.status,
    };
  } catch {
    return {
      ok: false,
      status: 'failed',
      provider: 'none',
      detail: 'Network error while reaching the email notification server.',
      error: 'Network error while reaching the email notification server.',
    };
  }
}

export async function fetchNotificationStatus(): Promise<NotificationStatusResponse> {
  const headers = await getAdminRequestHeaders();
  const res = await fetch('/api/notifications/status', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers,
  });
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Notification status endpoint (/api/notifications/status) returned non-JSON content. Ensure the backend API server is active.'
    );
  }
  const data = (await res.json().catch(() => ({}))) as Partial<NotificationStatusResponse> & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Unable to inspect email notification configuration.');
  }
  return {
    configured: Boolean(data.configured),
    provider: data.provider || 'none',
    recipientMasked: data.recipientMasked || 'Not configured',
    notificationToEnvConfigured: Boolean(data.notificationToEnvConfigured),
    fromAddress: data.fromAddress || 'Not configured',
    usingResendSandbox: Boolean(data.usingResendSandbox),
    smtpHost: data.smtpHost || 'Not configured',
    localLogs: Array.isArray(data.localLogs) ? data.localLogs : undefined,
  };
}

export async function sendTestEmailNotification(
  recipientEmail?: string
): Promise<EmailDispatchResponse> {
  const headers = await getAdminRequestHeaders();
  const res = await fetch('/api/notifications/test', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(recipientEmail ? { recipientEmail } : {}),
  });
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const data = contentType.includes('application/json')
    ? ((await res.json().catch(() => null)) as
        | (Partial<EmailDispatchResponse> & { error?: string })
        | null)
    : null;

  if (!res.ok || !data || typeof data.ok !== 'boolean') {
    const errDetail =
      data?.detail ||
      data?.error ||
      (!data
        ? 'Notification test endpoint (/api/notifications/test) is unreachable on this host.'
        : 'Unable to send test notification.');
    return {
      ok: false,
      status: data?.status || 'failed',
      provider: data?.provider || 'none',
      recipient: data?.recipient,
      subject: data?.subject,
      detail: errDetail,
      error: data?.error || errDetail,
    };
  }
  return {
    ok: data.ok,
    status: data.status || (data.ok ? 'sent' : 'failed'),
    provider: data.provider || 'none',
    recipient: data.recipient,
    subject: data.subject,
    detail: data.detail || (data.ok ? 'Test email delivered.' : 'Test email delivery failed.'),
  };
}

export async function sendAdminClientReply(payload: {
  to: string;
  clientName: string;
  serviceType?: string;
  subject: string;
  message: string;
  inquiryId?: string;
}): Promise<EmailDispatchResponse> {
  const headers = await getAdminRequestHeaders();
  const res = await fetch('/api/notifications/reply', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const data = contentType.includes('application/json')
    ? ((await res.json().catch(() => null)) as
        | (Partial<EmailDispatchResponse> & { error?: string })
        | null)
    : null;

  if (!res.ok || !data || typeof data.ok !== 'boolean') {
    const errDetail =
      data?.detail ||
      data?.error ||
      (!data
        ? 'Reply endpoint (/api/notifications/reply) is unreachable on this host.'
        : 'Unable to send reply email.');
    return {
      ok: false,
      status: data?.status || 'failed',
      provider: data?.provider || 'none',
      recipient: data?.recipient,
      subject: data?.subject,
      detail: errDetail,
      error: data?.error || errDetail,
    };
  }
  return {
    ok: data.ok,
    status: data.status || (data.ok ? 'sent' : 'failed'),
    provider: data.provider || 'none',
    recipient: data.recipient,
    subject: data.subject,
    detail: data.detail || (data.ok ? 'Reply delivered to client.' : 'Reply email delivery failed.'),
  };
}
