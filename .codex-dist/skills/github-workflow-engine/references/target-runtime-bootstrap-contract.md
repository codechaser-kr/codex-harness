# 타겟 Workflow Engine 런타임 초기화 계약

이 문서는 Workflow Engine이 타겟 저장소에서 설정, GitHub 템플릿, 라벨을 최초로 필요로 하는 시점에 준비하는 절차를 정의한다. 이 초기화는 Workflow Engine의 실행 전제이며 Harness 설치, 생성, 갱신 또는 감사(audit)의 책임이 아니다.

## 소유권과 적용 시점

- Workflow Engine이 이 계약과 생성 결과를 소유한다.
- 스킬 설치만으로 타겟 저장소 파일이나 GitHub 상태를 만들지 않는다.
- 현재 작업이 특정 설정, 템플릿 또는 라벨을 실제로 요구할 때만 해당 항목을 확인한다.
- 코드 변경 실행 주체 선택만으로 리뷰 설정이나 GitHub 템플릿을 만들지 않는다.
- Harness 존재 여부는 이 초기화의 선행 조건이 아니다.

## 요구 항목별 최초 초기화

| 현재 작업이 요구하는 항목 | 최초 확인과 초기화 범위 |
| --- | --- |
| 이슈 생성 또는 이슈 유형 판정 | 해당 이슈 유형의 `.github/ISSUE_TEMPLATE/*.md`와 유형 라벨 하나 |
| PR 초안 생성 또는 PR 본문 판정 | `.github/pull_request_template.md` |
| 리뷰 실행 모드 선택 또는 실행 | `.workflow-engine/settings.json`의 `review.defaultMode`와 `review.modes` |
| 커밋 스킬 사용 가능 여부 판정 | `.workflow-engine/settings.json`의 `dependencies.commit` |

여러 항목을 한 작업에서 요구하면 필요한 범위를 합쳐 한 번만 확인한다. 아직 요구하지 않은 항목은 미리 만들지 않는다.

## 설정 파일 초기화

`.workflow-engine/settings.json`은 Workflow Engine이 독점적으로 생성·해석하는 타겟별 런타임 설정이다.
Harness 설치, 생성, 갱신 또는 실행은 이 파일을 만들거나 읽거나 보완하지 않는다. 별도 JSON Schema나
범용 설정 validator를 두지 않고, Workflow Engine의 생성·소비 계약과 회귀 테스트로 지원 값을 고정한다.

### 지원 값과 생성 근거

- `dependencies.commit.available`과 `review.modes.<지원 모드>.available`은 실제 사용 가능 상태를 관측한
  boolean만 기록한다.
- capability 관측 레코드는 비어 있지 않은 문자열 `checkedAt`과 `evidence`를 함께 가진다.
- `review.defaultMode`는 `claude/code-review`, `claude/awesome-code-review`,
  `codex/awesome-code-review` 중 사용자가 확정한 값만 기록한다.
- `review.modes`의 모드 키는 위 지원 모드만 인식한다. 관측하지 않은 capability나 사용자 선호를 추정하지
  않는다.

### 누락 상태의 지연 초기화

1. 파일이 없으면 현재 작업에 필요한 최상위 객체와 필드만 포함해 생성한다.
2. 파일이 있고 JSON으로 인식할 수 있으면 현재 작업에 필요한 필드만 확인한다.
3. 필요한 필드가 없으면 기존 키와 유효한 값을 보존하면서 누락 필드만 생성한다.
4. capability 값은 실제 도구·스킬 관측 결과와 `checkedAt`, `evidence`를 함께 기록한다.
5. 사용자 선호가 필요한 값은 사용 가능한 모드와 근거를 제시하고 사용자가 선택한 뒤 기록한다. 임의 기본값을 만들지 않는다.

파일 또는 필요한 필드가 없는 상태는 오류가 아니다. 필요한 항목의 지연 초기화가 끝난 경우에만 원래
작업을 계속한다. 같은 관측값과 사용자 결정으로 다시 실행했을 때 추가 변경이 없어야 한다.

### 인식 불가 상태의 fail-closed 중단

JSON 파싱 실패, 지원하지 않는 값 또는 위 형식으로 인식할 수 없는 타입이 하나라도 있으면 Workflow
Engine은 설정을 추정하거나 자동 교정하지 않고 원래 작업을 즉시 중단한다. 누락 상태로 재해석하거나
임의 기본값, 실행 모드 fallback, 충돌 값 덮어쓰기 또는 Harness 호출로 계속하지 않는다.

중단 결과에는 다음을 모두 포함한다.

- 설정 경로
- 문제가 된 필드와 관측된 값
- 기대 형식과 지원 값
- 설정을 요구한 현재 작업과 계속할 수 없는 영향
- 사용자가 값을 수정한 뒤 같은 작업을 재개해야 한다는 재개 조건

사용자가 재개하면 설정을 새로 읽어 인식 가능한 상태인지 확인한다. 중단 전의 잘못된 값을 Workflow
Engine이 대신 변경하지 않는다.

## 템플릿과 라벨 초기화

템플릿의 기본 구조와 유형별 데이터는 `github-templates.md`, 적용·감사와 보존 규칙은 `workflow-engine-template-compatibility-contract.md`를 따른다.

- 필요한 템플릿이 없으면 현재 작업에 필요한 템플릿만 생성한다.
- 기존 템플릿이 있으면 먼저 정합성을 감사(audit)하고 허용된 타겟 확장을 보존한다.
- 필수 기준과 충돌하면 자동으로 덮어쓰지 않고 차이와 수정 범위를 사용자에게 제시한다.
- 필요한 이슈 유형 라벨이 없으면 Workflow Engine이 현재 GitHub 실행 경로와 권한 조건을 확인한 뒤 생성한다.
- 템플릿 또는 라벨의 GitHub 상태 변경은 `structured-execution-contract.md`와 `command-execution-path-contract.md`를 따른다.

## 초기화 결과와 재개

초기화 결과에는 다음을 남긴다.

- 최초 요구를 발생시킨 현재 작업
- 관측한 설정·템플릿·라벨과 누락 항목
- 생성하거나 보완한 파일과 GitHub 상태
- 보존한 기존 값과 허용된 확장
- 사용자 결정이 필요한 충돌과 재개 조건
- 실행 후 검증 결과

필요한 항목이 준비된 경우에만 원래 작업을 계속한다. 충돌, 권한 부족, 사용자 결정 대기 상태에서는 원래 작업의 요청 범위를 바꾸지 않고 중단한다.
