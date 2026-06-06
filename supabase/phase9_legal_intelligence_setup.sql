-- Phase 9: Legal Intelligence Foundation
-- Full McKenzie Friend Practice Guidance seed and searchable legal chunks.
-- Run this in the Supabase SQL editor after previous phase SQL files.

create extension if not exists pgcrypto;

create table if not exists public.legal_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text default 'Guidance',
  jurisdiction text default 'England and Wales',
  source_url text,
  content text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.legal_sources
  add column if not exists area text default 'general',
  add column if not exists source_reference text,
  add column if not exists version_label text,
  add column if not exists effective_date date,
  add column if not exists last_checked_at timestamptz;

create table if not exists public.legal_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.legal_sources(id) on delete cascade,
  chunk_index integer not null,
  heading text,
  content text not null,
  citation_label text,
  created_at timestamptz not null default now()
);

create index if not exists legal_sources_active_updated_idx
  on public.legal_sources (is_active, updated_at desc);

create index if not exists legal_sources_area_idx
  on public.legal_sources(area);

create index if not exists legal_chunks_source_id_idx
  on public.legal_chunks(source_id);

create index if not exists legal_chunks_content_search_idx
  on public.legal_chunks
  using gin (to_tsvector('english', content));

create unique index if not exists legal_chunks_source_chunk_unique_idx
  on public.legal_chunks(source_id, chunk_index);

alter table public.legal_sources enable row level security;
alter table public.legal_chunks enable row level security;

drop policy if exists "Authenticated users can read legal sources" on public.legal_sources;
create policy "Authenticated users can read legal sources"
  on public.legal_sources
  for select
  to authenticated
  using (is_active = true);

drop policy if exists "Authenticated users can read legal chunks" on public.legal_chunks;
create policy "Authenticated users can read legal chunks"
  on public.legal_chunks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.legal_sources s
      where s.id = legal_chunks.source_id
      and s.is_active = true
    )
  );

-- Seed the FULL pasted guidance as one full source record, then add searchable chunks.
do $$
declare
  v_source_id uuid;
  v_full_text text := $mfguidance$
