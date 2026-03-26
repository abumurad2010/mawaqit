import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import * as fs from "fs";
import * as path from "path";

const CACHE_DIR = path.resolve(process.cwd(), "server", "cache");

const ADHAN_FULL = path.join(CACHE_DIR, 'adhan_full.mp3');
const ADHAN_ABBREVIATED = path.join(CACHE_DIR, 'adhan_abbreviated.mp3');

function serveAudioFile(filePath: string, req: Request, res: Response) {
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Audio file not found' });
    return;
  }
  const total = fs.statSync(filePath).size;
  const range = req.headers.range;

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : total - 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', end - start + 1);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', total);
    fs.createReadStream(filePath).pipe(res);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/adhan', (req, res) => serveAudioFile(ADHAN_FULL, req, res));
  app.get('/api/adhan/abbreviated', (req, res) => serveAudioFile(ADHAN_ABBREVIATED, req, res));

  const httpServer = createServer(app);
  return httpServer;
}
