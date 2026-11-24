import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { DEFAULT_OWNER_EMAIL } from './mailer.ts';

interface FirebaseConfigSubset {
  apiKey?: string;
  projectId?: string;
  firestoreDatabaseId?: string;
}

let cachedFirebaseCfg: FirebaseConfigSubset | null = null;

function getFirebaseConfig(): FirebaseConfigSubset {
  if (cachedFirebaseCfg) return cachedFirebaseCfg;
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(cfgPath)) {
      cachedFirebaseCfg = {};
      return cachedFirebaseCfg;
    }
    cachedFirebaseCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as FirebaseConfigSubset;
    return cachedFirebaseCfg;
  } catch {
    cachedFirebaseCfg = {};
    return cachedFirebaseCfg;
  }
}

export async function verifyFirebaseAdminBearer(
  idToken: string
): Promise<{ authorized: boolean; uid?: string; email?: string }> {
  const cfg = getFirebaseConfig();
  if (!idToken || !cfg.apiKey) {
    return { authorized: false };
  }
  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(cfg.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!lookupRes.ok) {
      return { authorized: false };
    }
    const lookupData = (await lookupRes.json()) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    };
    const user = lookupData.users?.[0];
    if (!user || user.emailVerified !== true || !user.localId) {
      return { authorized: false };
    }

    if (user.email?.toLowerCase() === DEFAULT_OWNER_EMAIL.toLowerCase()) {
      return { authorized: true, uid: user.localId, email: user.email };
    }

    // Check delegated admin membership in Firestore /admins/{uid} using caller's own verified ID token
    if (cfg.projectId) {
      const dbId = cfg.firestoreDatabaseId || '(default)';
      const adminDocUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        cfg.projectId
      )}/databases/${encodeURIComponent(dbId)}/documents/admins/${encodeURIComponent(user.localId)}`;
      const adminRes = await fetch(adminDocUrl, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (adminRes.ok) {
        return { authorized: true, uid: user.localId, email: user.email };
      }
    }

    return { authorized: false };
  } catch {
    return { authorized: false };
  }
}

export function getRequestClientIp(req: IncomingMessage): string {
  const fwd = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return fwd || req.socket?.remoteAddress || 'unknown';
}

export async function parseJsonBody<T = Record<string, unknown>>(
  req: IncomingMessage & { body?: unknown }
): Promise<T> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as T;
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body) as T;
  }

  return new Promise<T>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const MAX_BYTES = 64 * 1024;
    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BYTES) {
        reject(new Error('Request payload too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(raw) as T);
      } catch {
        reject(new Error('Invalid JSON payload.'));
      }
    });
    req.on('error', reject);
  });
}

export function sendJsonResponse(res: ServerResponse, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
