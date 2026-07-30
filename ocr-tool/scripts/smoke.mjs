import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * 跨平台 HTTP 冒烟测试：用 Node 原生 fetch + FormData 发送正确 JSON，
 * 避免 PowerShell/curl 引号处理导致参数被剥引号。
 */
const srv = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'], {
  cwd: process.cwd(),
  stdio: 'ignore',
  detached: true,
});

async function main() {
  await sleep(6000);
  const h = await (await fetch('http://localhost:3001/api/health')).json();
  console.log('[health] ok=', h.ok, 'langs=', h.languages.length);

  const buf = await readFile('tests/fixtures/phototest.tif');
  const fd = new FormData();
  fd.append(
    'params',
    JSON.stringify({ languages: ['eng'], oem: 1, psm: 6, preserveSpaces: false, outputFormat: 'txt' })
  );
  fd.append('files', new Blob([buf]), 'phototest.tif');
  const r = await fetch('http://localhost:3001/api/ocr', { method: 'POST', body: fd });
  const data = await r.json();
  console.log('[ocr] http=', r.status, 'textLen=', data.combined?.length ?? 0);
  console.log('[ocr] preview:', (data.combined || '').slice(0, 140).replace(/\n/g, ' '));
}

try {
  await main();
} catch (e) {
  console.error('[smoke] error:', e);
} finally {
  try {
    spawn('taskkill', ['/F', '/T', '/PID', String(srv.pid)]);
  } catch {
    /* ignore */
  }
}
