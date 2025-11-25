-- =====================================================
-- FIX: Row Level Security for User Data Isolation
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to ensure
-- each user only sees their own data

-- This script will:
-- 1. Drop existing policies (if any)
-- 2. Recreate proper RLS policies
-- 3. Ensure users only see their own data

-- =====================================================
-- GROUPS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Group creators can update groups" ON groups;
DROP POLICY IF EXISTS "Group creators can delete groups" ON groups;

-- Recreate policies
CREATE POLICY "Users can view groups they are members of"
    ON groups FOR SELECT
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_members.group_id = groups.id 
            AND group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups"
    ON groups FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update groups"
    ON groups FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete groups"
    ON groups FOR DELETE
    USING (auth.uid() = created_by);

-- =====================================================
-- GROUP_MEMBERS TABLE
-- =====================================================

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON group_members;
DROP POLICY IF EXISTS "Users can remove themselves from groups" ON group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON group_members;

CREATE POLICY "Users can view members of their groups"
    ON group_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_members.group_id 
            AND (groups.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM group_members gm2 
                        WHERE gm2.group_id = groups.id 
                        AND gm2.user_id = auth.uid()))
        )
    );

CREATE POLICY "Group creators can add members"
    ON group_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_members.group_id 
            AND groups.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can remove themselves from groups"
    ON group_members FOR DELETE
    USING (user_id = auth.uid());

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
-- SHARED_EXPENSES TABLE
-- =====================================================

ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expenses in their groups" ON shared_expenses;
DROP POLICY IF EXISTS "Users can create shared expenses in their groups" ON shared_expenses;
DROP POLICY IF EXISTS "Expense creators can update expenses" ON shared_expenses;
DROP POLICY IF EXISTS "Expense creators can delete expenses" ON shared_expenses;

CREATE POLICY "Users can view expenses in their groups"
    ON shared_expenses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_members.group_id = shared_expenses.group_id 
            AND group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create shared expenses in their groups"
    ON shared_expenses FOR INSERT
    WITH CHECK (
        auth.uid() = paid_by AND
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_members.group_id = shared_expenses.group_id 
            AND group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Expense creators can update expenses"
    ON shared_expenses FOR UPDATE
    USING (auth.uid() = paid_by);

CREATE POLICY "Expense creators can delete expenses"
    ON shared_expenses FOR DELETE
    USING (auth.uid() = paid_by);

-- =====================================================
-- EXPENSE_SPLITS TABLE
-- =====================================================

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own splits" ON expense_splits;
DROP POLICY IF EXISTS "Expense creators can create splits" ON expense_splits;
DROP POLICY IF EXISTS "Users can update their own splits" ON expense_splits;

CREATE POLICY "Users can view their own splits"
    ON expense_splits FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM shared_expenses 
            WHERE shared_expenses.id = expense_splits.shared_expense_id 
            AND shared_expenses.paid_by = auth.uid()
        )
    );

CREATE POLICY "Expense creators can create splits"
    ON expense_splits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shared_expenses 
            WHERE shared_expenses.id = expense_splits.shared_expense_id 
            AND shared_expenses.paid_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own splits"
    ON expense_splits FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- OTHER TABLES (Tasks, Habits, Expenses, etc.)
-- =====================================================

-- TASKS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- HABITS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own habits" ON habits;
DROP POLICY IF EXISTS "Users can create own habits" ON habits;
DROP POLICY IF EXISTS "Users can update own habits" ON habits;
DROP POLICY IF EXISTS "Users can delete own habits" ON habits;

CREATE POLICY "Users can view own habits" ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own habits" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON habits FOR DELETE USING (auth.uid() = user_id);

-- EXPENSES
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- BUDGETS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;

CREATE POLICY "Users can view own budgets" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON budgets FOR DELETE USING (auth.uid() = user_id);

-- GOALS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can create own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON goals;

CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

-- NOTES
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can create own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON notes FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tasks', 'habits', 'expenses', 'budgets', 'goals', 'notes', 'groups', 'group_members', 'shared_expenses', 'expense_splits')
ORDER BY tablename;

-- Success message
SELECT 'Row Level Security policies have been updated! Each user will now only see their own data.' as message;
