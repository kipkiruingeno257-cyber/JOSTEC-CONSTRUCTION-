import React, { useState } from 'react';
import { CheckCircle2, Edit3, EyeOff, Globe, Plus, Star, Trash2, X } from 'lucide-react';
import type { AdminSessionMode } from '../../context/FirebaseContext';
import {
  createTestimonial,
  deleteTestimonial,
  toggleTestimonialStatus,
  updateTestimonial,
} from '../../services/firestoreService';
import {
  createLocalTestimonial,
  deleteLocalTestimonial,
  updateLocalTestimonial,
} from '../../services/localMediaService';
import { PROJECT_CATEGORIES, SCHEMA_LIMITS, type TestimonialRecord } from '../../types';

interface TestimonialsManagerProps {
  mode: AdminSessionMode;
  testimonials: TestimonialRecord[];
  onNotify: (type: 'success' | 'error', text: string) => void;
  onLocalMutated?: () => Promise<void> | void;
}

export const TestimonialsManager: React.FC<TestimonialsManagerProps> = ({
  mode,
  testimonials,
  onNotify,
  onLocalMutated,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientRole, setClientRole] = useState('');
  const [projectType, setProjectType] = useState<string>(PROJECT_CATEGORIES[3]);
  const [quote, setQuote] = useState('');
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<'published' | 'hidden'>('published');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setClientName('');
    setClientRole('');
    setProjectType(PROJECT_CATEGORIES[3]);
    setQuote('');
    setRating(5);
    setStatus('published');
  };

  const startEdit = (item: TestimonialRecord) => {
    setEditingId(item.id);
    setClientName(item.clientName);
    setClientRole(item.clientRole);
    setProjectType(item.projectType);
    setQuote(item.quote);
    setRating(item.rating);
    setStatus(item.status);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { clientName, clientRole, projectType, quote, rating, status };
    try {
      if (mode === 'local') {
        if (editingId) {
          await updateLocalTestimonial(editingId, payload);
        } else {
          await createLocalTestimonial(payload);
        }
        await onLocalMutated?.();
      } else {
        if (editingId) {
          await updateTestimonial(editingId, payload);
        } else {
          await createTestimonial(payload);
        }
      }
      onNotify(
        'success',
        editingId
          ? `Testimonial from ${clientName} updated.`
          : `Testimonial from ${clientName} added.`
      );
      resetForm();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to save testimonial.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: TestimonialRecord) => {
    const next = item.status === 'published' ? 'hidden' : 'published';
    try {
      if (mode === 'local') {
        await updateLocalTestimonial(item.id, { status: next });
        await onLocalMutated?.();
      } else {
        await toggleTestimonialStatus(item.id, next);
      }
      onNotify(
        'success',
        next === 'published'
          ? `Review from ${item.clientName} is now visible on the website.`
          : `Review from ${item.clientName} is now hidden.`
      );
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to update review status.');
    }
  };

  const handleDelete = async (item: TestimonialRecord) => {
    try {
      if (mode === 'local') {
        await deleteLocalTestimonial(item.id);
        await onLocalMutated?.();
      } else {
        await deleteTestimonial(item.id);
      }
      onNotify('success', `Review from ${item.clientName} deleted.`);
      if (editingId === item.id) resetForm();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to delete review.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Add / Edit Testimonial Form */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="font-display text-lg font-bold text-[#0B1B2B]">
            {editingId ? 'Edit Customer Review' : 'Add Customer Review'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Client Full Name</label>
          <input
            type="text"
            required
            maxLength={SCHEMA_LIMITS.testimonial.clientNameMax}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Samuel K. Alvarez"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-orange-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Role / Organization
          </label>
          <input
            type="text"
            required
            maxLength={SCHEMA_LIMITS.testimonial.clientRoleMax}
            value={clientRole}
            onChange={(e) => setClientRole(e.target.value)}
            placeholder="e.g. Operations Manager, Horizon Cold Storage"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-orange-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Work Delivered</label>
            <input
              type="text"
              required
              maxLength={SCHEMA_LIMITS.testimonial.projectTypeMax}
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-orange-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1–5)</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono tabular-nums focus:outline-none focus:border-orange-600"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} Star{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Review Quote</label>
          <textarea
            required
            rows={4}
            maxLength={SCHEMA_LIMITS.testimonial.quoteMax}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="Client's statement on workmanship, schedule, and final performance..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-orange-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'published' | 'hidden')}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-orange-600"
          >
            <option value="published">Published on Website</option>
            <option value="hidden">Hidden (Internal Only)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 disabled:opacity-60 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {saving ? 'Saving...' : editingId ? 'Update Review' : 'Save Customer Review'}
        </button>
      </form>

      {/* Testimonials List */}
      <div className="lg:col-span-7 space-y-4">
        {testimonials.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-600">
            No customer reviews created yet. Add your first verified client review on the left.
          </div>
        ) : (
          testimonials.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-1 text-orange-500">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-orange-500" />
                    ))}
                    <span className="ml-2 text-xs text-slate-500">{item.projectType}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      item.status === 'published' ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {item.status === 'published' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        Hidden
                      </>
                    )}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">&ldquo;{item.quote}&rdquo;</p>
                <p className="font-display text-sm font-bold text-[#0B1B2B]">{item.clientName}</p>
                <p className="text-xs text-slate-500">{item.clientRole}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {item.status === 'published' ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      Publish
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-md text-[#0B1B2B] hover:bg-slate-50 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-red-200 bg-red-50 text-red-700 rounded-md hover:bg-red-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
