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
    const data = (await res.json().catch(() => null)) as
      | (Partial<EmailDispatchResponse> & { error?: string })
      | null;

    if (!res.ok) {
      const errorMessage =
        data?.detail || data?.error || `Email service returned status ${res.status}.`;
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

    return {
      ok: Boolean(data?.ok),
      duplicate: Boolean(data?.duplicate),
      skippedSpam: Boolean(data?.skippedSpam),
      status: data?.status || 'sent',
      provider: data?.provider || 'resend',
      recipient: data?.recipient,
      subject: data?.subject,
      detail: data?.detail || 'Inquiry email notification processed.',
      adminEmail: data?.adminEmail,
      clientEmail: data?.clientEmail,
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
  const data = (await res.json().catch(() => ({}))) as Partial<EmailDispatchResponse> & {
    error?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      status: data.status || 'failed',
      provider: data.provider || 'none',
      recipient: data.recipient,
      subject: data.subject,
      detail: data.detail || data.error || 'Unable to send test notification.',
      error: data.error || data.detail,
    };
  }
  return {
    ok: Boolean(data.ok),
    status: data.status || 'sent',
    provider: data.provider || 'none',
    recipient: data.recipient,
    subject: data.subject,
    detail: data.detail || 'Test email delivered.',
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
  const data = (await res.json().catch(() => ({}))) as Partial<EmailDispatchResponse> & {
    error?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      status: data.status || 'failed',
      provider: data.provider || 'none',
      recipient: data.recipient,
      subject: data.subject,
      detail: data.detail || data.error || 'Unable to send reply email.',
      error: data.error || data.detail,
    };
  }
  return {
    ok: Boolean(data.ok),
    status: data.status || 'sent',
    provider: data.provider || 'none',
    recipient: data.recipient,
    subject: data.subject,
    detail: data.detail || 'Reply delivered to client.',
  };
}
