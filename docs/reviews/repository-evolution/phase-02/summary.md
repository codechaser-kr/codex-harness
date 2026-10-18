# Phase 2 Runtime Engineering Summary

## 문서 성격

이 문서는 Repository Evolution Workshop Phase 2 Day 1~6 조사 결과를 현재 checkout의 source, 설정,
계약 문서와 대조한 종합 기록이다. 공식 설계나 정책을 대신하지 않는다. 아래의 개선 분류는 사용자
결정과 별도 Issue·PR 전까지 제안 또는 미결 질문이며, 이번 조사에서 source·설정·기존 보고서는 바꾸지
않았다.

근거의 시점과 유형은 다음처럼 구분한다.

| 표기 | 이 문서에서의 의미 |
| --- | --- |
| **[현재 source]** | Day 7 시작 시 checkout의 코드·설정·문서·파일 inventory에서 읽은 내용 |
| **[설계]** | 현재 SKILL, reference, Definition이 선언한 동작. runtime 성공을 뜻하지 않음 |
| **[runtime 관측]** | 이전 Day의 실제 Codex CLI 또는 read-only GitHub 관측. 해당 날짜와 격리 target에 한정 |
| **[과거 기록]** | 더 이른 로그나 평가 문서에 남은 실행 사실. 현재 상태로 승격하지 않음 |
| **[fixture/test]** | 테스트 코드와 synthetic 입력. 실행 결과는 실행했던 Day와 HEAD를 따로 표시 |
| **[판단/가설]** | 위 근거에 대한 분석. 아직 원인이나 실제 영향을 확인하지 못한 경우 가설로 표시 |

후속 설명에서 사용자가 확정한 범위 판단은 runtime/source 근거와 구분한다. 동시 `request_id` 중복 방지는
드문 상황으로 보고 보류하고, GitHub 상태 판정 규칙과 기존 handoff 계약을 사용하며, 추가 로그 수집·보존은
하지 않는다. 이 결정은 새 runtime 관측이나 계약 구현 확인을 뜻하지 않는다.

Day 7에서는 runtime 진입, GitHub 조회·변경, 테스트 실행, fetch를 하지 않았다. 따라서 이 문서는 새
runtime 관측 보고서가 아니다.

## 조사 기준선

조사 기준일은 2026-10-18 (Asia/Seoul)이다. Day 7 시작 시 Git 기준선은 다음과 같다.

| 항목 | 관측값 |
| --- | --- |
| Branch | `docs/repository-evolution-workshop` |
| HEAD | `1ab43fd3b6676943fb4749d40278021e8b84c1b2` (`docs: 실패 추적·보고 분석 결과 기록`) |
| Worktree | 시작 시 `git status --short` 비어 있음 |
| Local `main` | `e0a3f690ce0e58e31c8eac1d5a198625ab05541a` |
| Cached `origin/main` | `e0a3f690ce0e58e31c8eac1d5a198625ab05541a`; local `main`과 같고 HEAD의 조상 |
| `main...HEAD` | local `main`보다 16 commit 앞섬. 차이는 Phase 1·2와 workshop 문서 18개, 7,797 insertions이며 runtime source·설정 변경은 없음 |
| Branch upstream | cached `origin/docs/repository-evolution-workshop`는 `55676473207de53d76a488b4d5db6219b4d237bb`; 현재 local branch는 해당 참조보다 5 commit 앞섬 |

원격 최신 상태는 fetch 없이 확인할 수 없다. 위 `origin/*` 값은 로컬 remote-tracking 참조이며, 현재 원격
branch가 같은 값인지 주장하지 않는다. 현재 로컬 `main`의 commit 제목은 `#128`·`#129` 런타임 변경을
되돌린 PR #136 반영이다. 따라서 compile/snapshot/derived-index 계층은 이 checkout의 현재 구조로
취급하지 않는다.

Day 보고서의 기준선은 한 시점이 아니다. Day 2·3은 2026-09월의 HEAD `5567647`, Day 4는 10월 18일의
`f24bb40`, Day 5는 `be3ce3b`, Day 6은 `2a0c136`을 기록했다. 현재 HEAD는 Day 6 뒤의 문서 commit이다.
이전 날짜의 discovery, install, GitHub, test 결과는 그때의 근거로 보존하고 현재 관측처럼 표현하지
않는다.

## 두 실행 체계의 런타임 경계

현재 배포 이름은 `github-agentic-loop`이고 target 설정·로그 경로는 `.github-agentic-loop/*`다. 이
문서에서 “Workflow Engine”은 이 실행 체계의 역할을 가리킨다. `github-workflow-engine`,
`.workflow-engine/settings.json`, `.harness/logs/github-workflow-log.md`는 과거 식별자·경로 또는
이전 실행 기록을 가리킬 때만 쓴다.

| 구분 | Harness | GitHub Agentic Loop / Workflow Engine |
| --- | --- | --- |
| 주 책임 | 타겟 프로젝트의 의미, 역할 적합성, 실패 비용을 읽고 local role team과 운영 흐름을 구성·평가 | GitHub·local·user·skill evidence를 유한 fact로 구성해 Definition에서 현재 action 하나를 계산 |
| 실행 형태 | Codex 주 에이전트가 SKILL/reference와 타겟 파일을 따라 조율하는 semantic workflow. 별도 daemon 아님 | `definitions/*.json` + state adapter + validator/evaluator의 deterministic control path와 별도 executor |
| 역할 정본 / 상태 정본 | 타겟 `.harness/docs/team-spec.md`; agent TOML·role skill은 파생 자산 | Issue/PR/checklist/review thread는 협업 상태의 정본. `.github-agentic-loop/settings.json`은 설정, 날짜별 log는 보조 기록 |
| 판단과 중단 | 구조·계약은 검사할 수 있지만 의미 품질과 변경 범위는 사용자 소유. Phase 6에서 결정 대기, Phase 7은 확정 범위만 반영 | adapter/evaluator는 고정된 입력에서 action/completed/stopped를 계산. `user_decision_options`가 있으면 결정 전 중단 |
| 재개 | `latest-session-summary.md`는 checkpoint다. 현재 source와 target artifact를 다시 감사해 가장 이른 미완료 Phase를 선택 | 같은 `currentTaskActionId`로 새 authoritative snapshot을 normalize/evaluate. 과거 log만으로 전이를 확정하지 않음 |
| 실패 기록 | 사람이 읽는 타겟 Markdown journal·checkpoint와 다음 역할/Phase | `reason`, code/path/message, evidence, request/task/baseline, 결과·사후조건을 structured output과 dated log에 기록하도록 설계 |

