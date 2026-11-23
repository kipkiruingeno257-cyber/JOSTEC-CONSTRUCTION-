import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const AUTH_PATH = path.join(DATA_DIR, 'auth.json');
const BOOTSTRAPPED_ADMIN_EMAIL = 'kipkiruingeno257@gmail.com';
const SESSION_COOKIE_NAME = 'jsm_local_admin';

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function loadFirebaseApiKey(): string {
  try {
    const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (!fs.existsSync(cfgPath)) return '';
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { apiKey?: string };
    return typeof parsed.apiKey === 'string' ? parsed.apiKey : '';
  } catch {
    return '';
  }
}

const FIREBASE_API_KEY = loadFirebaseApiKey();

interface LocalPhotoAppearance {
  aspectRatio: '4/3' | '16/9' | '1/1' | '3/4';
  objectFit: 'cover' | 'contain';
  focalPoint: 'center' | 'top' | 'bottom' | 'left' | 'right';
  frameStyle: 'clean' | 'elevated' | 'rounded' | 'blueprint';
  tone: 'natural' | 'crisp' | 'warm' | 'steel' | 'mono';
  brightness: number;
  contrast: number;
  saturation: number;
  showBadge: boolean;
}

function sanitizePhotoAppearance(raw: unknown): LocalPhotoAppearance {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const clampNum = (v: unknown, min: number, max: number, def: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : def;
  };
  return {
    aspectRatio:
      obj.aspectRatio === '16/9' || obj.aspectRatio === '1/1' || obj.aspectRatio === '3/4'
        ? obj.aspectRatio
        : '4/3',
    objectFit: obj.objectFit === 'contain' ? 'contain' : 'cover',
    focalPoint:
      obj.focalPoint === 'top' ||
      obj.focalPoint === 'bottom' ||
      obj.focalPoint === 'left' ||
      obj.focalPoint === 'right'
        ? obj.focalPoint
        : 'center',
    frameStyle:
      obj.frameStyle === 'elevated' ||
      obj.frameStyle === 'rounded' ||
      obj.frameStyle === 'blueprint'
        ? obj.frameStyle
        : 'clean',
    tone:
      obj.tone === 'crisp' ||
      obj.tone === 'warm' ||
      obj.tone === 'steel' ||
      obj.tone === 'mono'
        ? obj.tone
        : 'natural',
    brightness: clampNum(obj.brightness, 80, 130, 100),
    contrast: clampNum(obj.contrast, 85, 130, 100),
    saturation: clampNum(obj.saturation, 0, 135, 100),
    showBadge: typeof obj.showBadge === 'boolean' ? obj.showBadge : true,
  };
}

interface LocalProject {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: string;
  completionYear?: string;
  imageUrls: string[];
  storagePaths: string[];
  photoAppearance?: LocalPhotoAppearance;
  status: 'draft' | 'published';
  authorId: string;
  createdAtMs: number;
  updatedAtMs: number;
}

interface LocalTestimonial {
  id: string;
  clientName: string;
  clientRole: string;
  projectType: string;
  quote: string;
  rating: number;
  status: 'published' | 'hidden';
  authorId: string;
  createdAtMs: number;
  updatedAtMs: number;
}

interface LocalInquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceType: string;
  message: string;
  status: 'new' | 'reviewed' | 'archived';
  createdAtMs: number;
  updatedAtMs: number;
}

interface LocalSiteProfile {
  displayName: string;
  title: string;
  headline: string;
  description: string;
  avatarUrl: string;
  avatarStoragePath: string;
  updatedAtMs: number;
}

const ALLOWED_SITE_IMAGE_SLOTS = [
  'hero',
  'service_construction',
  'service_welding',
  'service_perimeter',
] as const;
type LocalSiteImageSlot = (typeof ALLOWED_SITE_IMAGE_SLOTS)[number];

interface LocalSiteImage {
  slot: LocalSiteImageSlot;
  imageUrl: string;
  storagePath: string;
  caption?: string;
  updatedAtMs: number;
}

interface LocalStore {
  projects: LocalProject[];
  testimonials: LocalTestimonial[];
  inquiries: LocalInquiry[];
  profile?: LocalSiteProfile | null;
  siteImages?: Partial<Record<LocalSiteImageSlot, LocalSiteImage>>;
}

interface AuthConfig {
  sessionSecret: string;
  passcodeSalt?: string;
  passcodeHash?: string;
  recoverySalt?: string;
  recoveryHash?: string;
}

const loginFailures = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_FAILURES = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

function getClientKey(req: express.Request): string {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.ip || 'unknown';
}

