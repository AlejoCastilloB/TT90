-- TT90 — esquema inicial
-- Ejecutar completo en Supabase SQL Editor

create extension if not exists "pgcrypto";

-- ============= PROFILES =============
-- El id del perfil ES el "link de recuperación" (?p=uuid)
create table profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  instagram text,
  email text,
  start_date date not null default current_date, -- día 1
  current_streak int not null default 0,
  longest_streak int not null default 0,
  newsletter_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============= OBJETIVOS SMART (3 por perfil) =============
create table objectives (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  slot int not null check (slot between 1 and 3),
  text text not null default '',
  unique (profile_id, slot)
);

-- ============= NO NEGOCIABLES =============
create table non_negotiables (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  icon text not null default '✓',
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============= REGISTROS DIARIOS =============
create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  log_date date not null,
  day_number int not null, -- día 1, 2, 3... relativo a start_date
  completed_all boolean not null default false,
  closed boolean not null default false, -- true cuando ya no es "hoy"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, log_date)
);

-- ============= ITEMS DE CADA REGISTRO (uno por no-negociable) =============
create table daily_log_items (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  non_negotiable_id uuid not null references non_negotiables(id) on delete cascade,
  done boolean not null default false,
  note text,
  unique (daily_log_id, non_negotiable_id)
);

create index idx_daily_logs_profile_date on daily_logs(profile_id, log_date desc);
create index idx_nn_profile on non_negotiables(profile_id);

-- ============= RLS =============
-- Modelo de seguridad: el "link único" (uuid del profile) actúa como contraseña.
-- Cualquiera con el id puede leer/escribir SOLO los datos de ese profile_id.
-- Es el mismo modelo que 60-dificil. No hay auth de Supabase tradicional.
alter table profiles enable row level security;
alter table objectives enable row level security;
alter table non_negotiables enable row level security;
alter table daily_logs enable row level security;
alter table daily_log_items enable row level security;

-- Lectura/escritura abiertas vía anon key (la "seguridad" es no compartir el link).
-- Si más adelante querés más estricto, esto se reemplaza por Supabase Auth real.
create policy "anon all profiles" on profiles for all using (true) with check (true);
create policy "anon all objectives" on objectives for all using (true) with check (true);
create policy "anon all nn" on non_negotiables for all using (true) with check (true);
create policy "anon all logs" on daily_logs for all using (true) with check (true);
create policy "anon all log items" on daily_log_items for all using (true) with check (true);

-- ============= FUNCIÓN: crear perfil con no-negociables y objetivos por defecto =============
create or replace function create_profile(
  p_name text,
  p_instagram text,
  p_email text,
  p_newsletter boolean
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into profiles (name, instagram, email, newsletter_opt_in)
  values (p_name, nullif(p_instagram,''), nullif(p_email,''), p_newsletter)
  returning id into v_id;

  insert into non_negotiables (profile_id, name, icon, sort_order) values
    (v_id, 'Entrenamiento', '💪', 1),
    (v_id, 'Alimentación saludable', '🥗', 2),
    (v_id, 'Pasos diarios', '🚶', 3),
    (v_id, 'Meditación / oración', '🧘', 4),
    (v_id, 'Afirmación positiva', '✨', 5);

  insert into objectives (profile_id, slot, text) values
    (v_id, 1, ''), (v_id, 2, ''), (v_id, 3, '');

  return v_id;
end;
$$;

-- ============= FUNCIÓN: obtener o crear el registro de HOY =============
-- day_number se calcula en base a start_date. Si hoy < start_date no debería pasar.
create or replace function get_or_create_today_log(p_profile_id uuid)
returns table (
  log_id uuid,
  day_number int,
  log_date date,
  completed_all boolean
)
language plpgsql
as $$
declare
  v_start date;
  v_today date := current_date;
  v_day_number int;
  v_log_id uuid;
  v_completed boolean;
begin
  select start_date into v_start from profiles where id = p_profile_id;
  if v_start is null then
    raise exception 'profile not found';
  end if;

  v_day_number := (v_today - v_start) + 1;

  -- cerrar cualquier log anterior que haya quedado abierto (no es hoy)
  update daily_logs
  set closed = true
  where profile_id = p_profile_id and log_date < v_today and closed = false;

  select id, completed_all into v_log_id, v_completed
  from daily_logs
  where profile_id = p_profile_id and log_date = v_today;

  if v_log_id is null then
    insert into daily_logs (profile_id, log_date, day_number)
    values (p_profile_id, v_today, v_day_number)
    returning id, completed_all into v_log_id, v_completed;

    insert into daily_log_items (daily_log_id, non_negotiable_id)
    select v_log_id, id from non_negotiables
    where profile_id = p_profile_id and enabled = true;
  end if;

  return query select v_log_id, v_day_number, v_today, v_completed;
end;
$$;

-- ============= FUNCIÓN: togglear un item del día de HOY (bloquea otros días) =============
create or replace function toggle_log_item(
  p_log_item_id uuid,
  p_done boolean,
  p_note text default null
) returns void
language plpgsql
as $$
declare
  v_log_date date;
  v_log_id uuid;
  v_profile_id uuid;
  v_all_done boolean;
begin
  select dl.log_date, dl.id, dl.profile_id
  into v_log_date, v_log_id, v_profile_id
  from daily_log_items dli
  join daily_logs dl on dl.id = dli.daily_log_id
  where dli.id = p_log_item_id;

  if v_log_date is null then
    raise exception 'item not found';
  end if;

  if v_log_date <> current_date then
    raise exception 'solo se puede editar el día de hoy';
  end if;

  update daily_log_items
  set done = p_done, note = coalesce(p_note, note)
  where id = p_log_item_id;

  select bool_and(done) into v_all_done
  from daily_log_items
  where daily_log_id = v_log_id;

  update daily_logs
  set completed_all = coalesce(v_all_done, false), updated_at = now()
  where id = v_log_id;

  -- recalcular racha
  perform recalc_streak(v_profile_id);
end;
$$;

-- ============= FUNCIÓN: recalcular racha (consecutiva, terminando hoy o ayer) =============
create or replace function recalc_streak(p_profile_id uuid)
returns void
language plpgsql
as $$
declare
  v_streak int := 0;
  v_longest int;
  r record;
  v_expected_date date := current_date;
begin
  for r in
    select log_date, completed_all
    from daily_logs
    where profile_id = p_profile_id
    order by log_date desc
  loop
    -- el día de hoy puede estar incompleto todavía sin romper la racha pasada
    if r.log_date = current_date and not r.completed_all then
      v_expected_date := current_date - 1;
      continue;
    end if;

    if r.log_date <> v_expected_date then
      exit;
    end if;

    if not r.completed_all then
      exit;
    end if;

    v_streak := v_streak + 1;
    v_expected_date := v_expected_date - 1;
  end loop;

  select greatest(coalesce(longest_streak,0), v_streak) into v_longest
  from profiles where id = p_profile_id;

  update profiles
  set current_streak = v_streak, longest_streak = v_longest
  where id = p_profile_id;
end;
$$;
