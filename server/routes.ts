import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const TRANSLATIONS_DIR = path.resolve(process.cwd(), "server", "data", "translations");
const CACHE_DIR = path.resolve(process.cwd(), "server", "cache");

const DOWNLOADABLE_LANGS = new Set(['zh','tr','id','bn','fa','ms','pt','sw','ha']);

const ADHAN_SOURCE = 'https://archive.org/download/MakkahAdhanAl-asr7-11-13SheikhSaeedFallatah/MakkahAdhanAl-asr7-11-13SheikhSaeedFallatah.mp3';
const ADHAN_CACHE = path.join(CACHE_DIR, 'adhan_makkah.mp3');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

let adhanDownloading = false;
let adhanReady = fs.existsSync(ADHAN_CACHE) && fs.statSync(ADHAN_CACHE).size > 100000;

function httpsGetFollowRedirects(url: string, cb: (res: import('http').IncomingMessage) => void, onErr: (e: Error) => void, maxRedirects = 5) {
  https.get(url, (res) => {
    if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location && maxRedirects > 0) {
      res.resume();
      const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).toString();
      httpsGetFollowRedirects(next, cb, onErr, maxRedirects - 1);
    } else {
      cb(res);
    }
  }).on('error', onErr);
}

function downloadAdhan() {
  if (adhanDownloading || adhanReady) return;
  adhanDownloading = true;
  console.log('[adhan] Downloading Makkah adhan from Archive.org...');
  const tmp = ADHAN_CACHE + '.tmp';
  const file = fs.createWriteStream(tmp);
  httpsGetFollowRedirects(ADHAN_SOURCE, (res) => {
    if (res.statusCode !== 200) {
      console.warn('[adhan] Download failed, status:', res.statusCode);
      adhanDownloading = false;
      file.destroy();
      return;
    }
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      fs.renameSync(tmp, ADHAN_CACHE);
      adhanReady = true;
      adhanDownloading = false;
      console.log('[adhan] Download complete:', Math.round(fs.statSync(ADHAN_CACHE).size / 1024) + 'KB');
    });
  }, (e) => {
    console.warn('[adhan] Download error:', e.message);
    adhanDownloading = false;
    try { fs.unlinkSync(tmp); } catch {}
  });
}

downloadAdhan();

function serveAdhan(req: Request, res: Response) {
  if (!adhanReady) {
    if (!adhanDownloading) downloadAdhan();
    res.status(503).json({ error: 'Adhan audio not ready yet, retry in a moment' });
    return;
  }
  const stat = fs.statSync(ADHAN_CACHE);
  const total = stat.size;
  const range = req.headers.range;

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : total - 1;
    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', chunkSize);
    fs.createReadStream(ADHAN_CACHE, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', total);
    fs.createReadStream(ADHAN_CACHE).pipe(res);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/adhan', serveAdhan);

  app.get('/api/translations/:lang', (req, res) => {
    const lang = req.params.lang.replace(/[^a-z]/g, '');
    if (!DOWNLOADABLE_LANGS.has(lang)) {
      return res.status(404).json({ error: 'Not a downloadable language' });
    }
    const filePath = path.join(TRANSLATIONS_DIR, lang + '.json');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Translation file not found' });
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    fs.createReadStream(filePath).pipe(res);
  });

  const httpServer = createServer(app);
  return httpServer;
}
