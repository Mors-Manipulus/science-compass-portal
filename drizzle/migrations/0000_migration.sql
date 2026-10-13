-- ===== Enums =====
create type public.app_role as enum ('owner','admin');
create type public.pub_status as enum ('draft','in_review','published','archived');
create type public.pub_visibility as enum ('public','private');

-- ===== Shared trigger =====
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ===== Roles =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('owner','admin'))
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "owners read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'owner'));

create or replace function public.owner_exists() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'owner')
$$;
create or replace function public.claim_initial_owner() returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform pg_advisory_xact_lock(424242);
  if exists (select 1 from public.user_roles where role = 'owner') then return false; end if;
  insert into public.user_roles (user_id, role, granted_by) values (auth.uid(), 'owner', auth.uid());
  return true;
end $$;
create or replace function public.grant_admin(_email text) returns void language plpgsql security definer set search_path = public as $$
declare _uid uuid;
begin
  if not public.has_role(auth.uid(),'owner') then raise exception 'Only the owner can grant admin access'; end if;
  select id into _uid from auth.users where lower(email) = lower(trim(_email));
  if _uid is null then raise exception 'No account exists for that email. Ask them to create an account first.'; end if;
  insert into public.user_roles (user_id, role, granted_by) values (_uid, 'admin', auth.uid()) on conflict do nothing;
end $$;
create or replace function public.revoke_admin(_user_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'owner') then raise exception 'Only the owner can revoke admin access'; end if;
  delete from public.user_roles where user_id = _user_id and role = 'admin';
