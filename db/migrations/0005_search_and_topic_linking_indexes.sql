CREATE INDEX IF NOT EXISTS documents_search_vector_idx
  ON documents
  USING GIN (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(content, '')));

CREATE INDEX IF NOT EXISTS documents_tags_gin_idx
  ON documents
  USING GIN (tags);

CREATE INDEX IF NOT EXISTS saved_topics_focus_tags_gin_idx
  ON saved_topics
  USING GIN (focus_tags);
