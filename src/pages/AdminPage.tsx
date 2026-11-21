import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
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
  Menu,
  MessageSquareQuote,
  Server,
  Settings,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { InquiriesManager } from '../components/admin/InquiriesManager';
import { ProjectFormPanel } from '../components/admin/ProjectFormPanel';
import { ProjectsManager } from '../components/admin/ProjectsManager';
import { SetupGuidePanel } from '../components/admin/SetupGuidePanel';
import { TestimonialsManager } from '../components/admin/TestimonialsManager';
import { useFirebase } from '../context/FirebaseContext';
import {
  subscribeAllProjects,
  subscribeAllTestimonials,
  subscribeInquiries,
} from '../services/firestoreService';
import { fetchLocalAdminData } from '../services/localMediaService';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  COMPANY_INFO,
  type InquiryRecord,
  type ProjectRecord,
  type TestimonialRecord,
} from '../types';

type AdminTab = 'overview' | 'upload' | 'projects' | 'testimonials' | 'inquiries' | 'setup';

export const AdminPage: React.FC = () => {
  const {
    user,
    authReady,
    isAdmin,
    adminCheckLoading,
    isConfigured,
    authError,
    localAuthenticated,
    localHasPasscode,
    localSessionReady,
    activeAdminMode,
    signInWithGoogle,
    signOutAdmin,
    setupLocalAdmin,
    signInLocalAdmin,
  } = useFirebase();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);

  const [localPasscode, setLocalPasscode] = useState('');
  const [localBusy, setLocalBusy] = useState(false);
  const [localFormError, setLocalFormError] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
  };

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
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to load local admin data.');
    }
  }, [activeAdminMode]);

  useEffect(() => {
    if (activeAdminMode === 'firebase') {
      const unsubProjects = subscribeAllProjects(setProjects);
      const unsubTestimonials = subscribeAllTestimonials(setTestimonials);
      const unsubInquiries = subscribeInquiries(setInquiries);

      return () => {
        unsubProjects();
        unsubTestimonials();
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
  }, [activeAdminMode, refreshLocalData]);

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

  const handleLocalPasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalFormError(null);
    setLocalBusy(true);
    try {
      if (localHasPasscode) {
        await signInLocalAdmin(localPasscode);
      } else {
        await setupLocalAdmin(localPasscode);
      }
      setLocalPasscode('');
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

  // 2. Signed-in with Google but NOT an authorized Firebase admin (and not in local mode)
  if (user && !isAdmin && !localAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B1B2B] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <h1 className="font-display text-xl font-bold text-[#0B1B2B]">
              403 · Unauthorized Access
            </h1>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            You are signed in as <strong className="text-slate-900">{user.email}</strong>, which is
            not listed as an authorized administrator for {COMPANY_INFO.name}.
          </p>
          <p className="text-xs text-slate-500 mb-6">
            Expected owner account: <span className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</span> (or
            a UID granted access in the <code className="font-mono">admins</code> collection).
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={signOutAdmin}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out &amp; Switch Account
            </button>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50"
            >
              Public Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated Login Gate (Firebase Cloud OR Standalone Local Server Mode)
  if (!activeAdminMode) {
    return (
      <div className="min-h-screen bg-[#0B1B2B] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-orange-600 text-white flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[#0B1B2B]">
                Owner Portal Sign-In
              </h1>
              <p className="text-xs text-slate-500">{COMPANY_INFO.name}</p>
            </div>
          </div>

          {authError && (
            <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
              {authError}
            </div>
          )}

          {/* Option A: Firebase Google Login */}
          {isConfigured && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cloud Sync (Firebase)
              </p>
              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-[#0B1B2B] text-white text-sm font-semibold rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <HardHat className="w-4 h-4 text-orange-400" />
                Sign In With Google
              </button>
            </div>
          )}

          {/* Option B: Standalone Local Server Mode (Zero Firebase Required) */}
          <form
            onSubmit={handleLocalPasscodeSubmit}
            className={`space-y-3 ${isConfigured ? 'pt-5 border-t border-slate-200' : ''}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider inline-flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-orange-600" />
                Local Server Mode (No Firebase)
              </p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {localHasPasscode
                ? 'Enter your local workshop passcode to upload photos and manage projects directly on the app server.'
                : 'First-time setup: create a private 6+ character passcode to manage projects and upload photos without Firebase.'}
            </p>

            {localFormError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
                {localFormError}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="password"
                required
                minLength={6}
                maxLength={64}
                value={localPasscode}
                onChange={(e) => setLocalPasscode(e.target.value)}
                placeholder={localHasPasscode ? 'Enter passcode' : 'Create 6+ char passcode'}
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
              />
              <button
                type="submit"
                disabled={localBusy}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 shrink-0 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                {localBusy ? '...' : localHasPasscode ? 'Unlock' : 'Set & Enter'}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Authorized owner access</span>
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
    { id: 'upload', label: editingProject ? 'Edit Project' : 'Upload Project', icon: ImagePlus },
    { id: 'projects', label: 'Project Gallery', icon: FolderKanban, badge: stats.totalProjects },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
    { id: 'inquiries', label: 'Client Inquiries', icon: Mail, badge: stats.newInquiriesCount },
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
        <Link
          to="/"
          className="text-xs font-medium text-orange-400 hover:text-orange-300 whitespace-nowrap"
        >
          Live Site
        </Link>
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
            <Link
              to="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 border border-white/15 rounded-md hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public Site
            </Link>
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
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  <h2 className="font-display text-base font-bold text-[#0B1B2B]">
                    Recent Project Uploads
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('projects')}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    Manage All Projects
                  </button>
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
                                referrerPolicy="no-referrer"
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

          {/* Setup & Rules Tab */}
          {activeTab === 'setup' && <SetupGuidePanel />}
        </main>
      </div>
    </div>
  );
};
