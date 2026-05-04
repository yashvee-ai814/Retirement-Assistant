-- Ensure the retirement user has full superuser-level access.
-- POSTGRES_USER is already superuser by default in the Docker image,
-- but we make every privilege explicit here for clarity.

ALTER USER retirement SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS;

GRANT ALL PRIVILEGES ON DATABASE retirement_db TO retirement;

-- When new tables are created at runtime, automatically grant full access.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO retirement;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO retirement;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO retirement;
