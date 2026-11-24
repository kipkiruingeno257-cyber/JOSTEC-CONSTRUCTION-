import type { IncomingMessage, ServerResponse } from 'node:http';
import { parseJsonBody, sendJsonResponse, verifyFirebaseAdminBearer } from '../_lib/auth.ts';
import { sendClientReplyEmail } from '../_lib/mailer.ts';

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

  let body: Record<string, unknown>;
  try {
    body = await parseJsonBody(req);
  } catch (err) {
    sendJsonResponse(res, 400, {
      error: err instanceof Error ? err.message : 'Invalid request payload.',
    });
    return;
  }

  const result = await sendClientReplyEmail({
    to: String(body.to || ''),
    clientName: String(body.clientName || 'Client'),
    serviceType: String(body.serviceType || 'Project Inquiry'),
    subject: String(body.subject || ''),
    message: String(body.message || ''),
    inquiryId: typeof body.inquiryId === 'string' ? body.inquiryId : undefined,
  });

  sendJsonResponse(res, result.ok ? 200 : result.status === 'not_configured' ? 400 : 502, {
    ok: result.ok,
    status: result.status,
    provider: result.provider,
    recipient: result.recipient,
    subject: result.subject,
    detail: result.detail,
  });
}