공유점은 Codex host, 저장소 지시, baseline 확인, 근거 보존, 사용자 결정 경계, 안전 중단과 결과 보고다.
소유권과 검증 성격은 다르다. Harness의 semantic 판단을 Workflow fact schema로 축소하거나, GitHub 상태와
Harness `team-spec`을 공통 정본으로 합칠 근거는 없다. `.harness` 상위 디렉터리를 함께 쓰는 일도 파일
소유자와 정본이 다른 현재 상태만으로 충돌이 되지 않는다.

### 실행 간 handoff

Workflow Engine의 확정된 파일 변경은 `workflow-code-editor`가 실행 전에 `target_harness` 또는
`general_code_change` 중 한 경로를 고른다. `target-harness-execution-contract.md`에 따라 Workflow 전용
식별자·전이 정보가 제거된 `work_summary`, `target_files`, `target_baseline`, `change_constraints`,
`verification_criteria`만 Harness에 전달한다. 결과를 원 요청과 상관시키고 범위·baseline·사후조건을
검증하는 책임은 `workflow-code-editor`에 있다. 실행을 시작한 뒤 다른 경로로 fallback하지 않는다.

Day 2의 Issue #118→PR #119 기록은 당시 `general_code_change` 경로가 선택된 역사적 실행 근거다. 현재
계약도 같은 경계를 정의한다. 두 체계의 공존이 중복 side effect, 상태 손실, 실패 소유권 누락을
일으켰다는 사례는 Day 1~6에서 확인되지 않았다. 공존 자체를 결함으로 분류하지 않는다.

## 대표 실행 생명주기

### Harness

```text
사용자 요청
→ host가 Harness를 discovery/activate
→ 타겟 상태·기존 role asset·저장소 지시 감사
→ reference map에서 필요한 phase contract 선택
→ Phase 1 분석 / Phase 2 team-spec 정본 / Phase 3·4 파생 agent·skill
→ Phase 5 orchestration과 handoff 정렬
→ Phase 6 구조·계약 결과와 선택지 영향 기록, 사용자 결정 대기
→ 사용자 승인 범위가 있을 때만 Phase 7 변경
→ session journal과 최신 재진입 checkpoint 갱신
```

실제 관측 범위는 이 완전한 흐름보다 짧다. Day 3 최초 실행은 legacy 설치 path를 읽은 뒤 target의
`.codex`·`.agents`가 read-only라 생성 전 중단됐다. Day 4의 H1은 격리 `CODEX_HOME`에서 실제로
Phase 0~2 문서와 `session-log.md`, `latest-session-summary.md`를 남겼으나 Phase 3의
`.codex/agents`·`.agents/skills` 쓰기에서 실패했다. 로그는 다음 Phase 3, 실패 사유, 변경되지 않은
product source, 발급 ID 0개의 cleanup `not_applicable`을 기록했다. Day 5의 승인된 elevated probe는
빈 `.codex/agents` 경로를 생성·확인·삭제했을 뿐 Harness 재진입은 실행하지 않았다. 따라서 Phase 3
이후 파생 자산, Phase 6 gate, Phase 7 차단 및 실제 재진입은 아직 확인되지 않았다.

### GitHub Agentic Loop

```text
명시적 시작/재개 요청과 대상 식별
→ PR 우선, 없을 때 Issue·review thread 및 필요한 local/user/skill 상태 관측
→ caller가 source/evidence가 연결된 observation을 구성
→ workflow adapter가 source contract를 검증하고 fact normalize
→ validator/evaluator가 action 하나, completed 또는 stopped 반환
→ 사용자 결정이면 대기; 실행이면 확정 scope/baseline의 structured request
→ executor 경로 선택과 사전 조건 확인, 부수 효과 1회
→ 결과 correlation·변경·검증·postcondition 확인
→ GitHub/local 상태 재관측, 같은 task action 재평가, 보조 log와 보고 갱신
```

Day 2의 Issue #118→PR #119는 feature-change에서 implementation으로 넘기는 상세 historical flow다.
`feature-plan`, `branch-proposal` 등은 후보를 만들고 사용자 결정을 확정하지 않는다. 실제 GitHub
mutation은 결정 뒤에만 하며 mutation 전후 state를 다시 읽는다. Day 4·5에는 PR 목록이 빈 뒤 Issue #37을
read-only로 조회한 snapshot이 각각 기록됐지만, evaluator를 실행하거나 #37 workflow를 시작하지 않았다.
Day 3의 `FC-1` evaluator는 synthetic local fact만으로 명시 호출됐고 실제 GitHub 관측·재개는 아니었다.

## Discovery와 Activation 관측 결과

Phase 1의 운영 가설은 Harness 상위 lifecycle과 reference map이 실제 재진입에서 큰 초기 context를 만들
수 있는지, 그리고 leaf 선택이 routing 오류·안전 계약 누락보다 비용을 줄이는지였다. 문서가 길다는
사실만으로 결함을 단정하지 않는다는 기준을 유지한다.

