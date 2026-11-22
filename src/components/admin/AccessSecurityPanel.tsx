import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Lock,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useFirebase, type AdminSessionMode } from '../../context/FirebaseContext';
import { activeFirebaseConfig } from '../../lib/firebase';
import {
  grantAdminAccess,
  revokeAdminAccess,
  subscribeAdmins,
} from '../../services/firestoreService';
import { BOOTSTRAPPED_ADMIN_EMAIL, type AdminUserRecord } from '../../types';

interface AccessSecurityPanelProps {
  mode: AdminSessionMode;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export const AccessSecurityPanel: React.FC<AccessSecurityPanelProps> = ({ mode, onNotify }) => {
  const {
    user,
    isBootstrappedAdmin,
    localEnvControlled,
    localHasRecoveryKey,
    newRecoveryKeyBanner,
    updateLocalPasscode,
    regenerateLocalRecoveryKey,
    dismissRecoveryKeyBanner,
  } = useFirebase();

  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const [currentPasscode, setCurrentPasscode] = useState('');
  const [nextPasscode, setNextPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [changingPasscode, setChangingPasscode] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'firebase' || !isBootstrappedAdmin) {
      setAdmins([]);
      return;
    }
    const unsub = subscribeAdmins(setAdmins, (err) => {
      onNotify('error', err.message || 'Unable to load admin team directory.');
    });
    return () => unsub();
  }, [mode, isBootstrappedAdmin, onNotify]);

  const handleCopy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopiedId(label);
      window.setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdmin(true);
    try {
      await grantAdminAccess({
        uid: newAdminUid,
        email: newAdminEmail,
        displayName: newAdminName,
      });
      setNewAdminUid('');
      setNewAdminEmail('');
      setNewAdminName('');
      onNotify('success', 'Team administrator added. They can now sign in with Email & Password.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to grant administrator access.');
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleRevokeAdmin = async (record: AdminUserRecord) => {
    try {
      await revokeAdminAccess(record.uid);
      onNotify('success', `Revoked admin access for ${record.email}.`);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to revoke administrator access.');
    }
  };

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nextPasscode.trim().length < 6) {
      onNotify('error', 'New passcode must be at least 6 characters.');
      return;
    }
    if (nextPasscode !== confirmPasscode) {
      onNotify('error', 'New passcode and confirmation do not match.');
      return;
    }
    setChangingPasscode(true);
    try {
      await updateLocalPasscode(currentPasscode, nextPasscode);
      setCurrentPasscode('');
      setNextPasscode('');
      setConfirmPasscode('');
      onNotify('success', 'Workshop passcode updated and session refreshed.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to update workshop passcode.');
    } finally {
      setChangingPasscode(false);
    }
  };

  const handleRotateRecoveryKey = async () => {
    setRotatingKey(true);
    try {
      await regenerateLocalRecoveryKey();
      onNotify('success', 'New recovery key generated. Save it in a secure password manager.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to generate recovery key.');
    } finally {
      setRotatingKey(false);
    }
  };

  const providerLabel =
    mode === 'local'
      ? 'Workshop Passcode (Server Session)'
      : user?.providerData?.some((p) => p.providerId === 'password')
      ? 'Email & Password (No Google Required)'
      : 'Google Account Sign-In';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#0B1B2B]">
          Admin Access &amp; Security
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage passwordless/non-Google sign-in credentials, recovery keys, and authorized team
          administrators.
        </p>
      </div>

      {/* Recovery Key One-Time Banner */}
      {newRecoveryKeyBanner && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-sm font-bold text-amber-950">
                  Save Your One-Time Workshop Recovery Key
                </h2>
                <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                  Shown once. Store this key safely so you can reset your Workshop Passcode even if
                  you forget it later.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissRecoveryKeyBanner}
              className="text-xs font-semibold text-amber-900 hover:underline cursor-pointer shrink-0"
            >
              I Saved It
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <code className="px-3.5 py-2 rounded bg-white border border-amber-300 font-mono text-sm font-bold text-[#0B1B2B] tracking-wider">
              {newRecoveryKeyBanner}
            </code>
            <button
              type="button"
              onClick={() => handleCopy('recovery', newRecoveryKeyBanner)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1B2B] text-white text-xs font-semibold rounded-md hover:bg-slate-800 cursor-pointer"
            >
              {copiedId === 'recovery' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Key
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active Session Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="font-display text-lg font-bold text-[#0B1B2B]">Active Sign-In Session</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Authentication Method</p>
            <p className="font-semibold text-[#0B1B2B]">{providerLabel}</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Signed-In Identity</p>
            <p className="font-mono text-xs font-semibold text-[#0B1B2B] truncate">
              {mode === 'local' ? 'Workshop Server Admin' : user?.email}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Role Level</p>
            <p className="font-semibold text-emerald-700">
              {mode === 'local'
                ? 'Full Server Admin'
                : isBootstrappedAdmin
                ? 'Primary Owner Admin'
                : 'Authorized Team Admin'}
            </p>
          </div>
        </div>

        {mode === 'firebase' && user?.uid && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-slate-700">Your Firebase UID:</span>
              <code className="px-2 py-1 rounded bg-slate-100 font-mono text-slate-900 truncate">
                {user.uid}
              </code>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('uid', user.uid)}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {copiedId === 'uid' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied UID
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy UID
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Firebase Mode: Team Admin Access + Email/Password Console Guide */}
      {mode === 'firebase' && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <MailCheck className="w-5 h-5 text-orange-600" />
              <h2 className="font-display text-lg font-bold text-[#0B1B2B]">
                Email &amp; Password Login (No Google Account Needed)
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Administrators can log in from any browser or custom domain (including Vercel) using
              direct <strong>Email &amp; Password</strong> credentials without opening a Google
              OAuth popup. Ensure <strong>Email/Password</strong> is enabled once in Firebase
              Console:
            </p>
            <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-700 space-y-1.5 bg-slate-50 border border-slate-200 rounded-md p-4">
              <li>
                Open{' '}
                <strong>Authentication → Sign-in method → Add new provider → Email/Password</strong>
                .
              </li>
              <li>
                Enable <strong>Email/Password</strong> and click <strong>Save</strong>.
              </li>
              <li>
                For <code className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</code>, if you
                previously used Google Sign-In, click <strong>Set / Reset Password</strong> on{' '}
                <code className="font-mono">/admin</code> to set a standalone password.
              </li>
            </ol>
            {activeFirebaseConfig.projectId && (
              <a
                href={`https://console.firebase.google.com/project/${activeFirebaseConfig.projectId}/authentication/providers`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1B2B] text-white text-xs font-semibold rounded-md hover:bg-slate-800"
              >
                Open Firebase Sign-In Providers
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {isBootstrappedAdmin && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-orange-600" />
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B1B2B]">
                    Authorized Team Administrators
                  </h2>
                  <p className="text-xs text-slate-500">
                    Grant non-Google staff emails dashboard access by registering their verified
                    Firebase UID.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleAddAdmin}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-md"
              >
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="e.g., Mark Jenkins"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verified Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Firebase User UID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newAdminUid}
                      onChange={(e) => setNewAdminUid(e.target.value)}
                      placeholder="Paste UID from sign-in screen"
                      className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-md text-sm font-mono bg-white text-slate-900 focus:outline-none focus:border-orange-600"
                    />
                    <button
                      type="submit"
                      disabled={savingAdmin}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 shrink-0 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {savingAdmin ? 'Adding...' : 'Grant'}
                    </button>
                  </div>
                </div>
              </form>

              {admins.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No additional delegated team admins added yet. Currently using primary owner
                  account (<span className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</span>).
                </p>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md overflow-hidden">
                  {admins.map((adm) => (
                    <div
                      key={adm.uid}
                      className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-white"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0B1B2B]">
                          {adm.displayName}{' '}
                          <span className="text-xs font-normal text-slate-500">({adm.email})</span>
                        </p>
                        <p className="text-xs font-mono text-slate-500 truncate">UID: {adm.uid}</p>
                      </div>
                      {adm.uid !== user?.uid && (
                        <button
                          type="button"
                          onClick={() => handleRevokeAdmin(adm)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 rounded-md hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Local Server Mode: Passcode Rotation & Recovery Key */}
      {mode === 'local' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-orange-600" />
              <h2 className="font-display text-lg font-bold text-[#0B1B2B]">
                Change Workshop Passcode
              </h2>
            </div>

            {localEnvControlled ? (
              <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Your passcode is managed by the server environment secret{' '}
                <code className="font-mono font-semibold">LOCAL_ADMIN_PASSCODE</code>. Update it in
                your hosting environment settings to rotate the passcode.
              </div>
            ) : (
              <form onSubmit={handleChangePasscode} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Passcode
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPasscode}
                    onChange={(e) => setCurrentPasscode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Passcode (6+ characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    maxLength={64}
                    value={nextPasscode}
                    onChange={(e) => setNextPasscode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Passcode
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    maxLength={64}
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPasscode}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  {changingPasscode ? 'Updating...' : 'Update Workshop Passcode'}
                </button>
              </form>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-orange-600" />
              <h2 className="font-display text-lg font-bold text-[#0B1B2B]">
                Passcode Recovery Key
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {localHasRecoveryKey
                ? 'A hashed recovery key is active on this server. You can rotate it anytime to invalidate old keys and get a fresh backup key.'
                : 'No recovery key has been created yet. Generate one now so you can reset your workshop passcode if forgotten.'}
            </p>
            {!localEnvControlled && (
              <button
                type="button"
                onClick={handleRotateRecoveryKey}
                disabled={rotatingKey}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B1B2B] text-white text-xs font-semibold rounded-md hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${rotatingKey ? 'animate-spin' : ''}`} />
                {rotatingKey
                  ? 'Generating...'
                  : localHasRecoveryKey
                  ? 'Rotate Recovery Key'
                  : 'Generate Recovery Key'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
