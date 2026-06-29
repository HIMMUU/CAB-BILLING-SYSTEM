'use client';

import React, { createContext, useContext, useState } from 'react';

export type PaperSize = 'A4' | 'LETTER' | 'THERMAL' | 'LANDSCAPE';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'table' | 'box' | 'divider' | 'timeline' | 'qr';
  category: string;
  title: string;
  content: string; // Plain text or merge tag like {{company_name}}
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted';
  boxShadow: string;
  padding: number;
  zIndex: number;
  isLocked?: boolean;
}

export interface PresetTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  paperSize: PaperSize;
  backgroundColor: string;
  elements: CanvasElement[];
}

interface TemplateDesignerContextType {
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  selectedElement: CanvasElement | null;
  updateSelectedElement: (updates: Partial<CanvasElement>) => void;
  addElement: (category: string, title: string, type: CanvasElement['type'], content: string, initialProps?: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  paperSize: PaperSize;
  setPaperSize: (size: PaperSize) => void;
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  isLivePreview: boolean;
  setIsLivePreview: (live: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  loadTemplate: (template: PresetTemplate) => void;
  resetCanvas: () => void;
  activeTab: 'elements' | 'templates' | 'brand';
  setActiveTab: (tab: 'elements' | 'templates' | 'brand') => void;
}

const TemplateDesignerContext = createContext<TemplateDesignerContextType | undefined>(undefined);

export const SAMPLE_MERGE_DATA: Record<string, string> = {
  company_name: 'Travel Dream Holiday Cabs',
  company_address: 'Suite 402, Business Tower, Connaught Place, New Delhi',
  company_gst: '07AAAAA0000A1Z5',
  company_phone: '+91 98765 43210',
  company_email: 'billing@traveldream.com',
  company_website: 'www.traveldreamcabs.com',
  customer_name: 'Acme Corporate Pvt Ltd',
  customer_address: 'Building 10B, DLF Cyber City, Gurugram',
  customer_gst: '06BBBCC1111B2Z8',
  invoice_no: 'INV-2026-0842',
  booking_id: 'BK-99201',
  date: '29/06/2026',
  due_date: '05/07/2026',
  pickup: 'IGI Airport Terminal 3, New Delhi',
  drop: 'DLF Phase 2, Gurugram',
  driver_name: 'Ramesh Kumar',
  driver_phone: '+91 91234 56789',
  vehicle_no: 'DL01AB1234',
  vehicle_model: 'Toyota Innova Crysta',
  trip_type: 'Local (8h / 80km)',
  base_fare: '₹1,800.00',
  extra_km: '₹240.00',
  extra_hrs: '₹100.00',
  driver_allowance: '₹250.00',
  night_allowance: '₹200.00',
  tolls_parking: '₹150.00',
  cgst: '₹63.50',
  sgst: '₹63.50',
  grand_total: '₹2,667.00',
  status: 'PAID',
};

export function TemplateDesignerProvider({ children }: { children: React.ReactNode }) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [zoom, setZoom] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [isLivePreview, setIsLivePreview] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'elements' | 'templates' | 'brand'>('elements');

  // History state for Undo / Redo
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Helper to push history
  const saveStateToHistory = (newElements: CanvasElement[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    setHistory([...updatedHistory, newElements]);
    setHistoryIndex(updatedHistory.length);
  };

  const updateElementsState = (action: React.SetStateAction<CanvasElement[]>) => {
    setElements((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      saveStateToHistory(next);
      return next;
    });
  };

  const addElement = (
    category: string,
    title: string,
    type: CanvasElement['type'],
    content: string,
    initialProps?: Partial<CanvasElement>
  ) => {
    const newId = 'el_' + Math.random().toString(36).substr(2, 9);
    const maxZ = elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
    
    const newEl: CanvasElement = {
      id: newId,
      type,
      category,
      title,
      content,
      x: initialProps?.x ?? 50,
      y: initialProps?.y ?? 50 + elements.length * 20,
      width: initialProps?.width ?? (type === 'table' ? 690 : type === 'divider' ? 690 : 250),
      height: initialProps?.height ?? (type === 'table' ? 220 : type === 'divider' ? 2 : 40),
      rotation: 0,
      opacity: 100,
      fontSize: initialProps?.fontSize ?? (title.includes('Title') || title.includes('Header') || title.includes('Invoice') ? 22 : 13),
      fontWeight: initialProps?.fontWeight ?? (title.includes('Header') || title.includes('Total') ? 'bold' : 'normal'),
      fontFamily: initialProps?.fontFamily ?? 'Inter',
      textAlign: initialProps?.textAlign ?? 'left',
      color: initialProps?.color ?? '#0F172A',
      backgroundColor: initialProps?.backgroundColor ?? 'transparent',
      borderRadius: initialProps?.borderRadius ?? 0,
      borderWidth: initialProps?.borderWidth ?? 0,
      borderColor: initialProps?.borderColor ?? '#E2E8F0',
      borderStyle: initialProps?.borderStyle ?? 'none',
      boxShadow: initialProps?.boxShadow ?? 'none',
      padding: initialProps?.padding ?? 4,
      zIndex: maxZ + 1,
      ...initialProps,
    };

    updateElementsState((prev) => [...prev, newEl]);
    setSelectedElementId(newId);
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  const updateSelectedElement = (updates: Partial<CanvasElement>) => {
    if (!selectedElementId) return;
    updateElementsState((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, ...updates } : el))
    );
  };

  const deleteElement = (id: string) => {
    updateElementsState((prev) => prev.filter((el) => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const duplicateElement = (id: string) => {
    const target = elements.find((el) => el.id === id);
    if (!target) return;
    const newId = 'el_' + Math.random().toString(36).substr(2, 9);
    const duplicated: CanvasElement = {
      ...target,
      id: newId,
      x: target.x + 20,
      y: target.y + 20,
      zIndex: elements.reduce((max, el) => Math.max(max, el.zIndex), 0) + 1,
    };
    updateElementsState((prev) => [...prev, duplicated]);
    setSelectedElementId(newId);
  };

  const bringForward = (id: string) => {
    updateElementsState((prev) =>
      prev.map((el) => (el.id === id ? { ...el, zIndex: el.zIndex + 1 } : el))
    );
  };

  const sendBackward = (id: string) => {
    updateElementsState((prev) =>
      prev.map((el) => (el.id === id ? { ...el, zIndex: Math.max(0, el.zIndex - 1) } : el))
    );
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setElements(history[prevIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setElements(history[nextIndex]);
    }
  };

  const loadTemplate = (template: PresetTemplate) => {
    setPaperSize(template.paperSize);
    const freshElements = template.elements.map((el, idx) => ({
      ...el,
      id: 'tmpl_el_' + idx + '_' + Math.random().toString(36).substr(2, 7),
    }));
    updateElementsState(freshElements);
    setSelectedElementId(null);
  };

  const resetCanvas = () => {
    updateElementsState([]);
    setSelectedElementId(null);
  };

  return (
    <TemplateDesignerContext.Provider
      value={{
        elements,
        setElements,
        selectedElementId,
        setSelectedElementId,
        selectedElement,
        updateSelectedElement,
        addElement,
        deleteElement,
        duplicateElement,
        bringForward,
        sendBackward,
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
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        loadTemplate,
        resetCanvas,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </TemplateDesignerContext.Provider>
  );
}

export function useTemplateDesigner() {
  const context = useContext(TemplateDesignerContext);
  if (!context) {
    throw new Error('useTemplateDesigner must be used within a TemplateDesignerProvider');
  }
  return context;
}
