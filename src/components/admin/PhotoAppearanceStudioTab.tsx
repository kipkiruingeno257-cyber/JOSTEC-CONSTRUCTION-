import React, { useEffect, useMemo, useState } from 'react';
import { Check, Layers, Save, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { AdminSessionMode } from '../../context/FirebaseContext';
import { updateProjectPhotoAppearance } from '../../services/firestoreService';
import { updateLocalProject } from '../../services/localMediaService';
import { DEFAULT_PHOTO_APPEARANCE, type PhotoAppearance, type ProjectRecord } from '../../types';
import {
  loadDefaultPhotoAppearance,
  normalizePhotoAppearance,
  saveDefaultPhotoAppearance,
} from '../../utils/photoAppearance';
import { PhotoAppearanceEditor } from './PhotoAppearanceEditor';

type StudioScope = 'single' | 'all' | 'default';

interface PhotoAppearanceStudioTabProps {
  mode: AdminSessionMode;
  projects: ProjectRecord[];
  onNotify: (type: 'success' | 'error', text: string) => void;
  onLocalMutated?: () => Promise<void> | void;
}

const QUICK_PRESETS: { label: string; patch: Partial<PhotoAppearance> }[] = [
  {
    label: 'Standard Portfolio',
    patch: { ...DEFAULT_PHOTO_APPEARANCE },
  },
  {
    label: 'Widescreen Showcase',
    patch: {
      aspectRatio: '16/9',
      objectFit: 'cover',
      frameStyle: 'elevated',
      tone: 'crisp',
      brightness: 102,
      contrast: 105,
      saturation: 105,
    },
  },
  {
    label: 'Full Uncropped Gate',
    patch: {
      aspectRatio: '4/3',
      objectFit: 'contain',
      frameStyle: 'clean',
      tone: 'natural',
      brightness: 100,
      contrast: 100,
      saturation: 100,
    },
  },
  {
    label: 'Navy Blueprint Card',
    patch: {
      aspectRatio: '4/3',
      objectFit: 'cover',
      frameStyle: 'blueprint',
      tone: 'steel',
      brightness: 102,
      contrast: 108,
      saturation: 90,
    },
  },
  {
    label: 'High-Contrast Mono',
    patch: {
      aspectRatio: '4/3',
      objectFit: 'cover',
      frameStyle: 'clean',
      tone: 'mono',
      brightness: 102,
      contrast: 112,
      saturation: 0,
    },
  },
];

export const PhotoAppearanceStudioTab: React.FC<PhotoAppearanceStudioTabProps> = ({
  mode,
  projects,
  onNotify,
  onLocalMutated,
}) => {
  const [scope, setScope] = useState<StudioScope>(() =>
    projects.length > 0 ? 'single' : 'default'
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => projects[0]?.id ?? '');
  const [draft, setDraft] = useState<PhotoAppearance>(() =>
    projects[0]
      ? normalizePhotoAppearance(projects[0].photoAppearance)
      : loadDefaultPhotoAppearance()
  );
  const [alsoSaveAsDefault, setAlsoSaveAsDefault] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projects.length === 0) {
      if (scope !== 'default') {
        setScope('default');
        setDraft(loadDefaultPhotoAppearance());
      }
      setSelectedProjectId('');
      return;
    }

    if (!selectedProjectId || !projects.some((p) => p.id === selectedProjectId)) {
      const first = projects[0];
      setSelectedProjectId(first.id);
      if (scope === 'single') {
        setDraft(normalizePhotoAppearance(first.photoAppearance));
      }
    }
  }, [projects, selectedProjectId, scope]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId]
  );

  const handleScopeChange = (nextScope: StudioScope) => {
    setScope(nextScope);
    if (nextScope === 'single' && selectedProject) {
      setDraft(normalizePhotoAppearance(selectedProject.photoAppearance));
    } else if (nextScope === 'default') {
      setDraft(loadDefaultPhotoAppearance());
    } else if (nextScope === 'all') {
      setDraft(
        selectedProject
          ? normalizePhotoAppearance(selectedProject.photoAppearance)
          : loadDefaultPhotoAppearance()
      );
    }
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    const target = projects.find((p) => p.id === projectId);
    if (target) {
      setDraft(normalizePhotoAppearance(target.photoAppearance));
    }
  };

  const previewImage = useMemo(() => {
    if (scope === 'single' && selectedProject?.imageUrls?.[0]) {
      return selectedProject.imageUrls[0];
    }
    const withPhoto = projects.find((p) => p.imageUrls && p.imageUrls.length > 0);
    return withPhoto?.imageUrls?.[0] ?? '';
  }, [scope, selectedProject, projects]);

  const previewTitle =
    scope === 'single' && selectedProject
      ? selectedProject.title
      : scope === 'all'
        ? 'All Gallery Project Cards'
        : 'Default Card Appearance Template';

  const previewCategory =
    scope === 'single' && selectedProject ? selectedProject.category : 'Structural & Gate Works';

  const previewCount =
    scope === 'single' && selectedProject ? Math.max(selectedProject.imageUrls?.length ?? 0, 1) : 3;

  const handleApply = async () => {
    const clean = normalizePhotoAppearance(draft);
    setSaving(true);
    try {
      if (scope === 'default') {
        saveDefaultPhotoAppearance(clean);
        onNotify(
          'success',
          'Saved default photo appearance template for all newly uploaded projects.'
        );
      } else if (scope === 'single') {
        if (!selectedProject) {
          onNotify('error', 'Select a project first.');
          return;
        }
        if (mode === 'local') {
          await updateLocalProject(selectedProject.id, { photoAppearance: clean });
          await onLocalMutated?.();
        } else {
          await updateProjectPhotoAppearance(selectedProject.id, clean);
        }
        if (alsoSaveAsDefault) {
          saveDefaultPhotoAppearance(clean);
        }
        onNotify(
          'success',
          `Updated photo appearance for "${selectedProject.title}" across the dashboard and public gallery.`
        );
      } else if (scope === 'all') {
        if (projects.length === 0) {
          saveDefaultPhotoAppearance(clean);
          onNotify('success', 'Saved default photo appearance for upcoming uploads.');
          return;
        }
        if (mode === 'local') {
          await Promise.all(
            projects.map((p) => updateLocalProject(p.id, { photoAppearance: clean }))
          );
          await onLocalMutated?.();
        } else {
          await Promise.all(
            projects.map((p) => updateProjectPhotoAppearance(p.id, clean))
          );
        }
        if (alsoSaveAsDefault) {
          saveDefaultPhotoAppearance(clean);
        }
        onNotify(
          'success',
          `Applied photo appearance settings across all ${projects.length} project(s).`
        );
      }
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to save photo appearance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h1 className="font-display text-xl font-bold text-[#0B1B2B] flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-orange-600" />
              Photo Appearance Studio
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Control photo aspect ratio, full-photo vs. fill framing, focal alignment, card
              finish, and color grading for both individual projects and the entire gallery.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleApply}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 transition-colors shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving
              ? 'Saving...'
              : scope === 'all'
                ? `Apply to All (${projects.length})`
                : scope === 'default'
                  ? 'Save Default Style'
                  : 'Save Project Photo Look'}
          </button>
        </div>

        {/* Scope Selector & Project Picker */}
        <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold text-slate-600 mb-2">Edit Target</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={projects.length === 0}
                onClick={() => handleScopeChange('single')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  scope === 'single'
                    ? 'bg-[#0B1B2B] border-[#0B1B2B] text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Single Project
              </button>
              <button
                type="button"
                disabled={projects.length === 0}
                onClick={() => handleScopeChange('all')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  scope === 'all'
                    ? 'bg-[#0B1B2B] border-[#0B1B2B] text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Apply to All Projects ({projects.length})
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('default')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  scope === 'default'
                    ? 'bg-[#0B1B2B] border-[#0B1B2B] text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Default for New Uploads
              </button>
            </div>
          </div>

          {scope === 'single' && projects.length > 0 && (
            <div className="lg:col-span-5">
              <label
                htmlFor="studio-project-select"
                className="block text-xs font-semibold text-slate-600 mb-2"
              >
                Select Project to Restyle
              </label>
              <select
                id="studio-project-select"
                value={selectedProject?.id ?? ''}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm font-medium text-[#0B1B2B] focus:outline-none focus:border-orange-600"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.category})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* One-Click Presets */}
        <div className="pt-5 mt-5 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-600 mb-2.5">One-Click Style Presets</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setDraft((prev) => normalizePhotoAppearance({ ...prev, ...preset.patch }))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-800 transition-colors cursor-pointer"
              >
                <Check className="w-3 h-3 text-orange-600" />
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Editor + Live Preview */}
      <PhotoAppearanceEditor
        value={draft}
        onChange={setDraft}
        previewUrl={previewImage}
        previewTitle={previewTitle}
        previewCategory={previewCategory}
        photoCount={previewCount}
      />

      {scope !== 'default' && (
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alsoSaveAsDefault}
              onChange={(e) => setAlsoSaveAsDefault(e.target.checked)}
              className="rounded border-slate-300 text-orange-600 focus:ring-orange-600"
            />
            <span>Also save these settings as the default look for future project uploads</span>
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={handleApply}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#0B1B2B] text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 text-orange-400" />
            {saving ? 'Saving Changes...' : 'Save & Update Live Gallery'}
          </button>
        </div>
      )}
    </div>
  );
};
