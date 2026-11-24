import type { SiteProfileRecord } from '../types';

export const SITE_CANONICAL_ORIGIN = 'https://jostec-construction.vercel.app';
export const SITE_BRAND_NAME = 'JOSTEC Construction';
export const DEFAULT_OG_IMAGE = `${SITE_CANONICAL_ORIGIN}/og-cover.png`;

export type PublicSectionKey = 'top' | 'about' | 'services' | 'projects' | 'testimonials' | 'faq' | 'contact';

export interface RouteSeoMeta {
  path: string;
  sectionId: PublicSectionKey;
  title: string;
  description: string;
  keywords: string;
  breadcrumbName: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const JOSTEC_FAQS: FaqItem[] = [
  {
    question: 'Should I choose a sliding gate or a swing gate for my property?',
    answer:
      'Sliding gates (V-track or cantilever) work best for driveways with limited internal clearance, steep slopes, or wide commercial entrances. Double-leaf or single-leaf swing gates suit flat entrances with clear inward/outward swing space and traditional architectural piers. We assess driveway gradient and pillar spacing during the site survey before recommending the best option.',
  },
  {
    question: 'Do you handle concrete gate pillars, footings, and gate installation together?',
    answer:
      'Yes. For permanent gate installation, we cast reinforced concrete columns and track footings, route underground conduits if automation is planned, and anchor heavy-duty hinges or guide rollers—avoiding mismatched masonry and steelwork contractors.',
  },
  {
    question: 'How are custom metal gates and structural steel protected against rust?',
    answer:
      'All fabricated gates, steel doors, window grilles, and perimeter fencing receive weld-seam grinding, degreasing, zinc-rich anti-corrosion primer, and weather-resistant industrial enamel or epoxy finishes suited to Kenyan outdoor exposure.',
  },
  {
    question: 'How do site measurements and written project quotes work?',
    answer:
      'Submit your project scope, approximate gate span or building dimensions, and county/town through the quote request form. We review your requirements, schedule an on-site measurement where needed, and issue a written specification covering steel gauge, materials, and delivery timeline.',
  },
  {
    question: 'Can JOSTEC Construction repair sagging gates, rusted frames, or broken hinges?',
    answer:
      'Yes. Our Repairs & Maintenance service covers mobile field welding, hinge replacement, sliding track re-leveling, rusted section cut-and-weld restoration, and structural frame reinforcement.',
  },
];

const BASE_KEYWORDS =
  'Construction services in Kenya, Welding services in Kenya, Permanent gate installation, Custom metal gates, Gate fabrication and installation, JOSTEC Construction';

export const PUBLIC_ROUTE_SEO: Record<string, RouteSeoMeta> = {
  '/': {
    path: '/',
    sectionId: 'top',
    title: 'JOSTEC Construction | Welding & Gate Installation Kenya',
    description:
      'JOSTEC Construction provides construction services in Kenya, certified welding, permanent gate installation, custom metal gates, and perimeter fencing.',
    keywords: `${BASE_KEYWORDS}, metal fabrication Kenya, steel doors and windows Kenya, perimeter fencing Kenya`,
    breadcrumbName: 'Home',
  },
  '/services': {
    path: '/services',
    sectionId: 'services',
    title: 'Construction & Welding Services in Kenya | JOSTEC',
    description:
      'Explore building construction services in Kenya, certified welding services in Kenya, gate fabrication and installation, steel doors, and perimeter fencing.',
    keywords: `${BASE_KEYWORDS}, structural steel framing Kenya, sliding gates Kenya, swing gates Kenya`,
    breadcrumbName: 'Services',
  },
  '/projects': {
    path: '/projects',
    sectionId: 'projects',
    title: 'Custom Metal Gates & Project Gallery | JOSTEC Kenya',
    description:
      'Inspect completed JOSTEC Construction projects across Kenya, including custom metal gates, permanent gate installation, structural steelwork, and fencing.',
    keywords: `${BASE_KEYWORDS}, gate installation portfolio Kenya, fabricated steel gates, commercial construction projects`,
    breadcrumbName: 'Projects',
  },
  '/about': {
    path: '/about',
    sectionId: 'about',
    title: 'About JOSTEC Construction | Structural Steel Kenya',
    description:
      'Learn about JOSTEC Construction—delivering structural engineering, welding services in Kenya, custom metal gates, and durable steel fabrication.',
    keywords: `${BASE_KEYWORDS}, structural engineering Kenya, steel fabrication workshop`,
    breadcrumbName: 'About',
  },
  '/reviews': {
    path: '/reviews',
    sectionId: 'testimonials',
    title: 'Client Project Reviews | JOSTEC Construction Kenya',
    description:
      'Read verified project feedback for JOSTEC Construction covering building construction services in Kenya, welding, and permanent gate installation.',
    keywords: `${BASE_KEYWORDS}, verified contractor reviews Kenya`,
    breadcrumbName: 'Client Reviews',
  },
  '/contact': {
    path: '/contact',
    sectionId: 'contact',
    title: 'Request a Quote | JOSTEC Construction Services Kenya',
    description:
      'Contact JOSTEC Construction for building construction services in Kenya, welding services in Kenya, and custom gate fabrication and installation quotes.',
    keywords: `${BASE_KEYWORDS}, construction quote Kenya, gate fabrication estimate`,
    breadcrumbName: 'Contact',
  },
};

export function resolvePublicSeo(pathname: string): RouteSeoMeta {
  const normalized =
    pathname === '/' ? '/' : pathname.replace(/\/+$/, '') || '/';
  return PUBLIC_ROUTE_SEO[normalized] ?? PUBLIC_ROUTE_SEO['/'];
}

export function buildPublicJsonLd(
  meta: RouteSeoMeta,
  profile?: SiteProfileRecord | null
): Record<string, unknown> {
  const canonicalUrl = `${SITE_CANONICAL_ORIGIN}${meta.path}`;
  const businessName = profile?.companyName?.trim() || SITE_BRAND_NAME;

  const businessEntity: Record<string, unknown> = {
    '@type': ['LocalBusiness', 'GeneralContractor'],
    '@id': `${SITE_CANONICAL_ORIGIN}/#business`,
    name: businessName,
    url: `${SITE_CANONICAL_ORIGIN}/`,
    image: DEFAULT_OG_IMAGE,
    description:
      'JOSTEC Construction delivers civil building construction services in Kenya, certified welding services in Kenya, custom metal gates, permanent gate fabrication and installation, steel doors and windows, and perimeter fencing.',
    areaServed: {
      '@type': 'Country',
      name: profile?.cityRegion?.trim() || 'Kenya',
    },
    knowsAbout: [
      'Construction services in Kenya',
      'Welding services in Kenya',
      'Permanent gate installation',
      'Custom metal gates',
      'Gate fabrication and installation',
      'Metal fabrication',
      'Steel doors and windows',
      'Perimeter fencing',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Construction, Welding & Gate Fabrication Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Building Construction Services in Kenya',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Certified Welding Services in Kenya',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Permanent Gate Installation & Custom Metal Gates',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Sliding & Swing Gate Fabrication and Installation',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Steel Doors, Windows & Perimeter Security Fencing',
          },
        },
      ],
    },
  };

  if (profile?.phoneDisplay?.trim()) {
    businessEntity.telephone = profile.phoneDisplay.trim();
  }
  if (profile?.contactEmail?.trim()) {
    businessEntity.email = profile.contactEmail.trim();
  }
  if (profile?.workshopAddress?.trim()) {
    businessEntity.address = {
      '@type': 'PostalAddress',
      streetAddress: profile.workshopAddress.trim(),
      addressRegion: profile.cityRegion?.trim() || 'Kenya',
      addressCountry: 'KE',
    };
  }

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_CANONICAL_ORIGIN}/#website`,
      url: `${SITE_CANONICAL_ORIGIN}/`,
      name: businessName,
      description: PUBLIC_ROUTE_SEO['/'].description,
    },
    businessEntity,
    {
      '@type': 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: meta.title,
      description: meta.description,
      isPartOf: { '@id': `${SITE_CANONICAL_ORIGIN}/#website` },
      about: { '@id': `${SITE_CANONICAL_ORIGIN}/#business` },
      inLanguage: 'en-KE',
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_CANONICAL_ORIGIN}/#faq`,
      mainEntity: JOSTEC_FAQS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ];

  if (meta.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_CANONICAL_ORIGIN}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: meta.breadcrumbName,
          item: canonicalUrl,
        },
      ],
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
