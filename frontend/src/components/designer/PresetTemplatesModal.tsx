'use client';

import React from 'react';
import { useTemplateDesigner, PresetTemplate } from './TemplateDesignerContext';

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'corporate_sleek',
    name: '1. Corporate Sleek',
    category: 'Corporate',
    description: 'Clean, professional dual-column header designed for corporate fleet billing.',
    paperSize: 'A4',
    backgroundColor: '#FFFFFF',
    elements: [
      { id: '1', type: 'text', category: 'Company', title: 'Company Header', content: '{{company_name}}', x: 40, y: 40, width: 350, height: 40, rotation: 0, opacity: 100, fontSize: 24, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'left', color: '#1E293B', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 1 },
      { id: '2', type: 'text', category: 'Company', title: 'Company Address', content: '{{company_address}}\nGSTIN: {{company_gst}}', x: 40, y: 85, width: 350, height: 50, rotation: 0, opacity: 100, fontSize: 11, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#64748B', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 2 },
      { id: '3', type: 'text', category: 'Invoice Details', title: 'Tax Invoice Title', content: 'TAX INVOICE', x: 440, y: 40, width: 310, height: 35, rotation: 0, opacity: 100, fontSize: 28, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'right', color: '#2563EB', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 3 },
      { id: '4', type: 'text', category: 'Invoice Details', title: 'Invoice Meta', content: 'Invoice No: {{invoice_no}}\nDate: {{date}}\nBooking ID: {{booking_id}}', x: 440, y: 80, width: 310, height: 55, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'medium', fontFamily: 'Inter', textAlign: 'right', color: '#334155', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 4 },
      { id: '5', type: 'divider', category: 'Extras', title: 'Divider', content: '', x: 40, y: 150, width: 710, height: 2, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#0F172A', backgroundColor: '#E2E8F0', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 5 },
      { id: '6', type: 'box', category: 'Customer', title: 'Billed To Card', content: 'BILLED TO:\n{{customer_name}}\n{{customer_address}}\nGSTIN: {{customer_gst}}', x: 40, y: 170, width: 340, height: 90, rotation: 0, opacity: 100, fontSize: 11, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#1E293B', backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'solid', boxShadow: 'none', padding: 12, zIndex: 6 },
      { id: '7', type: 'timeline', category: 'Cab Details', title: 'Ride Timeline', content: 'PICKUP: {{pickup}}\nDROP: {{drop}}', x: 40, y: 280, width: 710, height: 60, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'semibold', fontFamily: 'Inter', textAlign: 'left', color: '#1E40AF', backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'solid', boxShadow: 'none', padding: 12, zIndex: 7 },
      { id: '8', type: 'table', category: 'Fare Details', title: 'Operational Table', content: 'TABLE_GRID', x: 40, y: 360, width: 710, height: 220, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#0F172A', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 8 },
      { id: '9', type: 'box', category: 'Fare Details', title: 'Grand Total Banner', content: 'GRAND TOTAL: {{grand_total}}', x: 450, y: 600, width: 300, height: 50, rotation: 0, opacity: 100, fontSize: 18, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'center', color: '#FFFFFF', backgroundColor: '#2563EB', borderRadius: 8, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 12, zIndex: 9 },
      { id: '10', type: 'text', category: 'Extras', title: 'Terms & Conditions', content: 'Terms & Conditions:\n1. All payments strictly payable within 7 days.\n2. Tolls & MCD subject to actual receipts.', x: 40, y: 670, width: 710, height: 40, rotation: 0, opacity: 100, fontSize: 10, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#94A3B8', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 10 },
    ],
  },
  {
    id: 'executive_luxury',
    name: '2. Executive Luxury VIP',
    category: 'Luxury',
    description: 'Premium dark-navy header tailored for VIP, executive rentals, and luxury chauffeurs.',
    paperSize: 'A4',
    backgroundColor: '#FFFFFF',
    elements: [
      { id: '1', type: 'box', category: 'Company', title: 'Dark Header Bar', content: '', x: 40, y: 40, width: 710, height: 90, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#FFFFFF', backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 1 },
      { id: '2', type: 'text', category: 'Company', title: 'Company Name', content: '{{company_name}}', x: 60, y: 55, width: 350, height: 35, rotation: 0, opacity: 100, fontSize: 22, fontWeight: 'bold', fontFamily: 'Outfit', textAlign: 'left', color: '#FFFFFF', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 2 },
      { id: '3', type: 'text', category: 'Invoice Details', title: 'Invoice Badge', content: 'VIP RENTAL INVOICE', x: 440, y: 55, width: 290, height: 35, rotation: 0, opacity: 100, fontSize: 20, fontWeight: 'bold', fontFamily: 'Outfit', textAlign: 'right', color: '#F59E0B', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 3 },
      { id: '4', type: 'box', category: 'Customer', title: 'Client Info Box', content: 'GUEST / PASSENGER:\n{{customer_name}}\nVehicle: {{vehicle_model}} ({{vehicle_no}})', x: 40, y: 150, width: 710, height: 60, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'medium', fontFamily: 'Inter', textAlign: 'left', color: '#1E293B', backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FCD34D', borderStyle: 'solid', boxShadow: 'none', padding: 10, zIndex: 4 },
      { id: '5', type: 'table', category: 'Fare Details', title: 'Fare Breakdown', content: 'TABLE_GRID', x: 40, y: 230, width: 710, height: 220, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#0F172A', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 5 },
      { id: '6', type: 'box', category: 'Fare Details', title: 'Luxury Total Box', content: 'NET AMOUNT: {{grand_total}}', x: 450, y: 470, width: 300, height: 55, rotation: 0, opacity: 100, fontSize: 18, fontWeight: 'bold', fontFamily: 'Outfit', textAlign: 'center', color: '#FFFFFF', backgroundColor: '#0F172A', borderRadius: 8, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 12, zIndex: 6 },
    ],
  },
  {
    id: 'modern_minimalist',
    name: '3. Modern Minimalist',
    category: 'Minimal',
    description: 'Ultra-clean aesthetic with emerald accents, soft card containers, and modern typography.',
    paperSize: 'A4',
    backgroundColor: '#FFFFFF',
    elements: [
      { id: '1', type: 'text', category: 'Company', title: 'Company Header', content: '{{company_name}}', x: 40, y: 40, width: 400, height: 35, rotation: 0, opacity: 100, fontSize: 24, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'left', color: '#059669', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 1 },
      { id: '2', type: 'text', category: 'Invoice Details', title: 'Meta Summary', content: 'BILL NO: {{invoice_no}}  |  DATE: {{date}}', x: 40, y: 80, width: 400, height: 25, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'semibold', fontFamily: 'Inter', textAlign: 'left', color: '#475569', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 2 },
      { id: '3', type: 'box', category: 'Customer', title: 'Passenger Badge', content: 'PASSENGER: {{customer_name}}\nTRIP TYPE: {{trip_type}}', x: 460, y: 40, width: 290, height: 65, rotation: 0, opacity: 100, fontSize: 11, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#065F46', backgroundColor: '#ECFDF5', borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0', borderStyle: 'solid', boxShadow: 'none', padding: 10, zIndex: 3 },
      { id: '4', type: 'table', category: 'Fare Details', title: 'Fare Table', content: 'TABLE_GRID', x: 40, y: 130, width: 710, height: 220, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#0F172A', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 4 },
      { id: '5', type: 'box', category: 'Fare Details', title: 'Minimal Total', content: 'TOTAL PAYABLE: {{grand_total}}', x: 450, y: 370, width: 300, height: 50, rotation: 0, opacity: 100, fontSize: 16, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'center', color: '#FFFFFF', backgroundColor: '#059669', borderRadius: 8, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 12, zIndex: 5 },
    ],
  },
  {
    id: 'airport_express',
    name: '4. Airport Express (Thermal / Quick)',
    category: 'Airport',
    description: 'Streamlined receipt format tailored for fast airport transfers and thermal printers.',
    paperSize: 'THERMAL',
    backgroundColor: '#FFFFFF',
    elements: [
      { id: '1', type: 'text', category: 'Company', title: 'Header', content: '{{company_name}}\nAIRPORT TAXI SERVICE', x: 20, y: 20, width: 344, height: 40, rotation: 0, opacity: 100, fontSize: 16, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'center', color: '#0F172A', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 1 },
      { id: '2', type: 'divider', category: 'Extras', title: 'Line', content: '', x: 20, y: 70, width: 344, height: 2, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#0F172A', backgroundColor: '#0F172A', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 2 },
      { id: '3', type: 'text', category: 'Invoice Details', title: 'Details', content: 'Receipt: {{invoice_no}}\nDate: {{date}}\nGuest: {{customer_name}}\nVehicle: {{vehicle_no}}', x: 20, y: 80, width: 344, height: 75, rotation: 0, opacity: 100, fontSize: 11, fontWeight: 'normal', fontFamily: 'Courier New', textAlign: 'left', color: '#334155', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 3 },
      { id: '4', type: 'table', category: 'Fare Details', title: 'Table', content: 'TABLE_GRID', x: 20, y: 165, width: 344, height: 180, rotation: 0, opacity: 100, fontSize: 11, fontWeight: 'normal', fontFamily: 'Courier New', textAlign: 'left', color: '#0F172A', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 4 },
      { id: '5', type: 'text', category: 'Fare Details', title: 'Total', content: 'TOTAL: {{grand_total}}', x: 20, y: 360, width: 344, height: 35, rotation: 0, opacity: 100, fontSize: 18, fontWeight: 'bold', fontFamily: 'Courier New', textAlign: 'center', color: '#0F172A', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 5 },
    ],
  },
  {
    id: 'outstation_travel',
    name: '5. Outstation Travel Voucher',
    category: 'Travel',
    description: 'Detailed multi-day outstation voucher format with driver details and signature lines.',
    paperSize: 'A4',
    backgroundColor: '#FFFFFF',
    elements: [
      { id: '1', type: 'text', category: 'Company', title: 'Company Name', content: '{{company_name}}', x: 40, y: 40, width: 400, height: 35, rotation: 0, opacity: 100, fontSize: 24, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'left', color: '#4F46E5', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 1 },
      { id: '2', type: 'text', category: 'Invoice Details', title: 'Voucher Badge', content: 'OUTSTATION DUTY VOUCHER', x: 440, y: 40, width: 310, height: 35, rotation: 0, opacity: 100, fontSize: 20, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'right', color: '#4F46E5', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 2 },
      { id: '3', type: 'box', category: 'Cab Details', title: 'Driver Card', content: 'DRIVER: {{driver_name}} ({{driver_phone}})\nVEHICLE: {{vehicle_model}} ({{vehicle_no}})', x: 40, y: 95, width: 710, height: 50, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'semibold', fontFamily: 'Inter', textAlign: 'left', color: '#312E81', backgroundColor: '#EEF2FF', borderRadius: 8, borderWidth: 1, borderColor: '#C7D2FE', borderStyle: 'solid', boxShadow: 'none', padding: 10, zIndex: 3 },
      { id: '4', type: 'table', category: 'Fare Details', title: 'Table', content: 'TABLE_GRID', x: 40, y: 160, width: 710, height: 220, rotation: 0, opacity: 100, fontSize: 12, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', color: '#0F172A', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 4 },
      { id: '5', type: 'box', category: 'Fare Details', title: 'Total Banner', content: 'GRAND TOTAL: {{grand_total}}', x: 450, y: 400, width: 300, height: 50, rotation: 0, opacity: 100, fontSize: 18, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'center', color: '#FFFFFF', backgroundColor: '#4F46E5', borderRadius: 8, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 12, zIndex: 5 },
      { id: '6', type: 'text', category: 'Extras', title: 'Signatures', content: 'Client Signature: ___________________          Driver Signature: ___________________', x: 40, y: 480, width: 710, height: 35, rotation: 0, opacity: 100, fontSize: 11, fontWeight: 'semibold', fontFamily: 'Inter', textAlign: 'center', color: '#64748B', backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: '', borderStyle: 'none', boxShadow: 'none', padding: 0, zIndex: 6 },
    ],
  },
];

export default function PresetTemplatesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { loadTemplate } = useTemplateDesigner();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 select-none">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              ✨ 5 Professional Invoice Presets
            </h3>
            <p className="text-xs text-slate-500">Select any of the 5 layouts below to customize fonts, colors, and content instantly.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            ❌
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          {PRESET_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                loadTemplate(tmpl);
                onClose();
              }}
              className="group border border-slate-200 rounded-xl p-5 hover:border-blue-600 hover:shadow-xl transition cursor-pointer bg-white flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {tmpl.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{tmpl.paperSize}</span>
                </div>
                <h4 className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition mb-1">
                  {tmpl.name}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">{tmpl.description}</p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadTemplate(tmpl);
                  onClose();
                }}
                className="w-full py-2 bg-slate-50 group-hover:bg-blue-600 text-slate-700 group-hover:text-white rounded-lg text-xs font-semibold transition text-center shadow-sm"
              >
                Choose & Customize
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
