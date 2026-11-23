import React from 'react';
import { Link } from 'react-router-dom';
import { COMPANY_INFO } from '../../types';

export const Footer: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
              <Link
                to="/about"
                onClick={() => scrollToSection('about')}
                className="hover:text-white transition-colors"
              >
                About Us
              </Link>
              <Link
                to="/services"
                onClick={() => scrollToSection('services')}
                className="hover:text-white transition-colors"
              >
                Our Services
              </Link>
              <Link
                to="/projects"
                onClick={() => scrollToSection('projects')}
                className="hover:text-white transition-colors"
              >
                Project Gallery
              </Link>
              <Link
                to="/reviews"
                onClick={() => scrollToSection('testimonials')}
                className="hover:text-white transition-colors"
              >
                Client Reviews
              </Link>
              <Link
                to="/contact"
                onClick={() => scrollToSection('contact')}
                className="hover:text-white transition-colors"
              >
                Contact &amp; Quotes
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} {COMPANY_INFO.name}. All rights reserved.
          </p>
          <span>Structural Engineering · Metal Fabrication · Perimeter Security</span>
        </div>
      </div>
    </footer>
  );
};
