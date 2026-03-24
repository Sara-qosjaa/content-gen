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

app.use(express.json({ limit: '5mb' }));
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
