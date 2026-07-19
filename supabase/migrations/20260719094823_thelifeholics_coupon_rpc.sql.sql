/*
# Coupon usage increment RPC

Adds an atomic increment function for coupon usage tracking. Safe to re-run.
*/
create or replace function public.increment_coupon_uses(code_name text)
returns void
language sql
security definer
as $$
  update public.coupons
  set uses = uses + 1
  where code = upper(code_name) and active = true;
$$;
