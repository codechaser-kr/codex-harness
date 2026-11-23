# Phase 3 Day 6 — Resume and Cancellation Semantics

## 문서 성격과 조사 기준선

이 문서는 Repository Evolution Workshop Phase 3 Day 6의 정적 계약·source 조사 기록이다. 공식 설계나 정책을 대신하지 않는다. Definition과 계약이 선언한 동작, 현재 checkout의 source 연결, fixture/test source가 기대하는 동작, Codex 오케스트레이션에 대한 사용자 전제, 분석 판단과 미확인 사항을 구분한다.

이번 작업에서는 Workflow를 시작·재개하지 않았고, Harness·외부 실행·GitHub 조회나 변경을 하지 않았다. 테스트를 실행하지 않았으며 기존 문서, Definition, 계약, adapter, 설정, fixture/test source도 수정하지 않았다. 아래의 실행·재개 흐름은 정적 추적이며 runtime 검증 결과가 아니다.

| 항목 | 조사 시작 시 관측값 |
| --- | --- |
| 조사일 | 2026-11-23 (Asia/Seoul) |
| Branch | `docs/repository-evolution-workshop` |
| HEAD | `c1a5e4a7ac869eb65048c3ac6815b779db64b92d` (`docs: Phase 3 Day 5 실행 경계 조사 기록`) |
| 작업 트리 | `git status --short` 출력이 비어 있음 |
| Local `main` | `7fe25450a783a1da74d0c5412d5478a9103c9bd2` |
| Cached `origin/main` | `7fe25450a783a1da74d0c5412d5478a9103c9bd2` (local `main`과 동일) |
| `main...HEAD` | `0 23`; local `main`은 HEAD의 조상이며 현재 branch가 23 commit 앞섬 |
| Branch upstream | `origin/docs/repository-evolution-workshop`; cached SHA `aa9294f4bf3efaf701f22e8e5d321e31e5e5bb84`; 현재 HEAD가 1 commit 앞섬 (`0 1`) |
| 원격 최신 여부 | **미확인**. `fetch`하지 않았으며 cached remote-tracking ref가 현재 원격과 같은지 알 수 없음 |

## 상태 용어 구분

| 상태 | 현재 계약·source에서의 의미 | 재개와 종료의 의미 |
| --- | --- | --- |
| 사용자 결정 대기 | evaluator가 completion predicate 미충족 시 `action_required`를 반환한다. 현재 transition의 `user_decision_options`가 비어 있지 않으면 사용자 선택이 필요한 단계다. (`evaluator.mjs:107-114`; `structured-execution-contract.md`, 중단·재개 판정) | 선택이 확정되기 전 completion fact를 만들지 않는다. 사용자 입력이 없거나 유효하지 않으면 같은 결정 단계에 남는다. |
| 보류 | `FI-34`에서 `merge_deferred`를 사용자 결정 fact로 기록한 경우다. 이는 사용자 결정이며, 사용자가 확정한 동작은 해당 작업을 그 상태에 두고 자동 진행하지 않는 것이다. (`implementation.json:1350-1370`; Day 5 사용자 결정) | 재개 요청 전까지 대기한다. 취소나 terminal 완료가 아니며 자동으로 `FI-35`를 수행하거나 PR을 병합하지 않는다. |
| `stopped` / 실행 중단 | 정보 부족, 관측·상관 실패, 사전조건·권한·도구 불충족, 실행 오류, 결과 불일치 및 검증 실패 등으로 평가/실행을 안전하게 진행할 수 없는 상태다. evaluator·composition runtime은 사유를 붙여 중단할 수 있다. | 원인·결과·복구 조건을 보존하고, 필요한 재관측·값 보완·경로 재판정을 마친 뒤 명시적 재개 요청에서 entry부터 다시 평가한다. 성공으로 간주하지 않는다. |
| terminal 완료 | evaluator가 완료 predicate가 참인 terminal transition(빈 `next_transition_rules`)에 도달하면 `completed`를 반환한다. `implementation`은 `FI-36`에서 `implementation_completed=true` 및 선행 완료 조건을 요구한다. (`implementation.json:1404-1427`) | 현재 Definition 흐름이 정상 완료된 상태다. 보류나 단순 실행 중단과 다르다. |
| 취소 | 현재 Definition에는 전역 취소 입력, cancellation fact/transition, `cancelled` evaluator status가 없다. `merge_deferred`는 취소가 아니다. `feature-proposal`의 `do_not_proceed`도 해당 업무 흐름의 정상 분기이지 임의 취소 상태가 아니다. | 취소를 보류, `stopped`, 또는 `completed`로 추측해 치환할 수 없다. 구조화 실행 계약은 범위 밖 요청을 `중단`으로 분류하지만, 이것만으로 영속 취소 의미나 이후 재개 규칙이 생기지는 않는다. |

