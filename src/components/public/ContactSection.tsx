import React, { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';
import { isFirebaseConfigured } from '../../lib/firebase';
import { submitPublicInquiry } from '../../services/firestoreService';
import { submitLocalInquiry } from '../../services/localMediaService';
import { COMPANY_INFO, PROJECT_CATEGORIES, type ProjectCategory } from '../../types';

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

const WorkshopMarker: React.FC = () => {
  const [infoOpen, setInfoOpen] = useState(false);
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={COMPANY_INFO.coordinates}
        onClick={() => setInfoOpen((prev) => !prev)}
        title={COMPANY_INFO.name}
      >
        <Pin background="#ea580c" borderColor="#9a3412" glyphColor="#ffffff" scale={1.15} />
      </AdvancedMarker>
      {infoOpen && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={260}
          onCloseClick={() => setInfoOpen(false)}
        >
          <div className="p-1 text-slate-900">
            <p className="font-bold text-sm">{COMPANY_INFO.name}</p>
            <p className="text-xs text-slate-600 mt-1">{COMPANY_INFO.address}</p>
            <p className="text-xs text-slate-500 mt-1">{COMPANY_INFO.hours}</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface ContactSectionProps {
  preselectedService?: ProjectCategory | '';
}

export const ContactSection: React.FC<ContactSectionProps> = ({ preselectedService = '' }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState<string>(
    preselectedService || 'Building Construction'
  );
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedService) {
      setServiceType(preselectedService);
    }
  }, [preselectedService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const inquiryData = {
        name,
        phone,
        email,
        serviceType,
        message,
      };
      if (isFirebaseConfigured) {
        try {
          await submitPublicInquiry(inquiryData);
        } catch {
          await submitLocalInquiry(inquiryData);
        }
      } else {
        await submitLocalInquiry(inquiryData);
      }
      setSubmitSuccess(true);
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to send your request.');
    } finally {
      setSubmitting(false);
    }
  };

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${COMPANY_INFO.coordinates.lat},${COMPANY_INFO.coordinates.lng}`;

  return (
    <section id="contact" className="py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold text-orange-600 tracking-wide mb-3">
            Site Consultations &amp; Estimates
          </p>
          <h2
            className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B2B] mb-3"
            style={{ textWrap: 'balance' }}
          >
            Discuss Your Project With Our Lead Engineer
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Share your dimensions, site address, or drawings below, or contact our workshop directly
            by phone or WhatsApp for a site inspection.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Contact Form */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-lg p-6 sm:p-8">
            <h3 className="font-display text-xl font-bold text-[#0B1B2B] mb-6">
              Request a Project Quote
            </h3>

            {submitSuccess && (
              <div className="mb-6 p-4 rounded-md bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Inquiry received.</p>
                  <p className="text-emerald-800 mt-0.5">
                    Your project details have been logged for {COMPANY_INFO.engineerName}. We will
                    follow up within one business day.
                  </p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-phone"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Phone or WhatsApp Number
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    required
                    minLength={6}
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    maxLength={120}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-service"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Service Required
                  </label>
                  <select
                    id="contact-service"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                  >
                    {PROJECT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Project Scope &amp; Site Location
                </label>
                <textarea
                  id="contact-message"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your gate span, perimeter length, building structure requirements, and site address..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Sending Request...' : 'Send Project Inquiry'}
              </button>
            </form>
          </div>

          {/* Direct Contact Channels & Interactive Google Map */}
          <div className="lg:col-span-5 space-y-6">
            <div className="border border-slate-200 rounded-lg p-6 space-y-5 bg-white">
              <h3 className="font-display text-lg font-bold text-[#0B1B2B]">
                Direct Workshop &amp; Office Contacts
              </h3>

              <div className="space-y-4 text-sm">
                <a
                  href={COMPANY_INFO.phoneHref}
                  className="flex items-start gap-3 text-slate-700 hover:text-orange-600 transition-colors"
                >
                  <Phone className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#0B1B2B]">Telephone</p>
                    <p className="font-mono tabular-nums">{COMPANY_INFO.phoneDisplay}</p>
                  </div>
                </a>

                <a
                  href={COMPANY_INFO.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-slate-700 hover:text-orange-600 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#0B1B2B]">WhatsApp Direct</p>
                    <p>Send site photos or gate measurements directly on WhatsApp</p>
                  </div>
                </a>

                <a
                  href={`mailto:${COMPANY_INFO.email}`}
                  className="flex items-start gap-3 text-slate-700 hover:text-orange-600 transition-colors"
                >
                  <Mail className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#0B1B2B]">Email</p>
                    <p>{COMPANY_INFO.email}</p>
                  </div>
                </a>

                <div className="flex items-start gap-3 text-slate-700">
                  <MapPin className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#0B1B2B]">Fabrication Yard &amp; Office</p>
                    <p>{COMPANY_INFO.address}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{COMPANY_INFO.cityRegion}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-slate-700">
                  <Clock className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#0B1B2B]">Operating Hours</p>
                    <p className="font-mono text-xs tabular-nums mt-0.5">{COMPANY_INFO.hours}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Map Viewport */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
              <div className="h-72 w-full">
                {MAPS_API_KEY ? (
                  <APIProvider apiKey={MAPS_API_KEY} libraries={['marker']}>
                    <Map
                      mapId="DEMO_MAP_ID"
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      defaultCenter={COMPANY_INFO.coordinates}
                      defaultZoom={14}
                      gestureHandling="cooperative"
                      className="w-full h-full"
                    >
                      <WorkshopMarker />
                    </Map>
                  </APIProvider>
                ) : (
                  <div className="w-full h-full bg-[#0B1B2B] text-white flex flex-col items-center justify-center p-6 text-center">
                    <MapPin className="w-8 h-8 text-orange-400 mb-3" />
                    <p className="font-display font-bold text-base mb-1">
                      {COMPANY_INFO.name}
                    </p>
                    <p className="text-xs text-slate-300 max-w-xs mb-4">
                      {COMPANY_INFO.address}
                    </p>
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                    >
                      Open Location in Google Maps
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="truncate">{COMPANY_INFO.address}</span>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 whitespace-nowrap shrink-0 ml-3"
                >
                  Get Directions
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