| 시점 / scenario | 실제 관측 | 종합 판단 |
| --- | --- | --- |
| Day 3, 네 isolated CLI session | 모든 session에서 skill description이 2% context budget 때문에 제거됐다는 CLI 안내. 따라서 자동 discovery 후보는 보이지 않았고 뒤의 명시 path 실행을 generic auto-discovery 성공으로 셀 수 없음 | host의 해당 조건은 source description만으로 보완할 수 없었음 |
| Day 3 S1, Harness 최초 실행 | 자연어 요청에서 `/home/codechaser/.codex/skills/harness` legacy copy를 읽음. map 뒤 17 reference, 3,653 source lines를 열고 나서 `.codex`·`.agents` read-only를 확인해 중단 | 당시 해당 host에서 routing 오류가 1회 재현되고 넓은 activation과 늦은 readiness 확인이 관측됨. Harness build 성공이나 일반적 token 비용은 입증되지 않음 |
| Day 3 S2/S3, explicit official Harness | `~/.agents/skills/harness`와 reentry/evaluation에 해당하는 4개 leaf 및 target 파일을 읽고 write/Phase 7을 하지 않음. 두 의도는 같은 CLI session에서 관측 | 좁은 routing과 안전 대기 사례지만 자동 discovery 및 정상 P5→P6 흐름은 입증하지 않음 |
| Day 3 S4, `github-agentic-loop` | prompt로 current identifier를 지정하고 synthetic FC-1 입력을 evaluator에 전달. `action_required`와 사용자 선택 대기, GitHub mutation 없음 | 단일 action 경계 확인. raw GitHub observation, missing/ambiguous fact, resume은 미관측 |
| Day 3 S5, `issue-creation` 직접 호출 | thin skill → named contract section → target template → draft. 상위 loop나 다른 thin skill은 열지 않았고 mutation 없음 | progressive activation이 실제 가능한 긍정 대조 사례 |
| Day 4·5 host inventory | Day 4·5 보고서 당시 `$HOME/.agents/skills` 관리 대상 18/18 source parity, `$HOME/.codex/skills`에는 system 파일만 있고 legacy Harness/Engine은 보이지 않음 | Day 3 중복 설치는 당시 사실로 유지한다. Day 4·5에는 상태가 달라졌으나 정리 시점은 미확인. 정상 description 상태의 fresh-session 선택은 여전히 미관측 |

**결론:** discovery/activation 가설은 부분적으로만 확인됐다. 과활성화와 잘못된 설치 경로 선택은 Day 3의
특정 host 조건에서 실제 발생했지만, harness가 정상적으로 생성되거나 안전 경계를 어긴 건 아니다.
동일 source의 이후 host inventory에서는 공식 설치 parity가 유지되고 legacy 후보가 없었다. 자동 discovery가
회복됐는지는 다시 측정되지 않았다. thin skill의 좁은 named-section 경로는 잘 작동한 대조 사례다. 문서
분할이나 description 수정이 보편 해법이라는 근거는 없으며, 정확한 artifact별 token 비용도 측정되지
않았다.

## 상태와 Source of Truth

| 상태 | 소유자 / 정본 | 지속·재계산 규칙과 한계 |
| --- | --- | --- |
| GitHub Issue·PR·label·checklist·PR review thread | GitHub; 협업 완료·미완료 상태의 정본 | 매 재개 시 재조회. 일반 PR issue comment는 review feedback 정본이 아님. local log와 충돌하면 GitHub 우선 |
| `.github-agentic-loop/settings.json` | Workflow Engine이 지원 필드 소유; preference는 사용자 입력, capability는 관측 evidence | 필요 필드만 lazy initialize. unknown/malformed 값은 자동 교정하지 않고 중단. 현재 `checkedAt=2026-07-11`은 저장값일 뿐 live capability 확인이나 stale 판정이 아님 |
| `.github-agentic-loop/logs/github-workflow-log-YYYY-MM-DD.md` | Workflow Engine의 보조 실행·재개 기록 | 현재 checkout의 `.gitignore` 대상, 로컬 파일. `request_id`, `task_action_id`, 상태·결정·실행·재개를 연결하도록 설계됐지만 GitHub를 대체하지 않음 |
| normalized fact/evaluator result | 현재 source·GitHub·사용자·skill evidence로부터 계산되는 파생 상태 | adapter/evaluator 입력·출력. 재개 때 다시 계산하고 durable SoT로 쓰지 않음 |
| 타겟 `.harness/docs/team-spec.md` | 타겟 Harness 역할 정본 | agent TOML·`.agents/skills/*`는 파생 실행 자산. 정본과 drift하면 감사 후 범위 확인 |
| Harness `session-log.md` / `latest-session-summary.md` | 타겟 Harness 관측 journal / latest checkpoint | 각각 누적 기록과 다음 진입 힌트. 현재 target facts와 Phase 완료를 대신 증명하지 않음 |
| source package / installed copy | `.codex-dist/skills/*`는 저장소 배포 source; user skill root는 별도 installed snapshot | source commit과 설치 갱신은 다른 lifecycle. 18/18 parity는 해당 날짜의 내용 동등성이지 activation 선택 증명이 아님 |
| 사용자 결정 | 사용자 | 대화 입력이 명시되기 전에는 pending. log/checkpoint는 미결정을 확정값으로 승격하지 않음 |

