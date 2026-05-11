-- 1. documents 테이블 RLS
alter table documents enable row level security;

-- 조회: 본인 문서만
create policy "documents_select"
on documents for select
using (auth.uid() = user_id);

-- 생성: 본인 user_id로만 insert
create policy "documents_insert"
on documents for insert
with check (auth.uid() = user_id);

-- 수정: 본인 문서만
create policy "documents_update"
on documents for update
using (auth.uid() = user_id);

-- 삭제: 본인 문서만
create policy "documents_delete"
on documents for delete
using (auth.uid() = user_id);


-- 2. folders 테이블 RLS
alter table folders enable row level security;

create policy "folders_select"
on folders for select
using (auth.uid() = user_id);

create policy "folders_insert"
on folders for insert
with check (auth.uid() = user_id);

create policy "folders_update"
on folders for update
using (auth.uid() = user_id);

create policy "folders_delete"
on folders for delete
using (auth.uid() = user_id);


-- 3. chat_messages 테이블 RLS
-- chat_messages는 user_id 컬럼이 없으므로 document_id를 통해 documents 테이블과 조인하여 검증
alter table chat_messages enable row level security;

create policy "chat_messages_select"
on chat_messages for select
using (
  exists (
    select 1 from documents
    where documents.id = chat_messages.document_id
    and documents.user_id = auth.uid()
  )
);

create policy "chat_messages_insert"
on chat_messages for insert
with check (
  exists (
    select 1 from documents
    where documents.id = chat_messages.document_id
    and documents.user_id = auth.uid()
  )
);

create policy "chat_messages_delete"
on chat_messages for delete
using (
  exists (
    select 1 from documents
    where documents.id = chat_messages.document_id
    and documents.user_id = auth.uid()
  )
);


-- 4. versions 테이블 RLS
alter table versions enable row level security;

create policy "versions_select"
on versions for select
using (
  exists (
    select 1 from documents
    where documents.id = versions.document_id
    and documents.user_id = auth.uid()
  )
);

create policy "versions_insert"
on versions for insert
with check (
  exists (
    select 1 from documents
    where documents.id = versions.document_id
    and documents.user_id = auth.uid()
  )
);


-- 5. Storage 버킷 보안 (files 버킷)
-- 본인이 업로드한 파일만 접근 가능 (경로: {user_id}/...)
create policy "storage_select"
on storage.objects for select
using (auth.uid()::text = (storage.foldername(name))[1]);

create policy "storage_insert"
on storage.objects for insert
with check (auth.uid()::text = (storage.foldername(name))[1]);

create policy "storage_delete"
on storage.objects for delete
using (auth.uid()::text = (storage.foldername(name))[1]);