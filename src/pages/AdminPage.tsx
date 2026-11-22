import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileEdit,
  FolderKanban,
  Globe,
  HardHat,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MailCheck,
  Menu,
  MessageSquareQuote,
  RefreshCw,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AccessSecurityPanel } from '../components/admin/AccessSecurityPanel';
import { InquiriesManager } from '../components/admin/InquiriesManager';
import { PhotoAppearanceStudioTab } from '../components/admin/PhotoAppearanceStudioTab';
import { ProfileManagerPanel } from '../components/admin/ProfileManagerPanel';
import { ProjectFormPanel } from '../components/admin/ProjectFormPanel';
import { ProjectsManager } from '../components/admin/ProjectsManager';
import { SetupGuidePanel } from '../components/admin/SetupGuidePanel';
import { TestimonialsManager } from '../components/admin/TestimonialsManager';
import { useFirebase } from '../context/FirebaseContext';
import { activeFirebaseConfig } from '../lib/firebase';
import {
  subscribeAllProjects,
  subscribeAllTestimonials,
  subscribeInquiries,
  subscribeSiteProfile,
} from '../services/firestoreService';
import { fetchLocalAdminData } from '../services/localMediaService';
import { getImageFilterCss, normalizePhotoAppearance } from '../utils/photoAppearance';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  COMPANY_INFO,
  type InquiryRecord,
  type ProjectRecord,
  type SiteProfileRecord,
  type TestimonialRecord,
} from '../types';

type AdminTab =
  | 'overview'
  | 'profile'
  | 'upload'
  | 'projects'
  | 'appearance'
  | 'testimonials'
  | 'inquiries'
  | 'security'
  | 'setup';

type EmailAuthMode = 'signin' | 'reset';

