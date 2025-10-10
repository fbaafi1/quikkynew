-- Add start_date and end_date columns to advertisements table
-- This allows for scheduling advertisements with specific start and end times

-- Add the new columns
ALTER TABLE advertisements 
ADD COLUMN start_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN end_date TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN advertisements.start_date IS 'When the advertisement should start being displayed';
COMMENT ON COLUMN advertisements.end_date IS 'When the advertisement should stop being displayed (NULL means no end date)';

-- Create index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_advertisements_date_range ON advertisements(start_date, end_date) WHERE is_active = true;

-- Create index for active advertisements within date range
CREATE INDEX IF NOT EXISTS idx_advertisements_active_dates ON advertisements(is_active, start_date, end_date);

-- Add comment for the indexes
COMMENT ON INDEX idx_advertisements_date_range IS 'Index for filtering active advertisements by date range';
COMMENT ON INDEX idx_advertisements_active_dates IS 'Index for finding active advertisements within specific date ranges';
