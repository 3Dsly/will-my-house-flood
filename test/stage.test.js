import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join,resolve,sep,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {stage} from '../scripts/stage.mjs';
test('public build versions styles and all module imports with one identity',()=>{
  const destination=mkdtempSync(join(tmpdir(),'depth-site-'));
  try {
    stage(process.cwd(),destination,'test-release');
    const html=readFileSync(join(destination,'index.html'),'utf8');
    assert.match(html,/src\/depth-view\.js\?v=test-release/);
    assert.match(html,/src\/main\.js\?v=test-release/);
    assert.match(html,/app\.css\?v=test-release/);
    assert.match(readFileSync(join(destination,'src/ui.js'),'utf8'),/from '.\/depth-view.js\?v=test-release'/);
    assert.match(readFileSync(join(destination,'src/main.js'),'utf8'),/from ".\/ui.js\?v=test-release"/);
    assert.ok(existsSync(join(destination,'vendor/egm96/egm96-15.pgm')));
    assert.equal(existsSync(join(destination,'PREVIEW.md')),false);
    assert.equal(existsSync(join(destination,'.git')),false);
  } finally {
    assert.ok(resolve(destination).startsWith(resolve(tmpdir())+sep)&&basename(destination).startsWith('depth-site-'));
    rmSync(destination,{recursive:true,force:true});
  }
});
