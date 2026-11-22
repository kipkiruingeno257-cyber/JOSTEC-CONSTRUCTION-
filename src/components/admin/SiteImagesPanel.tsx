import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Camera,
  CheckCircle2,
  Flame,
  Images,
  Link2,
  RotateCw,
  Save,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { AdminSessionMode } from '../../context/FirebaseContext';
import {
  deleteSiteImage,
  saveSiteImage,
  uploadSiteSlotImage,
  validateImageFiles,
} from '../../services/firestoreService';
import {
  deleteLocalSiteImage,
  saveLocalSiteImage,
  uploadImagesToAppServer,
} from '../../services/localMediaService';
import {
  SCHEMA_LIMITS,
  type SiteImageRecord,
  type SiteImageSlotId,
} from '../../types';
import { encodeEmbeddedCloudWebP, formatBytes, processImageFile } from '../../utils/imageProcessor';

type SlotUploadDestination = 'cloud-webp' | 'server' | 'firebase';

interface SlotMeta {
  slot: SiteImageSlotId;
  label: string;
  locationBadge: string;
  description: string;
  defaultCaption: string;
  aspectHint: string;
  Icon: React.ElementType;
}

const SITE_IMAGE_SLOT_META: SlotMeta[] = [
  {
    slot: 'hero',
    label: 'Hero Banner Background',
    locationBadge: 'Top Homepage Banner',
    description:
      'Wide structural engineering or fabricated gate photograph showcased behind the main homepage headline.',
    defaultCaption: 'Custom fabricated structural steelwork and perimeter security installation',
    aspectHint: 'Recommended wide landscape (16:9)',
    Icon: Images,
  },
  {
    slot: 'service_construction',
    label: 'Structural Construction Showcase',
    locationBadge: 'Services Strip · Wide Left Card',
    description:
      'Primary wide feature photo highlighting commercial steel framing, trusses, or concrete foundations.',
    defaultCaption: 'Commercial Steel Framing & Reinforced Foundations',
    aspectHint: 'Recommended landscape (16:9 or 4:3)',
    Icon: Building2,
  },
  {
    slot: 'service_welding',
    label: 'Shop Fabrication & Welding',
    locationBadge: 'Services Strip · Middle Card',
    description:
      'Workshop fabrication, arc/MIG/TIG welding, or CNC steel assembly photography.',
    defaultCaption: 'Certified Structural Welding',
    aspectHint: 'Recommended 4:3 or square',
    Icon: Flame,
  },
  {
    slot: 'service_perimeter',
    label: 'Gates & Perimeter Security',
    locationBadge: 'Services Strip · Right Card',
    description:
      'Automated sliding/swing gates, palisade fencing, and masonry perimeter security installations.',
    defaultCaption: 'Gates & Palisade Fencing',
    aspectHint: 'Recommended 4:3 or square',
    Icon: ShieldCheck,
  },
];

interface SiteImageSlotCardProps {
  meta: SlotMeta;
  mode: AdminSessionMode;
  record: SiteImageRecord | null;
  onNotify: (type: 'success' | 'error', text: string) => void;
  onLocalMutated: () => Promise<void> | void;
}

