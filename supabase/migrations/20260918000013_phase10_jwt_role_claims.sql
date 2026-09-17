-- Phase 10: JWT Custom Claims for Role — Remove DB Query from Middleware
-- This migration sets up a PostgreSQL trigger that stores the user's role in JWT claims

-- 1. Enable the pgjwt extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgjwt;

-- 2. Create a function that syncs user role to JWT custom claims
-- This function is called AFTER a profile is created or the role is updated
CREATE OR REPLACE FUNCTION sync_user_role_to_jwt_claims()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the raw_user_meta_data with role claim
  -- This ensures the role is available in JWT custom claims
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger on profiles INSERT
CREATE TRIGGER trigger_sync_role_on_profile_create
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_user_role_to_jwt_claims();

-- 4. Create trigger on profiles UPDATE (when role changes)
CREATE TRIGGER trigger_sync_role_on_profile_update
AFTER UPDATE OF role ON profiles
FOR EACH ROW
WHEN (NEW.role IS DISTINCT FROM OLD.role)
EXECUTE FUNCTION sync_user_role_to_jwt_claims();

-- 5. Backfill existing users with role claims
UPDATE auth.users u
SET raw_user_meta_data = jsonb_set(
  COALESCE(u.raw_user_meta_data, '{}'::jsonb),
  '{role}',
  to_jsonb(p.role)
)
FROM profiles p
WHERE u.id = p.id
  AND (u.raw_user_meta_data->'role' IS NULL OR u.raw_user_meta_data->'role' != to_jsonb(p.role));

-- 6. Document the JWT claims structure
-- After this migration, JWT tokens will contain:
-- {
--   "sub": "user-id",
--   "role": "student|consultant|admin|super_admin",
--   "aud": "authenticated",
--   ...other claims
-- }
--
-- Middleware can now extract role from: user.user_metadata?.role ?? await getUserRole()
-- This provides a graceful fallback to DB query if claims are missing
