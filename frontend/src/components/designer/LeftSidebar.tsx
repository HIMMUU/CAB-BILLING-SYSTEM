'use client';

import React, { useState } from 'react';
import { useTemplateDesigner, CanvasElement, PresetTemplate } from './TemplateDesignerContext';
import { PRESET_TEMPLATES } from './PresetTemplatesModal';

interface ElementLibraryItem {
  category: string;
  title: string;
  type: 'text' | 'image' | 'table' | 'box' | 'divider' | 'timeline' | 'qr';
  content: string;
  icon: string;
  initialProps?: Partial<CanvasElement>;
}

const LIBRARY_ITEMS: ElementLibraryItem[] = [
  // Company Elements
  { category: 'Company', title: 'Company Header', type: 'text', content: '{{company_name}}', icon: '🏢', initialProps: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' } },
  { category: 'Company', title: 'Company Address', type: 'text', content: '{{company_address}}', icon: '📍', initialProps: { fontSize: 12, color: '#64748B' } },
  { category: 'Company', title: 'GSTIN Number', type: 'text', content: 'GSTIN: {{company_gst}}', icon: '💳', initialProps: { fontSize: 12, fontWeight: 'semibold', color: '#334155' } },
  { category: 'Company', title: 'Company Contact', type: 'text', content: 'Ph: {{company_phone}} | Email: {{company_email}}', icon: '📞', initialProps: { fontSize: 11, color: '#64748B' } },
  
  // Customer Elements
  { category: 'Customer', title: 'Billed To Card', type: 'box', content: 'BILLED TO:\n{{customer_name}}\n{{customer_address}}\nGSTIN: {{customer_gst}}', icon: '👤', initialProps: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, width: 300, height: 100, fontSize: 12 } },
  { category: 'Customer', title: 'Customer Name', type: 'text', content: '{{customer_name}}', icon: '🏷️', initialProps: { fontSize: 14, fontWeight: 'bold' } },

  // Invoice Details
  { category: 'Invoice Details', title: 'Invoice Title Badge', type: 'text', content: 'TAX INVOICE', icon: '📄', initialProps: { fontSize: 28, fontWeight: 'bold', color: '#2563EB', textAlign: 'right' } },
  { category: 'Invoice Details', title: 'Invoice Meta Grid', type: 'text', content: 'Invoice No: {{invoice_no}}\nBooking ID: {{booking_id}}\nDate: {{date}}\nDue Date: {{due_date}}', icon: '📆', initialProps: { fontSize: 12, textAlign: 'right', color: '#334155' } },
  { category: 'Invoice Details', title: 'Payment Status Badge', type: 'text', content: '[ {{status}} ]', icon: '🏷️', initialProps: { fontSize: 14, fontWeight: 'bold', color: '#16A34A', textAlign: 'right' } },

  // Cab Details
  { category: 'Cab Details', title: 'Ride Timeline Card', type: 'timeline', content: 'PICKUP: {{pickup}}\nDROP: {{drop}}', icon: '🚖', initialProps: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, padding: 12, width: 690, height: 70, fontSize: 12, color: '#1E40AF' } },
  { category: 'Cab Details', title: 'Driver & Vehicle Info', type: 'text', content: 'Vehicle: {{vehicle_model}} ({{vehicle_no}})\nDriver: {{driver_name}} ({{driver_phone}})', icon: '🚘', initialProps: { fontSize: 12, fontWeight: 'medium', color: '#1E293B' } },

  // Fare Details & Tables
  { category: 'Fare Details', title: 'Operational Fare Table', type: 'table', content: 'TABLE_GRID', icon: '📊', initialProps: { width: 690, height: 200 } },
  { category: 'Fare Details', title: 'Grand Total Banner', type: 'box', content: 'GRAND TOTAL: {{grand_total}}', icon: '💰', initialProps: { backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', borderRadius: 8, padding: 12, width: 300, height: 50, textAlign: 'center' } },

  // Extras & Footer
  { category: 'Extras', title: 'Terms & Conditions', type: 'text', content: 'Terms & Conditions:\n1. All payments strictly payable via UPI or Net Banking within 7 days.\n2. Tolls, MCD & Parking subject to actual receipts.', icon: '📜', initialProps: { fontSize: 10, color: '#94A3B8', width: 690, height: 50 } },
  { category: 'Extras', title: 'Authorized Signature', type: 'text', content: '_______________________\nAuthorized Signatory', icon: '✍️', initialProps: { fontSize: 12, fontWeight: 'semibold', textAlign: 'right', width: 200 } },
  { category: 'Extras', title: 'Divider Line', type: 'divider', content: '', icon: '➖', initialProps: { width: 690, height: 2, backgroundColor: '#E2E8F0' } },
];

export default function LeftSidebar() {
  const { addElement, activeTab, setActiveTab, loadTemplate } = useTemplateDesigner();
  const [searchTerm, setSearchTerm] = useState('');

  const categories = Array.from(new Set(LIBRARY_ITEMS.map((item) => item.category)));

  const filteredItems = LIBRARY_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-80 bg-white border-r border-[#E2E8F0] flex flex-col h-full z-10 shrink-0 select-none">
      {/* Sidebar Tabs */}
      <div className="flex border-b border-[#E2E8F0] bg-slate-50/50 p-1.5 gap-1">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
            activeTab === 'elements' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🧩 Elements
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
            activeTab === 'templates' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ✨ Presets
        </button>
      </div>

      {activeTab === 'elements' ? (
        <>
          {/* Search Box */}
          <div className="p-3 border-b border-[#E2E8F0]">
            <input
              type="text"
              placeholder="Search components..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Component Accordion Library */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {categories.map((cat) => {
              const catItems = filteredItems.filter((item) => item.category === cat);
              if (catItems.length === 0) return null;

              return (
                <div key={cat} className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                    {cat}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {catItems.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => addElement(item.category, item.title, item.type, item.content, item.initialProps)}
                        className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition group text-center"
                      >
                        <span className="text-2xl mb-1 group-hover:scale-110 transition">{item.icon}</span>
                        <span className="text-[11px] font-semibold text-slate-700 group-hover:text-blue-600 line-clamp-1">
                          {item.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
            5 Ready Presets
          </h4>
          {PRESET_TEMPLATES.map((tmpl: PresetTemplate) => (
            <div
              key={tmpl.id}
              onClick={() => loadTemplate(tmpl)}
              className="group border border-slate-200 hover:border-blue-600 rounded-xl p-3 bg-white hover:shadow-md cursor-pointer transition"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                  {tmpl.category}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{tmpl.paperSize}</span>
              </div>
              <h5 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                {tmpl.name}
              </h5>
              <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 mb-2">{tmpl.description}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadTemplate(tmpl);
                }}
                className="w-full py-1.5 bg-slate-50 group-hover:bg-blue-600 text-slate-700 group-hover:text-white rounded text-[11px] font-semibold transition"
              >
                Apply Preset
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
