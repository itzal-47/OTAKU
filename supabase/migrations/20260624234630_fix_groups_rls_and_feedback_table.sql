/*
# Fix Groups RLS and Create Feedback Table

## 1. New Tables
- `feedback`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `type` (text - suggestion, bug, feature)
  - `title` (text)
  - `description` (text)
  - `status` (text, default 'pending')
  - `created_at` (timestamptz)

## 2. Modified Tables
- `user_settings`: add `theme` column if not exists

## 3. Security Changes
- Fix groups RLS policies to avoid infinite recursion
- Remove the problematic SELECT policy that references group_members
- Replace with simpler owner-based and public policies
- Add feedback table RLS policies
*/

-- Fix groups RLS policies: drop existing recursive ones and recreate
DROP POLICY IF EXISTS "groups_select" ON groups;
DROP POLICY IF EXISTS "groups_insert" ON groups;
DROP POLICY IF EXISTS "groups_update" ON groups;
DROP POLICY IF EXISTS "groups_delete" ON groups;
DROP POLICY IF EXISTS "public_groups_select" ON groups;
DROP POLICY IF EXISTS "group_members_select" ON groups;
DROP POLICY IF EXISTS "group_members_insert" ON groups;
DROP POLICY IF EXISTS "group_members_update" ON groups;
DROP POLICY IF EXISTS "group_members_delete" ON groups;

-- Enable RLS on groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Simple public read policy for groups (all visible groups)
CREATE POLICY "groups_public_select"
ON groups FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to create groups
CREATE POLICY "groups_authenticated_insert"
ON groups FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow owners/admins to update their groups
CREATE POLICY "groups_owner_update"
ON groups FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Allow owners to delete their groups
CREATE POLICY "groups_owner_delete"
ON groups FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('suggestion', 'bug', 'feature')),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "feedback_user_select"
ON feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "feedback_user_insert"
ON feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all feedback (using is_admin check on profiles)
CREATE POLICY "feedback_admin_select"
ON feedback FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Add theme column to user_settings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'theme'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN theme text NOT NULL DEFAULT 'dark';
  END IF;
END $$;
