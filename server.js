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

// ─── Instagram Direct Publisher ───────────────────────────────────────────────
// Required env vars (.env):
//   SERVER_PUBLIC_URL   Public HTTPS URL of this server (ngrok locally)
//   IG_USER_ID          Instagram Business/Creator account numeric ID
//   IG_ACCESS_TOKEN     Long-lived token with instagram_content_publish scope
app.post('/api/share-instagram', async (req, res) => {
  const { postId, images, caption } = req.body ?? {};

  if (!postId || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Invalid payload: postId and images[] are required.' });
  }

  const { SERVER_PUBLIC_URL, IG_USER_ID, IG_ACCESS_TOKEN } = process.env;

  if (!SERVER_PUBLIC_URL || !IG_USER_ID || !IG_ACCESS_TOKEN) {
    return res.status(500).json({
      error: 'Missing credentials. Set SERVER_PUBLIC_URL, IG_USER_ID, IG_ACCESS_TOKEN in .env',
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
      const resp = await fetch(`${igBase}/media`, { method: 'POST', body: form });
      const data = await resp.json();
      console.log(`[share-instagram] Container for ${imageUrl}:`, JSON.stringify(data));
      if (!data.id) throw new Error(`IG container creation failed: ${JSON.stringify(data)}`);
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
});
