function normalizeAdminPath(raw: string | undefined): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed === '/') return '/admin';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeading.replace(/\/+$/, '');
  return withoutTrailing || '/admin';
}

export const ADMIN_CONSOLE_PATH = normalizeAdminPath(
  import.meta.env.VITE_ADMIN_PATH as string | undefined
);
