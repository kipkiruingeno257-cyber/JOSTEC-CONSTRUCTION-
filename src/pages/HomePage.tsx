import React, { useEffect, useState } from 'react';
import { AboutSection } from '../components/public/AboutSection';
import { ContactSection } from '../components/public/ContactSection';
import { Footer } from '../components/public/Footer';
import { HeroSection } from '../components/public/HeroSection';
import { Navbar } from '../components/public/Navbar';
import { ProjectGallerySection } from '../components/public/ProjectGallerySection';
import { ServicesSection } from '../components/public/ServicesSection';
import { TestimonialsSection } from '../components/public/TestimonialsSection';
import { WhyChooseUsSection } from '../components/public/WhyChooseUsSection';
import type { PublicSectionKey } from '../lib/seoConfig';
import type { ProjectCategory } from '../types';

interface HomePageProps {
  initialSection?: PublicSectionKey;
}

export const HomePage: React.FC<HomePageProps> = ({ initialSection = 'top' }) => {
  const [selectedQuoteService, setSelectedQuoteService] = useState<ProjectCategory | ''>('');

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

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <AboutSection />
        <ServicesSection onSelectServiceForQuote={(svc) => setSelectedQuoteService(svc)} />
        <ProjectGallerySection />
        <WhyChooseUsSection />
        <TestimonialsSection />
        <ContactSection preselectedService={selectedQuoteService} />
      </main>
      <Footer />
    </div>
  );
};