`action_required`는 작업 실행이 필요하다는 evaluator 결과이며 그 자체로 사용자 결정 완료를 뜻하지 않는다. 다음 실행 입력은 `user_decision_options`의 존재 여부와 확정 fact를 함께 보아야 한다. `stopped`와 `completed`는 별도 결과다. 현재 evaluator 출력에는 `paused`나 `cancelled` 같은 별도 상태가 없다.

## FI-34: 입력에서 보류·명시적 재개까지

`implementation`의 entry는 `FI-1`이다. 정상 진행 중 `FI-33`에서 `remaining_feedback_status=all_resolved`이면 `FI-34`로 간다. `FI-34`는 `review_feedback_inventory=no_actionable_feedback` 또는 `remaining_feedback_status=all_resolved`를 요구하며, 선택지는 `merge_confirmed`와 `merge_deferred`다. 완료 predicate는 `pull_request_merge_decision=merge_confirmed` 하나다. (`definitions/implementation.json:1335-1371`)

| 단계 | 입력·관측 | 정적 평가 결과 | 해석과 다음 조건 |
| --- | --- | --- | --- |
| `FI-34` 진입 | 피드백 없음 또는 전부 해결됨 | `FI-34` 완료 fact가 아직 없으면 `action_required`, `task_action_id=FI-34` | 사용자 결정을 기다린다. `executor_reference`는 `null`이다. |
| 선택 미입력·유효하지 않은 입력 | `pull_request_merge_decision`을 새로 확정하지 않음 | `action_required`로 `FI-34`에 머묾 | `user-decision-contract.md`에 따라 유효한 선택 전에는 completion fact를 만들지 않는다. |
| `merge_deferred` | `pull_request_merge_decision="merge_deferred"`, provenance `source_kind=user_input` | completion predicate가 거짓이므로 `action_required`, `task_action_id=FI-34`가 반환됨. `next_transition_rules`는 평가되지 않음. | **합의된 사용자 결정:** 해당 작업을 이 상태 그대로 멈춘다. 별도 재개 요청 없이 자동 전이·PR 병합·terminal 완료는 없다. |
| 보류 뒤 명시적 재개 요청, 새 merge 결정 없음 | 현재 GitHub/local 상태와 보조 로그를 새로 관측·정규화하고 `FI-1`부터 재평가 | 현재 fact가 여전히 보류라면 경로를 따라 `FI-34`에서 다시 `action_required` | 재개 요청 자체를 `merge_confirmed`로 간주하지 않는다. 유효한 새 결정이 없으면 보류가 유지된다. |
| 명시적 재개 요청에 `merge_confirmed` | 현재 결정으로 `pull_request_merge_decision="merge_confirmed"`를 관측/정규화 | `FI-34` completion predicate가 참이고 무조건 edge를 따라 `FI-35`로 전이. `FI-35`의 merged·reflection facts가 아직 없으면 `action_required`, `task_action_id=FI-35` | `merge_confirmed`는 workflow terminal 완료가 아니며 그 자체로 실제 병합 결과를 증명하지 않는다. `FI-35`는 `pull_request_merged=true`와 `post_merge_reflection_completed=true`를 모두 요구한다. |
| 병합·사후 반영 완료 | 최신 상태에서 두 `FI-35` 완료 fact 확인 | 같은 action 재평가 결과 `FI-36`으로 이동 | `FI-36`은 `implementation_completed=true`를 요구하며, predicate가 참이고 추가 edge가 없을 때만 `completed`다. |

