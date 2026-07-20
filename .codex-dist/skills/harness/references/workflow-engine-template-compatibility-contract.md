# Workflow Engine 템플릿 정합성 계약

이 계약은 하네스가 타겟 레포에 GitHub Workflow Engine 템플릿을 적용·갱신하거나 운영 상태를 감사할 때 사용한다.

## 런타임 원천 확인

템플릿을 적용하거나 감사하기 전에 다음 런타임 원천을 읽는다.

`../github-workflow-engine/references/github-templates.md`

title prefix, label, 필수 섹션, 이슈 유형별 선택지, 후속 작업, PR 연결 규칙을 포함한 런타임 데이터는 위 문서에서 가져온다. 이 계약은 해당 데이터를 타겟 레포의 템플릿에 적용하고 정합성을 판정하는 절차만 정의한다.

## 기대 파일

타겟 레포에는 다음 파일을 기본 대상으로 둔다.

- `.github/ISSUE_TEMPLATE/proposal_template.md`
- `.github/ISSUE_TEMPLATE/decision_template.md`
- `.github/ISSUE_TEMPLATE/feature_template.md`
- `.github/ISSUE_TEMPLATE/fix_template.md`
- `.github/pull_request_template.md`

타겟 레포가 다른 파일명을 사용하는 경우에도 런타임 원천의 title prefix, label, 필수 섹션, PR 연결 규칙을 만족하는 파일을 매핑 대상으로 정하고 그 근거를 기록한다.

## 적용과 갱신

1. 런타임 원천에서 현재 필요한 이슈 유형, PR 규칙, 라벨, 연결 규칙을 읽는다.
2. 타겟 레포의 기존 `.github` 템플릿과 파일 매핑을 확인한다.
3. 누락된 템플릿은 런타임 원천의 구조와 데이터를 사용해 작성한다.
4. 기존 템플릿은 런타임 원천과 비교해 필요한 섹션, 선택지, 기본값, 연결 안내를 갱신한다.
5. 타겟 레포에 이슈 유형별 라벨 네 가지가 정확한 이름으로 존재하는지 확인하고, 라벨 생성은 `repo-bootstrap` 저장소의 설치 절차에 맡긴다.
6. 변경 내용과 매핑 근거를 감사 가능한 결과로 남긴다.

## 감사 항목

이슈 템플릿은 다음 항목을 런타임 원천과 대조한다.

- YAML frontmatter의 `title`과 title prefix
- YAML frontmatter의 `labels`와 유형별 라벨
- 타겟 GitHub 레포의 이슈 유형별 라벨 네 가지 존재 여부
- 런타임 원천에 정의된 필수 섹션
- 기능제안의 `판단 결과` 선택지
- 정책검토의 기본 후속 작업 체크리스트
- 기능변경의 `포함`·`제외` 작업 범위
- 기능결함의 문제 유형 선택지

PR 템플릿은 다음 항목을 런타임 원천과 대조한다.

- 런타임 원천에 정의된 필수 섹션
- `머지하기 전에 반드시 확인되어야 할 사항이 있다면 작성해 주세요. (optional)`의 merge 선행 조건 용도
- `연관 이슈 (optional)` 섹션
- `Refs #번호` 안내 또는 기본값
- Workflow Engine 관리 PR의 `Refs #번호` 연결 키워드 기본값

## 판정과 사용자 결정

- `정합`: 런타임 원천의 title prefix, label, 이슈 유형별 라벨 존재 여부, 필수 섹션, 선택지, 기본 후속 작업, 연결 규칙을 모두 충족한다.
- `허용된 확장`: 런타임 원천을 유지하면서 타겟 도메인용 섹션이나 설명을 추가한다.
- `불일치`: 런타임 원천의 필수 기준이 누락되거나 충돌한다.

불일치가 확인되면 차이, 영향 범위, 수정 후보를 사용자에게 제시한다. 사용자 결정으로 갱신 범위를 확정한 뒤 타겟 `.github` 템플릿을 적용하거나 갱신한다.
