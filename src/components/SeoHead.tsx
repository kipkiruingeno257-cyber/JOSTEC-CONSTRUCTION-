import React, { useEffect } from 'react';
import {
  buildPublicJsonLd,
  DEFAULT_OG_IMAGE,
  resolvePublicSeo,
  SITE_BRAND_NAME,
  SITE_CANONICAL_ORIGIN,
} from '../lib/seoConfig';

interface SeoHeadProps {
  pathname: string;
  noindex?: boolean;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string | null): void {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.setAttribute('href', href);
  } else {
    const link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', href);
    document.head.appendChild(link);
  }
}

export const SeoHead: React.FC<SeoHeadProps> = ({ pathname, noindex = false }) => {
  useEffect(() => {
    if (noindex) {
      document.title = 'Admin Console | JOSTEC Construction';
      upsertMeta('name', 'robots', 'noindex, nofollow, noarchive');
      upsertMeta('name', 'googlebot', 'noindex, nofollow');
      upsertMeta('name', 'description', 'Restricted administrator console.');
      upsertCanonical(null);
      return;
    }

    const meta = resolvePublicSeo(pathname);
    const canonicalUrl = `${SITE_CANONICAL_ORIGIN}${meta.path}`;

    document.title = meta.title;
    upsertMeta('name', 'description', meta.description);
    upsertMeta('name', 'keywords', meta.keywords);
    upsertMeta(
      'name',
      'robots',
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );
    upsertMeta('name', 'googlebot', 'index, follow');

    upsertCanonical(canonicalUrl);

    // Open Graph
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_BRAND_NAME);
    upsertMeta('property', 'og:locale', 'en_KE');
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE);

    // Twitter / X Card
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
    upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);

    // Structured Data (Schema.org JSON-LD)
    const schemaScriptId = 'jostec-dynamic-schema';
    let scriptEl = document.getElementById(schemaScriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = schemaScriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(buildPublicJsonLd(meta));

    // Remove base static script once dynamic one is hydrated to prevent duplicate entity graphs
    document.getElementById('jostec-base-schema')?.remove();
  }, [pathname, noindex]);

  return null;
};
