-- Multi-tenant Migration Script for Family Hub
-- Run this script to add multi-tenant support to an existing database

-- ============================================================
-- STEP 1: CREATE NEW TABLES
-- ============================================================

-- Admin table for system administration
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Families table
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_sent_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_plan VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Family features table
CREATE TABLE IF NOT EXISTS family_features (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    feature_key VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    config_json JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family AI limits table
CREATE TABLE IF NOT EXISTS family_ai_limits (
    id SERIAL PRIMARY KEY,
    family_id INTEGER UNIQUE NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    monthly_token_limit INTEGER DEFAULT 100000,
    current_month_usage INTEGER DEFAULT 0,
    reset_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- AI Token usage tracking table
CREATE TABLE IF NOT EXISTS ai_token_usage (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    feature_used VARCHAR(50) NOT NULL,
    model_used VARCHAR(50) NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd FLOAT DEFAULT 0.0,
    request_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email configuration table
CREATE TABLE IF NOT EXISTS email_config (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(20) DEFAULT 'smtp',
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_user VARCHAR(255),
    smtp_password VARCHAR(255),
    from_email VARCHAR(255),
    from_name VARCHAR(100) DEFAULT 'Family Hub',
    oauth_client_id VARCHAR(255),
    oauth_client_secret VARCHAR(255),
    oauth_refresh_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- STEP 2: ADD COLUMNS TO EXISTING USERS TABLE
-- ============================================================

-- Add family_id column (nullable initially for migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id);

-- Add total_points column
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- Add email verification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP WITH TIME ZONE;

-- Add password reset columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- STEP 3: CREATE DEFAULT FAMILY FOR EXISTING DATA
-- ============================================================

-- Insert default family for existing users (Rayees Family)
INSERT INTO families (id, name, slug, owner_email, is_verified, is_active, subscription_plan)
VALUES (1, 'Rayees Family', 'rayees-family', 'rayees@family.com', true, true, 'free')
ON CONFLICT (id) DO NOTHING;

-- Update sequence to avoid conflicts
SELECT setval('families_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM families));

-- ============================================================
-- STEP 4: ASSIGN EXISTING USERS TO DEFAULT FAMILY
-- ============================================================

-- Assign all existing users to the default family
UPDATE users SET family_id = 1 WHERE family_id IS NULL;

-- Mark existing users as verified (since they were created before verification system)
UPDATE users SET is_email_verified = TRUE WHERE email IS NOT NULL AND is_email_verified = FALSE;

-- ============================================================
-- STEP 5: ENABLE ALL FEATURES FOR DEFAULT FAMILY
-- ============================================================

-- Insert default features for the existing family
INSERT INTO family_features (family_id, feature_key, is_enabled) VALUES
    (1, 'prayers', true),
    (1, 'ramadan', true),
    (1, 'quran', true),
    (1, 'learning', true),
    (1, 'tasks', true),
    (1, 'my_tasks', true),
    (1, 'points', true),
    (1, 'expenses', true),
    (1, 'zakat', true),
    (1, 'reminders', true),
    (1, 'chatgpt_ai', true)
ON CONFLICT DO NOTHING;

-- Create AI limit for default family
INSERT INTO family_ai_limits (family_id, monthly_token_limit, current_month_usage)
VALUES (1, 100000, 0)
ON CONFLICT (family_id) DO NOTHING;

-- ============================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_family_features_family_id ON family_features(family_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_family_id ON ai_token_usage(family_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created_at ON ai_token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_families_slug ON families(slug);
CREATE INDEX IF NOT EXISTS idx_families_owner_email ON families(owner_email);

-- ============================================================
-- STEP 7: CREATE FIRST ADMIN ACCOUNT
-- ============================================================

-- You'll need to update the password hash with a proper one
-- This is just a placeholder - use bcrypt to generate a real password hash
-- Example: Get hash from Python: from passlib.context import CryptContext; pwd_context = CryptContext(schemes=["bcrypt"]); print(pwd_context.hash("your-password"))

-- INSERT INTO admins (email, password_hash, name, is_active)
-- VALUES ('admin@familyhub.com', '$2b$12$YOUR_BCRYPT_HASH_HERE', 'Super Admin', true);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check if migration was successful:
-- SELECT 'Families' as table_name, COUNT(*) as count FROM families
-- UNION ALL
-- SELECT 'Users with family_id', COUNT(*) FROM users WHERE family_id IS NOT NULL
-- UNION ALL
-- SELECT 'Family features', COUNT(*) FROM family_features
-- UNION ALL
-- SELECT 'AI limits', COUNT(*) FROM family_ai_limits;

COMMIT;