`merge_deferred`와 결정 전 상태는 모두 evaluator status로는 `action_required`다. 정규 fact 값은 서로 다르지만 별도의 `deferred` status는 없다. 보류가 멈춤으로 유지되는 처리는 사용자가 확정한 오케스트레이션 의미이며, evaluator의 별도 pause 상태로 표현된다고 주장하지 않는다.

**재개 시 입력의 출처 관련 미확인 경계:** `implementation-state-adapter.mjs:44`는 `pull_request_merge_decision`의 출처를 `user_input`으로 제한하고, 사용자 결정 계약은 재개 요청에 포함된 입력을 현재 결정으로 해석한다. 그러나 재개 때 과거 `merge_deferred`와 새 사용자 입력을 log/provider가 어떤 방식으로 단일 현재 fact로 구성하는지, 과거 값의 supersession을 어떻게 표현하는지는 계약/source에 구체화되어 있지 않다. Adapter는 한 fact의 중복 후보를 거부하고(`workflow-state-adapter.mjs`, `normalized-fact-adapter.mjs`), composition runtime은 GitHub 관측과 log 간 우선순위를 다룬다. 현재 사용자 입력의 시간 순서를 고르는 동작은 확인되지 않았다. 이는 runtime 결함으로 확인된 것이 아니며, 재개 입력을 실제 관측 세트에 연결하는 Codex 오케스트레이션 경계의 미확인 사항으로 남긴다.

## 재개 시 재관측·재평가와 상관관계

| 식별자·근거 | 맡는 역할 | 재개 때 적용할 조건 |
| --- | --- | --- |
| `request_id` | 관측 요청과 구조화 실행 요청·결과의 상관 키. 구조화 실행 요청 내용 하나를 식별한다. | 모든 상태 관측 요청에 필요하다. 동일한 확정 요청의 순차 재전송은 이전 시도가 성공 또는 중단으로 최종 기록되고 활성 시도가 없으며 요청 내용이 그대로일 때만 같은 ID를 쓸 수 있다. 기준선, 범위, 확정값 등 요청 내용이 바뀌면 새 요청과 새 ID가 필요하다. 현재 계약은 매 재개 관측마다 새 ID를 발급하라고 정하지 않는다. |
| `task_action_id` | Definition 안의 logical action/node 식별자. 실행 위치 자체를 durable 재개 포인터로 만들지 않는다. | 진행 중 action의 실행이 끝난 뒤에는 새 상태를 관측하고 **같은 action ID**로 평가해 완료·다음 전이를 결정한다. 중단 후 명시적 재개는 로그의 이전 ID를 선택 기준으로 쓰지 않고 Definition entry부터 평가한다. |
| `target_baseline` | 요청 대상 저장소의 기준 상태 식별자(commit SHA 또는 동등 값). | 매 상태 관측과 구조화 실행 요청에 필요하며 결과와 원 요청에서 일치해야 한다. 재개에서 현재 코드 상태를 다시 관측한다. baseline이 달라졌거나 새 범위가 필요하면 이전 요청에 새 상태를 덧씌우지 않고 새 요청 ID로 고정한다. |
| 실행 session ID | 실제 실행 주체·시도와 결과를 구별하고 계획한 session 관계와 실제 실행을 상관한다. `task_action_id`와 다르다. | 실제 실행이 있었다면 결과의 orchestration/execution session ID, planned/actual session relation을 대조한다. 별도 ID를 발급하는 주체는 첫 spawn 전에 callable `close_agent`를 확인하고, 소유 ID의 결과를 보존한 뒤 정리한다. `completed`/`timed_out` 상태만으로 정리 완료를 뜻하지 않는다. |
| GitHub·local 상태 및 로그 | 현재 협업 상태와 로컬 실행 상태의 관측 근거. GitHub가 정본인 사실에 로그는 보조 근거다. | 중단 후 재개마다 최신 GitHub 실행 상태와 현재 코드 상태를 다시 관측한다. 현재 날짜 로그, 필요한 경우 관련 최신 이전 날짜 로그는 `request_id`·`task_action_id`·재개 조건 복원에만 사용한다. 충돌 시 GitHub 상태 우선; 근거가 모자라면 추측하지 않고 중단한다. |

