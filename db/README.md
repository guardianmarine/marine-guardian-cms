# Database Migrations

This directory contains SQL migration files that are automatically validated and applied via GitHub Actions.

## Naming Convention

All migration files must follow this format:

```
YYYYMMDDHHMM__description.sql
```

**Examples:**
- `202501151430__create_users_table.sql`
- `202501151445__add_email_index.sql`

The timestamp prefix ensures migrations run in chronological order.

## Local Execution

To run migrations locally, you need a PostgreSQL connection string to your Supabase database.

### Get your connection string:
1. Go to your Supabase project dashboard
2. Navigate to Settings > Database
3. Copy the "Connection string" (URI format)
4. Replace `[YOUR-PASSWORD]` with your actual database password

### Run a single migration:

```bash
export SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
psql "$SUPABASE_DB_URL" -f db/migrations/202501151430__create_users_table.sql
```

### Run all migrations in order:

```bash
for file in db/migrations/*.sql; do
  echo "Applying $file..."
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=on -f "$file" || exit 1
done
```

## GitHub Actions

The workflow `.github/workflows/db-migrate.yml` automatically:

- **On Pull Requests**: Validates all migration files using a dry-run (transaction rollback)
- **On Push to Main**: Applies all migrations to the production database
- **Manual Trigger**: Can be run manually via `workflow_dispatch`

### Required GitHub Secret

Configure `SUPABASE_DB_URL` in your repository secrets:

1. Go to Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Name: `SUPABASE_DB_URL`
4. Value: Your Supabase connection string (format shown above)

## Best Practices

- Always test migrations locally before committing
- Keep migrations small and focused
- Use transactions when possible
- Never modify or delete existing migration files
- Add new migrations with newer timestamps
- Include rollback logic in comments if needed
