# Firestore Security Specification — Jenkins Structural & Metalworks

## 1. Data Invariants

1. **Public vs Draft Isolation (`projects` & `testimonials`)**: Unauthenticated visitors and non-admin users may read/list ONLY documents whose `status == 'published'`. Draft projects and hidden testimonials are accessible exclusively to verified administrators.
2. **PII Isolation (`inquiries`)**: Customer contact submissions contain PII (`email`, `phone`). Public visitors may create new inquiries (`status == 'new'`) with strict schema and field-length bounds, but CANNOT read, list, update, or delete any inquiry document. Only verified administrators can read, update workflow status, or delete inquiries.
3. **Zero Self-Assigned Privileges (`admins`)**: Users cannot read, create, or modify `/admins/{adminUid}` unless they are already verified administrators (`isAdmin()`). Bootstrapped admin identity is gated strictly on `request.auth.token.email_verified == true && request.auth.token.email == "kipkiruingeno257@gmail.com"`.
4. **Immutable Ownership & Temporal Integrity**: `authorId` must match `request.auth.uid` on creation and cannot be changed on update. `createdAt` must equal `request.time` on creation and remain immutable on update. `updatedAt` must equal `request.time` on both creation and update.
5. **Bounded Arrays & Strings**: Every string field enforces an explicit `.size()` upper and lower bound. `imageUrls` and `storagePaths` arrays are capped at `12` elements with type validation.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Target Collection | Attack Vector | Malicious Payload / Operation | Expected Result |
| :- | :--- | :--- | :--- | :--- |
| 1 | `projects` | Unauthenticated Create | `{ title: "Hack", status: "published", ... }` with `auth == null` | `PERMISSION_DENIED` |
| 2 | `projects` | Non-Admin Create | Signed in as `visitor@example.com` creating a project | `PERMISSION_DENIED` |
| 3 | `projects` | Unverified Admin Email Spoof | `email: "kipkiruingeno257@gmail.com"`, `email_verified: false` | `PERMISSION_DENIED` |
| 4 | `projects` | Shadow / Ghost Field Injection | Valid admin creates project with extra field `isFeatured: true` | `PERMISSION_DENIED` |
| 5 | `projects` | Author UID Spoofing | Admin sends `authorId: "someone-else"` on create | `PERMISSION_DENIED` |
| 6 | `projects` | Client Timestamp Forgery | Admin sends `createdAt: Timestamp(2020-01-01)` instead of `serverTimestamp()` | `PERMISSION_DENIED` |
| 7 | `projects` | ID Poisoning | Document ID `../evil$id` or 200-char ID on `projects/{projectId}` | `PERMISSION_DENIED` |
| 8 | `projects` | Public Draft Scraping | Public `list` query without `where('status', '==', 'published')` | `PERMISSION_DENIED` |
| 9 | `projects` | Immutable `createdAt` Mutation | Admin updates project attempting to alter `createdAt` or `authorId` | `PERMISSION_DENIED` |
| 10 | `inquiries` | Public PII Scraping | Unauthenticated or non-admin `get`/`list` on `/inquiries` | `PERMISSION_DENIED` |
| 11 | `inquiries` | Forged Inquiry Status | Public visitor submits inquiry with `status: "reviewed"` | `PERMISSION_DENIED` |
| 12 | `admins` | Self-Promotion Escalation | Non-admin writes `/admins/{ownUid}` with `{ role: "admin" }` | `PERMISSION_DENIED` |
