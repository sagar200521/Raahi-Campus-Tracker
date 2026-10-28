CREATE TABLE public.ttn_telemetry (
  delivery_id text PRIMARY KEY,
  application_id text NOT NULL,
  device_id text NOT NULL,
  received_at timestamptz NOT NULL,
  simulated boolean NOT NULL,
  record jsonb NOT NULL
);
CREATE INDEX ttn_telemetry_device_history_idx ON public.ttn_telemetry (application_id, device_id, simulated, received_at DESC);
CREATE TABLE public.ttn_device_latest (
  application_id text NOT NULL,
  device_id text NOT NULL,
  simulated boolean NOT NULL,
  latest_received_at timestamptz NOT NULL,
  latest_record jsonb NOT NULL,
  last_gps_received_at timestamptz,
  last_gps_record jsonb,
  PRIMARY KEY (application_id, device_id, simulated)
);
ALTER TABLE public.ttn_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttn_device_latest ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ttn_telemetry, public.ttn_device_latest FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.ttn_telemetry, public.ttn_device_latest FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.ttn_telemetry, public.ttn_device_latest FROM authenticated;
  END IF;
END $$;
