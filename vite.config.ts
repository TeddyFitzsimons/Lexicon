import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { promises as fs } from 'node:fs';
import path from 'node:path';

function localVocabulary(): Plugin {
  const file = path.resolve(process.cwd(), 'data/vocabulary.json');
  let queue = Promise.resolve();
  return {
    name: 'local-vocabulary-storage',
    configureServer(server) {
      server.middlewares.use('/api/words', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          if (req.method === 'GET') {
            let content: string;
            try { content = await fs.readFile(file, 'utf8'); }
            catch (e: any) { if (e.code !== 'ENOENT') throw e; content = '[]'; }
            JSON.parse(content); // Fail visibly rather than overwriting a corrupt file.
            res.end(content);
          } else if (req.method === 'PUT') {
            let body = '';
            for await (const chunk of req) {
              body += chunk.toString();
              if (body.length > 5_000_000) throw new Error('Vocabulary file too large');
            }
            const words: unknown = JSON.parse(body);
            if (!Array.isArray(words) || !words.every(w => w && typeof w === 'object' &&
              typeof w.id === 'string' && ['term','definition','partOfSpeech','example'].every(k => typeof w[k] === 'string'))) {
              res.statusCode = 400; res.end(JSON.stringify({error:'Invalid vocabulary data'})); return;
            }
            const task = queue.then(async () => {
              await fs.mkdir(path.dirname(file), {recursive:true});
              const tmp = file + '.tmp';
              await fs.writeFile(tmp, JSON.stringify(words, null, 2) + '\n');
              await fs.rename(tmp, file);
            });
            queue = task.catch(() => {});
            await task;
            res.end(JSON.stringify({ok:true}));
          } else { res.statusCode = 405; res.end(JSON.stringify({error:'Method not allowed'})); }
        } catch (e) { res.statusCode = 500; res.end(JSON.stringify({error:String(e)})); }
      });
    }
  };
}
export default defineConfig({ plugins: [react(), localVocabulary()], server:{host:'127.0.0.1',port:5173,strictPort:true} });
