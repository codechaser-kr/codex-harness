# Phase 2 Day 6 — Failure, Trace, and Reporting

> 관측일: 2026-10-18 (Asia/Seoul)  
> 기준 branch / HEAD: `docs/repository-evolution-workshop` / `2a0c136f45877723a0ba6ee04b46b2b6c1439bfd`  
> 작업 트리: 조사 시작 시 clean  
> 조사 범위: 현재 Harness·GitHub Agentic Loop source, 설정과 계약 문서, 기존 로컬 실행 기록, 관련 테스트 source  
> 변경 범위: 본 보고서만 추가. 실행 체계·타겟·GitHub 상태는 변경하지 않음

## 문서 성격과 증거 표기

이 문서는 워크숍 조사 결과이며 공식 설계나 정책을 확정하지 않는다. Day 1~5 문서는 탐색 입력으로 읽었고, 그 결론을 현재 사실로 승격하지 않았다. 관련 source와 설정을 현재 HEAD에서 다시 읽고, 기존 실행 기록은 기록 당시의 근거로만 사용했다.

- **[RF] 현재 저장소 사실**: 현재 checkout의 source, 설정, 문서 또는 로컬 파일 inventory에서 직접 확인
- **[DES] 문서 설계**: 현재 계약·설계 문서에 적힌 규칙. 그 자체로 runtime 관측은 아님
- **[HE] 역사적 실행 근거**: 기존 실제 실행 로그. 기록 당시의 관측이며 이번 실행으로 재현하지 않음
- **[TF] 테스트/fixture source**: 기존 테스트와 fixture 내용을 읽어 확인. 이번에는 실행하지 않음
- **[OBS] 이번 조사 관측**: checkout, 파일 내용과 보존 파일에 대한 읽기 전용 확인. Harness 또는 Workflow runtime 관측은 없음
- **[AJ] 분석 판단**: 위 근거에서 도출한 해석이나 개선 후보

Day 5 보고서는 이전 HEAD `be3ce3ba12ebea66b63b8b2e98cf28f57230cf12`를 기준으로 했다. 현재 HEAD는 그 뒤의 `2a0c136f45877723a0ba6ee04b46b2b6c1439bfd`이므로 Day 5 기록은 역사적 근거로만 취급하고, 현재 source를 다시 확인했다. [RF]

이번 조사는 실제 Harness 재진입, 보호 경로 쓰기, 테스트 실행, Workflow 시작·재개, live GitHub 조회·변경을 하지 않았다. 따라서 현재 GitHub 상태나 외부 skill/provider 가용성은 주장하지 않는다. [OBS]

## 현재 기준선과 조사 순서

현재 기준선은 `docs/repository-evolution-workshop` branch, HEAD `2a0c136f45877723a0ba6ee04b46b2b6c1439bfd`다. 시작 시 `git status --short` 출력은 비어 있었다. [OBS]

확인한 주요 자료:

- Harness runtime instruction: `.codex-dist/skills/harness/SKILL.md`
- Harness 결과 보존: `.codex-dist/skills/harness/references/logging-contract.md`, `orchestrator-template.md`, `reentry-rules.md`, `verification-checklist.md`, `quality-evaluation-guide.md`
- GitHub Agentic Loop instruction: `.codex-dist/skills/github-agentic-loop/SKILL.md`
- Workflow 상태와 실행 계약: `references/state-observation-contract.md`, `normalized-fact-adapter-contract.md`, `workflow-definition-contract.md`, `structured-execution-contract.md`
- 설정·실패 세부 계약: `references/target-runtime-bootstrap-contract.md`, `review-runtime-contract.md`, `command-execution-path-contract.md`, `file-change-execution-contract.md`, `target-harness-execution-contract.md`, `claude-review-executor-contract.md`, `agent-lifecycle-contract.md`, `validation-mode-contract.md`
- 현재 설정과 기록: `.github-agentic-loop/settings.json`, `.github-agentic-loop/logs/`, `.harness/logs/`, `.harness/evaluations/`
- 검증 source: `.codex-dist/skills/github-agentic-loop/scripts/workflow-definition/{parser,validator,normalized-fact-adapter,workflow-state-adapter,evaluator}.mjs`와 기존 테스트 source

## 주요 실패 유형과 처리 방식

