# 문서 전용 회귀 점검

이 문서는 `harness` 생성기 문서와 reference를 고친 뒤 확인할 회귀 점검 기준이다. 새 스크립트를 늘리려는 문서가 아니라, Markdown 계약이 같은 운영 모델을 말하는지 사람이 빠르게 확인하도록 돕는 문서다.

이 점검은 `references/` 파일 추가, 삭제, 내용 변경을 포함한 생성기 문서 변경 PR을 merge하기 전에 수행한다.

## 점검 원칙

- 프로젝트 변경은 Markdown 계약과 reference 정렬을 중심으로 검증한다.
- 타겟 프로젝트를 자동으로 수정하는 스크립트는 만들지 않는다.
- 외부 서비스나 네트워크가 있어야만 통과하는 검증을 필수 조건으로 두지 않는다.
- 명령은 보조 확인용으로만 둔다. 명령 결과보다 문서 의미의 일관성을 먼저 본다.
- `.md` 파일을 고친 뒤에는 `humanize-korean` 기준으로 문장을 다듬는다.

## 1. Reference 연결 점검

reference 파일을 추가하거나 삭제했다면 아래를 확인한다.

- `.codex-dist/skills/harness/references/`에 실제 파일이 있는가
- `.codex-dist/skills/harness/references/reference-map.md`가 새 문서를 어떤 판단 축에서 읽을지 설명하는가
- `.codex-dist/skills/harness/SKILL.md`의 참고 문서 목록과 실행 기준이 새 문서를 직접 또는 간접으로 가리키는가
- README나 개발 평가 문서가 새 reference의 역할을 과장하지 않는가

보조 명령:

```sh
find .codex-dist/skills/harness/references -maxdepth 1 -type f | sort
rg -n "새-reference-파일명" .codex-dist/skills/harness README.md docs
```

## 2. 자기진화 계약 점검

자기진화 관련 문서를 바꿨다면 아래를 확인한다.

- 역할 출력에 `학습 후보`, `승격 대상`, `생성기 환류 후보`를 남길 위치가 있는가
- `latest-session-summary.md` 계약에 다음 실행 입력이 충분히 남는가
- 단일 타겟 관찰과 여러 타겟에서 반복되는 결함을 구분하는가
- 로컬 보강과 생성기 reference 보강 후보를 섞어 쓰지 않는가
- 자기진화 루프가 별도 스크립트나 외부 실행기에 의존하지 않는가

## 3. 초기 생성 계약 점검

초기 생성 관련 문서를 바꿨다면 아래를 확인한다.

- `initial-generation-contract.md`가 신규 구축 결과의 필수 계약을 설명하는가
- 저장소 근거가 적은 초기 단계도 신규 구축 흐름 안에서 다루고, 사용자 도메인 설명을 `project-setup.md`에 고정하는가
- 초기 입력 질문이 과도해지지 않고 제품/도메인, 첫 성공 시나리오, 실패 비용 중심으로 제한되는가
- 초기 생성물만 읽어도 다음 시작 역할, 다음 하네스 재진입 Phase, 학습 후보 기록 위치를 알 수 있는가
- 모든 역할 스킬 출력 형식에 공통 학습 출력 블록이 처음부터 포함되는가
- 초기 문서 골격을 완료물처럼 설명하지 않고, 보류한 판단과 다음 입력을 남기도록 되어 있는가
- 초기 자기진화 루프가 스크립트나 외부 실행기에 의존하지 않는가

## 4. Team Spec 생성 계약 점검

`team-spec` 관련 reference를 바꿨다면 아래를 확인한다.

- 역할 스펙 필드가 `.codex/agents/*`와 `.agents/skills/*` 생성에 필요한 정보를 충분히 담는가
- `## 최종 역할 인벤토리`가 fenced `text` 블록이며, 헤더와 역할 행이 같은 블록 안에 있는가
- 역할 행을 inline code로 흩어 놓은 예시가 남아 있지 않은가
- 역할별 출력 형식이 `team-spec`의 실행 기준과 연결되는가
- 시작 진입 역할, 중심 조율 역할, QA 역할, 운영 감사 역할의 경계가 유지되는가
- 학습 후보 기록 규칙, 승격 대상 기준, 생성기 환류 후보 기준이 역할 스킬 생성으로 이어지는가

