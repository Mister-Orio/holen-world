-- Run only against an isolated copy of the audited schema AFTER applying the patch.
-- The current session must explicitly opt in with:
-- SET app.holen_allow_fixture_tests = 'yes';
-- Use postgres and stop on the first error. All fixtures are rolled back.
begin;
do $guard$
begin
 if current_setting('app.holen_allow_fixture_tests', true) is distinct from 'yes' then
  raise exception 'Fixture tests require an isolated database and explicit app.holen_allow_fixture_tests=yes';
 end if;
end
$guard$;

-- Effective privilege checks, including SQL capabilities outside RLS.
do $privileges$
declare
 v_role text;
 v_table text;
 v_privilege text;
begin
 foreach v_role in array array['anon','authenticated'] loop
  foreach v_table in array array['profiles','characters'] loop
   foreach v_privilege in array array['TRUNCATE','REFERENCES','TRIGGER'] loop
    if has_table_privilege(v_role, 'public.' || v_table, v_privilege) then
     raise exception 'Unexpected % privilege for % on %',v_privilege,v_role,v_table;
    end if;
   end loop;
  end loop;
  foreach v_table in array array['room_units','room_events'] loop
   foreach v_privilege in array array['SELECT','INSERT','UPDATE','DELETE'] loop
    if has_table_privilege(v_role,'public.' || v_table,v_privilege) then
     raise exception 'Direct room-state privilege % for % on %',v_privilege,v_role,v_table;
    end if;
   end loop;
  end loop;
 end loop;
 foreach v_table in array array['profiles','characters'] loop
  foreach v_privilege in array array['SELECT','INSERT','UPDATE','DELETE'] loop
   if has_table_privilege('anon','public.' || v_table,v_privilege) then
    raise exception 'Anonymous privilege % on %',v_privilege,v_table;
   end if;
  end loop;
 end loop;
 foreach v_privilege in array array['SELECT','INSERT','UPDATE','DELETE'] loop
  if not has_table_privilege('authenticated','public.characters',v_privilege) then
   raise exception 'Required authenticated character privilege missing: %',v_privilege;
  end if;
 end loop;
 if not has_table_privilege('authenticated','public.profiles','SELECT') then
  raise exception 'Required authenticated profile read missing';
 end if;
 if has_function_privilege('anon','public.holen_room_snapshot(uuid)','EXECUTE')
    or has_function_privilege('anon','public.holen_gm_rest(uuid,text)','EXECUTE') then
  raise exception 'Anonymous RPC execution must be denied';
 end if;
 if not has_function_privilege('authenticated','public.holen_room_snapshot(uuid)','EXECUTE')
    or not has_function_privilege('authenticated','public.holen_gm_rest(uuid,text)','EXECUTE') then
  raise exception 'Authenticated RPC execution must remain available';
 end if;
end
$privileges$;

create temporary table _holen_security_fixture (
 gm_id uuid, player_id uuid, outsider_id uuid, room_id uuid, other_room_id uuid,
 enemy_id uuid, player_unit_id uuid, character_id uuid
) on commit drop;
insert into _holen_security_fixture
select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),
       gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid();
grant select on _holen_security_fixture to authenticated, anon;

do $seed$
declare
 f pg_temp._holen_security_fixture%rowtype;
begin
 select * into f from pg_temp._holen_security_fixture;
 insert into auth.users(id,aud,role,email,raw_user_meta_data) values
 (f.gm_id,'authenticated','authenticated',
  'audit_gm_' || f.gm_id || '@example.invalid',
  jsonb_build_object('username','audit_gm_' || left(replace(f.gm_id::text,'-',''),8))),
 (f.player_id,'authenticated','authenticated',
  'audit_player_' || f.player_id || '@example.invalid',
  jsonb_build_object('username','audit_player_' || left(replace(f.player_id::text,'-',''),8))),
 (f.outsider_id,'authenticated','authenticated',
  'audit_other_' || f.outsider_id || '@example.invalid',
  jsonb_build_object('username','audit_other_' || left(replace(f.outsider_id::text,'-',''),8)));

 insert into public.characters(id,owner_id,pack_key,name,sheet_data)
 values(f.character_id,f.player_id,'insects','Audit scout','{"templateId":"scout"}'::jsonb);
 insert into public.rooms(id,owner_id,invite_code,name,pack_key,hide_enemy_hp) values
 (f.room_id,f.gm_id,'TEST-' || replace(f.room_id::text,'-',''),'Audit main','insects',true),
 (f.other_room_id,f.outsider_id,'TEST-' || replace(f.other_room_id::text,'-',''),'Audit other','insects',false);
 insert into public.room_members(room_id,user_id,role,display_name) values
 (f.room_id,f.gm_id,'gm','Audit GM'),
 (f.room_id,f.player_id,'player','Audit player'),
 (f.other_room_id,f.outsider_id,'gm','Audit other GM');
 insert into public.room_units(id,room_id,owner_id,character_id,template_key,name,
    hp,cap,max_hp,armor_class,speed,per_ant,footprint_w,footprint_h) values
 (f.enemy_id,f.room_id,null,null,'red-titan','Audit enemy',7,32,32,15,2,32,2,2),
 (f.player_unit_id,f.room_id,f.player_id,f.character_id,'scout','Audit scout',4,6,6,13,6,2,1,1);
 insert into public.room_events(room_id,actor_id,message) values
 (f.room_id,f.gm_id,'ГМ: -3 ОЗ «Audit enemy» (7/32).'),
 (f.room_id,f.gm_id,'ГМ нанёс урон 3 ОЗ «Audit enemy» (7/32).'),
 (f.room_id,f.gm_id,'ГМ провёл лечение: +1 ОЗ «Audit enemy» (8/32).'),
 (f.room_id,f.gm_id,'ГМ добавил существо «Audit enemy» (2×2).');
