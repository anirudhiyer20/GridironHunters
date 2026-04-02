# Web App

This is the Next.js frontend for GridironHunters.

## Run It

From the repository root:

```powershell
npm run web:dev
```

## Environment File

Next.js reads local environment variables from `apps/web/.env.local`.

Use `apps/web/.env.example` as the template.

Important:

- do not commit `apps/web/.env.local`
- use the Supabase project URL
- use the Supabase publishable key
- do not use the secret or service role key in frontend code
