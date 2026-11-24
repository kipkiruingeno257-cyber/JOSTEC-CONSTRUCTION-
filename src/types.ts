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
export type EmailDeliveryStatus = 'sent' | 'not_configured' | 'failed';
export type EmailProviderKind = 'resend' | 'smtp' | 'none';
export type EmailLogKind = 'inquiry_alert' | 'client_reply' | 'test_email';

export interface EmailSubResult {
  ok: boolean;
  status: EmailDeliveryStatus;
  provider: EmailProviderKind;
  recipient: string;
  subject: string;
  detail: string;
  messageId?: string;
}

export interface EmailDispatchResponse {
  ok: boolean;
  duplicate?: boolean;
  skippedSpam?: boolean;
  status: EmailDeliveryStatus | 'rate_limited';
  provider: EmailProviderKind;
  recipient?: string;
  subject?: string;
  detail: string;
  error?: string;
  adminEmail?: EmailSubResult;
  clientEmail?: EmailSubResult;
  httpStatus?: number;
}

export const BOOTSTRAPPED_ADMIN_EMAIL = 'kipkiruingeno257@gmail.com';

export const COMPANY_INFO = {
  name: 'JOSTEC Construction',
  shortName: 'JOSTEC Construction',
  engineerName: 'JOSTEC Construction Team',
  engineerTitle: 'Civil Construction, Certified Welding & Metal Fabrication',
  phoneDisplay: '',
  phoneHref: '',
  whatsappNumber: '',
  whatsappHref: '',
  email: '',
  address: '',
  cityRegion: 'Kenya',
  hours: '',
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
  profile: {
    displayNameMin: 2,
    displayNameMax: 100,
    titleMin: 2,
    titleMax: 120,
    headlineMin: 5,
    headlineMax: 160,
    descriptionMin: 20,
    descriptionMax: 2500,
    avatarUrlMax: 350000,
    avatarStoragePathMax: 512,
    companyNameMax: 120,
    phoneDisplayMax: 40,
    whatsappNumberMax: 30,
    contactEmailMax: 120,
    workshopAddressMax: 200,
    cityRegionMax: 120,
    operatingHoursMax: 80,
  },
  siteImage: {
    imageUrlMax: 350000,
    storagePathMax: 512,
    captionMax: 160,
  },
  emailLog: {
    recipientMin: 5,
    recipientMax: 120,
    subjectMin: 2,
    subjectMax: 180,
    detailMax: 300,
    inquiryIdMax: 128,
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
  emailStatus?: EmailDeliveryStatus;
  emailDetail?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface EmailLogRecord {
  id: string;
  kind: EmailLogKind;
  recipient: string;
  subject: string;
  status: EmailDeliveryStatus;
  provider: EmailProviderKind;
  detail?: string;
  inquiryId?: string;
  authorId?: string;
  createdAt?: Timestamp | null;
  createdAtMs?: number;
}

export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin';
  createdAt?: Timestamp | null;
}

export interface SiteProfileRecord {
  displayName: string;
  title: string;
  headline: string;
  description: string;
  avatarUrl: string;
  avatarStoragePath: string;
  companyName?: string;
  phoneDisplay?: string;
  whatsappNumber?: string;
  contactEmail?: string;
  workshopAddress?: string;
  cityRegion?: string;
  operatingHours?: string;
  updatedAt?: Timestamp | null;
  updatedAtMs?: number;
}

export const DEFAULT_SITE_PROFILE: SiteProfileRecord = {
  displayName: COMPANY_INFO.engineerName,
  title: COMPANY_INFO.engineerTitle,
  headline: 'Direct Engineering Accountability From Site Survey to Final Weld',
  description:
    'JOSTEC Construction provides civil building construction, certified arc and MIG/TIG welding, custom metal fabrication, permanent gate installation, and perimeter security systems for residential and commercial clients across Kenya.\n\nEvery build is overseen directly from site measurement and structural material selection through workshop fabrication, anti-corrosion priming, and permanent on-site anchoring—delivering reliable workmanship engineered for long-term field performance.',
  avatarUrl: '',
  avatarStoragePath: 'default',
  companyName: COMPANY_INFO.name,
  phoneDisplay: '',
  whatsappNumber: '',
  contactEmail: '',
  workshopAddress: '',
  cityRegion: COMPANY_INFO.cityRegion,
  operatingHours: '',
};

export const SITE_IMAGE_SLOTS = [
  'hero',
  'service_construction',
  'service_welding',
  'service_perimeter',
] as const;

export type SiteImageSlotId = (typeof SITE_IMAGE_SLOTS)[number];

export interface SiteImageRecord {
  slot: SiteImageSlotId;
  imageUrl: string;
  storagePath: string;
  caption?: string;
  updatedAt?: Timestamp | null;
  updatedAtMs?: number;
}
