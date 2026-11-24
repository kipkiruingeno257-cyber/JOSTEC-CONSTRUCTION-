import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJsonResponse, verifyFirebaseAdminBearer } from '../_lib/auth.ts';
import { getEmailConfigStatus } from '../_lib/mailer.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') {
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

  const status = getEmailConfigStatus();
  sendJsonResponse(res, 200, {
    configured: status.configured,
    provider: status.provider,
    recipientMasked: status.recipientMasked,
    notificationToEnvConfigured: status.notificationToEnvConfigured,
    fromAddress: status.fromAddress,
    usingResendSandbox: status.usingResendSandbox,
    smtpHost: status.smtpHost,
  });
}
