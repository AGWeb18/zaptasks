# Supabase Backend Setup for ZapTasks

## 1. Create Supabase Project

- Go to [supabase.com/dashboard](https://supabase.com/dashboard)
- Create new project (use strong password)
- Wait for DB to be ready (~2 mins)
- Note URL and anon key from Settings > API

## 2. Run SQL Scripts (in order)

In Supabase SQL Editor (dashboard > SQL Editor):

```sql
-- 1. Core tables
-- @file supabase/database.sql
```

```sql
-- 2. Reviews
-- @file supabase/provider_reviews.sql
```

```sql
-- 3. Chat
-- @file supabase/chat.sql
```

```sql
-- 4. RLS Policies (security)
-- @file supabase/rls-policies.sql
```

**Run one by one** – check for errors.

## 3. Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 4. Test

- `npm run dev`
- Post job → should save to DB
- Check Supabase Table Editor for data

## 5. Production

- Use Supabase Edge Functions if needed later
- Enable email confirmations in Auth
- Backup DB weekly

✅ Ready! Questions? Check DEPLOYMENT.md
