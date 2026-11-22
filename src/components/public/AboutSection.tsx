import React, { useEffect, useMemo, useState } from 'react';
import { Award, Compass, HardHat, ShieldCheck } from 'lucide-react';
import { subscribeSiteProfile } from '../../services/firestoreService';
import { fetchLocalPublicPortfolio } from '../../services/localMediaService';
import { DEFAULT_SITE_PROFILE, type SiteProfileRecord } from '../../types';
import {
  getLatestProfileOverride,
  resolveTimestampMs,
  subscribeSiteContentSync,
} from '../../utils/siteContentSync';
import { FastImage } from '../FastImage';

export const AboutSection: React.FC = () => {
  const [firebaseProfile, setFirebaseProfile] = useState<SiteProfileRecord | null>(null);
  const [localProfile, setLocalProfile] = useState<SiteProfileRecord | null>(null);
  const [syncOverride, setSyncOverride] = useState(() => getLatestProfileOverride());

  useEffect(() => {
    let mounted = true;
    fetchLocalPublicPortfolio().then((res) => {
      if (!mounted) return;
      setLocalProfile(res.profile ?? null);
    });
    const unsubscribeFirestore = subscribeSiteProfile(
      (prof) => {
        if (!mounted) return;
        setFirebaseProfile(prof);
      },
      () => {
        // Fallback to local/default profile cleanly if offline or unconfigured
      }
    );
    const unsubscribeSync = subscribeSiteContentSync({
      onProfile: (entry) => {
        if (!mounted) return;
        setSyncOverride(entry);
        if (entry.value) {
          setLocalProfile(entry.value);
        }
      },
    });
    return () => {
      mounted = false;
      unsubscribeFirestore();
      unsubscribeSync();
    };
  }, []);

  const profile = useMemo<SiteProfileRecord>(() => {
    const fbTs = resolveTimestampMs(firebaseProfile);
    const localTs = resolveTimestampMs(localProfile);
    const overrideTs = syncOverride?.ts ?? 0;

    if (syncOverride && overrideTs >= fbTs && overrideTs >= localTs) {
      return syncOverride.value ?? DEFAULT_SITE_PROFILE;
    }
    if (firebaseProfile && localProfile) {
      return localTs > fbTs ? localProfile : firebaseProfile;
    }
    return firebaseProfile ?? localProfile ?? DEFAULT_SITE_PROFILE;
  }, [firebaseProfile, localProfile, syncOverride]);

  const paragraphs = useMemo(() => {
    const raw = (profile.description || DEFAULT_SITE_PROFILE.description)
      .split(/\n{2,}|\r\n\r\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    return raw.length > 0 ? raw : [DEFAULT_SITE_PROFILE.description];
  }, [profile.description]);

  const customAvatar = profile.avatarUrl?.trim() || '';

  return (
    <section id="about" className="py-20 lg:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-stretch">
          {/* Engineer Portrait Column */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="relative flex-1 min-h-[400px] rounded-lg overflow-hidden bg-[#0B1B2B] border border-slate-200">
              {customAvatar ? (
                <FastImage
                  key={customAvatar}
                  src={customAvatar}
                  alt={`${profile.displayName} — ${profile.title}`}
                  priority
                  darkBg
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div
                  className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                  }}
                >
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/15 flex items-center justify-center mb-4">
                    <HardHat className="w-9 h-9 text-orange-400" />
                  </div>
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
                    Principal Engineer Profile
                  </p>
                </div>
              )}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0B1B2B]/95 via-[#0B1B2B]/45 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="font-display text-lg font-semibold">{profile.displayName}</p>
                <p className="text-sm text-slate-200">{profile.title}</p>
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
              {profile.headline}
            </h2>

            <div className="space-y-4 text-base text-slate-600 leading-relaxed mb-10">
              {paragraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
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
