-- Remove the "email" column and add a "location" column to the "providers" table

ALTER TABLE providers
  DROP COLUMN IF EXISTS email,
  ADD COLUMN location TEXT;

-- If you want to update the structure for each service in the providers table:
-- (Assuming services is a JSONB column)

-- No migration needed if you just change the JSON structure.
-- If you had a "price" field, you can ignore it and start using "pricing_info" in new records.