Day 7 현재 checkout에서는 `.github-agentic-loop/logs/`의 다섯 dated file을 볼 수 있고 `.gitignore`가 이
경로와 `.harness/logs/`를 제외한다. legacy 경로의 `.harness/logs/github-workflow-log.md`도 이 checkout에
있으며 15,201줄이다. 현행 `github-agentic-loop/SKILL.md`는 새 dated path를 사용하고 `.harness/logs/`에
Workflow log를 쓰지 않는다고 명시한다. 현행 source가 legacy 대형 파일을 읽는다는 근거는 없다. 따라서
물리적 공존은 파일 선택 시 사람의 혼동 가능성으로 남기되, 현재 runtime의 소유권 충돌로 단정하지 않는다.

ignored log는 같은 working copy 안에서의 편리한 재개에 도움이 되지만 새 clone/host에 자동 전달되지
않는다. 실제 Day 6의 기록은 날짜 경계를 넘어 이전 `request_id`를 찾은 사례를 남긴다. 현재 보존 기간이
운영상 충분한지, 다른 host/clone 재개나 감사용 보존이 요구되는지는 별도 정책 질문이다. 중앙 저장소를
요구한다는 evidence는 아직 없다.

## 반복 실행, 재개와 복구

| 항목 | 현재 안전장치 / 관측 | 남은 제한 |
| --- | --- | --- |
| Workflow fact 계산 | pure adapter/evaluator, 닫힌 fact domain, evidence provenance, 0개·복수 transition과 invalid input fail-closed. Day 5 보고서의 fixture 실행은 그 시점에 122/122 통과로 기록 | Day 7에는 실행하지 않음. live GitHub ambiguity나 사용자 응답 후 fresh-session resume는 실제로 확인되지 않음 |
| GitHub mutation | 명시 결정, precondition/postcondition 재관측, 한 executor 경로, 성공 아닌 결과의 중단 | 실제 same `request_id` 동시 실행 방지는 별도 미확인 |
| Workflow resume | same `currentTaskActionId`로 최신 GitHub/local/user fact를 재수집·재평가; dated log는 중간 실행 상황 보조 | current date log가 없을 때 관련 이전 날짜 파일에서 근거를 찾고, 없으면 추론하지 않고 중단 |
| Harness 재진입 | 실제 target source·Team Spec·파생 자산 inventory를 재감사하고 summary의 Phase를 checkpoint로 사용 | semantic reconciliation이므로 같은 요청 재실행의 파일 단위 idempotency는 입증되지 않음. H1은 Phase 0~2 뒤 Phase 3에서 중단 |
| 설치 반복 | synthetic fixture에서 같은 source 재설치 뒤 active tree는 source와 수렴, 직전 설치는 backup으로 보존 | 반복 설치마다 backup이 늘어남. `uninstall`은 `.removed.*`로 이동하며 자동 restore command는 없고 수동 복구가 필요 |
| installer batch partial failure | synthetic blocker에서 첫 package 설치 후 두 번째 package backup 실패. 기존 sentinel과 staging cleanup은 보존됨 | 전체 목록을 감싸는 transaction/rollback은 없음. 재실행 전 active/source/backup inventory가 필요 |

### `request_id` 활성 슬롯: 계약과 구현 증거를 분리

`structured-execution-contract.md`는 동일 `request_id`의 활성 시도 없음 확인과 슬롯 선점을 원자적으로
수행하고, 경쟁 중 정확히 한 요청만 성공시키며, `duplicate_active_request_id`를 executor 시작 전에
반환하도록 요구한다. 이 요구는 명시된 설계다. 현재 `scripts/workflow-definition/`는 parse,
validation, normalization, evaluation의 pure 코드이며 이 슬롯을 소유하는 executable helper·저장
상태는 찾지 못했다. 관련 fixture/test source에도 동시 선점 assertion이 보이지 않는다. [현재 source]

따라서 “계약상 atomicity 요구가 있다”는 사실과 “runtime이 cross-session atomicity를 보장한다”는 주장을
분리한다. 저장소 소유 구현이 없다는 관측만으로 host/orchestrator 측 구현 부재를 증명할 수 없고, 실제
동시 요청·중복 mutation도 보고되지 않았다. 근본 원인은 미확인이다. 사용자는 동시 요청이 드물 것으로
판단해 현재 이를 조사하거나 구현하지 않기로 했다. Phase 3에서는 동시 중복 방지를 보장한다고 주장하지
않고, 실제 충돌 사례가 생기면 다시 검토한다. 이는 현재 확인된 결함이 아니라 수용한 저가능성 위험이다.

## 실패, Trace와 보고

### 확인된 실패 안전성과 진단 강점

- Workflow Definition·observation·fact contract 오류는 code/path/message와 `invalid_definition`,
  `invalid_observations`, `invalid_fact_candidates`, `invalid_state`, `no_transition_match`,
  `multiple_transition_matches`, `current_task_action_condition_not_met` 같은 reason으로 중단된다.
  normalizer 실패 시 partial fact state와 evidence map을 채택하지 않는 것이 source에 있다.
- 사용자 선택 대기는 정상적인 non-terminal 상태다. Harness Phase 6과 Workflow `user_decision_options`는
  결정 전 변경을 막는다.
- H1의 기존 runtime 기록은 session ID `harness-20261018-0445`, 정확한 `Read-only file system`
  실패, 완료/실패/미실행 Phase, 변경 없는 product source, 재진입 지점과 cleanup `not_applicable`을
  남겼다. 이는 Day 4 실제 실행 기록이며 Day 7에서 재현한 것이 아니다.
- Day 6이 읽은 2026-08-06 dated log에는 근거 없는 observation을 `invalid_observations`로 거부한 뒤
  source reference를 보완한 재개, 그리고 `prepared`/`ready` 반환값 불일치로 중단한 뒤 올바른 계약값으로
  재개한 과거 사례가 있다. 실패를 성공으로 가장하지 않은 기록이다.

### raw GitHub state → normalized fact 경계

