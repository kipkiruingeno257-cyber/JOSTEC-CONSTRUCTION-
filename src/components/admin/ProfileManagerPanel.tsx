import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Link2,
  RotateCcw,
  RotateCw,
  Save,
  Server,
  Sparkles,
  UploadCloud,
  UserCog,
} from 'lucide-react';
import type { AdminSessionMode } from '../../context/FirebaseContext';
import {
  resetSiteProfile,
  saveSiteProfile,
  uploadProfilePicture,
  validateImageFiles,
} from '../../services/firestoreService';
import {
  resetLocalSiteProfile,
  saveLocalSiteProfile,
  uploadImagesToAppServer,
} from '../../services/localMediaService';
import {
  DEFAULT_SITE_PROFILE,
  SCHEMA_LIMITS,
  type SiteProfileRecord,
} from '../../types';
import { encodeEmbeddedCloudWebP, formatBytes, processImageFile } from '../../utils/imageProcessor';

const DEFAULT_PORTRAIT_PREVIEW = '/src/assets/images/engineer_portrait_1795248991352.webp';

type AvatarUploadDestination = 'cloud-webp' | 'server' | 'firebase';

interface ProfileManagerPanelProps {
  mode: AdminSessionMode;
  profile: SiteProfileRecord | null;
  onNotify: (type: 'success' | 'error', text: string) => void;
  onLocalMutated: () => Promise<void> | void;
}

