import { defineConfig, Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

function devMinitSaverPlugin(): Plugin {
  return {
    name: 'dev-minit-saver',
    configureServer(server) {
      // ----------------------------------------------------
      // 1. UPDATE EXISTING MINIT IN PROJECT (POST /api/dev/save-minit)
      // ----------------------------------------------------
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
            const { id, fullCode, stats, payload, actionCd, textures } = data;
            if (!id) throw new Error('Missing minit ID');

            const filePath = path.resolve(__dirname, `src/minits/${id}.js`);
            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({ success: false, error: `File not found: src/minits/${id}.js` })
              );
            }

            // If complete structured code is provided from DevConsole, write it directly!
            if (fullCode && typeof fullCode === 'string' && fullCode.length > 50) {
              fs.writeFileSync(filePath, fullCode, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: true,
                  message: `Directly updated src/minits/${id}.js on disk!`
                })
              );
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
                fileContent = fileContent.replace(
                  /(beamTickDmg:\s*)\d+(\.\d+)?/g,
                  `$1${payload.beamTickDmg}`
                );
              }
              if (payload.knockbackForce !== undefined) {
                fileContent = fileContent.replace(
                  /(knockbackForce:\s*)\d+(\.\d+)?/g,
                  `$1${payload.knockbackForce}`
                );
              }
            }

            // 4. Update any texture keys (base, hatch, custom...)
            if (textures && typeof textures === 'object') {
              for (const [tKey, tPath] of Object.entries(textures)) {
                const reg = new RegExp(`(${tKey}:\\s*['"])[^'"]+(['"])`, 'g');
                fileContent = fileContent.replace(reg, `$1${tPath}$2`);
              }
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

      // ----------------------------------------------------
      // 2. UPLOAD ASSET / TEXTURE FILE (POST /api/dev/upload-asset)
      // ----------------------------------------------------
      server.middlewares.use('/api/dev/upload-asset', (req, res) => {
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
            const { filename, dataBase64 } = data;
            if (!filename || !dataBase64) throw new Error('Missing filename or base64 data');

            const cleanFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const targetDir = path.resolve(__dirname, 'public/assets/minit_icon');
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            const targetPath = path.join(targetDir, cleanFileName);
            const base64Data = dataBase64.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));

            const relativePath = `./assets/minit_icon/${cleanFileName}`;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                path: relativePath,
                message: `Uploaded texture to public/assets/minit_icon/${cleanFileName}`
              })
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });

      // ----------------------------------------------------
      // 3. SAVE / IMPORT NEW MINIT FILE TO PROJECT (POST /api/dev/save-minit-file)
      // ----------------------------------------------------
      server.middlewares.use('/api/dev/save-minit-file', (req, res) => {
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
            const { filename, content, varName } = data;
            if (!filename || !content) throw new Error('Missing filename or content');

            const cleanFilename = filename.endsWith('.js') ? filename : `${filename.replace(/\.ts$/, '')}.js`;
            const baseId = cleanFilename.replace(/\.js$/, '');
            const targetFilePath = path.resolve(__dirname, `src/minits/${cleanFilename}`);

            // Write target minit file
            fs.writeFileSync(targetFilePath, content, 'utf-8');

            // Register in src/minits/index.js if not already present
            const indexPath = path.resolve(__dirname, 'src/minits/index.js');
            if (fs.existsSync(indexPath)) {
              let indexContent = fs.readFileSync(indexPath, 'utf-8');
              const finalVarName = varName || `MINIT_${baseId.toUpperCase()}`;

              if (!indexContent.includes(`from './${baseId}.js'`)) {
                // Insert import
                indexContent = indexContent.replace(
                  /(import\s*\{\s*MINIT_IRONMEN\s*\}\s*from\s*'[^']+';)/,
                  `$1\nimport { ${finalVarName} } from './${baseId}.js';`
                );
                // Insert into ALL_MINITS
                indexContent = indexContent.replace(
                  /(MINIT_IRONMEN\s*\n\];)/,
                  `MINIT_IRONMEN,\n  ${finalVarName}\n];`
                );
                fs.writeFileSync(indexPath, indexContent, 'utf-8');
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                message: `Successfully saved src/minits/${cleanFilename} and registered in index.js!`
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