| 실패 유형 | 운영 실패와 구현 결함 구분 | 안전 처리 | 진단 근거·사용자 행동·재개 조건 |
| --- | --- | --- | --- |
| 인식할 수 없는 GitHub 상태, 누락·충돌한 사실, 후보 모호성 | 외부 API 값이 지원되는 상태로 해석되지 않거나 관측 근거가 빠진 것은 입력/운영 실패다. 이를 잘못된 완료 사실로 바꾸거나 모호한 후보를 임의 선택하면 구현 결함이다. | **Fail-closed**. `state-observation-contract.md`는 누락·충돌 facts를 자동 보완하지 않고, 하나의 현재 작업을 정할 수 없으면 `중단`하도록 한다. | 상태 계약은 Issue/PR의 `OPEN`/`open`, PR merged의 `true`/`MERGED`/`merged` 같은 알려진 판정을 적는다. 사용자는 문제 상태와 원본 field를 확인하고, 수정된 상태를 반영한 재관측을 요청해야 한다. 현재 코드는 raw GitHub API 응답을 파싱하지 않으므로 일반적인 `unsupported_github_state` 오류 코드가 실제로 항상 반환되는지는 확인되지 않았다. [DES][AJ] |
| Definition, observation, fact schema/계약 불일치 | 배포된 Definition이나 adapter 계약의 잘못된 선언은 구현/설정 결함이다. 타겟이 허용되지 않은 값이나 구조를 제공하는 것은 입력 불일치다. | **즉시 중단**하고 부분 정규화 상태를 버린다. 자동 수정·기본값·fallback은 하지 않는다. | `validateWorkflowDefinition`은 `code`, `path`, `message` 오류를 반환한다. adapter/evaluator는 `invalid_definition`, `invalid_observations`, `invalid_fact_candidates`, `invalid_state` 등을 구조화해 반환하며 실패 시 `normalized_fact_state`와 `evidence_by_fact`를 빈 객체로 둔다. Definition/관측을 고친 뒤 같은 작업 action에서 현재 입력을 다시 수집·검증한다. [RF][DES] |
| 설정 누락 또는 형식 오류 | 설정/필드 누락은 해당 작업에 처음 필요할 때 정상적인 지연 초기화 대상이다. JSON 파손, 지원하지 않는 key/value/type은 운영 설정 오류다. consumer가 알 수 없는 값을 허용하거나 임의 보정하면 결함이다. | **누락은 필요한 필드만 초기화한 뒤 계속**. 인식 불가 설정은 **fail-closed 즉시 중단**. 유효한 기존 값과 확장 필드는 보존한다. | 설정 경로, 문제 field/value, 기대 형식, 영향, 사용자가 수정 후 같은 작업을 재개해야 함을 안내하도록 계약이 정한다. 현재 `.github-agentic-loop/settings.json`의 capability evidence는 `checkedAt: 2026-07-11`이지만 실제 provider/skill 상태를 이번에 재확인하지 않았다. 오래된 날짜만으로 stale 또는 실패라고 판정하지 않는다. [RF][DES] |
| 외부 skill, provider, 도구 또는 실행 권한 부재 | 환경 capability 부재는 운영 조건이다. 선택 가능한 실행 주체가 없는데 실행을 시작하거나 `close_agent`를 정리 대체 수단으로 간주하면 계약 위반이다. | 실행 전에는 지원되는 경로만 선택한다. 파일 변경 전 Harness가 준비되지 않았으면 조건을 만족하는 경우 `general_code_change`로 경로 선택 가능. **한 경로 실행이 시작된 뒤에는 fallback/재시도 금지**. 필수 별도 session이 필요하지만 `close_agent`가 없으면 ID 생성 전에 중단한다. | 누락된 capability와 선택/미선택 경로를 기록한다. Harness가 시작 전 준비되지 않은 경우 일반 경로의 권한·tool·baseline을 확인하고 재개한다. 리뷰 provider 일시 오류는 분류 후 사용자가 재시도를 결정해야 한다. 정확히 10개 session이 필요한 검증 모드는 적은 수로 축소하지 않는다. [DES][RF] |
| 사용자 결정 대기 또는 입력 불일치 | 정상적인 비종결 대기 상태이며 실행 오류가 아니다. 유효하지 않거나 모호한 답도 결정 완료가 아니다. | **보류/대기**. 결정 전 파일·GitHub mutation 금지. | Workflow Definition의 `user_decision_options`가 있으면 `action_required`로 멈추고 선택을 제시한다. 정의된 입력 형식 밖의 응답은 결정을 유지한다. 사용자가 제시된 선택지 또는 유효한 기타 의견을 입력한 뒤, 동일 `currentTaskActionId`에서 새 상태를 읽어 재평가한다. Harness Phase 6도 `사용자 결정 대기`로 끝나며 Phase 7 변경은 결정을 기다린다. [DES] |
| 명령, 파일 변경, 테스트 검증 실패 | 권한 거부, 네트워크 오류, timeout, 외부 서비스 오류는 예상 가능한 운영 실패일 수 있다. 잘못된 명령, 범위 이탈, 실패를 성공으로 보고, 오류 후 다른 실행 경로로 조용히 전환하는 것은 구현 결함이다. | 실행 전 조건·baseline·범위를 확인하지 못하면 **즉시 중단**. 시작 뒤 실패/부분 변경 가능성이 있으면 변경 사실을 보존하고 **중단**. 자동 fallback 금지. 재시도는 원인이 복구됐고 계약 또는 사용자가 허용한 경우에만. | `performed_actions`, `changed_files`, `verification_results`, `postconditions_satisfied`, `residual_risks_or_failure_reasons` 및 사용자에게 복구·재개 조건을 남긴다. 테스트 실패는 성공 fact로 승격하지 않는다. 재개 전 GitHub/코드/baseline을 다시 관측하며 target 상태가 달라졌다면 새 요청·baseline이 필요할 수 있다. [DES] |
| subagent 결과·timeout·정리 실패 | timeout 및 cleanup tool 부재는 host 운영 조건이다. 실행 주체가 결과를 저장하지 않고 ID를 정리하거나, 미호출된 ID를 `not_found`로 기록하면 구현 결함이다. | 첫 `spawn` 전 `close_agent` preflight. capability가 없으면 새 ID 미발급. 생성된 경우 결과·오류·timeout을 먼저 보존하고 ID 소유자가 정리한다. cleanup 실패는 결과 실패와 별도로 남기며 완전 성공으로 취급하지 않는다. | ID별 실제 결과와 cleanup 결과를 저장한다. 사용자는 capability 복구나 unresolved cleanup 정리 뒤 해당 실행을 재평가한다. 검증 fan-out 실패는 누락 결과를 만들거나 자동 재시도하지 않고 관측 수와 raw result를 보고한다. [DES] |