`github-agentic-loop/SKILL.md`는 최초 진입 및 중단 후 재개를 `definition.entry_task_action_id`부터 평가하고 최신 상태를 다시 관측·정규화하도록 선언한다. `runWorkflowObservationCycle`은 호출자가 제공한 GitHub/log provider의 `request_id`와 `target_baseline`을 확인하고, provenance를 검사한 후 adapter와 evaluator를 연결한다. 이 함수 자체가 GitHub, 로컬 파일, 외부 Skill을 조회하지는 않는다. (`SKILL.md:95-131`; `composition-runtime.mjs:364-471`; `state-observation-contract.md`의 상태 읽기 및 Runtime observation 입력 경계)

따라서 저장된 작업 위치만 이어가는 흐름이 아니다. 단, 실제 재개가 매번 entry에서 시작되는지, 현재 사용자 입력이 새 관측 묶음에 들어가는지, provider가 어떤 근거를 가져오는지는 이번 정적 조사에서 호출하지 않았다.

## 실패·도구 부재·부분 실행 이후의 정지와 재개 조건

| 상황 | 현재 계약이 요구하는 정지 | 명시적 재개 전 조건 |
| --- | --- | --- |
| 사용자 결정 대기·누락·형식 오류 | 같은 결정 action에서 기다리고 completion fact를 만들지 않는다. | 유효한 결정 또는 빠진 필수 식별값을 확보한다. 단순한 “재개” 입력은 선택지에 맞는 결정으로 해석되지 않는 한 결정을 대체하지 않는다. |
| 관측 provider 없음/실패, `request_id`·baseline·source 불일치 | composition runtime은 adapter/evaluator 전에 `stopped`를 반환한다. 누락·충돌 fact를 추측으로 채우지 않는다. | provider 오류·상관 문제를 해소하고 해당 요청에 맞는 읽기 전용 최신 관측을 다시 만든다. |
| 사전조건·권한·필요 도구 불충족 | 실행 전 구조화 실행을 중단한다. 필요한 값·baseline·권한·도구를 확인한다. | 재개 전에 조건을 다시 확인한다. 파일 변경은 실행 전에 Harness 준비가 불충족이면 요청 조건이 맞는 경우 `general_code_change` 경로를 선택할 수 있다. |
| 선택한 실행 경로가 시작된 뒤 timeout·오류·부분 변경 또는 변경 여부 불명 | 실행 경로를 바꾸거나 같은 변경을 자동 재시도하지 않는다. 수행 동작, 변경 여부, 검증 실패와 복구 조건을 보존하고 중단한다. | GitHub와 현재 로컬 상태를 새로 관측하고 기존 결과를 request/baseline/scope/session과 대조한다. 시작 후 실패는 실행 전 Harness preflight 실패와 다르며 다른 파일 변경 경로로 fallback하지 않는다. |
| 결과의 `request_id`, baseline, scope, execution session 불일치 | 결과를 성공 근거로 쓰지 않고 중단한다. 결과값으로 원 요청을 대체하지 않는다. | 원 요청과 최신 상태를 다시 상관한다. 요청·baseline·확정 범위를 바꿔야 하면 새 `request_id`를 발급한다. 같은 immutable 요청의 재전송은 이전 시도가 최종 기록된 뒤에만 가능하다. |
| postcondition 또는 verification 실패 | 구조화 실행 성공이 아니며 다음 전이로 진행할 수 없다. 결과와 실패 사유를 보존한다. | 실패 원인과 현재 상태를 확인하고, 기존 확정 요청을 유지할 수 있는지 또는 새 요청이 필요한지 판단한 뒤 다시 관측·평가한다. |
| session 정리 실패 | 실행 결과를 보존하되 완전한 구조화 실행 성공/검증으로 판정하지 않는다. ID를 발급한 주체가 정리 책임을 가진다. | callable `close_agent` 여부와 소유권에 따라 원인을 처리한다. 부모가 자식 ID를 대신 종료하지 않는다. cleanup 실패를 실행 성공으로 바꾸지 않는다. |

