# ShipCV Database Setup

## Option 1: Local PostgreSQL (Recommended for Development)

### Install PostgreSQL
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb githire
```

### Update .env.local
```bash
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/githire"
```

### Run Migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Option 2: Supabase (Recommended for Production)

### 1. Create Supabase Project
- Go to https://supabase.com
- Create new project
- Copy the database connection string

### 2. Update .env.local
```bash
# Direct connection (for migrations)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Pooled connection (for app)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"
```

### 3. Run Migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Option 3: Neon (Serverless PostgreSQL)

### 1. Create Neon Project
- Go to https://neon.tech
- Create new project
- Copy connection string

### 2. Update .env.local
```bash
DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require"
```

### 3. Run Migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Verify Setup

```bash
# Open Prisma Studio to view database
npx prisma studio

# Test database connection
npx prisma db push
```

---

## Next Steps

After database is set up:
1. Run `npm run dev` to start the development server
2. Visit http://localhost:3000
3. Sign up for an account
4. Test GitHub OAuth connection
