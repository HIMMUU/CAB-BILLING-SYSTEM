'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TemplateDesignerProvider,
  useTemplateDesigner,
  PaperSize,
} from '@/components/designer/TemplateDesignerContext';
import LeftSidebar from '@/components/designer/LeftSidebar';
import CenterCanvas from '@/components/designer/CenterCanvas';
import RightInspector from '@/components/designer/RightInspector';
import PresetTemplatesModal, { PRESET_TEMPLATES } from '@/components/designer/PresetTemplatesModal';

function DesignerWorkspaceContent() {
  const router = useRouter();
  const {
    elements,
    loadTemplate,
    paperSize,
    setPaperSize,
    zoom,
    setZoom,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    isLivePreview,
    setIsLivePreview,
    undo,
    redo,
    canUndo,
    canRedo,
    resetCanvas,
  } = useTemplateDesigner();

  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  React.useEffect(() => {
    if (elements.length === 0 && PRESET_TEMPLATES && PRESET_TEMPLATES[0]) {
      loadTemplate(PRESET_TEMPLATES[0]);
    }
  }, []);

  const handleSaveDraft = () => {
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden text-slate-100 select-none font-sans">
      {/* ── TOP TOOLBAR ── */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left Actions: Back & Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Back to Dashboard"
          >
            ◀ Back
          </button>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              ✨ Enterprise Template Designer
            </h1>
            <p className="text-[10px] text-slate-400">Visual Drag & Drop Bill Studio</p>
          </div>
        </div>

        {/* Center Controls: Paper Size, Zoom, Undo/Redo, Presets */}
        <div className="flex items-center gap-2 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 text-xs">
          {/* Paper Size Switcher */}
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
            className="bg-slate-700 text-white border-0 rounded px-2 py-1 font-semibold text-xs focus:outline-none cursor-pointer"
          >
            <option value="A4">📄 A4 Sheet</option>
            <option value="LETTER">📄 Letter</option>
            <option value="THERMAL">🧾 Thermal Receipt</option>
            <option value="LANDSCAPE">📐 Landscape</option>
          </select>

          <div className="h-3 w-[1px] bg-slate-700" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="px-2 py-0.5 hover:bg-slate-700 rounded text-slate-300 font-bold"
            >
              -
            </button>
            <span className="font-mono text-xs w-10 text-center font-semibold text-slate-200">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="px-2 py-0.5 hover:bg-slate-700 rounded text-slate-300 font-bold"
            >
              +
            </button>
          </div>

          <div className="h-3 w-[1px] bg-slate-700" />

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300 transition"
            title="Undo"
          >
            ↩️
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300 transition"
            title="Redo"
          >
            ↪️
          </button>

          <div className="h-3 w-[1px] bg-slate-700" />

          {/* View Toggles */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 rounded text-xs font-medium transition ${
              showGrid ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-2 py-1 rounded text-xs font-medium transition ${
              snapToGrid ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Snap
          </button>

          <div className="h-3 w-[1px] bg-slate-700" />

          {/* Live Preview Toggle */}
          <button
            onClick={() => setIsLivePreview(!isLivePreview)}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
              isLivePreview ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <span>{isLivePreview ? '👁️ Live Data ON' : '⚙️ Tags Mode'}</span>
          </button>
        </div>

        {/* Right Actions: Templates Modal & Save */}
        <div className="flex items-center gap-2">
          {saveSuccessMsg && (
            <span className="text-xs font-bold text-emerald-400 animate-in fade-in duration-200">
              ✓ Saved to DB
            </span>
          )}
          <button
            onClick={() => setIsPresetsOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <span>✨ Presets</span>
          </button>
          <button
            onClick={resetCanvas}
            className="px-3 py-1.5 hover:bg-slate-800 border border-transparent hover:border-slate-700 text-slate-400 hover:text-red-400 rounded-lg text-xs font-semibold transition"
          >
            Reset
          </button>
          <button
            onClick={handleSaveDraft}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-md flex items-center gap-1.5 active:scale-95"
          >
            💾 Save Template
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE BODY ── */}
      <div className="flex-1 flex overflow-hidden relative">
        <LeftSidebar />
        <CenterCanvas />
        <RightInspector />
      </div>

      {/* Presets Modal */}
      <PresetTemplatesModal isOpen={isPresetsOpen} onClose={() => setIsPresetsOpen(false)} />
    </div>
  );
}

export default function DesignerPage() {
  return (
    <TemplateDesignerProvider>
      <DesignerWorkspaceContent />
    </TemplateDesignerProvider>
  );
}
