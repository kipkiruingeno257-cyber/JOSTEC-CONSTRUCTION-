import React from 'react';
import { Archive, CheckCircle2, Clock, Mail, Phone, Trash2 } from 'lucide-react';
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

export const InquiriesManager: React.FC<InquiriesManagerProps> = ({
  mode,
  inquiries,
  onNotify,
  onLocalMutated,
}) => {
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
      onNotify('success', 'Inquiry deleted.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to delete inquiry.');
    }
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
    <div className="space-y-4">
      {inquiries.map((inq) => {
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
                <button
                  type="button"
                  onClick={() => handleDelete(inq.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-red-200 bg-red-50 text-red-700 rounded-md hover:bg-red-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