구조화 실행 성공은 사용 가능한 원 요청과 결과, 요청-결과 상관 일치, 실행 범위 준수, 모든 사후조건 및 검증 기준 성공이 모두 충족될 때만 성립한다. 파일 변경 경로가 한 번 시작되면 실패 시 경로 fallback을 하지 않는다는 점은 `file-change-execution-contract.md`와 `target-harness-execution-contract.md`가 명시한다. GitHub Agentic Loop는 확정된 변경 작업과 범위를 산출한다. 현재 대상 환경에서 Harness 사용 가능성을 확인해 적절한 실행 경로에 연결하는 책임은 사용자가 정한 Codex 오케스트레이션 전제다. 저장소에 외부 caller가 없다는 사실은 결함으로 분류하지 않는다.

## 근거 종류별 보장과 한계

| 근거 종류 | 확인한 내용 | 보장하지 않는 것 |
| --- | --- | --- |
| Definition: `.codex-dist/skills/github-agentic-loop/definitions/implementation.json:172-180, 1335-1427` | merge 결정 domain, FI-34 선택지·완료 predicate·FI-35 edge, FI-35 완료 조건, FI-36 terminal predicate를 선언한다. 일반 취소 fact/transition은 없다. | 상태 관측, 사용자 입력 처리, merge 수행, 재개 호출을 실행하지 않는다. |
| Contract: `.codex-dist/skills/github-agentic-loop/references/{user-decision,structured-execution,state-observation,file-change-execution,target-harness-execution,agent-lifecycle}-contract.md` | 유효한 사용자 입력, entry 재평가, 새 관측 및 request/baseline/result 상관, 중단·재개 조건, 파일 실행 경로 선택/fallback 경계, session 소유·정리 조건을 선언한다. | 이번 세션이 해당 절차를 runtime에서 수행했음을 증명하지 않는다. Atomic active-slot 요구도 contract 선언이다. |
| Source: `.codex-dist/skills/github-agentic-loop/scripts/workflow-definition/{evaluator,composition-runtime,implementation-state-adapter,workflow-state-adapter}.mjs`, `.codex-dist/skills/github-agentic-loop/SKILL.md:95-131` | 순수 evaluator의 현재 task 판정, injected observation의 상관·정규화·평가 연결, merge fact의 provenance 검사, entry부터 재개한다는 orchestration 절차를 확인한다. | GitHub API/log provider, 외부 executor, Codex host 호출 구현이나 실제 재개 세션을 포함하지 않는다. 실제 provider와 사용자 입력을 연결하는 호출 책임은 Codex 오케스트레이션에 있다. |
| Fixture/test source: `.codex-dist/skills/github-agentic-loop/tests/workflow-definition/fixtures/implementation-states.json:900-965`, `implementation.test.mjs:150-160`, `workflow-composition-observations.test.mjs:506-531`, `evaluator.test.mjs:83-107` | deferred decision이 `FI-34`에서 `action_required`로 남고, confirmed decision이 `FI-35`로 가며, FI-36 완료 및 부모 재평가 handoff 등 예상/assertion 의도를 표현한다. | synthetic 상태와 mock provider다. 실제 PR, 사용자 입력 history, GitHub/local 상태, caller, session 또는 runtime 재개를 검증하지 않는다. 테스트는 실행하지 않았다. |
| 사용자 전제·결정 | Codex 오케스트레이션이 Workflow 간 사용자 결정·실행 결과·재관측 전이를 맡고, 대상 Harness 준비도와 파일 실행 경로를 연결한다. FI-34의 `merge_deferred`는 그 상태 그대로 멈추며 취소나 terminal 완료가 아니다. | Repository source가 외부 호출 코드를 포함해야 한다는 요구가 아니다. 본 보고서는 외부 호출을 실행·검증하지 않았다. |

## 확인된 문제와 후속 후보

### 확인된 문제

- 이번 정적 조사에서 재현 가능한 runtime 결함이나 incident는 확인하지 않았다. 실행·재개·GitHub mutation 및 테스트를 수행하지 않았으므로 정상 동작을 검증했다는 뜻도 아니다.
- `merge_deferred`에 대한 정적 계산 결과는 Definition·evaluator·fixture의 기대와 일치한다. 이는 runtime 검증이 아니라 source 추적 결과다.

### 정책 검토 후보

- 새 정책 검토 후보를 열 근거는 확인하지 않았다. 취소의 별도 전역 의미나 승인을 이번 계약 검토에서 새로 정하지 않는다.
- Phase 8은 승인·권한·위험 정책 검토 단계다. Day 6의 현재 계약 경계 확인과 구분하며, 실제 incident 없이 승인 단계·권한 체계·실행 wrapper를 제안하지 않는다.

