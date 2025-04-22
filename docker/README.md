# Supabase Docker

This is a minimal Docker Compose setup for self-hosting Supabase. Follow the steps [here](https://supabase.com/docs/guides/hosting/docker) to get started.

## N8N configurations

```
docker exec -it supabase-db psql -U postgres
```

```
CREATE DATABASE n8n;
CREATE USER n8n_user WITH PASSWORD 'n8n_password';
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n_user;
```

If there is any permission error

```
docker exec -it supabase-db psql -U postgres
\c n8n
GRANT n8n_user TO postgres;
ALTER SCHEMA public OWNER TO n8n_user;
```

