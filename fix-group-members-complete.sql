-- =====================================================
-- COMPLETE FIX: Infinite Recursion in Group Members
-- =====================================================
-- This script completely rebuilds the RLS policies for
-- groups and group_members to eliminate ALL recursion

-- =====================================================
-- STEP 1: Drop ALL existing policies
-- =====================================================

-- Drop all group_members policies
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON group_members;
DROP POLICY IF EXISTS "Users can remove themselves from groups" ON group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON group_members;

-- Drop all groups policies
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Group creators can update groups" ON groups;
DROP POLICY IF EXISTS "Group creators can delete groups" ON groups;

-- =====================================================
-- STEP 2: Create SIMPLE policies for GROUPS table
-- =====================================================

-- Users can view groups they created
CREATE POLICY "Users can view their own groups"
    ON groups FOR SELECT
    USING (created_by = auth.uid());

-- Users can create groups
CREATE POLICY "Users can create groups"
    ON groups FOR INSERT
    WITH CHECK (created_by = auth.uid());

-- Users can update groups they created
CREATE POLICY "Users can update their own groups"
    ON groups FOR UPDATE
    USING (created_by = auth.uid());

-- Users can delete groups they created
CREATE POLICY "Users can delete their own groups"
    ON groups FOR DELETE
    USING (created_by = auth.uid());

-- =====================================================
-- STEP 3: Create SIMPLE policies for GROUP_MEMBERS
-- =====================================================

-- Users can view members if:
-- 1. They ARE the member (user_id matches), OR
-- 2. They created the group
CREATE POLICY "Users can view group members"
    ON group_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_members.group_id 
            AND groups.created_by = auth.uid()
        )
    );

-- Group creators can add members
CREATE POLICY "Group creators can add members"
    ON group_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_members.group_id 
            AND groups.created_by = auth.uid()
        )
    );

-- Users can remove themselves
CREATE POLICY "Users can remove themselves"
    ON group_members FOR DELETE
    USING (user_id = auth.uid());

-- Group creators can remove any member
CREATE POLICY "Group creators can remove members"
    ON group_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_members.group_id 
            AND groups.created_by = auth.uid()
        )
    );

-- =====================================================
-- STEP 4: Verify policies were created
-- =====================================================

-- Check groups policies
SELECT 'GROUPS POLICIES:' as info;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'groups'
ORDER BY policyname;

-- Check group_members policies
SELECT 'GROUP_MEMBERS POLICIES:' as info;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'group_members'
ORDER BY policyname;

-- Success message
SELECT '✅ All RLS policies recreated successfully! No more infinite recursion.' as message;