현재 `state-observation-contract.md`는 PR 우선 조회, Issue·review-thread 판단과 알려진 상태 표현을
정의한다. `github-state-summary`는 출처가 있는 read-only 관측을 반환하며 task/전이를 정하지 않는다.
Workflow primary는 원본 상태와 사용자·로컬 근거를 한 snapshot으로 모으고, 예를 들어
`feature_change_entry_source` 및 routing facts를 직접 산출하도록 규정돼 있다. workflow state adapter는
이미 구성된 `fact_id`, `value`, `source_kind`, `source_reference`, `field_reference`를 source contract에
맞춰 검증하고 공통 normalizer로 넘긴다. `normalizeFactCandidates`는 raw GitHub API 응답을 읽거나
`OPEN`을 boolean으로 변환하는 parser가 아니다. [현재 source/설계]

따라서 workflow 상태 판정 규칙과 책임 경계는 문서에 정해져 있다. Workflow primary가 관측 fact를
산출하고 state adapter가 provenance/domain을 검증한다. adapter가 raw GitHub API parser가 아니라는
구현 경계도 확인했다. 잘못 매핑된 실제 GitHub 값은 관측되지 않았으므로 별도 parser나 추가 정책을
Phase 3 선행 조건으로 두지 않는다. 실제 오매핑 또는 지원하지 않는 상태로 인한 중단 문제가 관측될 때
현재 계약과 구현을 대조한다.

### 결과 출력 보존과 ignored log

공통 structured result는 `performed_actions`, `changed_files`, `verification_results`,
`postconditions_satisfied`, `residual_risks_or_failure_reasons` 및 request/baseline/session correlation을
요구하지만 모든 실행의 raw command stdout/stderr 보존 필드는 요구하지 않는다. 예외적으로
`claude-review-executor-contract.md`는 Claude companion stdout, exit code, stderr 진단을 명시하고,
`workflow-code-editor` 검증 모드는 `raw_results`를 반환한다. 이는 실행 주체별 상세가 존재함을 보이나
generic executor 전체로 확장된 보존 계약은 아니다. [현재 설계]

원본 출력 전체 보존은 크기·민감정보 비용을 추가할 수 있고, structured 결과만으로 원인 재현이 부족한
운영 실패도 이번 기록에서 확인되지 않았다. 사용자는 로그 수집·보존 기능을 추가할 계획이 없다고
결정했다. 기존 structured result, 실행 주체별 출력 계약, local ignored log를 현재 범위로 수용하며,
generic recorder나 중앙 log 저장소는 제안하지 않는다. local log가 다른 clone으로 전달되지 않는 한계는
사실로 기록하되 개선 과제로 취급하지 않는다.

## 확인된 강점

1. Codex host, 설치된 skill, target assets, GitHub와 사용자의 소유 경계가 문서화돼 있다.
2. Harness의 `team-spec` 정본과 파생 agent/skill, Workflow의 GitHub 정본과 derived fact/log가 분리돼 있다.
3. deterministic evaluator는 side effect와 분리되고, closed schema/provenance/fail-closed 경계가 있다.
4. 얇은 artifact skill은 초안·후보를 반환할 뿐 사용자 결정이나 전이를 대신하지 않는다.
5. 파일 수정 handoff는 시작 전 경로를 하나 선택하고 시작 뒤 fallback하지 않으며, 결과를 같은 범위·baseline
   계약으로 다시 검증한다.
6. user decision, 안전 중단, 미완료와 terminal 완료가 구분된다. 과거 H1 로그는 실제 중단과 재개 조건을
   사람이 이해할 수 있게 보존했다.
7. 날짜별 log와 GitHub 재관측의 우선순위가 정의돼 있다. 현재 checkout에서 로컬 로그가 GitHub 상태를
   덮도록 하는 source 동작은 발견되지 않았다.
8. 설치·제거는 삭제 대신 외부 backup/`.removed.*`를 보존하고, package 독립성과 Harness/Workflow 독립
   설치를 synthetic fixture로 다룬다.

## 활성 문제와 수용된 한계

### 현재 source에서 재현된 활성 결함

Day 1~6 근거와 현재 source 대조에서 **재현된 활성 source 결함은 확인되지 않았다.**

### 결함으로 확인되지 않은 검토·수용 항목

아래 항목은 사용자 범위 결정, 미관측 위험 또는 현재 계약의 경계다. 활성 결함이나 Phase 3 진입 차단
항목으로 분류하지 않는다.

| 항목 | 관측된 증상 | root cause 상태 | 영향 분류 |
| --- | --- | --- | --- |
| 동시 `request_id` 중복 | atomic claim 요구는 계약에 있으나 repository executable owner는 확인되지 않음. 실제 동시 요청·중복 mutation도 미관측 | host/runtime owner의 구현 여부는 미확인 | 사용자가 드문 상황으로 보고 조사를 보류하기로 함. 동시 요청이 생기면 중복 실행 가능성은 재검토할 correctness 위험 |
| raw GitHub mapping | adapter는 typed fact를 검증하며 raw API parser는 아님. 오매핑 사례는 미관측 | 계약은 workflow 판정 규칙과 primary/adapter 책임을 나눔. parser 구현 상세는 별도 확인되지 않음 | 현재 결함이나 Phase 3 선결조건으로 분류하지 않음. 실제 오매핑 때 재검토 |
| 출력·ignored log의 이식성 | generic result가 모든 raw stdout/stderr를 보존하지 않고 ignored log는 local-only | 실행 주체별 출력 계약과 local persistence가 현재 설계 | 사용자가 추가 수집·보존을 원하지 않음. 현재 한계를 수용하며 운영 비용 문제로 상정하지 않음 |
| Harness complete runtime evidence | H1은 Phase 0~2를 실제 기록했지만 Phase 3에서 target write가 막힘. Phase 6/Phase 7 및 재진입은 미관측 | 실행 환경의 Codex 보호 경로 제한이 관측 원인; source 오류는 입증되지 않음 | 구현 결함 아님. Phase 2 end-to-end assurance가 제한됨 |

