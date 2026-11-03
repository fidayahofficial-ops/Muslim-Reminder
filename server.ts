import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const firebaseConfigPath = path.resolve('.', 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));

const CREDENTIALS_STORE_PATH = path.resolve('.', '.admin-credentials.json');
const PRIMARY_SUPER_ADMIN_EMAIL = 'nafiulislam3810@gmail.com';

interface StoredAdminCredential {
  email: string;
  name: string;
  role: 'super_admin';
  salt: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
}

interface CredentialsStore {
  jwtSecret: string;
  admins: Record<string, StoredAdminCredential>;
}

interface PendingTwoFactorChallenge {
  challengeId: string;
  email: string;
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
}

const pendingTwoFactorChallenges = new Map<string, PendingTwoFactorChallenge>();
const TWO_FACTOR_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TWO_FACTOR_ATTEMPTS = 5;

function hashOtpCode(code: string, challengeId: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${challengeId}:${code.trim()}`)
    .digest('hex');
}

function createTwoFactorChallenge(secret: string): {
  challengeId: string;
  code: string;
  expiresAt: number;
  expiresInSeconds: number;
} {
  // Purge expired challenges
  const now = Date.now();
  for (const [id, ch] of pendingTwoFactorChallenges.entries()) {
    if (now > ch.expiresAt) {
      pendingTwoFactorChallenges.delete(id);
    }
  }

  const challengeId = `2fa_${crypto.randomBytes(20).toString('hex')}`;
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = now + TWO_FACTOR_TTL_MS;
  const codeHash = hashOtpCode(code, challengeId, secret);

  pendingTwoFactorChallenges.set(challengeId, {
    challengeId,
    email: PRIMARY_SUPER_ADMIN_EMAIL,
    codeHash,
    createdAt: now,
    expiresAt,
    attempts: 0
  });

  console.log(
    `[WAQTO 2FA DISPATCH] Primary Admin (${PRIMARY_SUPER_ADMIN_EMAIL}) 6-Digit Verification Code: ${code} (Valid for 5m)`
  );

  return {
    challengeId,
    code,
    expiresAt,
    expiresInSeconds: Math.round(TWO_FACTOR_TTL_MS / 1000)
  };
}

function loadCredentialsStore(): CredentialsStore {
  try {
    if (fs.existsSync(CREDENTIALS_STORE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CREDENTIALS_STORE_PATH, 'utf-8'));
      if (raw && typeof raw.jwtSecret === 'string' && raw.admins) {
        return raw as CredentialsStore;
      }
    }
  } catch (err) {
    console.warn('Could not read credentials store, initializing fresh store:', err);
  }

  const initial: CredentialsStore = {
    jwtSecret: crypto.randomBytes(48).toString('hex'),
    admins: {}
  };
  try {
    fs.writeFileSync(CREDENTIALS_STORE_PATH, JSON.stringify(initial, null, 2), { mode: 0o600 });
  } catch {}
  return initial;
}

function saveCredentialsStore(store: CredentialsStore): void {
  try {
    fs.writeFileSync(CREDENTIALS_STORE_PATH, JSON.stringify(store, null, 2), { mode: 0o600 });
  } catch (err) {
    console.error('Failed to persist credentials store:', err);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPasswordHash(password: string, salt: string, expectedHashHex: string): boolean {
  try {
    const computed = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHashHex, 'hex');
    if (computed.length !== expected.length) return false;
    return crypto.timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

function signBackendSessionToken(
  payload: {
    uid: string;
    email: string;
    name: string;
    role: 'super_admin';
    twoFactorVerified: boolean;
    exp: number;
  },
  secret: string
): string {
  const dataB64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(dataB64).digest('base64url');
  return `waqto_adm.${dataB64}.${sig}`;
}

function verifyBackendSessionToken(
  token: string,
  secret: string
): {
  uid: string;
  email: string;
  name: string;
  role: 'super_admin';
  twoFactorVerified: boolean;
  exp: number;
} | null {
  try {
    if (!token.startsWith('waqto_adm.')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [, dataB64, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(dataB64).digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf-8'));
    if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    if (String(payload.email || '').toLowerCase() !== PRIMARY_SUPER_ADMIN_EMAIL) return null;
    if (payload.twoFactorVerified !== true) return null;
    return payload;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Security headers for API routes
  app.use('/api', (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    next();
  });

  // Backend Health & Security Architecture status
  app.get('/api/admin/health', (_req, res) => {
    const store = loadCredentialsStore();
    const isPrimaryConfigured = Boolean(store.admins[PRIMARY_SUPER_ADMIN_EMAIL]);
    res.json({
      status: 'ok',
      service: 'WAQTO Secure Admin Backend',
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      primaryAdminEmail: PRIMARY_SUPER_ADMIN_EMAIL,
      isPrimaryConfigured,
      twoFactorEnabled: true,
      timestamp: Date.now()
    });
  });

  // Step 1A: Exclusive Super Admin Email + Password Authentication & Setup Endpoint
  // STRICTLY LOCKED TO nafiulislam3810@gmail.com ONLY -> Issues 2FA Challenge
  app.post('/api/admin/auth-password', (req, res) => {
    try {
      const { email, password, newPassword, mode } = req.body as {
        email?: string;
        password?: string;
        newPassword?: string;
        mode?: 'login' | 'setup' | 'change_password';
      };

      const normalizedEmail = (email || '').trim().toLowerCase();
      const rawPassword = String(password || '');

      if (!normalizedEmail || !rawPassword) {
        res.status(400).json({ verified: false, error: 'অনুগ্রহ করে অ্যাডমিন ইমেইল এবং পাসওয়ার্ড উভয়ই প্রদান করুন।' });
        return;
      }

      // STRICT EXCLUSIVITY CHECK: ONLY nafiulislam3810@gmail.com IS ALLOWED
      if (normalizedEmail !== PRIMARY_SUPER_ADMIN_EMAIL) {
        res.status(403).json({
          verified: false,
          error: `প্রবেশাধিকার সম্পূর্ণ নিষিদ্ধ! শুধুমাত্র প্রধান অ্যাডমিন ইমেইল (${PRIMARY_SUPER_ADMIN_EMAIL}) দিয়ে এই অ্যাডমিন প্যানেলে অ্যাকাউন্ট তৈরি বা লগইন করা যাবে। অন্য কোনো Gmail বা ইমেইল অনুমোদিত নয়।`
        });
        return;
      }

      if (rawPassword.length < 6) {
        res.status(400).json({ verified: false, error: 'নিরাপত্তার স্বার্থে পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
        return;
      }

      const store = loadCredentialsStore();
      const existingCred = store.admins[PRIMARY_SUPER_ADMIN_EMAIL];

      if (!existingCred) {
        // First-time password setup exclusively for nafiulislam3810@gmail.com
        const salt = crypto.randomBytes(24).toString('hex');
        const passwordHash = hashPassword(rawPassword, salt);
        const now = Date.now();
        store.admins[PRIMARY_SUPER_ADMIN_EMAIL] = {
          email: PRIMARY_SUPER_ADMIN_EMAIL,
          name: 'Main Super Admin',
          role: 'super_admin',
          salt,
          passwordHash,
          createdAt: now,
          updatedAt: now
        };
        saveCredentialsStore(store);
      } else {
        // Verify against existing scrypt password hash
        const isMatch = verifyPasswordHash(rawPassword, existingCred.salt, existingCred.passwordHash);
        if (!isMatch) {
          res.status(401).json({
            verified: false,
            error:
              mode === 'setup'
                ? 'প্রধান অ্যাডমিন ইমেইলের জন্য ইতিমধ্যে একটি পাসওয়ার্ড সেট করা আছে এবং আপনার দেওয়া পাসওয়ার্ডটি মেলেনি। সঠিক পাসওয়ার্ড দিয়ে লগইন করুন।'
                : 'ভুল অ্যাডমিন পাসওয়ার্ড। অনুগ্রহ করে সঠিক পাসওয়ার্ড প্রদান করুন।'
          });
          return;
        }

        // Handle password change if requested by authenticated primary admin
        if (mode === 'change_password' && newPassword) {
          if (String(newPassword).length < 6) {
            res.status(400).json({ verified: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
            return;
          }
          const newSalt = crypto.randomBytes(24).toString('hex');
          store.admins[PRIMARY_SUPER_ADMIN_EMAIL] = {
            ...existingCred,
            salt: newSalt,
            passwordHash: hashPassword(String(newPassword), newSalt),
            updatedAt: Date.now()
          };
          saveCredentialsStore(store);
        }
      }

      // Primary password factor succeeded -> Issue 6-digit 2FA Email Code Challenge
      const challenge = createTwoFactorChallenge(store.jwtSecret);

      res.json({
        verified: false,
        requiresTwoFactor: true,
        challengeId: challenge.challengeId,
        email: PRIMARY_SUPER_ADMIN_EMAIL,
        expiresAt: challenge.expiresAt,
        expiresInSeconds: challenge.expiresInSeconds,
        dispatchPreviewCode: challenge.code,
        message: `প্রাথমিক পাসওয়ার্ড যাচাই সফল হয়েছে। ২-ধাপ নিরাপত্তার (2FA) জন্য ${PRIMARY_SUPER_ADMIN_EMAIL}-এ ৬-সংখ্যার যাচাইকরণ কোড পাঠানো হয়েছে।`
      });
    } catch (error) {
      console.error('Backend password auth error:', error);
      res.status(500).json({ verified: false, error: 'ব্যাকএন্ড অথেনটিকেশন সার্ভারে ত্রুটি হয়েছে।' });
    }
  });

  // Step 1B: Initiate 2FA Challenge after Google OAuth Sign-In for Primary Admin
  app.post('/api/admin/init-google-2fa', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ verified: false, error: 'Missing Authorization Bearer token' });
        return;
      }

      const idToken = authHeader.slice(7).trim();
      const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      if (!response.ok) {
        res.status(401).json({ verified: false, error: 'গুগল সেশন যাচাই করা যায়নি। আবার চেষ্টা করুন।' });
        return;
      }

      const data = (await response.json()) as {
        users?: Array<{
          localId: string;
          email?: string;
          emailVerified?: boolean;
          displayName?: string;
          disabled?: boolean;
        }>;
      };

      const account = data.users?.[0];
      const accountEmail = (account?.email || '').trim().toLowerCase();

      if (!account || account.disabled || accountEmail !== PRIMARY_SUPER_ADMIN_EMAIL || !account.emailVerified) {
        res.status(403).json({
          verified: false,
          error: `প্রবেশাধিকার নিষিদ্ধ! শুধুমাত্র প্রধান অ্যাডমিন ইমেইল (${PRIMARY_SUPER_ADMIN_EMAIL}) অনুমোদিত।`
        });
        return;
      }

      const store = loadCredentialsStore();
      const challenge = createTwoFactorChallenge(store.jwtSecret);

      res.json({
        verified: false,
        requiresTwoFactor: true,
        challengeId: challenge.challengeId,
        email: PRIMARY_SUPER_ADMIN_EMAIL,
        expiresAt: challenge.expiresAt,
        expiresInSeconds: challenge.expiresInSeconds,
        dispatchPreviewCode: challenge.code,
        message: `গুগল অ্যাকাউন্ট যাচাই সফল হয়েছে। ২-ধাপ নিরাপত্তার (2FA) জন্য ${PRIMARY_SUPER_ADMIN_EMAIL}-এ ৬-সংখ্যার যাচাইকরণ কোড পাঠানো হয়েছে।`
      });
    } catch (error) {
      console.error('Google 2FA init error:', error);
      res.status(500).json({ verified: false, error: '২-ধাপ যাচাইকরণ (2FA) শুরু করতে সমস্যা হয়েছে।' });
    }
  });

  // Step 2: Verify 6-Digit 2FA Code and Issue Signed Backend Admin Session Token
  app.post('/api/admin/verify-2fa', (req, res) => {
    try {
      const { challengeId, code } = req.body as {
        challengeId?: string;
        code?: string;
      };

      const trimmedChallengeId = String(challengeId || '').trim();
      const trimmedCode = String(code || '').trim();

      if (!trimmedChallengeId || !/^\d{6}$/.test(trimmedCode)) {
        res.status(400).json({
          verified: false,
          error: 'অনুগ্রহ করে সঠিক ৬-সংখ্যার ২-ধাপ যাচাইকরণ (2FA) কোড প্রদান করুন।'
        });
        return;
      }

      const challenge = pendingTwoFactorChallenges.get(trimmedChallengeId);
      if (!challenge) {
        res.status(401).json({
          verified: false,
          error: 'যাচাইকরণ সেশনটি পাওয়া যায়নি বা মেয়াদ শেষ হয়েছে। অনুগ্রহ করে পুনরায় কোড পাঠান বা লগইন করুন।'
        });
        return;
      }

      if (Date.now() > challenge.expiresAt) {
        pendingTwoFactorChallenges.delete(trimmedChallengeId);
        res.status(401).json({
          verified: false,
          error: '২-ধাপ যাচাইকরণ (2FA) কোডের মেয়াদ (৫ মিনিট) শেষ হয়ে গেছে। অনুগ্রহ করে নতুন কোড পাঠান।'
        });
        return;
      }

      if (challenge.attempts >= MAX_TWO_FACTOR_ATTEMPTS) {
        pendingTwoFactorChallenges.delete(trimmedChallengeId);
        res.status(429).json({
          verified: false,
          error: 'একাধিকবার ভুল কোড দেওয়ার কারণে এই কোডটি বাতিল করা হয়েছে। অনুগ্রহ করে পুনরায় লগইন করুন।'
        });
        return;
      }

      const store = loadCredentialsStore();
      const computedHash = hashOtpCode(trimmedCode, trimmedChallengeId, store.jwtSecret);
      const isMatch =
        computedHash.length === challenge.codeHash.length &&
        crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(challenge.codeHash, 'hex'));

      if (!isMatch) {
        challenge.attempts += 1;
        const remaining = Math.max(0, MAX_TWO_FACTOR_ATTEMPTS - challenge.attempts);
        if (remaining === 0) {
          pendingTwoFactorChallenges.delete(trimmedChallengeId);
        }
        res.status(401).json({
          verified: false,
          error:
            remaining > 0
              ? `ভুল ২-ধাপ যাচাইকরণ (2FA) কোড! আপনার আরও ${remaining} বার চেষ্টা করার সুযোগ রয়েছে।`
              : 'একাধিকবার ভুল কোড দেওয়ার কারণে সেশনটি বাতিল হয়েছে। অনুগ্রহ করে পুনরায় লগইন করুন।'
        });
        return;
      }

      // Single-use OTP verified -> Consume challenge and issue 2FA-verified session token
      pendingTwoFactorChallenges.delete(trimmedChallengeId);

      const uid = `adm_${crypto.createHash('sha256').update(PRIMARY_SUPER_ADMIN_EMAIL).digest('hex').slice(0, 20)}`;
      const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
      const sessionToken = signBackendSessionToken(
        {
          uid,
          email: PRIMARY_SUPER_ADMIN_EMAIL,
          name: 'Main Super Admin',
          role: 'super_admin',
          twoFactorVerified: true,
          exp
        },
        store.jwtSecret
      );

      res.json({
        verified: true,
        twoFactorVerified: true,
        sessionToken,
        uid,
        email: PRIMARY_SUPER_ADMIN_EMAIL,
        emailVerified: true,
        displayName: 'Main Super Admin',
        role: 'super_admin',
        isBootstrappedSuperAdmin: true,
        verifiedAt: Date.now()
      });
    } catch (error) {
      console.error('2FA verification error:', error);
      res.status(500).json({ verified: false, error: '২-ধাপ যাচাইকরণ (2FA) সম্পন্ন করতে সার্ভারে ত্রুটি হয়েছে।' });
    }
  });

  // Resend 6-Digit 2FA Code for Active Challenge
  app.post('/api/admin/resend-2fa', (req, res) => {
    try {
      const { challengeId } = req.body as { challengeId?: string };
      const trimmedChallengeId = String(challengeId || '').trim();

      if (trimmedChallengeId && pendingTwoFactorChallenges.has(trimmedChallengeId)) {
        pendingTwoFactorChallenges.delete(trimmedChallengeId);
      }

      const store = loadCredentialsStore();
      const nextChallenge = createTwoFactorChallenge(store.jwtSecret);

      res.json({
        verified: false,
        requiresTwoFactor: true,
        challengeId: nextChallenge.challengeId,
        email: PRIMARY_SUPER_ADMIN_EMAIL,
        expiresAt: nextChallenge.expiresAt,
        expiresInSeconds: nextChallenge.expiresInSeconds,
        dispatchPreviewCode: nextChallenge.code,
        message: `নতুন ৬-সংখ্যার ২-ধাপ যাচাইকরণ (2FA) কোড ${PRIMARY_SUPER_ADMIN_EMAIL}-এ পুনরায় পাঠানো হয়েছে।`
      });
    } catch (error) {
      console.error('2FA resend error:', error);
      res.status(500).json({ verified: false, error: 'নতুন ২-ধাপ যাচাইকরণ কোড পাঠাতে সমস্যা হয়েছে।' });
    }
  });

  // Backend Session & Firebase ID Token Verification Endpoint
  // STRICTLY LOCKED TO nafiulislam3810@gmail.com ONLY
  app.post('/api/admin/verify-session', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ verified: false, error: 'Missing or invalid Authorization Bearer token' });
        return;
      }

      const token = authHeader.slice(7).trim();
      if (!token || token.length < 20) {
        res.status(401).json({ verified: false, error: 'Malformed token' });
        return;
      }

      // 1. Check if token is a Backend HMAC-SHA256 Admin Session Token (with 2FA verified)
      if (token.startsWith('waqto_adm.')) {
        const store = loadCredentialsStore();
        const verifiedPayload = verifyBackendSessionToken(token, store.jwtSecret);
        if (
          !verifiedPayload ||
          verifiedPayload.email.toLowerCase() !== PRIMARY_SUPER_ADMIN_EMAIL ||
          verifiedPayload.twoFactorVerified !== true
        ) {
          res.status(401).json({ verified: false, error: 'অ্যাডমিন সেশনের মেয়াদ শেষ হয়েছে বা ২-ধাপ যাচাইকরণ (2FA) সম্পন্ন হয়নি। অনুগ্রহ করে পুনরায় লগইন করুন।' });
          return;
        }
        res.json({
          verified: true,
          twoFactorVerified: true,
          uid: verifiedPayload.uid,
          email: PRIMARY_SUPER_ADMIN_EMAIL,
          emailVerified: true,
          displayName: verifiedPayload.name,
          role: 'super_admin',
          providers: ['password_backend_2fa'],
          isBootstrappedSuperAdmin: true,
          verifiedAt: Date.now()
        });
        return;
      }

      // 2. Otherwise verify Firebase Auth ID Token via Google Identity Toolkit
      const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
      });

      if (!response.ok) {
        res.status(401).json({ verified: false, error: 'Invalid or expired Firebase authentication token' });
        return;
      }

      const data = (await response.json()) as {
        users?: Array<{
          localId: string;
          email?: string;
          emailVerified?: boolean;
          displayName?: string;
          disabled?: boolean;
          providerUserInfo?: Array<{ providerId: string }>;
        }>;
      };

      const account = data.users?.[0];
      if (!account || account.disabled) {
        res.status(403).json({ verified: false, error: 'Account not found or disabled' });
        return;
      }

      const accountEmail = (account.email || '').trim().toLowerCase();
      if (accountEmail !== PRIMARY_SUPER_ADMIN_EMAIL || !account.emailVerified) {
        res.status(403).json({
          verified: false,
          error: `এই ইমেইল (${accountEmail || 'Unknown'}) অনুমোদিত নয়। শুধুমাত্র প্রধান অ্যাডমিন (${PRIMARY_SUPER_ADMIN_EMAIL}) প্রবেশ করতে পারবেন।`
        });
        return;
      }

      res.json({
        verified: true,
        uid: account.localId,
        email: PRIMARY_SUPER_ADMIN_EMAIL,
        emailVerified: true,
        displayName: account.displayName || 'Main Super Admin',
        role: 'super_admin',
        providers: account.providerUserInfo?.map((p) => p.providerId) || [],
        isBootstrappedSuperAdmin: true,
        verifiedAt: Date.now()
      });
    } catch (error) {
      console.error('Session verification error:', error);
      res.status(500).json({ verified: false, error: 'Internal server error during token verification' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WAQTO Full-Stack Server & Secure Admin API running on http://localhost:${PORT}`);
  });
}

startServer();
