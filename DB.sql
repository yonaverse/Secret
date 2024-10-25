-- Users table
CREATE TABLE  users (
    id SERIAL PRIMARY KEY,
    email TEXT,
    password TEXT,
    google_id TEXT,
    name TEXT,
    profile_picture TEXT
);

-- Secrets table
CREATE TABLE  secrets (
    user_id INTEGER REFERENCES users(id),
    secret TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_secrets_user_id ON secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);