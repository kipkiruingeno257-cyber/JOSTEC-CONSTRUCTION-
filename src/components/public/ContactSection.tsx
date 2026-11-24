import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useSiteProfile } from '../../hooks/useSiteProfile';
import { isFirebaseConfigured } from '../../lib/firebase';
import { submitPublicInquiry } from '../../services/firestoreService';
import { submitLocalInquiry } from '../../services/localMediaService';
import { COMPANY_INFO, PROJECT_CATEGORIES, SCHEMA_LIMITS, type ProjectCategory } from '../../types';

export interface QuotePrefillRequest {
  service: ProjectCategory;
  scopeText?: string;
  nonce: number;
}

interface ContactSectionProps {
  preselectedService?: ProjectCategory | '';
  prefillRequest?: QuotePrefillRequest | null;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  preselectedService = '',
  prefillRequest = null,
}) => {
  const profile = useSiteProfile();

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

  useEffect(() => {
    if (!prefillRequest) return;
    setServiceType(prefillRequest.service);
    if (prefillRequest.scopeText) {
      setMessage((prev) =>
        prev.trim().length === 0
          ? prefillRequest.scopeText || ''
          : `${prefillRequest.scopeText}\n\n${prev}`
      );
    }
    setSubmitSuccess(false);
  }, [prefillRequest]);

  const brandName = profile.companyName?.trim() || COMPANY_INFO.name;
  const phoneDisplay = profile.phoneDisplay?.trim() || '';
  const phoneHref = phoneDisplay ? `tel:${phoneDisplay.replace(/[^+\d]/g, '')}` : '';
  const whatsappDigits = profile.whatsappNumber?.replace(/[^0-9]/g, '') || '';
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `Hello ${brandName}, I would like to request a project quote.`
      )}`
    : '';
  const contactEmail = profile.contactEmail?.trim() || '';
  const workshopAddress = profile.workshopAddress?.trim() || '';
  const cityRegion = profile.cityRegion?.trim() || COMPANY_INFO.cityRegion;
  const operatingHours = profile.operatingHours?.trim() || '';
  const hasDirectContactChannel = Boolean(
    phoneDisplay || whatsappDigits || contactEmail || workshopAddress || operatingHours
  );

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
            Request a Site Survey or Project Quote
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Share your gate span, steel fabrication specs, or building dimensions along with your
            county or town in Kenya below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Contact Form */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-lg p-6 sm:p-8">
            <h3 className="font-display text-xl font-bold text-[#0B1B2B] mb-6">
              Project Specification &amp; Inquiry Form
            </h3>

            {submitSuccess && (
              <div className="mb-6 p-4 rounded-md bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Inquiry received.</p>
                  <p className="text-emerald-800 mt-0.5">
                    Your project details have been logged for {brandName}. We will review your scope
                    and follow up directly.
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
                    minLength={SCHEMA_LIMITS.inquiry.nameMin}
                    maxLength={SCHEMA_LIMITS.inquiry.nameMax}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
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
                    minLength={SCHEMA_LIMITS.inquiry.phoneMin}
                    maxLength={SCHEMA_LIMITS.inquiry.phoneMax}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 7XX XXX XXX"
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
                    maxLength={SCHEMA_LIMITS.inquiry.emailMax}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
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
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Project Scope &amp; Site Location
                  </label>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    {message.length}/{SCHEMA_LIMITS.inquiry.messageMax}
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  required
                  minLength={SCHEMA_LIMITS.inquiry.messageMin}
                  maxLength={SCHEMA_LIMITS.inquiry.messageMax}
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your gate span, perimeter length, building structure requirements, and site county/town..."
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

          {/* Direct Contact Channels & Consultation Readiness */}
          <div className="lg:col-span-5 space-y-6">
            {hasDirectContactChannel && (
              <div className="border border-slate-200 rounded-lg p-6 space-y-5 bg-white">
                <h3 className="font-display text-lg font-bold text-[#0B1B2B]">
                  Direct Workshop &amp; Office Contacts
                </h3>

                <div className="space-y-4 text-sm">
                  {phoneDisplay && (
                    <a
                      href={phoneHref}
                      className="flex items-start gap-3 text-slate-700 hover:text-orange-600 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-[#0B1B2B]">Telephone</p>
                        <p className="font-mono tabular-nums">{phoneDisplay}</p>
                      </div>
                    </a>
                  )}

                  {whatsappHref && (
                    <a
                      href={whatsappHref}
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
                  )}

                  {contactEmail && (
                    <a
                      href={`mailto:${contactEmail}`}
                      className="flex items-start gap-3 text-slate-700 hover:text-orange-600 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-[#0B1B2B]">Email</p>
                        <p>{contactEmail}</p>
                      </div>
                    </a>
                  )}

                  {(workshopAddress || cityRegion) && (
                    <div className="flex items-start gap-3 text-slate-700">
                      <MapPin className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-[#0B1B2B]">Service Coverage &amp; Workshop</p>
                        {workshopAddress && <p>{workshopAddress}</p>}
                        {cityRegion && (
                          <p className="text-slate-500 text-xs mt-0.5">{cityRegion}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {operatingHours && (
                    <div className="flex items-start gap-3 text-slate-700">
                      <Clock className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-[#0B1B2B]">Operating Hours</p>
                        <p className="font-mono text-xs tabular-nums mt-0.5">{operatingHours}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* What to Include in Your Quote Request */}
            <div className="bg-[#0B1B2B] text-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-orange-400">
                <FileText className="w-5 h-5 shrink-0" />
                <h3 className="font-display text-lg font-bold text-white">
                  Estimate Checklist
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Providing clear measurements helps us prepare an accurate material and fabrication
                estimate quickly across {cityRegion}.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-200">
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>Gate clear opening width &amp; height (sliding or swing preference)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>Site town/county and whether masonry pillars already exist</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>Preferred steel gauge, cladding finish, or perimeter fence length</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
