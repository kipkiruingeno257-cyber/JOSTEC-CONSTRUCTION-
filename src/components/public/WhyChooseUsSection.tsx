import React from 'react';
import { Award, CheckCircle2, Clock, Shield, Wrench } from 'lucide-react';

const PILLARS = [
  {
    icon: Shield,
    title: 'Engineering Professionalism',
    metric: '100% Spec-Verified',
    description:
      'Every project begins with accurate site measurement, gauge calculation, and written material specifications before a single steel beam is cut.',
  },
  {
    icon: Wrench,
    title: 'Precision Workmanship',
    metric: 'AWS D1.1 Standards',
    description:
      'Full-penetration structural welds, ground-flush architectural seams, and jig-aligned gate frames that operate smoothly without binding.',
  },
  {
    icon: Award,
    title: 'Long-Term Durability',
    metric: 'Multi-Coat Protection',
    description:
      'Heavy-wall steel sections treated with zinc-rich anti-corrosion primer and industrial topcoats to withstand weather and heavy daily duty.',
  },
  {
    icon: Clock,
    title: 'Schedule Reliability',
    metric: '98% On-Time Handover',
    description:
      'Disciplined workshop fabrication schedules paired with coordinated site installation windows so your construction timeline stays intact.',
  },
  {
    icon: CheckCircle2,
    title: 'Customer Satisfaction',
    metric: 'Direct Owner Oversight',
    description:
      'You work directly with the lead engineer from initial estimate through final safety check and post-installation maintenance support.',
  },
];

export const WhyChooseUsSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-24 bg-[#0B1B2B] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>
    </section>
  );
};
