# Phase 2 Day 5 — Idempotency, Resume, and Recovery

> 관측일: 2026-10-18 (Asia/Seoul)
> 기준 branch / HEAD: docs/repository-evolution-workshop / be3ce3ba12ebea66b63b8b2e98cf28f57230cf12
> 조사 범위: 저장소 source·설정·설치 상태, read-only GitHub 관측, 기존 isolated Harness target, 새 disposable target과 installer fixture
> 저장소 변경: 이 보고서만 추가했다. source·설정·설치본·기존 사용자 파일과 GitHub 상태는 변경하지 않았다.

## 증거 표기

- **[RF] repository fact**: 현재 checkout의 source, 설정, tracked 문서 또는 저장소 명령으로 확인
- **[HO] host observation**: 설치 경로, Codex tool surface, sandbox와 격리 환경에서 확인
- **[ARO] actual runtime observation**: Codex runtime, GitHub read-only query 또는 실행된 명령의 실제 결과
- **[HE] historical execution evidence**: 이전 Day 실행 로그. 그 당시의 사실로만 유지
- **[SF] synthetic fixture/test**: 격리된 입력으로 실행한 테스트 또는 재현
- **[AJ] analysis judgment**: 위 근거에서 도출한 영향과 개선 후보

## 오늘의 개념과 조사 순서

같은 요청이 반복돼도 원치 않는 추가 부수 효과가 없어야 한다는 뜻으로 idempotency를 사용했다. Workflow의 action 재생은 replay safety, 재진입할 단계는 resume point, 실패 뒤 같은 실행 경로를 계속하거나 멈추는 지점은 recovery boundary로 구분했다. 부분 실패는 일부 상태가 기록된 뒤 종료된 경우이며, duplicate prevention은 같은 작업을 다시 만드는 일을 막는 조건이다. Compensating action은 실행 취소 대신 이미 만들어진 상태를 되돌리거나 보완하는 행동이고, reconciliation은 현재 정본과 파생 산출물을 다시 대조해 일관성을 회복하는 작업이다.

조사 순서는 다음과 같았다.

1. 현재 branch, HEAD, worktree와 요청된 8개 워크숍·이전 Day 문서를 확인했다.
2. 현재 Harness·GitHub Agentic Loop source, Definition, adapter, evaluator, 상태·실행 계약, 설정, installer/uninstaller와 fixture를 읽었다.
3. Day 4 H1/H2 target과 로그를 읽기 전용으로 다시 확인하고 Day 4 주장을 현재 관측으로 승격하지 않았다.
4. 격리 CODEX_HOME 로그인·DB 상태를 재확인하고, 새 disposable target에서 실제 Codex sandbox가 필요한 Harness 경로에 쓸 수 있는지 먼저 확인했다.
5. GitHub는 열린 PR을 먼저 조회하고, 후보가 없어 열린 Issue와 해당 Issue를 조회했다. 이후 local settings/log를 읽었다.
6. 기존 Workflow Engine 및 Harness fixture를 실행하고, install/remove/수동 복구와 installer 부분 실패를 별도 /tmp fixture에서 재현했다.
7. 실제로 실행하지 못한 재진입·missing evidence 시나리오를 source/test 근거와 구분해 기록했다.

## 현재 기준선과 host 재확인

