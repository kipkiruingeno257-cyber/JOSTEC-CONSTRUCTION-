import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { ProjectCategory } from '../../types';

interface ServiceItem {
  number: string;
  title: ProjectCategory;
  summary: string;
  specs: string;
}

const SERVICES: ServiceItem[] = [
  {
    number: '01',
    title: 'Building Construction',
    summary:
      'Turnkey structural foundations, reinforced concrete columns, commercial steel-framed warehouses, and residential structural additions.',
    specs: 'Reinforced Concrete · Structural I-Beams · Site Foundations',
  },
  {
    number: '02',
    title: 'Welding Services',
    summary:
      'Certified shop and mobile field welding for structural joints, heavy equipment repair, trusses, and load-bearing steel assemblies.',
    specs: 'MIG / TIG / Stick · Mobile Field Rig · Structural Joints',
  },
  {
    number: '03',
    title: 'Metal Fabrication',
    summary:
      'Custom steel staircases, mezzanine decks, roof trusses, canopies, security grilles, and precision architectural metalwork.',
    specs: 'Mild & Galvanized Steel · Custom Jigs · Epoxy Finishes',
  },
  {
    number: '04',
    title: 'Gate Installation',
    summary:
      'Complete masonry pillar casting, subterranean conduit routing, heavy-duty hinge anchoring, and motor automation commissioning.',
    specs: 'Anchor Footings · Access Control · Weather-Sealed Motors',
  },
  {
    number: '05',
    title: 'Sliding Gates',
    summary:
      'Space-efficient cantilever and V-track steel sliding gates engineered for wide commercial driveways and steep residential entrances.',
    specs: 'Cantilever & Floor Track · Rack-and-Pinion · Safety Sensors',
  },
  {
    number: '06',
    title: 'Swing Gates',
    summary:
      'Single and double-leaf architectural swing gates fabricated with sealed ball-bearing hinges and concealed electromechanical rams.',
    specs: 'Single & Double Leaf · Heavy Pivot Hinges · Smart Entry',
  },
  {
    number: '07',
    title: 'Steel Doors & Windows',
    summary:
      'Reinforced security doors, industrial fire-rated steel frames, burglar-proof casement windows, and custom architectural mullions.',
    specs: 'Multi-Point Locks · Heavy Gauge Tube · Powder Coated',
  },
  {
    number: '08',
    title: 'Perimeter Fencing',
    summary:
      'High-security palisade steel fencing, welded mesh panels, razor-coil brackets, and integrated masonry boundary walls.',
    specs: 'Palisade & Weld Mesh · Anti-Climb Profiles · Masonry Walls',
  },
  {
    number: '09',
    title: 'Repairs & Maintenance',
    summary:
      'Structural weld remediation, rusted gate frame restoration, track realignment, hinge replacement, and gate operator servicing.',
    specs: 'Rapid Diagnostics · Track Re-Leveling · Rust Remediation',
  },
];

interface ServicesSectionProps {
  onSelectServiceForQuote: (service: ProjectCategory) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectServiceForQuote }) => {
  return (
    <section id="services" className="py-20 lg:py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <p className="text-sm font-semibold text-orange-600 tracking-wide mb-3">
            Engineering &amp; Fabrication Capabilities
          </p>
          <h2
            className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B2B] mb-4"
            style={{ textWrap: 'balance' }}
          >
            Nine Specialized Disciplines Under One Roof
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Every discipline is executed by our in-house crew—combining structural site engineering
            with heavy-gauge metal fabrication.
          </p>
        </div>

        {/* Visual Showcase Strip (Asymmetric 3-photo feature) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
          <div className="md:col-span-6 relative rounded-lg overflow-hidden border border-slate-200 bg-[#0B1B2B] aspect-[4/3] md:aspect-auto md:h-72">
            <img
              src="/src/assets/images/service_building_steel_1795248990930.jpg"
              alt="Structural steel frame erection for commercial building construction"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#0B1B2B]/90 via-[#0B1B2B]/30 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <p className="text-xs font-medium text-orange-400 mb-1">Structural Construction</p>
              <p className="font-display text-lg font-bold">
                Commercial Steel Framing &amp; Reinforced Foundations
              </p>
            </div>
          </div>

          <div className="md:col-span-3 relative rounded-lg overflow-hidden border border-slate-200 bg-[#0B1B2B] aspect-[4/3] md:aspect-auto md:h-72">
            <img
              src="/src/assets/images/workshop_fabrication_1795248991295.jpg"
              alt="Precision welding of heavy structural steel I-beams in workshop"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#0B1B2B]/90 via-[#0B1B2B]/35 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-xs font-medium text-orange-400 mb-1">Shop Fabrication</p>
              <p className="font-display text-base font-bold">Certified Structural Welding</p>
            </div>
          </div>

          <div className="md:col-span-3 relative rounded-lg overflow-hidden border border-slate-200 bg-[#0B1B2B] aspect-[4/3] md:aspect-auto md:h-72">
            <img
              src="/src/assets/images/about_perimeter_fencing_1795248991676.jpg"
              alt="Custom perimeter steel fencing and automated swing gate entrance"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#0B1B2B]/90 via-[#0B1B2B]/35 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-xs font-medium text-orange-400 mb-1">Perimeter Security</p>
              <p className="font-display text-base font-bold">Gates &amp; Palisade Fencing</p>
            </div>
          </div>
        </div>

        {/* 9 Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service) => (
            <div
              key={service.title}
              className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-baseline justify-between gap-4 mb-3">
                  <span className="font-mono text-xs font-semibold text-orange-600 tabular-nums">
                    {service.number}.
                  </span>
                  <span className="text-xs text-slate-400 font-medium truncate">
                    {service.specs}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#0B1B2B] mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">{service.summary}</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <a
                  href="#contact"
                  onClick={() => onSelectServiceForQuote(service.title)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1B2B] hover:text-orange-600 transition-colors whitespace-nowrap shrink-0"
                >
                  Request Estimate
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