## 오류별 메시지와 진단 가능성

| 경계 | 원인·영향 설명 | 다음 행동·재개 정보 | 평가 |
| --- | --- | --- | --- |
| Harness 의미·라우팅 중단 | `run-harness`는 입력 부족, 0개/복수 role 후보, role/agent/skill mismatch 등을 분류하고 파일을 수정하지 않는 중단을 정의한다. `orchestrator-template.md`는 입력 보강, 해당 역할의 출력 기준 재확인, 재진입 Phase를 연결한다. | `session-log.md`에 세션 상태·입출력·변경 파일·위험·메모, `latest-session-summary.md`에 다음 역할/재진입 Phase/우선 입력을 기록한다. | 설계상 사용자에게 다음 행동을 안내한다. 공통 오류 코드, raw 예외·exit code, baseline을 모든 Harness 로그에 강제하지는 않는다. [DES] |
| Harness 환경 실패 실제 기록 | H1 기록은 `.codex/agents`·`.agents/skills` 생성의 `Read-only file system`, Phase 0–2 완료/Phase 3 실패, 제품 source 무변경, Phase 4–6 미실행, 재진입 Phase 3, 다음 확인 입력을 남겼다. | 쓰기 가능 조건 복구 뒤 `run_harness`가 `team-spec.md`를 재확인하고 Phase 3부터 재개하도록 기록했다. | 이 단일 실패의 원인·영향·다음 행동은 충분히 진단 가능하다. 다만 기록에는 자동 상관관계에 쓸 `request_id`/target baseline 필드가 없고, 전 환경에 공통인 오류 레코드도 아니다. [HE][AJ] |
| Workflow Definition/adapter/evaluator | 오류는 안정적인 `reason`, `code`, JSON pointer `path`, `message`, 필요 시 `witness`로 표현된다. CLI는 JSON 결과와 구분되는 exit code를 제공한다. | 오류를 수정한 뒤 definition/state를 다시 검증하고 task action을 재평가한다. `current_task_action_id` 불일치, 0/복수 transition, cycle은 구체적인 `stopped.reason`으로 반환한다. | 기계 판별과 개발자 진단에 강하다. 그러나 raw GitHub status를 fact로 만드는 관측 단계 자체는 이 순수 함수 영역 밖이다. [RF][DES] |
| Workflow 설정/리뷰 실행 | 설정 오류는 path, field/value, 기대 형식, 영향, 수정 후 재개를 요구한다. Claude 리뷰 오류는 exit code·stdout·stderr와 재로그인/일시 재시도/원인 확인을 구분한다. | 인증 복구 후 사용자 재개, 일시 오류는 같은 명령에 대한 사용자 재시도 결정, 그 외는 사용자에게 실행 모드 유지/변경을 요청한다. | 오류 유형별 다음 행동이 구체적이다. 이 상세 수준이 모든 executor의 오류에 균일하게 적용된다고 보장되지는 않는다. [DES] |
| Workflow 일반 구조화 실행 | 실패는 `request_id`, `target_baseline`, 요청·결과 일치, 실행 범위, 수행 action, 변경 파일·GitHub 상태, 검증과 잔여 위험을 기준으로 성공/중단을 나눈다. | 누락값 보완, baseline 재확인, 사용자 결정, 권한/tool 확인, 범위 축소 또는 새 request 중 필요한 조건을 제시한다. | 진단 데이터 envelope는 강하다. 공통 계약은 임의의 command stdout/stderr를 모든 실행에서 보존하라고 명시하지 않는다. 예외적으로 Claude 리뷰 계약은 이를 요구한다. [DES][AJ] |

