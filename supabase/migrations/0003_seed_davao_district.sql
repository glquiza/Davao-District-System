-- ============================================================================
-- 0003_seed_davao_district.sql
-- Seed Davao District and Starter Locales
-- ============================================================================

with inserted_district as (
  insert into public.districts (name, slug, description)
  values (
    'Davao District',
    'davao-district',
    'Centralized Church Programs, Activities, and Membership Management for Davao District.'
  )
  on conflict (slug) do update set name = excluded.name
  returning id
)
insert into public.locales (district_id, name, slug, address, contact_info)
select
  id,
  locale_data.name,
  locale_data.slug,
  locale_data.address,
  locale_data.contact_info
from inserted_district,
(values
  ('Davao Central Locale', 'davao-central', 'Poblacion District, Davao City', 'central.davao@example.org'),
  ('Buhangin Locale', 'buhangin', 'Buhangin, Davao City', 'buhangin.davao@example.org'),
  ('Toril Locale', 'toril', 'Toril District, Davao City', 'toril.davao@example.org'),
  ('Matina Locale', 'matina', 'Matina Crossing, Davao City', 'matina.davao@example.org'),
  ('Panabo Locale', 'panabo', 'Panabo City, Davao del Norte', 'panabo.davao@example.org')
) as locale_data(name, slug, address, contact_info)
on conflict (slug) do nothing;
