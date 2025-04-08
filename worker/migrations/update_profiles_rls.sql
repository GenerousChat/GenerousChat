-- Update RLS policies for the profiles table

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON public.profiles;

-- Create policy to allow authenticated users to insert their own profile
CREATE POLICY "Allow authenticated users to insert their own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Create policy to allow authenticated users to update their own profile
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Create policy to allow all users to read profiles
DROP POLICY IF EXISTS "Allow all users to read profiles" ON public.profiles;
CREATE POLICY "Allow all users to read profiles" ON public.profiles
    FOR SELECT USING (true);