### 기존 실행 기록에서 다시 확인한 사례

- **Harness H1 — 실제 runtime, 역사 기록**: `/tmp/day4-state-harness-first.nPU1fp/.harness/logs/session-log.md`와 `latest-session-summary.md`에서 세션 `harness-20261018-0445`를 읽었다. `mkdir -p .codex/agents .agents/skills/...`가 `Read-only file system`으로 실패했고, Phase 0–2는 완료, Phase 3은 실패, Phase 4–6은 미실행이라고 기록돼 있다. 제품 source는 바뀌지 않았고 요약은 Phase 3을 다음 재진입 지점으로 제시한다. 이는 Day 4의 실제 실행 근거이지 Day 6 runtime이 아니다. [HE]
- **Workflow observation 정규화 실패 — 기존 날짜별 실행 로그**: `.github-agentic-loop/logs/github-workflow-log-2026-08-06.md:77`은 `source_reference`가 `null` 또는 누락된 첫 두 입력을 `invalid_observations`로 원자 중단하고 evaluator를 실행하지 않았다고 기록한다. 유효한 근거 참조를 보완한 뒤 진행했다고 남겨 실패 위치와 복구가 연결된다. [HE]
- **호출자와 반환 계약의 불일치 — 기존 날짜별 실행 로그**: 같은 파일 `:104`는 `prepareWorkflowDefinition` 성공 status `prepared`를 caller가 `ready`와 비교해 adapter/evaluator 전에 멈춘 사례를 기록한다. 반환 계약을 확인하고 올바른 값을 사용해 같은 raw Definition으로 재개했다고 적혀 있다. 기록상 구현자 오류에 가까운 실패지만 자동 성공으로 처리하지 않았다. [HE][AJ]
- **날짜 경계 재개**: 같은 로그 `:5`는 2026-08-06 실행이 이전 날짜 파일의 `request_id`를 복원한 사실을 남긴다. 이는 파일 기반 trace로 이어진 기존 사례지만 현 날짜가 2026-10-18인 현재 상태를 설명하지 않는다. [HE]

이번 실행은 위 로그를 읽었을 뿐, 테스트나 runtime을 다시 실행하지 않았다. 테스트 파일에서 `invalid_fact_candidates`, `invalid_observations`, `no_transition_match`, `multiple_transition_matches`, `invalid_state`, `task_action_id` 재개 테스트를 확인했으며, 이는 synthetic 입력 계약을 다루는 테스트 source다. 현재 HEAD에서 해당 테스트가 통과한다고 보고하지 않는다. [TF]

## 근거 저장 위치와 정본 상태

