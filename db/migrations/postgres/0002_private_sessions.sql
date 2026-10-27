-- Session state and migration metadata are server-only. InsForge grants its
-- API roles access to public tables by default, so deny them explicitly.
ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raahi_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demo_sessions, public.raahi_migrations FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.demo_sessions, public.raahi_migrations FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.demo_sessions, public.raahi_migrations FROM authenticated;
  END IF;
END $$;
