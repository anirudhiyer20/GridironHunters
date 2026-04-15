update public.players
set is_active = false
where source = 'seed'
  and exists (
    select 1
    from public.players imported
    where imported.source = 'fantasycalc'
      and imported.is_active = true
  );