end
$seed$;

set local role authenticated;
do $authenticated_checks$
declare
 f pg_temp._holen_security_fixture%rowtype;
 v_snapshot jsonb;
 v_unit jsonb;
 v_denied boolean;
 v_count integer;
 v_kind text;
begin
 select * into f from pg_temp._holen_security_fixture;

 -- Player: masked enemy values and all three health event formats.
 perform set_config('request.jwt.claim.sub',f.player_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.player_id,'role','authenticated')::text,true);
 v_snapshot := public.holen_room_snapshot(f.room_id);
 select value into v_unit from jsonb_array_elements(v_snapshot->'units')
 where value->>'id'=f.enemy_id::text;
 if v_unit is null
    or v_unit->'hp' is distinct from 'null'::jsonb
    or v_unit->'cap' is distinct from 'null'::jsonb
    or v_unit->'max_hp' is distinct from 'null'::jsonb then
  raise exception 'Player received hidden enemy health';
 end if;
 select count(*) into v_count from jsonb_array_elements(v_snapshot->'events')
 where value->>'message'='ГМ изменил здоровье отряда.';
 if v_count<>3 then raise exception 'Expected 3 masked health events, got %',v_count;end if;
 if exists(select 1 from jsonb_array_elements(v_snapshot->'events')
           where value->>'message' ~ '\([0-9]+/[0-9]+\)') then
  raise exception 'Numeric enemy health leaked through player events';
 end if;
 if not exists(select 1 from jsonb_array_elements(v_snapshot->'events')
               where value->>'message'='ГМ добавил существо «Audit enemy» (2×2).') then
  raise exception 'Non-health event was unexpectedly masked';
 end if;

 -- Owner can edit their character; player cannot see another room or become GM.
 select count(*) into v_count from public.characters where id=f.character_id;
 if v_count<>1 then raise exception 'Owner character read failed';end if;
 update public.characters set name='Audit renamed' where id=f.character_id;
 select count(*) into v_count from public.characters where id=f.character_id and name='Audit renamed';
 if v_count<>1 then raise exception 'Owner character update failed';end if;
 if exists(select 1 from public.rooms where id=f.other_room_id) then
  raise exception 'RLS exposed another room';
 end if;
 v_denied:=false;
 begin
  perform public.holen_gm_rest(f.room_id,'short');
 exception when sqlstate 'P0001' then v_denied:=true;
 end;
 if not v_denied then raise exception 'Player executed GM rest';end if;
 v_denied:=false;
 begin
  perform public.holen_gm_adjust(f.room_id,f.enemy_id,-1);
 exception when sqlstate 'P0001' then v_denied:=true;
 end;
 if not v_denied then raise exception 'Player executed GM health adjustment';end if;
 v_denied:=false;
 begin
  perform public.holen_gm_close(f.room_id);
 exception when sqlstate 'P0001' then v_denied:=true;
 end;
 if not v_denied then raise exception 'Player closed room';end if;
 v_denied:=false;
 begin
  execute 'select 1 from public.room_units limit 1';
 exception when insufficient_privilege then v_denied:=true;
 end;
 if not v_denied then raise exception 'Player read direct room_units';end if;
 v_denied:=false;
 begin
  execute 'select 1 from public.room_events limit 1';
 exception when insufficient_privilege then v_denied:=true;
 end;
 if not v_denied then raise exception 'Player read direct room_events';end if;

 -- GM retains full journal and full enemy health, even with hide enabled.
 perform set_config('request.jwt.claim.sub',f.gm_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.gm_id,'role','authenticated')::text,true);
 v_snapshot:=public.holen_room_snapshot(f.room_id);
 select value into v_unit from jsonb_array_elements(v_snapshot->'units')
 where value->>'id'=f.enemy_id::text;
 if (v_unit->>'hp')::integer is distinct from 7 then
  raise exception 'GM lost access to enemy health';
 end if;
 select count(*) into v_count from jsonb_array_elements(v_snapshot->'events')
 where value->>'message' ~ '\([0-9]+/[0-9]+\)';
 if v_count<>3 then raise exception 'GM health events were unexpectedly masked';end if;

 -- A real GM adjustment emits the current format and must also be masked.
 perform public.holen_gm_adjust(f.room_id,f.enemy_id,-1);
 perform set_config('request.jwt.claim.sub',f.player_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.player_id,'role','authenticated')::text,true);
 v_snapshot:=public.holen_room_snapshot(f.room_id);
 if exists(select 1 from jsonb_array_elements(v_snapshot->'events')
           where value->>'message' ~ '\([0-9]+/[0-9]+\)') then
  raise exception 'Real gm_adjust event exposed numeric health';
 end if;
 select count(*) into v_count from jsonb_array_elements(v_snapshot->'events')
 where value->>'message'='ГМ изменил здоровье отряда.';
 if v_count<>4 then raise exception 'Real adjustment event was not masked';end if;
 perform set_config('request.jwt.claim.sub',f.gm_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.gm_id,'role','authenticated')::text,true);

 -- With hide disabled a player can see the existing full events.
 perform public.holen_gm_enemy_hp_visibility(f.room_id,false);
 perform set_config('request.jwt.claim.sub',f.player_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.player_id,'role','authenticated')::text,true);
 v_snapshot:=public.holen_room_snapshot(f.room_id);
 select count(*) into v_count from jsonb_array_elements(v_snapshot->'events')
 where value->>'message' ~ '\([0-9]+/[0-9]+\)';
 if v_count<>4 then raise exception 'Visible player health events were masked';end if;

 -- Another room's GM is still an outsider to this room.
 perform set_config('request.jwt.claim.sub',f.outsider_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.outsider_id,'role','authenticated')::text,true);
 if exists(select 1 from public.characters where id=f.character_id) then
  raise exception 'RLS exposed another owner character';
 end if;
 update public.characters set name='Unauthorized rename' where id=f.character_id;
 get diagnostics v_count=row_count;
 if v_count<>0 then raise exception 'Outsider updated another owner character';end if;
 v_denied:=false;
 begin
  perform public.holen_room_snapshot(f.room_id);
 exception when sqlstate 'P0001' then v_denied:=true;
 end;
 if not v_denied then raise exception 'Outsider obtained room snapshot';end if;
 v_denied:=false;
 begin
  perform public.holen_gm_rest(f.room_id,'long');
 exception when sqlstate 'P0001' then v_denied:=true;
 end;
 if not v_denied then raise exception 'Other room GM executed rest';end if;

 -- Existing active-room rest still works, but NULL never means long rest.
 perform set_config('request.jwt.claim.sub',f.gm_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.gm_id,'role','authenticated')::text,true);
 foreach v_kind in array array[null::text,'invalid'] loop
  v_denied:=false;
  begin
   perform public.holen_gm_rest(f.room_id,v_kind);
  exception when sqlstate 'P0001' then v_denied:=true;
  end;
  if not v_denied then raise exception 'Invalid rest kind accepted';end if;
 end loop;
 perform public.holen_gm_rest(f.room_id,'short');
 v_snapshot:=public.holen_room_snapshot(f.room_id);
 select value into v_unit from jsonb_array_elements(v_snapshot->'units')
 where value->>'id'=f.player_unit_id::text;
 if (v_unit->>'hp')::integer is distinct from 6 then
  raise exception 'Active short rest did not restore survivors';
 end if;
 perform public.holen_gm_adjust(f.room_id,f.player_unit_id,-1);
 perform public.holen_gm_rest(f.room_id,'long');
 v_snapshot:=public.holen_room_snapshot(f.room_id);
 select value into v_unit from jsonb_array_elements(v_snapshot->'units')
 where value->>'id'=f.player_unit_id::text;
 if (v_unit->>'hp')::integer is distinct from 6 then
  raise exception 'Active long rest did not restore survivors';
 end if;

 -- Closing the room makes both kinds of rest fail without changing health.
 perform public.holen_gm_adjust(f.room_id,f.player_unit_id,-1);
 perform public.holen_gm_close(f.room_id);
 foreach v_kind in array array['short','long'] loop
  v_denied:=false;
  begin
   perform public.holen_gm_rest(f.room_id,v_kind);
  exception when sqlstate 'P0001' then v_denied:=true;
  end;
  if not v_denied then raise exception 'Closed room accepted % rest',v_kind;end if;
 end loop;
 v_snapshot:=public.holen_room_snapshot(f.room_id);
 select value into v_unit from jsonb_array_elements(v_snapshot->'units')
 where value->>'id'=f.player_unit_id::text;
 if (v_unit->>'hp')::integer is distinct from 5 then
  raise exception 'Health changed after room close';
 end if;
end
$authenticated_checks$;

set local role anon;
do $anon_checks$
declare
 f pg_temp._holen_security_fixture%rowtype;
 v_denied boolean:=false;
begin
 select * into f from pg_temp._holen_security_fixture;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 begin
  perform public.holen_room_snapshot(f.room_id);
 exception when insufficient_privilege then v_denied:=true;
 end;
 if not v_denied then raise exception 'Anonymous snapshot execution was allowed';end if;
end
$anon_checks$;
reset role;
rollback;
