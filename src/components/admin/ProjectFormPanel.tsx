import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  FileEdit,
  Globe,
  ImagePlus,
  Link2,
  RotateCw,
  Server,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import type { AdminSessionMode } from '../../context/FirebaseContext';
import {
  createNewProjectId,
  createProject,
  updateProject,
  uploadProjectImages,
  validateImageFiles,
} from '../../services/firestoreService';
import {
  createLocalProject,
  updateLocalProject,
  uploadImagesToAppServer,
} from '../../services/localMediaService';
import {
  PROJECT_CATEGORIES,
  SCHEMA_LIMITS,
  type ProjectCategory,
  type ProjectRecord,
  type ProjectStatus,
} from '../../types';
import { formatBytes, processImageFile } from '../../utils/imageProcessor';

type UploadDestination = 'server' | 'firebase';

interface UnifiedPhotoItem {
  key: string;
  kind: 'existing' | 'local' | 'url';
  previewUrl: string;
  label: string;
  storagePath?: string;
  file?: File;
  fileSize?: number;
  rotateTurns?: number;
}

interface ProjectFormPanelProps {
  mode: AdminSessionMode;
  editingProject?: ProjectRecord | null;
  onCancelEdit?: () => void;
  onSaved: (message: string) => void;
  onOpenSetupGuide?: () => void;
}

