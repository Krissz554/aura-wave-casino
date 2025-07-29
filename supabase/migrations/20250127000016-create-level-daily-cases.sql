-- Create level-based daily cases system
-- Each case resets daily and requires specific user level

-- Create the level daily cases table
CREATE TABLE IF NOT EXISTS public.level_daily_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    level_required INTEGER NOT NULL CHECK (level_required >= 10 AND level_required <= 100),
    case_type TEXT NOT NULL DEFAULT 'level',
    is_available BOOLEAN DEFAULT true,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, level_required)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_level_daily_cases_user_level ON public.level_daily_cases(user_id, level_required);
CREATE INDEX IF NOT EXISTS idx_level_daily_cases_reset_date ON public.level_daily_cases(last_reset_date);

-- Enable RLS
ALTER TABLE public.level_daily_cases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own level daily cases" ON public.level_daily_cases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own level daily cases" ON public.level_daily_cases
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level daily cases" ON public.level_daily_cases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to initialize level daily cases for a user
CREATE OR REPLACE FUNCTION public.initialize_level_daily_cases(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    level_num INTEGER;
BEGIN
    -- Create cases for levels 10, 20, 30, ..., 100
    FOR level_num IN 10..100 BY 10 LOOP
        INSERT INTO public.level_daily_cases (user_id, level_required, case_type, is_available, last_reset_date)
        VALUES (user_uuid, level_num, 'level', true, CURRENT_DATE)
        ON CONFLICT (user_id, level_required) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily cases based on date
CREATE OR REPLACE FUNCTION public.reset_daily_cases()
RETURNS VOID AS $$
BEGIN
    -- Reset cases where last_reset_date is not today
    UPDATE public.level_daily_cases 
    SET is_available = true, last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's available level daily cases
CREATE OR REPLACE FUNCTION public.get_user_level_daily_cases(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    level_required INTEGER,
    is_available BOOLEAN,
    last_reset_date DATE,
    user_level INTEGER
) AS $$
BEGIN
    -- First, ensure all cases exist for this user
    PERFORM public.initialize_level_daily_cases(user_uuid);
    
    -- Reset cases if needed
    PERFORM public.reset_daily_cases();
    
    -- Return cases with user's current level
    RETURN QUERY
    SELECT 
        ldc.id,
        ldc.level_required,
        ldc.is_available,
        ldc.last_reset_date,
        p.level
    FROM public.level_daily_cases ldc
    LEFT JOIN public.profiles p ON p.id = user_uuid
    WHERE ldc.user_id = user_uuid
    ORDER BY ldc.level_required;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to open a level daily case
CREATE OR REPLACE FUNCTION public.open_level_daily_case(case_id UUID, user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    case_record RECORD;
    user_level INTEGER;
    reward_amount DECIMAL(10,2);
    result JSON;
BEGIN
    -- Get case details and user level
    SELECT ldc.*, p.level INTO case_record
    FROM public.level_daily_cases ldc
    LEFT JOIN public.profiles p ON p.id = user_uuid
    WHERE ldc.id = case_id AND ldc.user_id = user_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Case not found';
    END IF;
    
    user_level := case_record.level;
    
    -- Check if user can open this case
    IF user_level < case_record.level_required THEN
        RAISE EXCEPTION 'User level % is too low for level % case', user_level, case_record.level_required;
    END IF;
    
    -- Check if case is available
    IF NOT case_record.is_available THEN
        RAISE EXCEPTION 'Case is not available';
    END IF;
    
    -- Calculate reward based on level (higher level = higher reward)
    reward_amount := (case_record.level_required / 10.0) * 50.0 + (RANDOM() * 100.0);
    
    -- Mark case as unavailable
    UPDATE public.level_daily_cases 
    SET is_available = false 
    WHERE id = case_id;
    
    -- Add reward to user's balance
    UPDATE public.profiles 
    SET balance = balance + reward_amount,
        total_wagered = total_wagered + reward_amount
    WHERE id = user_uuid;
    
    -- Create case history record
    INSERT INTO public.case_rewards (
        user_id, 
        level_unlocked, 
        reward_amount, 
        rarity, 
        case_type,
        opened_at
    ) VALUES (
        user_uuid,
        case_record.level_required,
        reward_amount,
        'level',
        'level_daily',
        NOW()
    );
    
    -- Return result
    result := json_build_object(
        'success', true,
        'reward_amount', reward_amount,
        'level_required', case_record.level_required,
        'case_id', case_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize cases when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize level daily cases for new user
    PERFORM public.initialize_level_daily_cases(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add case_type column to existing case_rewards table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_rewards' AND column_name = 'case_type') THEN
        ALTER TABLE public.case_rewards ADD COLUMN case_type TEXT DEFAULT 'free';
    END IF;
END $$;

-- Update existing case_rewards to have proper case_type
UPDATE public.case_rewards SET case_type = 'free' WHERE case_type IS NULL;