import React from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Database,
  Gauge,
  ImagePlus,
  Link2,
  Lock,
  Server,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { activeFirebaseConfig, isFirebaseConfigured } from '../../lib/firebase';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../../types';

const FUNCTIONAL_REQUIREMENTS = [
  'Public Homepage Hero with direct Contact Us & View Our Projects calls to action',
  'About Us section covering company profile, lead engineer credentials, mission & vision',
  '9 Specialized Service cards (Building Construction, Welding, Metal Fabrication, Gate Installation, Sliding Gates, Swing Gates, Steel Doors & Windows, Perimeter Fencing, Repairs & Maintenance)',
  'Dynamic Project Gallery synced live from Firestore & App Server with category filtering, lightbox inspection, and keyboard navigation',
  'Why Choose Us pillars & Admin-managed Verified Client Testimonials',
  'Contact & Quote section with Phone, WhatsApp, Email, Contact Form persistence & interactive Google Maps',
  'Footer Admin Login icon button routing directly to protected /admin Owner Portal',
  'Admin Dashboard with Overview KPIs, Multi-Source Image Upload (Mobile Camera, Desktop, Clipboard Paste, Direct URLs), Draft/Publish/Unpublish/Edit/Delete workflows & Photo Appearance Studio',
];

const NON_FUNCTIONAL_REQUIREMENTS = [
  {
    title: 'Performance & Fast Image Delivery',
    detail:
      'Client-side WebP compression (max 1200px), eager pre-decoding for top gallery covers, immutable 1-year media caching headers, RAM-cached public portfolio API, and parallel 3-stream uploads.',
  },
  {
    title: 'Security & Access Control',
    detail:
      'Firebase Auth RBAC + Firestore security rules validation, HttpOnly HMAC-signed local session cookies, server-side scrypt passcode hashing, magic-byte image inspection, and 10 MB / 12-file caps.',
  },
  {
    title: 'Reliability & Fault Tolerance',
    detail:
      'Dual-mode persistence (Cloud Firestore + Standalone App Media Server), React ErrorBoundary protection, structured permission error reporting, and non-blocking gallery loading fallbacks.',
  },
  {
    title: 'Usability, Accessibility & Responsiveness',
    detail:
      'Mobile-first layouts, high-contrast Navy/Orange/White/Charcoal typography, ARIA dialog/tablist semantics, keyboard Escape/Arrow lightbox controls, and live appearance previews.',
  },
];

export const SetupGuidePanel: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Flexible Media Architecture */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <ImagePlus className="w-5 h-5 text-orange-600" />
          <h3 className="font-display text-lg font-bold text-[#0B1B2B]">
            Flexible Image Hosting (No Firebase Storage Required)
          </h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Administrators can add, optimize, rotate, and publish project photographs using three
          independent channels without enabling Firebase Storage:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-[#0B1B2B]">
              <Server className="w-4 h-4 text-orange-600" />
              <span>App Media Server</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Default upload target. Compresses photos to WebP (max 1200px) in the browser and
              stores them securely on the Express server (<code className="font-mono">/api/media/*</code>) with 1-year immutable caching.
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-[#0B1B2B]">
              <Link2 className="w-4 h-4 text-orange-600" />
              <span>Direct Image URLs</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Paste one or more existing photo URLs (cloud CDN, Google Photos/Drive direct links, or
              hosted assets) directly into a project with zero file upload.
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-[#0B1B2B]">
              <Database className="w-4 h-4 text-orange-600" />
              <span>Local Server Mode</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sign in with your private local workshop passcode at <code className="font-mono">/admin</code> to
              save projects, reviews, and photos directly on the app server with zero Firebase dependency.
            </p>
          </div>
        </div>
      </div>

      {/* System Specifications: Functional & Non-Functional Requirements */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
          <ClipboardCheck className="w-5 h-5 text-orange-600" />
          <div>
            <h3 className="font-display text-lg font-bold text-[#0B1B2B]">
              System Requirements Specification
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete functional capabilities and non-functional engineering standards built into this platform.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Functional Requirements
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
              {FUNCTIONAL_REQUIREMENTS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-md p-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-orange-600" />
              Non-Functional Requirements
            </h4>
            <div className="space-y-3">
              {NON_FUNCTIONAL_REQUIREMENTS.map((req) => (
                <div
                  key={req.title}
                  className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-1"
                >
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#0B1B2B]">
                    <Lock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>{req.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{req.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Firebase Connection Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <Database className="w-5 h-5 text-orange-600" />
          <h3 className="font-display text-lg font-bold text-[#0B1B2B]">
            Optional Cloud Environment (Firebase)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Firebase Project ID</p>
            <p className="font-mono font-semibold text-[#0B1B2B]">
              {activeFirebaseConfig.projectId || 'Not configured (Local Mode Active)'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Firestore Database ID</p>
            <p className="font-mono font-semibold text-[#0B1B2B] truncate">
              {activeFirebaseConfig.firestoreDatabaseId || '(default)'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Optional Storage Bucket</p>
            <p className="font-mono font-semibold text-[#0B1B2B] truncate">
              {activeFirebaseConfig.storageBucket || 'Not configured'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Primary Google Admin</p>
            <p className="font-mono font-semibold text-[#0B1B2B] truncate">
              {BOOTSTRAPPED_ADMIN_EMAIL}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {isFirebaseConfigured
              ? 'Firebase Cloud Sync is configured alongside the built-in App Media Server.'
              : 'Running cleanly in Standalone Local Server Mode.'}
          </span>
        </div>
      </div>

      {/* Optional Firebase Storage Rules Note */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-orange-600" />
          <h3 className="font-display text-lg font-bold text-[#0B1B2B]">
            Optional Firebase Storage &amp; Hosting Rules
          </h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          If you choose the <strong>Firebase Storage Bucket</strong> upload destination while signed
          in with Google, ensure Storage is enabled for{' '}
          <strong className="font-mono">{activeFirebaseConfig.projectId || 'your-project'}</strong>{' '}
          and deploy <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">storage.rules</code>:
        </p>
        <div className="bg-[#0B1B2B] text-slate-100 rounded-md p-4 font-mono text-xs overflow-x-auto space-y-1.5">
          <div className="flex items-center gap-2 text-orange-400 mb-2">
            <Terminal className="w-4 h-4" />
            <span>Firebase CLI Commands</span>
          </div>
          <p>npm install -g firebase-tools</p>
          <p>firebase login</p>
          <p>firebase use {activeFirebaseConfig.projectId || '<project-id>'}</p>
          <p>firebase deploy --only firestore:rules,storage</p>
        </div>
      </div>
    </div>
  );
};