### 수용된 한계

- 두 실행 체계는 서로 다른 상태 모델과 판단 책임을 유지한다.
- Harness 결과는 타겟 의미를 포함한 Markdown이며 Workflow 결과는 typed fact/evaluator와 structured
  execution contract다. 같은 검증 강도·schema를 강제하지 않는다.
- Workflow logs와 Harness logs는 local ignored evidence여서 공유 DB/새 clone에 자동 복제되지 않는다.
  사용자는 추가 log 수집·보존을 원하지 않아 현재 범위에서 이 한계를 수용한다.
- 재설치 시 이전 active tree를 backup하고, `uninstall` 결과 복원은 수동이다. 재설치마다 backup이 늘 수
  있으며 package 집합의 원자적 rollback은 없다.
- Codex `workspace-write`가 `.codex`/`.agents` 보호 경로를 제한하는 것은 host sandbox 동작이다. 일반
  user-code write failure와 섞지 않으며, 이 조사는 이를 우회해 Harness를 재진입하지 않았다.

## 증상과 근본 원인, correctness와 운영 비용

| 후보 | 분리한 증상 | 원인 판단 | Correctness / 운영 비용 |
| --- | --- | --- | --- |
| Day 3 S1 legacy skill routing | 한 host에서 natural Harness 요청이 old path를 읽었고 17 reference까지 열었음 | descriptions가 전부 숨겨진 host discovery, 그 host의 중복 설치 후보와 넓은 leaf 탐색. source 결함으로 입증되지 않음 | 당시 routing correctness 위험 + context/read 비용. Day 4·5 inventory에는 legacy가 없어 현시점 재발은 미확인 |
| H1 Phase 3 중단 | `.codex/agents`·`.agents/skills` write에서 read-only 오류 | workspace-write protected-path 정책이 관측됨. harness 생성 로직 버그라는 증거 없음 | 환경 제한으로 완료 범위 축소. 현재는 수용된 execution precondition |
| atomic `request_id` | 계약에는 atomic claim이 있으나 repo에서 owner 구현을 확인하지 못했고 실제 동시 중복은 미관측 | owner/runtime 경계 미확인; “미구현”은 아직 가설 | 사용자가 낮은 발생 가능성을 이유로 보류했다. 동시 실행을 방지한다고 주장하지 않으며, 충돌 사례가 생기면 correctness 위험을 재검토 |
| raw state conversion | Workflow 판정 규칙은 문서화됐고 normalizer는 typed observation부터 동작 | primary의 fact 산출과 adapter 검증으로 책임이 나뉨. raw parser 구현 상세는 현재 source에서 별도 확인되지 않음 | 오매핑 실제 사례가 없으므로 추가 parser·정책 변경은 요구하지 않음 |
| ignored logs / output | ignored log는 다른 clone에 없고 generic raw output은 durable 보장되지 않음 | local-only persistence와 executor별 output contract | 사용자가 추가 기능을 원하지 않아 한계를 수용. 데이터 정본 영향이나 실제 복구 실패는 확인되지 않음 |
| installer batch partial | synthetic failure에서 앞 package만 설치됨 | script는 package별 staging이지 전체 목록 transaction이 아님 | 시험된 상태에서는 sentinel/backup 보존. correctness 손실 없음, operator가 혼합 상태를 inventory해야 하는 운영 비용 |

## 근본 원인에 대한 종합 판단

1. 가장 큰 차이는 두 runtime의 목적이다. Workflow는 결정론적으로 평가할 수 있는 유한 state를, Harness는
   타겟 의미와 사용자 소유 품질 판단을 다룬다. 따라서 공통 schema·중앙 evaluator가 필요한 것이 아니다.
2. 재현된 activation 문제는 host discovery budget/중복 설치 snapshot/넓은 leaf 읽기의 조합이었다. Day 4·5
   inventory가 달라졌으므로 현행 source 수정 필요성은 입증되지 않았다.
3. Day 5의 atomic `request_id`는 contract와 repository에서 확인 가능한 owner 구현 사이에 증거 차이가
   있지만 실제 동시 중복은 미관측이다. 사용자는 발생 가능성이 낮다고 보고 Phase 3에서 이 보장을 다루지
   않기로 했다. 동시 호출이 발생하면 다시 조사한다.
4. raw GitHub 상태에 대한 workflow 판정 규칙과 primary/adapter의 역할은 문서에 정해져 있다. raw parser
   구현이 별도 source에서 드러나지 않는 사실은 실제 오매핑이 관측되기 전까지 추가 작업 근거가 아니다.
5. local log 보존 한계는 현재 구조의 속성이며 사용자가 수용했다. 새 persistence 계층은 필요하지 않다.

## 목표 방향

- Harness와 GitHub Agentic Loop의 현재 분리와 `workflow-code-editor` handoff를 유지한다. 장애 소유권·중복
  side effect가 반복 확인되기 전에는 통합 runtime을 도입하지 않는다.
- 동시 `request_id` 요청의 atomicity는 runtime owner가 확인되지 않았고, 사용자가 드문 위험으로 보고
  조사를 보류했다. Phase 3에서 동시 중복 방지를 보장한다고 주장하지 않고, 실제 충돌 시 재검토한다.
- 현재 `state-observation-contract.md`와 state adapter가 정의한 raw-state 판단·fact 검증 경계를 따른다.
  잘못된 mapping 사례가 나오기 전에는 parser나 진단 계층을 추가하지 않는다.
- 기존 structured result와 실행 주체별 출력 계약을 유지한다. 사용자의 결정에 따라 generic stdout/stderr
  recorder, 추가 log 보존 또는 중앙 log store를 제안하지 않는다.
