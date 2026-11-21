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

interface LocalProject {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: string;
  completionYear?: string;
  imageUrls: string[];
  storagePaths: string[];
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

interface LocalStore {
  projects: LocalProject[];
  testimonials: LocalTestimonial[];
  inquiries: LocalInquiry[];
}

interface AuthConfig {
  sessionSecret: string;
  passcodeSalt?: string;
  passcodeHash?: string;
}

function readStore(): LocalStore {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return { projects: [], testimonials: [], inquiries: [] };
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials : [],
      inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
    };
  } catch {
    return { projects: [], testimonials: [], inquiries: [] };
  }
}

function writeStore(store: LocalStore): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function getAuthConfig(): AuthConfig {
  try {
    if (fs.existsSync(AUTH_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8')) as AuthConfig;
      if (parsed.sessionSecret) return parsed;
    }
  } catch {
    // Regenerate cleanly below if corrupt
  }
  const fresh: AuthConfig = {
    sessionSecret: crypto.randomBytes(32).toString('hex'),
  };
  fs.writeFileSync(AUTH_PATH, JSON.stringify(fresh, null, 2), 'utf8');
  return fresh;
}

function saveAuthConfig(cfg: AuthConfig): void {
  fs.writeFileSync(AUTH_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

function hashPasscode(passcode: string, salt: string): string {
  return crypto.scryptSync(passcode, salt, 64).toString('hex');
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
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
    return typeof data.exp === 'number' && data.exp > Date.now();
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
  const sameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; ${sameSite}; Max-Age=${maxAgeSeconds}`;
}

function isSafeImageUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/');
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
  const cookies = parseCookies(req.headers.cookie);
  const cfg = getAuthConfig();
  if (verifySessionToken(cookies[SESSION_COOKIE_NAME], cfg.sessionSecret)) {
    return true;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (await verifyFirebaseAdminToken(token)) {
      return true;
    }
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

  // --- Standalone Local Mode Auth (No Firebase Required) ---
  app.get('/api/local/session', (req, res) => {
    const cfg = getAuthConfig();
    const cookies = parseCookies(req.headers.cookie);
    const hasPasscodeConfigured = Boolean(
      process.env.LOCAL_ADMIN_PASSCODE || (cfg.passcodeSalt && cfg.passcodeHash)
    );
    const authenticated = verifySessionToken(cookies[SESSION_COOKIE_NAME], cfg.sessionSecret);
    res.json({
      authenticated,
      hasPasscodeConfigured,
    });
  });

  app.post('/api/local/setup', (req, res) => {
    const cfg = getAuthConfig();
    if (process.env.LOCAL_ADMIN_PASSCODE || (cfg.passcodeSalt && cfg.passcodeHash)) {
      res.status(409).json({ error: 'Local admin passcode is already configured. Please sign in.' });
      return;
    }
    const passcode = String((req.body as { passcode?: string })?.passcode || '').trim();
    if (passcode.length < 6 || passcode.length > 64) {
      res.status(400).json({ error: 'Passcode must be between 6 and 64 characters.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPasscode(passcode, salt);
    cfg.passcodeSalt = salt;
    cfg.passcodeHash = hash;
    saveAuthConfig(cfg);

    const token = signSessionToken(cfg.sessionSecret);
    res.setHeader('Set-Cookie', buildSessionCookie(req, token, 7 * 24 * 60 * 60));
    res.status(201).json({ authenticated: true });
  });

  app.post('/api/local/login', (req, res) => {
    const cfg = getAuthConfig();
    const passcode = String((req.body as { passcode?: string })?.passcode || '').trim();
    const envPasscode = process.env.LOCAL_ADMIN_PASSCODE;

    let valid = false;
    if (envPasscode) {
      const a = Buffer.from(passcode);
      const b = Buffer.from(envPasscode);
      valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    } else if (cfg.passcodeSalt && cfg.passcodeHash) {
      const candidate = hashPasscode(passcode, cfg.passcodeSalt);
      const a = Buffer.from(candidate);
      const b = Buffer.from(cfg.passcodeHash);
      valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    } else {
      res.status(400).json({ error: 'No local admin passcode configured yet.' });
      return;
    }

    if (!valid) {
      res.status(401).json({ error: 'Invalid administrator passcode.' });
      return;
    }

    const token = signSessionToken(cfg.sessionSecret);
    res.setHeader('Set-Cookie', buildSessionCookie(req, token, 7 * 24 * 60 * 60));
    res.json({ authenticated: true });
  });

  app.post('/api/local/logout', (req, res) => {
    res.setHeader('Set-Cookie', buildSessionCookie(req, '', 0));
    res.json({ authenticated: false });
  });

  // --- Standalone Local Mode Portfolio & Admin CRUD ---
  app.get('/api/local/portfolio', (_req, res) => {
    const store = readStore();
    res.json({
      projects: store.projects
        .filter((p) => p.status === 'published')
        .sort((a, b) => b.createdAtMs - a.createdAtMs),
      testimonials: store.testimonials
        .filter((t) => t.status === 'published')
        .sort((a, b) => b.createdAtMs - a.createdAtMs),
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
    app.use(express.static(distDir));
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
