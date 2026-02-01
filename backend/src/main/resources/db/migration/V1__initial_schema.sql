-- Initial schema for GIF Clipper
-- Compatible with both PostgreSQL and H2

-- GIFs table
CREATE TABLE gifs (
    id UUID PRIMARY KEY,
    original_filename VARCHAR(255),
    storage_key VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL DEFAULT 'image/gif',
    file_size BIGINT NOT NULL,
    width INT,
    height INT,
    duration_ms INT,
    frame_count INT,
    view_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Index for looking up GIFs by storage key
CREATE INDEX idx_gifs_storage_key ON gifs(storage_key);

-- Index for finding non-deleted, non-expired GIFs
CREATE INDEX idx_gifs_active ON gifs(deleted_at, expires_at);

-- Index for cleanup jobs (without partial index for H2 compatibility)
CREATE INDEX idx_gifs_expires_at ON gifs(expires_at);