| 기록 또는 상태 | 위치 | 보존 특성 | 정본과 진단 역할 |
| --- | --- | --- | --- |
| Harness 역할·흐름 정본 | 타겟 `.harness/docs/team-spec.md`, 관련 orchestration | 타겟 저장소 문서 | 역할 경계와 승인 범위의 설계 기준. 실행 결과·품질 최종 판정은 아님. [DES] |
| Harness 누적 실행 journal | 타겟 `.harness/logs/session-log.md` | 세션별 Markdown 누적. 계약상 필수 완료 조건 | 환경 메모, 오류/timeout, 승인, 변경 파일, 위험과 실행 결과를 보존. Target SoT 또는 현재 코드 상태를 대체하지 않음. [DES] |
| Harness 최신 재진입 checkpoint | 타겟 `.harness/logs/latest-session-summary.md` | 마지막 세션 요약으로 갱신 | 다음 역할/Phase와 우선 입력 안내. 과거 실패를 상세히 쌓는 journal도 아니고, 현재 상태를 재관측 없이 확정하는 정본도 아님. [DES] |
| Harness 평가 기록 | `.harness/evaluations/targets/<target>/<date>-<topic>.md` | 생성 결과 차이와 판단 근거를 남기는 Markdown 평가 코퍼스 | 장기 비교·개선 근거. 코어 계약이나 자동 runtime trace는 아님. 현재 `2026-05-09-refresh-harness-meta.md`가 예시로 존재한다. [RF][DES] |
| Workflow current state | GitHub Issue/PR body·state·체크리스트 및 PR review threads | 원격 협업 상태 | Workflow 완료/미완료 사실의 정본. 일반 PR issue comment는 review feedback 정본이 아니다. [DES] |
| Workflow 실행 기록 | 타겟 `.github-agentic-loop/logs/github-workflow-log-YYYY-MM-DD.md` | 날짜별 Markdown 보조 로그 | `request_id`, `workflow_id`, `task_action_id`, 근거, 결정, 실행·검증·재개를 추적한다. GitHub와 충돌하면 GitHub 우선. [DES] |
| GitHub comment/review thread | Issue/PR comments와 PR review threads | GitHub에 게시되면 원격 보존 | 피드백 전달 및 실행 결과의 durable 기록일 수 있다. 특정 전이의 완료 사실은 해당 계약이 지정한 Issue/PR 상태를 다시 확인한다. Review feedback의 정본은 PR review threads다. [DES] |
| 명령 stdout/stderr와 도구 응답 | 현재 Codex 대화/도구 출력, 선택적으로 실행 로그에 요약 | 일반적으로 일회성 실행 문맥. 대화 밖 장기 보존은 계약에 일괄 보장되지 않음 | 구조화된 `verification_results` 등으로 요약하면 재개에 도움이 된다. 보존되지 않은 원본 출력은 후속 진단에서 재현할 수 없을 수 있다. [DES][AJ] |

### 현재 checkout에서 관측한 보존 경계

- `.github-agentic-loop/settings.json`은 `dependencies.commit.available=true`와 세 review mode의 `available=true`, `checkedAt=2026-07-11`을 담고 있다. 이는 저장된 capability 관측값이지 현재 외부 skill/provider의 live 확인이 아니다. [RF]
- `.github-agentic-loop/logs/`에는 2026-08-02, 04, 05, 06, 09 날짜 파일이 있다. 2026-10-18 날짜 파일은 없고 이번에는 Workflow를 실행하지 않았다. [OBS]
- `.github-agentic-loop/logs/` 및 `.harness/logs/`는 `.gitignore` 규칙에 걸리고 `git ls-files`에서 추적되지 않았다. 현 checkout에서 읽을 수 있는 기록이므로 과거 근거에는 쓸 수 있지만, 새 clone이나 다른 실행 host로 자동 전달되는 장기 보존으로 볼 수 없다. [OBS]
- 현재 `.harness/logs/github-workflow-log.md`는 15,201줄이고 `.github-agentic-loop/logs/github-workflow-log-2026-08-09.md`는 386줄이다. 현재 Workflow `SKILL.md`와 설계 문서는 날짜별 `.github-agentic-loop/logs/`를 지정하며, `.harness/logs/`에 Workflow 로그를 쓰지 않는다고 한다. 따라서 큰 `.harness` 파일은 현행 입력으로 가정하지 않고, 구 경로의 로컬 기록으로 취급한다. 두 파일의 동시 존재는 조사 대상의 context 혼동 가능성이지만 현재 source가 구 파일을 읽는다는 증거는 없다. [RF][OBS][AJ]

## Harness와 GitHub Agentic Loop의 관측·보고 특성