### 기능 제안 후보

- 기능제안 `#139`는 사용자가 지정한 대로 **미확정 제안**으로만 유지한다. 이번 작업에서 Issue 상태를 조회하거나 변경하지 않았고 이를 정책 결정이나 구현 지시로 승격하지 않는다.
- 별도 취소 API/status나 재개 wrapper를 새 기능으로 제안할 근거는 이번 조사에서 확인되지 않았다.

### 보류 후보와 미확인 사항

- **보류와 일반 결정 대기의 evaluator status 구분:** fact 값은 구별되지만 둘 다 `action_required`다. 현재 사용자 결정은 오케스트레이션이 `merge_deferred`에서 자동 진행하지 않도록 의미를 고정한다. 실제 혼동 사례 없이 status 모델 변경을 제안하지 않는다.
- **취소 모델:** Definition에는 명시적 취소 상태가 없지만 이것만으로 결함은 아니다. 구체 incident와 별도 사용자 결정 없이는 추가 정책을 만들지 않는다.
- **재개 시 이전·새 사용자 입력의 교체 규칙:** 계약은 재개 요청 입력 판정을 정의하지만 과거 `merge_deferred`와 새로운 사용자 결정을 provider가 한 current fact로 만드는 구체 계약은 확인되지 않았다. 재개 source 연결의 실행 사례가 생기기 전까지 원인·영향을 확정하지 않는다.
- **동일 `request_id` 동시 선점:** structured contract는 원자적 active-slot 선점을 요구하지만 이번에 읽은 repository source에서 이를 수행하는 runtime helper는 확인되지 않았다. Phase 2 summary의 저가능성 수용·보류 범위를 유지한다. 동시 실행 실험이나 새로운 registry 제안은 하지 않았다.
- **실제 오케스트레이션 수행:** provider 연결, 실제 user input의 fact 구성, 외부 executor 호출, 결과 상관 및 session 정리는 Codex 오케스트레이션 책임이다. 이번 static-only 조사에서 수행하거나 관측하지 않았다. 소유 source가 없는 것을 저장소 결함으로 보지 않는다.

## Day 6 완료 체크리스트

- [x] 시작 branch, HEAD, 작업 트리, local `main`, cached `origin/main`, upstream을 기록했다. `fetch`하지 않았고 원격 최신 여부를 미확인으로 남겼다.
- [x] 보류·재개·취소·`stopped`·terminal 완료를 Definition, contract, evaluator, 사용자 결정의 경계에 따라 구분했다.
- [x] FI-34의 결정 전 대기, `merge_deferred`, 명시적 재개, `merge_confirmed`, FI-35 및 FI-36 결과를 정적으로 추적했다.
- [x] 재개 시 entry부터 재관측·재평가하는 계약과 `request_id`, `task_action_id`, `target_baseline`, execution session의 상관 역할을 분리했다.
- [x] 도구 부재, 사전조건 실패, timeout·부분 변경, 결과 mismatch, 검증 실패 및 session cleanup 뒤의 중단·재개 조건을 기록했다.
- [x] Definition·contract·source·fixture/test의 기대와 한계를 나누고, 사용자 전제에 해당하는 Codex 오케스트레이션 책임과 혼동하지 않았다.
- [x] fixture/test source만 읽고 테스트는 실행하지 않았다. 실행하지 않은 동작을 통과·검증으로 표현하지 않았다.
- [x] Phase 8 정책 승인 검토와 Day 6 계약 검토를 구분했고, #139를 미확정 제안으로 유지했다.
- [x] 기존 Definition, contract, adapter, 설정, fixture/test source를 수정하지 않고 이 Day 6 보고서만 추가했다.

## Day 6 뒤의 별도 작업 — 완료

보고서 작성 후 별도 변경으로 `pr-creation` Skill을 `pr-request`로 이름 변경하고 설명에서 초안 제안 표현을 제거했다. GitHub Agentic Loop의 연결 참조와 호출명, 관련 검사, 설치·제거 배포 산출물도 함께 정렬했다.
