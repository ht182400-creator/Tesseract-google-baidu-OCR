import { useEffect, useState } from 'react';
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
  const files = useStore((s) => s.files);
  const selectedId = useStore((s) => s.selectedId);
  const [selectedPage, setSelectedPage] = useState(0);
  const file = files.find((f) => f.id === selectedId) ?? null;

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
        <div className="col col-files">
          <FileList />
        </div>
        <div className="col col-preview">
          <h3>预览</h3>
          <Preview file={file} page={selectedPage} />
        </div>
      </div>

      {/* 配置停靠栏：横跨屏幕中下部，左列=识别结果、右列=识别参数（参数横向平铺） */}
      <section className="config-dock">
        <div className="config-dock-inner">
          <div className="dock-result">
            <h3>识别结果</h3>
            <ResultPanel file={file} page={selectedPage} onPage={setSelectedPage} />
          </div>
          <div className="dock-params">
            <h3 className="dock-title">识别参数</h3>
            <ConfigPanel />
          </div>
        </div>
      </section>
    </div>
  );
}