| 항목 | Harness | GitHub Agentic Loop |
| --- | --- | --- |
| 실패 소유자 | 주 에이전트가 타겟 문서·역할·QA 산출물의 의미를 통합한다. 생성된 역할 결과와 cleanup 책임도 실행 주체별로 나눈다. | Workflow Engine이 GitHub/local/user/skill 근거를 정규화하고 Definition/evaluator로 현재 task와 결과 사용 가능 여부를 판정한다. 실행 주체는 확정된 범위를 수행한다. |
| 관측 모델 | 의미적 실패와 환경 문제를 Markdown 문맥으로 기술한다. `team-spec`/산출물 비교, 로그와 사용자 선택으로 재진입 Phase를 정한다. | 닫힌 fact domain, provenance(`source_kind`, `source_reference`, `field_reference`), `request_id`, `task_action_id`, baseline과 사후조건으로 구조화한다. 최신 상태를 다시 관측해 evaluator를 재실행한다. |
| safe stop | 0/복수 라우팅 후보, 역할 불일치, 입력 부족에서 파일 변경을 멈춘다. Phase 6 사용자 결정이 없으면 Phase 7을 시작하지 않는다. | unknown/missing/conflicting facts, Definition/adapter 오류, 0/복수 transition, baseline·범위·권한 오류에서 성공·다음 전이를 금지한다. 사용자 결정 task는 선택이 있기 전 `action_required`로 멈춘다. |
| 재개 범위 | `latest-session-summary.md`의 후보 Phase/다음 역할에서 시작하되 current target source와 산출물을 다시 감사한다. 사용자가 실제 변경 범위를 정한다. | 같은 `currentTaskActionId`에서 live GitHub/code 상태를 재수집해 재정규화·재평가한다. 실행 로그는 GitHub 밖의 중간 근거를 복원하는 보조 자료다. |
| 보고 강점 | 사람이 읽기 쉽고, 실패 비용·영향·불확실성·사용자 결정을 함께 설명할 수 있다. H1 기록은 환경 실패 후 어디서 재개할지 분명하다. | 오류 코드/path, workflow/task ID, evidence, 실행 주체·session, 변경 및 검증 결과가 있어 기계적 재현과 진단에 강하다. 기존 로그는 날짜를 넘어 이전 request를 찾아간 사례를 남겼다. |
| 남는 공백 | 오류 필드, baseline, raw stderr/exit code, 실행 버전이 모든 로그에 일관된 형태로 들어가도록 강제하지 않는다. 이번 H1 기록은 충분했지만 보편 계약이라 할 수 없다. | raw GitHub 상태를 fact로 해석하는 자연어 관측과 외부 API 호출은 validator/evaluator 바깥이다. 일반 실행의 원본 stdout/stderr를 모두 보존한다는 공통 규칙은 확인되지 않았다. |

두 스킬은 현재 실패의 소유자, 상태 정본, 진단 방식과 복구 단위가 다르다. Workflow의 구조화된 사실 평가가 Harness의 의미 판단을 대신하지 않고, Harness 로그가 GitHub 상태를 대체하지 않는다. 같은 저장소에 있다는 사실만으로 실패 소유권이나 복구 범위가 실제로 악화된 근거는 찾지 못했다. 남은 질문은 legacy `.harness/logs/github-workflow-log.md` 같은 이름·경로가 사용자나 다음 세션의 근거 선택을 흐리는지, 그리고 실행 경로 간 handoff에서 충분한 진단 정보가 이어지는지다. 이를 근거 없이 공존 문제로 결론 내리지 않는다. [RF][DES][AJ]

## 중앙 trace 저장소 필요성

현재는 공통 DB나 중앙 trace service가 없다. 대신 Harness는 타겟별 저널/checkpoint, GitHub Agentic Loop는 GitHub 정본 + 날짜별 보조 로그를 사용한다. [RF][DES]

현재 범위에서 중앙 저장소가 필수라고 볼 증거는 없다.

- Harness H1의 실제 실패가 타겟 로그의 세션 ID, 실패 명령, 오류 문구, 바뀐 파일, 완료/미실행 Phase, 다음 재진입 입력으로 복원됐다. [HE]
- Workflow 로그는 `request_id`와 `task_action_id`로 실행 단위를 연결하고 GitHub를 재조회해 current state를 판정한다. 2026-08-06 기록에는 날짜 경계를 넘긴 request 복원 사례가 있다. [DES][HE]
- evaluator와 adapter는 순수 함수라 같은 Definition/fact 입력의 결과를 fixture로 재현할 수 있다. 기존 테스트 source는 malformed input, 0/복수 match, resume action ID 등의 경계를 다룬다. [RF][TF]

다만 이는 “중앙 trace가 전혀 필요 없다”는 증명은 아니다. 날짜별 로그와 Harness 로그가 `.gitignore` 대상이라 보존 범위가 현 host workspace에 묶이고, 도구 원본 출력이 일반적으로 보장되지 않으며, central correlation/search는 없다. 현 checkout의 15,201줄 legacy Workflow 파일은 큰 단일 문서를 무심코 context에 포함하면 과도한 맥락과 오래된 상태의 정본 오인을 일으킬 수 있지만, 현행 skill이 그 파일을 입력으로 읽는다는 증거는 찾지 못했다. [RF][OBS][AJ]

