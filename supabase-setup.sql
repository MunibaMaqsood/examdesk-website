-- ExamDesk database setup. Paste this whole file into Supabase > SQL Editor > Run.
-- CHANGE the teacher code below (TEACHER-2026) to your own secret before running.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'student' check (role in ('student','teacher'))
);

create table exams (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  subject text,
  mins int not null default 30,
  pass int not null default 40,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  pos int not null,
  type text not null check (type in ('mcq','tf','short')),
  q text not null,
  options jsonb,
  answer text not null,
  marks int not null default 1
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  score int not null,
  total int not null,
  pct int not null,
  passed boolean not null,
  answers jsonb,
  submitted_at timestamptz not null default now(),
  unique (exam_id, student_id)  -- one attempt per student
);

-- New users get a profile. Only people who enter the teacher code become teachers.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, name, role) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Student'),
    case when new.raw_user_meta_data->>'teacher_code' = 'TEACHER-2026' then 'teacher' else 'student' end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function is_teacher() returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

-- Students receive questions WITHOUT the correct answers.
create function get_exam(p_exam uuid) returns json language sql security definer set search_path = public as $$
  select json_build_object('id', e.id, 'title', e.title, 'subject', e.subject, 'mins', e.mins, 'pass', e.pass,
    'questions', (select coalesce(json_agg(json_build_object('id', q.id, 'type', q.type, 'q', q.q, 'options', q.options, 'marks', q.marks) order by q.pos), '[]'::json)
                  from questions q where q.exam_id = e.id))
  from exams e where e.id = p_exam and e.published;
$$;

-- Marking happens on the server, so students cannot see or change the answers.
create function submit_attempt(p_exam uuid, p_answers jsonb) returns json language plpgsql security definer set search_path = public as $$
declare q record; ex exams%rowtype; sc int := 0; tot int := 0; rev jsonb := '[]'; ok boolean; a text; pc int;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select * into ex from exams where id = p_exam and published;
  if not found then raise exception 'Exam not found'; end if;
  for q in select * from questions where exam_id = p_exam order by pos loop
    tot := tot + q.marks;
    a := coalesce(p_answers->>(q.id::text), '');
    if q.type = 'short' then
      ok := trim(a) <> '' and exists (select 1 from unnest(string_to_array(q.answer, '|')) s where lower(trim(s)) = lower(trim(a)));
    else
      ok := (a = q.answer);
    end if;
    if ok then sc := sc + q.marks; end if;
    rev := rev || jsonb_build_array(jsonb_build_object('q', q.q, 'type', q.type, 'options', q.options, 'yours', a, 'correct', q.answer, 'ok', ok, 'marks', q.marks));
  end loop;
  pc := case when tot = 0 then 0 else round(sc * 100.0 / tot) end;
  insert into attempts(exam_id, student_id, score, total, pct, passed, answers) values (p_exam, auth.uid(), sc, tot, pc, pc >= ex.pass, p_answers);
  return json_build_object('score', sc, 'total', tot, 'pct', pc, 'passed', pc >= ex.pass, 'review', rev);
end $$;

revoke execute on function get_exam(uuid), submit_attempt(uuid, jsonb) from public, anon;
grant execute on function get_exam(uuid), submit_attempt(uuid, jsonb) to authenticated;

-- Row Level Security: who can see and change what.
alter table profiles enable row level security;
alter table exams enable row level security;
alter table questions enable row level security;
alter table attempts enable row level security;

create policy "profiles readable" on profiles for select to authenticated using (true);
create policy "exams readable" on exams for select to authenticated using (published or teacher_id = auth.uid());
create policy "teachers add exams" on exams for insert to authenticated with check (teacher_id = auth.uid() and is_teacher());
create policy "teachers edit own exams" on exams for update to authenticated using (teacher_id = auth.uid());
create policy "teachers delete own exams" on exams for delete to authenticated using (teacher_id = auth.uid());
create policy "teachers manage own questions" on questions for all to authenticated
  using (exists (select 1 from exams e where e.id = exam_id and e.teacher_id = auth.uid()))
  with check (exists (select 1 from exams e where e.id = exam_id and e.teacher_id = auth.uid()));
create policy "see own or own-exam attempts" on attempts for select to authenticated
  using (student_id = auth.uid() or exists (select 1 from exams e where e.id = exam_id and e.teacher_id = auth.uid()));
