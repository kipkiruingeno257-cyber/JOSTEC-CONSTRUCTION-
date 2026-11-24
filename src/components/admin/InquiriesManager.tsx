import React, { useMemo, useState } from 'react';
import { Archive, CheckCircle2, Clock, Download, Mail, Phone, Search, Trash2 } from 'lucide-react';
import type { AdminSessionMode } from '../../context/FirebaseContext';
import { deleteInquiry, updateInquiryStatus } from '../../services/firestoreService';
import { deleteLocalInquiry, updateLocalInquiryStatus } from '../../services/localMediaService';
import type { InquiryRecord, InquiryStatus } from '../../types';

interface InquiriesManagerProps {
  mode: AdminSessionMode;
  inquiries: InquiryRecord[];
  onNotify: (type: 'success' | 'error', text: string) => void;
  onLocalMutated?: () => Promise<void> | void;
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
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | InquiryStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