**평가**: 현재 운영 규모와 관측된 사례에서는 기존 파일 기반 trace로 문제 진단·재개가 가능했으며, 중앙 trace 구축은 보류한다. 여러 target/host 간 추적, 장기 감사/보존 요구, 실행 상태 손실, 반복적인 수동 검색 비용이 실제로 확인되면 보존 정책 또는 기능 제안으로 재평가한다. 그때도 GitHub와 사용자 결정을 대체하는 두 번째 정본을 만들 필요가 있는지부터 따져야 한다. [AJ]

## 개선 후보 분류

### 즉시 수정

- **없음.** 현재 HEAD source와 직접 확인한 기록에서 안전 중단을 우회하거나 오류를 성공으로 바꾼 구현 결함은 확인하지 못했다. 이 Day는 분석만 수행했고 구현 변경은 하지 않았다. [RF][HE][AJ]

### 정책 검토 필요

- **오류 레코드의 공통 진단 최소 필드**: 두 runtime은 책임에 맞는 기존 출력 모델을 유지하되, 실행 시작 후 실패에 `request_id` 또는 Harness `session_id`, target baseline 식별자, 정확한 failed operation/exit status, 변경 여부, verification result, next action/reentry 조건 중 무엇을 필수로 남길지 정할 수 있다. 이는 기록 의무·보존 비용과 runtime 경계에 영향을 주므로 문서 문구만 즉시 바꾸지 않는다. [DES][AJ]
- **ignored log의 장기 보존 필요성**: 현재 보존은 로컬 workspace에 한정된다. 실행 종료 후에도 조직 차원의 장기 이력이나 host 간 복원을 요구하는지 사용자/운영 정책을 확인하기 전에는 버전 관리 또는 외부 저장소를 도입하지 않는다. [RF][DES][AJ]

### 기능 제안

- **중앙 trace 검색/저장 기능**: 현 근거만으로 제안하지 않는다. 다수 target/host 또는 보존 의무에서 기존 date/session 단위 기록으로 복구가 반복 실패하거나 검색 비용이 측정될 경우 request-to-run 검색 기능 후보로 승격한다. 새 상태 정본을 추가하지 않는 범위부터 평가한다. [AJ]
- **지원하지 않는 raw GitHub 상태의 명시 진단**: 현재 상태 계약은 허용 상태와 fail-closed 동작을 정의하지만, raw 상태를 normalized fact로 옮기는 owner와 공통 오류 표현은 정적 코드에서 확인되지 않았다. live 또는 재현 가능한 예에서 실제 진단 누락이 발견되면 입력 boundary 관측 계약이나 adapter 기능 제안으로 다룬다. [DES][RF][AJ]

### 보류

- `.github-agentic-loop/settings.json`의 `checkedAt=2026-07-11`이 실제 capability 문제를 일으켰다는 evidence는 없다. TTL이나 강제 재검증 정책을 추가하지 않는다. [RF][AJ]
- `.harness/logs/github-workflow-log.md`와 날짜별 로그의 공존은 현재 local 파일 inventory에서 확인했지만, 현행 runtime이 구 파일을 소비한다는 증거는 없다. Day 7에서 Phase 2 전체 맥락·로그 ownership과 함께 검토한다. [OBS][AJ]
- Harness Phase 6 사용자 gate, missing external skill, 실제 unknown GitHub status, post-write 테스트 실패, subagent cleanup failure는 현재 source 계약 또는 과거 기록만으로 runtime 경로 전체를 입증하지 못했다. 실제 실행은 별도 승인과 명확한 격리·권한 범위가 필요한 관측이므로 이번에는 하지 않는다. [DES][HE][AJ]

## 남은 질문

1. raw GitHub 응답을 `state-observation-contract.md`의 boolean/string fact로 바꾸는 실제 담당 경계는 어디이며, 지원하지 않는 status/GraphQL 값은 어떤 사용자 메시지로 반환되는가?
2. Harness의 실행 로그에서 일반적인 실패라도 어떤 최소 정보가 반드시 남는가? session ID만으로 target baseline·Harness source/version까지 재구성할 수 있는가?
3. 모든 Workflow executor가 실행 후 실패 시 명령·exit code·stdout/stderr를 어떻게 보존하는가? 현재 일반 결과 envelope만으로 원인을 재현하기에 충분한가?
4. target-local ignored log의 기대 수명은 Codex workspace lifetime과 같아도 되는가? 다른 host/clone 재개나 감사 보존이 요구되는가?
5. 현행 `request_id`, Harness session ID, GH object ID 사이에 소유자 또는 handoff 진단이 빠지는 사례가 있었는가? 두 skill의 공존 자체보다 실패 인계에서 확인할 질문이다.

## Day 6 완료 조건 점검

