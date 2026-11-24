import type { IncomingMessage, ServerResponse } from 'node:http';
import { getRequestClientIp, parseJsonBody, sendJsonResponse } from './_lib/auth.ts';
import {
  checkInquiryEmailRateLimit,
  isValidEmailAddress,
  isValidPhoneNumber,
  sendInquiryWorkflowEmails,
} from './_lib/mailer.ts';

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    sendJsonResponse(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const clientIp = getRequestClientIp(req);
  const rate = checkInquiryEmailRateLimit(clientIp);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    sendJsonResponse(res, 429, {
      ok: false,
      status: 'rate_limited',
      error: `Too many quote requests from this connection. Please wait ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s) before trying again.`,
    });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await parseJsonBody(req);
  } catch (err) {
    sendJsonResponse(res, 400, {
      error: err instanceof Error ? err.message : 'Invalid request payload.',
    });
    return;
  }

  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const email = String(body.email || '').trim();
  const serviceType = String(body.serviceType || 'Project Inquiry').trim();
  const message = String(body.message || '').trim();
  const inquiryId = typeof body.inquiryId === 'string' ? body.inquiryId.trim() : undefined;
  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : undefined;
  const website = typeof body.website === 'string' ? body.website : undefined;

  if (name.length < 2 || name.length > 100) {
    sendJsonResponse(res, 400, { error: 'Please enter your full name (2–100 characters).' });
    return;
  }
  if (!isValidPhoneNumber(phone)) {
    sendJsonResponse(res, 400, { error: 'Please enter a valid phone or WhatsApp number.' });
    return;
  }
  if (!isValidEmailAddress(email)) {
    sendJsonResponse(res, 400, { error: 'Please enter a valid email address.' });
    return;
  }
  if (message.length < 10 || message.length > 2000) {
    sendJsonResponse(res, 400, {
      error: 'Please describe your project scope in 10–2000 characters.',
    });
    return;
  }

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim();
  const siteOrigin = host && proto === 'https' ? `https://${host}` : undefined;

  const result = await sendInquiryWorkflowEmails({
    inquiryId,
    submissionId,
    name,
    phone,
    email,
    serviceType,
    message,
    website,
    siteOrigin,
  });

  const httpStatus = result.ok ? 200 : result.status === 'not_configured' ? 503 : 502;
  sendJsonResponse(res, httpStatus, {
    ok: result.ok,
    duplicate: Boolean(result.duplicate),
    status: result.status,
    provider: result.provider,
    detail: result.detail,
    adminEmail: result.adminEmail,
    clientEmail: result.clientEmail,
  });
}
