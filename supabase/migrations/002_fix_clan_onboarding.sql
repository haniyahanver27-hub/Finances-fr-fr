-- Repair clan onboarding for projects that already applied 001_initial_schema.sql.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    requested_username TEXT;
BEGIN
    requested_username := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), '');
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = requested_username) THEN
        requested_username := NULL;
    END IF;

    BEGIN
        INSERT INTO public.profiles (id, username)
        VALUES (NEW.id, COALESCE(requested_username, 'trader-' || LEFT(NEW.id::TEXT, 8)))
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
        INSERT INTO public.profiles (id, username)
        VALUES (NEW.id, 'trader-' || LEFT(NEW.id::TEXT, 8))
        ON CONFLICT (id) DO NOTHING;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.current_user_clan_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT clan_id FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.create_clan(clan_name TEXT)
RETURNS SETOF public.clans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    caller_id UUID := (SELECT auth.uid());
    clean_name TEXT := NULLIF(TRIM(clan_name), '');
    created_clan public.clans;
    affected_rows INTEGER;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    IF clean_name IS NULL OR CHAR_LENGTH(clean_name) > 60 THEN
        RAISE EXCEPTION 'Clan name must be between 1 and 60 characters';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id AND clan_id IS NOT NULL) THEN
        RAISE EXCEPTION 'You already belong to a clan';
    END IF;

    LOOP
        BEGIN
            INSERT INTO public.clans (name, invite_code)
            VALUES (clean_name, UPPER(LEFT(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 6)))
            RETURNING * INTO created_clan;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            NULL;
        END;
    END LOOP;

    UPDATE public.profiles SET clan_id = created_clan.id WHERE id = caller_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'Profile not found for authenticated user';
    END IF;

    RETURN NEXT created_clan;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_clan(invite_code_input TEXT)
RETURNS SETOF public.clans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    caller_id UUID := (SELECT auth.uid());
    clean_code TEXT := UPPER(NULLIF(TRIM(invite_code_input), ''));
    matched_clan public.clans;
    affected_rows INTEGER;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    IF clean_code IS NULL OR CHAR_LENGTH(clean_code) > 12 THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id AND clan_id IS NOT NULL) THEN
        RAISE EXCEPTION 'You already belong to a clan';
    END IF;

    SELECT * INTO matched_clan FROM public.clans WHERE invite_code = clean_code;
    IF matched_clan.id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;

    UPDATE public.profiles SET clan_id = matched_clan.id WHERE id = caller_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'Profile not found for authenticated user';
    END IF;

    RETURN NEXT matched_clan;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_clan_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_clan(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_clan(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_clan_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_clan(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_clan(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can create clans" ON public.clans;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
