import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { AboutSection } from '../components/public/AboutSection';
import { ContactSection, type QuotePrefillRequest } from '../components/public/ContactSection';
import { FaqSection } from '../components/public/FaqSection';
import { Footer } from '../components/public/Footer';
import { HeroSection } from '../components/public/HeroSection';
import { Navbar } from '../components/public/Navbar';
import { ProjectGallerySection } from '../components/public/ProjectGallerySection';
import { ServicesSection } from '../components/public/ServicesSection';
import { TestimonialsSection } from '../components/public/TestimonialsSection';
import { WhyChooseUsSection } from '../components/public/WhyChooseUsSection';
import type { PublicSectionKey } from '../lib/seoConfig';
import type { ProjectCategory, ProjectRecord } from '../types';

interface HomePageProps {
  initialSection?: PublicSectionKey;
}

export const HomePage: React.FC<HomePageProps> = ({ initialSection = 'top' }) => {
  const [selectedQuoteService, setSelectedQuoteService] = useState<ProjectCategory | ''>('');
  const [prefillRequest, setPrefillRequest] = useState<QuotePrefillRequest | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    if (initialSection === 'top') {
      return;
    }
    const timer = window.setTimeout(() => {
      const target = document.getElementById(initialSection);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [initialSection]);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 480);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleRequestSimilarQuote = (project: ProjectRecord) => {
    setSelectedQuoteService(project.category);
    setPrefillRequest({
      service: project.category,
      scopeText: `Requesting an estimate similar to: ${project.title} (${project.category}${
        project.location ? ` · ${project.location}` : ''
      }).`,
      nonce: Date.now(),
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <AboutSection />
        <ServicesSection onSelectServiceForQuote={(svc) => setSelectedQuoteService(svc)} />
        <ProjectGallerySection onRequestSimilarQuote={handleRequestSimilarQuote} />
        <WhyChooseUsSection />
        <TestimonialsSection />
        <FaqSection />
        <ContactSection
          preselectedService={selectedQuoteService}
          prefillRequest={prefillRequest}
        />
      </main>
      <Footer />

      {showBackToTop && (
        <button
          type="button"
          aria-label="Scroll back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-5 right-5 z-30 w-11 h-11 rounded-md bg-[#0B1B2B] text-white border border-white/15 shadow-lg hover:bg-orange-600 transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
