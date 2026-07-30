import express from 'express';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ocrRouter } from './routes/ocr.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/api', ocrRouter);

// 生产模式：若已构建前端，则静态托管 dist（单端口部署）
const distDir = join(__dirname, '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[ocr-tool] 后端已启动: http://localhost:${PORT}`);
  console.log(`[ocr-tool] 前端静态目录: ${existsSync(distDir) ? distDir : '（开发模式由 Vite :5173 托管）'}`);
});
