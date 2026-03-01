import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as fs from "fs";
import * as path from "path";

const TRANSLATIONS_DIR = path.resolve(process.cwd(), "server", "data", "translations");

const DOWNLOADABLE_LANGS = new Set(['zh','tr','id','bn','fa','ms','pt','sw','ha']);

export async function registerRoutes(app: Express): Promise<Server> {
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
