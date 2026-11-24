import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  KeyRound,
  Mail,
  RefreshCw,
  Send,
  Server,
  Trash2,
} from 'lucide-react';
import type { AdminSessionMode } from '../../context/FirebaseContext';
import { createEmailLog, deleteEmailLog } from '../../services/firestoreService';
import {
  fetchNotificationStatus,
  sendTestEmailNotification,
  type NotificationStatusResponse,
} from '../../services/notificationService';
import { BOOTSTRAPPED_ADMIN_EMAIL, type EmailLogRecord } from '../../types';

interface NotificationsPanelProps {
  mode: AdminSessionMode;
  emailLogs: EmailLogRecord[];
  onNotify: (type: 'success' | 'error', text: string) => void;
  onLocalMutated?: () => Promise<void> | void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  mode,
  emailLogs,
  onNotify,
  onLocalMutated,
}) => {
  const [status, setStatus] = useState<NotificationStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const res = await fetchNotificationStatus();
      setStatus(res);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Unable to check email server status.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const effectiveLogs =
    mode === 'local' && status?.localLogs && status.localLogs.length > 0
      ? status.localLogs
      : emailLogs;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    try {
      const res = await sendTestEmailNotification(testRecipient.trim() || undefined);

      if (mode === 'firebase') {
        await createEmailLog({
          kind: 'test_email',
          recipient: res.recipient || testRecipient.trim() || BOOTSTRAPPED_ADMIN_EMAIL,
          subject: res.subject || 'JOSTEC Construction — Test Email Notification',
          status: res.status === 'sent' ? 'sent' : res.status === 'not_configured' ? 'not_configured' : 'failed',
          provider: res.provider,
          detail: res.detail,
        }).catch(() => {});
      } else {
        await onLocalMutated?.();
        await loadStatus();
      }

      if (res.ok) {
        onNotify('success', `Test notification sent to ${res.recipient || 'admin inbox'}.`);
        setTestRecipient('');
      } else {
        onNotify('error', res.detail || 'Test email delivery failed.');
      }
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to send test notification.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (mode !== 'firebase') return;
    try {
      await deleteEmailLog(id);
      onNotify('success', 'Email log entry deleted.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to delete log entry.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1B2B]">
            Email Notifications &amp; Alerts
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Receive instant inbox alerts whenever prospective clients request a quote or site survey,
            and send direct replies from your dashboard.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStatus}
          disabled={loadingStatus}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white text-xs font-semibold text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Live Email Server Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-orange-600" />
            <h2 className="font-display text-lg font-bold text-[#0B1B2B]">
              Server Notification Transport
            </h2>
          </div>

          {!loadingStatus && status && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                status.configured ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {status.configured ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Active ({status.provider.toUpperCase()})
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Credentials Not Configured Yet
                </>
              )}
            </span>
          )}
        </div>

        {statusError && (
          <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-950">
            {statusError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Alert Destination (NOTIFICATION_TO_EMAIL)</p>
            <p className="font-mono text-xs font-semibold text-[#0B1B2B] truncate">
              {status?.recipientMasked || BOOTSTRAPPED_ADMIN_EMAIL}
            </p>
            {status && !status.notificationToEnvConfigured && (
              <p className="text-[11px] text-amber-700 mt-1">
                Using default owner inbox (set NOTIFICATION_TO_EMAIL explicitly to override)
              </p>
            )}
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Active Mail Provider</p>
            <p className="font-semibold text-[#0B1B2B]">
              {status?.provider === 'resend'
                ? 'Resend HTTPS API'
                : status?.provider === 'smtp'
                  ? `SMTP (${status.smtpHost})`
                  : 'Waiting for RESEND_API_KEY'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Sender Header (EMAIL_FROM)</p>
            <p className="font-mono text-xs font-semibold text-[#0B1B2B] truncate">
              {status?.fromAddress || 'Not configured'}
            </p>
          </div>
        </div>

        {status?.provider === 'resend' && status.usingResendSandbox && (
          <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed">
            <strong>Resend Sandbox Mode Active:</strong> Because{' '}
            <code className="font-mono">EMAIL_FROM</code> is using{' '}
            <code className="font-mono">onboarding@resend.dev</code>, Resend delivers admin lead alerts
            to your account owner email, while automated confirmation emails to external client
            addresses require verifying a custom sending domain in Resend and setting{' '}
            <code className="font-mono">
              EMAIL_FROM=&quot;JOSTEC Construction &lt;quotes@yourdomain.com&gt;&quot;
            </code>
            .
          </div>
        )}

        {/* Test Email Form */}
        <form
          onSubmit={handleSendTest}
          className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end gap-3"
        >
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Test Recipient Email (optional — defaults to configured notification inbox)
            </label>
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder={BOOTSTRAPPED_ADMIN_EMAIL}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
            />
          </div>
          <button
            type="submit"
            disabled={sendingTest}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            {sendingTest ? 'Sending Test...' : 'Send Test Notification'}
          </button>
        </form>
      </div>

      {/* Resend Configuration Guide */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <KeyRound className="w-5 h-5 text-orange-600" />
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1B2B]">
              Resend Email Configuration (Google AI Studio &amp; Vercel)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Email delivery runs securely on the server via Resend HTTPS API — no SMTP credentials
              are required, and API keys are never exposed in frontend code.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs sm:text-sm">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
            <div className="flex items-center gap-2 font-display font-bold text-[#0B1B2B]">
              <Server className="w-4 h-4 text-orange-600" />
              <span>Required Resend Environment Variables</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Add these server-side variables in <strong>Google AI Studio → Settings → Secrets</strong>{' '}
              and in <strong>Vercel → Project Settings → Environment Variables</strong>:
            </p>
            <div className="bg-[#0B1B2B] text-slate-100 rounded p-3 font-mono text-xs space-y-1 overflow-x-auto">
              <p>RESEND_API_KEY=re_xxxxxxxxx</p>
              <p>NOTIFICATION_TO_EMAIL={BOOTSTRAPPED_ADMIN_EMAIL}</p>
              <p>EMAIL_FROM=JOSTEC Construction &lt;onboarding@resend.dev&gt;</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
            <div className="flex items-center gap-2 font-display font-bold text-[#0B1B2B]">
              <Mail className="w-4 h-4 text-orange-600" />
              <span>Dual Email Workflow &amp; Custom Domain</span>
            </div>
            <ul className="text-xs text-slate-600 leading-relaxed space-y-1.5 list-disc pl-4">
              <li>
                <strong>Admin Alert:</strong> Sends client name, phone, email, service requested, and
                project scope directly to <code className="font-mono">NOTIFICATION_TO_EMAIL</code>.
              </li>
              <li>
                <strong>Client Confirmation:</strong> Automatically emails a professional receipt
                summary to the client with Reply-To set to your business inbox.
              </li>
              <li>
                <strong>Production Domain:</strong> Verify your domain in Resend and update{' '}
                <code className="font-mono">EMAIL_FROM</code> (e.g.{' '}
                <code className="font-mono">quotes@yourdomain.com</code>) so confirmation emails send
                to every client address.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Email Activity Log */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-[#0B1B2B]">
            Recent Email Notification Activity
          </h2>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {effectiveLogs.length} record(s)
          </span>
        </div>

        {effectiveLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No outbound email alerts or client replies recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {effectiveLogs.map((log) => {
              const dateText = log.createdAt?.toDate
                ? log.createdAt.toDate().toLocaleString()
                : log.createdAtMs
                  ? new Date(log.createdAtMs).toLocaleString()
                  : 'Recent';
              return (
                <div
                  key={log.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          log.status === 'sent'
                            ? 'text-emerald-700'
                            : log.status === 'not_configured'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {log.status === 'sent' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : log.status === 'not_configured' ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {log.status === 'sent'
                          ? 'Delivered'
                          : log.status === 'not_configured'
                            ? 'Not Configured'
                            : 'Failed'}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-semibold text-[#0B1B2B] uppercase tracking-wide text-[11px]">
                        {log.kind.replace('_', ' ')}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono text-slate-500">{dateText}</span>
                    </div>
                    <p className="text-sm font-semibold text-[#0B1B2B] truncate">{log.subject}</p>
                    <p className="text-xs text-slate-600 truncate">
                      To: <span className="font-mono">{log.recipient}</span>
                      {log.detail ? ` — ${log.detail}` : ''}
                    </p>
                  </div>

                  {mode === 'firebase' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLog(log.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded hover:bg-red-50 shrink-0 cursor-pointer self-start sm:self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
