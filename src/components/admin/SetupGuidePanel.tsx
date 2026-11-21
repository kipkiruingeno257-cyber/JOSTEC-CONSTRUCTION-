import React from 'react';
import { CheckCircle2, Database, ImagePlus, Link2, Server, ShieldCheck, Terminal } from 'lucide-react';
import { activeFirebaseConfig, isFirebaseConfigured } from '../../lib/firebase';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../../types';

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
              Default upload target. Compresses photos to WebP (max 1600px) in the browser and
              stores them securely on the Express server (<code className="font-mono">/api/media/*</code>).
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
