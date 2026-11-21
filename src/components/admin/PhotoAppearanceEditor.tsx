import React from 'react';
import { Eye, Images, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { DEFAULT_PHOTO_APPEARANCE, type PhotoAppearance } from '../../types';
import {
  ASPECT_RATIO_OPTIONS,
  FOCAL_POINT_OPTIONS,
  FRAME_STYLE_OPTIONS,
  getAspectClass,
  getCardFrameClasses,
  getImageFilterCss,
  getObjectPositionClass,
  TONE_PRESET_OPTIONS,
} from '../../utils/photoAppearance';

interface PhotoAppearanceEditorProps {
  value: PhotoAppearance;
  onChange: (next: PhotoAppearance) => void;
  previewUrl?: string;
  previewTitle?: string;
  previewCategory?: string;
  photoCount?: number;
  compact?: boolean;
}

export const PhotoAppearanceEditor: React.FC<PhotoAppearanceEditorProps> = ({
  value,
  onChange,
  previewUrl,
  previewTitle = 'Project Gallery Preview',
  previewCategory = 'Gate Installation',
  photoCount = 1,
  compact = false,
}) => {
  const aspectClass = getAspectClass(value.aspectRatio);
  const posClass = getObjectPositionClass(value.focalPoint);
  const frameClasses = getCardFrameClasses(value.frameStyle);
  const filterCss = getImageFilterCss(value);
  const isBlueprint = value.frameStyle === 'blueprint';

  const update = (patch: Partial<PhotoAppearance>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="text-sm font-semibold text-[#0B1B2B]">
            Photo Appearance &amp; Gallery Framing
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_PHOTO_APPEARANCE })}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-orange-600 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Default
        </button>
      </div>

      <div className={`p-5 grid grid-cols-1 ${compact ? 'lg:grid-cols-12' : 'xl:grid-cols-12'} gap-6 items-start`}>
        {/* Controls Column */}
        <div className={`${compact ? 'lg:col-span-7' : 'xl:col-span-7'} space-y-5`}>
          {/* Aspect Ratio */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">Card Aspect Ratio</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ASPECT_RATIO_OPTIONS.map((opt) => {
                const active = value.aspectRatio === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ aspectRatio: opt.value })}
                    className={`px-3 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#0B1B2B] border-[#0B1B2B] text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fit & Focal Point */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Photo Fit Mode</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update({ objectFit: 'cover' })}
                  className={`px-3 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                    value.objectFit === 'cover'
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Fill Frame
                </button>
                <button
                  type="button"
                  onClick={() => update({ objectFit: 'contain' })}
                  className={`px-3 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                    value.objectFit === 'contain'
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Show Full Photo
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="appearance-focal"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                Crop Focal Alignment
              </label>
              <select
                id="appearance-focal"
                value={value.focalPoint}
                onChange={(e) =>
                  update({ focalPoint: e.target.value as PhotoAppearance['focalPoint'] })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-[#0B1B2B] focus:outline-none focus:border-orange-600"
              >
                {FOCAL_POINT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Focus: {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Frame Style & Tone Preset */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="appearance-frame"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                Card Frame Presentation
              </label>
              <select
                id="appearance-frame"
                value={value.frameStyle}
                onChange={(e) =>
                  update({ frameStyle: e.target.value as PhotoAppearance['frameStyle'] })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-[#0B1B2B] focus:outline-none focus:border-orange-600"
              >
                {FRAME_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="appearance-tone"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                Color &amp; Tone Preset
              </label>
              <select
                id="appearance-tone"
                value={value.tone}
                onChange={(e) => update({ tone: e.target.value as PhotoAppearance['tone'] })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-[#0B1B2B] focus:outline-none focus:border-orange-600"
              >
                {TONE_PRESET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fine Sliders: Brightness, Contrast, Saturation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Brightness</span>
                <span className="font-mono tabular-nums text-slate-500">{value.brightness}%</span>
              </div>
              <input
                type="range"
                min={80}
                max={130}
                value={value.brightness}
                onChange={(e) => update({ brightness: Number(e.target.value) })}
                className="w-full accent-orange-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Contrast</span>
                <span className="font-mono tabular-nums text-slate-500">{value.contrast}%</span>
              </div>
              <input
                type="range"
                min={85}
                max={130}
                value={value.contrast}
                onChange={(e) => update({ contrast: Number(e.target.value) })}
                className="w-full accent-orange-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Saturation</span>
                <span className="font-mono tabular-nums text-slate-500">{value.saturation}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={135}
                value={value.saturation}
                onChange={(e) => update({ saturation: Number(e.target.value) })}
                className="w-full accent-orange-600 cursor-pointer"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={value.showBadge}
              onChange={(e) => update({ showBadge: e.target.checked })}
              className="rounded border-slate-300 text-orange-600 focus:ring-orange-600"
            />
            <span>Show multi-photo count overlay badge on gallery card</span>
          </label>
        </div>

        {/* Live Public Card Preview Column */}
        <div className={`${compact ? 'lg:col-span-5' : 'xl:col-span-5'} space-y-2`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Eye className="w-3.5 h-3.5 text-orange-600" />
            <span>Live Public Gallery Preview</span>
          </div>

          <div className={`overflow-hidden ${frameClasses.card}`}>
            <div className={`relative w-full ${aspectClass} ${frameClasses.viewportBg} overflow-hidden`}>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  referrerPolicy="no-referrer"
                  style={filterCss ? { filter: filterCss } : undefined}
                  className={`w-full h-full ${
                    value.objectFit === 'contain' ? 'object-contain' : 'object-cover'
                  } ${posClass}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 p-4 text-center">
                  Add or select a cover photo to preview framing &amp; tone
                </div>
              )}

              {value.showBadge && photoCount > 1 && (
                <div className="absolute bottom-2.5 right-2.5 bg-[#0B1B2B]/85 text-white text-[11px] font-mono tabular-nums px-2 py-1 rounded flex items-center gap-1">
                  <Images className="w-3 h-3 text-orange-400" />
                  <span>{photoCount} Photos</span>
                </div>
              )}
            </div>

            <div className="p-4">
              <p className="text-[11px] font-semibold text-orange-500 mb-1">{previewCategory}</p>
              <p
                className={`font-display text-sm font-bold truncate ${
                  isBlueprint ? 'text-white' : 'text-[#0B1B2B]'
                }`}
              >
                {previewTitle || 'Custom Engineering Project'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
