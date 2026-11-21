import { auth } from '../lib/firebase';
import { processImageFile } from '../utils/imageProcessor';
import type {
  InquiryRecord,
  InquiryStatus,
  PhotoAppearance,
  ProjectCategory,
  ProjectRecord,
  ProjectStatus,
  TestimonialRecord,
  TestimonialStatus,
} from '../types';

export interface StagedLocalImageInput {
  file: File;
  rotateQuarterTurns?: number;
}

export interface MediaUploadOutput {
  url: string;
  storagePath: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const user = auth?.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Fall back to local session cookie if present
    }
  }
  return headers;
}

export async function uploadImagesToAppServer(
  projectId: string,
  items: StagedLocalImageInput[],
  options: { optimize: boolean },
  onProgress?: (percent: number, activeFileName: string) => void
): Promise<MediaUploadOutput[]> {
  if (items.length === 0) return [];
  const authHeaders = await getAuthHeaders();

  const processedList = await Promise.all(
    items.map((item) =>
      processImageFile(item.file, {
        optimize: options.optimize,
        rotateQuarterTurns: item.rotateQuarterTurns ?? 0,
      })
    )
  );

  const totalBytes = processedList.reduce((sum, p) => sum + Math.max(p.processedSize, 1), 0);
  const uploadedPerFile = new Array<number>(processedList.length).fill(0);
  const results = new Array<MediaUploadOutput>(processedList.length);

  const uploadSingle = (i: number): Promise<void> => {
    const item = processedList[i];
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/media/upload', true);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Content-Type', item.mimeType || 'image/webp');
      xhr.setRequestHeader('X-Project-Id', projectId);
      if (authHeaders.Authorization) {
        xhr.setRequestHeader('Authorization', authHeaders.Authorization);
      }

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          uploadedPerFile[i] = evt.loaded;
          const totalLoaded = uploadedPerFile.reduce((a, b) => a + b, 0);
          const pct = Math.min(100, Math.round((totalLoaded / totalBytes) * 100));
          onProgress?.(pct, item.fileName);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText) as MediaUploadOutput;
            uploadedPerFile[i] = item.processedSize;
            onProgress?.(
              Math.min(
                100,
                Math.round((uploadedPerFile.reduce((a, b) => a + b, 0) / totalBytes) * 100)
              ),
              item.fileName
            );
            results[i] = parsed;
            resolve();
          } catch {
            reject(new Error('Invalid response from media upload server.'));
          }
        } else {
          let errMsg = `Media upload failed (${xhr.status})`;
          try {
            const parsed = JSON.parse(xhr.responseText) as { error?: string };
            if (parsed.error) errMsg = parsed.error;
          } catch {
            // Keep HTTP status error
          }
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error while uploading image to app media server.'));
      };

      xhr.send(item.blob);
    });
  };

  // Upload up to 3 images in parallel for faster multi-photo completion
  const concurrency = Math.min(3, processedList.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < processedList.length) {
        const index = cursor++;
        await uploadSingle(index);
      }
    })
  );

  return results;
}