- ignored log는 GitHub/`team-spec`을 대체하지 않는 auxiliary record로 유지한다. local-only 보존 한계는
  현재 범위에서 수용한다.
- 새 manifest, registry, compiled runtime, snapshot/index 계층은 반복된 drift/실패·측정 비용이 확인되기
  전에는 도입하지 않는다. PR #136의 revert는 근거 없는 계층을 재도입하지 않을 때 참고할 history다.

## 변경 유형 분류와 우선순위

### 즉시 수정

없음. 현재 source에서 안전 중단을 우회하거나 성공 조건을 잘못 계산하는 재현 가능한 오류는 발견하지
못했다. 이 결과는 새 테스트를 실행했다는 뜻이 아니며, 이번 작업에서 code/config/report 다른 파일은
수정하지 않는다.

### 정책 검토 및 수용 결정

| 처리 | 항목 | 현재 근거와 결정 |
| --- | --- | --- |
| 보류 | 동시 `request_id` 중복 방지 | atomic claim 요구와 저장소 내 owner 확인 불가 사실은 기록한다. 동시 실행이 실제 생기면 재검토하며 현재 구현 조사·수정은 하지 않는다 |
| 현행 계약 적용 | GitHub state 판정 | 문서의 조회·판정 규칙과 primary/adapter 책임을 사용한다. mapping 오류가 관측되기 전 별도 parser를 추가하지 않는다 |
| 수용 | 로그 수집·보존 범위 | 현재 structured result, executor별 출력과 local ignored log를 유지한다. 추가 recorder, cross-host 보존, 중앙 저장을 하지 않는다 |

### 기능 제안

- **조건부 P2 — installer partial completion 요약**: Day 5의 `/tmp` synthetic failure는 package 중간 상태를
  실제로 만들었지만 자동 data loss는 없었다. 현재 출력만으로 operator가 재실행 범위를 오인했다는
  실제 사례는 없다. 운영 혼란이 확인되면 package별 성공/실패와 재실행 inventory 안내를 기능 제안으로
  구체화한다. 전체 transaction/rollback은 별도 필요성 없이 추가하지 않는다.
- raw GitHub converter 또는 범용 stdout/stderr recorder는 기능 제안에서 제외한다. 잘못된 상태 매핑이나
  진단 실패가 실제 관측되고 사용자가 범위를 다시 요청할 때 재검토한다.

### 보류

| 후보 | 보류 이유 / 재검토 조건 |
| --- | --- |
| Harness와 Workflow 중앙 runtime·공통 state schema | 서로 다른 SoT/판단 모델이고 cross-runtime failure·state loss가 관측되지 않음 |
| executor registry·공통 installer manifest | installer의 별도 목록과 exact fixture가 있음. 실제 누락/드리프트 반복 후 재검토 |
| 중앙 log/trace DB 또는 새 durable request registry | 현재는 local log + GitHub/target 정본으로 진단된 과거 사례가 있음. 반복 recovery failure, host 간 보존 요구, 검색 비용 측정이 먼저 |
| #128/#129 compiled runtime·artifact·snapshot/derived index | 측정된 lifecycle failure 없이 도입됐다가 PR #136으로 revert. 새 실패와 운영 개선 증거 없이는 재도입하지 않음 |
| `.harness/logs/github-workflow-log.md` 삭제·이동 | 현재 checkout에는 큰 legacy file이 있으나 현행 source가 이를 읽는 증거 없음. 정리 권한·필요가 이번 범위가 아님 |
| capability `checkedAt` freshness TTL | 2026-07-11 timestamp만으로 잘못된 route 또는 capability 실패가 증명되지 않음 |
| discovery description/map 개편·추가 파일 split | 특정 Day 3 host에서만 activation 문제 관측. 새 session에서 discovery가 복구됐는지 확인하지 못함 |
| Harness H1/H2 재진입과 Phase 6/7 검증 | 이번 요청은 runtime 재진입을 금지함. 승인된 isolated target과 보호 경로 permission이 선행돼야 하며 현재 code bug는 입증되지 않음 |

## Phase 3 선행 조건

이번 사용자 판단에 따라 동시 요청 방지와 로그 확장은 Phase 3 선행 작업에서 제외한다. 아래 1~4는 범위와
적용할 현행 계약이며 별도 구현 gate가 아니다. 실제 선행 조건은 새 조사 evidence의 기준선 유지와, 해당하는
경우 격리 target 및 보호 경로 권한이다.

1. **요청 범위:** Phase 3에서 동일 `request_id`의 동시 중복 실행 방지는 목표로 다루지 않는다. 저장소에서
   atomic owner를 확인하지 못했으므로 이 보장을 확인된 것으로 표현하지 않는다. 실제 충돌이 발생하면 재검토한다.
2. **GitHub 상태:** 기존 `state-observation-contract.md`, workflow definition과 adapter 계약을 사용한다.
   판정 규칙은 문서화돼 있고 mapping 오류는 미관측이므로 별도 parser를 선행 구현하지 않는다.
3. **파일 변경 handoff:** 기존 `workflow-code-editor`가 실행 경로를 선택하고 반환 결과의 요청·baseline·범위·
   사후조건을 확인하는 계약을 따른다. 실제 handoff 오류가 없어 추가 계층이나 별도 Phase 3 gate는 없다.
4. **실패 기록:** 현재 structured result, executor별 출력과 local ignored log를 사용한다. 추가 stdout/stderr
   수집·이식성·중앙 저장은 이번 범위에 포함하지 않는다.
5. **증거 기준:** Day 3 activation, Day 4 H1 persistence, Day 5 installer fixtures, Day 6 과거 log는 각각
   당시 근거로 유지한다. Phase 3의 새 관측은 baseline과 시점을 새로 기록하고 synthetic 결과와 합치지 않는다.
