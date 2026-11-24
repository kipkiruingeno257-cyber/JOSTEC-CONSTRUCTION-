import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { JOSTEC_FAQS } from '../../lib/seoConfig';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 lg:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4">
            <p className="text-sm font-semibold text-orange-600 tracking-wide mb-3">
              Technical Specification Guide
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B2B] mb-4"
              style={{ textWrap: 'balance' }}
            >
              Common Questions on Gates &amp; Steelwork
            </h2>
            <p className="text-base text-slate-600 leading-relaxed mb-6">
              Clear answers covering sliding versus swing gates, concrete pillar footings,
              anti-corrosion treatment, and site measurements across Kenya.
            </p>
            <a
              href="#contact"
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-[#0B1B2B] rounded-md hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1B2B]"
            >
              Ask About Your Site
            </a>
          </div>

          <div className="lg:col-span-8 divide-y divide-slate-200 border border-slate-200 rounded-lg bg-slate-50">
            {JOSTEC_FAQS.map((item, idx) => {
              const isOpen = openIndex === idx;
              const panelId = `faq-panel-${idx}`;
              return (
                <div key={item.question} className="bg-white first:rounded-t-lg last:rounded-b-lg">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex((prev) => (prev === idx ? null : idx))}
                    className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-display text-base font-bold text-[#0B1B2B]">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-orange-600 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div id={panelId} className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