- [x] 주요 실패 유형과 처리 방식을 분류했다: unknown/missing GitHub facts, 계약/Definition/schema, 설정/의존성, 사용자 결정, 명령·파일·테스트, agent lifecycle.
- [x] 예상 가능한 운영 실패와 구현 결함을 구별했고, 실제 확인하지 않은 결함은 주장하지 않았다.
- [x] fail-closed, 사용자 확인, 재시도, 보류, 즉시 중단의 기준과 재개 조건을 설명했다.
- [x] 오류 메시지가 원인·영향·행동·재개 조건을 제공하는 강점과 공통 필드·raw output 보존의 공백을 구분했다.
- [x] 실행 근거의 저장 위치, GitHub/target 정본, 날짜별 로그와 일회성 tool output을 구분했다.
- [x] Harness와 GitHub Agentic Loop의 별도 실패 소유권·복구 단위를 비교했다. 두 스킬의 동거가 문제라는 결론은 내리지 않았다.
- [x] 기존 로그와 테스트 source를 직접 확인했으며, 역사 로그·synthetic fixture·현재 runtime 관측을 분리했다.
- [x] 중앙 trace 필요성을 실제 사례와 보존 한계를 근거로 평가했다.
- [x] 개선 후보를 즉시 수정, 정책 검토, 기능 제안, 보류로 나눴고 구현·테스트 실행은 하지 않았다.

## Day 7 인계 — Phase 2 Synthesis

Day 7에서는 Day 1~6 보고서를 현재 source와 대조하면서 다음을 함께 결정한다.

- failure/reporting에서 확인된 증상과 근본 원인을 구분한다. 특히 raw GitHub state 관측 owner, generic executor output 보존, ignored log의 보존 범위를 조사 질문으로 유지한다.
- Harness와 GitHub Agentic Loop의 서로 다른 정본·재진입 모델이 의도된 경계인지, 실패 handoff에서 실제 빈틈을 만드는지 판단한다. 같은 저장소의 co-location만으로 문제를 가정하지 않는다.
- 중앙 runtime/registry/trace store 필요성은 현재 관측된 복구 성공과 아직 증명되지 않은 장기 보존 요구를 함께 비교한다.
- 현재 branch/HEAD와 `main`의 기준선을 다시 확인하고, 정책 검토·기능 제안·보류 항목을 Phase 2 요약에 정리한다.

## 재확인용 출처 경로와 식별자

- Harness: `.codex-dist/skills/harness/SKILL.md`; `references/logging-contract.md` (`session-log.md`, `latest-session-summary.md`, `planned`/`in_progress`/`completed`/`timed_out`/`failed`); `references/orchestrator-template.md`; `references/reentry-rules.md`; `references/verification-checklist.md`; `references/quality-evaluation-guide.md`
- GitHub Agentic Loop: `.codex-dist/skills/github-agentic-loop/SKILL.md` (특히 `request_id`, `workflow_id`, `task_action_id`, `.github-agentic-loop/logs/github-workflow-log-YYYY-MM-DD.md`); `references/state-observation-contract.md`; `references/normalized-fact-adapter-contract.md`; `references/workflow-definition-contract.md`; `references/structured-execution-contract.md`
- 실패 세부: `references/target-runtime-bootstrap-contract.md`; `references/review-runtime-contract.md`; `references/command-execution-path-contract.md`; `references/file-change-execution-contract.md`; `references/target-harness-execution-contract.md`; `references/claude-review-executor-contract.md`; `references/agent-lifecycle-contract.md`; `references/validation-mode-contract.md`
- 구현 식별자: `validateWorkflowDefinition`, `parseJsonFile`, `normalizeWorkflowObservations`, `normalizeFactCandidates`, `evaluateWorkflowDefinition`; reasons `invalid_definition`, `invalid_observations`, `invalid_fact_candidates`, `invalid_state`, `no_transition_match`, `multiple_transition_matches`, `current_task_action_condition_not_met`, `evaluation_cycle`
- 테스트 source (미실행): `.codex-dist/skills/github-agentic-loop/tests/workflow-definition/{structural-validation,semantic-validation,normalized-fact-adapter,evaluator,feature-change}.test.mjs`; `.codex-dist/skills/harness/tests/user-decision-boundary.test.mjs`
- 역사적 기록: `/tmp/day4-state-harness-first.nPU1fp/.harness/logs/{session-log,latest-session-summary}.md`; `.github-agentic-loop/logs/github-workflow-log-2026-08-06.md:5,77,104`; 현재 local log ignore 규칙 `.gitignore:3-4`
