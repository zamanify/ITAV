-- Query to check all phone numbers and their formats
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

-- Also check for any potential duplicates or formatting issues
SELECT 
  phone_number,
  COUNT(*) as count,
  STRING_AGG(first_name || ' ' || last_name, ', ') as users
FROM users 
WHERE phone_number IS NOT NULL
GROUP BY phone_number
HAVING COUNT(*) > 1;