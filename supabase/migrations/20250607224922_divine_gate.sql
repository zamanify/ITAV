-- Query to verify all phone numbers are in correct format
SELECT 
  id,
  first_name,
  last_name,
  phone_number,
  length(phone_number) as phone_length,
  -- Check if it starts with +46
  CASE 
    WHEN phone_number LIKE '+46%' THEN 'Correct format'
    WHEN phone_number LIKE '46%' THEN 'Missing +'
    WHEN phone_number LIKE '0%' THEN 'Swedish format (needs conversion)'
    ELSE 'Unknown format'
  END as format_status
FROM users 
WHERE phone_number IS NOT NULL
ORDER BY first_name;

-- Check for any potential duplicates
SELECT 
  phone_number,
  COUNT(*) as count,
  STRING_AGG(first_name || ' ' || last_name, ', ') as users
FROM users 
WHERE phone_number IS NOT NULL
GROUP BY phone_number
HAVING COUNT(*) > 1;

-- Verify the RLS policies are working correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;