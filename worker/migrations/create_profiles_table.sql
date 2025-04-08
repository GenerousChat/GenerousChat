-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read profiles
CREATE POLICY "Allow all users to read profiles" ON public.profiles
    FOR SELECT USING (true);

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Create function to generate a random silly name
CREATE OR REPLACE FUNCTION public.generate_random_name()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    adjectives TEXT[] := ARRAY['Happy', 'Sleepy', 'Grumpy', 'Sneezy', 'Dopey', 'Bashful', 'Doc', 'Jumpy', 'Silly', 'Witty', 'Clever', 'Brave', 'Mighty', 'Noble', 'Gentle', 'Wise', 'Swift', 'Daring', 'Curious', 'Jolly'];
    nouns TEXT[] := ARRAY['Panda', 'Tiger', 'Elephant', 'Giraffe', 'Penguin', 'Koala', 'Dolphin', 'Hedgehog', 'Raccoon', 'Sloth', 'Unicorn', 'Dragon', 'Phoenix', 'Griffin', 'Wizard', 'Knight', 'Explorer', 'Astronaut', 'Pirate', 'Ninja'];
    random_adjective TEXT;
    random_noun TEXT;
BEGIN
    random_adjective := adjectives[floor(random() * array_length(adjectives, 1)) + 1];
    random_noun := nouns[floor(random() * array_length(nouns, 1)) + 1];
    RETURN random_adjective || random_noun;
END;
$$;

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (NEW.id, public.generate_random_name());
    RETURN NEW;
END;
$$;

-- Create trigger to automatically create a profile for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create a function to get a user's profile by ID
CREATE OR REPLACE FUNCTION public.get_profile(user_id UUID)
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM public.profiles WHERE id = user_id;
$$;

-- Create a function to update a user's profile
CREATE OR REPLACE FUNCTION public.update_profile(user_id UUID, user_name TEXT, user_avatar_url TEXT)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET 
        name = COALESCE(user_name, name),
        avatar_url = COALESCE(user_avatar_url, avatar_url),
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN QUERY SELECT * FROM public.profiles WHERE id = user_id;
END;
$$;
