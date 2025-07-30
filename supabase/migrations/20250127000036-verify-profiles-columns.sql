-- Verify profiles table columns

-- Check what columns actually exist in the profiles table
DO $$
DECLARE
  column_info RECORD;
BEGIN
  RAISE NOTICE 'Profiles table columns:';
  FOR column_info IN 
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND table_schema = 'public'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE 'Column: %, Type: %, Nullable: %', 
      column_info.column_name, 
      column_info.data_type, 
      column_info.is_nullable;
  END LOOP;
  
  RAISE NOTICE 'Total columns in profiles table: %', 
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'profiles' AND table_schema = 'public');
END $$;