| 항목 | 현재 확인 | 증거와 한계 |
| --- | --- | --- |
| checkout | branch docs/repository-evolution-workshop, HEAD be3ce3ba12ebea66b63b8b2e98cf28f57230cf12, 시작 시 worktree clean | [RF] 테스트와 fixture도 저장소 source를 변경하지 않았다. 최종 diff는 이 보고서 한 파일이다. |
| source와 설치본 | .codex-dist/skills의 installer 관리 18개와 /home/codechaser/.agents/skills의 대응 tree를 diff -qr로 비교해 18/18 동일 | [RF][HO] parity는 설치 snapshot의 현재 내용 비교이지 다음 실행의 discovery 결과는 아니다. |
| 구 legacy 경로 / backup | /home/codechaser/.codex/skills에는 .system만 확인했고, installer 기본 backup root는 비어 있었다 | [HO] 기존 파일을 정리하거나 이동하지 않았다. |
| Day 4 isolated CODEX_HOME | codex login status는 logged in. codex doctor는 state/log/goals/memories DB integrity ok, rollout scan errors 0을 보고했다. 전체 doctor는 DNS/HTTP reachability 제한으로 exit 1이었다. | [HO] 로그인 자격 정보는 읽거나 기록하지 않았다. DB 정상과 endpoint 접근 실패는 별도 상태다. |
| Codex sandbox policy | codex-cli 0.144.6. /home/codechaser/.codex/config.toml의 writable_roots는 plugin data 경로만 지정한다. workspace-write는 writable root 아래 .codex와 .agents도 재귀적으로 read-only 보호한다. | [HO] [Codex 공식 보안 문서](https://learn.chatgpt.com/docs/agent-approvals-security)는 이 경로들을 보호 경로로 명시한다. writable_roots 추가나 Unix 소유권 변경으로 풀리는 제한이 아니다. |
| 현재 host lifecycle tool | callable close_agent는 현재 노출된 collaboration tool 목록에 없다 | [HO] 이번 조사에서 agent ID를 발급하지 않았다. |
| 현재 Workflow 설정 | .github-agentic-loop/settings.json은 JSON 설정을 보유하고 있으며 dependency/review capability checkedAt은 2026-07-11 | [RF] 날짜만으로 capability가 stale하거나 잘못됐다고 단정할 수 없다. 이번에는 review workflow를 시작하지 않아 live capability 재검증을 하지 않았다. |

## 실제 상태 관측

### Harness H1과 H2

Day 4 H1 target /tmp/day4-state-harness-first.nPU1fp을 읽기 전용으로 다시 inventory했다. 처음 입력 파일 README.md, package.json, src/index.mjs 외에 .harness/docs의 exploration-notes.md, logging-policy.md, project-setup.md, domain-analysis.md, harness-architecture.md, team-structure.md, team-spec.md와 .harness/logs의 session-log.md, latest-session-summary.md가 남아 있다. 즉 Phase 0–2 문서 7개와 두 log가 persistence 됐다. git status에는 입력과 .harness만 untracked로 표시됐고 product source 변경은 기록되지 않았다. [HO][HE]

session-log.md와 latest-session-summary.md의 실제 session ID는 harness-20261018-0445다. 두 로그 모두 Phase 0–2 completed, Phase 3 failed, .codex/agents와 .agents/skills의 Read-only file system 실패, Phase 4–6 미실행을 기록한다. 최신 요약은 Phase 3을 다음 재진입 지점으로 두고, Phase 6 결정 요청은 없었다고 적었다. cleanup 값은 실제 발급 ID 0개와 함께 not_applicable로 남아 있다. [HO][HE]

Day 4 H2 target /tmp/day4-state-harness-reentry.koF6L8은 H1과 별도다. project-setup.md, domain-analysis.md, harness-architecture.md, team-structure.md, team-spec.md의 첫 줄 또는 본문에 Synthetic P1/P2 fixture seed, not produced by a prior Harness runtime 표시를 재확인했다. generated agent/skill과 logs는 없었다. 이 seed는 실제 Harness 산출물이나 재진입 성공 근거가 아니다. [HO][HE]

새 target /tmp/day5-idempotency-harness-preflight.5pP8QU에는 Git 저장소만 만든 뒤, Codex workspace-write runtime에서 .codex/agents와 .agents/skills 생성 가능 여부를 확인했다. 첫 mkdir .codex/agents와 cleanup rmdir는 Read-only file system으로 실패했다. stop-on-first-failure 지침에 따라 .agents/skills는 시도하지 않았다. target inventory에는 .git만 남았다. [ARO][HO]

후속 진단에서 이 오류는 POSIX 소유권 문제가 아니라 Codex 보호 경로 정책임을 확인했다. Codex CLI 0.144.6의 workspace-write는 writable root 아래 .codex와 .agents를 read-only로 보호한다. 현재 user config의 writable_roots에 target은 없지만, 이를 추가해도 보호 경로 규칙은 해제되지 않는다. [HO]

사용자가 승인한 일회성 elevated preflight에서는 같은 disposable target에서 Codex CLI를 --sandbox danger-full-access로 실행했다. 최초 시도는 외부 sandbox의 network 차단으로 모델 응답 전 실패해 파일 상태를 바꾸지 않았다. 이후 외부 실행 승인을 받아 재시도했고, Codex가 실행한 `mkdir -p .codex/agents && test -d .codex/agents && rmdir .codex/agents && rmdir .codex`가 exit code 0으로 끝났다. 생성·존재 확인·정리는 성공했고, target에는 다시 .git만 남았다. 이 probe는 빈 경로만 다뤘고 Harness는 호출하지 않았다. [ARO][HO]

따라서 H1 재실행, H1 Phase 3 재진입, H2 runtime 재진입은 여전히 수행하지 않았다. 이번 승인 범위는 disposable target의 빈 경로 preflight까지였고 실제 Harness 실행은 포함하지 않았다. 기존 H1/H2와 사용자 경로도 건드리지 않았다. 과거 H1 첫 실행은 기본 home의 state_5.sqlite read-only 오류로 시작하지 못했고, Day 4 isolated CODEX_HOME으로는 Phase 0–2에 도달했다. 이 기록은 historical execution evidence이며 이번 실행 결과가 아니다. [HE]

### GitHub Agentic Loop

| 읽기 순서 | 명령 / 관측 | 현재 결과 |
| --- | --- | --- |
| 1 | gh pr list --repo codechaser-kr/codex-harness --state open --json number,title,headRefName,baseRefName,url | 빈 목록 |
| 2 | gh issue list --repo codechaser-kr/codex-harness --state open --json number,title,labels,updatedAt,url | Issue #37 한 건, label 정책검토, updatedAt 2026-07-04T14:27:15Z |
| 3 | gh issue view 37 --repo codechaser-kr/codex-harness --json number,title,state,labels,body,comments,updatedAt,url | OPEN, 검토 결과 공란, 후속 checklist 5개 미체크, comments 없음 |

이 snapshot을 같은 순서로 두 차례 더 읽었다. 두 반복의 열린 PR 목록, Issue 목록과 Issue #37 상세 결과는 서로 같았다. GitHub 상태 변경은 0건이다. [ARO]

그 뒤 local state를 확인했다. .github-agentic-loop/logs에는 2026-08-02, 04, 05, 06, 09 날짜 파일이 있고 #37에 해당하는 이슈 기록은 없었다. 최신 2026-08-09 log는 당시 PR #134를 OPEN으로 기록하지만 현재 열린 PR 조회는 비어 있다. 현재 GitHub를 log보다 우선했다. [RF][ARO]

Issue #37은 하나의 열린 정책검토 이슈이지만, 현재 사용자가 그 이슈의 Workflow를 시작하거나 재개하라고 요청한 것은 아니다. 따라서 이슈 읽기를 진행 승인으로 해석하지 않고 live evaluator action을 계산하거나 실행하지 않았다. 실제 상태에 ambiguous candidate가 있는지, user decision 뒤 새 session에서 resume되는지는 미관측이다. [ARO][AJ]

## 현재 구조와 재실행 모델

### Harness: 의미 기반 orchestration과 사용자 결정

타겟의 역할 정본은 .harness/docs/team-spec.md다. .codex/agents와 .agents/skills는 파생 실행 자산이고 session-log.md는 누적 실행 기록, latest-session-summary.md는 다음 진입점 checkpoint다. 재진입 규칙은 모든 산출물을 무조건 재생성하는 방식이 아니라 실제 input·team spec·derived asset을 재감사해 가장 이른 불일치 Phase를 후보로 제시한다. Phase 6은 구조·계약 검사와 선택지 영향을 남기는 checkpoint이고, 사용자가 선택하기 전에는 Phase 7 변경을 진행하지 않는다. [RF]

이는 수학적 의미의 동일 파일 snapshot replay가 아니다. 동일한 생성 요청을 다시 받으면 source와 existing assets를 다시 읽고 role 의미를 재판단할 수 있으며 session log에는 새 실행이 누적되고 latest summary는 갱신될 수 있다. 기존 target을 실제로 다시 실행해 보존·갱신·충돌 동작을 비교하지 못했으므로 그 구체적인 idempotency는 이번 보고서에서 검증되지 않았다. [RF][AJ]

### GitHub Agentic Loop: 사실 재관측과 결정론적 next action

GitHub Issue/PR와 review thread는 협업 상태의 정본이다. 날짜별 .github-agentic-loop/log는 실행 이력의 보조 근거이고 normalized facts 및 evaluator output은 새로 계산되는 파생 상태다. current source는 매 진입 또는 재개 때 필요한 GitHub/local/user/skill evidence를 수집하고, 상태 adapter로 한 번 정규화한 뒤 evaluateWorkflowDefinition을 한 번 호출하도록 한다. 재개는 기존 task_action_id를 currentTaskActionId로 넘기되 같은 현재 GitHub·코드 상태를 다시 관측한다. 누락된 fact, source mismatch, 0개 또는 여러 transition match는 stopped/fail-closed다. [RF][SF]

구조화 실행 계약은 immutable request_id, target_baseline, scope, precondition/postcondition을 요구하며, 동시 중복 요청은 동일 request_id 활성 슬롯을 원자적으로 선점해야 한다고 선언한다. 실행 중에는 다른 executor 경로로 전환하지 않고, 완료 뒤 GitHub와 local state를 다시 읽어 reconciliation한다. 다만 이 활성 슬롯을 구현하는 repository-owned 코드나 저장 상태는 현재 scripts tree와 tests에서 찾지 못했다. 이 요구는 현재 contract fact이고 실제 atomic duplicate prevention은 runtime으로 관측되지 않았다. [RF][AJ]

두 runtime의 공통점은 반복 실행 전에 근거와 부수 효과를 확인한다는 점이다. Harness의 semantic role reconciliation과 user decision을 GitHub의 deterministic fact evaluation으로 축소할 근거는 없다. 공통 runtime schema나 state store가 현재 필요하다고 전제하지 않는다. [RF][AJ]

## 시나리오별 분석

| 시나리오 | 최초 상태 | 반복·재개 시 동작 | 보존 상태와 재계산 상태 | 중복·충돌 방지 | 복구 경계와 필요한 사용자 행동 | 최종 일관성 | 증거 유형과 한계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H1 최초 생성 후 같은 요청 재실행 | Day 4 H1은 project input 3개뿐인 새 target이었다. 실제 첫 실행 뒤 .harness 문서 7개와 log 2개가 남고 Phase 3에서 실패했다. | Day 4 summary는 Phase 3 재진입을 가리킨다. 별도 disposable target의 workspace-write preflight는 보호 경로 정책으로 막혔고, 승인된 elevated path-only preflight는 통과했다. H1은 재실행하지 않았다. | 기존 H1 문서와 checkpoint는 유지됐다. 다시 계산될 team spec 대비, role asset의 생성·갱신 여부는 미관측이다. | contract상 team-spec을 기준으로 파생 asset을 대조한다. 실제 중복 agent/skill 억제 방식은 runtime 재실행이 없어 미관측이다. | H1 재진입은 별도 권한 승인을 받아 보호 경로에 쓸 수 있는 runtime으로 실행해야 한다. 이번 빈 경로 probe는 전체 Harness 동작을 승인하거나 검증하지 않는다. | 현재 H1 target은 Phase 0–2 산출물과 실패 checkpoint 상태로 일관된다. 전체 Harness build는 미완료다. | [HO][HE][RF][ARO]. 최초 실행은 실제지만 같은 요청 재실행·Phase 3 이후는 미관측이다. |
| H2 P1–2 재진입 | 별도 target의 P1/P2 5개 문서가 synthetic seed로 존재하고 agent/skill/log는 없다. | runtime 재진입은 하지 않았다. H1 결과를 H2에 복사하거나 합치지 않았다. | seed 문서는 읽기 전용 상태로 보존됐다. runtime이 선택할 재진입 Phase와 문서 갱신은 미관측이다. | 출처 주석이 synthetic seed와 prior runtime output을 구분한다. 실제 duplicate/overwrite 처리는 미관측이다. | .codex 경로 preflight는 elevated mode에서 통과했지만 .agents/skills는 아직 쓰기 probe를 하지 않았다. H2 실행에는 별도 승인이 필요하다. | synthetic P1–2 입력 상태를 유지한다. 런타임 일관성 판정은 미관측이다. | [HO][HE][ARO]. H2는 실제 prior runtime output이 아니다. |
| GitHub next-action 재관측 | live 상태는 열린 PR 0건, 열린 정책검토 Issue #37 한 건이다. issue body에는 아직 결정·후속 완료 항목이 없다. | read-only GitHub snapshot을 세 번 같은 순서로 조회했고 내용은 같았다. current request start/resume 입력이 없어 evaluator는 실행하지 않았다. | GitHub 상태를 유지했다. local dated log는 보존된 역사며 현재 PR/Issue 판단을 덮지 않는다. | source는 PR 우선 조회, exact fact provenance, duplicate candidate/multiple transition fail-closed를 정의한다. request_id 활성 슬롯은 contract에만 있고 runtime 구현·동시 실행은 미관측이다. | PR 또는 Issue 기반 workflow 실행은 명시적 사용자 요청, target, current facts와 decision input이 있어야 한다. | 세 번의 조회가 같았으며 GitHub는 변경되지 않았다. 같은 live next-action 결과가 재계산됐다고 주장하지 않는다. | [ARO][RF][SF]. snapshot 반복은 실제 관측, evaluator 결정론은 fixture, live evaluator 실행은 없음. |
| 일부 설정 / 외부 의존성 누락 | 현재 .github-agentic-loop/settings.json은 값이 채워져 있으나 capability observation은 2026-07-11 기록이다. dependency missing 상태는 만들지 않았다. | contract상 필요한 key만 lazy initialization하고 기존 유효값을 보존한다. malformed/unknown value면 수정하지 않고 중단하며 사용자가 고친 뒤 다시 읽는다. dependency가 없으면 다른 review mode로 fallback하지 않고 설치 후 같은 action을 재평가한다. | 설정·사용자 preference는 configuration으로 보존한다. Workflow fact/evaluator output은 재계산한다. 같은 관측과 결정으로 재실행하면 추가 변경이 없어야 한다. | 지원 값과 evidence 없는 config를 추론·덮어쓰기하지 않는다. 단, 부분 설정 및 missing dependency의 실제 target write는 이번에 재현하지 않았다. | 사용자 또는 설치 관리자가 config/dependency를 정렬한 뒤 원래 task와 capability를 다시 확인해야 한다. | 문서 계약상 일관성 규칙은 있으나 actual runtime persistence는 미관측이다. | [RF][SF]. 기존 tests는 reference 계약과 fact validation을 검증하지만 settings bootstrap 동작을 직접 실행하지 않는다. |
| install 반복 / uninstall / .removed 복구 | 새 fixture /tmp/day5-install-recovery.vyqOuG는 빈 skills와 backups 경로로 시작했다. | install.sh harness 1회 뒤 같은 명령을 반복했다. 두 번째 실행은 기존 active tree를 harness.backup.*로 이동하고 source tree를 다시 설치했다. uninstall.sh harness는 active tree를 harness.removed.*로 이동했다. 출력된 removed tree를 원래 active path로 수동 mv 복구했다. | active 설치와 backup은 uninstall 뒤에도 보존됐다. 수동 복구 후 active와 backup 두 tree 모두 source와 diff -qr 차이가 없었다. staging temp는 trap cleanup으로 남지 않았다. | 이름에 timestamp·PID와 collision suffix를 사용해 backup path collision을 피한다. 같은 source의 active tree는 수렴하지만 매 재설치마다 backup이 늘어난다. | 자동 restore subcommand는 없다. 운영자는 출력된 backup path와 원래 destination을 확인하고 destination이 없을 때 직접 복구해야 한다. | synthetic fixture에서 manual restore 뒤 active tree 정상, backup 보존. 실제 user install은 건드리지 않았다. | [SF][RF]. 자동 복구·실제 설치본 제거는 수행하지 않았다. |
| install 중 부분 실패 | 별도 /tmp/day5-install-partial.7ALZzQ에서 destination root에는 workflow-code-editor sentinel이 있고 backup root가 파일에 막혀 있었다. | install.sh workflow-engine에서 첫 github-agentic-loop 설치는 성공했으며, 두 번째 기존 workflow-code-editor를 backup할 때 mkdir 실패로 종료했다. | 첫 패키지의 새 tree는 남고 두 번째 sentinel은 그대로 남았다. 실패 후 임시 staging tree는 제거됐다. 전체 설치 transaction rollback은 없었다. | source tree를 package별 staging하지만 여러 package 변경을 감싸는 전역 transaction/rollback은 없다. backup 경로 실패 전 기존 sentinel은 이동되지 않았다. | backup root 오류를 운영자가 해결한 뒤 install all을 재실행하면 package별 reconciliation이 다시 진행될 수 있다. 재실행 전 active/source 상태를 inventory해야 한다. | fixture는 의도된 partial state이며 오류 위치·남은 상태는 명확했다. 자동 원상복구는 하지 않았다. | [SF][RF]. 실패를 재현한 것은 synthetic blocker이며 실제 사용자 설치 사고가 아니다. |

## 안전한 반복과 위험한 반복

| 동작 | 판단 | 근거와 한계 |
| --- | --- | --- |
| 같은 normalized facts로 pure evaluator 호출 | 반복 가능 | evaluator는 input을 변경하지 않고 단일 action/completed/stopped를 반환한다. 0개·복수 transition match, invalid state와 duplicate facts는 fail-closed한다. [RF][SF] |
| Workflow 재개 시 같은 task_action_id로 새 GitHub snapshot을 평가 | contract상 안전 | 새 authoritative state와 current code를 읽고 이전 local log보다 우선한다. 실제 live decision 후 fresh-session resume은 미관측이다. [RF] |
| 같은 요청/상태로 설정의 이미 유효한 값을 다시 확인 | contract상 추가 변경 없음 | lazy bootstrap은 필요한 필드만 다루며 기존 값을 보존한다. actual partial settings replay는 미관측이다. [RF] |
| 같은 source로 installer 재실행 | active tree는 수렴, backup은 증가 | synthetic run에서 active tree가 source와 동일했고, 직전 active copy는 backup에 보존됐다. 반복 자체는 log/backup side effect가 없는 의미의 idempotency가 아니다. [SF] |
| workspace-write 아래 .codex/agents 생성 | 차단됨 | Codex가 writable root 안의 .codex와 .agents를 보호 경로로 취급한다. writable_roots 추가는 이 규칙을 해제하지 않는다. [HO] |
| 승인된 danger-full-access에서 빈 .codex/agents 생성·정리 | 해당 일회성 probe에서는 성공 | 동일 disposable target에서 생성·존재 확인·삭제 후 .git만 남았다. 실제 Harness 산출물의 쓰기나 .agents/skills 쓰기는 검증하지 않았다. [ARO][HO] |
| open PR·Issue 또는 existing review thread를 현재 상태에서 다시 관측 | 안전한 replay 원칙 | current GH facts를 먼저 읽고 기존 PR/review feedback을 이어간다. Issue #37은 읽기만 했으며 어떤 workflow action도 승인하지 않았다. [RF][ARO] |
| stale log만 보고 GitHub mutation replay | 위험 | current GitHub가 종료/변경된 상태일 수 있다. 2026-08-09 PR #134 log와 현재 open PR 조회도 시간에 따라 다르다. [RF][ARO] |
| 이미 side effect가 시작된 파일 변경을 Harness/general 경로로 바꿔 재실행 | 금지 경계 | 선택 경로가 시작된 뒤 fallback 금지. 부분 변경 가능성이 있으면 실제 changed files와 baseline을 확인하고 중단·복구 조건을 기록한다. [RF] |
| 같은 request_id의 동시 실행이 안전하다고 가정 | 미검증 위험 | contract는 atomic active-slot claim을 요구하지만 구현/저장 owner와 runtime concurrency evidence가 없다. [RF][AJ] |
| Phase 6 선택을 checkpoint나 자연어 긍정 응답으로 대신 확정 | 금지 | Harness 품질·변경 범위와 Workflow 선택지는 사용자의 명시적 결정이어야 한다. [RF][SF] |

## Install / remove / backup / recovery source 관측

- install.sh는 로컬 .codex-dist source가 있으면 이를 사용하고, 없으면 지정 repository/ref를 받아오는 구조다. 각 스킬은 TMPDIR 아래 staging한 뒤 active destination에 배치한다.
- 기존 current destination은 .backup.<timestamp>.<pid> 형태로 외부 backup root에 이동한다. workflow-engine 설치 시 legacy github-workflow-engine도 github-agentic-loop 이름으로 바로 교체하지 않고 legacy backup으로 이동한다.
- uninstall.sh는 관리 대상만 active root에서 외부 backup root의 <skill>.removed.<timestamp>.<pid>로 이동한다. 삭제 대신 recoverable directory를 남기며, 프로젝트 내부 .agents/skills와 .harness는 대상이 아니다.
- 두 script의 next_backup_path는 동일 초·PID 경로가 이미 있으면 suffix를 증가시킨다. install tree가 package 단위로 staging된다는 사실은 전체 skill 목록의 atomic transaction을 뜻하지 않는다.
- README.md는 uninstall이 출력한 path를 원래 destination으로 수동 복원하라고 안내한다. 전용 restore command, checksum-based selection, automatic conflict resolution은 source에 없다. fixture에서는 대상 destination이 비었음을 확인한 뒤 harness.removed tree를 수동 mv했고 source parity를 검증했다.
- 기존 all-fixtures suite의 install 관련 fixture는 임시 HOME/destination/backup root에서 default root·legacy 미변경, 두 install target 독립성, repeated install backup, legacy rename backup, uninstall .removed 보존을 검증한다. suite 종료 뒤 해당 fixture temp 디렉터리가 남지 않은 것을 확인했다. restore 동작은 별도 synthetic fixture에서 수동으로 재현했다.

실제 fixture 명령은 다음 경로만 대상으로 했다.

- env CODEX_HARNESS_DEST_ROOT=/tmp/day5-install-recovery.vyqOuG/skills CODEX_HARNESS_BACKUP_ROOT=/tmp/day5-install-recovery.vyqOuG/backups TMPDIR=/tmp/day5-install-recovery.vyqOuG sh install.sh harness
- 같은 명령을 한 차례 더 실행해 backup 생성 확인
- env CODEX_HARNESS_DEST_ROOT=/tmp/day5-install-recovery.vyqOuG/skills CODEX_HARNESS_BACKUP_ROOT=/tmp/day5-install-recovery.vyqOuG/backups sh uninstall.sh harness
- destination이 비었음을 확인한 뒤 backups/harness.removed.20261018050246.2를 skills/harness로 수동 이동

부분 실패 fixture는 backup root 부모가 일반 파일인 synthetic 상태에서 실행했다. 결과는 첫 package 설치 후 중단, 기존 두 번째 sentinel 보존, staging cleanup이었다. 사용자 설치 위치나 저장소 source는 사용하지 않았다.

## 실행 기록

| 시나리오 | target / 최초 상태 | 사용한 명령 및 실행 경로 | 읽고 쓴 상태 / 결과 | 재실행·정리 및 한계 |
| --- | --- | --- | --- | --- |
| H1 이전 실행 inventory | /tmp/day4-state-harness-first.nPU1fp. 최초 source README/package/src 3개 | historical: CODEX_HOME=/tmp/day4-codex-home.8w60PS codex exec --json --ephemeral --sandbox workspace-write -C /tmp/day4-state-harness-first.nPU1fp - | 실제 Harness Phase 0–2가 .harness docs/logs 9개를 남기고 Phase 3 Read-only file system에서 실패 | 이번에는 그 target을 재실행하지 않았다. 기존 logs와 inventory만 read-only로 확인했다. [HE][HO] |
| H1/H2 writable preflight | /tmp/day5-idempotency-harness-preflight.5pP8QU. .git 외 빈 target | env CODEX_HOME=/tmp/day4-codex-home.8w60PS codex exec --json --ephemeral --sandbox workspace-write -C /tmp/day5-idempotency-harness-preflight.5pP8QU "<preflight only>" | .codex/agents mkdir 실패, rmdir cleanup도 실패. .agents/skills는 stop-on-first-failure로 미시도. Harness 호출·repo source read 없음 | target에 .git만 남음. 외부 임시 error files 2개를 내용 확인 후 제거. 권한/mount/path 변경 없음. [ARO] |
| Codex protected-path permission probe | 같은 /tmp/day5-idempotency-harness-preflight.5pP8QU. 직전 상태는 .git만 존재 | 사용자 승인 후 env CODEX_HOME=/tmp/day4-codex-home.8w60PS codex exec --json --ephemeral --sandbox danger-full-access -C /tmp/day5-idempotency-harness-preflight.5pP8QU "<create-verify-remove only>" 실행. 첫 시도는 outer network sandbox에서 endpoint 연결 실패; 승인된 escalated 재시도가 성공 | Codex가 실행한 mkdir -p .codex/agents && test -d .codex/agents && rmdir .codex/agents && rmdir .codex가 exit 0. 경로 생성·확인·제거 후 .git만 남음. Harness 호출과 source read/write는 하지 않음 | 승인 범위는 disposable target 안의 빈 디렉터리 preflight였음. full Harness 재진입과 .agents/skills는 미실행. persistent config 변경 없음. [ARO][HO] |
| GitHub read-only | codechaser-kr/codex-harness | gh pr list → 빈 목록일 때 gh issue list → gh issue view 37. 같은 순서를 반복 조회 | PR 0, Issue 37 open, body/checklist/comments 재확인. GitHub 변경 0 | local log는 이후 확인. 이전 dated PR 기록은 current fact로 채택하지 않음. [ARO] |
| source fixtures | current checkout | node .codex-dist/skills/github-agentic-loop/tests/workflow-definition/all-fixtures.test.mjs | 122 passed, 0 failed, 0 skipped. 순수 evaluator, resume ID, fail-closed, installer fixture 포함 | fixture는 synthetic; runtime GitHub/Harness success 증거가 아님. temp test directories 정리 확인. [SF] |
| Harness boundary fixture | current checkout | node .codex-dist/skills/harness/tests/user-decision-boundary.test.mjs | 3 passed, 0 failed, 0 skipped | Phase 6 contract 확인이며 실제 Phase 6 실행은 아님. [SF] |
| installer remove/restore | /tmp/day5-install-recovery.vyqOuG | install.sh harness 2회, uninstall.sh harness, 출력된 .removed tree 수동 mv | 기존 install backup과 removed tree를 보존; restore 후 source parity | temp stage 없음. fixture tree는 검토 가능하도록 /tmp에 유지. [SF] |
| installer partial failure | /tmp/day5-install-partial.7ALZzQ | install.sh workflow-engine, backup root가 파일 아래 경로를 가리키도록 한 synthetic blocker | 첫 github-agentic-loop install 뒤 workflow-code-editor backup 단계에서 Not a directory로 종료 | staging temp 정리, 앞선 package 유지, 기존 sentinel 보존. source/install script 수정 없음. [SF] |

## Persistence·재진입 검증 범위

### 실제로 확인한 것

- H1의 Phase 0–2 문서와 두 로그가 Codex process 종료 뒤 target에 지속됐다.
- H1 latest summary는 실제 Phase 3 failure를 재진입 지점으로 남겼고, 두 로그는 ID 0 cleanup not_applicable을 일치하게 기록했다.
- workspace-write에서 .codex/agents 쓰기가 막히는 원인은 Codex protected-path policy다. 승인된 일회성 danger-full-access probe에서는 빈 .codex/agents 생성·확인·정리가 성공했고 마지막 inventory는 .git만 포함했다.
- current official skill installation은 source와 18/18 동일했다.
- GitHub 상태는 세 번 동일하게 관측됐고, local Aug 9 PR observation은 GitHub 현재 상태를 덮지 않았다.
- install 반복은 active source tree를 유지하면서 이전 active tree를 backup했다. uninstall은 active tree를 recoverable .removed 경로로 이동했고 fixture에서 수동 restore가 성공했다.
- installer 부분 실패는 선행 package를 보존하고 실패 package의 기존 sentinel을 유지했다. 자동 global rollback은 없었다.

### 검증하지 못한 것

- H1 같은 요청의 두 번째 실제 실행, H1 Phase 3부터의 재진입·파생 agent/skill 생성, H2 synthetic seed를 runtime이 읽거나 갱신하는 결과
- Harness Phase 6에서 사용자 선택을 기다리고 Phase 7을 차단하는 end-to-end runtime
- GitHub live ambiguous/missing evidence의 evaluator stop, 사용자 decision 뒤 fresh-session resume, branch/Issue/PR/comment 생성 직전 duplicate collision 결과
- 동일 request_id 활성 슬롯의 원자적 획득, 두 동시 실행 중 한 건만 통과하는 동작, 슬롯 release/복구
- partial settings와 missing dependency skill의 실제 bootstrap/recheck/write
- close_agent ID가 발급된 환경의 close 성공·실패 분기
- Day 4의 Codex isolated thread/rollout이 새 세션에서 재개되는지. target markdown checkpoint persistence만 확인했다.

workspace-write 보호 경로는 확인했고 elevated path-only probe도 통과했다. 그러나 승인 범위가 실제 Harness 실행을 포함하지 않았으므로 H1/H2 재진입, 산출물 생성과 .agents/skills 쓰기는 여전히 미관측이다. synthetic tests나 빈 디렉터리 probe는 그 runtime 결과를 대신하지 않는다.

## Gap analysis

### Policy review 필요 — active request_id 슬롯의 소유자와 증명 근거

현재 structured-execution-contract.md는 동일 request_id에 대해 기존 활성 시도 확인과 원자적 슬롯 선점을 성공 조건으로 선언한다. 그러나 scripts tree에는 이를 수행하는 executable helper가 없고 tests에 duplicate_active_request_id assertion도 없다. 실제 live 중복 실행이나 부수 효과 중복은 관측되지 않았다. [RF][AJ]

그 결과 contract는 cross-session atomicity를 약속하지만 저장·선점 owner와 failure recovery가 보고 있는 source에서 드러나지 않는다. 사용자 안전 영향은 동시에 시작한 동일 mutation이 둘 다 preflight를 통과할 가능성이다. 즉시 새 shared state store를 만들 근거는 없다. 우선 이 atomicity가 host execution boundary가 제공하는지, 또는 현재 계약에서 검증 가능한 의미로 한정할지 정책 경계를 확정할 필요가 있다. 실제 동시 중복 실행 사례가 생길 때까지 구현 후보는 보류한다.

### 기능 제안 후보 — installer batch partial completion 표시

synthetic partial failure에서 앞선 github-agentic-loop는 새 버전으로 남고 다음 기존 skill은 그대로 남았다. 이전 tree는 backup root 오류 때문에 이동되지 않았고 staging cleanup은 성공했다. 재실행은 가능한 복구 경로지만 전체 설치는 atomic하지 않다. [SF][AJ]

현재 명령 출력은 성공한 package와 오류 지점을 보여 주며 재실행 전에 source/active/backup inventory를 할 수 있다. 따라서 현재는 자동 rollback을 즉시 추가하지 않는다. 실제 operator가 mixed version이나 재실행 경계를 오인하면 설치 단위별 완료/미완료 요약과 resume 안내를 기능 제안으로 구체화할 수 있다.

### 즉시 수정

없음. 현재 조사에서 confirmed source defect, 사용자 파일 손실, GitHub 중복 변경 또는 문서와 source의 명백한 동작 불일치는 찾지 못했다. workspace-write의 metadata protection은 의도된 sandbox 동작이며 chmod나 writable_roots 우회로 해결할 결함이 아니다.

### 보류

- H1/H2 runtime 재진입과 Phase 6 end-to-end: 실제 Harness를 포함하는 별도 사용자 승인과 보호 경로에 쓸 수 있는 disposable runtime이 선행 조건이다. 이번 승인은 빈 경로 probe까지만 포함했다.
- actual GitHub fail-closed와 user-decision resume: 새 workflow start/resume 요청과 missing/ambiguous live evidence가 필요하다. 현재 Issue #37을 사용자 승인 없이 진행하지 않는다.
- partial settings, missing dependency, duplicate Issue/branch/PR/thread: source fixture가 다루지 않는 actual runtime observation이 생길 때까지 synthetic 결과만 유지한다.
- settings capability checkedAt freshness: 오래된 timestamp만으로 재검사 policy를 만들 근거가 부족하다.
- 공통 runtime schema/state store, lock service 또는 central daemon: 실제 state loss/race evidence가 없어 제안하지 않는다. active request slot의 owner clarification과 분리해 판단한다.

## Phase 3로 넘길 질문과 선행 조건

1. H1과 H2 각각의 재진입 기준은 무엇이며, latest-session-summary checkpoint와 실제 문서 inventory가 충돌하면 어떤 증거로 가장 이른 Phase를 고르는가?
2. 같은 request_id 활성 슬롯은 어떤 runtime boundary가 atomic하게 소유하며, persisted 상태와 concurrent failure 후 release condition은 무엇인가? 답이 source 밖의 Codex host capability라면 어떻게 확인·로그하는가?
3. GitHub snapshot이 중복 Issue/branch/PR 또는 unresolved review thread를 여러 개 반환하면 어떤 exact identifier로 resume하고, 어느 ambiguity에서 멈추는가?
4. 설정의 유효값 보존, missing key lazy initialization, invalid value fail-closed는 실제 타겟 파일을 바꾸기 전/후 어떤 inventory로 증명할 수 있는가?
5. Day 4 CODEX_HOME 로그인·DB는 healthy였고 endpoint reachability는 sandbox 제한을 받았다. workspace-write의 .codex/.agents 보호 경로는 writable_roots로 풀리지 않는다. Phase 3 actual reentry는 사용자 승인된 elevated runtime이 선행되어야 하며, .agents/skills 쓰기와 Harness 산출물 생성은 별도로 확인한다.
6. 실제 user decision이 내려진 다음 Workflow를 재개할 때 새 GitHub observation, user_input evidence, 같은 task_action_id와 새 execution session ID를 어떻게 상관시키는가?

## Day 5 완료 조건 체크리스트

- [x] 같은 요청/재진입의 의미를 Harness와 GitHub Agentic Loop 각각의 상태 소유 모델에 연결했다.
- [x] 현재 branch, HEAD, clean 시작 상태, source·설정·installed snapshot을 확인했다.
- [x] Day 4 H1의 inventory, 실제 session log/latest summary와 close_agent cleanup 값을 다시 읽었다.
- [x] H2 synthetic P1–2 provenance를 재확인하고 H1 evidence와 분리했다.
- [x] target-local workspace-write preflight를 실행해 protected-path 차단을 확인하고, 근거와 함께 그 runtime 시도를 중단했다.
- [x] 사용자 승인된 일회성 elevated probe에서 .codex/agents 생성·확인·정리가 성공하고 target이 원상태(.git만 존재)로 돌아온 것을 확인했다.
- [x] 열린 PR 우선, 이어서 Issue를 읽는 GitHub read-only 순서를 수행하고 snapshot 반복을 비교했다.
- [x] current GitHub facts와 dated local log가 다를 때 GitHub 우선 규칙을 적용했다.
- [x] current Workflow Engine fixture 122/122와 Harness boundary fixture 3/3 결과를 synthetic evidence로 분리했다.
- [x] installer repeated install, uninstall .removed backup, 수동 restore와 부분 install failure를 disposable fixture에서 관측했다.
- [x] 실제 관측, repository fact, historical execution evidence, synthetic fixture/test와 analysis judgment를 분리했다.
- [ ] H1 동일 요청 재실행 및 Phase 3 재진입 — path-only probe는 통과했지만 실제 Harness 실행은 승인 범위에 없어 미실행.
- [ ] H2 seed 재진입과 Phase 6 user-decision checkpoint — 실제 Harness 실행 미승인으로 미실행.
- [ ] GitHub live ambiguous/missing state, evaluator resume, duplicate active request_id concurrency — 현재 요청 경계에서 미관측.
- [ ] partial settings와 missing external dependency runtime — 실제 상태가 없어서 미실행.

## Day 종료 기록

### 오늘 새롭게 이해한 것

- Harness의 checkpoint는 다음 Phase를 제안하지만, 실제 재진입은 Team Spec과 파생 asset inventory를 다시 대조해야 한다. H1의 Phase 2 persistence는 확인됐어도 Phase 3 이후 생성이나 Phase 6까지의 성공을 보증하지 않는다.
- Workflow Engine은 local log를 이어 읽는 것만으로 재개하지 않는다. 최신 GitHub/local/user evidence를 다시 정규화하고 같은 task_action_id를 evaluator에 줘 다음 작업을 재계산한다.
- Workflow source의 duplicate request_id atomic slot은 중요한 contract이지만 현재 저장소 source/test로 구현·검증 위치를 확인할 수 없다. 새 공통 state store가 필요하다는 결론과는 별도다.
- Codex workspace-write는 .codex와 .agents를 의도적으로 보호한다. writable_roots로 이 보호가 풀리지 않으며, 승인된 일회성 danger-full-access probe에서는 빈 .codex/agents를 만들고 검증한 뒤 원상 정리했다.
- install 반복은 active tree를 source와 맞추면서 backup을 누적한다. uninstall은 삭제가 아니라 .removed 보존이고 restore는 사용자가 출력 path를 확인해 수동으로 수행한다.
- batch install failure는 이미 완료된 package를 자동 취소하지 않는다. 선행 package 상태는 보존되고 나머지는 source·backup·destination inventory를 바탕으로 재실행해야 한다.

### 기존 생각이 바뀐 부분

- Day 4는 현재 별도 lock이 없다고 기록했지만 current structured execution contract에는 atomic request_id active-slot 조건이 존재한다. 이전 관측은 그 당시 source 내용으로 유지하고, 현재 보고서는 계약 요구와 실제 구현 위치가 보이지 않는 차이를 새로 기록했다.
- Day 4의 target read-only 제한은 단순 파일 소유권 문제가 아니라 workspace-write의 metadata 보호 정책으로 설명된다. 권한 승인 후 별도 empty-dir probe는 통과했지만, 이 결과가 실제 Harness 재진입을 증명하지 않는다.
- GitHub API 읽기가 성공해도 workflow를 시작할 권한을 의미하지 않는다. Issue #37을 확인했지만 사용자 요청 없이 action을 계산·실행하지 않았다.

### 저장소에서 확인한 근거

- Current branch/HEAD/worktree: docs/repository-evolution-workshop / be3ce3ba12ebea66b63b8b2e98cf28f57230cf12 / clean at start.
- Harness: .codex-dist/skills/harness/SKILL.md, references/initial-generation-contract.md, reentry-rules.md, logging-contract.md, tests/user-decision-boundary.test.mjs.
- GitHub Agentic Loop: .codex-dist/skills/github-agentic-loop/SKILL.md, definitions/policy-review.json, scripts/workflow-definition/normalized-fact-adapter.mjs, evaluator.mjs, cli.mjs, references/state-observation-contract.md, structured-execution-contract.md, user-decision-contract.md, target-runtime-bootstrap-contract.md.
- Installation: install.sh, uninstall.sh, README.md, .codex-dist/skills/github-agentic-loop/tests/workflow-definition/all-fixtures.test.mjs.
- Actual H1 files: /tmp/day4-state-harness-first.nPU1fp/.harness/docs/* and /tmp/day4-state-harness-first.nPU1fp/.harness/logs/session-log.md, latest-session-summary.md.
- Actual new preflight target: /tmp/day5-idempotency-harness-preflight.5pP8QU; workspace-write probe failed by policy; approved danger-full-access mkdir/test/rmdir probe succeeded; final inventory contains only .git.
- Codex CLI/config evidence: codex-cli 0.144.6; /home/codechaser/.codex/config.toml writable_roots are plugin data roots; official [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security) documents .codex/.agents as protected under workspace-write.
- Synthetic install recovery and partial failure: /tmp/day5-install-recovery.vyqOuG and /tmp/day5-install-partial.7ALZzQ.
- Read-only GitHub: open PR list empty, only open Issue #37; repeated snapshot unchanged; no GitHub mutation.

### 현재 구조의 강점

- Harness는 semantic role design과 사용자 결정 소유권을 보존한다. Team Spec을 정본으로 하고 파생 산출물을 분리한다.
- GitHub Agentic Loop는 source provenance, closed fact domain, pure evaluator와 단일 next action을 분리하며 missing/duplicate evidence에서 fail-closed한다.
- GitHub 실행 상태가 local log보다 우선해 오래된 이력이 현재 action을 덮지 않는다.
- 구조화 실행은 immutable scope/baseline, precondition/postcondition, request-result correlation과 실행 후 재관측을 요구한다.
- install/uninstall은 기존 설치·제거본을 영구 삭제하지 않고 격리 backup으로 보존한다. 테스트는 user-skill root, target 독립성, rename migration을 확인한다.
- Codex workspace-write protects metadata paths such as .codex and .agents even under writable roots, preserving those control surfaces by default; a narrowly scoped approval can be used for disposable-target runtime work when required.
- Phase 6과 Workflow user decision gate는 안전 중단을 완료로 가장하지 않고 사용자의 범위 선택을 기다린다.

### 개선 후보

- 동일 request_id atomic slot의 실제 owner·persistence·concurrency 보장을 확인한다.
- installer partial completion을 실제 운영자가 이해하기 쉽게 per-skill 상태와 재실행 안내를 제공할 필요가 있는지 사례를 더 모은다.
- actual H1/H2 reentry에는 별도 승인을 받고 isolated target에서 필요한 permission mode로 실행한다. workspace-write만으로는 .codex/.agents 생성물이 기록되지 않는다. .agents/skills preflight도 별도로 확인한다.
- live GitHub fail-closed와 decision 뒤 resume은 실제 상태와 명시적인 workflow start/resume 요청이 있을 때 별도 관측한다.

### 변경 유형 분류

- **즉시 수정:** 없음.
- **정책 검토 필요:** request_id atomic claim을 누가 어떤 runtime 경계에서 소유하는지 계약상 명확히 한다. 또한 Harness가 Codex 보호 경로에 산출물을 쓸 때 적용할 승인 범위를 workflow 운영 절차에 명시한다. 구현 추가는 그 다음 판단이다.
- **기능 제안 필요:** 아직 확정 제안 없음. installer per-skill partial completion summary는 실제 운영 혼란이 확인되면 기능 제안으로 구체화한다.
- **보류:** Harness 재진입, missing settings/dependency, live GitHub ambiguity/resume, 동시 request duplicate, close_agent ID 발급 이후 cleanup, 공통 runtime/state store.

### 남은 의문

1. duplicate_active_request_id를 실제 실행 전에 원자적으로 보장하는 capability와 state owner는 무엇인가?
2. current Harness target의 Phase 3 생성물과 다음 실행 inventory가 일치할 때 재실행은 어떤 파일을 보존하고 어떤 내용을 갱신하는가?
3. install all의 package 중간 실패를 운영자가 재실행할 때 old/new package 혼합 상태를 충분히 식별할 수 있는가?
4. GitHub issue/branch/PR/review-thread duplicate candidate가 복수일 때 실제 live adapter와 evaluator는 어떤 task_action_id 또는 stopped reason을 반환하는가?
5. 현재 settings의 capability checkedAt freshness가 실제 잘못된 executor selection이나 중단을 만든 사례가 있는가?

### 다음 Day의 선행 조건

- Phase 3은 실제 evaluator/transition, 상태 fact owner, exact ambiguity fail-closed와 workflow composition을 분석한다. 공통 runtime schema/state store를 미리 설계하지 않는다.
- H1/H2 runtime 재진입을 이어가려면 실제 Harness 실행을 포함하는 별도 승인이 필요하다. workspace-write는 .codex/.agents 쓰기를 막는다. 이전 승인으로 확인된 것은 빈 .codex/agents 생성·삭제뿐이며 .agents/skills와 Harness 산출물은 미검증이다.
- GitHub next-action evaluation은 명시적인 시작/재개 요청과 현재 read-only GitHub snapshot을 기준으로 수행하고 Issue/PR 상태 변경은 별도 authorization 없이 하지 않는다.
- 실제 동시 request_id 관측 전에는 atomicity 구현이나 lock service를 만들지 않는다.
- install partial recovery 후보는 실제 운영 영향과 기존 출력으로 복구 가능한지 추가 근거를 확보한다.
