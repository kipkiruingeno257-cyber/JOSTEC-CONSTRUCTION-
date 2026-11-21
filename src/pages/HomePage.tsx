import React, { useState } from 'react';
import { AboutSection } from '../components/public/AboutSection';
import { ContactSection } from '../components/public/ContactSection';
import { Footer } from '../components/public/Footer';
import { HeroSection } from '../components/public/HeroSection';
import { Navbar } from '../components/public/Navbar';
import { ProjectGallerySection } from '../components/public/ProjectGallerySection';
import { ServicesSection } from '../components/public/ServicesSection';
import { TestimonialsSection } from '../components/public/TestimonialsSection';
import { WhyChooseUsSection } from '../components/public/WhyChooseUsSection';
import type { ProjectCategory } from '../types';

export const HomePage: React.FC = () => {
  const [selectedQuoteService, setSelectedQuoteService] = useState<ProjectCategory | ''>('');

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
