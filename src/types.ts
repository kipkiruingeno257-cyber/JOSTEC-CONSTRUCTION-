import type { Timestamp } from 'firebase/firestore';

export const PROJECT_CATEGORIES = [
  'Building Construction',
  'Welding Services',
  'Metal Fabrication',
  'Gate Installation',
  'Sliding Gates',
  'Swing Gates',
  'Steel Doors & Windows',
  'Perimeter Fencing',
  'Repairs & Maintenance',
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export type ProjectStatus = 'draft' | 'published';
export type TestimonialStatus = 'published' | 'hidden';
export type InquiryStatus = 'new' | 'reviewed' | 'archived';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'kipkiruingeno257@gmail.com';

export const COMPANY_INFO = {
  name: 'Jenkins Structural & Metalworks',
  shortName: 'Jenkins Structural',
  engineerName: 'Eng. Mark Jenkins, PE',
  engineerTitle: 'Principal Structural Engineer & Master Fabricator',
  phoneDisplay: '+1 (555) 234-8910',
  phoneHref: 'tel:+15552348910',
  whatsappNumber: '15552348910',
  whatsappHref: 'https://wa.me/15552348910?text=Hello%20Jenkins%20Structural%2C%20I%20would%20like%20to%20request%20a%20project%20quote.',
  email: 'projects@jenkinsstructural.example',
  address: '480 Foundry Industrial Pkwy, Suite B, Metro Industrial Park',
  cityRegion: 'Atlanta Metro Industrial District, GA',
  coordinates: { lat: 33.749, lng: -84.388 },
  hours: 'Mon–Sat · 07:00 – 18:00',
};

// Volumetric boundaries synchronized verbatim with firebase-blueprint.json & firestore.rules
export const SCHEMA_LIMITS = {
  project: {
    titleMin: 3,
    titleMax: 120,
    descriptionMin: 10,
    descriptionMax: 2000,
    locationMax: 120,
    completionYearMax: 10,
    maxImages: 12,
  },
  testimonial: {
    clientNameMin: 2,
    clientNameMax: 100,
    clientRoleMin: 2,
    clientRoleMax: 120,
    projectTypeMin: 2,
    projectTypeMax: 80,
    quoteMin: 10,
    quoteMax: 1000,
  },
  inquiry: {
    nameMin: 2,
    nameMax: 100,
    phoneMin: 6,
    phoneMax: 30,
    emailMin: 5,
    emailMax: 120,
    serviceTypeMin: 2,
    serviceTypeMax: 80,
    messageMin: 10,
    messageMax: 2000,
  },
} as const;

export type PhotoAspectRatio = '4/3' | '16/9' | '1/1' | '3/4';
export type PhotoObjectFit = 'cover' | 'contain';
export type PhotoFocalPoint = 'center' | 'top' | 'bottom' | 'left' | 'right';
export type PhotoFrameStyle = 'clean' | 'elevated' | 'rounded' | 'blueprint';
export type PhotoTonePreset = 'natural' | 'crisp' | 'warm' | 'steel' | 'mono';

export interface PhotoAppearance {
  aspectRatio: PhotoAspectRatio;
  objectFit: PhotoObjectFit;
  focalPoint: PhotoFocalPoint;
  frameStyle: PhotoFrameStyle;
  tone: PhotoTonePreset;
  brightness: number;
  contrast: number;
  saturation: number;
  showBadge: boolean;
}

export const DEFAULT_PHOTO_APPEARANCE: PhotoAppearance = {
  aspectRatio: '4/3',
  objectFit: 'cover',
  focalPoint: 'center',
  frameStyle: 'clean',
  tone: 'natural',
  brightness: 100,
  contrast: 100,
  saturation: 100,
  showBadge: true,
};

export interface ProjectRecord {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  location?: string;
  completionYear?: string;
  imageUrls: string[];
  storagePaths: string[];
  photoAppearance?: PhotoAppearance;
  status: ProjectStatus;
  authorId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface TestimonialRecord {
  id: string;
  clientName: string;
  clientRole: string;
  projectType: string;
  quote: string;
  rating: number;
  status: TestimonialStatus;
  authorId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface InquiryRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceType: string;
  message: string;
  status: InquiryStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin';
  createdAt?: Timestamp | null;
}
