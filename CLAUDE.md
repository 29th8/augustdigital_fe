# August Digital — Frontend Rules (Next.js)

## 🎨 Branding & Style
- **Brand Name:** August Digital
- **Design Concept:** Minimalist, Futuristic, Tech-focused (Water element accents).
- **UI Framework:** Tailwind CSS + Shadcn/UI.
- **Iconography:** Lucide React or Heroicons.
- **Typography:** Prioritize clean, modern Sans-serif fonts.

## 🛠 Tech Stack
- **Framework:** Next.js 14+ (App Router).
- **Language:** TypeScript (Strict mode).
- **Data Fetching:** SWR or TanStack Query (React Query) to manage caching and notification polling.
- **State Management:** Zustand (for global states like Cart and User session).

## 📡 API Guidelines
- **Base URL:** Retrieve from `process.env.NEXT_PUBLIC_API_URL`.
- **Naming Convention:** - Backend JSON responses use `snake_case`. 
  - Frontend should map these to `camelCase` in TypeScript interfaces (or strictly maintain `snake_case` if prioritizing rapid 1:1 mapping).
- **Authentication:** Attach JWT in the headers as `Authorization: Bearer <token>`.
- **Error Handling:** Expect the standard `ApiResponse<T>` structure from the backend. Extract the `message` field to display global UI Toasts for errors.

## 🏗 Coding Standards
- **Components:** Default to Functional Components. Maximize the use of Server Components for performance/SEO, and explicitly use `'use client'` only for components requiring hooks or DOM interactivity.
- **File Naming Convention:** - Directories: `kebab-case` (e.g., `user-profile`).
  - Component files: `PascalCase.tsx` (e.g., `WarrantyCard.tsx`).
  - Services/Hooks/Utils: `camelCase.ts` (e.g., `useAuth.ts`, `orderService.ts`).
- **Props:** Strictly define and export TypeScript Interfaces/Types for all component Props.

## 🔄 Workflow Rules
- **Security:** Always implement Role-Based Access Control (RBAC) checks for any `/admin` routes.
- **Notifications (In-App):** Implement client-side polling (e.g., every 30 seconds) or a badge refresh mechanism upon route changes to keep the notification bell updated.
- **Warranty Module:** Clearly visualize statuses using distinct UI badges (e.g., OPEN, RESOLVED, PENDING_STOCK).

## 🎨 COLOR SYSTEM (STRICT — MUST FOLLOW)

Primary color:
- Blue (Ocean style): #0ea5e9 (sky-500) or #0284c7 (sky-600)

Background:
- MUST be LIGHT
- Use:
  - bg-white (main)
  - bg-gray-50 (section)
  - bg-gray-100 (subtle areas)

Text:
- Primary: text-gray-900
- Secondary: text-gray-600

Buttons:
- Primary button:
  - bg-blue-600
  - hover:bg-blue-700
  - text-white

❌ FORBIDDEN:
- Dark backgrounds (bg-black, bg-gray-900, etc.)
- Neon colors
- Random gradients