import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type Validate = (data: unknown) => boolean;
/** Serves one JSON file under data/ at a route: GET reads, PUT validates then writes atomically. */
function jsonFileRoute(route: string, fileName: string, fallback: string, validate: Validate, maxBytes: number) {
  const file = path.resolve(process.cwd(), 'data', fileName);
  let queue = Promise.resolve();
  return (server: Parameters<NonNullable<Plugin['configureServer']>>[0]) => {
    server.middlewares.use(route, async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      try {
        if (req.method === 'GET') {
          let content: string;
          try { content = await fs.readFile(file, 'utf8'); }
          catch (e: any) { if (e.code !== 'ENOENT') throw e; content = fallback; }
          JSON.parse(content); // Fail visibly rather than overwriting a corrupt file.
          res.end(content);
        } else if (req.method === 'PUT') {
          let body = '';
          for await (const chunk of req) {
            body += chunk.toString();
            if (body.length > maxBytes) throw new Error(`${fileName} is too large`);
          }
          const data: unknown = JSON.parse(body);
          if (!validate(data)) { res.statusCode = 400; res.end(JSON.stringify({error:`Invalid ${fileName}`})); return; }
          const task = queue.then(async () => {
            await fs.mkdir(path.dirname(file), {recursive:true});
            const tmp = file + '.tmp';
            await fs.writeFile(tmp, JSON.stringify(data, null, 2) + '\n');
            await fs.rename(tmp, file);
          });
          queue = task.catch(() => {});
          await task;
          res.end(JSON.stringify({ok:true}));
        } else { res.statusCode = 405; res.end(JSON.stringify({error:'Method not allowed'})); }
      } catch (e) { res.statusCode = 500; res.end(JSON.stringify({error:String(e)})); }
    });
  };
}

const isWords: Validate = words => Array.isArray(words) && words.every((w: any) => w && typeof w === 'object' &&
  typeof w.id === 'string' && ['term','definition','partOfSpeech','example'].every(k => typeof w[k] === 'string'));
const isProfile: Validate = (p: any) => !!p && typeof p === 'object' && typeof p.name === 'string' && p.name.length <= 80 &&
  !!p.days && typeof p.days === 'object' && !Array.isArray(p.days) &&
  Object.entries(p.days).every(([day, v]: [string, any]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && !!v && typeof v === 'object' &&
    Object.values(v).every(n => Number.isInteger(n) && (n as number) >= 0)) &&
  (p.events === undefined || (Array.isArray(p.events) && p.events.length <= 300 && p.events.every((e: any) =>
    e && typeof e.at === 'string' && (e.kind === 'added' || e.kind === 'imported') && Number.isInteger(e.count) && e.count > 0 &&
    Array.isArray(e.words) && e.words.length <= 50 && e.words.every((w: unknown) => typeof w === 'string' && w.length <= 100) &&
    (e.from === undefined || (typeof e.from === 'string' && e.from.length <= 40)))));

function localData(): Plugin {
  const words = jsonFileRoute('/api/words', 'vocabulary.json', '[]', isWords, 5_000_000);
  const profile = jsonFileRoute('/api/profile', 'profile.json', '{"name":"","days":{}}', isProfile, 1_000_000);
  return { name: 'local-data-storage', configureServer(server) { words(server); profile(server); } };
}
export default defineConfig({ plugins: [react(), localData()], server:{host:'127.0.0.1',port:5173,strictPort:true} });