## 5. 로그와 Handoff 점검

로그나 오케스트레이션 문서를 바꿨다면 아래를 확인한다.

- `logging-policy.md`가 필수 로그 문서로 설명되는가
- 로그 정책이 별도 스크립트나 TSV 이벤트 파일을 필수 전제로 삼지 않는가
- handoff 형식에 입력, 출력, 다음 역할, 하네스 재진입 Phase가 남는가
- 보류나 실패가 다음 세션에서 다시 읽을 수 있는 상태로 남는가
- 보존 문서의 이전 역할명이나 진입점이 현재 `team-spec`과 다르면 호환성 매핑과 우선 기준이 남는가
- 학습 후보가 있으면 어느 문서/스킬로 승격할지 남는가
- 관찰이 없을 때는 `없음`으로 짧게 정리할 수 있는가

## 6. 타겟 평가 코퍼스 점검

타겟 평가 문서를 추가했다면 아래를 확인한다.

- 타겟 프로젝트와 브랜치가 명시돼 있는가
- 현재 판정이 `운영 가능 / 재작성 필요 / 재구성 필요` 중 하나인가
- 가장 약한 축과 다음 하네스 재진입 Phase가 연결되는가
- 재검토 결과가 있다면 이전 판정과 새로 확인한 결함이 구분돼 있는가
- 이전 생성 결과와 새 생성 결과를 비교할 수 있다면 해결된 결함과 남은 결함을 분리했는가
- 타겟에서 확인한 결함이 생성기 회귀 점검 항목으로 반영됐는가
- 타겟 로컬 보강 후보와 생성기 환류 후보가 분리돼 있는가
- 타겟 프로젝트 파일을 직접 수정하지 않았다는 점이 드러나는가

## 7. 최소 보조 명령

아래 명령은 의존성 없는 보조 점검으로만 사용한다.

```sh
git diff --check
# rg 패턴 안의 | 는 쉘 파이프가 아니라 정규식 OR 조건이다.
rg -n "initial-generation-contract|초기 생성|신규 구축" .codex-dist/skills/harness README.md docs .harness
rg -n "도메인 설명|첫 성공 시나리오|저장소 근거가 적" .codex-dist/skills/harness README.md docs .harness
rg -n "logging-policy|Markdown 로그|TSV|스크립트" .codex-dist/skills/harness README.md docs .harness
rg -n "학습 후보|승격 대상|생성기 환류 후보" .codex-dist/skills/harness README.md docs .harness
rg -n "보존 문서|호환성|역할명|최종 역할 인벤토리|fenced" .codex-dist/skills/harness README.md docs .harness
find .harness/evaluations -type f | sort
```

로컬 배포본 설치 확인이 필요할 때만 아래 명령을 사용한다.

```sh
env HOME=/tmp/gwk-install-test ./install.sh
test -f /tmp/gwk-install-test/.codex/skills/harness/SKILL.md
```

이 명령은 배포본 복사 확인용이다. 생성기의 자기진화 루프가 이 명령에 의존한다는 뜻은 아니다.

## 완료 기준

- 수정한 문서가 같은 용어와 같은 운영 모델을 말한다.
- 새 reference가 고립돼 있지 않고 `reference-map.md`나 관련 문서에 연결돼 있다.
- 초기 생성 계약을 바꿨다면 신규 구축 결과의 자기진화성이 완료 기준에 반영돼 있다.
- 학습 후보와 승격 대상이 역할 출력, 로그, 운영 감사 기준 중 적어도 하나에서 확인된다.
- 보존 문서 호환성이나 역할 인벤토리 형식을 바꿨다면 회귀 점검 항목과 타겟 평가 기준이 함께 갱신돼 있다.
- 로그 정책을 바꿨다면 `logging-policy.md`가 스크립트 없는 Markdown 계약으로 유지된다.
- 타겟 평가 결과가 있다면 로컬 보강과 생성기 환류 후보가 분리되고, 재검토 결함이 회귀 점검에 반영돼 있다.
- `git diff --check`가 통과한다.
