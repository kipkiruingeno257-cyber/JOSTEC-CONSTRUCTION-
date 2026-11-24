import React from 'react';
import { Award, CheckCircle2, Clock, Shield, Wrench } from 'lucide-react';

const PILLARS = [
  {
    icon: Shield,
    title: 'Engineering Professionalism',
    metric: 'Site-Measured',
    description:
      'Every project begins with accurate site measurement, gauge calculation, and written material specifications before a single steel beam is cut.',
  },
  {
    icon: Wrench,
    title: 'Precision Workmanship',
    metric: 'Full-Penetration Welds',
    description:
      'Clean structural welds, ground-flush architectural seams, and jig-aligned gate frames that operate smoothly without sagging or binding.',
  },
  {
    icon: Award,
    title: 'Long-Term Durability',
    metric: 'Multi-Coat Protection',
    description:
      'Heavy-wall steel sections treated with zinc-rich anti-corrosion primer and industrial topcoats to withstand weather and daily mechanical duty.',
  },
  {
    icon: Clock,
    title: 'Schedule Reliability',
    metric: 'Planned Delivery',
    description:
      'Coordinated workshop fabrication timelines paired with scheduled site installation windows so your construction milestones stay on track.',
  },
  {
    icon: CheckCircle2,
    title: 'Direct Accountability',
    metric: 'Single-Point Lead',
    description:
      'You coordinate directly with the build team from initial site inspection through final anchoring, commissioning, and maintenance support.',
  },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Site Survey & Dimensions',
    detail:
      'We inspect ground levels, pillar foundations, clear spans, and structural load conditions before drafting specifications.',
  },
  {
    step: '02',
    title: 'Material Spec & Written Quote',
    detail:
      'Receive a transparent breakdown covering steel gauge, concrete mix, hardware selection, surface coating, and timeline.',
  },
  {
    step: '03',
    title: 'Workshop Fabrication & Priming',
    detail:
      'Frames, trusses, and custom metal gates are cut, welded, ground flush, and treated with anti-corrosion primer prior to dispatch.',
  },
  {
    step: '04',
    title: 'On-Site Anchoring & Handover',
    detail:
      'Permanent masonry anchoring, track leveling, balance checks, and final operational walkthrough with the property owner.',
  },
];

export const WhyChooseUsSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-24 bg-[#0B1B2B] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4">
            <p className="text-sm font-semibold text-orange-400 tracking-wide mb-3">
              Why Choose Us
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5"
              style={{ textWrap: 'balance' }}
            >
              Built for Clients Who Refuse Shortcuts
            </h2>
            <p className="text-base text-slate-300 leading-relaxed">
              Structural steel and perimeter security only perform as well as their weakest weld or
              shallowest footing. We build every element to outlast standard contractor tolerances.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="bg-[#0F2338] border border-white/10 rounded-lg p-6"
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="w-10 h-10 rounded-md bg-orange-600/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs text-slate-300 tabular-nums">
                      {pillar.metric}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{pillar.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4-Step Execution Workflow */}
        <div className="pt-14 border-t border-white/10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-sm font-semibold text-orange-400 tracking-wide mb-2">
                How We Execute Every Build
              </p>
              <h3
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                From Site Measurement to Permanent Handover
              </h3>
            </div>
            <a
              href="#contact"
              className="text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors whitespace-nowrap shrink-0"
            >
              Schedule a Site Survey &rarr;
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW_STEPS.map((item) => (
              <div
                key={item.step}
                className="bg-[#081522] border border-white/10 rounded-lg p-6 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-orange-400 tabular-nums block mb-3">
                    {item.step}.
                  </span>
                  <h4 className="font-display text-base font-bold text-white mb-2">
                    {item.title}
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
