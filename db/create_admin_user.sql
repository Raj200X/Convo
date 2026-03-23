-- Enable pgcrypto for password hashing
create extension if not exists "pgcrypto";

DO $$
DECLARE
  user_email text := 'admin@gmail.com';
  user_password text := 'pass'; -- Change if desired!
  user_name text := 'Admin';
  user_id uuid;
BEGIN
  -- Check if user exists
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;

  IF user_id IS NULL THEN
    -- Create new user
    user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      user_id,
      'authenticated',
      'authenticated',
      user_email,
      crypt(user_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name": "Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Created new user % with ID %', user_email, user_id;
  ELSE
    -- Update existing user password and confirm email
    UPDATE auth.users
    SET encrypted_password = crypt(user_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = user_id;
    
    RAISE NOTICE 'Updated password for existing user % (ID %)', user_email, user_id;
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    status_message, 
    created_at
  ) VALUES (
    user_id,
    user_email,
    user_name,
    'Signed Up',
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

END $$;