function getRateLimitRemainingSeconds(key: string): number {
  const entry = loginFailures.get(key);
  if (!entry) return 0;
  if (Date.now() > entry.resetAt) {
    loginFailures.delete(key);
    return 0;
  }
  return entry.count >= MAX_LOGIN_FAILURES ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0;
}

function recordLoginFailure(key: string): void {
  const now = Date.now();
  const entry = loginFailures.get(key);
  if (!entry || now > entry.resetAt) {
    loginFailures.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearLoginFailures(key: string): void {
  loginFailures.delete(key);
}

let cachedStore: LocalStore | null = null;

function readStore(): LocalStore {
  if (cachedStore) {
    return cachedStore;
  }
  try {
    if (!fs.existsSync(STORE_PATH)) {
      cachedStore = { projects: [], testimonials: [], inquiries: [] };
      return cachedStore;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    cachedStore = {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials : [],
      inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
      profile: parsed.profile && typeof parsed.profile === 'object' ? parsed.profile : null,
      siteImages:
        parsed.siteImages && typeof parsed.siteImages === 'object' ? parsed.siteImages : {},
    };
    return cachedStore;
  } catch {
    cachedStore = { projects: [], testimonials: [], inquiries: [], profile: null, siteImages: {} };
    return cachedStore;
  }
}

function writeStore(store: LocalStore): void {
  cachedStore = store;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function getAuthConfig(): AuthConfig {
  const envSecret = process.env.LOCAL_ADMIN_SESSION_SECRET?.trim();
  try {
    if (fs.existsSync(AUTH_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8')) as AuthConfig;
      if (parsed.sessionSecret || envSecret) {
        return {
          ...parsed,
          sessionSecret: envSecret || parsed.sessionSecret,
        };
      }
    }
  } catch {
    // Regenerate cleanly below if corrupt
  }
  const fresh: AuthConfig = {
    sessionSecret: envSecret || crypto.randomBytes(32).toString('hex'),
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(AUTH_PATH, JSON.stringify(fresh, null, 2), 'utf8');
  return fresh;
}

function saveAuthConfig(cfg: AuthConfig): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(AUTH_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

function hashSecretValue(value: string, salt: string): string {
  return crypto.scryptSync(value, salt, 64).toString('hex');
}

function verifySecretHash(candidate: string, salt: string, expectedHash: string): boolean {
  const computed = hashSecretValue(candidate, salt);
  const a = Buffer.from(computed);
  const b = Buffer.from(expectedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function generateRecoveryKey(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let raw = '';
  for (let i = 0; i < 8; i++) {
    raw += alphabet[bytes[i] % alphabet.length];
  }
  return `JSM-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

function normalizeRecoveryKey(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function signSessionToken(secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({ role: 'local-admin', exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string | undefined, secret: string): boolean {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return data.role === 'local-admin' && typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

function buildSessionCookie(req: express.Request, value: string, maxAgeSeconds: number): string {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  const isHttps = req.secure || forwardedProto === 'https';
  const sameSite = isHttps ? 'SameSite=None; Secure; Partitioned' : 'SameSite=Lax';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; ${sameSite}; Max-Age=${maxAgeSeconds}`;
}

function hasTrustedMutationOrigin(req: express.Request): boolean {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true;
  }
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    return true;
  }
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsedOrigin = new URL(origin);
    const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    return Boolean(hostHeader && parsedOrigin.host === hostHeader);
  } catch {
    return false;
  }
}

function isSafeImageUrl(url: string): boolean {
  return (
    url.startsWith('https://') ||
    url.startsWith('http://') ||
    url.startsWith('/') ||
    /^data:image\/(jpeg|jpg|png|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(url)
  );
}

async function verifyFirebaseAdminToken(idToken: string): Promise<boolean> {
  if (!idToken || !FIREBASE_API_KEY) return false;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    return Boolean(
      user &&
        user.emailVerified === true &&
        user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
    );
  } catch {
    return false;
  }
}

async function isAuthorizedRequest(req: express.Request): Promise<boolean> {
  const cfg = getAuthConfig();
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (verifySessionToken(token, cfg.sessionSecret)) {
      return true;
    }
    if (await verifyFirebaseAdminToken(token)) {
      return true;
    }
  }
  const cookies = parseCookies(req.headers.cookie);
  if (verifySessionToken(cookies[SESSION_COOKIE_NAME], cfg.sessionSecret)) {
    return hasTrustedMutationOrigin(req);
  }
  return false;
}

function detectImageExtension(buf: Buffer, mimeHeader: string): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  // AVIF: ....ftypavif / ftypmif1
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') return 'avif';
  }
  // Fallback strictly if mime matches known types and header is valid
  if (mimeHeader === 'image/jpeg' && buf[0] === 0xff) return 'jpg';
  return null;
}

function sanitizeSafeSegment(val: string): string {
  return val.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

async function startServer() {
  const app = express();

  const rawAdminPath = (process.env.VITE_ADMIN_PATH || '/admin').trim();
  const normalizedAdminPath =
    (rawAdminPath.startsWith('/') ? rawAdminPath : `/${rawAdminPath}`).replace(/\/+$/, '') ||
    '/admin';

  app.use((req, res, next) => {
    if (
      req.path === '/admin' ||
      req.path.startsWith('/admin/') ||
      req.path === normalizedAdminPath ||
      req.path.startsWith(`${normalizedAdminPath}/`) ||
      req.path.startsWith('/api/')
    ) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }
    next();
  });

  app.use('/api/local', express.json({ limit: '1mb' }));

  // --- Media Upload (Direct Server Storage - Zero Firebase Storage Required) ---
  app.post(
    '/api/media/upload',
    express.raw({
      type: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'],
      limit: '12mb',
    }),
    async (req, res) => {
      const authorized = await isAuthorizedRequest(req);
      if (!authorized) {
        res.status(401).json({ error: 'Administrator sign-in required to upload media.' });
        return;
      }

      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: 'Empty image payload.' });
        return;
      }
      if (body.length > 10 * 1024 * 1024) {
        res.status(413).json({ error: 'Image exceeds 10 MB maximum size.' });
        return;
      }

      const contentType = String(req.headers['content-type'] || '').toLowerCase();
      const ext = detectImageExtension(body, contentType);
      if (!ext) {
        res.status(400).json({ error: 'Unsupported or invalid image file bytes.' });
        return;
      }

      const rawProjectId = String(req.headers['x-project-id'] || 'project');
      const projectPrefix = sanitizeSafeSegment(rawProjectId) || 'project';
      const fileName = `${projectPrefix}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}.${ext}`;
      const targetPath = path.join(UPLOADS_DIR, fileName);

      fs.writeFileSync(targetPath, body);
      res.status(201).json({
        url: `/api/media/${fileName}`,
        storagePath: `local:${fileName}`,
        size: body.length,
      });
    }
  );

  app.get('/api/media/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    if (!/^[a-zA-Z0-9._-]{1,180}$/.test(fileName)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }
    const resolved = path.resolve(UPLOADS_DIR, fileName);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Image not found.' });
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(resolved);
  });

  app.delete('/api/media/:fileName', async (req, res) => {
    const authorized = await isAuthorizedRequest(req);
    if (!authorized) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const fileName = req.params.fileName;
    if (!/^[a-zA-Z0-9._-]{1,180}$/.test(fileName)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }
    const resolved = path.resolve(UPLOADS_DIR, fileName);
    if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
    res.json({ deleted: true });
  });

  // --- Standalone Local Mode Auth (No Firebase / No Google Required) ---
  app.get('/api/local/session', (req, res) => {
    const cfg = getAuthConfig();
    const cookies = parseCookies(req.headers.cookie);
    const authHeader = req.headers.authorization;
    const bearer =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const envControlled = Boolean(process.env.LOCAL_ADMIN_PASSCODE?.trim());
    const hasPasscodeConfigured = Boolean(envControlled || (cfg.passcodeSalt && cfg.passcodeHash));
    const hasRecoveryKey = Boolean(!envControlled && cfg.recoverySalt && cfg.recoveryHash);
    const authenticated =
      verifySessionToken(bearer, cfg.sessionSecret) ||
      verifySessionToken(cookies[SESSION_COOKIE_NAME], cfg.sessionSecret);
    res.json({
      authenticated,
      hasPasscodeConfigured,
      hasRecoveryKey,
      envControlled,
    });
  });

  app.post('/api/local/setup', (req, res) => {
    const cfg = getAuthConfig();
    if (process.env.LOCAL_ADMIN_PASSCODE?.trim() || (cfg.passcodeSalt && cfg.passcodeHash)) {
      res.status(409).json({ error: 'Local admin passcode is already configured. Please sign in.' });
      return;
    }
    const passcode = String((req.body as { passcode?: string })?.passcode || '').trim();
    if (passcode.length < 6 || passcode.length > 64) {
      res.status(400).json({ error: 'Passcode must be between 6 and 64 characters.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashSecretValue(passcode, salt);
    const recoveryKey = generateRecoveryKey();
    const recoverySalt = crypto.randomBytes(16).toString('hex');
    const recoveryHash = hashSecretValue(normalizeRecoveryKey(recoveryKey), recoverySalt);

    cfg.passcodeSalt = salt;
    cfg.passcodeHash = hash;
    cfg.recoverySalt = recoverySalt;
    cfg.recoveryHash = recoveryHash;
    saveAuthConfig(cfg);

    const token = signSessionToken(cfg.sessionSecret);
    res.setHeader('Set-Cookie', buildSessionCookie(req, token, 7 * 24 * 60 * 60));
    res.status(201).json({
      authenticated: true,
      token,
      recoveryKey,
      hasRecoveryKey: true,
      envControlled: false,
    });
  });

  app.post('/api/local/login', (req, res) => {
    const clientKey = getClientKey(req);
    const waitSeconds = getRateLimitRemainingSeconds(clientKey);
    if (waitSeconds > 0) {
      res.setHeader('Retry-After', String(waitSeconds));
      res.status(429).json({
        error: `Too many failed attempts. Try again in ${waitSeconds} seconds.`,
      });
      return;
    }

    const cfg = getAuthConfig();
    const passcode = String((req.body as { passcode?: string })?.passcode || '').trim();
    const envPasscode = process.env.LOCAL_ADMIN_PASSCODE?.trim();

    let valid = false;
    if (envPasscode) {
      const a = Buffer.from(passcode);
      const b = Buffer.from(envPasscode);
      valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    } else if (cfg.passcodeSalt && cfg.passcodeHash) {
      valid = verifySecretHash(passcode, cfg.passcodeSalt, cfg.passcodeHash);
    } else {
      res.status(400).json({ error: 'No local admin passcode configured yet.' });
      return;
    }

    if (!valid) {
      recordLoginFailure(clientKey);
      res.status(401).json({ error: 'Invalid administrator passcode.' });
      return;
    }

    clearLoginFailures(clientKey);
    const token = signSessionToken(cfg.sessionSecret);
    res.setHeader('Set-Cookie', buildSessionCookie(req, token, 7 * 24 * 60 * 60));
    res.json({
      authenticated: true,
      token,
      hasRecoveryKey: Boolean(!envPasscode && cfg.recoverySalt && cfg.recoveryHash),
      envControlled: Boolean(envPasscode),
    });
  });

  app.post('/api/local/recover', (req, res) => {
    const clientKey = getClientKey(req);
    const waitSeconds = getRateLimitRemainingSeconds(clientKey);
    if (waitSeconds > 0) {
      res.setHeader('Retry-After', String(waitSeconds));
      res.status(429).json({
        error: `Too many failed attempts. Try again in ${waitSeconds} seconds.`,
      });
      return;
    }

    if (process.env.LOCAL_ADMIN_PASSCODE?.trim()) {
      res.status(403).json({
        error: 'Passcode is managed via server environment secret (LOCAL_ADMIN_PASSCODE).',
      });
      return;
    }

    const cfg = getAuthConfig();
    if (!cfg.recoverySalt || !cfg.recoveryHash) {
      res.status(400).json({ error: 'No recovery key has been generated for this server yet.' });
      return;
    }

    const body = req.body as { recoveryKey?: string; newPasscode?: string };
    const candidateKey = normalizeRecoveryKey(String(body?.recoveryKey || ''));
    const newPasscode = String(body?.newPasscode || '').trim();

    if (candidateKey.length < 8) {
      res.status(400).json({ error: 'Enter your full recovery key (e.g., JSM-XXXX-XXXX).' });
      return;
    }
    if (newPasscode.length < 6 || newPasscode.length > 64) {
      res.status(400).json({ error: 'New passcode must be between 6 and 64 characters.' });
      return;
    }

    if (!verifySecretHash(candidateKey, cfg.recoverySalt, cfg.recoveryHash)) {
      recordLoginFailure(clientKey);
      res.status(401).json({ error: 'Invalid recovery key.' });
      return;
    }

    clearLoginFailures(clientKey);
    const nextSalt = crypto.randomBytes(16).toString('hex');
    const nextHash = hashSecretValue(newPasscode, nextSalt);
    const nextRecoveryKey = generateRecoveryKey();
    const nextRecoverySalt = crypto.randomBytes(16).toString('hex');
    const nextRecoveryHash = hashSecretValue(
      normalizeRecoveryKey(nextRecoveryKey),
      nextRecoverySalt
    );

    cfg.passcodeSalt = nextSalt;
    cfg.passcodeHash = nextHash;
    cfg.recoverySalt = nextRecoverySalt;
    cfg.recoveryHash = nextRecoveryHash;
    saveAuthConfig(cfg);

    const token = signSessionToken(cfg.sessionSecret);
    res.setHeader('Set-Cookie', buildSessionCookie(req, token, 7 * 24 * 60 * 60));
    res.json({
      authenticated: true,
      token,
      recoveryKey: nextRecoveryKey,
      hasRecoveryKey: true,
    });
  });

  app.post('/api/local/passcode/change', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    if (process.env.LOCAL_ADMIN_PASSCODE?.trim()) {
      res.status(403).json({
        error: 'Passcode is controlled by LOCAL_ADMIN_PASSCODE environment variable.',
      });
      return;
    }

    const cfg = getAuthConfig();
    const body = req.body as { currentPasscode?: string; newPasscode?: string };
    const currentPasscode = String(body?.currentPasscode || '').trim();
    const newPasscode = String(body?.newPasscode || '').trim();

    if (!cfg.passcodeSalt || !cfg.passcodeHash) {
      res.status(400).json({ error: 'No local passcode configured.' });
      return;
    }
    if (!verifySecretHash(currentPasscode, cfg.passcodeSalt, cfg.passcodeHash)) {
      res.status(401).json({ error: 'Current passcode is incorrect.' });
      return;
    }
    if (newPasscode.length < 6 || newPasscode.length > 64) {
      res.status(400).json({ error: 'New passcode must be between 6 and 64 characters.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    cfg.passcodeSalt = salt;
    cfg.passcodeHash = hashSecretValue(newPasscode, salt);
    saveAuthConfig(cfg);

    const token = signSessionToken(cfg.sessionSecret);
    res.setHeader('Set-Cookie', buildSessionCookie(req, token, 7 * 24 * 60 * 60));
    res.json({ updated: true, token });
  });

  app.post('/api/local/recovery/rotate', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    if (process.env.LOCAL_ADMIN_PASSCODE?.trim()) {
      res.status(403).json({
        error: 'Passcode is controlled by LOCAL_ADMIN_PASSCODE environment variable.',
      });
      return;
    }
    const cfg = getAuthConfig();
    const recoveryKey = generateRecoveryKey();
    const recoverySalt = crypto.randomBytes(16).toString('hex');
    cfg.recoverySalt = recoverySalt;
    cfg.recoveryHash = hashSecretValue(normalizeRecoveryKey(recoveryKey), recoverySalt);
    saveAuthConfig(cfg);
    res.json({ recoveryKey, hasRecoveryKey: true });
  });

  app.post('/api/local/logout', (req, res) => {
    res.setHeader('Set-Cookie', buildSessionCookie(req, '', 0));
    res.json({ authenticated: false });
  });

  // --- Standalone Local Mode Portfolio & Admin CRUD ---
  app.get('/api/local/portfolio', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const store = readStore();
    res.json({
      projects: store.projects
        .filter((p) => p.status === 'published')
        .sort((a, b) => b.createdAtMs - a.createdAtMs),
      testimonials: store.testimonials
        .filter((t) => t.status === 'published')
        .sort((a, b) => b.createdAtMs - a.createdAtMs),
      profile: store.profile ?? null,
      siteImages: store.siteImages ?? {},
    });
  });

  app.post('/api/local/inquiries', (req, res) => {
    const b = req.body as Partial<LocalInquiry>;
    const name = String(b.name || '').trim().slice(0, 100);
    const phone = String(b.phone || '').trim().slice(0, 30);
    const email = String(b.email || '').trim().slice(0, 120);
    const serviceType = String(b.serviceType || 'General Inquiry').trim().slice(0, 80);
    const message = String(b.message || '').trim().slice(0, 2000);

    if (name.length < 2 || phone.length < 6 || !email.includes('@') || message.length < 10) {
      res.status(400).json({ error: 'Please complete all required inquiry fields.' });
      return;
    }

    const store = readStore();
    const now = Date.now();
    const record: LocalInquiry = {
      id: `local_inq_${now}_${crypto.randomBytes(4).toString('hex')}`,
      name,
      phone,
      email,
      serviceType,
      message,
      status: 'new',
      createdAtMs: now,
      updatedAtMs: now,
    };
    store.inquiries.unshift(record);
    writeStore(store);
    res.status(201).json(record);
  });

  app.get('/api/local/admin/data', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const store = readStore();
    res.json({
      projects: [...store.projects].sort((a, b) => b.createdAtMs - a.createdAtMs),
      testimonials: [...store.testimonials].sort((a, b) => b.createdAtMs - a.createdAtMs),
      inquiries: [...store.inquiries].sort((a, b) => b.createdAtMs - a.createdAtMs),
      profile: store.profile ?? null,
      siteImages: store.siteImages ?? {},
    });
  });

  app.post('/api/local/projects', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const b = req.body as Partial<LocalProject>;
    const title = String(b.title || '').trim().slice(0, 120);
    const description = String(b.description || '').trim().slice(0, 2000);
    const category = String(b.category || '').trim();
    const rawUrls = Array.isArray(b.imageUrls) ? b.imageUrls.slice(0, 12).map(String) : [];
    const rawPaths = Array.isArray(b.storagePaths)
      ? b.storagePaths.slice(0, 12).map(String)
      : rawUrls.map(() => 'external');

    if (rawUrls.some((u) => !isSafeImageUrl(u))) {
      res.status(400).json({ error: 'Invalid image URL protocol.' });
      return;
    }
    const imageUrls = rawUrls;
    const storagePaths = rawPaths.slice(0, imageUrls.length);

    if (title.length < 3 || description.length < 10 || !category) {
      res.status(400).json({ error: 'Invalid project details.' });
      return;
    }

    const store = readStore();
    const now = Date.now();
    const record: LocalProject = {
      id: b.id && /^[a-zA-Z0-9_-]{3,128}$/.test(b.id)
        ? b.id
        : `local_proj_${now}_${crypto.randomBytes(4).toString('hex')}`,
      title,
      description,
      category,
      location: String(b.location || '').trim().slice(0, 120),
      completionYear: String(b.completionYear || '').trim().slice(0, 10),
      imageUrls,
      storagePaths,
      photoAppearance: sanitizePhotoAppearance(b.photoAppearance),
      status: b.status === 'published' ? 'published' : 'draft',
      authorId: 'local-admin',
      createdAtMs: now,
      updatedAtMs: now,
    };
    store.projects.unshift(record);
    writeStore(store);
    res.status(201).json(record);
  });

  app.put('/api/local/projects/:id', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const store = readStore();
    const idx = store.projects.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    const b = req.body as Partial<LocalProject>;
    const existing = store.projects[idx];
    const nextUrls = Array.isArray(b.imageUrls)
      ? b.imageUrls.slice(0, 12).map(String)
      : existing.imageUrls;
    if (nextUrls.some((u) => !isSafeImageUrl(u))) {
      res.status(400).json({ error: 'Invalid image URL protocol.' });
      return;
    }
    const next: LocalProject = {
      ...existing,
      title: b.title !== undefined ? String(b.title).trim().slice(0, 120) : existing.title,
      description:
        b.description !== undefined
          ? String(b.description).trim().slice(0, 2000)
          : existing.description,
      category: b.category !== undefined ? String(b.category).trim() : existing.category,
      location:
        b.location !== undefined ? String(b.location).trim().slice(0, 120) : existing.location,
      completionYear:
        b.completionYear !== undefined
          ? String(b.completionYear).trim().slice(0, 10)
          : existing.completionYear,
      imageUrls: nextUrls,
      storagePaths: Array.isArray(b.storagePaths)
        ? b.storagePaths.slice(0, nextUrls.length).map(String)
        : existing.storagePaths,
      photoAppearance:
        b.photoAppearance !== undefined
          ? sanitizePhotoAppearance(b.photoAppearance)
          : existing.photoAppearance,
      status: b.status === 'published' || b.status === 'draft' ? b.status : existing.status,
      updatedAtMs: Date.now(),
    };
    store.projects[idx] = next;
    writeStore(store);
    res.json(next);
  });

  app.delete('/api/local/projects/:id', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const store = readStore();
    const target = store.projects.find((p) => p.id === req.params.id);
    if (target) {
      for (const sp of target.storagePaths || []) {
        if (sp.startsWith('local:')) {
          const fname = sp.slice(6);
          const resolved = path.resolve(UPLOADS_DIR, fname);
          if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
            fs.unlinkSync(resolved);
          }
        }
      }
      store.projects = store.projects.filter((p) => p.id !== req.params.id);
      writeStore(store);
    }
    res.json({ deleted: true });
  });

  app.post('/api/local/testimonials', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const b = req.body as Partial<LocalTestimonial>;
    const store = readStore();
    const now = Date.now();
    const record: LocalTestimonial = {
      id: `local_rev_${now}_${crypto.randomBytes(4).toString('hex')}`,
      clientName: String(b.clientName || '').trim().slice(0, 100),
      clientRole: String(b.clientRole || '').trim().slice(0, 120),
      projectType: String(b.projectType || '').trim().slice(0, 80),
      quote: String(b.quote || '').trim().slice(0, 1000),
      rating: Math.max(1, Math.min(5, Math.round(Number(b.rating || 5)))),
      status: b.status === 'hidden' ? 'hidden' : 'published',
      authorId: 'local-admin',
      createdAtMs: now,
      updatedAtMs: now,
    };
    store.testimonials.unshift(record);
    writeStore(store);
    res.status(201).json(record);
  });

  app.put('/api/local/testimonials/:id', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const store = readStore();
    const idx = store.testimonials.findIndex((t) => t.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Testimonial not found.' });
      return;
    }
    const b = req.body as Partial<LocalTestimonial>;
    const existing = store.testimonials[idx];
    const next: LocalTestimonial = {
      ...existing,
      clientName: b.clientName !== undefined ? String(b.clientName).trim().slice(0, 100) : existing.clientName,
      clientRole: b.clientRole !== undefined ? String(b.clientRole).trim().slice(0, 120) : existing.clientRole,
      projectType: b.projectType !== undefined ? String(b.projectType).trim().slice(0, 80) : existing.projectType,
      quote: b.quote !== undefined ? String(b.quote).trim().slice(0, 1000) : existing.quote,
      rating: b.rating !== undefined ? Math.max(1, Math.min(5, Math.round(Number(b.rating)))) : existing.rating,
      status: b.status === 'hidden' || b.status === 'published' ? b.status : existing.status,
      updatedAtMs: Date.now(),
    };
    store.testimonials[idx] = next;
    writeStore(store);
    res.json(next);
  });

  app.delete('/api/local/testimonials/:id', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const store = readStore();
    store.testimonials = store.testimonials.filter((t) => t.id !== req.params.id);
    writeStore(store);
    res.json({ deleted: true });
  });

  app.put('/api/local/inquiries/:id', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const store = readStore();
    const idx = store.inquiries.findIndex((i) => i.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Inquiry not found.' });
      return;
    }
    const status = (req.body as { status?: string })?.status;
    if (status === 'new' || status === 'reviewed' || status === 'archived') {
      store.inquiries[idx].status = status;
      store.inquiries[idx].updatedAtMs = Date.now();
      writeStore(store);
    }
    res.json(store.inquiries[idx]);
  });

  app.delete('/api/local/inquiries/:id', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const store = readStore();
    store.inquiries = store.inquiries.filter((i) => i.id !== req.params.id);
    writeStore(store);
    res.json({ deleted: true });
  });

  app.put('/api/local/profile', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const b = req.body as Partial<LocalSiteProfile> & { removedStoragePath?: string };
    const displayName = String(b.displayName || '').trim().slice(0, 100);
    const title = String(b.title || '').trim().slice(0, 120);
    const headline = String(b.headline || '').trim().slice(0, 160);
    const description = String(b.description || '').trim().slice(0, 2500);
    const avatarUrl = String(b.avatarUrl || '').trim().slice(0, 350000);
    const avatarStoragePath = String(b.avatarStoragePath || 'default').trim().slice(0, 512);

    if (
      displayName.length < 2 ||
      title.length < 2 ||
      headline.length < 5 ||
      description.length < 20
    ) {
      res.status(400).json({ error: 'Please complete all required profile fields.' });
      return;
    }
    if (avatarUrl !== '' && !isSafeImageUrl(avatarUrl)) {
      res.status(400).json({ error: 'Invalid profile image URL format.' });
      return;
    }

    const store = readStore();
    const prevStoragePath = store.profile?.avatarStoragePath;
    const nextProfile: LocalSiteProfile = {
      displayName,
      title,
      headline,
      description,
      avatarUrl,
      avatarStoragePath: avatarUrl ? avatarStoragePath || 'external' : 'default',
      updatedAtMs: Date.now(),
    };

    const cleanupPaths = new Set<string>();
    if (b.removedStoragePath && b.removedStoragePath.startsWith('local:')) {
      cleanupPaths.add(b.removedStoragePath);
    }
    if (
      prevStoragePath &&
      prevStoragePath.startsWith('local:') &&
      prevStoragePath !== nextProfile.avatarStoragePath
    ) {
      cleanupPaths.add(prevStoragePath);
    }
    for (const sp of cleanupPaths) {
      const fname = sp.slice(6);
      const resolved = path.resolve(UPLOADS_DIR, fname);
      if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    }

    store.profile = nextProfile;
    writeStore(store);
    res.json(nextProfile);
  });

  app.delete('/api/local/profile', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const store = readStore();
    const prevStoragePath = store.profile?.avatarStoragePath;
    if (prevStoragePath && prevStoragePath.startsWith('local:')) {
      const fname = prevStoragePath.slice(6);
      const resolved = path.resolve(UPLOADS_DIR, fname);
      if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    }
    store.profile = null;
    writeStore(store);
    res.json({ reset: true });
  });

  app.put('/api/local/site-images/:slot', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const rawSlot = req.params.slot;
    if (!ALLOWED_SITE_IMAGE_SLOTS.includes(rawSlot as LocalSiteImageSlot)) {
      res.status(400).json({ error: 'Invalid site image slot.' });
      return;
    }
    const slot = rawSlot as LocalSiteImageSlot;
    const b = req.body as Partial<LocalSiteImage> & { removedStoragePath?: string };
    const imageUrl = String(b.imageUrl || '').trim().slice(0, 350000);
    const storagePath = String(b.storagePath || 'external').trim().slice(0, 512);
    const caption = String(b.caption || '').trim().slice(0, 160);

    if (!imageUrl || !isSafeImageUrl(imageUrl)) {
      res.status(400).json({ error: 'Please provide a valid image file or URL.' });
      return;
    }

    const store = readStore();
    const prevStoragePath = store.siteImages?.[slot]?.storagePath;
    const record: LocalSiteImage = {
      slot,
      imageUrl,
      storagePath: storagePath || 'external',
      caption,
      updatedAtMs: Date.now(),
    };

    const cleanupPaths = new Set<string>();
    if (b.removedStoragePath && b.removedStoragePath.startsWith('local:')) {
      cleanupPaths.add(b.removedStoragePath);
    }
    if (
      prevStoragePath &&
      prevStoragePath.startsWith('local:') &&
      prevStoragePath !== record.storagePath
    ) {
      cleanupPaths.add(prevStoragePath);
    }
    for (const sp of cleanupPaths) {
      const fname = sp.slice(6);
      const resolved = path.resolve(UPLOADS_DIR, fname);
      if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    }

    store.siteImages = {
      ...(store.siteImages ?? {}),
      [slot]: record,
    };
    writeStore(store);
    res.json(record);
  });

  app.delete('/api/local/site-images/:slot', async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const rawSlot = req.params.slot;
    if (!ALLOWED_SITE_IMAGE_SLOTS.includes(rawSlot as LocalSiteImageSlot)) {
      res.status(400).json({ error: 'Invalid site image slot.' });
      return;
    }
    const slot = rawSlot as LocalSiteImageSlot;
    const store = readStore();
    const prevStoragePath = store.siteImages?.[slot]?.storagePath;
    if (prevStoragePath && prevStoragePath.startsWith('local:')) {
      const fname = prevStoragePath.slice(6);
      const resolved = path.resolve(UPLOADS_DIR, fname);
      if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    }
    if (store.siteImages && slot in store.siteImages) {
      const nextImages = { ...store.siteImages };
      delete nextImages[slot];
      store.siteImages = nextImages;
      writeStore(store);
    }
    res.json({ deleted: true });
  });

  // Crawler blocking for the private Admin Console URL & API routes
  const CANONICAL_ORIGIN = 'https://jostec-construction.vercel.app';
  const SITEMAP_PATHS = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/services', changefreq: 'weekly', priority: '0.9' },
    { path: '/projects', changefreq: 'daily', priority: '0.9' },
    { path: '/about', changefreq: 'monthly', priority: '0.8' },
    { path: '/reviews', changefreq: 'weekly', priority: '0.7' },
    { path: '/contact', changefreq: 'monthly', priority: '0.8' },
  ];

  app.get('/robots.txt', (_req, res) => {
    const disallowAdmin =
      normalizedAdminPath === '/admin'
        ? 'Disallow: /admin\nDisallow: /admin/'
        : `Disallow: /admin\nDisallow: /admin/\nDisallow: ${normalizedAdminPath}\nDisallow: ${normalizedAdminPath}/`;
    res
      .type('text/plain; charset=utf-8')
      .set('Cache-Control', 'public, max-age=3600')
      .send(
        `User-agent: *\nAllow: /\n${disallowAdmin}\nDisallow: /api/\n\nSitemap: ${CANONICAL_ORIGIN}/sitemap.xml\n`
      );
  });

  app.get('/sitemap.xml', (_req, res) => {
    const lastmod = new Date().toISOString().slice(0, 10);
    const urlsXml = SITEMAP_PATHS.map(
      (u) =>
        `  <url>\n    <loc>${CANONICAL_ORIGIN}${u.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    ).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>\n`;
    res
      .type('application/xml; charset=utf-8')
      .set('Cache-Control', 'public, max-age=3600')
      .send(xml);
  });

  // --- Vite Dev Middleware or Static Production Assets ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        maxAge: '7d',
      })
    );
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
