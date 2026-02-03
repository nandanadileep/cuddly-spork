# ShipCV

ShipCV is a resume builder that turns your projects, experience, and profile data into a polished, LaTeX‑generated resume. It combines structured inputs with AI‑assisted analysis, then compiles clean PDFs through an external LaTeX service. The goal is simple: ship a resume that feels deliberate and credible.

## What We Built

- Onboarding flow with LinkedIn URL, contact fields, and platform connections
- Project ingestion from GitHub and any URL (Kaggle, Figma, Behance, etc.)
- URL normalization with platform detection and metadata parsing
- AI analysis flow: project selection → analysis → skills
- Skill extraction with manual overrides and removals
- Resume builder with editable LaTeX and PDF compilation
- Template selection and consistent LaTeX formatting
- Profile editor for work, education, awards, publications, and extracurriculars
- Caching and rate‑limit aware batching for AI analysis

## Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Auth:** NextAuth (credentials)
- **Database:** PostgreSQL + Prisma
- **AI:** OpenAI API for analysis + skill extraction
- **PDF:** LaTeXLite for LaTeX compilation
- **Scraping:** Cheerio for metadata extraction

## Challenges We Hit (And How We Handled Them)

- **LLM rate limits:** We implemented batch analysis with cooldowns and progress UI so users aren’t left guessing. We also cache analysis results to avoid repeating calls.
- **Hallucinated project details:** We stopped generating descriptions for empty repos and only analyze when there is real signal (README, language, or repo tech). Empty or blocked URLs are saved with a “needs details” badge instead of guessing.
- **Inconsistent skills:** Skill extraction now pulls from multiple sources (README, repo languages, dependency files) and lets users remove items that don’t fit.
- **LaTeX compilation errors:** We tightened the template, removed fragile line breaks, and standardized spacing to prevent render failures.
- **Data quality drift:** Projects and profiles can be updated over time, so we added caching and change detection to avoid stale or incorrect resume content.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start PostgreSQL and create the DB:
   ```bash
   brew services start postgresql@15
   createdb githire
   ```
3. Configure `.env.local` and run migrations:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
4. Run the app:
   ```bash
   npm run dev
   ```

This app might not get you a job but it will definitely get you started. 
