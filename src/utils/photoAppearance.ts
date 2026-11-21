import {
  DEFAULT_PHOTO_APPEARANCE,
  type PhotoAppearance,
  type PhotoAspectRatio,
  type PhotoFocalPoint,
  type PhotoFrameStyle,
  type PhotoTonePreset,
} from '../types';

export const ASPECT_RATIO_OPTIONS: { value: PhotoAspectRatio; label: string; shortLabel: string }[] = [
  { value: '4/3', label: 'Standard (4:3)', shortLabel: '4:3' },
  { value: '16/9', label: 'Widescreen (16:9)', shortLabel: '16:9' },
  { value: '1/1', label: 'Square (1:1)', shortLabel: '1:1' },
  { value: '3/4', label: 'Tall Gate (3:4)', shortLabel: '3:4' },
];

export const FOCAL_POINT_OPTIONS: { value: PhotoFocalPoint; label: string }[] = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

export const FRAME_STYLE_OPTIONS: { value: PhotoFrameStyle; label: string }[] = [
  { value: 'clean', label: 'Clean Border' },
  { value: 'elevated', label: 'Elevated Shadow' },
  { value: 'rounded', label: 'Soft Rounded' },
  { value: 'blueprint', label: 'Navy Blueprint' },
];

export const TONE_PRESET_OPTIONS: { value: PhotoTonePreset; label: string }[] = [
  { value: 'natural', label: 'Natural' },
  { value: 'crisp', label: 'Crisp Detail' },
  { value: 'warm', label: 'Warm Daylight' },
  { value: 'steel', label: 'Cool Steel' },
  { value: 'mono', label: 'Monochrome' },
];

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function normalizePhotoAppearance(raw?: Partial<PhotoAppearance> | null): PhotoAppearance {
  const aspectRatio: PhotoAspectRatio =
    raw?.aspectRatio === '16/9' ||
    raw?.aspectRatio === '1/1' ||
    raw?.aspectRatio === '3/4' ||
    raw?.aspectRatio === '4/3'
      ? raw.aspectRatio
      : DEFAULT_PHOTO_APPEARANCE.aspectRatio;

  const objectFit = raw?.objectFit === 'contain' ? 'contain' : 'cover';

  const focalPoint: PhotoFocalPoint =
    raw?.focalPoint === 'top' ||
    raw?.focalPoint === 'bottom' ||
    raw?.focalPoint === 'left' ||
    raw?.focalPoint === 'right' ||
    raw?.focalPoint === 'center'
      ? raw.focalPoint
      : DEFAULT_PHOTO_APPEARANCE.focalPoint;

  const frameStyle: PhotoFrameStyle =
    raw?.frameStyle === 'elevated' ||
    raw?.frameStyle === 'rounded' ||
    raw?.frameStyle === 'blueprint' ||
    raw?.frameStyle === 'clean'
      ? raw.frameStyle
      : DEFAULT_PHOTO_APPEARANCE.frameStyle;

  const tone: PhotoTonePreset =
    raw?.tone === 'crisp' ||
    raw?.tone === 'warm' ||
    raw?.tone === 'steel' ||
    raw?.tone === 'mono' ||
    raw?.tone === 'natural'
      ? raw.tone
      : DEFAULT_PHOTO_APPEARANCE.tone;

  return {
    aspectRatio,
    objectFit,
    focalPoint,
    frameStyle,
    tone,
    brightness: clamp(Number(raw?.brightness ?? 100), 80, 130, 100),
    contrast: clamp(Number(raw?.contrast ?? 100), 85, 130, 100),
    saturation: clamp(Number(raw?.saturation ?? 100), 0, 135, 100),
    showBadge: typeof raw?.showBadge === 'boolean' ? raw.showBadge : true,
  };
}

export function getAspectClass(ratio: PhotoAspectRatio): string {
  switch (ratio) {
    case '16/9':
      return 'aspect-video';
    case '1/1':
      return 'aspect-square';
    case '3/4':
      return 'aspect-[3/4]';
    case '4/3':
    default:
      return 'aspect-[4/3]';
  }
}

export function getObjectPositionClass(focal: PhotoFocalPoint): string {
  switch (focal) {
    case 'top':
      return 'object-top';
    case 'bottom':
      return 'object-bottom';
    case 'left':
      return 'object-left';
    case 'right':
      return 'object-right';
    case 'center':
    default:
      return 'object-center';
  }
}

export function getCardFrameClasses(frameStyle: PhotoFrameStyle): {
  card: string;
  viewportBg: string;
} {
  switch (frameStyle) {
    case 'elevated':
      return {
        card: 'border border-slate-200 rounded-lg shadow-md hover:shadow-lg bg-white transition-shadow',
        viewportBg: 'bg-slate-100',
      };
    case 'rounded':
      return {
        card: 'border border-slate-200 rounded-2xl bg-white hover:border-slate-300 transition-colors',
        viewportBg: 'bg-slate-100',
      };
    case 'blueprint':
      return {
        card: 'border-2 border-[#0B1B2B] rounded-lg bg-[#0B1B2B] text-white',
        viewportBg: 'bg-[#081522]',
      };
    case 'clean':
    default:
      return {
        card: 'border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors',
        viewportBg: 'bg-slate-100',
      };
  }
}

export function getImageFilterCss(app: PhotoAppearance): string | undefined {
  let b = app.brightness;
  let c = app.contrast;
  let s = app.saturation;
  const extras: string[] = [];

  if (app.tone === 'crisp') {
    c = Math.min(140, c + 10);
    s = Math.min(145, s + 8);
  } else if (app.tone === 'warm') {
    extras.push('sepia(14%)');
    s = Math.min(140, s + 8);
  } else if (app.tone === 'steel') {
    c = Math.min(135, c + 6);
    s = Math.max(45, s - 24);
    extras.push('hue-rotate(190deg) saturate(105%) hue-rotate(-190deg)');
  } else if (app.tone === 'mono') {
    extras.push('grayscale(100%)');
    c = Math.min(140, c + 8);
  }

  const parts: string[] = [];
  if (b !== 100) parts.push(`brightness(${b}%)`);
  if (c !== 100) parts.push(`contrast(${c}%)`);
  if (s !== 100) parts.push(`saturation(${s}%)`);
  // CSS filter syntax uses saturate(), not saturation()
  const cssParts = parts.map((p) => p.replace('saturation(', 'saturate('));
  cssParts.push(...extras);
  return cssParts.length > 0 ? cssParts.join(' ') : undefined;
}

const DEFAULT_APPEARANCE_STORAGE_KEY = 'jsm_default_photo_appearance';

export function loadDefaultPhotoAppearance(): PhotoAppearance {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PHOTO_APPEARANCE };
  }
  try {
    const raw = window.localStorage.getItem(DEFAULT_APPEARANCE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PHOTO_APPEARANCE };
    return normalizePhotoAppearance(JSON.parse(raw) as Partial<PhotoAppearance>);
  } catch {
    return { ...DEFAULT_PHOTO_APPEARANCE };
  }
}

export function saveDefaultPhotoAppearance(appearance: PhotoAppearance): PhotoAppearance {
  const clean = normalizePhotoAppearance(appearance);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(DEFAULT_APPEARANCE_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }
  return clean;
}

