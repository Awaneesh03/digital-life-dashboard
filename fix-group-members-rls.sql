-- =====================================================
-- FIX: Infinite Recursion in Group Members RLS Policy
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to fix the
-- infinite recursion error when creating groups or adding members
--
-- This script will:
-- 1. Drop the problematic recursive policy
-- 2. Create a simplified policy without circular references
-- 3. Maintain proper security and data isolation

-- =====================================================
-- GROUP_MEMBERS TABLE - FIX INFINITE RECURSION
-- =====================================================

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;

-- Create new simplified policy WITHOUT recursion
-- Users can view members if:
-- 1. They are the member being viewed (user_id = auth.uid()), OR
-- 2. They created the group (checked via groups table)
CREATE POLICY "Users can view members of their groups"
    ON group_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_members.group_id 
            AND groups.created_by = auth.uid()
        )
    );

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Check that the policy was created successfully
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'group_members'
AND policyname = 'Users can view members of their groups';

-- Success message
SELECT 'Group members RLS policy fixed! Infinite recursion eliminated.' as message;

-- =====================================================
-- TESTING INSTRUCTIONS
-- =====================================================
-- After running this script:
-- 1. Try creating a new group in the Split Bills section
-- 2. Try adding members to the group
-- 3. Verify that you can see all members of groups you created
-- 4. Verify that you can see your own memberships in other groups
-- 5. Confirm no "infinite recursion detected" errors appear
