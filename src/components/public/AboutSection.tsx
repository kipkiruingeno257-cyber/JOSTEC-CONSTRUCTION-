import React from 'react';
import { Award, Compass, ShieldCheck } from 'lucide-react';
import { COMPANY_INFO } from '../../types';
import { FastImage } from '../FastImage';

const ENGINEER_PORTRAIT_JPG = '/src/assets/images/engineer_portrait_1795248991352.jpg';
const ENGINEER_PORTRAIT_WEBP = '/src/assets/images/engineer_portrait_1795248991352.webp';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 lg:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-stretch">
          {/* Engineer Portrait Column */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="relative flex-1 min-h-[400px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
              <FastImage
                src={ENGINEER_PORTRAIT_JPG}
                webpSrc={ENGINEER_PORTRAIT_WEBP}
                alt={`${COMPANY_INFO.engineerName} holding structural blueprints inside the fabrication bay`}
                className="w-full h-full object-cover object-top"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0B1B2B]/90 via-[#0B1B2B]/40 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="font-display text-lg font-semibold">{COMPANY_INFO.engineerName}</p>
                <p className="text-sm text-slate-200">{COMPANY_INFO.engineerTitle}</p>
              </div>
            </div>
          </div>

          {/* Company Introduction, Expertise, Mission & Vision */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-sm font-semibold text-orange-600 tracking-wide mb-3">
              About Our Practice
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B2B] mb-6"
              style={{ textWrap: 'balance' }}
            >
              Direct Engineering Accountability From Blueprint to Final Weld
            </h2>

            <div className="space-y-4 text-base text-slate-600 leading-relaxed mb-10">
              <p>
                {COMPANY_INFO.name} is an independent civil construction engineering and custom
                metal fabrication firm. Led personally on-site by {COMPANY_INFO.engineerName}, we
                bridge the gap between structural design calculations and heavy field execution—eliminating
                subcontractor handoff failures and inconsistent workmanship.
              </p>
              <p>
                With over 18 years of hands-on structural framing, foundation work, certified arc
                and TIG/MIG welding, and automated security gate commissioning, every beam, column,
                hinge pin, and perimeter anchor is built to verifiable engineering tolerances.
              </p>
            </div>

            {/* Experience Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-y border-slate-200 mb-10">
              <div>
                <div className="flex items-center gap-2 text-[#0B1B2B] font-semibold text-sm mb-1.5">
                  <Compass className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Structural Design</span>
                </div>
                <p className="text-sm text-slate-600">
                  Load-bearing steel framing, concrete footings, and wind-rated perimeter walls.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#0B1B2B] font-semibold text-sm mb-1.5">
                  <Award className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Shop Precision</span>
                </div>
                <p className="text-sm text-slate-600">
                  CNC-cut gussets, jig-aligned gates, and multi-coat anti-corrosion primers.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#0B1B2B] font-semibold text-sm mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Single-Point Lead</span>
                </div>
                <p className="text-sm text-slate-600">
                  One accountable engineer overseeing site prep, fabrication, and handover.
                </p>
              </div>
            </div>

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B1B2B] mb-2">
                  Our Mission
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Deliver structurally sound construction and custom metal fabrication with
                  transparent material specifications, disciplined timelines, and workmanship that
                  protects property and investment value.
                </p>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#0B1B2B] mb-2">
                  Our Vision
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  To set the regional benchmark for independent construction engineering—where every
                  fabricated gate, steel portal, and commercial structure stands as permanent proof
                  of integrity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
