import { defineConfig, Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

function devMinitSaverPlugin(): Plugin {
  return {
    name: 'dev-minit-saver',
    configureServer(server) {
      server.middlewares.use('/api/dev/save-minit', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { id, stats, payload, actionCd, baseTexture } = data;
            if (!id) throw new Error('Missing minit ID');

            const filePath = path.resolve(__dirname, `src/minits/${id}.js`);
            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: false, error: `File not found: src/minits/${id}.js` }));
            }

            let fileContent = fs.readFileSync(filePath, 'utf-8');

            // 1. Update stats: hp and speed
            if (stats) {
              if (stats.hp !== undefined) {
                fileContent = fileContent.replace(/(hp:\s*)\d+(\.\d+)?/g, `$1${stats.hp}`);
              }
              if (stats.speed !== undefined) {
                fileContent = fileContent.replace(/(speed:\s*)\d+(\.\d+)?/g, `$1${stats.speed}`);
              }
            }

            // 2. Update action cooldown
            if (actionCd !== undefined) {
              fileContent = fileContent.replace(/(cd:\s*)\d+/g, `$1${actionCd}`);
            }

            // 3. Update attack damages in payload
            if (payload) {
              if (payload.dmg !== undefined) {
                fileContent = fileContent.replace(/(dmg:\s*)\d+(\.\d+)?/g, `$1${payload.dmg}`);
              }
              if (payload.missileDmg !== undefined) {
                fileContent = fileContent.replace(/(missileDmg:\s*)\d+(\.\d+)?/g, `$1${payload.missileDmg}`);
              }
              if (payload.ramDmg !== undefined) {
                fileContent = fileContent.replace(/(ramDmg:\s*)\d+(\.\d+)?/g, `$1${payload.ramDmg}`);
              }
              if (payload.beamTickDmg !== undefined) {
                fileContent = fileContent.replace(/(beamTickDmg:\s*)\d+(\.\d+)?/g, `$1${payload.beamTickDmg}`);
              }
              if (payload.knockbackForce !== undefined) {
                fileContent = fileContent.replace(/(knockbackForce:\s*)\d+(\.\d+)?/g, `$1${payload.knockbackForce}`);
              }
            }

            // 4. Update base texture path
            if (baseTexture) {
              fileContent = fileContent.replace(/(base:\s*['"])[^'"]+(['"])/g, `$1${baseTexture}$2`);
            }

            fs.writeFileSync(filePath, fileContent, 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                message: `Directly updated src/minits/${id}.js on disk!`
              })
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [devMinitSaverPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1500
  }
});
