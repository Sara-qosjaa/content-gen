import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cookieParser from 'cookie-parser';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.SETTINGS_PORT || 8787);
const COOKIE_NAME = 'content_gen_user';
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

const dataDirectory = path.join(__dirname, 'data');
if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const dbPath = path.join(dataDirectory, 'app_settings.sqlite');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    settings_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const getSettingsStmt = db.prepare('SELECT settings_json FROM user_settings WHERE user_id = ?');
const upsertSettingsStmt = db.prepare(`
  INSERT INTO user_settings (user_id, settings_json, updated_at)
  VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(user_id)
  DO UPDATE SET
    settings_json = excluded.settings_json,
    updated_at = CURRENT_TIMESTAMP
`);

const app = express();

// Serve public/ statically so Instagram can fetch saved slide images
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  let userId = req.cookies?.[COOKIE_NAME];

  if (!userId) {
    userId = crypto.randomUUID();
    res.cookie(COOKIE_NAME, userId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: ONE_YEAR_MS,
      path: '/',
    });
  }

  req.userId = userId;
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/settings', (req, res) => {
  const row = getSettingsStmt.get(req.userId);
  let settings = {};

  if (row?.settings_json) {
    try {
      settings = JSON.parse(row.settings_json);
    } catch {
      settings = {};
    }
  }

  res.json({
    userId: req.userId,
    settings,
  });
});

app.put('/api/settings', (req, res) => {
  const incomingSettings = req.body?.settings;

  if (!incomingSettings || typeof incomingSettings !== 'object' || Array.isArray(incomingSettings)) {
    return res.status(400).json({ error: 'Invalid settings payload' });
  }

  const existingRow = getSettingsStmt.get(req.userId);
  let existingSettings = {};

  if (existingRow?.settings_json) {
    try {
      existingSettings = JSON.parse(existingRow.settings_json);
    } catch {
      existingSettings = {};
    }
  }

  const mergedSettings = {
    ...existingSettings,
    ...incomingSettings,
  };

  upsertSettingsStmt.run(req.userId, JSON.stringify(mergedSettings));

  return res.json({
    ok: true,
    userId: req.userId,
    settings: mergedSettings,
  });
});

// ─── Media Upload ───────────────────────────────────────────────────────────
app.post('/api/upload-media', async (req, res) => {
  const { accountKey, type, filename, data } = req.body ?? {};
  if (!accountKey || !type || !filename || !data) {
    return res.status(400).json({ error: 'Missing accountKey, type, filename or data' });
  }
  const folder = type === 'video' ? 'videos' : 'images';
  const destDir = path.join(__dirname, 'public', accountKey, folder);
  fs.mkdirSync(destDir, { recursive: true });
  const raw = data.replace(/^data:[^;]+;base64,/, '');
  const destPath = path.join(destDir, filename);
  fs.writeFileSync(destPath, Buffer.from(raw, 'base64'));
  const publicPath = `/${accountKey}/${folder}/${filename}`;
  console.log(`[upload-media] Saved ${publicPath}`);
  return res.json({ ok: true, path: publicPath });
});

// ─── List Media for Account ──────────────────────────────────────────────────
// Returns all image and video filenames found on disk for the given account.
app.get('/api/list-media', (req, res) => {
  const { accountKey } = req.query;
  if (!accountKey) return res.status(400).json({ error: 'Missing accountKey' });

  const readDir = (sub) => {
    const dir = path.join(__dirname, 'public', accountKey, sub);
    try {
      return fs.readdirSync(dir)
        .filter(f => !f.startsWith('.'))
        .map(f => `/${accountKey}/${sub}/${f}`);
    } catch { return []; }
  };

  return res.json({
    images: readDir('images'),
    videos: readDir('videos'),
  });
});