export const ProjectFormPanel: React.FC<ProjectFormPanelProps> = ({
  mode,
  editingProject = null,
  onCancelEdit,
  onSaved,
  onOpenSetupGuide,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('Gate Installation');
  const [location, setLocation] = useState('');
  const [completionYear, setCompletionYear] = useState(String(new Date().getFullYear()));

  const [photos, setPhotos] = useState<UnifiedPhotoItem[]>([]);
  const [removedStoragePaths, setRemovedStoragePaths] = useState<string[]>([]);

  // Advanced image ingestion controls
  const [ingestTab, setIngestTab] = useState<'device' | 'url'>('device');
  const [uploadDestination, setUploadDestination] = useState<UploadDestination>('server');
  const [optimizeImages, setOptimizeImages] = useState(true);
  const [urlInputText, setUrlInputText] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeFileName, setActiveFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const photosRef = useRef<UnifiedPhotoItem[]>([]);
  photosRef.current = photos;

  useEffect(() => {
    setPhotos((prev) => {
      prev.forEach((p) => {
        if (p.kind === 'local') {
          URL.revokeObjectURL(p.previewUrl);
        }
      });
      if (editingProject) {
        return (editingProject.imageUrls || []).map((url, idx) => ({
          key: `existing_${idx}_${url}`,
          kind: 'existing',
          previewUrl: url,
          label: `Photo ${idx + 1}`,
          storagePath: editingProject.storagePaths?.[idx] ?? 'external',
        }));
      }
      return [];
    });

    if (editingProject) {
      setTitle(editingProject.title);
      setDescription(editingProject.description);
      setCategory(editingProject.category);
      setLocation(editingProject.location ?? '');
      setCompletionYear(editingProject.completionYear ?? String(new Date().getFullYear()));
      setRemovedStoragePaths([]);
    } else {
      setTitle('');
      setDescription('');
      setCategory('Gate Installation');
      setLocation('');
      setCompletionYear(String(new Date().getFullYear()));
      setRemovedStoragePaths([]);
    }
    setUrlInputText('');
    setErrorMsg(null);
    setUploadProgress(0);
    setActiveFileName('');
  }, [editingProject]);

  // Revoke any remaining local object URLs only when the panel unmounts
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => {
        if (p.kind === 'local') {
          URL.revokeObjectURL(p.previewUrl);
        }
      });
    };
  }, []);

  const addSelectedFiles = (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const incoming = Array.isArray(fileList) ? fileList : Array.from(fileList);
    if (incoming.length === 0) return;
    setErrorMsg(null);

    if (photos.length + incoming.length > SCHEMA_LIMITS.project.maxImages) {
      setErrorMsg(
        `Maximum ${SCHEMA_LIMITS.project.maxImages} photographs allowed per project. Remove an image first.`
      );
      return;
    }

    const validationError = validateImageFiles(incoming);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    const mapped: UnifiedPhotoItem[] = incoming.map((file, idx) => ({
      key: `local_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      kind: 'local',
      previewUrl: URL.createObjectURL(file),
      label: file.name,
      file,
      fileSize: file.size,
      rotateTurns: 0,
    }));

    setPhotos((prev) => [...prev, ...mapped]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const f = items[i].getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addSelectedFiles(imageFiles);
    }
  };

  const handleAddUrls = () => {
    setErrorMsg(null);
    const lines = urlInputText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setErrorMsg('Paste one or more valid image URLs (https://... or /...).');
      return;
    }
    if (photos.length + lines.length > SCHEMA_LIMITS.project.maxImages) {
      setErrorMsg(
        `Adding ${lines.length} URL(s) exceeds the ${SCHEMA_LIMITS.project.maxImages}-photo limit.`
      );
      return;
    }

    const validUrls: UnifiedPhotoItem[] = [];
    for (const raw of lines) {
      if (!raw.startsWith('https://') && !raw.startsWith('http://') && !raw.startsWith('/')) {
        setErrorMsg(`Invalid image URL: "${raw}". Use https:// or a root-relative / path.`);
        return;
      }
      validUrls.push({
        key: `url_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        kind: 'url',
        previewUrl: raw,
        label: raw.split('/').pop() || 'External Image',
        storagePath: 'external',
      });
    }

    setPhotos((prev) => [...prev, ...validUrls]);
    setUrlInputText('');
  };

  const removePhoto = (index: number) => {
    const target = photos[index];
    if (!target) return;
    if (target.kind === 'local') {
      URL.revokeObjectURL(target.previewUrl);
    } else if (
      target.kind === 'existing' &&
      target.storagePath &&
      target.storagePath !== 'external'
    ) {
      setRemovedStoragePaths((prev) => [...prev, target.storagePath!]);
    }
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= photos.length) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const rotatePhoto = (index: number) => {
    setPhotos((prev) =>
      prev.map((item, idx) =>
        idx === index && item.kind === 'local'
          ? { ...item, rotateTurns: ((item.rotateTurns ?? 0) + 1) % 4 }
          : item
      )
    );
  };

  const handleSave = async (targetStatus: ProjectStatus) => {
    setErrorMsg(null);

    if (title.trim().length < SCHEMA_LIMITS.project.titleMin) {
      setErrorMsg(
        `Please enter a project title (at least ${SCHEMA_LIMITS.project.titleMin} characters).`
      );
      return;
    }
    if (description.trim().length < SCHEMA_LIMITS.project.descriptionMin) {
      setErrorMsg(
        `Please enter a project description (at least ${SCHEMA_LIMITS.project.descriptionMin} characters).`
      );
      return;
    }
    if (targetStatus === 'published' && photos.length === 0) {
      setErrorMsg(
        'Please add at least one project photograph before publishing to the public gallery.'
      );
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const targetProjectId = editingProject ? editingProject.id : createNewProjectId();
      const localItems = photos.filter((p) => p.kind === 'local' && p.file);

      let uploadedResults: { url: string; storagePath: string }[] = [];
      if (localItems.length > 0) {
        const effectiveDestination: UploadDestination =
          mode === 'local' ? 'server' : uploadDestination;

        if (effectiveDestination === 'server') {
          uploadedResults = await uploadImagesToAppServer(
            targetProjectId,
            localItems.map((item) => ({
              file: item.file!,
              rotateQuarterTurns: item.rotateTurns ?? 0,
            })),
            { optimize: optimizeImages },
            (pct, fileName) => {
              setUploadProgress(pct);
              setActiveFileName(fileName);
            }
          );
        } else {
          const preparedFiles: File[] = [];
          for (const item of localItems) {
            const processed = await processImageFile(item.file!, {
              optimize: optimizeImages,
              rotateQuarterTurns: item.rotateTurns ?? 0,
            });
            preparedFiles.push(
              new File([processed.blob], processed.fileName, { type: processed.mimeType })
            );
          }
          uploadedResults = await uploadProjectImages(
            targetProjectId,
            preparedFiles,
            (pct, fileName) => {
              setUploadProgress(pct);
              setActiveFileName(fileName);
            }
          );
        }
      }

      // Preserve exact user ordering across existing, URL, and newly uploaded items
      let uploadCursor = 0;
      const finalUrls: string[] = [];
      const finalPaths: string[] = [];

      for (const item of photos) {
        if (item.kind === 'local') {
          const uploaded = uploadedResults[uploadCursor++];
          if (uploaded) {
            finalUrls.push(uploaded.url);
            finalPaths.push(uploaded.storagePath);
          }
        } else {
          finalUrls.push(item.previewUrl);
          finalPaths.push(item.storagePath || 'external');
        }
      }

      const payload = {
        title,
        description,
        category,
        location,
        completionYear,
        imageUrls: finalUrls,
        storagePaths: finalPaths,
        status: targetStatus,
      };

      if (mode === 'local') {
        if (editingProject) {
          await updateLocalProject(editingProject.id, payload, removedStoragePaths);
        } else {
          await createLocalProject({ id: targetProjectId, ...payload });
        }
      } else {
        if (editingProject) {
          await updateProject(editingProject.id, payload, removedStoragePaths);
        } else {
          await createProject(targetProjectId, payload);
        }
      }

      if (!editingProject) {
        setTitle('');
        setDescription('');
        setLocation('');
        setPhotos([]);
      }

      onSaved(
        editingProject
          ? targetStatus === 'published'
            ? `"${title.trim()}" updated and published to the public gallery.`
            : `"${title.trim()}" saved as draft.`
          : targetStatus === 'published'
            ? `"${title.trim()}" published! It is now live in the public gallery.`
            : `"${title.trim()}" saved to drafts.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save project.');
    } finally {
      setUploading(false);
      setActiveFileName('');
    }
  };

  return (
    <div
      onPaste={handlePaste}
      className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B1B2B]">
            {editingProject ? 'Edit Project & Photographs' : 'Upload New Engineering Project'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Add photos from your phone or desktop, paste screenshots (Ctrl+V), or attach direct
            image URLs—no Firebase Storage setup required.
          </p>
        </div>
        {editingProject && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Cancel Edit
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Upload or Save Failed</p>
            <p className="mt-1 text-red-800">{errorMsg}</p>
            {errorMsg.includes('Storage') && onOpenSetupGuide && (
              <button
                type="button"
                onClick={onOpenSetupGuide}
                className="mt-2 text-xs font-semibold underline text-red-900 hover:text-red-700 cursor-pointer"
              >
                Open Storage &amp; Rules Guide
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="proj-title" className="block text-sm font-medium text-slate-700 mb-1.5">
              Project Title
            </label>
            <input
              id="proj-title"
              type="text"
              required
              maxLength={SCHEMA_LIMITS.project.titleMax}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Modern Automated Sliding Gate Installation"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
            />
          </div>

          <div>
            <label
              htmlFor="proj-category"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Project Category
            </label>
            <select
              id="proj-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ProjectCategory)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
            >
              {PROJECT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="proj-location"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Site Location (Optional)
            </label>
            <input
              id="proj-location"
              type="text"
              maxLength={SCHEMA_LIMITS.project.locationMax}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. North Industrial District"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
            />
          </div>

          <div>
            <label htmlFor="proj-year" className="block text-sm font-medium text-slate-700 mb-1.5">
              Completion Year (Optional)
            </label>
            <input
              id="proj-year"
              type="text"
              maxLength={SCHEMA_LIMITS.project.completionYearMax}
              value={completionYear}
              onChange={(e) => setCompletionYear(e.target.value)}
              placeholder="2026"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
            />
          </div>
        </div>

        <div>
          <label htmlFor="proj-desc" className="block text-sm font-medium text-slate-700 mb-1.5">
            Project Description &amp; Technical Scope
          </label>
          <textarea
            id="proj-desc"
            required
            rows={4}
            maxLength={SCHEMA_LIMITS.project.descriptionMax}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe steel gauge, welding specification, concrete footing, gate motor type, or surface finish..."
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
          />
          <p className="text-xs text-slate-400 font-mono tabular-nums mt-1 text-right">
            {description.length} / {SCHEMA_LIMITS.project.descriptionMax}
          </p>
        </div>

        {/* Advanced Multi-Source Media Studio */}
        <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/70 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-sm font-semibold text-[#0B1B2B]">
                Project Photographs ({photos.length} / {SCHEMA_LIMITS.project.maxImages})
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                First photo is used as the gallery cover. Rotate, reorder, or paste images directly.
              </p>
            </div>

            {/* Ingestion Method Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-md self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIngestTab('device')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  ingestTab === 'device'
                    ? 'bg-white text-[#0B1B2B] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Device / Camera
              </button>
              <button
                type="button"
                onClick={() => setIngestTab('url')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  ingestTab === 'url'
                    ? 'bg-white text-[#0B1B2B] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                Image URLs
              </button>
            </div>
          </div>

          {ingestTab === 'device' ? (
            <div className="space-y-4">
              {/* Storage Destination & Optimization Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-md text-xs">
                <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={optimizeImages}
                    onChange={(e) => setOptimizeImages(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-600"
                  />
                  <Sparkles className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>
                    <strong>Auto-Optimize Photos</strong> (WebP · Max 1600px for fast mobile uploads)
                  </span>
                </label>

                {mode === 'firebase' && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Upload to:</span>
                    <select
                      aria-label="Upload storage destination"
                      value={uploadDestination}
                      onChange={(e) => setUploadDestination(e.target.value as UploadDestination)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-[#0B1B2B] focus:outline-none focus:border-orange-600"
                    >
                      <option value="server">App Media Server (No Firebase Storage needed)</option>
                      <option value="firebase">Firebase Storage Bucket</option>
                    </select>
                  </div>
                )}

                {mode === 'local' && (
                  <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                    <Server className="w-3.5 h-3.5 text-orange-600" />
                    Direct App Media Server
                  </span>
                )}
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  addSelectedFiles(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors bg-white ${
                  isDragging
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <UploadCloud className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#0B1B2B] mb-1">
                  Drop site photos here, paste from clipboard (Ctrl+V), or browse
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Supports JPG, PNG, WebP, AVIF up to 10 MB per photo
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B1B2B] text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors cursor-pointer">
                    <ImagePlus className="w-4 h-4" />
                    <span>Select Photos</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      disabled={uploading}
                      onChange={(e) => {
                        addSelectedFiles(e.target.files);
                        e.target.value = '';
                      }}
                      className="sr-only"
                    />
                  </label>

                  <label className="sm:hidden inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <span>Take Site Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={uploading}
                      onChange={(e) => {
                        addSelectedFiles(e.target.files);
                        e.target.value = '';
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* Bulk / Direct Image URL Ingestion */
            <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
              <label
                htmlFor="bulk-image-urls"
                className="block text-xs font-semibold text-slate-700"
              >
                Paste Image URL(s) — one per line (zero upload required)
              </label>
              <textarea
                id="bulk-image-urls"
                rows={3}
                value={urlInputText}
                onChange={(e) => setUrlInputText(e.target.value)}
                placeholder={'https://example.com/gate-photo-1.jpg\nhttps://example.com/gate-photo-2.jpg'}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-600"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddUrls}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B1B2B] text-white text-xs font-semibold rounded-md hover:bg-slate-800 cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Add URL(s) to Gallery
                </button>
              </div>
            </div>
          )}

          {/* Ordered Photo Preview Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
              {photos.map((photo, idx) => (
                <div
                  key={photo.key}
                  className={`rounded-md overflow-hidden border bg-white flex flex-col ${
                    idx === 0 ? 'border-orange-500 ring-1 ring-orange-500/40' : 'border-slate-200'
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={photo.previewUrl}
                      alt={photo.label}
                      referrerPolicy="no-referrer"
                      style={
                        photo.rotateTurns
                          ? { transform: `rotate(${photo.rotateTurns * 90}deg)` }
                          : undefined
                      }
                      className="w-full h-full object-cover transition-transform duration-150"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#0B1B2B]/85 text-white text-[11px] font-mono tabular-nums">
                      {idx === 0 ? '#1 Cover' : `#${idx + 1}`}
                    </div>
                    {photo.kind === 'existing' && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-700/90 text-white text-[10px] font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Saved
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                      <span className="truncate font-medium">{photo.label}</span>
                      {photo.fileSize && (
                        <span className="font-mono tabular-nums text-slate-400 shrink-0">
                          {formatBytes(photo.fileSize)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={uploading || idx === 0}
                          onClick={() => movePhoto(idx, idx - 1)}
                          title="Move Left"
                          aria-label="Move photo left"
                          className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={uploading || idx === photos.length - 1}
                          onClick={() => movePhoto(idx, idx + 1)}
                          title="Move Right"
                          aria-label="Move photo right"
                          className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        {idx !== 0 && (
                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() => movePhoto(idx, 0)}
                            title="Set as Cover Photo"
                            className="p-1.5 rounded border border-slate-200 text-orange-600 hover:bg-orange-50 cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {photo.kind === 'local' && (
                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() => rotatePhoto(idx)}
                            title="Rotate 90°"
                            aria-label="Rotate photo 90 degrees"
                            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => removePhoto(idx)}
                        title="Remove Photo"
                        aria-label={`Remove ${photo.label}`}
                        className="p-1.5 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-2">
              <span className="truncate">
                {activeFileName ? `Uploading ${activeFileName}...` : 'Saving project details...'}
              </span>
              <span className="font-mono tabular-nums ml-3">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-600 transition-all duration-150"
                style={{ width: `${Math.max(uploadProgress, 8)}%` }}
              />
            </div>
          </div>
        )}

        {/* Save Actions */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            disabled={uploading}
            onClick={() => handleSave('draft')}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 bg-white text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-50 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <FileEdit className="w-4 h-4" />
            Save as Draft
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => handleSave('published')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Publish Project'}
          </button>
        </div>
      </div>
    </div>
  );
};
