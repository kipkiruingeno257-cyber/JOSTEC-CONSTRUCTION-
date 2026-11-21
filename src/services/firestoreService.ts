import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import {
  auth,
  db,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
  storage,
} from '../lib/firebase';
import { deleteAppServerMedia } from './localMediaService';
import {
  PROJECT_CATEGORIES,
  SCHEMA_LIMITS,
  type InquiryRecord,
  type InquiryStatus,
  type ProjectCategory,
  type ProjectRecord,
  type ProjectStatus,
  type TestimonialRecord,
  type TestimonialStatus,
} from '../types';

function generateSafeId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const trimmed = cleaned.slice(-120);
  return trimmed.length > 0 ? trimmed : `photo_${Date.now()}.jpg`;
}

function sortByCreatedAtDesc<T extends { createdAt?: { toMillis?: () => number } | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}

// --- Real-time Subscriptions ---

export function subscribePublishedProjects(
  onData: (projects: ProjectRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onData([]);
    return () => {};
  }
  const path = 'projects';
  const q = query(collection(db, path), where('status', '==', 'published'));
  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ProjectRecord, 'id'>),
      }));
      onData(sortByCreatedAtDesc(records));
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAllProjects(
  onData: (projects: ProjectRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onData([]);
    return () => {};
  }
  const path = 'projects';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ProjectRecord, 'id'>),
      }));
      onData(sortByCreatedAtDesc(records));
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribePublishedTestimonials(
  onData: (testimonials: TestimonialRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onData([]);
    return () => {};
  }
  const path = 'testimonials';
  const q = query(collection(db, path), where('status', '==', 'published'));
  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TestimonialRecord, 'id'>),
      }));
      onData(sortByCreatedAtDesc(records));
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAllTestimonials(
  onData: (testimonials: TestimonialRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onData([]);
    return () => {};
  }
  const path = 'testimonials';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TestimonialRecord, 'id'>),
      }));
      onData(sortByCreatedAtDesc(records));
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeInquiries(
  onData: (inquiries: InquiryRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onData([]);
    return () => {};
  }
  const path = 'inquiries';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<InquiryRecord, 'id'>),
      }));
      onData(sortByCreatedAtDesc(records));
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// --- Firebase Storage Media Operations ---

export interface UploadedImageResult {
  url: string;
  storagePath: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateImageFiles(files: File[]): string | null {
  if (files.length > SCHEMA_LIMITS.project.maxImages) {
    return `You can upload a maximum of ${SCHEMA_LIMITS.project.maxImages} photographs per project.`;
  }
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      return `"${file.name}" is not a supported image format (use JPG, PNG, WebP, or AVIF).`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `"${file.name}" exceeds the 10 MB per-photo limit.`;
    }
  }
  return null;
}

