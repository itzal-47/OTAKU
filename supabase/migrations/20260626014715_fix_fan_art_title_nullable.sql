-- Make fan_art.title nullable to allow uploads without title
ALTER TABLE fan_art ALTER COLUMN title DROP NOT NULL;