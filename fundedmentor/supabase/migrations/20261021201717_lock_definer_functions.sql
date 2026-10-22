-- Exported from the live project (supabase_migrations.schema_migrations) on 2026-10-22.
revoke execute on function public.is_pro(uuid) from public, anon, authenticated;
grant execute on function public.is_pro(uuid) to service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
