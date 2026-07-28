'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

interface SmtpAccount {
  id: string;
  accountName: string;
  provider: string;
  host: string;
  port: number;
  username: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  isDefault: boolean;
  isActive: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  key: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  isActive: boolean;
}

interface EmailAutomation {
  id: string;
  name: string;
  trigger: string;
  recipientType: string;
  templateId: string;
  attachPdf: string;
  delayMinutes: number;
  isActive: boolean;
  template?: { name: string; key: string };
}

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  htmlBody?: string;
  status: 'QUEUED' | 'SENT' | 'FAILED' | 'RETRYING';
  errorMessage?: string;
  attachmentName?: string;
  sentAt?: string;
  createdAt: string;
  smtpAccount?: { accountName: string; fromEmail: string };
}

interface Analytics {
  sentToday: number;
  totalSent: number;
  totalFailed: number;
  totalQueued: number;
  deliveryRate: string;
}

export default function CommunicationPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'smtp' | 'templates' | 'automations' | 'logs'>('overview');
  
  // Data States
  const [analytics, setAnalytics] = useState<Analytics>({ sentToday: 0, totalSent: 0, totalFailed: 0, totalQueued: 0, deliveryRate: '100%' });
  const [smtpAccounts, setSmtpAccounts] = useState<SmtpAccount[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [logSearch, setLogSearch] = useState('');
  const [logStatus, setLogStatus] = useState('ALL');

  // Modals & Forms
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    htmlBody: '',
    attachType: 'NONE' as 'NONE' | 'INVOICE' | 'DUTY_SLIP',
    invoiceId: '',
    dutySlipId: '',
    smtpAccountId: '',
  });

  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [smtpForm, setSmtpForm] = useState<Partial<SmtpAccount> & { password?: string }>({
    accountName: '',
    provider: 'GMAIL',
    host: 'smtp.gmail.com',
    port: 587,
    username: '',
    password: '',
    fromName: '',
    fromEmail: '',
    replyTo: '',
    isDefault: false,
  });

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<Partial<EmailTemplate>>({
    name: '',
    key: 'CUSTOM',
    subject: '',
    htmlContent: '',
  });

  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [automationForm, setAutomationForm] = useState<Partial<EmailAutomation>>({
    name: '',
    trigger: 'INVOICE_GENERATED',
    recipientType: 'CUSTOMER',
    templateId: '',
    attachPdf: 'INVOICE',
    delayMinutes: 0,
    isActive: true,
  });

  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null);
  const [testConnectionStatus, setTestConnectionStatus] = useState<{ testing: boolean; message?: string; success?: boolean }>({ testing: false });
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, smtpRes, templatesRes, automationsRes, logsRes] = await Promise.all([
        api.request('/communication/analytics'),
        api.request('/communication/smtp'),
        api.request('/communication/templates'),
        api.request('/communication/automations'),
        api.request('/communication/logs'),
      ]);

      if (analyticsRes) setAnalytics(analyticsRes);
      if (smtpRes) setSmtpAccounts(smtpRes);
      if (templatesRes) setTemplates(templatesRes);
      if (automationsRes) setAutomations(automationsRes);
      if (logsRes) setLogs(logsRes);
    } catch (err) {
      console.error('Failed to load communication data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const query = new URLSearchParams();
      if (logSearch) query.set('search', logSearch);
      if (logStatus !== 'ALL') query.set('status', logStatus);
      const res = await api.request(`/communication/logs?${query.toString()}`);
      if (res) setLogs(res);
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
    }
  };

  // ─── Actions ───
  const handleTestSmtpConnection = async () => {
    setTestConnectionStatus({ testing: true });
    try {
      const res = await api.request('/communication/smtp/test', {
        method: 'POST',
        body: JSON.stringify(smtpForm),
      });
      setTestConnectionStatus({ testing: false, success: res.success, message: res.message });
    } catch (err: any) {
      setTestConnectionStatus({ testing: false, success: false, message: err.message || 'Connection test failed' });
    }
  };

  const handleSaveSmtpAccount = async () => {
    try {
      if (smtpForm.id) {
        await api.request(`/communication/smtp/${smtpForm.id}`, { method: 'PUT', body: JSON.stringify(smtpForm) });
      } else {
        await api.request('/communication/smtp', { method: 'POST', body: JSON.stringify(smtpForm) });
      }
      setIsSmtpModalOpen(false);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Failed to save SMTP account');
    }
  };

  const handleDeleteSmtp = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SMTP account?')) return;
    await api.request(`/communication/smtp/${id}`, { method: 'DELETE' });
    fetchInitialData();
  };

  const handleSaveTemplate = async () => {
    try {
      if (templateForm.id) {
        await api.request(`/communication/templates/${templateForm.id}`, { method: 'PUT', body: JSON.stringify(templateForm) });
      } else {
        await api.request('/communication/templates', { method: 'POST', body: JSON.stringify(templateForm) });
      }
      setIsTemplateModalOpen(false);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    await api.request(`/communication/templates/${id}`, { method: 'DELETE' });
    fetchInitialData();
  };

  const handleSaveAutomation = async () => {
    try {
      if (automationForm.id) {
        await api.request(`/communication/automations/${automationForm.id}`, { method: 'PUT', body: JSON.stringify(automationForm) });
      } else {
        await api.request('/communication/automations', { method: 'POST', body: JSON.stringify(automationForm) });
      }
      setIsAutomationModalOpen(false);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Failed to save automation rule');
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    await api.request(`/communication/automations/${id}`, { method: 'DELETE' });
    fetchInitialData();
  };

  const handleSendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);
    try {
      await api.request('/communication/send', {
        method: 'POST',
        body: JSON.stringify(composeForm),
      });
      alert('Email sent successfully!');
      setIsComposeOpen(false);
      setComposeForm({ to: '', cc: '', bcc: '', subject: '', htmlBody: '', attachType: 'NONE', invoiceId: '', dutySlipId: '', smtpAccountId: '' });
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleResend = async (logId: string) => {
    try {
      await api.request(`/communication/resend/${logId}`, { method: 'POST' });
      alert('Email resent successfully!');
      fetchInitialData();
    } catch (err: any) {
      alert(err.message || 'Failed to resend email');
    }
  };

  const insertVariableTag = (tag: string) => {
    setTemplateForm(f => ({
      ...f,
      htmlContent: (f.htmlContent || '') + ` {{${tag}}} `,
    }));
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Communication Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">Enterprise Email Automation, Multi-Provider SMTP, Templates & Real-time Audit Logs</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Compose Email
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        {[
          { key: 'overview', label: 'Dashboard & Overview' },
          { key: 'smtp', label: 'SMTP Accounts' },
          { key: 'templates', label: 'Email Templates' },
          { key: 'automations', label: 'Automation Rules' },
          { key: 'logs', label: 'Sent History & Logs' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 transition border-b-2 cursor-pointer ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB 1: OVERVIEW ══════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sent Today</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{analytics.sentToday}</span>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Delivered</span>
              <span className="text-2xl font-bold text-emerald-600 mt-1 block">{analytics.totalSent}</span>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Queued</span>
              <span className="text-2xl font-bold text-amber-600 mt-1 block">{analytics.totalQueued}</span>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Failed</span>
              <span className="text-2xl font-bold text-rose-600 mt-1 block">{analytics.totalFailed}</span>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Rate</span>
              <span className="text-2xl font-bold text-blue-600 mt-1 block">{analytics.deliveryRate}</span>
            </div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Quick Communication Actions</h3>
              <p className="text-xs text-slate-500">Dispatch emails directly with pre-filled attachments.</p>
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <span>Compose Custom Email</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button
                  onClick={() => {
                    setComposeForm(f => ({ ...f, attachType: 'INVOICE', subject: 'Tax Invoice Notice' }));
                    setIsComposeOpen(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <span>Send Invoice PDF</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            {/* Recent Email Activity */}
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Recent Email Dispatch Log</h3>
                <button onClick={() => setActiveTab('logs')} className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">View All Logs</button>
              </div>

              {logs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">No email dispatches recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 block">{log.recipient}</span>
                        <span className="text-[11px] text-slate-400 block">{log.subject}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          log.status === 'SENT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          log.status === 'FAILED' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                          'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB 2: SMTP ACCOUNTS ══════════════ */}
      {activeTab === 'smtp' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Configured SMTP Accounts</h2>
            <button
              onClick={() => {
                setSmtpForm({ accountName: '', provider: 'GMAIL', host: 'smtp.gmail.com', port: 587, username: '', password: '', fromName: '', fromEmail: '', isDefault: smtpAccounts.length === 0 });
                setIsSmtpModalOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              + Add SMTP Account
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="p-3">Account Name</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Host & Port</th>
                  <th className="p-3">Sender Email</th>
                  <th className="p-3 text-center">Default</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {smtpAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">No SMTP accounts configured. Click "+ Add SMTP Account" to set up credentials.</td>
                  </tr>
                ) : (
                  smtpAccounts.map(acc => (
                    <tr key={acc.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{acc.accountName}</td>
                      <td className="p-3 text-slate-600"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">{acc.provider}</span></td>
                      <td className="p-3 font-mono text-slate-600">{acc.host}:{acc.port}</td>
                      <td className="p-3 text-slate-800">{acc.fromName} &lt;{acc.fromEmail}&gt;</td>
                      <td className="p-3 text-center">
                        {acc.isDefault && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full font-bold text-[10px]">DEFAULT</span>}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSmtpForm(acc);
                              setIsSmtpModalOpen(true);
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSmtp(acc.id)}
                            className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ TAB 3: EMAIL TEMPLATES ══════════════ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Reusable Email Templates</h2>
            <button
              onClick={() => {
                setTemplateForm({ name: '', key: 'CUSTOM', subject: '', htmlContent: '' });
                setIsTemplateModalOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              + Create Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(tpl => (
              <div key={tpl.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">{tpl.name}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-[10px] font-bold">{tpl.key}</span>
                </div>
                <p className="text-xs text-slate-500 truncate"><strong>Subject:</strong> {tpl.subject}</p>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setTemplateForm(tpl);
                      setIsTemplateModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold transition cursor-pointer"
                  >
                    Edit Template
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="px-2.5 py-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded text-xs font-semibold transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ TAB 4: AUTOMATIONS ══════════════ */}
      {activeTab === 'automations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Event-Based Automation Rules</h2>
            <button
              onClick={() => {
                setAutomationForm({ name: '', trigger: 'INVOICE_GENERATED', recipientType: 'CUSTOMER', templateId: templates[0]?.id || '', attachPdf: 'INVOICE', delayMinutes: 0, isActive: true });
                setIsAutomationModalOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              + Create Automation Rule
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="p-3">Rule Name</th>
                  <th className="p-3">Trigger Event</th>
                  <th className="p-3">Template Used</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {automations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">No automation rules configured. Click "+ Create Automation Rule" to add one.</td>
                  </tr>
                ) : (
                  automations.map(auto => (
                    <tr key={auto.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{auto.name}</td>
                      <td className="p-3 font-mono text-blue-600">{auto.trigger}</td>
                      <td className="p-3 text-slate-700">{auto.template?.name || '—'}</td>
                      <td className="p-3 text-slate-600">{auto.recipientType}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${auto.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                          {auto.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleDeleteAutomation(auto.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition cursor-pointer">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ TAB 5: SENT LOGS ══════════════ */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
            <input
              type="text"
              placeholder="Search by recipient email or subject..."
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchLogs()}
              className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center gap-2">
              <select
                value={logStatus}
                onChange={e => {
                  setLogStatus(e.target.value);
                  fetchLogs();
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="QUEUED">Queued</option>
              </select>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Attachment</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">No email logs found matching search filters.</td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{log.recipient}</td>
                      <td className="p-3 text-slate-700">{log.subject}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          log.status === 'SENT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          log.status === 'FAILED' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                          'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{log.attachmentName || '—'}</td>
                      <td className="p-3 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setPreviewLog(log)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition cursor-pointer">View</button>
                          {log.status === 'FAILED' && (
                            <button onClick={() => handleResend(log.id)} className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[11px] font-semibold transition cursor-pointer">Resend</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 1: COMPOSE EMAIL ══════════════ */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Compose Email Dispatch</h3>
              <button onClick={() => setIsComposeOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSendCompose} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">To Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="client@example.com"
                    value={composeForm.to}
                    onChange={e => setComposeForm(f => ({ ...f, to: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CC Email (Optional)</label>
                  <input
                    type="text"
                    placeholder="accounts@example.com"
                    value={composeForm.cc}
                    onChange={e => setComposeForm(f => ({ ...f, cc: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject Line *</label>
                <input
                  type="text"
                  required
                  placeholder="Tax Invoice / Duty Slip Details"
                  value={composeForm.subject}
                  onChange={e => setComposeForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Body (HTML Supported) *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Type your message content here..."
                  value={composeForm.htmlBody}
                  onChange={e => setComposeForm(f => ({ ...f, htmlBody: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsComposeOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={sendingEmail} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer">
                  {sendingEmail ? 'Sending...' : 'Send Email Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 2: SMTP SETUP & TEST ══════════════ */}
      {isSmtpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">{smtpForm.id ? 'Edit SMTP Account' : 'Configure SMTP Credentials'}</h3>
              <button onClick={() => setIsSmtpModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Label *</label>
                  <input
                    type="text"
                    placeholder="e.g. Gmail Main / SES Billing"
                    value={smtpForm.accountName || ''}
                    onChange={e => setSmtpForm(f => ({ ...f, accountName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Provider Preset</label>
                  <select
                    value={smtpForm.provider || 'GMAIL'}
                    onChange={e => {
                      const p = e.target.value;
                      let h = 'smtp.gmail.com';
                      let port = 587;
                      if (p === 'SES') { h = 'email-smtp.us-east-1.amazonaws.com'; port = 587; }
                      else if (p === 'RESEND') { h = 'smtp.resend.com'; port = 465; }
                      else if (p === 'OUTLOOK') { h = 'smtp.office365.com'; port = 587; }
                      setSmtpForm(f => ({ ...f, provider: p, host: h, port }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="GMAIL">Gmail SMTP</option>
                    <option value="SES">Amazon SES</option>
                    <option value="RESEND">Resend</option>
                    <option value="OUTLOOK">Outlook / Office365</option>
                    <option value="ZOHO">Zoho Mail</option>
                    <option value="CUSTOM">Custom SMTP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">SMTP Host *</label>
                  <input
                    type="text"
                    value={smtpForm.host || ''}
                    onChange={e => setSmtpForm(f => ({ ...f, host: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Port *</label>
                  <input
                    type="number"
                    value={smtpForm.port || 587}
                    onChange={e => setSmtpForm(f => ({ ...f, port: parseInt(e.target.value) || 587 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username / Email *</label>
                  <input
                    type="text"
                    value={smtpForm.username || ''}
                    onChange={e => setSmtpForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password / App Key *</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={smtpForm.password || ''}
                    onChange={e => setSmtpForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">From Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Travel Dream Billing"
                    value={smtpForm.fromName || ''}
                    onChange={e => setSmtpForm(f => ({ ...f, fromName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">From Email *</label>
                  <input
                    type="email"
                    placeholder="billing@traveldream.com"
                    value={smtpForm.fromEmail || ''}
                    onChange={e => setSmtpForm(f => ({ ...f, fromEmail: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {testConnectionStatus.message && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${testConnectionStatus.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {testConnectionStatus.message}
                </div>
              )}

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleTestSmtpConnection}
                  disabled={testConnectionStatus.testing}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {testConnectionStatus.testing ? 'Testing...' : '⚡ Test Connection'}
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsSmtpModalOpen(false)} className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="button" onClick={handleSaveSmtpAccount} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer">Save Account</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 3: TEMPLATE EDIT ══════════════ */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">{templateForm.id ? 'Edit Template' : 'Create Email Template'}</h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={templateForm.name || ''}
                    onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">System Key *</label>
                  <input
                    type="text"
                    value={templateForm.key || ''}
                    onChange={e => setTemplateForm(f => ({ ...f, key: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Line *</label>
                <input
                  type="text"
                  value={templateForm.subject || ''}
                  onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <span className="block font-bold text-slate-700 mb-1.5">Insert Dynamic Variables:</span>
                <div className="flex flex-wrap gap-1.5 pb-2">
                  {['customer_name', 'company_name', 'booking_number', 'trip_date', 'pickup', 'drop', 'driver_name', 'driver_phone', 'vehicle', 'vehicle_number', 'invoice_number', 'invoice_amount', 'due_date', 'duty_slip_number'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertVariableTag(tag)}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-mono cursor-pointer"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">HTML Template Content *</label>
                <textarea
                  rows={10}
                  value={templateForm.htmlContent || ''}
                  onChange={e => setTemplateForm(f => ({ ...f, htmlContent: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                <button type="button" onClick={handleSaveTemplate} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer">Save Template</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 4: LOG PREVIEW ══════════════ */}
      {previewLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Email Body Preview</h3>
                <span className="text-[11px] text-slate-400">To: {previewLog.recipient}</span>
              </div>
              <button onClick={() => setPreviewLog(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                Subject: {previewLog.subject}
              </div>
              <div
                className="p-4 border border-slate-200 rounded-xl text-xs space-y-2 bg-white"
                dangerouslySetInnerHTML={{ __html: previewLog.htmlBody || '<p class="text-slate-400">No HTML body</p>' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
