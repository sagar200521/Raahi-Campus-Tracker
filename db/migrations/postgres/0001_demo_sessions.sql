CREATE TABLE demo_sessions (
  id text PRIMARY KEY,
  state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  expires bigint NOT NULL
);
CREATE INDEX demo_sessions_expires_idx ON demo_sessions (expires);
