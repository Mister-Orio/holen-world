-- Incremental patch for the audited holen-world schema.
-- Requires the eight existing migrations through 20261009132252.
-- This file has NOT been applied to production.
-- Keep authenticated character CRUD; room state remains accessible only through RPC.

-- Refuse to overwrite function definitions that changed after the audit.
do $baseline$
begin
 if md5(pg_get_functiondef('public.holen_room_snapshot(uuid)'::regprocedure))
      <> '7591202998aaf72e56b02a3aedaffe52'
    or md5(pg_get_functiondef('public.holen_gm_rest(uuid,text)'::regprocedure))
      <> '58483f4f4728f6f1dfe74195504cfb99' then
  raise exception 'Room function definitions differ from the audited baseline; review migration before applying';
 end if;
end
$baseline$;

revoke all privileges on table public.profiles, public.characters from public, anon;
revoke truncate, references, trigger on table public.profiles, public.characters from authenticated;

-- Include both historical and current GM health event formats in player redaction.
CREATE OR REPLACE FUNCTION public.holen_room_snapshot(p_room uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid:=auth.uid();
 v_gm boolean;
 v_hide boolean;
begin
 if v_uid is null or not public.is_room_member(p_room) then
   raise exception 'Нет доступа к комнате';
 end if;
 v_gm:=public.is_room_gm(p_room);
 select coalesce(r.hide_enemy_hp,false) into v_hide from public.rooms r where r.id=p_room;
 if not found then raise exception 'Комната не найдена'; end if;
 return jsonb_build_object(
  'room',(select to_jsonb(r) from public.rooms r where r.id=p_room),
  'members',coalesce((select jsonb_agg(to_jsonb(m) order by m.joined_at)
      from public.room_members m where m.room_id=p_room),'[]'::jsonb),
  'units',coalesce((select jsonb_agg(
        case when v_hide and not v_gm and u.owner_id is null
         then to_jsonb(u) || jsonb_build_object('hp',null,'cap',null,'max_hp',null)
         else to_jsonb(u) end order by u.created_at)
      from public.room_units u where u.room_id=p_room
        and (v_gm or not u.is_secret)
        and (v_gm or u.owner_id is not null or u.hp>0)),'[]'::jsonb),
  'requests',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at)
      from public.room_requests q where q.room_id=p_room and q.status='pending'
      and (v_gm or q.actor_id=v_uid)),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(
        to_jsonb(e) || jsonb_build_object('message',
          case when v_hide and not v_gm and (e.message like 'ГМ: %'
                    or e.message like 'ГМ нанёс урон %'
                    or e.message like 'ГМ провёл лечение:%')
               then 'ГМ изменил здоровье отряда.'
               else e.message end) order by e.id desc)
      from (select * from public.room_events where room_id=p_room order by id desc limit 20) e),'[]'::jsonb)
 );
end;$function$

-- Reject invalid input and prevent rest from modifying a closed room.
CREATE OR REPLACE FUNCTION public.holen_gm_rest(p_room uuid, p_kind text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.is_room_gm(p_room) then raise exception 'Отдых может оформить только ГМ'; end if;
 if p_kind is null or p_kind not in ('short','long') then raise exception 'Некорректный отдых'; end if;
 -- Lock the room so a concurrent close finishes either before or after rest.
 perform 1 from public.rooms where id=p_room and status='active' for update;
 if not found then raise exception 'Комната закрыта или не существует'; end if;
 if p_kind='short' then
  update public.room_units set hp=cap where room_id=p_room and owner_id is not null and hp>0;
 else
  update public.room_units set hp=max_hp,cap=max_hp,charges=case when template_key='medic' then 4 else charges end
   where room_id=p_room and owner_id is not null and hp>0;
 end if;
 insert into public.room_events(room_id,actor_id,message) values(p_room,auth.uid(),
  case when p_kind='short' then 'ГМ оформил короткий отдых.' else 'ГМ разрешил долгий отдых выжившим отрядам.' end);
end;$function$

-- CREATE OR REPLACE preserves the existing ACL; make the intended API grants explicit.
revoke all privileges on function public.holen_room_snapshot(uuid) from public, anon;
revoke all privileges on function public.holen_gm_rest(uuid, text) from public, anon;
grant execute on function public.holen_room_snapshot(uuid) to authenticated, service_role;
grant execute on function public.holen_gm_rest(uuid, text) to authenticated, service_role;
