'use client';

import React from 'react';
import { useTemplateDesigner } from './TemplateDesignerContext';

const FONT_FAMILIES = ['Inter', 'Roboto', 'Outfit', 'Montserrat', 'Playfair Display', 'Courier New'];
const PRESET_COLORS = ['#0F172A', '#2563EB', '#16A34A', '#DC2626', '#D97706', '#475569', '#FFFFFF', '#F8FAFC'];

export default function RightInspector() {
  const {
    selectedElement,
    updateSelectedElement,
    deleteElement,
    duplicateElement,
    bringForward,
    sendBackward,
  } = useTemplateDesigner();

  if (!selectedElement) {
    return (
      <aside className="w-80 bg-white border-l border-[#E2E8F0] flex flex-col items-center justify-center p-6 text-center select-none text-slate-400 shrink-0">
        <div className="text-4xl mb-3">🎨</div>
        <h4 className="text-sm font-semibold text-slate-600 mb-1">No Element Selected</h4>
        <p className="text-xs">Click any component on the canvas or add one from the left sidebar to customize its properties.</p>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white border-l border-[#E2E8F0] flex flex-col h-full z-10 shrink-0 select-none overflow-y-auto p-4 space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 px-2 py-0.5 bg-blue-50 rounded">
            {selectedElement.type}
          </span>
          <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
            {selectedElement.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => duplicateElement(selectedElement.id)}
            title="Duplicate"
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition"
          >
            📋
          </button>
          <button
            onClick={() => deleteElement(selectedElement.id)}
            title="Delete"
            className="p-1.5 hover:bg-red-50 text-red-500 rounded transition"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Content / Merge Tag</label>
        <textarea
          rows={3}
          value={selectedElement.content}
          onChange={(e) => updateSelectedElement({ content: e.target.value })}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 transition resize-none"
        />
        <p className="text-[10px] text-slate-400">Use double curly brackets for dynamic merge tags e.g. {"{{grand_total}}"}</p>
      </div>

      {/* Transform & Layout */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Position & Size</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-400">X (px)</label>
            <input
              type="number"
              value={Math.round(selectedElement.x)}
              onChange={(e) => updateSelectedElement({ x: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Y (px)</label>
            <input
              type="number"
              value={Math.round(selectedElement.y)}
              onChange={(e) => updateSelectedElement({ y: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Width (px)</label>
            <input
              type="number"
              value={Math.round(selectedElement.width)}
              onChange={(e) => updateSelectedElement({ width: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Height (px)</label>
            <input
              type="number"
              value={Math.round(selectedElement.height)}
              onChange={(e) => updateSelectedElement({ height: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Typography Controls */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Typography</h4>
        <div className="space-y-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-400">Font Family</label>
            <select
              value={selectedElement.fontFamily}
              onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">Size (px)</label>
              <input
                type="number"
                value={selectedElement.fontSize}
                onChange={(e) => updateSelectedElement({ fontSize: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Weight</label>
              <select
                value={selectedElement.fontWeight}
                onChange={(e) => updateSelectedElement({ fontWeight: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800"
              >
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="semibold">SemiBold</option>
                <option value="bold">Bold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Text Align</label>
            <div className="flex border border-slate-200 rounded overflow-hidden bg-slate-50 p-0.5 gap-0.5">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => updateSelectedElement({ textAlign: align })}
                  className={`flex-1 py-1 text-xs capitalize font-semibold rounded ${
                    selectedElement.textAlign === align ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Colors & Appearance */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Colors & Styling</h4>
        
        <div className="space-y-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-400">Text Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={selectedElement.color}
                onChange={(e) => updateSelectedElement({ color: e.target.value })}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={selectedElement.color}
                onChange={(e) => updateSelectedElement({ color: e.target.value })}
                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Background Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={selectedElement.backgroundColor === 'transparent' ? '#ffffff' : selectedElement.backgroundColor}
                onChange={(e) => updateSelectedElement({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
              <button
                onClick={() => updateSelectedElement({ backgroundColor: 'transparent' })}
                className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-600 hover:bg-slate-200 transition"
              >
                Transparent
              </button>
            </div>
          </div>

          <div className="pt-2">
            <label className="text-[10px] text-slate-400 mb-1 block">Quick Palette</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateSelectedElement({ color: c })}
                  style={{ backgroundColor: c }}
                  className="w-6 h-6 rounded-full border border-slate-300 shadow-sm hover:scale-110 transition"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Borders & Geometry */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Borders & Padding</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-400">Corner Radius</label>
            <input
              type="number"
              value={selectedElement.borderRadius}
              onChange={(e) => updateSelectedElement({ borderRadius: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Border Width</label>
            <input
              type="number"
              value={selectedElement.borderWidth}
              onChange={(e) => updateSelectedElement({ borderWidth: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Layer Hierarchy */}
      <div className="space-y-2 pt-3 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Layer Order</h4>
        <div className="flex gap-2">
          <button
            onClick={() => bringForward(selectedElement.id)}
            className="flex-1 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 transition"
          >
            ⬆️ Bring Forward
          </button>
          <button
            onClick={() => sendBackward(selectedElement.id)}
            className="flex-1 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 transition"
          >
            ⬇️ Send Backward
          </button>
        </div>
      </div>
    </aside>
  );
}
