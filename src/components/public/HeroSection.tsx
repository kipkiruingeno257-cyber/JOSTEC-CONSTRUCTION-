import React from 'react';
import { ArrowRight, Building2 } from 'lucide-react';
import { FastImage } from '../FastImage';

const HERO_IMAGE_JPG = '/src/assets/images/hero_structural_gate_1795248991739.jpg';
const HERO_IMAGE_WEBP = '/src/assets/images/hero_structural_gate_1795248991739.webp';

export const HeroSection: React.FC = () => {
  return (
    <section id="top" className="bg-[#0B1B2B] text-white">
      <div className="relative min-h-[560px] lg:min-h-[640px] flex items-center">
        <div className="absolute inset-0">
          <FastImage
            src={HERO_IMAGE_JPG}
            webpSrc={HERO_IMAGE_WEBP}
            alt="Custom fabricated heavy-duty structural steel sliding gate and concrete perimeter wall"
            priority
            darkBg
            className="w-full h-full object-cover"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#0B1B2B]/95 via-[#0B1B2B]/75 to-[#0B1B2B]/30"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 w-full">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-orange-400 tracking-wide mb-4">
              Civil Construction · Structural Steel · Custom Metal Fabrication
            </p>
            <h1
              className="font-display font-bold tracking-tight text-white leading-[1.08] mb-6"
              style={{
                fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)',
                textWrap: 'balance',
              }}
            >
              Built to Load Spec. Fabricated to Endure.
            </h1>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl mb-8">
              Independent structural construction engineering, certified welding, and precision
              security metalworks—delivering permanent gates, steel frames, and reinforced
              perimeter systems engineered for decades of field service.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                Contact Us
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#projects"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white border border-white/30 bg-[#0B1B2B]/60 backdrop-blur-sm rounded-md hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Building2 className="w-4 h-4 text-orange-400" />
                View Our Projects
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width 4-column structural credentials strip */}
      <div className="border-t border-white/10 bg-[#081522]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums">18+ Years</p>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">Field Construction &amp; Steelwork</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums">AWS D1.1</p>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">Structural Welding Standards</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums">340+ Sites</p>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">Commercial &amp; Residential Builds</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums">100% In-House</p>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">Fabrication, Anchoring &amp; Commissioning</p>
          </div>
        </div>
      </div>
    </section>
  );
};
