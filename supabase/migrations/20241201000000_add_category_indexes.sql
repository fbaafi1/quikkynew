-- Add indexes for better category query performance
-- These indexes will significantly improve the performance of category queries

-- Index for filtering visible categories
CREATE INDEX IF NOT EXISTS idx_categories_is_visible ON categories(is_visible);

-- Index for parent_id lookups (used in tree building)
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Composite index for visible categories ordered by name (most common query)
CREATE INDEX IF NOT EXISTS idx_categories_visible_name ON categories(is_visible, name) WHERE is_visible = true;

-- Index for parent_id with is_visible (for subcategory queries)
CREATE INDEX IF NOT EXISTS idx_categories_parent_visible ON categories(parent_id, is_visible) WHERE parent_id IS NOT NULL;

-- Index for name searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_categories_name_gin ON categories USING gin(to_tsvector('english', name));

-- Add comments for documentation
COMMENT ON INDEX idx_categories_is_visible IS 'Index for filtering visible categories';
COMMENT ON INDEX idx_categories_parent_id IS 'Index for parent_id lookups used in category tree building';
COMMENT ON INDEX idx_categories_visible_name IS 'Composite index for visible categories ordered by name';
COMMENT ON INDEX idx_categories_parent_visible IS 'Index for subcategory queries with parent_id and visibility';
COMMENT ON INDEX idx_categories_name_gin IS 'Full-text search index for category names';
