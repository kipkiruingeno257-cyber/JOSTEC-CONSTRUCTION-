# Firebase & Deployment Guide — Jenkins Structural & Metalworks

## 1. Firebase Services Used
- **Firebase Authentication**: Google Sign-In (`signInWithPopup`) protecting `/admin`.
- **Cloud Firestore**: Stores `projects`, `testimonials`, `inquiries`, and `admins` documents.
- **Firebase Storage**: Stores project photography at `projects/{projectId}/{fileName}`.
- **Firebase Hosting**: Serves the production Vite SPA build (`dist/`) with SPA fallback rewrites.

## 2. Firestore Database Structure

### `projects/{projectId}`
```json
{
  "title": "Modern Sliding Gate Installation",
  "description": "Custom fabricated and installed sliding gate.",
  "category": "Gate Installation",
  "location": "North Industrial Park",
  "completionYear": "2026",
  "imageUrls": ["https://firebasestorage.googleapis.com/..."],
  "storagePaths": ["projects/proj_123/photo.jpg"],
  "status": "published",
  "authorId": "adminUid",
  "createdAt": "serverTimestamp()",
  "updatedAt": "serverTimestamp()"
}
```

### `testimonials/{testimonialId}`
```json
{
  "clientName": "Samuel K. Alvarez",
  "clientRole": "Operations Manager, Horizon Cold Storage",
  "projectType": "Sliding Gates",
  "quote": "Delivered on schedule with clean structural welds.",
  "rating": 5,
  "status": "published",
  "authorId": "adminUid",
  "createdAt": "serverTimestamp()",
  "updatedAt": "serverTimestamp()"
}
```

### `inquiries/{inquiryId}`
```json
{
  "name": "Alex Morgan",
  "phone": "+1 555 019 2834",
  "email": "alex@company.com",
  "serviceType": "Gate Installation",
  "message": "Need a 24ft cantilever sliding gate quote.",
  "status": "new",
  "createdAt": "serverTimestamp()",
  "updatedAt": "serverTimestamp()"
}
```

### `admins/{adminUid}`
```json
{
  "email": "owner@example.com",
  "displayName": "Mark Jenkins",
  "role": "admin",
  "createdAt": "serverTimestamp()"
}
```

## 3. Administrator Account Setup
1. Sign in at `/admin` using the primary owner Google account (`kipkiruingeno257@gmail.com`).
2. To grant admin access to an additional verified Google user:
   - Have them sign in once to obtain their Firebase Authentication `UID`.
   - Create a document at `admins/{uid}` in Cloud Firestore with `{ email, displayName, role: "admin", createdAt }`.
   - Add their verified email or `admins` lookup in `storage.rules` if they also upload images.

## 4. Local Development
```bash
npm install
npm run dev
```
Set `VITE_GOOGLE_MAPS_API_KEY` in `.env` for local interactive Google Maps rendering (see `.env.example`).

## 5. Security Rules & Firebase Hosting Deployment
```bash
npm install -g firebase-tools
firebase login
firebase use tuned-terminal-h41j7
firebase deploy --only firestore:rules,storage
npm run build
firebase deploy --only hosting
```
