import type { IncomingMessage, ServerResponse } from 'node:http';
import { parseJsonBody, sendJsonResponse, verifyFirebaseAdminBearer } from '../_lib/auth.ts';
import { isValidEmailAddress, sendTestNotificationEmail } from '../_lib/mailer.ts';

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    sendJsonResponse(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const authResult = await verifyFirebaseAdminBearer(token);

  if (!authResult.authorized) {
    sendJsonResponse(res, 401, { error: 'Administrator authentication required.' });
    return;
  }

  let body: Record<string, unknown> = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    body = {};
  }

  const requestedRecipient =
    typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
  if (requestedRecipient && !isValidEmailAddress(requestedRecipient)) {
    sendJsonResponse(res, 400, { error: 'Please enter a valid recipient email address.' });
    return;
  }

  const result = await sendTestNotificationEmail(requestedRecipient || undefined);
  sendJsonResponse(res, result.ok ? 200 : result.status === 'not_configured' ? 400 : 502, {
    ok: result.ok,
    status: result.status,
    provider: result.provider,
    recipient: result.recipient,
    subject: result.subject,
    detail: result.detail,
  });
}
