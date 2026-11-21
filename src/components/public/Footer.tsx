import React from 'react';
import { ShieldCheck, UserCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext';
import { COMPANY_INFO } from '../../types';

export const Footer: React.FC = () => {
  const { activeAdminMode } = useFirebase();

  return (
    <footer className="bg-[#0B1B2B] text-slate-300 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/10">
          <div className="md:col-span-5">
            <p className="font-display text-lg font-bold text-white mb-2">{COMPANY_INFO.name}</p>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Independent civil construction engineering, certified welding, custom steel
              fabrication, automated gates, and perimeter security systems.
            </p>
          </div>

          <div className="md:col-span-4 space-y-2 text-sm">
            <p className="font-semibold text-white mb-2">Workshop &amp; Contact</p>
            <p className="text-slate-400">{COMPANY_INFO.address}</p>
            <p className="font-mono text-slate-300 tabular-nums">{COMPANY_INFO.phoneDisplay}</p>
            <p className="text-slate-400">{COMPANY_INFO.email}</p>
          </div>

          <div className="md:col-span-3 space-y-2 text-sm">
            <p className="font-semibold text-white mb-2">Navigation</p>
            <div className="flex flex-col space-y-1.5">
              <a href="#about" className="hover:text-white transition-colors">
                About Us
              </a>
              <a href="#services" className="hover:text-white transition-colors">
                Our Services
              </a>
              <a href="#projects" className="hover:text-white transition-colors">
                Project Gallery
              </a>
              <a href="#contact" className="hover:text-white transition-colors">
                Contact &amp; Quotes
              </a>
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 font-medium pt-1 transition-colors"
              >
                <UserCog className="w-4 h-4 shrink-0" />
                {activeAdminMode ? 'Admin Dashboard' : 'Admin Login'}
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} {COMPANY_INFO.name}. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">
              Structural Engineering · Metal Fabrication · Perimeter Security
            </span>
            <Link
              to="/admin"
              aria-label={activeAdminMode ? 'Open Admin Dashboard' : 'Administrator Login'}
              title={activeAdminMode ? 'Open Admin Dashboard' : 'Administrator Login'}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-orange-500/40 bg-orange-600/15 text-white hover:bg-orange-600 hover:border-orange-600 transition-colors whitespace-nowrap shrink-0"
            >
              {activeAdminMode ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <UserCog className="w-4 h-4 text-orange-400 shrink-0" />
              )}
              <span className="font-semibold">
                {activeAdminMode ? 'Admin Dashboard' : 'Admin Login'}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