export const AdminPage: React.FC = () => {
  const {
    user,
    authReady,
    isAdmin,
    isBootstrappedAdmin,
    adminCheckLoading,
    isConfigured,
    authError,
    authErrorCode,
    localAuthenticated,
    localHasPasscode,
    localHasRecoveryKey,
    localEnvControlled,
    localServerAvailable,
    localSessionReady,
    newRecoveryKeyBanner,
    activeAdminMode,
    signInWithGoogle,
    signInWithEmail,
    sendPasswordReset,
    resendVerificationEmail,
    refreshAuthSession,
    signOutAdmin,
    setupLocalAdmin,
    signInLocalAdmin,
    recoverLocalAdmin,
    dismissRecoveryKeyBanner,
    clearAuthError,
  } = useFirebase();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);
  const [bannerKeyCopied, setBannerKeyCopied] = useState(false);

  const handleReturnToLiveSite = useCallback(async () => {
    await signOutAdmin();
    navigate('/');
  }, [signOutAdmin, navigate]);

  // Prevent search engines from indexing the private Admin Console URL
  useEffect(() => {
    const existingMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const prevContent = existingMeta?.getAttribute('content') ?? null;
    const meta = existingMeta ?? document.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', 'noindex, nofollow');
    if (!existingMeta) {
      document.head.appendChild(meta);
    }
    return () => {
      if (!existingMeta) {
        meta.remove();
      } else if (prevContent !== null) {
        existingMeta.setAttribute('content', prevContent);
      } else {
        existingMeta.removeAttribute('content');
      }
    };
  }, []);

  // Login Gate state
  const [emailMode, setEmailMode] = useState<EmailAuthMode>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const [localPasscode, setLocalPasscode] = useState('');
  const [showLocalPasscode, setShowLocalPasscode] = useState(false);
  const [localRecoveryMode, setLocalRecoveryMode] = useState(false);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [recoveryNewPasscode, setRecoveryNewPasscode] = useState('');
  const [localBusy, setLocalBusy] = useState(false);
  const [localFormError, setLocalFormError] = useState<string | null>(null);

  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [siteProfile, setSiteProfile] = useState<SiteProfileRecord | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshLocalData = useCallback(async () => {
    if (activeAdminMode !== 'local') return;
    try {
      const data = await fetchLocalAdminData();
      setProjects(data.projects);
      setTestimonials(data.testimonials);
      setInquiries(data.inquiries);
      setSiteProfile(data.profile ?? null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to load local admin data.');
    }
  }, [activeAdminMode, notify]);

  useEffect(() => {
    if (activeAdminMode === 'firebase') {
      const uidFilter = isBootstrappedAdmin ? undefined : user?.uid;
      const unsubProjects = subscribeAllProjects(setProjects, undefined, uidFilter);
      const unsubTestimonials = subscribeAllTestimonials(setTestimonials, undefined, uidFilter);
      const unsubProfile = subscribeSiteProfile(setSiteProfile);
      const unsubInquiries = isBootstrappedAdmin
        ? subscribeInquiries(setInquiries)
        : () => {};

      return () => {
        unsubProjects();
        unsubTestimonials();
        unsubProfile();
        unsubInquiries();
      };
    }

    if (activeAdminMode === 'local') {
      refreshLocalData();
      return;
    }

    setProjects([]);
    setTestimonials([]);
    setInquiries([]);
    setSiteProfile(null);
  }, [activeAdminMode, isBootstrappedAdmin, user?.uid, refreshLocalData]);

  const stats = useMemo(() => {
    const publishedCount = projects.filter((p) => p.status === 'published').length;
    const draftCount = projects.filter((p) => p.status === 'draft').length;
    const totalPhotos = projects.reduce((sum, p) => sum + (p.imageUrls?.length ?? 0), 0);
    const newInquiriesCount = inquiries.filter((i) => i.status === 'new').length;
    const publishedTestimonialsCount = testimonials.filter((t) => t.status === 'published').length;
    return {
      totalProjects: projects.length,
      publishedCount,
      draftCount,
      totalPhotos,
      newInquiriesCount,
      publishedTestimonialsCount,
    };
  }, [projects, inquiries, testimonials]);

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailNotice(null);
    clearAuthError();
    setEmailBusy(true);
    try {
      if (emailMode === 'signin') {
        await signInWithEmail(emailInput, passwordInput);
        setPasswordInput('');
      } else {
        await sendPasswordReset(emailInput);
        setEmailNotice(
          'Password setup / reset email sent! Check your inbox (and spam folder), choose a password, then sign in here.'
        );
      }
    } catch {
      // Errors surfaced via authError
    } finally {
      setEmailBusy(false);
    }
  };

  const handleLocalPasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalFormError(null);
    setLocalBusy(true);
    try {
      if (localRecoveryMode) {
        await recoverLocalAdmin(recoveryKeyInput, recoveryNewPasscode);
        setRecoveryKeyInput('');
        setRecoveryNewPasscode('');
        setLocalRecoveryMode(false);
      } else if (localHasPasscode) {
        await signInLocalAdmin(localPasscode);
        setLocalPasscode('');
      } else {
        await setupLocalAdmin(localPasscode);
        setLocalPasscode('');
      }
    } catch (err) {
      setLocalFormError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLocalBusy(false);
    }
  };

  // 1. Loading Auth / Session Verification
  if (!authReady || adminCheckLoading || !localSessionReady) {
    return (
      <div className="min-h-screen bg-[#0B1B2B] text-white flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-300">Verifying administrator credentials...</p>
      </div>
    );
  }

  // 2A. Signed-in via Email & Password on static hosting, waiting for email verification
  if (!localServerAvailable && user && !user.emailVerified && !localAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B1B2B] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 space-y-5">
          <div className="flex items-center gap-3 text-orange-600">
            <MailCheck className="w-6 h-6 shrink-0" />
            <h1 className="font-display text-xl font-bold text-[#0B1B2B]">
              Verify Your Email Address
            </h1>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            You are signed in as <strong className="text-slate-900">{user.email}</strong>. Click
            the verification link we sent to your inbox before accessing the Owner Dashboard.
          </p>
          {verifyMessage && (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              {verifyMessage}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={verifyBusy}
              onClick={async () => {
                setVerifyBusy(true);
                setVerifyMessage(null);
                try {
                  await refreshAuthSession();
                  setVerifyMessage('Checked status. If you already clicked the link, you will enter shortly.');
                } finally {
                  setVerifyBusy(false);
                }
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${verifyBusy ? 'animate-spin' : ''}`} />
              I&apos;ve Verified — Continue
            </button>
            <button
              type="button"
              disabled={verifyBusy}
              onClick={async () => {
                setVerifyBusy(true);
                try {
                  await resendVerificationEmail();
                  setVerifyMessage(`Verification email resent to ${user.email}.`);
                } catch (err) {
                  setVerifyMessage(err instanceof Error ? err.message : 'Unable to resend.');
                } finally {
                  setVerifyBusy(false);
                }
              }}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 cursor-pointer"
            >
              Resend Link
            </button>
          </div>
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={signOutAdmin}
              className="font-semibold text-red-600 hover:text-red-700 cursor-pointer"
            >
              Sign Out &amp; Switch Account
            </button>
            <button
              type="button"
              onClick={handleReturnToLiveSite}
              className="text-slate-600 hover:text-[#0B1B2B] font-medium cursor-pointer"
            >
              Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2B. Signed-in & verified on static hosting, but NOT yet an authorized Firebase admin
  if (!localServerAvailable && user && !isAdmin && !localAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B1B2B] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 space-y-5">
          <div className="flex items-center gap-3 text-red-600">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <h1 className="font-display text-xl font-bold text-[#0B1B2B]">
              403 · Admin Approval Needed
            </h1>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            You are signed in as <strong className="text-slate-900">{user.email}</strong>, which is
            not yet listed as an authorized administrator for {COMPANY_INFO.name}.
          </p>

          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <p className="text-slate-600">
              Ask the primary owner (<span className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</span>)
              to add your UID under <strong>Access &amp; Security → Team Administrators</strong>:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2.5 py-1.5 rounded bg-white border border-slate-200 font-mono text-[11px] text-slate-900 truncate">
                {user.uid}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(user.uid).then(() => {
                    setUidCopied(true);
                    window.setTimeout(() => setUidCopied(false), 2000);
                  });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-white border border-slate-300 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 shrink-0 cursor-pointer"
              >
                {uidCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy UID
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={refreshAuthSession}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0B1B2B] text-white text-sm font-semibold rounded-md hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Check Approval
            </button>
            <button
              type="button"
              onClick={signOutAdmin}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Switch Account
            </button>
            <button
              type="button"
              onClick={handleReturnToLiveSite}
              className="inline-flex items-center px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 cursor-pointer"
            >
              Public Site
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Strict Password-Locked Console Gate
  if (!activeAdminMode) {
    return (
      <div className="min-h-screen bg-[#0B1B2B] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-7 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-orange-600 text-white flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[#0B1B2B]">
                Restricted Admin Console
              </h1>
              <p className="text-xs text-slate-500">{COMPANY_INFO.name}</p>
            </div>
          </div>

          {localServerAvailable ? (
            /* Express Server Password Lock (Hides Cloud/Google options until unlocked) */
            <form onSubmit={handleLocalPasscodeSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider inline-flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-orange-600" />
                  {localRecoveryMode
                    ? 'Recover Console Password'
                    : localHasPasscode
                    ? 'Password Lock Required'
                    : 'Set First-Time Console Password'}
                </p>
                {localHasPasscode && localHasRecoveryKey && !localEnvControlled && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalRecoveryMode((v) => !v);
                      setLocalFormError(null);
                    }}
                    className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
                  >
                    {localRecoveryMode ? 'Back to Password' : 'Use Recovery Key'}
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {localRecoveryMode
                  ? 'Enter your saved Recovery Key (JSM-XXXX-XXXX) and set a new Admin Console password.'
                  : localHasPasscode
                  ? 'Enter your Admin Console password to unlock this URL. Access locks automatically whenever you return to the public website.'
                  : 'First-time security lock: create a 6+ character password to protect this Admin Console URL. A backup Recovery Key will be generated automatically.'}
              </p>

              {localFormError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
                  {localFormError}
                </div>
              )}

              {localRecoveryMode ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={recoveryKeyInput}
                    onChange={(e) => setRecoveryKeyInput(e.target.value)}
                    placeholder="Recovery Key (e.g., JSM-ABCD-EFGH)"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-sm font-mono text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    maxLength={64}
                    autoComplete="new-password"
                    value={recoveryNewPasscode}
                    onChange={(e) => setRecoveryNewPasscode(e.target.value)}
                    placeholder="Choose new 6+ char console password"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                  <button
                    type="submit"
                    disabled={localBusy}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    {localBusy ? 'Resetting...' : 'Reset Password & Unlock'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showLocalPasscode ? 'text' : 'password'}
                      required
                      minLength={6}
                      maxLength={64}
                      autoComplete={localHasPasscode ? 'current-password' : 'new-password'}
                      value={localPasscode}
                      onChange={(e) => setLocalPasscode(e.target.value)}
                      placeholder={
                        localHasPasscode
                          ? 'Enter Admin Console password'
                          : 'Create 6+ char Admin Console password'
                      }
                      className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLocalPasscode((v) => !v)}
                      aria-label={showLocalPasscode ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showLocalPasscode ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={localBusy}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    {localBusy
                      ? 'Verifying...'
                      : localHasPasscode
                      ? 'Unlock Admin Console'
                      : 'Set Password Lock & Enter'}
                  </button>
                </div>
              )}
            </form>
          ) : isConfigured ? (
            /* Static Hosting Password Sign-In (No open registration on /admin) */
            <div className="space-y-5">
              {authError && (
                <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-900 space-y-2.5">
                  <p className="font-semibold leading-relaxed">{authError}</p>
                  {authErrorCode === 'auth/operation-not-allowed' && activeFirebaseConfig.projectId && (
                    <a
                      href={`https://console.firebase.google.com/project/${activeFirebaseConfig.projectId}/authentication/providers`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline text-red-950 hover:text-orange-700"
                    >
                      Enable Email/Password in Firebase Console
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {authErrorCode === 'auth/unauthorized-domain' && typeof window !== 'undefined' && (
                    <div className="pt-2 border-t border-red-200 space-y-2 text-red-800">
                      <p>Copy this exact domain and add it in Firebase Console:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-2.5 py-1.5 rounded bg-white border border-red-200 font-mono text-[11px] text-slate-900 truncate">
                          {window.location.hostname}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(window.location.hostname).then(() => {
                              setDomainCopied(true);
                              window.setTimeout(() => setDomainCopied(false), 2000);
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-white border border-red-300 text-[11px] font-semibold text-red-900 hover:bg-red-100 shrink-0 cursor-pointer"
                        >
                          {domainCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      {activeFirebaseConfig.projectId && (
                        <a
                          href={`https://console.firebase.google.com/project/${activeFirebaseConfig.projectId}/authentication/settings`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold underline text-red-950 hover:text-orange-700"
                        >
                          Open Firebase Authorized Domains Settings
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {emailNotice && (
                <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                  {emailNotice}
                </div>
              )}

              <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 uppercase tracking-wider">
                    {emailMode === 'signin' ? 'Password Required' : 'Set or Reset Password'}
                  </span>
                  {emailMode === 'reset' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailMode('signin');
                        clearAuthError();
                        setEmailNotice(null);
                      }}
                      className="font-semibold text-orange-600 hover:underline cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={BOOTSTRAPPED_ADMIN_EMAIL}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>

                {emailMode === 'signin' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode('reset');
                          clearAuthError();
                          setEmailNotice(null);
                        }}
                        className="text-xs font-medium text-orange-600 hover:underline cursor-pointer"
                      >
                        Set / Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showEmailPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="current-password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Enter administrator password"
                        className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailPassword((v) => !v)}
                        aria-label={showEmailPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showEmailPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={emailBusy}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  {emailBusy
                    ? 'Please wait...'
                    : emailMode === 'signin'
                    ? 'Unlock Admin Console'
                    : 'Send Password Setup Email'}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider text-center">
                  Or unlock with authorized Google account
                </p>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B1B2B] text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <HardHat className="w-4 h-4 text-orange-400" />
                  Sign In With Google Account
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              Admin Console authentication is not configured on this static host. Configure Firebase
              Authentication or run the Node.js server with <code className="font-mono">LOCAL_ADMIN_PASSCODE</code>.
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Password-protected console</span>
            <Link to="/" className="font-semibold text-[#0B1B2B] hover:text-orange-600">
              Return to Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Administrator Dashboard (Firebase or Local Server Mode)
  const navItems: { id: AdminTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile & Bio', icon: UserCog },
    { id: 'upload', label: editingProject ? 'Edit Project' : 'Upload Project', icon: ImagePlus },
    { id: 'projects', label: 'Project Gallery', icon: FolderKanban, badge: stats.totalProjects },
    { id: 'appearance', label: 'Photo Appearance', icon: SlidersHorizontal },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
    { id: 'inquiries', label: 'Client Inquiries', icon: Mail, badge: stats.newInquiriesCount },
    { id: 'security', label: 'Access & Security', icon: ShieldCheck },
    { id: 'setup', label: 'Setup & Rules', icon: Settings },
  ];

  const handleSelectTab = (tab: AdminTab) => {
    if (tab !== 'upload') {
      setEditingProject(null);
    }
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#0B1B2B] text-white px-4 h-14 flex items-center justify-between border-b border-white/10">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open dashboard navigation"
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-md hover:bg-white/10"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-display font-bold text-sm truncate">Owner Dashboard</span>
        <button
          type="button"
          onClick={handleReturnToLiveSite}
          title="Log out and view live website"
          className="text-xs font-medium text-orange-400 hover:text-orange-300 whitespace-nowrap cursor-pointer"
        >
          Live Site
        </button>
      </header>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0B1B2B] text-slate-200 flex flex-col justify-between border-r border-white/10 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div className="min-w-0">
              <p className="font-display font-bold text-white text-base truncate">
                {COMPANY_INFO.shortName}
              </p>
              <p className="text-xs text-orange-400">
                {activeAdminMode === 'local' ? 'Local Server Mode' : 'Cloud Admin Console'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    active
                      ? 'bg-orange-600 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        active ? 'text-white' : 'text-orange-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account & Logout Footer */}
        <div className="p-5 border-t border-white/10 bg-[#081522] space-y-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {activeAdminMode === 'local'
                ? 'Local Workshop Admin'
                : user?.displayName || 'Business Owner'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {activeAdminMode === 'local' ? 'Stored on App Server' : user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReturnToLiveSite}
              title="Log out and return to public website"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 border border-white/15 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public Site
            </button>
            <button
              type="button"
              onClick={signOutAdmin}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-300 border border-red-400/25 rounded-md hover:bg-red-500/15 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Top Breadcrumb Bar */}
        <div className="hidden lg:flex items-center justify-between px-8 h-16 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Owner Console</span>
            <span>/</span>
            <span className="font-semibold text-[#0B1B2B]">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500">
              {activeAdminMode === 'local'
                ? 'Local Server Storage (No Firebase)'
                : 'Cloud Firestore + Flexible Media'}
            </span>
            <button
              type="button"
              onClick={() => {
                setEditingProject(null);
                setActiveTab('upload');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              Upload Project
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Newly Generated Recovery Key Notice */}
          {newRecoveryKeyBanner && activeTab !== 'security' && (
            <div className="p-4 rounded-md bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Save your backup recovery key:{' '}
                  <code className="px-2 py-0.5 bg-white border border-amber-300 rounded font-mono font-bold">
                    {newRecoveryKeyBanner}
                  </code>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(newRecoveryKeyBanner).then(() => {
                      setBannerKeyCopied(true);
                      window.setTimeout(() => setBannerKeyCopied(false), 2000);
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 rounded font-semibold hover:bg-amber-100 cursor-pointer"
                >
                  {bannerKeyCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {bannerKeyCopied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={dismissRecoveryKeyBanner}
                  className="px-2 py-1 font-semibold underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Status Toast */}
          {toast && (
            <div
              role="status"
              className={`p-4 rounded-md border flex items-center justify-between gap-3 text-sm ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span>{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#0B1B2B]">
                  Workshop &amp; Portfolio Overview
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Manage project uploads, draft approvals, client reviews, and incoming site
                  inquiries.
                </p>
              </div>

              {/* Overview KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-slate-500 mb-1">Published Live</p>
                  <p className="font-mono text-3xl font-bold text-[#0B1B2B] tabular-nums">
                    {stats.publishedCount}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">Visible in public gallery</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-slate-500 mb-1">Saved Drafts</p>
                  <p className="font-mono text-3xl font-bold text-[#0B1B2B] tabular-nums">
                    {stats.draftCount}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">Awaiting publication</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-slate-500 mb-1">Uploaded Photos</p>
                  <p className="font-mono text-3xl font-bold text-[#0B1B2B] tabular-nums">
                    {stats.totalPhotos}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Across {stats.totalProjects} projects</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-slate-500 mb-1">New Inquiries</p>
                  <p className="font-mono text-3xl font-bold text-orange-600 tabular-nums">
                    {stats.newInquiriesCount}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.publishedTestimonialsCount} published reviews
                  </p>
                </div>
              </div>

              {/* Recent Uploads Table */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-display text-base font-bold text-[#0B1B2B]">
                    Recent Project Uploads
                  </h2>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1B2B] hover:text-orange-600 cursor-pointer"
                    >
                      <UserCog className="w-3.5 h-3.5 text-orange-600" />
                      Edit Profile &amp; Bio
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('appearance')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1B2B] hover:text-orange-600 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
                      Photo Appearance
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('projects')}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                    >
                      Manage All Projects
                    </button>
                  </div>
                </div>

                {projects.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-sm text-slate-600 mb-4">
                      No projects have been uploaded yet. Upload site photos from your phone or
                      desktop to populate your public gallery.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 cursor-pointer"
                    >
                      <ImagePlus className="w-4 h-4" />
                      Upload First Project
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {projects.slice(0, 5).map((proj) => (
                      <div
                        key={proj.id}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-16 h-12 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                            {proj.imageUrls?.[0] ? (
                              <img
                                src={proj.imageUrls[0]}
                                alt={proj.title}
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                style={{
                                  filter: getImageFilterCss(
                                    normalizePhotoAppearance(proj.photoAppearance)
                                  ),
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-sm font-bold text-[#0B1B2B] truncate">
                              {proj.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span>{proj.category}</span>
                              <span>·</span>
                              <span className="font-mono tabular-nums">
                                {proj.imageUrls?.length ?? 0} photo(s)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${
                              proj.status === 'published' ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {proj.status === 'published' ? (
                              <>
                                <Globe className="w-3.5 h-3.5" />
                                Published
                              </>
                            ) : (
                              <>
                                <FileEdit className="w-3.5 h-3.5" />
                                Draft
                              </>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProject(proj);
                              setActiveTab('upload');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-md text-[#0B1B2B] hover:bg-slate-100 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile Picture & Bio Tab */}
          {activeTab === 'profile' && (
            <ProfileManagerPanel
              mode={activeAdminMode}
              profile={siteProfile}
              onNotify={notify}
              onLocalMutated={refreshLocalData}
            />
          )}

          {/* Upload / Edit Project Tab */}
          {activeTab === 'upload' && (
            <ProjectFormPanel
              mode={activeAdminMode}
              editingProject={editingProject}
              onCancelEdit={() => {
                setEditingProject(null);
                setActiveTab('projects');
              }}
              onSaved={async (msg) => {
                setEditingProject(null);
                await refreshLocalData();
                notify('success', msg);
                setActiveTab('projects');
              }}
              onOpenSetupGuide={() => setActiveTab('setup')}
            />
          )}

          {/* Projects Manager Tab */}
          {activeTab === 'projects' && (
            <ProjectsManager
              mode={activeAdminMode}
              projects={projects}
              onEditProject={(proj) => {
                setEditingProject(proj);
                setActiveTab('upload');
              }}
              onNotify={notify}
              onLocalMutated={refreshLocalData}
            />
          )}

          {/* Photo Appearance Studio Tab */}
          {activeTab === 'appearance' && (
            <PhotoAppearanceStudioTab
              mode={activeAdminMode}
              projects={projects}
              onNotify={notify}
              onLocalMutated={refreshLocalData}
            />
          )}

          {/* Testimonials Tab */}
          {activeTab === 'testimonials' && (
            <TestimonialsManager
              mode={activeAdminMode}
              testimonials={testimonials}
              onNotify={notify}
              onLocalMutated={refreshLocalData}
            />
          )}

          {/* Inquiries Tab */}
          {activeTab === 'inquiries' && (
            <InquiriesManager
              mode={activeAdminMode}
              inquiries={inquiries}
              onNotify={notify}
              onLocalMutated={refreshLocalData}
            />
          )}

          {/* Access & Security Tab */}
          {activeTab === 'security' && (
            <AccessSecurityPanel mode={activeAdminMode} onNotify={notify} />
          )}

          {/* Setup & Rules Tab */}
          {activeTab === 'setup' && <SetupGuidePanel />}
        </main>
      </div>
    </div>
  );
};