const SiteImageSlotCard: React.FC<SiteImageSlotCardProps> = ({
  meta,
  mode,
  record,
  onNotify,
  onLocalMutated,
}) => {
  const { Icon } = meta;

  const [savedUrl, setSavedUrl] = useState(record?.imageUrl || '');
  const [savedPath, setSavedPath] = useState(record?.storagePath || '');
  const [caption, setCaption] = useState(record?.caption || meta.defaultCaption);
  const [removedPath, setRemovedPath] = useState<string | undefined>(undefined);

  const [sourceTab, setSourceTab] = useState<'device' | 'url'>('device');
  const [uploadDest, setUploadDest] = useState<SlotUploadDestination>('cloud-webp');
  const [externalUrl, setExternalUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  const [rotateTurns, setRotateTurns] = useState(0);

  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stagedUrlRef = useRef<string | null>(null);
  stagedUrlRef.current = stagedPreview;

  useEffect(() => {
    setSavedUrl(record?.imageUrl || '');
    setSavedPath(record?.storagePath || '');
    setCaption(record?.caption || meta.defaultCaption);
    setRemovedPath(undefined);
    setStagedFile(null);
    setRotateTurns(0);
    setStagedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setExternalUrl('');
    setError(null);
  }, [record, meta.defaultCaption]);

  useEffect(() => {
    return () => {
      if (stagedUrlRef.current) {
        URL.revokeObjectURL(stagedUrlRef.current);
      }
    };
  }, []);

  const handleSelectFile = (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const files = Array.isArray(fileList) ? fileList : Array.from(fileList);
    const file = files[0];
    if (!file) return;

    setError(null);
    const validationErr = validateImageFiles([file]);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    setStagedFile(file);
    setStagedPreview(URL.createObjectURL(file));
    setRotateTurns(0);
  };

  const handleApplyUrl = () => {
    setError(null);
    const raw = externalUrl.trim();
    if (!raw.startsWith('https://') && !raw.startsWith('http://') && !raw.startsWith('/')) {
      setError('Enter a valid image URL starting with https:// or a root-relative / path.');
      return;
    }
    if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    if (savedPath && savedPath !== 'external' && savedPath !== 'embedded:webp') {
      setRemovedPath(savedPath);
    }
    setStagedFile(null);
    setStagedPreview(null);
    setRotateTurns(0);
    setSavedUrl(raw);
    setSavedPath('external');
    setExternalUrl('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stagedFile && !savedUrl.trim()) {
      setError('Please select an image file or enter an image URL before saving.');
      return;
    }

    setSaving(true);
    setProgress(0);

    try {
      let nextUrl = savedUrl.trim();
      let nextPath = savedPath.trim() || 'external';
      let cleanupTarget = removedPath;

      if (stagedFile) {
        if (savedPath && savedPath !== 'external' && savedPath !== 'embedded:webp') {
          cleanupTarget = savedPath;
        }

        const effectiveDest: SlotUploadDestination = mode === 'local' ? 'server' : uploadDest;

        if (effectiveDest === 'cloud-webp') {
          setProgress(35);
          const encoded = await encodeEmbeddedCloudWebP(stagedFile, {
            maxChars: 240_000,
            rotateQuarterTurns: rotateTurns,
          });
          nextUrl = encoded.dataUrl;
          nextPath = 'embedded:webp';
          setProgress(100);
        } else if (effectiveDest === 'server') {
          try {
            const uploaded = await uploadImagesToAppServer(
              `site_${meta.slot}`,
              [{ file: stagedFile, rotateQuarterTurns: rotateTurns }],
              { optimize: true },
              (pct) => setProgress(pct)
            );
            nextUrl = uploaded[0].url;
            nextPath = uploaded[0].storagePath;
          } catch (serverErr) {
            if (mode === 'firebase') {
              const encoded = await encodeEmbeddedCloudWebP(stagedFile, {
                maxChars: 240_000,
                rotateQuarterTurns: rotateTurns,
              });
              nextUrl = encoded.dataUrl;
              nextPath = 'embedded:webp';
              setProgress(100);
            } else {
              throw serverErr;
            }
          }
        } else {
          const processed = await processImageFile(stagedFile, {
            optimize: true,
            rotateQuarterTurns: rotateTurns,
          });
          const preparedFile = new File([processed.blob], processed.fileName, {
            type: processed.mimeType,
          });
          const uploaded = await uploadSiteSlotImage(meta.slot, preparedFile, (pct) =>
            setProgress(pct)
          );
          nextUrl = uploaded.url;
          nextPath = uploaded.storagePath;
        }
      }

      const cleanCaption = caption.trim().slice(0, SCHEMA_LIMITS.siteImage.captionMax);

      if (mode === 'local') {
        await saveLocalSiteImage(
          meta.slot,
          { imageUrl: nextUrl, storagePath: nextPath, caption: cleanCaption },
          cleanupTarget
        );
        await onLocalMutated();
      } else {
        await saveSiteImage(
          { slot: meta.slot, imageUrl: nextUrl, storagePath: nextPath, caption: cleanCaption },
          cleanupTarget
        );
      }

      if (stagedPreview) URL.revokeObjectURL(stagedPreview);
      setStagedFile(null);
      setStagedPreview(null);
      setRotateTurns(0);
      setSavedUrl(nextUrl);
      setSavedPath(nextPath);
      setRemovedPath(undefined);

      onNotify('success', `Updated "${meta.label}" on the live website.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to save ${meta.label}.`;
      setError(msg);
      onNotify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setError(null);
    if (stagedFile && !record?.imageUrl) {
      if (stagedPreview) URL.revokeObjectURL(stagedPreview);
      setStagedFile(null);
      setStagedPreview(null);
      setRotateTurns(0);
      setSavedUrl('');
      setSavedPath('');
      return;
    }

    setRemoving(true);
    try {
      if (mode === 'local') {
        await deleteLocalSiteImage(meta.slot);
        await onLocalMutated();
      } else {
        await deleteSiteImage(
          meta.slot,
          savedPath && savedPath !== 'external' && savedPath !== 'embedded:webp'
            ? savedPath
            : undefined
        );
      }
      if (stagedPreview) URL.revokeObjectURL(stagedPreview);
      setStagedFile(null);
      setStagedPreview(null);
      setRotateTurns(0);
      setSavedUrl('');
      setSavedPath('');
      setRemovedPath(undefined);
      onNotify('success', `Removed photo from "${meta.label}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to remove site photo.';
      setError(msg);
      onNotify('error', msg);
    } finally {
      setRemoving(false);
    }
  };

  const activePreview = stagedPreview || savedUrl;

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-orange-600 shrink-0" />
            <h2 className="font-display text-base font-bold text-[#0B1B2B] truncate">
              {meta.label}
            </h2>
          </div>
          <p className="text-[11px] font-medium text-orange-700 mt-0.5">{meta.locationBadge}</p>
        </div>
        {(record?.imageUrl || stagedFile) && (
          <button
            type="button"
            disabled={saving || removing}
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 border border-red-200 bg-white rounded-md hover:bg-red-50 disabled:opacity-60 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {removing ? 'Removing...' : 'Remove'}
          </button>
        )}
      </div>

      {/* Visual Preview */}
      <div className="relative h-52 bg-[#0B1B2B] border-b border-slate-200 overflow-hidden">
        {activePreview ? (
          <img
            src={activePreview}
            alt={caption || meta.label}
            style={
              stagedPreview && rotateTurns > 0
                ? { transform: `rotate(${rotateTurns * 90}deg)` }
                : undefined
            }
            className="w-full h-full object-cover transition-transform"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          >
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/15 flex items-center justify-center mb-2.5">
              <Icon className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-xs font-semibold text-white">No Image Uploaded</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{meta.aspectHint}</p>
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0B1B2B]/90 via-[#0B1B2B]/35 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 px-4 py-3 text-white flex items-end justify-between gap-2">
          <p className="text-xs font-semibold truncate">{caption || meta.defaultCaption}</p>
          {stagedFile && (
            <button
              type="button"
              onClick={() => setRotateTurns((t) => (t + 1) % 4)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded text-white shrink-0 cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              Rotate
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">{meta.description}</p>

          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-900">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Source Switcher */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSourceTab('device')}
              className={`px-3 py-1.5 rounded font-semibold cursor-pointer ${
                sourceTab === 'device'
                  ? 'bg-[#0B1B2B] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Upload from Device
            </button>
            <button
              type="button"
              onClick={() => setSourceTab('url')}
              className={`px-3 py-1.5 rounded font-semibold cursor-pointer ${
                sourceTab === 'url'
                  ? 'bg-[#0B1B2B] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Image URL
            </button>
          </div>

          {sourceTab === 'device' ? (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleSelectFile(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-md p-4 text-center transition-colors ${
                  isDragging
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                }`}
              >
                <UploadCloud className="w-6 h-6 text-orange-600 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-[#0B1B2B]">
                  Drop an image here or select a file
                </p>
                <div className="mt-2.5">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1B2B] text-white text-xs font-semibold rounded-md hover:bg-slate-800 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    Choose Image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="sr-only"
                      onChange={(e) => {
                        handleSelectFile(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                {stagedFile && (
                  <p className="mt-2 text-xs font-medium text-emerald-700 truncate">
                    Staged: {stagedFile.name} ({formatBytes(stagedFile.size)})
                  </p>
                )}
              </div>

              {mode === 'firebase' && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700 mr-1">Storage:</span>
                  <button
                    type="button"
                    onClick={() => setUploadDest('cloud-webp')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer ${
                      uploadDest === 'cloud-webp'
                        ? 'border-orange-600 bg-orange-50 text-orange-800 font-semibold'
                        : 'border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    Cloud WebP
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadDest('server')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer ${
                      uploadDest === 'server'
                        ? 'border-orange-600 bg-orange-50 text-orange-800 font-semibold'
                        : 'border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <Server className="w-3 h-3" />
                    App Server
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadDest('firebase')}
                    className={`px-2 py-1 rounded border cursor-pointer ${
                      uploadDest === 'firebase'
                        ? 'border-orange-600 bg-orange-50 text-orange-800 font-semibold'
                        : 'border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    Firebase Storage
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://example.com/site-photo.webp"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-xs bg-white text-slate-900 focus:outline-none focus:border-orange-600"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="inline-flex items-center gap-1 px-3 py-2 bg-[#0B1B2B] text-white text-xs font-semibold rounded-md hover:bg-slate-800 shrink-0 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                Apply
              </button>
            </div>
          )}

          {/* Optional Caption */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Caption / Alt Label
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {caption.length}/{SCHEMA_LIMITS.siteImage.captionMax}
              </span>
            </div>
            <input
              type="text"
              maxLength={SCHEMA_LIMITS.siteImage.captionMax}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={meta.defaultCaption}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:border-orange-600"
            />
          </div>

          {saving && progress > 0 && progress < 100 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Uploading image...</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-orange-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Updates live immediately
          </span>
          <button
            type="submit"
            disabled={saving || removing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Publish Image'}
          </button>
        </div>
      </div>
    </form>
  );
};

interface SiteImagesPanelProps {
  mode: AdminSessionMode;
  siteImages: Partial<Record<SiteImageSlotId, SiteImageRecord>>;
  onNotify: (type: 'success' | 'error', text: string) => void;
  onLocalMutated: () => Promise<void> | void;
}

export const SiteImagesPanel: React.FC<SiteImagesPanelProps> = ({
  mode,
  siteImages,
  onNotify,
  onLocalMutated,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#0B1B2B]">
          Website Imagery &amp; Showcase Slots
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Upload and manage your own photography for the homepage hero banner and engineering
          service showcase cards. All changes reflect immediately on the live website.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {SITE_IMAGE_SLOT_META.map((meta) => (
          <SiteImageSlotCard
            key={meta.slot}
            meta={meta}
            mode={mode}
            record={siteImages[meta.slot] ?? null}
            onNotify={onNotify}
            onLocalMutated={onLocalMutated}
          />
        ))}
      </div>
    </div>
  );
};
