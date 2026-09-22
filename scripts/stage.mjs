import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Each deployment versions the complete ES-module graph, not just its entry point.
export function stage(source, destination, version) {
  const stamp=encodeURIComponent(version);
  mkdirSync(destination,{recursive:true});
  for(const name of ['index.html','app.css','config.js','src','assets','vendor'])cpSync(join(source,name),join(destination,name),{recursive:true});
  const html=join(destination,'index.html');
  writeFileSync(html,readFileSync(html,'utf8').replace(/((?:src|href)="(?:src\/[^"?]+\.js|app\.css|config\.js))(?:\?[^"\s]*)?"/g,`$1?v=${stamp}"`));
  for(const name of readdirSync(join(destination,'src'))) {
    if(!name.endsWith('.js'))continue;
    const file=join(destination,'src',name);
    writeFileSync(file,readFileSync(file,'utf8').replace(/(from\s+["']\.\/[^"'?]+\.js)(?:\?[^"']*)?(["'])/g,`$1?v=${stamp}$2`));
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)stage(process.cwd(),resolve(process.argv[2]||'_site'),process.env.GITHUB_SHA||'local');