Practice Guidance: McKenzie Friends (Civil and Family Courts) 1) This Guidance applies to civil and family proceedings in the Court of Appeal (Civil Division), the High Court of Justice, the County Courts and the Family Proceedings Court in the Magistrates’ Courts.1 It is issued as guidance (not as a Practice Direction) by the Master of the Rolls, as Head of Civil Justice, and the President of the Family Division, as Head of Family Justice. It is intended to remind courts and litigants of the principles set out in the authorities and supersedes the guidance contained in Practice Note (Family Courts: McKenzie Friends) (No 2) [2008] 1 WLR 2757, which is now withdrawn.2 It is issued in light of the increase in litigants-in-person (litigants) in all levels of the civil and family courts.  The Right to Reasonable Assistance 2) Litigants have the right to have reasonable assistance from a layperson, sometimes called a McKenzie Friend (MF). Litigants assisted by MFs remain litigants-in-person. MFs have no independent right to provide assistance. They have no right to act as advocates or to carry out the conduct of litigation. What McKenzie Friends may do 3) MFs may: i) provide moral support for litigants; ii) take notes; iii) help with case papers; iii) quietly give advice on any aspect of the conduct of the case. What McKenzie Friends may not do 4) MFs may not: i) act as the litigants’ agent in relation to the proceedings; ii) manage litigants’ cases outside court, for example by signing court documents; or iii) address the court, make oral submissions or examine witnesses. Exercising the Right to Reasonable Assistance 5) While litigants ordinarily have a right to receive reasonable assistance from MFs the court retains the power to refuse to permit such assistance. The court may do so where it is satisfied that, in that case, the interests of justice and fairness do not require the litigant to receive such assistance.  6) A litigant who wishes to exercise this right should inform the judge as soon as possible indicating who the MF will be. The proposed MF should 1 References to the judge or court should be read where proceedings are taking place under the Family Proceedings Courts (Matrimonial Proceedings etc) Rules 1991, as a reference to a justices’ clerk or assistant justices’ clerk who is specifically authorised by a justices’ clerk to exercise the functions of the court at the relevant hearing. Where they are taking place under the Family Proceedings Courts (Childrens Act 1989) Rules 1991 they should be read consistently with the provisions of those Rules, specifically rule 16A(5A). 2 R v Leicester City Justices, ex parte Barrow [1991] 260, Chauhan v Chauhan [1997] FCR 206, R v Bow County Court, ex parte Pelling [1999] 1 WLR 1807, Attorney-General v Purvis [2003] EWHC 3190 (Admin), Clarkson v Gilbert [2000] CP Rep 58, United Building and Plumbing Contractors v Kajla [2002] EWCA Civ 628, Re O (Children) (Hearing in Private: Assistance) [2005] 3 WLR 1191, Westland Helicopters Ltd v Sheikh Salah Al-Hejailan (No 2) [2004] 2 Lloyd’s Rep 535. Agassi v Robinson (Inspector of Taxes) (No 2) [2006] 1 WLR 2126, Re N (A Child) (McKenzie Friend: Rights of Audience) Practice Note [2008] 1 WLR 2743. 1 produce a short curriculum vitae or other statement setting out relevant experience, confirming that he or she has no interest in the case and understands the MF’s role and the duty of confidentiality.  7) If the court considers that there might be grounds for circumscribing the right to receive such assistance, or a party objects to the presence of, or assistance given by a MF, it is not for the litigant to justify the exercise of the right. It is for the court or the objecting party to provide sufficient reasons why the litigant should not receive such assistance.  8) When considering whether to circumscribe the right to assistance or refuse a MF permission to attend the right to a fair trial is engaged. The matter should be considered carefully. The litigant should be given a reasonable opportunity to argue the point. The proposed MF should not be excluded from that hearing and should normally be allowed to help the litigant.  9) Where proceedings are in closed court, i.e. the hearing is in chambers, is in private, or the proceedings relate to a child, the litigant is required to justify the MF’s presence in court. The presumption in favour of permitting a MF to attend such hearings, and thereby enable litigants to exercise the right to assistance, is a strong one. 10)The court may refuse to allow a litigant to exercise the right to receive assistance at the start of a hearing. The court can also circumscribe the right during the course of a hearing. It may be refused at the start of a hearing or later circumscribed where the court forms the view that a MF may give, has given, or is giving, assistance which impedes the efficient administration of justice. However, the court should also consider whether a firm and unequivocal warning to the litigant and/or MF might suffice in the first instance. 11) A decision by the court not to curtail assistance from a MF should be regarded as final, save on the ground of subsequent misconduct by the MF or on the ground that the MF’s continuing presence will impede the efficient administration of justice. In such event the court should give a short judgment setting out the reasons why it has curtailed the right to assistance. Litigants may appeal such decisions. MFs have no standing to do so. 12) The following factors should not be taken to justify the court refusing to permit a litigant receiving such assistance: (i) The case or application is simple or straightforward, or is, for instance, a directions or case management hearing;  (ii) The litigant appears capable of conducting the case without assistance;  (iii) The litigant is unrepresented through choice; (iv) The other party is not represented; (v) The proposed MF belongs to an organisation that promotes a particular cause; (vi)	 The proceedings are confidential and the court papers contain sensitive information relating to a family’s affairs 2 13) A litigant may be denied the assistance of a MF because its provision might undermine or has undermined the efficient administration of justice. Examples of circumstances where this might arise are: i) the assistance is being provided for an improper purpose; ii) the assistance is unreasonable in nature or degree; iii) the MF is subject to a civil proceedings order or a civil restraint order; iv) the MF is using the litigant as a puppet; v) the MF is directly or indirectly conducting the litigation; vi) the court is not satisfied that the MF fully understands the duty of confidentiality.  14) Where a litigant is receiving assistance from a MF in care proceedings, the court should consider the MF’s attendance at any advocates’ meetings directed by the court, and, with regard to cases commenced after 1.4.08, consider directions in accordance with paragraph 13.2 of the Practice Direction Guide to Case Management in Public Law Proceedings. 15) Litigants are permitted to communicate any information, including filed evidence, relating to the proceedings to MFs for the purpose of obtaining advice or assistance in relation to the proceedings. 16) Legal representatives should ensure that documents are served on litigants in good time to enable them to seek assistance regarding their content from MFs in advance of any hearing or advocates’ meeting. 17) The High Court can, under its inherent jurisdiction, impose a civil restraint order on MFs who repeatedly act in ways that undermine the efficient administration of justice. Rights of audience and rights to conduct litigation 18)MFs do not have a right of audience or a right to conduct litigation. It is a criminal offence to exercise rights of audience or to conduct litigation unless properly qualified and authorised to do so by an appropriate regulatory body or, in the case of an otherwise unqualified or unauthorised individual (i.e., a lay individual including a MF), the court grants such rights on a case-by-case basis.3 19) Courts should be slow to grant any application from a litigant for a right of audience or a right to conduct litigation to any lay person, including a MF. This is because a person exercising such rights must ordinarily be properly trained, be under professional discipline (including an obligation to insure against liability for negligence) and be subject to an overriding duty to the court. These requirements are necessary for the protection of all parties to litigation and are essential to the proper administration of justice.  3 Legal Services Act 2007 s12 – 19 and Schedule 3. 3 20) Any application for a right of audience or a right to conduct litigation to be granted to any lay person should therefore be considered very carefully. The court should only be prepared to grant such rights where there is good reason to do so taking into account all the circumstances of the case, which are likely to vary greatly. Such grants should not be extended to lay persons automatically or without due consideration. They should not be granted for mere convenience. 21) Examples of the type of special circumstances which have been held to justify the grant of a right of audience to a lay person, including a MF, are: i) that person is a close relative of the litigant; ii) health problems preclude the litigant from addressing the court, or conducting litigation, and the litigant cannot afford to pay for a qualified legal representative; iii) the litigant is relatively inarticulate and prompting by that person may unnecessarily prolong the proceedings. 22)It is for the litigant to persuade the court that the circumstances of the case are such that it is in the interests of justice for the court to grant a lay person a right of audience or a right to conduct litigation. 23)The grant of a right of audience or a right to conduct litigation to lay persons who hold themselves out as professional advocates or professional MFs or who seek to exercise such rights on a regular basis, whether for reward or not, will however only be granted in exceptional circumstances. To do otherwise would tend to subvert the will of Parliament. 24)If a litigant wants a lay person to be granted a right of audience, an application must be made at the start of the hearing. If a right to conduct litigation is sought such an application must be made at the earliest possible time and must be made, in any event, before the lay person does anything which amounts to the conduct of litigation. It is for litigants to persuade the court, on a case-by-case basis, that the grant of such rights is justified. 25)Rights of audience and the right to conduct litigation are separate rights. The grant of one right to a lay person does not mean that a grant of the other right has been made. If both rights are sought their grant must be applied for individually and justified separately. 26)Having granted either a right of audience or a right to conduct litigation, the court has the power to remove either right. The grant of such rights in one set of proceedings cannot be relied on as a precedent supporting their grant in future proceedings. Remuneration 27)Litigants can enter into lawful agreements to pay fees to MFs for the provision of reasonable assistance in court or out of court by, for instance, carrying out clerical or mechanical activities, such as photocopying documents, preparing bundles, delivering documents to opposing parties or the court, or the provision of legal advice in connection with court 4 proceedings. Such fees cannot be lawfully recovered from the opposing party. 28) Fees said to be incurred by MFs for carrying out the conduct of litigation, where the court has not granted such a right, cannot lawfully be recovered from either the litigant for whom they carry out such work or the opposing party. 29)Fees said to be incurred by MFs for carrying out the conduct of litigation after the court has granted such a right are in principle recoverable from the litigant for whom the work is carried out. Such fees cannot be lawfully recovered from the opposing party. 30) Fees said to be incurred by MFs for exercising a right of audience following the grant of such a right by the court are in principle recoverable from the litigant on whose behalf the right is exercised. Such fees are also recoverable, in principle, from the opposing party as a recoverable disbursement: CPR 48.6(2) and 48(6)(3)(ii). Personal Support Unit & Citizen’s Advice Bureau 31)  Litigants should also be aware of the services provided by local Personal Support Units and Citizens' Advice Bureaux. The PSU at the Royal Courts of Justice in London can be contacted on 020 7947 7701, by email at rcj@thepsu.org.uk, their website: www.thepsu.org.uk or at the enquiry desk. The CAB at the Royal Courts of Justice in London can be contacted on 020 7947 6564 or at the enquiry desk. Lord Neuberger of Abbotsbury, Master of the Rolls Sir Nicholas Wall, President of the Family Division 12 July 2010
$mfguidance$;
begin
  select id into v_source_id
  from public.legal_sources
  where title = 'Practice Guidance: McKenzie Friends (Civil and Family Courts)'
  order by created_at asc
  limit 1;

  if v_source_id is null then
    insert into public.legal_sources (
      title,
      source_type,
      jurisdiction,
      source_url,
      content,
      is_active,
      area,
      source_reference,
      version_label,
      effective_date,
      last_checked_at
    ) values (
      'Practice Guidance: McKenzie Friends (Civil and Family Courts)',
      'Practice Guidance',
      'England and Wales',
      null,
      v_full_text,
      true,
      'mckenzie_friend',
      'Practice Guidance issued by the Master of the Rolls and President of the Family Division',
      '12 July 2010',
      '2010-07-12',
      now()
    )
    returning id into v_source_id;
  else
    update public.legal_sources
    set
      source_type = 'Practice Guidance',
      jurisdiction = 'England and Wales',
      content = v_full_text,
      is_active = true,
      area = 'mckenzie_friend',
      source_reference = 'Practice Guidance issued by the Master of the Rolls and President of the Family Division',
      version_label = '12 July 2010',
      effective_date = '2010-07-12',
      last_checked_at = now(),
      updated_at = now()
    where id = v_source_id;
  end if;

  delete from public.legal_chunks where source_id = v_source_id;

  insert into public.legal_chunks (source_id, chunk_index, heading, content, citation_label)
  values (
    v_source_id,
    1,
    'Scope and status of guidance',
    $chunk$
Practice Guidance: McKenzie Friends (Civil and Family Courts) 1) This Guidance applies to civil and family proceedings in the Court of Appeal (Civil Division), the High Court of Justice, the County Courts and the Family Proceedings Court in the Magistrates’ Courts.1 It is issued as guidance (not as a Practice Direction) by the Master of the Rolls, as Head of Civil Justice, and the President of the Family Division, as Head of Family Justice. It is intended to remind courts and litigants of the principles set out in the authorities and supersedes the guidance contained in Practice Note (Family Courts: McKenzie Friends) (No 2) [2008] 1 WLR 2757, which is now withdrawn.2 It is issued in light of the increase in litigants-in-person (litigants) in all levels of the civil and family courts.
$chunk$,
    'Practice Guidance: McKenzie Friends, Paragraph 1'
  );

  insert into public.legal_chunks (source_id, chunk_index, heading, content, citation_label)
  values (
    v_source_id,
    2,
    'Right to reasonable assistance',
    $chunk$
The Right to Reasonable Assistance 2) Litigants have the right to have reasonable assistance from a layperson, sometimes called a McKenzie Friend (MF). Litigants assisted by MFs remain litigants-in-person. MFs have no independent right to provide assistance. They have no right to act as advocates or to carry out the conduct of litigation.
$chunk$,
    'Practice Guidance: McKenzie Friends, Paragraph 2'
  );

  insert into public.legal_chunks (source_id, chunk_index, heading, content, citation_label)
  values (
    v_source_id,
    3,
    'What McKenzie Friends may do',
    $chunk$
What McKenzie Friends may do 3) MFs may: i) provide moral support for litigants; ii) take notes; iii) help with case papers; iii) quietly give advice on any aspect of the conduct of the case.
$chunk$,
    'Practice Guidance: McKenzie Friends, Paragraph 3'
  );

  insert into public.legal_chunks (source_id, chunk_index, heading, content, citation_label)
  values (
    v_source_id,
    4,
    'What McKenzie Friends may not do',
    $chunk$
What McKenzie Friends may not do 4) MFs may not: i) act as the litigants’ agent in relation to the proceedings; ii) manage litigants’ cases outside court, for example by signing court documents; or iii) address the court, make oral submissions or examine witnesses.
$chunk$,
    'Practice Guidance: McKenzie Friends, Paragraph 4'
  );

  insert into public.legal_chunks (source_id, chunk_index, heading, content, citation_label)
  values (
    v_source_id,
    5,
    'Exercising the right to reasonable assistance',
    $chunk$
Exercising the Right to Reasonable Assistance 5) While litigants ordinarily have a right to receive reasonable assistance from MFs the court retains the power to refuse to permit such assistance. The court may do so where it is satisfied that, in that case, the interests of justice and fairness do not require the litigant to receive such assistance.  6) A litigant who wishes to exercise this right should inform the judge as soon as possible indicating who the MF will be. The proposed MF should 1 References to the judge or court should be read where proceedings are taking place under the Family Proceedings Courts (Matrimonial Proceedings etc) Rules 1991, as a reference to a justices’ clerk or assistant justices’ clerk who is specifically authorised by a justices’ clerk to exercise the functions of the court at the relevant hearing. Where they are taking place under the Family Proceedings Courts (Childrens Act 1989) Rules 1991 they should be read consistently with the provisions of those Rules, specifically rule 16A(5A). 2 R v Leicester City Justices, ex parte Barrow [1991] 260, Chauhan v Chauhan [1997] FCR 206, R v Bow County Court, ex parte Pelling [1999] 1 WLR 1807, Attorney-General v Purvis [2003] EWHC 3190 (Admin), Clarkson v Gilbert [2000] CP Rep 58, United Building and Plumbing Contractors v Kajla [2002] EWCA Civ 628, Re O (Children) (Hearing in Private: Assistance) [2005] 3 WLR 1191, Westland Helicopters Ltd v Sheikh Salah Al-Hejailan (No 2) [2004] 2 Lloyd’s Rep 535. Agassi v Robinson (Inspector of Taxes) (No 2) [2006] 1 WLR 2126, Re N (A Child) (McKenzie Friend: Rights of Audience) Practice Note [2008] 1 WLR 2743. 1 produce a short curriculum vitae or other statement setting out relevant experience, confirming that he or she has no interest in the case and understands the MF’s role and the duty of confidentiality.  7) If the court considers that there might be grounds for circumscribing the right to receive such assistance, or a party objects to the presence of, or assistance given by a MF, it is not for the litigant to justify the exercise of the right. It is for the court or the objecting party to provide sufficient reasons why the litigant should not receive such assistance.  8) When considering whether to circumscribe the right to assistance or refuse a MF permission to attend the right to a fair trial is engaged. The matter should be considered carefully. The litigant should be given a reasonable opportunity to argue the point. The proposed MF should not be excluded from that hearing and should normally be allowed to help the litigant.  9) Where proceedings are in closed court, i.e. the hearing is in chambers, is in private, or the proceedings relate to a child, the litigant is required to justify the MF’s presence in court. The presumption in favour of permitting a MF to attend such hearings, and thereby enable litigants to exercise the right to assistance, is a strong one. 10)The court may refuse to allow a litigant to exercise the right to receive assistance at the start of a hearing. The court can also circumscribe the right during the course of a hearing. It may be refused at the start of a hearing or later circumscribed where the court forms the view that a MF may give, has given, or is giving, assistance which impedes the efficient administration of justice. However, the court should also consider whether a firm and unequivocal warning to the litigant and/or MF might suffice in the first instance. 11) A decision by the court not to curtail assistance from a MF should be regarded as final, save on the ground of subsequent misconduct by the MF or on the ground that the MF’s continuing presence will impede the efficient administration of justice. In such event the court should give a short judgment setting out the reasons why it has curtailed the right to assistance. Litigants may appeal such decisions. MFs have no standing to do so. 12) The following factors should not be taken to justify the court refusing to permit a litigant receiving such assistance: (i) The case or application is simple or straightforward, or is, for instance, a directions or case management hearing;  (ii) The litigant appears capable of conducting the case without assistance;  (iii) The litigant is unrepresented through choice; (iv) The other party is not represented; (v) The proposed MF belongs to an organisation that promotes a particular cause; (vi)	 The proceedings are confidential and the court papers contain sensitive information relating to a family’s affairs 2 13) A litigant may be denied the assistance of a MF because its provision might undermine or has undermined the efficient administration of justice. Examples of circumstances where this might arise are: i) the assistance is being provided for an improper purpose; ii) the assistance is unreasonable in nature or degree; iii) the MF is subject to a civil proceedings order or a civil restraint order; iv) the MF is using the litigant as a puppet; v) the MF is directly or indirectly conducting the litigation; vi) the court is not satisfied that the MF fully understands the duty of confidentiality.  14) Where a litigant is receiving assistance from a MF in care proceedings, the court should consider the MF’s attendance at any advocates’ meetings directed by the court, and, with regard to cases commenced after 1.4.08, consider directions in accordance with paragraph 13.2 of the Practice Direction Guide to Case Management in Public Law Proceedings. 15) Litigants are permitted to communicate any information, including filed evidence, relating to the proceedings to MFs for the purpose of obtaining advice or assistance in relation to the proceedings. 16) Legal representatives should ensure that documents are served on litigants in good time to enable them to seek assistance regarding their content from MFs in advance of any hearing or advocates’ meeting. 17) The High Court can, under its inherent jurisdiction, impose a civil restraint order on MFs who repeatedly act in ways that undermine the efficient administration of justice.
$chunk$,
    'Practice Guidance: McKenzie Friends, Paragraphs 5 to 17'
  );

  insert into public.legal_chunks (source_id, chunk_index, heading, content, citation_label)
  values (
    v_source_id,
    6,
    'Rights of audience and conduct of litigation',
    $chunk$
Rights of audience and rights to conduct litigation 18)MFs do not have a right of audience or a right to conduct litigation. It is a criminal offence to exercise rights of audience or to conduct litigation unless properly qualified and authorised to do so by an appropriate regulatory body or, in the case of an otherwise unqualified or unauthorised individual (i.e., a lay individual including a MF), the court grants such rights on a case-by-case basis.3 19) Courts should be slow to grant any application from a litigant for a right of audience or a right to conduct litigation to any lay person, including a MF. This is because a person exercising such rights must ordinarily be properly trained, be under professional discipline (including an obligation to insure against liability for negligence) and be subject to an overriding duty to the court. These requirements are necessary for the protection of all parties to litigation and are essential to the proper administration of justice.  3 Legal Services Act 2007 s12 – 19 and Schedule 3. 3 20) Any application for a right of audience or a right to conduct litigation to be granted to any lay person should therefore be considered very carefully. The court should only be prepared to grant such rights where there is good reason to do so taking into account all the circumstances of the case, which are likely to vary greatly. Such grants should not be extended to lay persons automatically or without due consideration. They should not be granted for mere convenience. 21) Examples of the type of special circumstances which have been held to justify the grant of a right of audience to a lay person, including a MF, are: i) that person is a close relative of the litigant; ii) health problems preclude the litigant from addressing the court, or conducting litigation, and the litigant cannot afford to pay for a qualified legal representative; iii) the litigant is relatively inarticulate and prompting by that person may unnecessarily prolong the proceedings. 22)It is for the litigant to persuade the court that the circumstances of the case are such that it is in the interests of justice for the court to grant a lay person a right of audience or a right to conduct litigation. 23)The grant of a right of audience or a right to conduct litigation to lay persons who hold themselves out as professional advocates or professional MFs or who seek to exercise such rights on a regular basis, whether for reward or not, will however only be granted in exceptional circumstances. To do otherwise would tend to subvert the will of Parliament. 24)If a litigant wants a lay person to be granted a right of audience, an application must be made at the start of the hearing. If a right to conduct litigation is sought such an application must be made at the earliest possible time and must be made, in any event, before the lay person does anything which amounts to the conduct of litigation. It is for litigants to persuade the court, on a case-by-case basis, that the grant of such rights is justified. 25)Rights of audience and the right to conduct litigation are separate rights. The grant of one right to a lay person does not mean that a grant of the other right has been made. If both rights are sought their grant must be applied for individually and justified separately. 26)Having granted either a right of audience or a right to conduct litigation, the court has the power to remove either right. The grant of such rights in one set of proceedings cannot be relied on as a precedent supporting their grant in future proceedings.
$chunk$,
    'Practice Guidance: McKenzie Friends, Paragraphs 18 to 26'
  );

  insert into public.legal_chunks (source_id, chunk_index, heading, content, citation_label)
  values (
    v_source_id,
    7,
    'Remuneration',
    $chunk$
Remuneration 27)Litigants can enter into lawful agreements to pay fees to MFs for the provision of reasonable assistance in court or out of court by, for instance, carrying out clerical or mechanical activities, such as photocopying documents, preparing bundles, delivering documents to opposing parties or the court, or the provision of legal advice in connection with court 4 proceedings. Such fees cannot be lawfully recovered from the opposing party. 28) Fees said to be incurred by MFs for carrying out the conduct of litigation, where the court has not granted such a right, cannot lawfully be recovered from either the litigant for whom they carry out such work or the opposing party. 29)Fees said to be incurred by MFs for carrying out the conduct of litigation after the court has granted such a right are in principle recoverable from the litigant for whom the work is carried out. Such fees cannot be lawfully recovered from the opposing party. 30) Fees said to be incurred by MFs for exercising a right of audience following the grant of such a right by the court are in principle recoverable from the litigant on whose behalf the right is exercised. Such fees are also recoverable, in principle, from the opposing party as a recoverable disbursement: CPR 48.6(2) and 48(6)(3)(ii).
$chunk$,
    'Practice Guidance: McKenzie Friends, Paragraphs 27 to 30'
  );

  insert into public.legal_chunks (source_id, chunk_index, heading, content, citation_label)
  values (
    v_source_id,
    8,
    'Personal Support Unit and Citizens Advice Bureau',
    $chunk$
Personal Support Unit & Citizen’s Advice Bureau 31)  Litigants should also be aware of the services provided by local Personal Support Units and Citizens' Advice Bureaux. The PSU at the Royal Courts of Justice in London can be contacted on 020 7947 7701, by email at rcj@thepsu.org.uk, their website: www.thepsu.org.uk or at the enquiry desk. The CAB at the Royal Courts of Justice in London can be contacted on 020 7947 6564 or at the enquiry desk. Lord Neuberger of Abbotsbury, Master of the Rolls Sir Nicholas Wall, President of the Family Division 12 July 2010
$chunk$,
    'Practice Guidance: McKenzie Friends, Paragraph 31'
  );

end $$;
