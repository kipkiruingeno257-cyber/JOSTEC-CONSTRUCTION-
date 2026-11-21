/**
 * Security Rule Verification Matrix for Jenkins Structural & Metalworks
 * Validates the Dirty Dozen adversarial cases documented in security_spec.md.
 * Run against Firebase Emulator Suite when testing locally:
 *   firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
 */

export interface DirtyDozenCase {
  id: number;
  collection: 'projects' | 'testimonials' | 'inquiries' | 'admins';
  operation: 'create' | 'get' | 'list' | 'update' | 'delete';
  description: string;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    collection: 'projects',
    operation: 'create',
    description: 'Unauthenticated user attempts to create a published project',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    collection: 'projects',
    operation: 'create',
    description: 'Signed-in non-admin user attempts to create a project',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    collection: 'projects',
    operation: 'create',
    description: 'Admin email with email_verified == false attempts write',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    collection: 'projects',
    operation: 'create',
    description: 'Shadow field injection (isFeatured: true) alongside valid fields',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    collection: 'projects',
    operation: 'create',
    description: 'Author UID spoofing (authorId != request.auth.uid)',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    collection: 'projects',
    operation: 'create',
    description: 'Forged client timestamp instead of server request.time',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    collection: 'projects',
    operation: 'get',
    description: 'ID poisoning with invalid characters or length > 128',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    collection: 'projects',
    operation: 'list',
    description: 'Unauthenticated list query without status == published filter',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    collection: 'projects',
    operation: 'update',
    description: 'Attempting to mutate immutable createdAt or authorId on update',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    collection: 'inquiries',
    operation: 'list',
    description: 'Non-admin attempts to read or list customer PII inquiries',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    collection: 'inquiries',
    operation: 'create',
    description: 'Public visitor attempts to submit inquiry with status != new',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    collection: 'admins',
    operation: 'create',
    description: 'Non-admin attempts self-promotion by writing /admins/{uid}',
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