6. **외부 실행 조건:** Harness end-to-end 재진입을 Phase 3 조사에서 수행하려면 별도 disposable target과
   보호 경로에 대한 명시적 권한 범위가 먼저 필요하다. GitHub Workflow start/resume이나 상태 변경은 해당
   조사 범위에서 별도 승인 전 수행하지 않는다.

## 남은 질문과 근거 식별자

1. 동시 `request_id` 실행은 아직 실제 관측되지 않았다. 발생하면 atomic slot owner와 중복 side effect 여부를
   조사할 것인가? 현재 사용자는 드문 위험으로 보고 Phase 3 범위에서 제외했다.
2. 현재 workflow contract대로 처리했는데 `OPEN`/`MERGED` 등 GitHub state가 잘못 매핑되는 사례가 생기는가?
   아직 그런 사례는 없다.
3. 기존 `workflow-code-editor` handoff에서 request/baseline/session 또는 변경 파일 근거가 끊기는 incident가
   있는가? 현재까지 보고되지 않았다.
4. Day 3의 2% description removal/legacy selection을 현재 새 Codex session에서 다시 볼 필요가 있는가?
   Day 4·5 host inventory 이후 자동 discovery 선택은 미관측이다.
5. H1의 실제 Phase 3 실패가 환경 보호 경로 외의 source issue를 드러내는가? 현재 H1은 보호 경로에서
   중단됐으며 이후 Phase 3 조사, H2 재진입, Phase 6/7 결과는 아직 없다.
6. Day 5 installer synthetic partial failure가 실제 사용자 운영 혼란으로 이어진 적이 있는가?

### 주요 경로 및 식별자

- Workshop: `docs/workshops/repository-evolution/execution-guide.md`,
  `docs/workshops/repository-evolution/phases/phase-02-runtime-engineering.md`
- Day reports: `docs/reviews/repository-evolution/phase-02/01-runtime-boundaries.md` …
  `06-failure-trace-reporting.md`; Phase 1 discovery 가설: `docs/reviews/repository-evolution/phase-01/summary.md`
- Harness: `.codex-dist/skills/harness/SKILL.md`, `references/reference-map.md`,
  `references/initial-generation-contract.md`, `team-spec-contract.md`, `reentry-rules.md`,
  `logging-contract.md`, `orchestrator-template.md`
- Workflow: `.codex-dist/skills/github-agentic-loop/SKILL.md`,
  `definitions/feature-change.json`, `definitions/implementation.json`,
  `scripts/workflow-definition/{workflow-state-adapter,normalized-fact-adapter,validator,evaluator,cli}.mjs`
- State/execution: `.codex-dist/skills/github-agentic-loop/references/{state-observation-contract,normalized-fact-adapter-contract,structured-execution-contract,file-change-execution-contract,target-harness-execution-contract,command-execution-path-contract,claude-review-executor-contract}.md`
- Handoff result owner: `.codex-dist/skills/workflow-code-editor/SKILL.md`; compatibility contract:
  `.codex-dist/skills/github-agentic-loop/references/target-harness-execution-contract.md`
- Config/log: `.github-agentic-loop/settings.json`; `.github-agentic-loop/logs/`; legacy local
  `.harness/logs/github-workflow-log.md`; ignore rules `.gitignore:3-4`
- Install/fixture: `install.sh`, `uninstall.sh`,
  `.codex-dist/skills/github-agentic-loop/tests/workflow-definition/all-fixtures.test.mjs`
- Identifiers/history: workflow IDs `feature-change` / `implementation`; tasks `FC-1`…`FC-7`,
  `FI-1`…`FI-36`; request/result IDs `request_id`, `task_action_id`, `target_baseline`,
  `actual_orchestration_session_id`, `actual_execution_session_id`; failure `duplicate_active_request_id`;
  historic Issue #118 / PR #119; current at prior Day 4/5 read-only snapshot Issue #37;
  historic PR #122/#123 (close capability), #124/#125 (install root), #127 (identifier rename),
  #136 (runtime rollback).

## Day 7 완료 조건 체크리스트

- [x] 현재 branch, HEAD, 시작 worktree, local `main` 기준선과 fetch하지 않은 remote freshness 한계를 기록했다.
- [x] Harness와 GitHub Agentic Loop의 소유권, runtime 경계, 의도된 차이와 file-change handoff를 근거로 설명했다.
- [x] 입력부터 실행·검증·상태 반영·보고까지 양쪽 대표 생명주기를 재구성하고 runtime 관측과 설계를 구분했다.
- [x] Phase 1 discovery/activation 가설을 Day 3 실제 trace와 Day 4/5 후속 host inventory에 대조했다.
- [x] 상태 정본, derived facts, checkpoint, configuration, ignored logs의 소유와 보존 범위를 정리했다.
- [x] 반복 실행·재개·복구를 Harness, Workflow, installer 단위로 구분했다.
- [x] `request_id` 동시성 위험, raw GitHub mapping, 진단·보존, handoff를 근거와 사용자 범위 판단으로 구분했다.
- [x] correctness 위험과 운영 비용, observed symptom과 root-cause hypothesis를 구분했다.
- [x] 중앙 runtime, registry, manifest, common schema, central log store 필요성을 기존 정본 중복·새 owner·복구 비용까지 고려해 평가했다.
- [x] 즉시 수정·정책 검토·기능 제안·보류를 우선순위와 재검토 조건으로 분류했다.
- [x] Phase 3 선행 조건, 미해결 질문, 근거 경로·식별자를 기록했다.
- [x] runtime 재진입, protected-path 실행, GitHub Workflow 시작/재개·상태 변경, 테스트 실행, fetch를 하지 않았다.