export async function deleteAppServerMedia(storagePaths: string[]): Promise<void> {
  const localPaths = storagePaths.filter((p) => p.startsWith('local:'));
  if (localPaths.length === 0) return;

  const authHeaders = await getAuthHeaders();
  await Promise.allSettled(
    localPaths.map((sp) => {
      const fileName = sp.slice(6);
      return fetch(`/api/media/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders,
      });
    })
  );
}

// --- Standalone Local Mode Auth & Data API ---

export interface LocalSessionStatus {
  authenticated: boolean;
  hasPasscodeConfigured: boolean;
}

export async function getLocalSession(): Promise<LocalSessionStatus> {
  const res = await fetch('/api/local/session', { credentials: 'include' });
  if (!res.ok) {
    return { authenticated: false, hasPasscodeConfigured: false };
  }
  return (await res.json()) as LocalSessionStatus;
}

export async function setupLocalPasscode(passcode: string): Promise<void> {
  const res = await fetch('/api/local/setup', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || 'Failed to configure local passcode.');
  }
}

export async function loginLocalAdmin(passcode: string): Promise<void> {
  const res = await fetch('/api/local/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || 'Invalid local passcode.');
  }
}

export async function logoutLocalAdmin(): Promise<void> {
  await fetch('/api/local/logout', { method: 'POST', credentials: 'include' });
}

export async function fetchLocalPublicPortfolio(): Promise<{
  projects: ProjectRecord[];
  testimonials: TestimonialRecord[];
}> {
  try {
    const res = await fetch('/api/local/portfolio');
    if (!res.ok) return { projects: [], testimonials: [] };
    return (await res.json()) as {
      projects: ProjectRecord[];
      testimonials: TestimonialRecord[];
    };
  } catch {
    return { projects: [], testimonials: [] };
  }
}

export async function fetchLocalAdminData(): Promise<{
  projects: ProjectRecord[];
  testimonials: TestimonialRecord[];
  inquiries: InquiryRecord[];
}> {
  const res = await fetch('/api/local/admin/data', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Unable to load local admin data.');
  }
  return (await res.json()) as {
    projects: ProjectRecord[];
    testimonials: TestimonialRecord[];
    inquiries: InquiryRecord[];
  };
}

export async function createLocalProject(payload: {
  id?: string;
  title: string;
  description: string;
  category: ProjectCategory;
  location?: string;
  completionYear?: string;
  imageUrls: string[];
  storagePaths: string[];
  photoAppearance?: PhotoAppearance;
  status: ProjectStatus;
}): Promise<ProjectRecord> {
  const res = await fetch('/api/local/projects', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error || 'Failed to save local project.');
  }
  return (await res.json()) as ProjectRecord;
}

export async function updateLocalProject(
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    category: ProjectCategory;
    location: string;
    completionYear: string;
    imageUrls: string[];
    storagePaths: string[];
    photoAppearance: PhotoAppearance;
    status: ProjectStatus;
  }>,
  removedStoragePaths: string[] = []
): Promise<ProjectRecord> {
  const res = await fetch(`/api/local/projects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error || 'Failed to update local project.');
  }
  if (removedStoragePaths.length > 0) {
    await deleteAppServerMedia(removedStoragePaths);
  }
  return (await res.json()) as ProjectRecord;
}

export async function deleteLocalProject(id: string): Promise<void> {
  const res = await fetch(`/api/local/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to delete local project.');
  }
}

export async function createLocalTestimonial(payload: {
  clientName: string;
  clientRole: string;
  projectType: string;
  quote: string;
  rating: number;
  status: TestimonialStatus;
}): Promise<TestimonialRecord> {
  const res = await fetch('/api/local/testimonials', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create local testimonial.');
  return (await res.json()) as TestimonialRecord;
}

export async function updateLocalTestimonial(
  id: string,
  payload: Partial<{
    clientName: string;
    clientRole: string;
    projectType: string;
    quote: string;
    rating: number;
    status: TestimonialStatus;
  }>
): Promise<TestimonialRecord> {
  const res = await fetch(`/api/local/testimonials/${encodeURIComponent(id)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update local testimonial.');
  return (await res.json()) as TestimonialRecord;
}

export async function deleteLocalTestimonial(id: string): Promise<void> {
  const res = await fetch(`/api/local/testimonials/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete local testimonial.');
}

export async function submitLocalInquiry(payload: {
  name: string;
  phone: string;
  email: string;
  serviceType: string;
  message: string;
}): Promise<void> {
  const res = await fetch('/api/local/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error || 'Failed to submit inquiry.');
  }
}

export async function updateLocalInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  const res = await fetch(`/api/local/inquiries/${encodeURIComponent(id)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update local inquiry.');
}

export async function deleteLocalInquiry(id: string): Promise<void> {
  const res = await fetch(`/api/local/inquiries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete local inquiry.');
}
