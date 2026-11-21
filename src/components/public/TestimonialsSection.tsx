import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquareQuote, Star } from 'lucide-react';
import { subscribePublishedTestimonials } from '../../services/firestoreService';
import { fetchLocalPublicPortfolio } from '../../services/localMediaService';
import type { TestimonialRecord } from '../../types';

export const TestimonialsSection: React.FC = () => {
  const [firebaseTestimonials, setFirebaseTestimonials] = useState<TestimonialRecord[]>([]);
  const [localTestimonials, setLocalTestimonials] = useState<TestimonialRecord[]>([]);
  const [localLoaded, setLocalLoaded] = useState(false);
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchLocalPublicPortfolio().then((res) => {
      if (!mounted) return;
      setLocalTestimonials(res.testimonials);
      setLocalLoaded(true);
    });
    const unsubscribe = subscribePublishedTestimonials(
      (items) => {
        if (!mounted) return;
        setFirebaseTestimonials(items);
        setFirebaseLoaded(true);
      },
      () => {
        if (!mounted) return;
        setFirebaseLoaded(true);
      }
    );
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const loading = !(firebaseLoaded || (localLoaded && localTestimonials.length > 0));

  const testimonials = useMemo(() => {
    const map: Record<string, TestimonialRecord> = {};
    for (const t of localTestimonials) map[t.id] = t;
    for (const t of firebaseTestimonials) map[t.id] = t;
    const getTime = (t: TestimonialRecord) =>
      t.createdAtMs ?? (t.createdAt && typeof t.createdAt.toMillis === 'function' ? t.createdAt.toMillis() : 0);
    return Object.values(map).sort((a, b) => getTime(b) - getTime(a));
  }, [firebaseTestimonials, localTestimonials]);

  return (
    <section id="testimonials" className="py-20 lg:py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold text-orange-600 tracking-wide mb-3">
            Client Feedback
          </p>
          <h2
            className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B2B] mb-3"
            style={{ textWrap: 'balance' }}
          >
            Verified Project Outcomes
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Reviews from property owners, commercial facility directors, and general contractors we
            have partnered with.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white border border-slate-200 rounded-lg p-6 animate-pulse space-y-4"
              >
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-16 w-full bg-slate-200 rounded" />
                <div className="h-4 w-1/2 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && testimonials.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <MessageSquareQuote className="w-9 h-9 text-slate-400 mx-auto mb-3" />
            <h3 className="font-display text-base font-bold text-[#0B1B2B] mb-1">
              Client Reviews Coming Soon
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Verified customer testimonials added and published from the Owner Dashboard will
              appear here automatically.
            </p>
          </div>
        )}

        {!loading && testimonials.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((review) => (
              <blockquote
                key={review.id}
                className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div
                      className="flex items-center gap-0.5 text-orange-500"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-4 h-4 ${
                            idx < review.rating ? 'fill-orange-500 text-orange-500' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-slate-500 truncate">
                      {review.projectType}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-6">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                </div>

                <footer className="pt-4 border-t border-slate-100">
                  <p className="font-display text-sm font-bold text-[#0B1B2B]">
                    {review.clientName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{review.clientRole}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
