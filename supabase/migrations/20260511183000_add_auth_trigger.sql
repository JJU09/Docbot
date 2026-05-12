-- 회원가입 시 auth.users의 데이터를 public.users로 자동 동기화하는 함수 및 트리거 생성

-- 1. 새로운 사용자가 생성될 때 호출될 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. auth.users 테이블에 insert 발생 시 함수를 실행하는 트리거 설정
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. (선택사항) 이미 auth.users에는 가입되어 있으나 public.users에는 없는 기존 사용자 데이터 동기화
INSERT INTO public.users (id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);