export async function uploadProjectImages(
  projectId: string,
  files: File[],
  onProgress?: (percent: number, activeFileName: string) => void
): Promise<UploadedImageResult[]> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Firebase Storage is not configured.');
  }
  if (files.length === 0) return [];

  const validationError = validateImageFiles(files);
  if (validationError) {
    throw new Error(validationError);
  }

  const totalBytes = files.reduce((acc, f) => acc + Math.max(f.size, 1), 0);
  const transferredPerFile = new Array<number>(files.length).fill(0);
  const results: UploadedImageResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeName = `${Date.now()}_${i}_${sanitizeFileName(file.name)}`;
    const objectPath = `projects/${projectId}/${safeName}`;
    const storageRef = ref(storage, objectPath);

    await new Promise<void>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'image/jpeg',
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          transferredPerFile[i] = snapshot.bytesTransferred;
          const totalTransferred = transferredPerFile.reduce((sum, n) => sum + n, 0);
          const pct = Math.min(100, Math.round((totalTransferred / totalBytes) * 100));
          onProgress?.(pct, file.name);
        },
        (error) => {
          const code = (error as { code?: string })?.code || 'storage/upload-failed';
          if (code === 'storage/unauthorized') {
            reject(
              new Error(
                'Firebase Storage rejected the upload (storage/unauthorized). Verify that Firebase Storage is enabled in your Firebase Console and storage.rules are deployed.'
              )
            );
          } else {
            reject(new Error(`Photo upload failed (${code}): ${error.message}`));
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            results.push({ url: downloadUrl, storagePath: objectPath });
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  return results;
}

export async function deleteStorageObjects(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;

  const localPaths = storagePaths.filter((p) => typeof p === 'string' && p.startsWith('local:'));
  if (localPaths.length > 0) {
    await deleteAppServerMedia(localPaths);
  }

  const firebasePaths = storagePaths.filter(
    (p) => typeof p === 'string' && p.length > 0 && !p.startsWith('local:') && p !== 'external'
  );
  if (!isFirebaseConfigured || !storage || firebasePaths.length === 0) return;
  await Promise.allSettled(
    firebasePaths.map((objectPath) => deleteObject(ref(storage, objectPath)))
  );
}

// --- Project CRUD ---

export interface ProjectInputPayload {
  title: string;
  description: string;
  category: ProjectCategory;
  location?: string;
  completionYear?: string;
  imageUrls: string[];
  storagePaths: string[];
  status: ProjectStatus;
}

function validateAndSanitizeProjectInput(input: ProjectInputPayload): ProjectInputPayload {
  const title = input.title.trim().slice(0, SCHEMA_LIMITS.project.titleMax);
  const description = input.description.trim().slice(0, SCHEMA_LIMITS.project.descriptionMax);
  const location = (input.location ?? '').trim().slice(0, SCHEMA_LIMITS.project.locationMax);
  const completionYear = (input.completionYear ?? '')
    .trim()
    .slice(0, SCHEMA_LIMITS.project.completionYearMax);

  if (title.length < SCHEMA_LIMITS.project.titleMin) {
    throw new Error(`Project title must be at least ${SCHEMA_LIMITS.project.titleMin} characters.`);
  }
  if (description.length < SCHEMA_LIMITS.project.descriptionMin) {
    throw new Error(
      `Project description must be at least ${SCHEMA_LIMITS.project.descriptionMin} characters.`
    );
  }
  if (!PROJECT_CATEGORIES.includes(input.category)) {
    throw new Error('Please choose a valid project category.');
  }
  if (input.imageUrls.length > SCHEMA_LIMITS.project.maxImages) {
    throw new Error(`A project may contain at most ${SCHEMA_LIMITS.project.maxImages} photographs.`);
  }
  if (input.imageUrls.length !== input.storagePaths.length) {
    throw new Error('Image URLs and Storage paths count mismatch.');
  }

  return {
    title,
    description,
    category: input.category,
    location,
    completionYear,
    imageUrls: input.imageUrls,
    storagePaths: input.storagePaths,
    status: input.status,
  };
}

export async function createProject(
  projectId: string,
  input: ProjectInputPayload
): Promise<string> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Administrator authentication is required.');
  }
  const clean = validateAndSanitizeProjectInput(input);
  const docPath = `projects/${projectId}`;

  try {
    await setDoc(doc(db, 'projects', projectId), {
      title: clean.title,
      description: clean.description,
      category: clean.category,
      location: clean.location ?? '',
      completionYear: clean.completionYear ?? '',
      imageUrls: clean.imageUrls,
      storagePaths: clean.storagePaths,
      status: clean.status,
      authorId: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return projectId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export function createNewProjectId(): string {
  return generateSafeId('proj');
}

export async function updateProject(
  projectId: string,
  input: ProjectInputPayload,
  removedStoragePaths: string[] = []
): Promise<void> {
  const clean = validateAndSanitizeProjectInput(input);
  const docPath = `projects/${projectId}`;

  try {
    await updateDoc(doc(db, 'projects', projectId), {
      title: clean.title,
      description: clean.description,
      category: clean.category,
      location: clean.location ?? '',
      completionYear: clean.completionYear ?? '',
      imageUrls: clean.imageUrls,
      storagePaths: clean.storagePaths,
      status: clean.status,
      updatedAt: serverTimestamp(),
    });
    if (removedStoragePaths.length > 0) {
      await deleteStorageObjects(removedStoragePaths);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function toggleProjectStatus(
  projectId: string,
  nextStatus: ProjectStatus
): Promise<void> {
  const docPath = `projects/${projectId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteProjectWithMedia(project: ProjectRecord): Promise<void> {
  const docPath = `projects/${project.id}`;
  try {
    await deleteStorageObjects(project.storagePaths || []);
    await deleteDoc(doc(db, 'projects', project.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// --- Testimonials CRUD ---

export interface TestimonialInputPayload {
  clientName: string;
  clientRole: string;
  projectType: string;
  quote: string;
  rating: number;
  status: TestimonialStatus;
}

function validateTestimonialInput(input: TestimonialInputPayload): TestimonialInputPayload {
  const clientName = input.clientName.trim().slice(0, SCHEMA_LIMITS.testimonial.clientNameMax);
  const clientRole = input.clientRole.trim().slice(0, SCHEMA_LIMITS.testimonial.clientRoleMax);
  const projectType = input.projectType.trim().slice(0, SCHEMA_LIMITS.testimonial.projectTypeMax);
  const quote = input.quote.trim().slice(0, SCHEMA_LIMITS.testimonial.quoteMax);
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));

  if (clientName.length < SCHEMA_LIMITS.testimonial.clientNameMin) {
    throw new Error('Client name is too short.');
  }
  if (clientRole.length < SCHEMA_LIMITS.testimonial.clientRoleMin) {
    throw new Error('Client role or organization is required.');
  }
  if (projectType.length < SCHEMA_LIMITS.testimonial.projectTypeMin) {
    throw new Error('Project type is required.');
  }
  if (quote.length < SCHEMA_LIMITS.testimonial.quoteMin) {
    throw new Error('Review quote must be at least 10 characters.');
  }

  return {
    clientName,
    clientRole,
    projectType,
    quote,
    rating,
    status: input.status,
  };
}

export async function createTestimonial(input: TestimonialInputPayload): Promise<string> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Administrator authentication is required.');
  }
  const clean = validateTestimonialInput(input);
  const id = generateSafeId('rev');
  const docPath = `testimonials/${id}`;

  try {
    await setDoc(doc(db, 'testimonials', id), {
      ...clean,
      authorId: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateTestimonial(
  id: string,
  input: TestimonialInputPayload
): Promise<void> {
  const clean = validateTestimonialInput(input);
  const docPath = `testimonials/${id}`;
  try {
    await updateDoc(doc(db, 'testimonials', id), {
      ...clean,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function toggleTestimonialStatus(
  id: string,
  nextStatus: TestimonialStatus
): Promise<void> {
  const docPath = `testimonials/${id}`;
  try {
    await updateDoc(doc(db, 'testimonials', id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteTestimonial(id: string): Promise<void> {
  const docPath = `testimonials/${id}`;
  try {
    await deleteDoc(doc(db, 'testimonials', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// --- Public Inquiry Submission & Admin Inquiry Management ---

export interface PublicInquiryInput {
  name: string;
  phone: string;
  email: string;
  serviceType: string;
  message: string;
}

export async function submitPublicInquiry(input: PublicInquiryInput): Promise<string> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Database service is not configured yet.');
  }

  const name = input.name.trim().slice(0, SCHEMA_LIMITS.inquiry.nameMax);
  const phone = input.phone.trim().slice(0, SCHEMA_LIMITS.inquiry.phoneMax);
  const email = input.email.trim().slice(0, SCHEMA_LIMITS.inquiry.emailMax);
  const serviceType = input.serviceType.trim().slice(0, SCHEMA_LIMITS.inquiry.serviceTypeMax);
  const message = input.message.trim().slice(0, SCHEMA_LIMITS.inquiry.messageMax);

  if (name.length < SCHEMA_LIMITS.inquiry.nameMin) {
    throw new Error('Please enter your full name.');
  }
  if (phone.length < SCHEMA_LIMITS.inquiry.phoneMin) {
    throw new Error('Please enter a valid phone or WhatsApp number.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address.');
  }
  if (message.length < SCHEMA_LIMITS.inquiry.messageMin) {
    throw new Error('Please provide at least a brief summary of your project (10+ characters).');
  }

  const id = generateSafeId('inq');
  const docPath = `inquiries/${id}`;

  try {
    await setDoc(doc(db, 'inquiries', id), {
      name,
      phone,
      email,
      serviceType: serviceType || 'General Engineering Inquiry',
      message,
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  const docPath = `inquiries/${id}`;
  try {
    await updateDoc(doc(db, 'inquiries', id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteInquiry(id: string): Promise<void> {
  const docPath = `inquiries/${id}`;
  try {
    await deleteDoc(doc(db, 'inquiries', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
