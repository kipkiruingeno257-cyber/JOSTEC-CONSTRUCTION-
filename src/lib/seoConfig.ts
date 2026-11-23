export const SITE_CANONICAL_ORIGIN = 'https://jostec-construction.vercel.app';
export const SITE_BRAND_NAME = 'JOSTEC Construction';
export const DEFAULT_OG_IMAGE = `${SITE_CANONICAL_ORIGIN}/og-cover.png`;

export type PublicSectionKey = 'top' | 'about' | 'services' | 'projects' | 'testimonials' | 'contact';

export interface RouteSeoMeta {
  path: string;
  sectionId: PublicSectionKey;
  title: string;
  description: string;
  keywords: string;
  breadcrumbName: string;
}

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

export function buildPublicJsonLd(meta: RouteSeoMeta): Record<string, unknown> {
  const canonicalUrl = `${SITE_CANONICAL_ORIGIN}${meta.path}`;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_CANONICAL_ORIGIN}/#website`,
      url: `${SITE_CANONICAL_ORIGIN}/`,
      name: SITE_BRAND_NAME,
      description: PUBLIC_ROUTE_SEO['/'].description,
    },
    {
      '@type': ['LocalBusiness', 'GeneralContractor'],
      '@id': `${SITE_CANONICAL_ORIGIN}/#business`,
      name: SITE_BRAND_NAME,
      url: `${SITE_CANONICAL_ORIGIN}/`,
      image: DEFAULT_OG_IMAGE,
      description:
        'JOSTEC Construction delivers civil building construction services in Kenya, certified welding services in Kenya, custom metal gates, permanent gate fabrication and installation, steel doors and windows, and perimeter fencing.',
      areaServed: {
        '@type': 'Country',
        name: 'Kenya',
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
    },
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