export const ProfileManagerPanel: React.FC<ProfileManagerPanelProps> = ({
  mode,
  profile,
  onNotify,
  onLocalMutated,
}) => {
  const effectiveSource = profile ?? DEFAULT_SITE_PROFILE;

  const [displayName, setDisplayName] = useState(effectiveSource.displayName);
  const [title, setTitle] = useState(effectiveSource.title);
  const [headline, setHeadline] = useState(effectiveSource.headline);
  const [description, setDescription] = useState(effectiveSource.description);

  const [savedAvatarUrl, setSavedAvatarUrl] = useState(effectiveSource.avatarUrl || '');
  const [savedStoragePath, setSavedStoragePath] = useState(
    effectiveSource.avatarStoragePath || 'default'
  );
  const [removedStoragePath, setRemovedStoragePath] = useState<string | undefined>(undefined);

  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [stagedRotateTurns, setStagedRotateTurns] = useState(0);

  const [avatarSourceTab, setAvatarSourceTab] = useState<'device' | 'url'>('device');
  const [uploadDestination, setUploadDestination] =
    useState<AvatarUploadDestination>('cloud-webp');
  const [externalUrlInput, setExternalUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const stagedUrlRef = useRef<string | null>(null);
  stagedUrlRef.current = stagedPreviewUrl;

  useEffect(() => {
    const src = profile ?? DEFAULT_SITE_PROFILE;
    setDisplayName(src.displayName);
    setTitle(src.title);
    setHeadline(src.headline);
    setDescription(src.description);
    setSavedAvatarUrl(src.avatarUrl || '');
    setSavedStoragePath(src.avatarStoragePath || 'default');
    setRemovedStoragePath(undefined);
    setStagedFile(null);
    setStagedRotateTurns(0);
    setStagedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setExternalUrlInput('');
    setFormError(null);
    setConfirmRestore(false);
  }, [profile]);

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

    setFormError(null);
    const err = validateImageFiles([file]);
    if (err) {
      setFormError(err);
      return;
    }

    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }
    setStagedFile(file);
    setStagedPreviewUrl(URL.createObjectURL(file));
    setStagedRotateTurns(0);
  };

  const handleApplyExternalUrl = () => {
    setFormError(null);
    const raw = externalUrlInput.trim();
    if (!raw.startsWith('https://') && !raw.startsWith('http://') && !raw.startsWith('/')) {
      setFormError('Enter a valid image URL starting with https:// or a root-relative / path.');
      return;
    }
    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }
    if (savedStoragePath && savedStoragePath !== 'default' && savedStoragePath !== 'external') {
      setRemovedStoragePath(savedStoragePath);
    }
    setStagedFile(null);
    setStagedPreviewUrl(null);
    setStagedRotateTurns(0);
    setSavedAvatarUrl(raw);
    setSavedStoragePath('external');
    setExternalUrlInput('');
  };

  const handleUseDefaultPortrait = () => {
    setFormError(null);
    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }
    if (savedStoragePath && savedStoragePath !== 'default' && savedStoragePath !== 'external') {
      setRemovedStoragePath(savedStoragePath);
    }
    setStagedFile(null);
    setStagedPreviewUrl(null);
    setStagedRotateTurns(0);
    setSavedAvatarUrl('');
    setSavedStoragePath('default');
  };

  const previewAvatarSrc = stagedPreviewUrl || savedAvatarUrl || DEFAULT_PORTRAIT_PREVIEW;

  const previewParagraphs = useMemo(() => {
    const parts = description
      .split(/\n{2,}|\r\n\r\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : ['Your biography text will appear here.'];
  }, [description]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = displayName.trim();
    const cleanTitle = title.trim();
    const cleanHeadline = headline.trim();
    const cleanDescription = description.trim();

    if (cleanName.length < SCHEMA_LIMITS.profile.displayNameMin) {
      setFormError(`Display name must be at least ${SCHEMA_LIMITS.profile.displayNameMin} characters.`);
      return;
    }
    if (cleanTitle.length < SCHEMA_LIMITS.profile.titleMin) {
      setFormError(`Role title must be at least ${SCHEMA_LIMITS.profile.titleMin} characters.`);
      return;
    }
    if (cleanHeadline.length < SCHEMA_LIMITS.profile.headlineMin) {
      setFormError(`Practice headline must be at least ${SCHEMA_LIMITS.profile.headlineMin} characters.`);
      return;
    }
    if (cleanDescription.length < SCHEMA_LIMITS.profile.descriptionMin) {
      setFormError(
        `About description must be at least ${SCHEMA_LIMITS.profile.descriptionMin} characters.`
      );
      return;
    }

    setSaving(true);
    setUploadProgress(0);

    try {
      let nextAvatarUrl = savedAvatarUrl;
      let nextStoragePath = savedStoragePath;
      let cleanupTarget = removedStoragePath;

      if (stagedFile) {
        if (
          savedStoragePath &&
          savedStoragePath !== 'default' &&
          savedStoragePath !== 'external' &&
          savedStoragePath !== 'embedded:webp'
        ) {
          cleanupTarget = savedStoragePath;
        }

        const effectiveDest: AvatarUploadDestination =
          mode === 'local' ? 'server' : uploadDestination;

        if (effectiveDest === 'cloud-webp') {
          setUploadProgress(35);
          const encoded = await encodeEmbeddedCloudWebP(stagedFile, {
            maxChars: 240_000,
            rotateQuarterTurns: stagedRotateTurns,
          });
          nextAvatarUrl = encoded.dataUrl;
          nextStoragePath = 'embedded:webp';
          setUploadProgress(100);
        } else if (effectiveDest === 'server') {
          try {
            const uploaded = await uploadImagesToAppServer(
              'profile',
              [{ file: stagedFile, rotateQuarterTurns: stagedRotateTurns }],
              { optimize: true },
              (pct) => setUploadProgress(pct)
            );
            nextAvatarUrl = uploaded[0].url;
            nextStoragePath = uploaded[0].storagePath;
          } catch (serverErr) {
            if (mode === 'firebase') {
              const encoded = await encodeEmbeddedCloudWebP(stagedFile, {
                maxChars: 240_000,
                rotateQuarterTurns: stagedRotateTurns,
              });
              nextAvatarUrl = encoded.dataUrl;
              nextStoragePath = 'embedded:webp';
              setUploadProgress(100);
            } else {
              throw serverErr;
            }
          }
        } else {
          const processed = await processImageFile(stagedFile, {
            optimize: true,
            rotateQuarterTurns: stagedRotateTurns,
          });
          const preparedFile = new File([processed.blob], processed.fileName, {
            type: processed.mimeType,
          });
          const uploaded = await uploadProfilePicture(preparedFile, (pct) => setUploadProgress(pct));
          nextAvatarUrl = uploaded.url;
          nextStoragePath = uploaded.storagePath;
        }
      }

      const payload = {
        displayName: cleanName,
        title: cleanTitle,
        headline: cleanHeadline,
        description: cleanDescription,
        avatarUrl: nextAvatarUrl,
        avatarStoragePath: nextAvatarUrl ? nextStoragePath || 'external' : 'default',
      };

      if (mode === 'local') {
        await saveLocalSiteProfile(payload, cleanupTarget);
        await onLocalMutated();
      } else {
        await saveSiteProfile(payload, cleanupTarget);
      }

      if (stagedPreviewUrl) {
        URL.revokeObjectURL(stagedPreviewUrl);
      }
      setStagedFile(null);
      setStagedPreviewUrl(null);
      setStagedRotateTurns(0);
      setSavedAvatarUrl(payload.avatarUrl);
      setSavedStoragePath(payload.avatarStoragePath);
      setRemovedStoragePath(undefined);

      onNotify('success', 'Profile picture and description updated on the live website.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save profile changes.';
      setFormError(msg);
      onNotify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    setFormError(null);
    setSaving(true);
    try {
      if (mode === 'local') {
        await resetLocalSiteProfile();
        await onLocalMutated();
      } else {
        await resetSiteProfile(
          savedStoragePath &&
            savedStoragePath !== 'default' &&
            savedStoragePath !== 'external' &&
            savedStoragePath !== 'embedded:webp'
            ? savedStoragePath
            : undefined
        );
      }
      setConfirmRestore(false);
      onNotify('success', 'Restored default engineer portrait and practice description.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to restore default profile.';
      setFormError(msg);
      onNotify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1B2B]">
            Profile Picture &amp; Bio Editor
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Update the principal engineer portrait, name, role title, and practice description shown
            in the public About section.
          </p>
        </div>

        {!confirmRestore ? (
          <button
            type="button"
            onClick={() => setConfirmRestore(true)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white text-xs font-semibold text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Default Bio &amp; Photo
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-md text-xs">
            <span className="font-medium text-amber-950">Reset to built-in default?</span>
            <button
              type="button"
              onClick={handleRestoreDefaults}
              disabled={saving}
              className="px-2.5 py-1 bg-amber-700 text-white font-semibold rounded hover:bg-amber-800 cursor-pointer"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmRestore(false)}
              className="px-2 py-1 text-slate-700 font-medium hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {formError && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-900">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Profile Editor Form */}
        <form
          onSubmit={handleSave}
          className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-6"
        >
          {/* Profile Picture Uploader */}
          <div className="space-y-3 pb-6 border-b border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-[#0B1B2B] flex items-center gap-2">
                <UserCog className="w-4 h-4 text-orange-600" />
                Profile Picture
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAvatarSourceTab('device')}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    avatarSourceTab === 'device'
                      ? 'bg-[#0B1B2B] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Upload Photo
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarSourceTab('url')}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    avatarSourceTab === 'url'
                      ? 'bg-[#0B1B2B] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Image URL
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Thumbnail & Rotation Controls */}
              <div className="w-32 shrink-0 space-y-2">
                <div className="w-32 h-36 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={previewAvatarSrc}
                    alt="Profile preview"
                    style={
                      stagedPreviewUrl && stagedRotateTurns > 0
                        ? { transform: `rotate(${stagedRotateTurns * 90}deg)` }
                        : undefined
                    }
                    className="w-full h-full object-cover object-top transition-transform"
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  {stagedFile ? (
                    <button
                      type="button"
                      onClick={() => setStagedRotateTurns((t) => (t + 1) % 4)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-semibold border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      Rotate
                    </button>
                  ) : null}
                  {(savedAvatarUrl || stagedFile) && (
                    <button
                      type="button"
                      onClick={handleUseDefaultPortrait}
                      className="flex-1 px-2 py-1 text-[11px] font-semibold border border-slate-300 rounded text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Default
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Zone or URL Input */}
              <div className="flex-1 w-full space-y-3">
                {avatarSourceTab === 'device' ? (
                  <>
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
                      className={`border-2 border-dashed rounded-md p-5 text-center transition-colors ${
                        isDragging
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                      }`}
                    >
                      <UploadCloud className="w-7 h-7 text-orange-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-[#0B1B2B]">
                        Drop a new portrait photo here, or choose from your device
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        JPG, PNG, WebP, or AVIF up to 10 MB · Auto-compressed for fast loading
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1B2B] text-white text-xs font-semibold rounded-md hover:bg-slate-800 cursor-pointer">
                          <Camera className="w-3.5 h-3.5" />
                          Choose Photo
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
                        <p className="mt-2.5 text-xs font-medium text-emerald-700">
                          Ready to upload: {stagedFile.name} ({formatBytes(stagedFile.size)})
                        </p>
                      )}
                    </div>

                    {mode === 'firebase' && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Image Storage:</span>
                        <button
                          type="button"
                          onClick={() => setUploadDestination('cloud-webp')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border cursor-pointer ${
                            uploadDestination === 'cloud-webp'
                              ? 'border-orange-600 bg-orange-50 text-orange-800 font-semibold'
                              : 'border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          Cloud WebP (Instant)
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadDestination('server')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border cursor-pointer ${
                            uploadDestination === 'server'
                              ? 'border-orange-600 bg-orange-50 text-orange-800 font-semibold'
                              : 'border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          <Server className="w-3 h-3" />
                          App Server
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadDestination('firebase')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border cursor-pointer ${
                            uploadDestination === 'firebase'
                              ? 'border-orange-600 bg-orange-50 text-orange-800 font-semibold'
                              : 'border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          Firebase Storage
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-md">
                    <label className="block text-xs font-semibold text-slate-700">
                      Direct Image URL (HTTPS or / path)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={externalUrlInput}
                        onChange={(e) => setExternalUrlInput(e.target.value)}
                        placeholder="https://example.com/engineer-portrait.webp"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:outline-none focus:border-orange-600"
                      />
                      <button
                        type="button"
                        onClick={handleApplyExternalUrl}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1B2B] text-white text-xs font-semibold rounded-md hover:bg-slate-800 shrink-0 cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Use URL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Text Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Engineer / Lead Name</label>
                <span className="text-[11px] font-mono text-slate-400">
                  {displayName.length}/{SCHEMA_LIMITS.profile.displayNameMax}
                </span>
              </div>
              <input
                type="text"
                required
                minLength={SCHEMA_LIMITS.profile.displayNameMin}
                maxLength={SCHEMA_LIMITS.profile.displayNameMax}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Professional Title / Role
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {title.length}/{SCHEMA_LIMITS.profile.titleMax}
                </span>
              </div>
              <input
                type="text"
                required
                minLength={SCHEMA_LIMITS.profile.titleMin}
                maxLength={SCHEMA_LIMITS.profile.titleMax}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">About Section Headline</label>
              <span className="text-[11px] font-mono text-slate-400">
                {headline.length}/{SCHEMA_LIMITS.profile.headlineMax}
              </span>
            </div>
            <input
              type="text"
              required
              minLength={SCHEMA_LIMITS.profile.headlineMin}
              maxLength={SCHEMA_LIMITS.profile.headlineMax}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Profile Description / Practice Biography
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {description.length}/{SCHEMA_LIMITS.profile.descriptionMax}
              </span>
            </div>
            <textarea
              required
              rows={7}
              minLength={SCHEMA_LIMITS.profile.descriptionMin}
              maxLength={SCHEMA_LIMITS.profile.descriptionMax}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write your engineering background and practice overview. Leave a blank line between paragraphs."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 leading-relaxed focus:outline-none focus:border-orange-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Tip: Press Enter twice (blank line) to separate paragraphs on the live About section.
            </p>
          </div>

          {saving && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Uploading portrait photo...</span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-orange-600 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Changes publish immediately to the About section</span>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>

        {/* Right: Live About Section Preview */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Live Website Preview
            </span>
            <span className="text-[11px] font-medium text-orange-600">About Section</span>
          </div>

          <div className="relative h-64 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
            <img
              src={previewAvatarSrc}
              alt={displayName || 'Engineer portrait'}
              style={
                stagedPreviewUrl && stagedRotateTurns > 0
                  ? { transform: `rotate(${stagedRotateTurns * 90}deg)` }
                  : undefined
              }
              className="w-full h-full object-cover object-top"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0B1B2B]/90 via-[#0B1B2B]/40 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="font-display text-base font-semibold truncate">
                {displayName || DEFAULT_SITE_PROFILE.displayName}
              </p>
              <p className="text-xs text-slate-200 truncate">
                {title || DEFAULT_SITE_PROFILE.title}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-orange-600 tracking-wide">About Our Practice</p>
            <h3 className="font-display text-lg font-bold text-[#0B1B2B] leading-snug">
              {headline || DEFAULT_SITE_PROFILE.headline}
            </h3>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-h-60 overflow-y-auto pr-1">
              {previewParagraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
