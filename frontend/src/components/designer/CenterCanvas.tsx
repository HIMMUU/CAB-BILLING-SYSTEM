'use client';

import React, { useRef } from 'react';
import { useTemplateDesigner, CanvasElement, SAMPLE_MERGE_DATA, PaperSize } from './TemplateDesignerContext';

const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 794, height: 1123 },
  LETTER: { width: 816, height: 1056 },
  THERMAL: { width: 384, height: 800 },
  LANDSCAPE: { width: 1123, height: 794 },
};

export default function CenterCanvas() {
  const {
    elements,
    selectedElementId,
    setSelectedElementId,
    updateSelectedElement,
    paperSize,
    zoom,
    showGrid,
    snapToGrid,
    isLivePreview,
  } = useTemplateDesigner();

  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; initialElX: number; initialElY: number }>({
    x: 0,
    y: 0,
    initialElX: 0,
    initialElY: 0,
  });

  const dimensions = PAPER_DIMENSIONS[paperSize];

  // Render content with live merge tag substitution if live preview is ON
  const renderContent = (content: string) => {
    if (!isLivePreview) return content;
    let resolved = content;
    Object.entries(SAMPLE_MERGE_DATA).forEach(([key, val]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      resolved = resolved.replace(regex, val);
    });
    return resolved;
  };

  const handleMouseDown = (e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialElX: el.x,
      initialElY: el.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const zoomFactor = zoom / 100;
      const deltaX = (moveEvent.clientX - dragStartRef.current.x) / zoomFactor;
      const deltaY = (moveEvent.clientY - dragStartRef.current.y) / zoomFactor;

      let newX = dragStartRef.current.initialElX + deltaX;
      let newY = dragStartRef.current.initialElY + deltaY;

      if (snapToGrid) {
        newX = Math.round(newX / 10) * 10;
        newY = Math.round(newY / 10) * 10;
      }

      updateSelectedElement({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <main
      onClick={() => setSelectedElementId(null)}
      className="flex-1 bg-slate-100/80 overflow-auto flex items-start justify-center p-12 select-none relative"
    >
      {/* Paper Sheet Container */}
      <div
        ref={canvasRef}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
        }}
        className={`bg-white rounded-sm shadow-2xl relative transition-transform duration-75 border border-slate-200 shrink-0 ${
          showGrid
            ? 'bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:20px_20px]'
            : ''
        }`}
      >
        {/* Render Canvas Elements */}
        {elements.map((el) => {
          const isSelected = el.id === selectedElementId;

          return (
            <div
              key={el.id}
              onMouseDown={(e) => handleMouseDown(e, el)}
              style={{
                position: 'absolute',
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                transform: `rotate(${el.rotation}deg)`,
                opacity: el.opacity / 100,
                fontSize: el.fontSize,
                fontWeight: el.fontWeight,
                fontFamily: el.fontFamily,
                textAlign: el.textAlign,
                color: el.color,
                backgroundColor: el.backgroundColor,
                borderRadius: el.borderRadius,
                borderWidth: el.borderWidth,
                borderColor: el.borderColor,
                borderStyle: el.borderStyle,
                boxShadow: el.boxShadow,
                padding: el.padding,
                zIndex: el.zIndex,
              }}
              className={`cursor-move transition-shadow flex items-center ${
                isSelected ? 'ring-2 ring-blue-600 ring-offset-2 shadow-lg z-50' : 'hover:ring-1 hover:ring-blue-300'
              }`}
            >
              {/* Element Content Types */}
              {el.type === 'divider' ? (
                <div className="w-full h-full" style={{ backgroundColor: el.backgroundColor || el.color }} />
              ) : el.type === 'table' ? (
                <div className="w-full text-xs font-sans border border-slate-300 rounded overflow-hidden">
                  <div className="bg-slate-800 text-white flex justify-between px-3 py-2 font-bold uppercase tracking-wider text-[10px]">
                    <span>Particulars / Service Description</span>
                    <span>Rate / Unit</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-slate-200 bg-white text-slate-700">
                    <div className="flex justify-between px-3 py-2">
                      <span>Base Fare ({isLivePreview ? SAMPLE_MERGE_DATA.trip_type : 'Local Package'})</span>
                      <span>Flat</span>
                      <span className="font-mono font-semibold">{isLivePreview ? SAMPLE_MERGE_DATA.base_fare : '₹1,800.00'}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2">
                      <span>Extra KM Charges</span>
                      <span>₹12/KM</span>
                      <span className="font-mono font-semibold">{isLivePreview ? SAMPLE_MERGE_DATA.extra_km : '₹240.00'}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2">
                      <span>Driver Allowance</span>
                      <span>Per Duty</span>
                      <span className="font-mono font-semibold">{isLivePreview ? SAMPLE_MERGE_DATA.driver_allowance : '₹250.00'}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 bg-slate-50 font-bold text-slate-900">
                      <span>Subtotal</span>
                      <span>—</span>
                      <span className="font-mono">{isLivePreview ? SAMPLE_MERGE_DATA.grand_total : '₹2,290.00'}</span>
                    </div>
                  </div>
                </div>
              ) : el.type === 'timeline' ? (
                <div className="w-full flex items-center justify-between font-sans text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Pickup Location</div>
                      <div className="font-semibold text-slate-800">{isLivePreview ? SAMPLE_MERGE_DATA.pickup : 'IGI Airport T3'}</div>
                    </div>
                  </div>
                  <div className="text-slate-300 px-4 font-bold">➔</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Drop Location</div>
                      <div className="font-semibold text-slate-800">{isLivePreview ? SAMPLE_MERGE_DATA.drop : 'DLF Cyber City'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap w-full break-words">
                  {renderContent(el.content)}
                </div>
              )}

              {/* Resize Bounding Bounding Dots if Selected */}
              {isSelected && (
                <>
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full" />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full" />
                </>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
