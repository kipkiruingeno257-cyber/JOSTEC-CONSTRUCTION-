import React, { useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Mail,
  Phone,
  Reply,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminSessionMode } from '../../context/FirebaseContext';
import {
  createEmailLog,
  deleteInquiry,
  updateInquiryStatus,
} from '../../services/firestoreService';
import { deleteLocalInquiry, updateLocalInquiryStatus } from '../../services/localMediaService';
import { sendAdminClientReply } from '../../services/notificationService';
import type { InquiryRecord, InquiryStatus } from '../../types';

interface InquiriesManagerProps {
  mode: AdminSessionMode;
  inquiries: InquiryRecord[];
  onNotify: (type: 'success' | 'error', text: string) => void;
  onLocalMutated?: () => Promise<void> | void;
  onOpenNotifications?: () => void;
}

function escapeCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const InquiriesManager: React.FC<InquiriesManagerProps> = ({
  mode,
  inquiries,
  onNotify,
  onLocalMutated,
  onOpenNotifications,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | InquiryStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const filteredInquiries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inquiries.filter((inq) => {
      const matchesStatus = statusFilter === 'all' || inq.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        inq.name.toLowerCase().includes(q) ||
        inq.serviceType.toLowerCase().includes(q) ||
        inq.phone.toLowerCase().includes(q) ||
        inq.email.toLowerCase().includes(q) ||
        inq.message.toLowerCase().includes(q)
      );
    });
  }, [inquiries, statusFilter, searchQuery]);

  const handleStatus = async (id: string, status: InquiryStatus) => {
    try {
      if (mode === 'local') {
        await updateLocalInquiryStatus(id, status);
        await onLocalMutated?.();
      } else {
        await updateInquiryStatus(id, status);
      }
      onNotify('success', `Inquiry marked as ${status}.`);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to update inquiry.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (mode === 'local') {
        await deleteLocalInquiry(id);
        await onLocalMutated?.();
      } else {
        await deleteInquiry(id);
      }
      setConfirmDeleteId(null);
      onNotify('success', 'Inquiry deleted.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to delete inquiry.');
    }
  };

  const openReplyComposer = (inq: InquiryRecord) => {
    setReplyTargetId(inq.id);
    setReplySubject(`Re: Your ${inq.serviceType} Inquiry — JOSTEC Construction`);
    setReplyBody(
      `Thank you for contacting JOSTEC Construction regarding your ${inq.serviceType} project.\n\nWe have reviewed your details and would like to schedule a site measurement / share an estimate.`
    );
  };

  const handleSendReply = async (e: React.FormEvent, inq: InquiryRecord) => {
    e.preventDefault();
    setSendingReply(true);
    try {
      const res = await sendAdminClientReply({
        to: inq.email,
        clientName: inq.name,
        serviceType: inq.serviceType,
        subject: replySubject,
        message: replyBody,
        inquiryId: inq.id,
      });

      if (mode === 'firebase') {
        await createEmailLog({
          kind: 'client_reply',
          recipient: inq.email,
          subject: replySubject,
          status: res.status === 'sent' ? 'sent' : res.status === 'not_configured' ? 'not_configured' : 'failed',
          provider: res.provider,
          detail: res.detail,
          inquiryId: inq.id,
        }).catch(() => {});
      }

      if (res.ok) {
        if (inq.status === 'new') {
          if (mode === 'local') {
            await updateLocalInquiryStatus(inq.id, 'reviewed');
          } else {
            await updateInquiryStatus(inq.id, 'reviewed');
          }
        }
        await onLocalMutated?.();
        setReplyTargetId(null);
        onNotify('success', `Email reply sent to ${inq.email}.`);
      } else {
        await onLocalMutated?.();
        onNotify('error', res.detail || 'Could not send email reply via server.');
      }
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to send reply email.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredInquiries.length === 0) return;
    const header = ['Date', 'Status', 'Name', 'Phone', 'Email', 'Service', 'Message'];
    const rows = filteredInquiries.map((inq) => {
      const createdMs = (inq as unknown as { createdAtMs?: number }).createdAtMs;
      const dateStr = inq.createdAt?.toDate
        ? inq.createdAt.toDate().toISOString().slice(0, 10)
        : createdMs
          ? new Date(createdMs).toISOString().slice(0, 10)
          : '';
      return [
        escapeCsvCell(dateStr),
        escapeCsvCell(inq.status),
        escapeCsvCell(inq.name),
        escapeCsvCell(inq.phone),
        escapeCsvCell(inq.email),
        escapeCsvCell(inq.serviceType),
        escapeCsvCell(inq.message),
      ].join(',');
    });
    const csvContent = [header.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jostec-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onNotify('success', `Exported ${filteredInquiries.length} inquiry record(s) to CSV.`);
  };

  if (inquiries.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
        <Mail className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="font-display text-lg font-bold text-[#0B1B2B] mb-1">
          No Client Inquiries Yet
        </h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Quote requests submitted via the public Contact form are securely stored here for your
          review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter & Export Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inquiries by name, service, or phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-orange-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(['all', 'new', 'reviewed', 'archived'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors capitalize cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-[#0B1B2B] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={filteredInquiries.length === 0}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0B1B2B] text-white rounded-md hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {filteredInquiries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-600">
          No inquiries match the current filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((inq) => {
            const createdMs = (inq as unknown as { createdAtMs?: number }).createdAtMs;
            const createdText = inq.createdAt?.toDate
              ? inq.createdAt.toDate().toLocaleDateString()
              : createdMs
                ? new Date(createdMs).toLocaleDateString()
                : 'Recent';

            return (
              <div key={inq.id} className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-orange-600">{inq.serviceType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{createdText}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#0B1B2B]">{inq.name}</h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold capitalize ${
                      inq.status === 'new'
                        ? 'text-orange-700'
                        : inq.status === 'reviewed'
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                    }`}
                  >
                    {inq.status === 'new' && <Clock className="w-3.5 h-3.5" />}
                    {inq.status === 'reviewed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {inq.status === 'archived' && <Archive className="w-3.5 h-3.5" />}
                    {inq.status}
                  </span>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed py-4 whitespace-pre-line">
                  {inq.message}
                </p>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-5 text-xs sm:text-sm text-slate-600">
                    <a
                      href={`tel:${inq.phone}`}
                      className="inline-flex items-center gap-1.5 hover:text-orange-600 font-mono tabular-nums"
                    >
                      <Phone className="w-3.5 h-3.5 text-orange-600" />
                      {inq.phone}
                    </a>
                    <a
                      href={`mailto:${inq.email}`}
                      className="inline-flex items-center gap-1.5 hover:text-orange-600"
                    >
                      <Mail className="w-3.5 h-3.5 text-orange-600" />
                      {inq.email}
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {inq.emailStatus && (
                      <span
                        title={inq.emailDetail || ''}
                        className={`text-[11px] font-medium mr-1 ${
                          inq.emailStatus === 'sent'
                            ? 'text-emerald-700'
                            : inq.emailStatus === 'not_configured'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {inq.emailStatus === 'sent'
                          ? 'Alert Emailed'
                          : inq.emailStatus === 'not_configured'
                            ? 'Email Setup Needed'
                            : 'Alert Failed'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        replyTargetId === inq.id ? setReplyTargetId(null) : openReplyComposer(inq)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0B1B2B] text-white rounded-md hover:bg-slate-800 cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      {replyTargetId === inq.id ? 'Close Reply' : 'Email Client'}
                    </button>
                    {inq.status !== 'reviewed' && (
                      <button
                        type="button"
                        onClick={() => handleStatus(inq.id, 'reviewed')}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer"
                      >
                        Mark Reviewed
                      </button>
                    )}
                    {inq.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => handleStatus(inq.id, 'archived')}
                        className="px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer"
                      >
                        Archive
                      </button>
                    )}
                    {confirmDeleteId === inq.id ? (
                      <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md text-xs">
                        <span className="text-red-900 font-medium">Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(inq.id)}
                          className="px-2 py-0.5 bg-red-600 text-white font-semibold rounded hover:bg-red-700 cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 text-slate-600 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(inq.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-red-200 bg-red-50 text-red-700 rounded-md hover:bg-red-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {replyTargetId === inq.id && (
                  <form
                    onSubmit={(e) => handleSendReply(e, inq)}
                    className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 rounded-md p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#0B1B2B]">
                        Send Email Reply to <span className="font-mono">{inq.email}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setReplyTargetId(null)}
                        aria-label="Close reply composer"
                        className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={180}
                        value={replySubject}
                        onChange={(e) => setReplySubject(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Message
                      </label>
                      <textarea
                        required
                        minLength={5}
                        maxLength={4000}
                        rows={4}
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <a
                          href={`mailto:${encodeURIComponent(inq.email)}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`}
                          className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-orange-600"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open in Mail App
                        </a>
                        {onOpenNotifications && (
                          <button
                            type="button"
                            onClick={onOpenNotifications}
                            className="font-medium text-orange-600 hover:underline cursor-pointer"
                          >
                            Email Settings
                          </button>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={sendingReply}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingReply ? 'Sending...' : 'Send Email Reply'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
