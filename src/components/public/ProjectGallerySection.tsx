import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Images,
  MapPin,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { subscribePublishedProjects } from '../../services/firestoreService';
import { fetchLocalPublicPortfolio } from '../../services/localMediaService';
import { PROJECT_CATEGORIES, type ProjectRecord } from '../../types';

export const ProjectGallerySection: React.FC = () => {
  const [firebaseProjects, setFirebaseProjects] = useState<ProjectRecord[]>([]);
  const [localProjects, setLocalProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    fetchLocalPublicPortfolio().then((res) => {
      setLocalProjects(res.projects);
    });

    const unsubscribe = subscribePublishedProjects(
      (items) => {
        setFirebaseProjects(items);
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        setLoadError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const projects = useMemo(() => {
    const map: Record<string, ProjectRecord> = {};
    for (const p of localProjects) map[p.id] = p;
    for (const p of firebaseProjects) map[p.id] = p;
    const getTime = (p: ProjectRecord) =>
      p.createdAtMs ?? (p.createdAt && typeof p.createdAt.toMillis === 'function' ? p.createdAt.toMillis() : 0);
    return Object.values(map).sort((a, b) => getTime(b) - getTime(a));
  }, [firebaseProjects, localProjects]);

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'All') return projects;
    return projects.filter((p) => p.category === selectedCategory);
  }, [projects, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: projects.length };
    for (const cat of PROJECT_CATEGORIES) {
      counts[cat] = projects.filter((p) => p.category === cat).length;
    }
    return counts;
  }, [projects]);

  const openPreview = (project: ProjectRecord, photoIdx = 0) => {
    setActiveProject(project);
    setActivePhotoIndex(photoIdx);
  };

  const closePreview = () => {
    setActiveProject(null);
    setActivePhotoIndex(0);
  };

  const markImageFailed = (key: string) => {
    setFailedImages((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <section id="projects" className="py-20 lg:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-orange-600 tracking-wide mb-3">
              Completed Field Portfolio
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B2B] mb-3"
              style={{ textWrap: 'balance' }}
            >
              Project Gallery
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Live portfolio of structural installations, fabricated gates, welding contracts, and
              perimeter enclosures published directly from the site workshop.
            </p>
          </div>
          <div className="text-sm text-slate-500 font-mono tabular-nums shrink-0">
            {loading ? 'Loading projects...' : `${filteredProjects.length} Project${filteredProjects.length === 1 ? '' : 's'} Shown`}
          </div>
        </div>

        {/* Interactive Category Filter Bar */}
        <div
          role="tablist"
          aria-label="Filter projects by category"
          className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-10 border-b border-slate-200"
        >
          {(['All', ...PROJECT_CATEGORIES] as const).map((category) => {
            const active = selectedCategory === category;
            const count = categoryCounts[category] ?? 0;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#0B1B2B] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {category}
                {count > 0 && (
                  <span
                    className={`ml-1.5 font-mono text-xs tabular-nums ${
                      active ? 'text-orange-400' : 'text-slate-500'
                    }`}
                  >
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 animate-pulse"
              >
                <div className="aspect-[4/3] bg-slate-200" />
                <div className="p-6 space-y-3">
                  <div className="h-3 w-1/3 bg-slate-200 rounded" />
                  <div className="h-5 w-3/4 bg-slate-200 rounded" />
                  <div className="h-4 w-full bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && loadError && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-6 text-sm text-red-800">
            Unable to load published projects: {loadError}
          </div>
        )}

        {/* Empty State */}
        {!loading && !loadError && filteredProjects.length === 0 && (
          <div className="border border-slate-200 bg-slate-50 rounded-lg p-12 text-center">
            <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold text-[#0B1B2B] mb-2">
              {projects.length === 0
                ? 'No Published Projects Yet'
                : `No Published Projects in "${selectedCategory}"`}
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              {projects.length === 0
                ? 'Projects uploaded and published by the business owner in the Administrator Dashboard appear here automatically in real time.'
                : 'Try selecting a different engineering discipline or view all published projects.'}
            </p>
            {projects.length === 0 ? (
              <Link
                to="/admin"
                className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors"
              >
                Open Owner Dashboard
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-[#0B1B2B] rounded-md hover:bg-slate-800 transition-colors"
              >
                Show All Categories
              </button>
            )}
          </div>
        )}

        {/* Dynamic Project Grid */}
        {!loading && !loadError && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => {
              const coverUrl = project.imageUrls?.[0] ?? '';
              const imgKey = `${project.id}_0`;
              const hasValidImage = Boolean(coverUrl) && !failedImages[imgKey];

              return (
                <article
                  key={project.id}
                  className="group border border-slate-200 rounded-lg overflow-hidden bg-white flex flex-col hover:border-slate-300 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => openPreview(project, 0)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-600"
                  >
                    {hasValidImage ? (
                      <img
                        src={coverUrl}
                        alt={project.title}
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed(imgKey)}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-[#0B1B2B] flex flex-col items-center justify-center p-6 text-center text-slate-300">
                        <Building2 className="w-8 h-8 text-orange-400 mb-2" />
                        <span className="text-xs font-medium">{project.title}</span>
                      </div>
                    )}
                    {project.imageUrls && project.imageUrls.length > 1 && (
                      <div className="absolute bottom-3 right-3 bg-[#0B1B2B]/85 text-white text-xs font-mono tabular-nums px-2.5 py-1 rounded flex items-center gap-1.5">
                        <Images className="w-3.5 h-3.5 text-orange-400" />
                        <span>{project.imageUrls.length} Photos</span>
                      </div>
                    )}
                  </button>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Zero-Pill Metadata */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                        <span className="font-semibold text-orange-600">{project.category}</span>
                        {project.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{project.location}</span>
                          </>
                        )}
                        {project.completionYear && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{project.completionYear}</span>
                          </>
                        )}
                      </div>

                      <h3 className="font-display text-lg font-bold text-[#0B1B2B] mb-2">
                        <button
                          type="button"
                          onClick={() => openPreview(project, 0)}
                          className="text-left hover:text-orange-600 transition-colors cursor-pointer"
                        >
                          {project.title}
                        </button>
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                        {project.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => openPreview(project, 0)}
                        className="text-sm font-semibold text-[#0B1B2B] hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        Inspect Project Photos
                      </button>
                      <span className="text-xs font-mono text-slate-400 tabular-nums">
                        {project.imageUrls?.length ?? 0} file{project.imageUrls?.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Preview Modal */}
      {activeProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeProject.title}
          className="fixed inset-0 z-50 bg-[#0B1B2B]/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                  <span className="font-semibold text-orange-600">{activeProject.category}</span>
                  {activeProject.location && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {activeProject.location}
                      </span>
                    </>
                  )}
                  {activeProject.completionYear && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{activeProject.completionYear}</span>
                    </>
                  )}
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#0B1B2B] truncate">
                  {activeProject.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closePreview}
                aria-label="Close project preview"
                className="w-10 h-10 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Image Viewport */}
            <div className="relative bg-slate-900 aspect-[16/10] flex items-center justify-center">
              {activeProject.imageUrls && activeProject.imageUrls.length > 0 ? (
                <>
                  <img
                    src={activeProject.imageUrls[activePhotoIndex]}
                    alt={`${activeProject.title} photograph ${activePhotoIndex + 1}`}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                  {activeProject.imageUrls.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous photo"
                        onClick={() =>
                          setActivePhotoIndex((prev) =>
                            prev === 0 ? activeProject.imageUrls.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-md bg-[#0B1B2B]/80 text-white flex items-center justify-center hover:bg-orange-600 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next photo"
                        onClick={() =>
                          setActivePhotoIndex((prev) =>
                            prev === activeProject.imageUrls.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-md bg-[#0B1B2B]/80 text-white flex items-center justify-center hover:bg-orange-600 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-slate-400 text-sm">No photographs attached to this project.</div>
              )}
            </div>

            {/* Thumbnails */}
            {activeProject.imageUrls && activeProject.imageUrls.length > 1 && (
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
                {activeProject.imageUrls.map((url, idx) => (
                  <button
                    key={url + idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`w-16 h-12 rounded overflow-hidden border-2 shrink-0 cursor-pointer ${
                      idx === activePhotoIndex ? 'border-orange-600' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="p-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Engineering Scope &amp; Details
              </h4>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {activeProject.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
