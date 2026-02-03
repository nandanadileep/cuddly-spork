# ShipCV - Setup Guide

## 1. PostgreSQL Database Setup

### Option A: Local PostgreSQL (Easiest for Testing)

PostgreSQL is already installed! Now create the database:

```bash
# Add PostgreSQL to your PATH (add to ~/.zshrc for permanent)
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Create database
createdb githire

# Your DATABASE_URL will be:
# DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/githire"
```

To find your username, run: `whoami`

### Option B: Supabase (Free Cloud Database)

1. Go to https://supabase.com and sign up
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" under "Connection pooling"
5. Replace `[YOUR-PASSWORD]` with your database password
6. Add to `.env.local`

---

## 2. GitHub OAuth Setup

Fill in the GitHub OAuth form like this:

**Application name:**
```
ShipCV (Development)
```

**Homepage URL:**
```
http://localhost:3000
```

**Application description:**
```
AI-powered resume builder that transforms your GitHub projects into professional resumes
```

**Authorization callback URL:**
```
http://localhost:3000/api/auth/callback/github
```

**Enable Device Flow:**
- Leave unchecked (not needed)

After creating the app:
1. Copy the **Client ID**
2. Click "Generate a new client secret"
3. Copy the **Client Secret** immediately (you won't see it again!)
4. Add both to `.env.local`:
   ```
   GITHUB_CLIENT_ID="your_client_id_here"
   GITHUB_CLIENT_SECRET="your_client_secret_here"
   ```

---

## 3. Update .env.local

Your `.env.local` should look like this:

```bash
# Database (use your actual username from `whoami`)
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/githire"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="B0782Cf1kwGjra8wmJWCKEPRbiiAH1hpkH7z7bzXKsM="

# GitHub OAuth
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# OpenAI (optional - for AI features)
OPENAI_API_KEY="sk-..."

# Redis (optional - for caching)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

---

## 4. Run Migrations & Start App

```bash
# Run database migrations
npx prisma migrate dev --name init
npx prisma generate

# Start development server
npm run dev
```

Then visit: http://localhost:3000

---

## Quick Start Checklist

- [ ] PostgreSQL running (`brew services start postgresql@15`)
- [ ] Database created (`createdb githire`)
- [ ] GitHub OAuth app created
- [ ] `.env.local` updated with all credentials
- [ ] Migrations run (`npx prisma migrate dev`)
- [ ] Dev server started (`npm run dev`)

---

## Troubleshooting

**"createdb: command not found"**
```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

**"Database connection error"**
- Check PostgreSQL is running: `brew services list`
- Verify username with `whoami`
- Update DATABASE_URL in `.env.local`

**"GitHub OAuth error"**
- Verify callback URL is exactly: `http://localhost:3000/api/auth/callback/github`
- Check Client ID and Secret are correct in `.env.local`
