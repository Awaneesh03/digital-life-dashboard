-- ===================================
-- Digital Life Dashboard - Database Setup
-- Updated Schema with UUID Primary Keys
-- ===================================
-- Run this SQL script in your Supabase SQL Editor
-- This will create all necessary tables and Row Level Security policies

-- ⚠️ RESET DATABASE (Clean Slate)
-- This will DELETE all existing data to prevent conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS habit_progress CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- TASKS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_date_idx ON tasks(date);
CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks(category);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

-- ===================================
-- HABITS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    reminder_enabled BOOLEAN DEFAULT FALSE,
    reminder_time TIME DEFAULT '09:00',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS habits_user_id_idx ON habits(user_id);

-- Enable Row Level Security
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habits
CREATE POLICY "Users can view their own habits"
    ON habits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
    ON habits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
    ON habits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
    ON habits FOR DELETE
    USING (auth.uid() = user_id);

-- ===================================
-- HABIT PROGRESS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS habit_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT TRUE,
    UNIQUE(habit_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS habit_progress_habit_id_idx ON habit_progress(habit_id);
CREATE INDEX IF NOT EXISTS habit_progress_user_id_idx ON habit_progress(user_id);
CREATE INDEX IF NOT EXISTS habit_progress_date_idx ON habit_progress(date);

-- Enable Row Level Security
ALTER TABLE habit_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habit_progress
CREATE POLICY "Users can view their own habit progress"
    ON habit_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit progress"
    ON habit_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit progress"
    ON habit_progress FOR DELETE
    USING (auth.uid() = user_id);

-- ===================================
-- NOTES TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    color TEXT DEFAULT 'default',
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY "Users can view their own notes"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- ===================================
-- EXPENSES TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses(category);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Users can view their own expenses"
    ON expenses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
    ON expenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
    ON expenses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
    ON expenses FOR DELETE
    USING (auth.uid() = user_id);

-- ===================================
-- PROFILES TABLE (Optional)
-- ===================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- ===================================
-- FUNCTIONS
-- ===================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, full_name)
    VALUES (NEW.id, NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ===================================
-- Budgets & Budget Limits
-- ===================================

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of month (e.g., 2025-01-01)
    total_budget NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month)
);

CREATE TABLE IF NOT EXISTS budget_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    limit_amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(budget_id, category)
);

-- Indexes for budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_budget_limits_budget ON budget_limits(budget_id);

-- RLS Policies for budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
    ON budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own budgets"
    ON budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
    ON budgets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
    ON budgets FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for budget_limits
ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget limits"
    ON budget_limits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_limits.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own budget limits"
    ON budget_limits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_limits.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own budget limits"
    ON budget_limits FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_limits.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own budget limits"
    ON budget_limits FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_limits.budget_id
            AND budgets.user_id = auth.uid()
        )
    );
-- ===================================
-- Savings Goals
-- ===================================

CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(12,2) NOT NULL,
    saved_amount NUMERIC(12,2) DEFAULT 0,
    achieved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for savings_goals
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);

-- RLS Policies for savings_goals
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings goals"
    ON savings_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own savings goals"
    ON savings_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals"
    ON savings_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals"
    ON savings_goals FOR DELETE
    USING (auth.uid() = user_id);

-- ===================================
-- Split Expenses & Groups
-- ===================================

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Friends/Contacts
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_email TEXT NOT NULL,
    friend_name TEXT,
    friend_user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending', -- pending, accepted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_email)
);

-- Shared expenses
CREATE TABLE IF NOT EXISTS shared_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    category TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense splits (who owes what)
CREATE TABLE IF NOT EXISTS expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shared_expense_id UUID NOT NULL REFERENCES shared_expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    settled BOOLEAN DEFAULT FALSE,
    settled_at TIMESTAMPTZ,
    UNIQUE(shared_expense_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_expenses_group ON shared_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_shared_expenses_paid_by ON shared_expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(shared_expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON expense_splits(user_id);

-- RLS Policies for groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups they are members of"
    ON groups FOR SELECT
    USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid())
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

-- RLS Policies for group_members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their groups"
    ON group_members FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
    );

CREATE POLICY "Group creators can add members"
    ON group_members FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM groups WHERE groups.id = group_members.group_id AND groups.created_by = auth.uid())
    );

CREATE POLICY "Users can remove themselves from groups"
    ON group_members FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for friends
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friends"
    ON friends FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add friends"
    ON friends FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friends"
    ON friends FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own friends"
    ON friends FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for shared_expenses
ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses in their groups"
    ON shared_expenses FOR SELECT
    USING (
        paid_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM expense_splits 
            WHERE expense_splits.shared_expense_id = shared_expenses.id 
            AND expense_splits.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_members.group_id = shared_expenses.group_id 
            AND group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create shared expenses in their groups"
    ON shared_expenses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_members.group_id = shared_expenses.group_id 
            AND group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Expense creators can update"
    ON shared_expenses FOR UPDATE
    USING (auth.uid() = paid_by);

CREATE POLICY "Expense creators can delete"
    ON shared_expenses FOR DELETE
    USING (auth.uid() = paid_by);

-- RLS Policies for expense_splits
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can settle their own splits"
    ON expense_splits FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Expense creators can delete splits"
    ON expense_splits FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM shared_expenses 
            WHERE shared_expenses.id = expense_splits.shared_expense_id 
            AND shared_expenses.paid_by = auth.uid()
        )
    );

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ===================================
-- SETUP COMPLETE
-- ===================================
-- All tables, indexes, RLS policies, and functions have been created.
-- Your Digital Life Dashboard is now ready to use!
