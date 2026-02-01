# GitHire Project Context & Handoff

## 🚀 Project Overview
**GitHire** is an AI-powered resume builder that aggregates a developer's work from various platforms (GitHub, GitLab, Dribbble, etc.) into an ATS-friendly resume.

## 🛠 Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Prisma ORM)
- **Auth**: NextAuth.js (GitHub Provider)
- **Icons**: `react-icons` (SI & MD packs)

## 🎨 Design System (Current State: "Elegant/Anthropic")
We recently pivoted the design from a "Bright Orange Tech" vibe to a sophisticated, "Anthropic-inspired" aesthetic.
- **Typography**:
  - Headings: `Newsreader` (Serif)
  - Body: `Inter` / `system-ui` (Sans)
- **Colors**:
  - Primary: Muted Warm Clay (`#D97757`)
  - Backgrounds: Warm Paper (`#F9F8F6`), Card (`#FFFFFF`)
  - Text: Warm Charcoal (`#2D2926`) & Warm Grey (`#6B665E`)
- **UI Element Style**:
  - Soft borders (`#E6E1DB`)
  - Minimal shadows
  - `rounded-md` or `rounded-lg` (moved away from `rounded-2xl`)

## 📂 Key Files & Recent Changes

### 1. Global Styles (`app/globals.css`, `tailwind.config.ts`)
- Defined CSS variables for the new color palette.
- Configured `font-serif` and `font-sans` families.

### 2. Layouts (`app/layout.tsx`, `app/(dashboard)/layout.tsx`)
- Imported `Newsreader` and `Inter` fonts.
- **Dashboard Nav**: Removed "Platforms" link, added "Settings" link.

### 3. Onboarding Flow (`app/onboarding/page.tsx`)
- **Status**: Functional 3-step wizard.
  1.  **LinkedIn Sync**: Input field for URL.
  2.  **Platform Selection**: Categorized Accordion list (Code, Design, Writing, etc.) with ~50 platforms.
  3.  **Link Profiles**: Input fields for selected platforms.
- **Data**: Submits to `/api/user/onboarding`.

### 4. Settings Page (`app/settings/page.tsx`)
- **New Feature**: replications of the Onboarding platform selection UI to allow users to manage connections later.
- **Note**: Currently contains duplicated code from Onboarding (the platform list and category logic). **Needs refactoring.**

### 5. Backend (`app/api/...`)
- `api/user/profile`: Fetches user data + `onboarding_completed` status.
- `api/user/onboarding`: Handle profile updates.

## 🚧 Immediate Next Steps / TODOs
1.  **Refactor Platform Data**: Extract the massive `categories` array (with icons) into a shared constant file (e.g., `lib/constants/platforms.tsx`) so `onboarding/page.tsx` and `settings/page.tsx` can share it.
2.  **Fix "Duplicated Logic"**: Create a reusable `PlatformSelector` component.
3.  **Verify Aesthetics**: Ensure the "Anthropic" vibe is consistently applied across the Dashboard and Projects list (which might still look like the old design).
4.  **Test**: Verify the persistent `onboarding_completed` redirect logic.

## 🐛 Known Issues / Notes
- We handled a runtime crash earlier by removing `SiAzuredevops`, `SiNewgrounds`, and `SiAngellist` due to import errors in `react-icons`.
- The database reset script (`reset-onboarding.js`) is available in the root if you need to re-test the onboarding flow.
