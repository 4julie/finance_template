#!/bin/bash
# =============================================================================
# Minimal Supabase schema and role initialization
# =============================================================================
# Creates the roles and schemas that GoTrue (auth) and PostgREST expect.
# The supabase/postgres image does NOT create these automatically.
# This runs only on first boot (when pgdata volume is empty).
# =============================================================================

set -e

echo "Creating Supabase roles and schemas..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
    -- Roles required by Supabase services
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
            CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
            CREATE ROLE authenticator NOINHERIT LOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
            CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
            CREATE ROLE service_role NOLOGIN BYPASSRLS;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
            CREATE ROLE supabase_auth_admin NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
            CREATE ROLE supabase_storage_admin NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_functions_admin') THEN
            CREATE ROLE supabase_functions_admin NOLOGIN;
        END IF;
    END
    $$;

    -- Role memberships
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
    GRANT supabase_admin TO postgres;

    -- Schemas required by GoTrue and extensions
    CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
    CREATE SCHEMA IF NOT EXISTS extensions;

    -- Permissions
    GRANT USAGE ON SCHEMA auth TO supabase_auth_admin, service_role, postgres;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    ALTER ROLE supabase_auth_admin SET search_path = 'auth';
    ALTER ROLE authenticator SET statement_timeout = '8s';
EOSQL

echo "Supabase roles and schemas created successfully."
