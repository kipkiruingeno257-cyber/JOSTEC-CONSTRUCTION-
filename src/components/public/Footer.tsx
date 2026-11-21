import React from 'react';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COMPANY_INFO } from '../../types';

export const Footer: React.FC = () => {
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
                <Lock className="w-3.5 h-3.5" />
                Owner Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} {COMPANY_INFO.name}. All rights reserved.
          </p>
          <p>Structural Engineering · Metal Fabrication · Perimeter Security</p>
        </div>
      </div>
    </footer>
  );
};
