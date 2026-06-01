alter table public.appointments
  add column if not exists assigned_to uuid references auth.users(id);