// ─── Instagram Direct Publisher ───────────────────────────────────────────────
// Required env vars (.env):
//   SERVER_PUBLIC_URL           Public HTTPS URL of this server (ngrok locally)
//   <ACCOUNT>_IG_USER_ID        Per-account IG numeric ID (e.g. ASTROLUNA_IG_USER_ID)
//   <ACCOUNT>_IG_ACCESS_TOKEN   Per-account token (e.g. ASTROLUNA_IG_ACCESS_TOKEN)
//   IG_USER_ID / IG_ACCESS_TOKEN  Global fallback used when no per-account creds match
app.post('/api/share-instagram', async (req, res) => {
  const { postId, images, caption, accountKey } = req.body ?? {};

  if (!postId || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Invalid payload: postId and images[] are required.' });
  }

  // Per-account credentials: check for ACCOUNTKEY_IG_USER_ID / ACCOUNTKEY_IG_ACCESS_TOKEN
  // (e.g., ASTROLUNA_IG_USER_ID), falling back to the global IG_USER_ID / IG_ACCESS_TOKEN.
  const envPrefix = accountKey ? accountKey.toUpperCase() + '_' : '';
  const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL;
  const IG_USER_ID = process.env[`${envPrefix}IG_USER_ID`] || process.env.IG_USER_ID;
  const IG_ACCESS_TOKEN = process.env[`${envPrefix}IG_ACCESS_TOKEN`] || process.env.IG_ACCESS_TOKEN;

  if (!SERVER_PUBLIC_URL || !IG_USER_ID || !IG_ACCESS_TOKEN) {
    return res.status(500).json({
      error: `Missing credentials for account "${accountKey || 'default'}". Set ${envPrefix}IG_USER_ID and ${envPrefix}IG_ACCESS_TOKEN in .env`,
    });
  }

  // ── 1. Save slides to disk — served statically at /shared/{postId}/slide-N.jpg
  const sharedDir = path.join(__dirname, 'public', 'shared', postId);
  fs.mkdirSync(sharedDir, { recursive: true });

  const publicUrls = [];
  for (let i = 0; i < images.length; i++) {
    const raw = images[i].replace(/^data:image\/\w+;base64,/, '');
    const filename = `slide-${i + 1}.jpg`;
    fs.writeFileSync(path.join(sharedDir, filename), Buffer.from(raw, 'base64'));
    publicUrls.push(`${SERVER_PUBLIC_URL.replace(/\/$/, '')}/shared/${postId}/${filename}`);
  }

  const igBase = `https://graph.instagram.com/v21.0/${IG_USER_ID}`;
  const isCarousel = images.length > 1;

  try {
    // ── 2. Create one IG media container per slide ──────────────────────────
    const containerIds = [];
    for (const imageUrl of publicUrls) {
      const form = new URLSearchParams({ image_url: imageUrl, access_token: IG_ACCESS_TOKEN });
      if (isCarousel) {
        form.set('media_type', 'IMAGE');
        form.set('is_carousel_item', 'true');
      } else {
        form.set('media_type', 'IMAGE');
        form.set('caption', caption || '');
      }
      // Retry up to 3 times — IG occasionally times out on the first attempt
      let data;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const resp = await fetch(`${igBase}/media`, { method: 'POST', body: form });
        data = await resp.json();
        console.log(`[share-instagram] Container attempt ${attempt} for ${imageUrl}:`, JSON.stringify(data));
        if (data.id) break;
        const isTransient = data?.error?.is_transient || data?.error?.error_subcode === 2207003;
        if (!isTransient || attempt === 3) throw new Error(`IG container creation failed: ${JSON.stringify(data)}`);
        console.log(`[share-instagram] Transient error, retrying in 5s...`);
        await new Promise(r => setTimeout(r, 5000));
      }
      containerIds.push(data.id);
    }

    // ── 3. For carousels: wait then wrap in parent container ─────────────────
    let publishContainerId;
    if (isCarousel) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const form = new URLSearchParams({
        media_type: 'CAROUSEL',
        children: containerIds.join(','),
        caption: caption || '',
        access_token: IG_ACCESS_TOKEN,
      });
      const resp = await fetch(`${igBase}/media`, { method: 'POST', body: form });
      const data = await resp.json();
      console.log('[share-instagram] Carousel container:', JSON.stringify(data));
      if (!data.id) throw new Error(`IG carousel container failed: ${JSON.stringify(data)}`);
      publishContainerId = data.id;
    } else {
      publishContainerId = containerIds[0];
    }

    // ── 4. Wait for IG to finish processing before publishing ────────────────
    const waitForReady = async (containerId) => {
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const statusResp = await fetch(
          `https://graph.instagram.com/v21.0/${containerId}?fields=status_code,status&access_token=${IG_ACCESS_TOKEN}`
        );
        const statusData = await statusResp.json();
        console.log(`[share-instagram] Container ${containerId} status:`, statusData.status_code);
        if (statusData.status_code === 'FINISHED') return;
        if (statusData.status_code === 'ERROR') throw new Error(`Container processing failed: ${JSON.stringify(statusData)}`);
      }
      throw new Error('Container did not finish processing in time');
    };
    await waitForReady(publishContainerId);

    // ── 5. Publish ───────────────────────────────────────────────────────────
    const pubForm = new URLSearchParams({ creation_id: publishContainerId, access_token: IG_ACCESS_TOKEN });
    const pubResp = await fetch(`${igBase}/media_publish`, { method: 'POST', body: pubForm });
    const pubData = await pubResp.json();
    if (!pubData.id) throw new Error(`IG publish failed: ${JSON.stringify(pubData)}`);

    console.log(`[share-instagram] Published post ${postId} → IG post id ${pubData.id}`);
    return res.json({ ok: true, instagramPostId: pubData.id, slides: images.length });

  } catch (err) {
    console.error('[share-instagram] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Proxy Google Fonts CSS server-side to avoid cross-origin cssRules restriction in html-to-image
app.get('/api/font-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !url.startsWith('https://fonts.googleapis.com/')) {
      return res.status(400).json({ error: 'Only Google Fonts URLs are allowed' });
    }
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/css,*/*;q=0.1',
      },
    });
    const css = await response.text();
    res.set('Content-Type', 'text/css');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(css);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Settings server running on http://localhost:${PORT}`);
  console.log(`SQLite DB: ${dbPath}`);
  refreshAllTokens();
});

// ─── Auto-refresh Instagram tokens ───────────────────────────────────────────
// Long-lived tokens expire after 60 days. Calling the refresh endpoint resets
// the clock to another 60 days. We do this on every server start + every 30 days.
async function refreshToken(token) {
  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (!data.access_token) throw new Error(JSON.stringify(data));
  return data.access_token;
}

async function refreshAllTokens() {
  const tokenKeys = Object.keys(process.env).filter(k => k.endsWith('_IG_ACCESS_TOKEN') || k === 'IG_ACCESS_TOKEN');

  for (const key of tokenKeys) {
    const token = process.env[key];
    if (!token || !token.startsWith('IGAA')) continue;
    try {
      const newToken = await refreshToken(token);
      process.env[key] = newToken; // update in memory only — no file write to avoid restart loop
      console.log(`[token-refresh] Refreshed ${key}`);
    } catch (err) {
      console.warn(`[token-refresh] Failed to refresh ${key}:`, err.message);
    }
  }
}

// Re-run every 20 days. Node's setTimeout uses a 32-bit signed integer for the delay,
// so the max safe value is ~24.8 days (2,147,483,647 ms). 29+ days overflows to 1 ms
// and causes an infinite tight loop. 20 days (1,728,000,000 ms) is safely under the limit.
const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24 * 20; // 20 days

function scheduleNextRefresh() {
  setTimeout(() => { refreshAllTokens().finally(scheduleNextRefresh); }, REFRESH_INTERVAL_MS);
}

// Refresh immediately on startup, then every 20 days
refreshAllTokens().finally(scheduleNextRefresh);
