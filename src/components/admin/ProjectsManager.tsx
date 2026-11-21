import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  EyeOff,
  FileEdit,
  Globe,
  Images,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminSessionMode } from '../../context/FirebaseContext';
import {
  deleteProjectWithMedia,
  toggleProjectStatus,
  updateProjectPhotoAppearance,
} from '../../services/firestoreService';
import { deleteLocalProject, updateLocalProject } from '../../services/localMediaService';
import { PROJECT_CATEGORIES, type PhotoAppearance, type ProjectRecord } from '../../types';
import {
  getAspectClass,
  getCardFrameClasses,
  getImageFilterCss,
  getObjectPositionClass,
  normalizePhotoAppearance,
} from '../../utils/photoAppearance';
import { FastImage } from '../FastImage';
import { PhotoAppearanceEditor } from './PhotoAppearanceEditor';

interface ProjectsManagerProps {
  mode: AdminSessionMode;
  projects: ProjectRecord[];
  onEditProject: (project: ProjectRecord) => void;
  onNotify: (type: 'success' | 'error', text: string) => void;
  onLocalMutated?: () => Promise<void> | void;
}

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({
  mode,
  projects,
  onEditProject,
  onNotify,
  onLocalMutated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<ProjectRecord | null>(null);

  const [appearanceTarget, setAppearanceTarget] = useState<ProjectRecord | null>(null);
  const [draftAppearance, setDraftAppearance] = useState<PhotoAppearance | null>(null);
  const [savingAppearance, setSavingAppearance] = useState(false);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.location ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [projects, statusFilter, categoryFilter, searchQuery]);

  const handleToggleStatus = async (project: ProjectRecord) => {
    const nextStatus = project.status === 'published' ? 'draft' : 'published';
    if (nextStatus === 'published' && (!project.imageUrls || project.imageUrls.length === 0)) {
      onNotify(
        'error',
        'Attach at least one photograph before publishing this project to the public gallery.'
      );
      return;
    }

    setBusyId(project.id);
    try {
      if (mode === 'local') {
        await updateLocalProject(project.id, { status: nextStatus });
        await onLocalMutated?.();
      } else {
        await toggleProjectStatus(project.id, nextStatus);
      }
      onNotify(
        'success',
        nextStatus === 'published'
          ? `"${project.title}" is now published in the public gallery.`
          : `"${project.title}" has been unpublished and moved to drafts.`
      );
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to update project status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteProject) return;
    setBusyId(confirmDeleteProject.id);
    try {
      if (mode === 'local') {
        await deleteLocalProject(confirmDeleteProject.id);
        await onLocalMutated?.();
      } else {
        await deleteProjectWithMedia(confirmDeleteProject);
      }
      onNotify('success', `"${confirmDeleteProject.title}" and its associated photos were deleted.`);
      setConfirmDeleteProject(null);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to delete project.');
    } finally {
      setBusyId(null);
    }
  };

  const openAppearanceModal = (project: ProjectRecord) => {
    setAppearanceTarget(project);
    setDraftAppearance(normalizePhotoAppearance(project.photoAppearance));
  };

  const handleSaveAppearance = async () => {
    if (!appearanceTarget || !draftAppearance) return;
    setSavingAppearance(true);
    try {
      if (mode === 'local') {
        await updateLocalProject(appearanceTarget.id, { photoAppearance: draftAppearance });
        await onLocalMutated?.();
      } else {
        await updateProjectPhotoAppearance(appearanceTarget.id, draftAppearance);
      }
      onNotify(
        'success',
        `Updated photo appearance for "${appearanceTarget.title}" across the dashboard and public gallery.`
      );
      setAppearanceTarget(null);
      setDraftAppearance(null);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to save photo appearance.');
    } finally {
      setSavingAppearance(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title or location..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-orange-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(['all', 'published', 'draft'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors capitalize cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-[#0B1B2B] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-orange-600"
          >
            <option value="All">All Categories</option>
            {PROJECT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <Images className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-[#0B1B2B] mb-1">
            {projects.length === 0 ? 'No Projects Uploaded Yet' : 'No Matching Projects'}
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {projects.length === 0
              ? 'Use the Upload Project tab to add your first construction or metal fabrication project.'
              : 'Try clearing your search or changing the status/category filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((project) => {
            const isBusy = busyId === project.id;
            const thumb = project.imageUrls?.[0];
            const app = normalizePhotoAppearance(project.photoAppearance);
            const aspectClass = getAspectClass(app.aspectRatio);
            const posClass = getObjectPositionClass(app.focalPoint);
            const frameClasses = getCardFrameClasses(app.frameStyle);
            const filterCss = getImageFilterCss(app);
            const isBlueprint = app.frameStyle === 'blueprint';

            return (
              <article
                key={project.id}
                className={`overflow-hidden flex flex-col justify-between ${frameClasses.card}`}
              >
                <div>
                  <div
                    className={`relative ${aspectClass} ${frameClasses.viewportBg} border-b ${
                      isBlueprint ? 'border-white/10' : 'border-slate-200'
                    } overflow-hidden`}
                  >
                    {thumb ? (
                      <FastImage
                        src={thumb}
                        alt={project.title}
                        darkBg={isBlueprint}
                        style={filterCss ? { filter: filterCss } : undefined}
                        className={`w-full h-full ${
                          app.objectFit === 'contain' ? 'object-contain' : 'object-cover'
                        } ${posClass}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        No photograph uploaded
                      </div>
                    )}
                    {app.showBadge && (
                      <div className="absolute top-3 right-3 bg-[#0B1B2B]/85 text-white text-xs font-mono tabular-nums px-2 py-1 rounded">
                        {project.imageUrls?.length ?? 0} photo
                        {project.imageUrls?.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 text-xs mb-2">
                      <span className="font-semibold text-orange-500 truncate">
                        {project.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold shrink-0 ${
                          project.status === 'published'
                            ? isBlueprint
                              ? 'text-emerald-400'
                              : 'text-emerald-700'
                            : isBlueprint
                              ? 'text-amber-300'
                              : 'text-amber-700'
                        }`}
                      >
                        {project.status === 'published' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Published
                          </>
                        ) : (
                          <>
                            <FileEdit className="w-3.5 h-3.5" />
                            Draft
                          </>
                        )}
                      </span>
                    </div>

                    <h3
                      className={`font-display text-base font-bold mb-1.5 ${
                        isBlueprint ? 'text-white' : 'text-[#0B1B2B]'
                      }`}
                    >
                      {project.title}
                    </h3>
                    <p
                      className={`text-xs line-clamp-2 leading-relaxed ${
                        isBlueprint ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {project.description}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-slate-800">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleToggleStatus(project)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      project.status === 'published'
                        ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {project.status === 'published' ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        Publish
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => openAppearanceModal(project)}
                      title="Modify Photo Appearance"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-orange-700 border border-orange-200 bg-orange-50 rounded-md hover:bg-orange-100 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Photo Look
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onEditProject(project)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0B1B2B] border border-slate-300 bg-white rounded-md hover:bg-slate-100 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setConfirmDeleteProject(project)}
                      aria-label={`Delete ${project.title}`}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-red-700 border border-red-200 bg-red-50 rounded-md hover:bg-red-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Photo Appearance Studio Modal */}
      {appearanceTarget && draftAppearance && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Modify photo appearance for ${appearanceTarget.title}`}
          className="fixed inset-0 z-50 bg-[#0B1B2B]/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-slate-50 border border-slate-200 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-[#0B1B2B] truncate">
                  Customize Photo Appearance · {appearanceTarget.title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Adjust framing, crop focal alignment, card finish, and color tone in real time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAppearanceTarget(null);
                  setDraftAppearance(null);
                }}
                aria-label="Close appearance editor"
                className="p-2 rounded-md text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PhotoAppearanceEditor
              compact
              value={draftAppearance}
              onChange={setDraftAppearance}
              previewUrl={appearanceTarget.imageUrls?.[0]}
              previewTitle={appearanceTarget.title}
              previewCategory={appearanceTarget.category}
              photoCount={appearanceTarget.imageUrls?.length ?? 0}
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={savingAppearance}
                onClick={() => {
                  setAppearanceTarget(null);
                  setDraftAppearance(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAppearance}
                onClick={handleSaveAppearance}
                className="px-5 py-2 text-sm font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-60 cursor-pointer"
              >
                {savingAppearance ? 'Saving...' : 'Save Photo Appearance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteProject && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0B1B2B]/75 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6">
            <h3 className="font-display text-lg font-bold text-[#0B1B2B] mb-2">
              Delete Project &amp; Photographs?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              This will permanently remove <strong>{confirmDeleteProject.title}</strong> and its{' '}
              {confirmDeleteProject.imageUrls?.length ?? 0} stored photograph(s).
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteProject(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirmDeleteProject.id}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60 cursor-pointer"
              >
                {busyId === confirmDeleteProject.id ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
