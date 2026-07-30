import { useEffect } from 'react';
import { useStore } from './store';
import { fetchHealth } from './lib/api';
import { Dropzone } from './components/Dropzone';
import { FileList } from './components/FileList';
import { Preview } from './components/Preview';
import { ConfigPanel } from './components/ConfigPanel';
import { ResultPanel } from './components/ResultPanel';

export default function App() {
  const setLanguages = useStore((s) => s.setLanguages);
  const setHealth = useStore((s) => s.setHealth);
  const health = useStore((s) => s.health);
  const globalError = useStore((s) => s.globalError);
  const setGlobalError = useStore((s) => s.setGlobalError);

  useEffect(() => {
    (async () => {
      try {
        const h = await fetchHealth();
        setHealth({ ok: h.ok, version: h.tesseractVersion });
        setLanguages(h.languages);
      } catch (err) {
        setHealth({ ok: false, version: '' });
        setGlobalError(`无法连接后端：${(err as Error).message}`);
      }
    })();
  }, [setLanguages, setHealth, setGlobalError]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tesseract OCR 工具</h1>
        <span className="sub">拖入图片 / PDF，浏览器预览，一键识别</span>
        {health && (
          <span className={`health-badge ${health.ok ? 'ok' : 'bad'}`}>
            {health.ok ? `● Tesseract ${health.version}` : '● 后端未就绪'}
          </span>
        )}
      </header>

      {globalError && <div className="global-err">{globalError}</div>}

      <Dropzone />

      <div className="layout">
        <div className="col">
          <FileList />
        </div>
        <div className="col">
          <h3>预览</h3>
          <Preview />
        </div>
        <div className="col">
          <h3>配置</h3>
          <ConfigPanel />
          <h3 style={{ marginTop: 18 }}>识别结果</h3>
          <ResultPanel />
        </div>
      </div>
    </div>
  );
}