end $$;
create or replace function public.list_staff() returns table(user_id uuid, email text, role public.app_role, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorised'; end if;
  return query select ur.user_id, u.email::text, ur.role, ur.created_at from public.user_roles ur join auth.users u on u.id = ur.user_id order by ur.role, ur.created_at;
end $$;
revoke execute on function public.claim_initial_owner() from anon, public;
revoke execute on function public.grant_admin(text) from anon, public;
revoke execute on function public.revoke_admin(uuid) from anon, public;
revoke execute on function public.list_staff() from anon, public;
grant execute on function public.claim_initial_owner() to authenticated;
grant execute on function public.grant_admin(text) to authenticated;
grant execute on function public.revoke_admin(uuid) to authenticated;
grant execute on function public.list_staff() to authenticated;
grant execute on function public.owner_exists() to anon, authenticated;

-- ===== Divisions =====
create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  short_name text not null,
  tagline text not null default '',
  description text not null default '',
  focus_areas text[] not null default '{}',
  lead_name text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.divisions to anon, authenticated;
grant insert, update, delete on public.divisions to authenticated;
grant all on public.divisions to service_role;
alter table public.divisions enable row level security;
create policy "public read active divisions" on public.divisions for select using (active or public.is_staff(auth.uid()));
create policy "staff write divisions" on public.divisions for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger trg_div_upd before update on public.divisions for each row execute function public.touch_updated_at();

-- ===== Researchers =====
create table public.researchers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  role_title text not null default '',
  bio text not null default '',
  photo_url text,
  affiliations text[] not null default '{}',
  interests text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index researchers_name_uq on public.researchers (lower(name));
grant select on public.researchers to anon, authenticated;
grant insert, update, delete on public.researchers to authenticated;
grant all on public.researchers to service_role;
alter table public.researchers enable row level security;
create policy "public read active researchers" on public.researchers for select using (active or public.is_staff(auth.uid()));
create policy "staff write researchers" on public.researchers for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger trg_res_upd before update on public.researchers for each row execute function public.touch_updated_at();

create table public.researcher_divisions (
  researcher_id uuid not null references public.researchers(id) on delete cascade,
  division_id uuid not null references public.divisions(id) on delete restrict,
  primary key (researcher_id, division_id)
);
grant select on public.researcher_divisions to anon, authenticated;
grant insert, update, delete on public.researcher_divisions to authenticated;
grant all on public.researcher_divisions to service_role;
alter table public.researcher_divisions enable row level security;
create policy "public read researcher divisions" on public.researcher_divisions for select using (true);
create policy "staff write researcher divisions" on public.researcher_divisions for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ===== Import batches (referenced by publications) =====
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  file_name text,
  format text not null check (format in ('csv','json')),
  status text not null default 'committed' check (status in ('committed','partial','failed','rolled_back')),
  total int not null default 0,
  inserted int not null default 0,
  skipped int not null default 0,
  rejected int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.import_batches to authenticated;
grant all on public.import_batches to service_role;
alter table public.import_batches enable row level security;
create policy "staff manage import batches" on public.import_batches for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ===== Publications =====
create table public.publications (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (length(trim(title)) > 0),
  abstract text not null default '',
  pub_date date,
  year int,
  venue text,
  doi text,
  status public.pub_status not null default 'draft',
  visibility public.pub_visibility not null default 'public',
  featured boolean not null default false,
  pdf_path text unique,
  pdf_name text,
  pdf_size bigint,
  source_system text,
  source_id text,
  import_batch_id uuid references public.import_batches(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, source_id)
);
create unique index publications_doi_uq on public.publications (lower(doi)) where doi is not null;
create index publications_status_idx on public.publications (status, visibility, year desc);
create or replace function public.pub_set_year() returns trigger language plpgsql set search_path = public as $$
begin if new.pub_date is not null then new.year = extract(year from new.pub_date)::int; end if; return new; end $$;
create trigger trg_pub_year before insert or update on public.publications for each row execute function public.pub_set_year();
create trigger trg_pub_upd before update on public.publications for each row execute function public.touch_updated_at();
grant select on public.publications to anon, authenticated;
grant insert, update, delete on public.publications to authenticated;
grant all on public.publications to service_role;
alter table public.publications enable row level security;
create policy "public read published publications" on public.publications for select using ((status = 'published' and visibility = 'public') or public.is_staff(auth.uid()));
create policy "staff write publications" on public.publications for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create or replace function public.is_public_publication(_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.publications where id = _id and status = 'published' and visibility = 'public')
$$;

create table public.publication_authors (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  position int not null,
  author_name text not null,
  researcher_id uuid references public.researchers(id) on delete restrict,
  unique (publication_id, position)
);
create index pub_authors_researcher_idx on public.publication_authors (researcher_id);
grant select on public.publication_authors to anon, authenticated;
grant insert, update, delete on public.publication_authors to authenticated;
grant all on public.publication_authors to service_role;
alter table public.publication_authors enable row level security;
create policy "public read authors of public pubs" on public.publication_authors for select using (public.is_public_publication(publication_id) or public.is_staff(auth.uid()));
create policy "staff write authors" on public.publication_authors for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.publication_divisions (
  publication_id uuid not null references public.publications(id) on delete cascade,
  division_id uuid not null references public.divisions(id) on delete restrict,
  primary key (publication_id, division_id)
);
grant select on public.publication_divisions to anon, authenticated;
grant insert, update, delete on public.publication_divisions to authenticated;
grant all on public.publication_divisions to service_role;
alter table public.publication_divisions enable row level security;
create policy "public read divisions of public pubs" on public.publication_divisions for select using (public.is_public_publication(publication_id) or public.is_staff(auth.uid()));
create policy "staff write pub divisions" on public.publication_divisions for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ===== Import records =====
create table public.import_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_number int not null,
  source_id text,
  title text,
  outcome text not null check (outcome in ('inserted','duplicate','rejected','error')),
  message text,
  publication_id uuid references public.publications(id) on delete set null,
  raw jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.import_records to authenticated;
grant all on public.import_records to service_role;
alter table public.import_records enable row level security;
create policy "staff manage import records" on public.import_records for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ===== Projects =====
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text not null default '',
  description text not null default '',
  status text not null default 'active' check (status in ('planned','active','completed')),
  start_year int,
  image_url text,
  links jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_proj_upd before update on public.projects for each row execute function public.touch_updated_at();
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "public read published projects" on public.projects for select using (published or public.is_staff(auth.uid()));
create policy "staff write projects" on public.projects for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.project_divisions (
  project_id uuid not null references public.projects(id) on delete cascade,
  division_id uuid not null references public.divisions(id) on delete restrict,
  primary key (project_id, division_id)
);
create table public.project_researchers (
  project_id uuid not null references public.projects(id) on delete cascade,
  researcher_id uuid not null references public.researchers(id) on delete restrict,
  primary key (project_id, researcher_id)
);
grant select on public.project_divisions, public.project_researchers to anon, authenticated;
grant insert, update, delete on public.project_divisions, public.project_researchers to authenticated;
grant all on public.project_divisions, public.project_researchers to service_role;
alter table public.project_divisions enable row level security;
alter table public.project_researchers enable row level security;
create policy "read project divisions" on public.project_divisions for select using (exists (select 1 from public.projects p where p.id = project_id));
create policy "staff write project divisions" on public.project_divisions for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "read project researchers" on public.project_researchers for select using (exists (select 1 from public.projects p where p.id = project_id));
create policy "staff write project researchers" on public.project_researchers for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ===== News =====
create table public.news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text not null default '',
  body text not null default '',
  image_url text,
  published_at timestamptz not null default now(),
  published boolean not null default false,
  division_id uuid references public.divisions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_news_upd before update on public.news for each row execute function public.touch_updated_at();
grant select on public.news to anon, authenticated;
grant insert, update, delete on public.news to authenticated;
grant all on public.news to service_role;
alter table public.news enable row level security;
create policy "public read published news" on public.news for select using ((published and published_at <= now()) or public.is_staff(auth.uid()));
create policy "staff write news" on public.news for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ===== Storage policies (bucket created separately, private) =====
create policy "pdf read: staff or published" on storage.objects for select
  using (bucket_id = 'publication-pdfs' and (public.is_staff(auth.uid()) or exists (
    select 1 from public.publications p where p.pdf_path = storage.objects.name and p.status = 'published' and p.visibility = 'public')));
create policy "pdf insert: staff" on storage.objects for insert to authenticated with check (bucket_id = 'publication-pdfs' and public.is_staff(auth.uid()));
create policy "pdf update: staff" on storage.objects for update to authenticated using (bucket_id = 'publication-pdfs' and public.is_staff(auth.uid()));
create policy "pdf delete: staff" on storage.objects for delete to authenticated using (bucket_id = 'publication-pdfs' and public.is_staff(auth.uid()));

-- ===================== SAMPLE SEED DATA =====================
insert into public.divisions (slug,name,short_name,tagline,description,focus_areas,lead_name,sort_order) values
('ai','BlackSeaShark5 AI','AI','Reasoning, scaling & evaluation','The AI division studies how large models reason, how capability scales with compute and data, and how to evaluate systems honestly before they are deployed.',array['Multi-step reasoning','Scaling laws','Evaluation & benchmarks','Alignment & interpretability'],'Dr. Ada Reyes',1),
('quantum','BlackSeaShark5 Quantum','Quantum','Computing, sensing & cryptography','The Quantum division builds error-corrected computing primitives, quantum sensors for biology and materials, and cryptography that survives the quantum transition.',array['Quantum error correction','Quantum sensing','Post-quantum cryptography','Hybrid algorithms'],'Dr. Igor Demidov',2),
('medical','BlackSeaShark5 Medical','Medical','Diagnostics, genomics & therapeutics','The Medical division develops diagnostic models, single-cell genomics tools and therapeutic discovery pipelines with clinical partners.',array['AI diagnostics','Single-cell genomics','Therapeutic discovery','Clinical validation'],'Dr. Hannah Berg',3),
('neuro','BlackSeaShark5 Neuro / BCI','Neuro / BCI','Neural interfaces & brain mapping','The Neuro / BCI division designs high-density neural interfaces, decoding algorithms and large-scale brain mapping methods.',array['Neural decoding','Implantable electrodes','Connectomics','Closed-loop stimulation'],'Dr. Nadia Hassan',4),
('robotics','BlackSeaShark5 Robotics','Robotics','Manipulation, locomotion & autonomy','The Robotics division works on dexterous manipulation, legged locomotion and shared autonomy for real-world, safety-critical settings.',array['Dexterous manipulation','Legged locomotion','Shared autonomy','Sim-to-real transfer'],'Dr. Maria Voss',5),
('chip','BlackSeaShark5 Chip','Chip','Silicon, photonics & neuromorphic design','The Chip division designs custom silicon, photonic accelerators and neuromorphic cores that make the other divisions'' research run faster and more efficiently.',array['AI accelerators','Silicon photonics','Neuromorphic computing','Secure hardware'],'Dr. Pavel Novak',6);

insert into public.researchers (slug,name,role_title,bio,interests) values
('ada-reyes','Dr. Ada Reyes','Division Lead, AI','Leads the AI division with a focus on compute-optimal training and rigorous evaluation of reasoning systems.',array['Scaling laws','Reasoning','Evaluation']),
('kenji-watanabe','Dr. Kenji Watanabe','Senior Research Scientist','Works on search-augmented reasoning and learned decoders for scientific problems.',array['Reasoning','Search','Decoders']),
('priya-raman','Dr. Priya Raman','Research Scientist','Bridges language modelling and neural decoding, building sequence models for brain signals.',array['Sequence models','Neural decoding']),
('lucas-almeida','Lucas Almeida','Research Engineer','Builds evaluation infrastructure and contamination-detection tooling.',array['Benchmarks','Data provenance']),
('sofia-marchetti','Dr. Sofia Marchetti','Research Scientist','Studies uncertainty estimation and calibration for autonomous agents.',array['Uncertainty','Agents','Calibration']),
('daniel-okafor','Daniel Okafor','PhD Researcher','Researches sparse reward models and mechanistic interpretability.',array['Interpretability','Alignment']),
('noor-siddiqui','Dr. Noor Siddiqui','Research Scientist','Applies foundation models to medical imaging in low-resource settings.',array['Medical imaging','Foundation models']),
('igor-demidov','Dr. Igor Demidov','Division Lead, Quantum','Leads the Quantum division and its fault-tolerance roadmap.',array['Error correction','Fault tolerance']),
('elena-petrova','Dr. Elena Petrova','Senior Research Scientist','Designs real-time decoders for topological codes.',array['Surface codes','Decoding']),
('tomas-lindqvist','Dr. Tomas Lindqvist','Research Scientist','Develops NV-centre magnetometers for biomedical imaging.',array['Quantum sensing','Magnetometry']),
('amara-nwosu','Amara Nwosu','Research Engineer','Builds cryogenic and optical control systems.',array['Control systems','Optics']),
('felix-brandt','Dr. Felix Brandt','Research Scientist','Works on post-quantum cryptography and hardware side channels.',array['Lattice cryptography','Side channels']),
('hannah-berg','Dr. Hannah Berg','Division Lead, Medical','Leads the Medical division and its clinical partnerships.',array['Diagnostics','Clinical AI']),
('rahul-mehta','Dr. Rahul Mehta','Clinical Research Scientist','Ophthalmologist and researcher validating AI screening tools in clinics.',array['Ophthalmology','Clinical validation']),
('chloe-dubois','Dr. Chloé Dubois','Senior Research Scientist','Computational biologist studying tumour microenvironments.',array['Single-cell genomics','Oncology']),
('samuel-adeyemi','Samuel Adeyemi','PhD Researcher','Develops statistical methods for single-cell atlases.',array['Statistics','Genomics']),
('ingrid-holm','Dr. Ingrid Holm','Research Scientist','Works on therapeutic target discovery from multi-omic data.',array['Drug discovery','Multi-omics']),
('nadia-hassan','Dr. Nadia Hassan','Division Lead, Neuro / BCI','Leads the Neuro / BCI division, focused on speech neuroprostheses.',array['BCI','Speech decoding']),
('mateo-ruiz','Dr. Mateo Ruiz','Research Scientist','Neurosurgeon-scientist studying cortical speech representations.',array['ECoG','Speech']),
('yuki-tanaka','Dr. Yuki Tanaka','Senior Research Scientist','Materials scientist building flexible neural electrodes and soft robot skins.',array['Flexible electronics','Materials']),
('leila-farouk','Leila Farouk','Research Engineer','Fabricates and characterises implantable microelectrode arrays.',array['Microfabrication','Biocompatibility']),
('owen-gallagher','Dr. Owen Gallagher','Research Scientist','Builds pipelines for large-scale connectome reconstruction.',array['Connectomics','Imaging']),
('maria-voss','Dr. Maria Voss','Division Lead, Robotics','Leads the Robotics division across manipulation and autonomy.',array['Manipulation','Autonomy']),
('arjun-nair','Dr. Arjun Nair','Senior Research Scientist','Works on tactile sensing and learned control policies.',array['Tactile sensing','Policy learning']),
('freya-jensen','Dr. Freya Jensen','Research Scientist','Researches shared autonomy for surgical and assistive robots.',array['Shared autonomy','Surgical robotics']),
('diego-castillo','Diego Castillo','Research Engineer','Builds legged robot hardware and simulation pipelines.',array['Legged robots','Simulation']),
('hana-kim','Dr. Hana Kim','Research Scientist','Studies robust locomotion and embodied reasoning benchmarks.',array['Locomotion','Embodied AI']),
('pavel-novak','Dr. Pavel Novak','Division Lead, Chip','Leads the Chip division and its photonic accelerator programme.',array['Accelerators','Photonics']),
('meera-iyer','Dr. Meera Iyer','Senior Research Scientist','Designs secure and photonic hardware architectures.',array['Hardware security','Architecture']),
('jonas-weber','Dr. Jonas Weber','Research Scientist','Photonic integrated circuit designer.',array['Silicon photonics','PIC design']),
('zara-ahmed','Zara Ahmed','Research Engineer','Mixed-signal circuit designer for neural recording front-ends.',array['Mixed-signal','Low-power circuits']),
('viktor-sokolov','Dr. Viktor Sokolov','Research Scientist','Designs event-driven neuromorphic processors.',array['Neuromorphic','Spiking networks']);

insert into public.researcher_divisions (researcher_id, division_id)
select r.id, d.id from (values
('ada-reyes','ai'),('kenji-watanabe','ai'),('priya-raman','ai'),('priya-raman','neuro'),('lucas-almeida','ai'),('sofia-marchetti','ai'),('daniel-okafor','ai'),('noor-siddiqui','ai'),('noor-siddiqui','medical'),
('igor-demidov','quantum'),('elena-petrova','quantum'),('tomas-lindqvist','quantum'),('amara-nwosu','quantum'),('felix-brandt','quantum'),
('hannah-berg','medical'),('rahul-mehta','medical'),('chloe-dubois','medical'),('samuel-adeyemi','medical'),('ingrid-holm','medical'),
('nadia-hassan','neuro'),('mateo-ruiz','neuro'),('yuki-tanaka','neuro'),('yuki-tanaka','robotics'),('leila-farouk','neuro'),('owen-gallagher','neuro'),
('maria-voss','robotics'),('arjun-nair','robotics'),('arjun-nair','ai'),('freya-jensen','robotics'),('diego-castillo','robotics'),('hana-kim','robotics'),
('pavel-novak','chip'),('meera-iyer','chip'),('meera-iyer','quantum'),('jonas-weber','chip'),('zara-ahmed','chip'),('viktor-sokolov','chip')
) v(rs, ds) join public.researchers r on r.slug = v.rs join public.divisions d on d.slug = v.ds;

insert into public.publications (slug,title,abstract,pub_date,venue,status,featured) values
('compute-optimal-reasoning','Compute-Optimal Scaling for Multi-Step Reasoning','We study how to allocate training and inference compute for tasks that require multi-step reasoning. Across four model families we find that reasoning accuracy follows a predictable power law in combined compute, and that shifting a fraction of budget to inference-time search dominates naive parameter scaling beyond a task-dependent threshold.','2025-12-04','NeurIPS 2025','published',true),
('benchmark-contamination','Detecting Benchmark Contamination in Large Language Models','We introduce a family of membership-inference probes that identify when evaluation items have leaked into pre-training corpora. The probes require only black-box access and reveal measurable contamination in several widely used reasoning benchmarks.','2025-04-24','ICLR 2025','published',false),
('sparse-reward-models','Sparse Reward Models for Interpretable Alignment','We propose reward models whose final layer is constrained to a sparse set of human-readable features. Sparse reward models match dense baselines on preference accuracy while making reward hacking easier to detect and correct.','2026-03-10','arXiv preprint','published',false),
('neural-surface-code-decoding','Real-Time Neural Decoding for Surface-Code Error Correction','We present a recurrent neural decoder for the rotated surface code that operates within the microsecond latency budget of superconducting hardware. On simulated circuit-level noise the decoder exceeds minimum-weight matching accuracy at distances up to 11.','2025-09-15','PRX Quantum','published',true),
('nv-cardiac-magnetometry','Nitrogen-Vacancy Magnetometry for Cardiac Field Imaging','We demonstrate a room-temperature diamond magnetometer array capable of mapping cardiac magnetic fields without magnetic shielding, opening a path toward low-cost magnetocardiography.','2024-06-02','Nature Communications','published',false),
('side-channel-lattice-crypto','Side-Channel-Resistant Lattice Cryptography on Constrained Hardware','We describe masked implementations of lattice-based key encapsulation for microcontrollers and evaluate them against power-analysis attacks, achieving first-order security with modest overhead.','2025-09-08','CHES 2025','published',false),
('retinal-foundation-screening','Foundation Models for Retinal Disease Screening in Low-Resource Clinics','We adapt a retinal foundation model to portable fundus cameras and evaluate it prospectively across partner clinics. The system achieves high sensitivity for referable diabetic retinopathy while running entirely offline.','2025-07-21','The Lancet Digital Health','published',true),
('tumour-microenvironment-atlas','A Single-Cell Atlas of Treatment-Resistant Tumour Microenvironments','We profile tumour biopsies before and after therapy at single-cell resolution and identify stromal and immune states associated with treatment resistance.','2024-11-12','Cell Reports','published',false),
('ecog-attempted-speech','Decoding Attempted Speech from High-Density ECoG Arrays','We decode attempted speech from high-density electrocorticography using a sequence model pre-trained on unlabelled neural data, reaching real-time word-level decoding with a large vocabulary.','2025-10-30','Journal of Neural Engineering','published',true),
('flexible-polymer-electrodes','Long-Term Stability of Flexible Polymer Microelectrodes','We report a chronic study of flexible polymer microelectrodes, characterising impedance, signal quality and tissue response over twelve months.','2024-03-18','Advanced Materials','published',false),
('mesoscale-connectome','Scalable Mesoscale Connectome Reconstruction from Light-Sheet Imaging','We present a distributed pipeline that reconstructs mesoscale connectivity from whole-brain light-sheet datasets at a fraction of previous compute cost.','2026-01-14','bioRxiv preprint','published',false),
('tactile-dexterous-manipulation','Tactile-Conditioned Policies for Dexterous In-Hand Manipulation','We train manipulation policies conditioned on high-resolution tactile signals and show robust in-hand reorientation of previously unseen objects on a real multi-fingered hand.','2025-11-06','CoRL 2025','published',true),
('quadruped-deformable-terrain','Learning Robust Quadruped Locomotion over Deformable Terrain','We combine terrain-aware simulation with domain randomisation to learn locomotion controllers that remain stable on sand, mud and snow.','2024-05-13','ICRA 2024','published',false),
('photonic-tensor-core','A Silicon-Photonic Tensor Core for Low-Latency Inference','We present a silicon-photonic matrix-multiplication core integrated with CMOS control electronics, demonstrating low-latency inference on transformer workloads.','2025-02-17','ISSCC 2025','published',true),
('neuromorphic-plasticity-cores','Event-Driven Neuromorphic Cores with On-Chip Plasticity','We describe an event-driven neuromorphic core supporting local learning rules on chip, and evaluate it on keyword spotting and adaptive control tasks.','2024-08-26','IEEE Journal of Solid-State Circuits','published',false),
('shared-autonomy-microsurgery','Shared Autonomy for Robot-Assisted Microsurgery','We introduce a shared-autonomy controller that blends surgeon input with learned motion primitives, reducing tremor and task time in phantom microsurgery trials.','2026-02-19','Science Robotics','published',false),
('uncertainty-lab-agents','Uncertainty Estimation for Autonomous Lab Agents','Draft manuscript on calibrated uncertainty estimates for agents that plan laboratory experiments.','2026-06-01',null,'draft',false),
('embodied-reasoning-benchmarks','Cross-Domain Benchmarks for Embodied Reasoning','A benchmark suite for embodied reasoning spanning simulation and real robots. Division assignment awaiting review.','2026-05-20',null,'in_review',false);

insert into public.publication_divisions (publication_id, division_id)
select p.id, d.id from (values
('compute-optimal-reasoning','ai'),('benchmark-contamination','ai'),('sparse-reward-models','ai'),
('neural-surface-code-decoding','quantum'),('neural-surface-code-decoding','ai'),
('nv-cardiac-magnetometry','quantum'),('nv-cardiac-magnetometry','medical'),
('side-channel-lattice-crypto','quantum'),('side-channel-lattice-crypto','chip'),
('retinal-foundation-screening','medical'),('retinal-foundation-screening','ai'),
('tumour-microenvironment-atlas','medical'),
('ecog-attempted-speech','neuro'),('ecog-attempted-speech','ai'),
('flexible-polymer-electrodes','neuro'),('flexible-polymer-electrodes','chip'),
('mesoscale-connectome','neuro'),
('tactile-dexterous-manipulation','robotics'),('tactile-dexterous-manipulation','ai'),
('quadruped-deformable-terrain','robotics'),
('photonic-tensor-core','chip'),('photonic-tensor-core','ai'),
('neuromorphic-plasticity-cores','chip'),('neuromorphic-plasticity-cores','neuro'),
('shared-autonomy-microsurgery','robotics'),('shared-autonomy-microsurgery','medical'),
('uncertainty-lab-agents','ai')
) v(ps, ds) join public.publications p on p.slug = v.ps join public.divisions d on d.slug = v.ds;

insert into public.publication_authors (publication_id, position, author_name, researcher_id)
select p.id, v.pos, r.name, r.id from (values
('compute-optimal-reasoning',1,'ada-reyes'),('compute-optimal-reasoning',2,'kenji-watanabe'),('compute-optimal-reasoning',3,'priya-raman'),
('benchmark-contamination',1,'lucas-almeida'),('benchmark-contamination',2,'sofia-marchetti'),('benchmark-contamination',3,'ada-reyes'),
('sparse-reward-models',1,'daniel-okafor'),('sparse-reward-models',2,'noor-siddiqui'),('sparse-reward-models',3,'ada-reyes'),
('neural-surface-code-decoding',1,'elena-petrova'),('neural-surface-code-decoding',2,'kenji-watanabe'),('neural-surface-code-decoding',3,'igor-demidov'),
('nv-cardiac-magnetometry',1,'tomas-lindqvist'),('nv-cardiac-magnetometry',2,'amara-nwosu'),('nv-cardiac-magnetometry',3,'hannah-berg'),
('side-channel-lattice-crypto',1,'felix-brandt'),('side-channel-lattice-crypto',2,'meera-iyer'),('side-channel-lattice-crypto',3,'pavel-novak'),
('retinal-foundation-screening',1,'noor-siddiqui'),('retinal-foundation-screening',2,'rahul-mehta'),('retinal-foundation-screening',3,'hannah-berg'),
('tumour-microenvironment-atlas',1,'chloe-dubois'),('tumour-microenvironment-atlas',2,'samuel-adeyemi'),('tumour-microenvironment-atlas',3,'ingrid-holm'),
('ecog-attempted-speech',1,'mateo-ruiz'),('ecog-attempted-speech',2,'priya-raman'),('ecog-attempted-speech',3,'nadia-hassan'),
('flexible-polymer-electrodes',1,'leila-farouk'),('flexible-polymer-electrodes',2,'zara-ahmed'),('flexible-polymer-electrodes',3,'yuki-tanaka'),
('mesoscale-connectome',1,'owen-gallagher'),('mesoscale-connectome',2,'nadia-hassan'),
('tactile-dexterous-manipulation',1,'arjun-nair'),('tactile-dexterous-manipulation',2,'freya-jensen'),('tactile-dexterous-manipulation',3,'maria-voss'),
('quadruped-deformable-terrain',1,'diego-castillo'),('quadruped-deformable-terrain',2,'hana-kim'),('quadruped-deformable-terrain',3,'maria-voss'),
('photonic-tensor-core',1,'jonas-weber'),('photonic-tensor-core',2,'meera-iyer'),('photonic-tensor-core',3,'pavel-novak'),
('neuromorphic-plasticity-cores',1,'viktor-sokolov'),('neuromorphic-plasticity-cores',2,'zara-ahmed'),('neuromorphic-plasticity-cores',3,'yuki-tanaka'),
('shared-autonomy-microsurgery',1,'freya-jensen'),('shared-autonomy-microsurgery',2,'rahul-mehta'),('shared-autonomy-microsurgery',3,'maria-voss'),
('uncertainty-lab-agents',1,'sofia-marchetti'),
('embodied-reasoning-benchmarks',1,'kenji-watanabe'),('embodied-reasoning-benchmarks',2,'hana-kim')
) v(ps,pos,rs) join public.publications p on p.slug = v.ps join public.researchers r on r.slug = v.rs;

insert into public.projects (slug,title,summary,description,status,start_year,featured,published) values
('reasoning-eval-suite','Reasoning Evaluation Suite','An open, contamination-aware evaluation suite for multi-step reasoning.','A long-running effort to build reasoning benchmarks with provenance tracking, held-out refresh cycles and contamination probes, so that capability claims can be checked independently.','active',2024,true,true),
('fault-tolerant-decoder','Fault-Tolerant Decoder Stack','Real-time decoding hardware and software for surface-code experiments.','Co-designs neural decoders with low-latency FPGA and ASIC implementations to keep pace with superconducting qubit cycle times.','active',2024,true,true),
('portable-retinal-screening','Portable Retinal Screening','Offline AI screening for diabetic retinopathy on portable cameras.','Deploys and prospectively evaluates retinal screening models with partner clinics, with a focus on offline operation and clinician oversight.','active',2023,true,true),
('speech-neuroprosthesis','Speech Neuroprosthesis','Restoring communication through high-density neural interfaces.','Combines flexible electrode arrays, real-time decoding and user-centred design to restore communication for people with paralysis.','active',2024,true,true),
('tactile-hand','Tactile Dexterous Hand','A multi-fingered hand with high-resolution tactile skin.','Integrates soft tactile sensors with learned control for robust in-hand manipulation of everyday objects.','active',2025,false,true),
('photonic-inference-chip','Photonic Inference Chip','A photonic-electronic accelerator for low-latency inference.','Takes the photonic tensor core from test chip to a packaged accelerator module for data-centre inference.','planned',2026,false,true);

insert into public.project_divisions (project_id, division_id)
select p.id, d.id from (values ('reasoning-eval-suite','ai'),('fault-tolerant-decoder','quantum'),('fault-tolerant-decoder','chip'),('portable-retinal-screening','medical'),('portable-retinal-screening','ai'),('speech-neuroprosthesis','neuro'),('tactile-hand','robotics'),('photonic-inference-chip','chip')) v(ps,ds)
join public.projects p on p.slug = v.ps join public.divisions d on d.slug = v.ds;
insert into public.project_researchers (project_id, researcher_id)
select p.id, r.id from (values ('reasoning-eval-suite','ada-reyes'),('reasoning-eval-suite','lucas-almeida'),('fault-tolerant-decoder','elena-petrova'),('fault-tolerant-decoder','igor-demidov'),('portable-retinal-screening','noor-siddiqui'),('portable-retinal-screening','rahul-mehta'),('speech-neuroprosthesis','nadia-hassan'),('speech-neuroprosthesis','mateo-ruiz'),('speech-neuroprosthesis','leila-farouk'),('tactile-hand','arjun-nair'),('tactile-hand','yuki-tanaka'),('photonic-inference-chip','jonas-weber'),('photonic-inference-chip','pavel-novak')) v(ps,rs)
join public.projects p on p.slug = v.ps join public.researchers r on r.slug = v.rs;

insert into public.news (slug,title,summary,body,published_at,published,division_id) values
('reasoning-scaling-neurips','Reasoning scaling paper accepted at NeurIPS','Our study of compute-optimal reasoning will be presented at NeurIPS 2025.','The AI division''s work on allocating compute between training and inference-time search has been accepted for presentation. The paper and code will be available from the Publications library.','2025-10-02',true,(select id from public.divisions where slug='ai')),
('retinal-screening-clinics','Retinal screening pilot expands to new clinics','The portable retinal screening project begins its next prospective evaluation phase.','Working with clinical partners, the Medical division is extending the offline screening pilot to additional sites, with clinicians reviewing every referral.','2025-08-14',true,(select id from public.divisions where slug='medical')),
('photonic-core-isscc','Photonic tensor core presented at ISSCC','The Chip division presented its silicon-photonic inference core.','The team demonstrated a photonic matrix-multiplication core integrated with CMOS control, and outlined the path to a packaged accelerator.','2025-02-20',true,(select id from public.divisions where slug='chip')),
('speech-decoding-milestone','Speech decoding reaches real-time milestone','Neuro / BCI researchers report real-time large-vocabulary decoding.','Using sequence models pre-trained on unlabelled neural recordings, the division achieved real-time word-level decoding of attempted speech.','2025-11-05',true,(select id from public.divisions where slug='neuro')),
('new-research-website','A new home for our research','We have launched a redesigned website with a searchable publication library.','The new site brings every division, researcher, project and publication together in one place, with direct PDF access for published papers.','2026-01-20',true,null);
