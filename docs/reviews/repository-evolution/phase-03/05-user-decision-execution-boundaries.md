# Phase 3 Day 5 — Human Decisions and Execution Boundaries

## 문서 성격과 근거 구분

이 문서는 Repository Evolution Workshop의 정적 조사 기록이다. 공식 설계·정책이나 실행 보고서를 대신하지 않는다. 계약과 Skill이 선언한 동작, checkout에서 확인한 source 연결, fixture/test source가 보호하려고 작성된 조건, 분석 판단, 미확인 사항을 구분한다.

이 보고서에서 **host/오케스트레이터**는 Workflow 작업 사이의 전이를 조율하고 저장소 helper와 외부 실행 도구를 연결하는 runtime 주체를 뜻한다. 이번 작업 환경에서는 사용자가 밝힌 전제에 따라 Codex가 그 역할을 맡는다. 이 주체의 실제 대화·도구 호출 내부 구현이 저장소에 없다는 점은 예상 가능한 경계다.

| 표기 | 의미 |
| --- | --- |
| **[현재 source]** | 이 checkout의 Definition, JavaScript, Skill, 계약 문서에서 직접 확인한 값이나 코드 |
| **[계약]** | 계약 문서가 요구하는 동작. Codex 오케스트레이션의 이번 runtime 수행을 확인했다는 증거는 아님 |
| **[fixture/test source]** | synthetic 상태와 assertion이 표현하는 예상·불변 조건. 실행 결과를 뜻하지 않음 |
| **[이전 기록]** | Phase 2 Summary 및 Phase 3 Day 1~4 보고서에 기록된 그 시점의 분석·사용자 결정 |
| **[분석 판단]** | 위 근거를 연결한 정적 해석. runtime 관측과 구분함 |
| **[미확인]** | 이번 정적 조사만으로 값의 실제 생성·실행·관측 여부를 확인할 수 없는 항목 |
| **[사용자 지시]** | 이번 요청에서 주어진 범위 또는 처리 기준 |

Day 5 조사에서는 Harness 재진입, Workflow 시작·재개, GitHub 읽기/쓰기, 파일 실행, fetch, 테스트 실행을 하지 않았다. 지정된 계약·Definition·Skill·실행 코드와 fixture/test source만 읽었다. 아래의 성공·중단 조건은 계약상 기준이며 이번 작업에서 실행 결과로 확인한 값이 아니다.

## Git 기준선

조사일은 2026-11-23 (Asia/Seoul)이다. 시작 시 확인한 값이며, 원격을 갱신하지 않았다.

| 항목 | 시작 시 관측값 |
| --- | --- |
| Branch | `docs/repository-evolution-workshop` |
| HEAD | `aa9294f4bf3efaf701f22e8e5d321e31e5e5bb84` (`docs: Phase 3 Day 4 라우팅 조사 기록`) |
| Worktree | `git status --short` 비어 있음 |
| Local `main` | `7fe25450a783a1da74d0c5412d5478a9103c9bd2` |
| Cached `origin/main` | `7fe25450a783a1da74d0c5412d5478a9103c9bd2`; local `main`과 같음 |
| `main...HEAD` | `0 22`; local `main`은 HEAD의 조상이고 현재 HEAD가 22 commit 앞섬 |
| Branch upstream | `origin/docs/repository-evolution-workshop`; cached upstream SHA는 HEAD와 같은 `aa9294f4bf3efaf701f22e8e5d321e31e5e5bb84`, divergence `0 0` |
| 원격 최신 여부 | **미확인**. fetch하지 않았으므로 현재 원격과 cached remote-tracking ref가 같은지 알 수 없음 |

기준선의 사실은 위 Git 조회 결과다. 이전 Day 보고서의 HEAD, 작업 트리, runtime·test 기록은 해당 보고서 시점의 기록으로만 사용했다.

## 책임 경계 요약

| 단계 | 선언된 책임 | 현재 source에서 보이는 연결 |
| --- | --- | --- |
| 제안·분석 artifact | 전용 Skill이 초안·후보·분석만 반환한다. `artifact-output-contract.md`의 사용 가능 기준을 충족해야 다음 상태 입력으로 쓸 수 있다. | `github-agentic-loop/SKILL.md`가 artifact 종류별 Skill을 연결하고, `issue-creation`, `pr-proposal`, `pr-creation` 등이 변경 금지를 명시한다. Skill 호출과 결과 연결은 이 checkout의 실행 source에서 확인되지 않는다. |
| 사용자 결정 | 현재 action의 `user_decision_options`가 비어 있지 않으면 결정을 기다린다. 사용자는 허용된 선택 입력으로 선택을 확정하고, 값이 불완전하면 완료 fact를 만들지 않는다. | Definition에 선택지와 completion predicate가 있다. Codex 오케스트레이션이 사용자 입력을 fact로 정규화하는 역할을 맡는다는 전제를 적용한다. 이번 정적 조사에서는 실제 Workflow 입력을 만들지 않았다. |
| 작업·요청 계산 | `evaluateWorkflowDefinition`의 단일 action, `executor_reference`, completion predicate, 확정 선택·기준 snapshot·연결 대상·승인 계획으로 작업 범위를 계산한다. | `SKILL.md`가 evaluator 출력을 작업 입력으로 쓰고, `structured-execution-contract.md`가 요청 필드를 선언한다. 요청 구성은 이 환경에서 Codex 오케스트레이션 책임으로 본다. 이번 조사 중 요청을 만들거나 실행하지 않았다. |
| 실제 부수 효과 | 확정된 단일 작업만 선택된 실행 주체가 수행한다. 실행 주체는 요청값·범위·기준선을 바꾸지 않는다. | GitHub 단순 상태 변경은 `github-simple-executor`, 파일 변경은 `workflow-code-editor`와 경로 계약에 연결된다. GitHub Agentic Loop는 변경 작업을 산출하고, 현재 대상 저장소에 Harness가 있는지 확인해 실행 경로에 연결하는 것은 Codex 오케스트레이션 책임이라는 사용자 전제를 적용한다. 이번에는 호출하지 않았다. |
| 실행 후 검증·전이 | 결과와 요청을 상관하고 범위·검증·사후조건을 확인한다. 성공일 때 새 상태를 관측하고 같은 `task_action_id`를 재평가한다. | 계약과 orchestration Skill에 규칙이 있다. `composition-runtime.mjs`는 read-only observation 결과를 검증하고 evaluator를 호출한다. 이 함수 자체는 mutation result를 검사하지 않으며, 이 환경에서는 Codex 오케스트레이션이 결과 확인과 다음 전이를 책임진다고 본다. 이번 실행으로 그 동작을 검증하지 않았다. |

**[분석 판단]** 책임 설계는 제안 → 사용자 결정 → 확정 요청 → 실행 주체 → 결과 상관·사후조건 → 재관측·재평가로 분리되어 있다. 저장소에 실제 host 호출 구현이 보이지 않는다는 사실은 이 경계의 실패를 뜻하지 않는다. 이 작업 환경에서는 Codex가 Workflow 사이 전이, 요청 구성, 실행 조율, 결과 확인과 다음 재평가를 맡는 오케스트레이터라는 사용자 전제를 적용한다. 이번 Day 5 조사는 정적 읽기만 했으므로 그 책임 수행을 runtime에서 확인한 것은 아니다.

### 후속 대화에서 기록한 오케스트레이션 전제와 PR Skill 명칭 의견

- **[사용자 전제]** 이 작업 환경에서 Codex가 오케스트레이션 책임을 가진다. Definition 평가 결과와 사용자 결정, 이전 단계 결과를 다음 작업 입력으로 연결하고, 확정된 요청을 구성·실행 경로에 전달하며, 실행 결과를 상관·확인한 뒤 Workflow를 재관측·재평가한다. 저장소에서 외부 host caller를 찾지 못한 것은 예상 가능한 경계이며 그 자체로 저장소 결함이나 미해결 책임으로 분류하지 않는다.
- **[사용자 전제]** GitHub Agentic Loop는 필요한 변경 작업과 범위를 정하지만 Harness를 직접 호출하거나 Harness가 있다고 가정하지 않는다. 대상 저장소와 현재 실행 환경에 Harness가 있을 수도 없을 수도 있으므로, 이를 확인해 Harness 또는 허용된 일반 코드 변경 경로에 연결하는 일은 오케스트레이션 책임이다. 이 전제는 Workflow 정의의 저장소 독립성을 보존한다.
- **[사용자 결정]** `FI-34`에서 병합을 질문받고 `merge_deferred`를 선택하면 해당 작업은 그 상태로 멈춘다. `FI-35`로 자동 전이하거나 병합을 실행하지 않으며, 취소나 terminal 완료로 간주하지 않는다. 재개는 별도의 사용자 요청이 있을 때 다룬다.
- **[현재 source와 분석]** `pr-proposal`은 구현·검증 근거를 바탕으로 PR 제목과 본문 내용을 작성하는 비변경 Skill이다. `pr-creation`은 제목·본문·base branch·원격 head branch 등 PR 생성 입력을 검증·정리하는 비변경 Skill이다. 현재 `FI-10`에서 사용자가 PR 초안을 확인하고 생성 요청을 확정한 뒤 `FI-12`로 진행하며, 실제 PR 생성 요청의 실행과 `pull_request_created` 사후조건 관측은 Codex 오케스트레이션 책임으로 해석한다.
- **[사용자 제안, 미반영]** `pr-creation`의 이름을 `pr-request`로 바꾸고 설명에서 “초안을 제안한다”는 표현을 제거하는 것이 적절하다는 의견을 기록한다. 설명 후보는 “PR 생성에 필요한 제목, 본문, base branch, 원격 head branch, 연관 이슈를 검증하고 요청값을 반환합니다.”이다. 이는 Skill·Definition을 바꾸라는 Day 5 지시가 아니며, 실제 GitHub 생성은 별도의 부수 효과 책임으로 남는다.
- 이 기록은 보고서 해석과 후속 검토 후보만 갱신한다. Skill, Definition, contract, adapter, 설정, fixture/test source는 수정하지 않았고 테스트나 Workflow를 실행하지 않았다.

## 두 실행 사례의 입력 → 결정 → 요청 → 결과 → 사후조건

다음 값은 계약과 Definition이 정한 기대 흐름이다. 예시의 `request_id`, baseline, session, GitHub 결과를 실제 발급·관측 값으로 읽으면 안 된다.

| 사례 / 단계 | 입력과 Definition | 결정·artifact | 요청과 실행 주체 | 결과와 사후조건 |
| --- | --- | --- | --- | --- |
| **A. 기능제안 이슈 초안 — `FP-1`** | 신규 기능제안 입력에서 `feature_proposal_requested=true`; entry action은 `FP-1`이다. (`definitions/feature-proposal.json:3,33-60`) | `issue-creation`은 이슈 유형·제목·label·본문 초안 및 보류 질문을 낸다. 이 Skill은 이슈를 만들거나 유형·결정을 확정하지 않는다. Definition 선택지는 `confirm_draft` / `revise_draft`, 완료 조건은 `feature_proposal_draft_confirmed=true`다. (`issue-creation/SKILL.md:8,24-47`; `artifact-output-contract.md:21-25`) | 아직 durable mutation 요청이 아니다. 유효한 사용자 선택 전에는 `FP-1`을 완료로 넘기지 않는다. 결정 입력은 `user_input` fact가 되어야 한다. | 미확정·잘못된 입력이면 사용자 결정을 기다린다. 산출물 기준 미충족이면 사용 가능 artifact로 승격하지 않는다. 실제 실행은 하지 않았으며, Codex 오케스트레이션이 사용자에게 제시·입력 수집·fact 정규화를 맡는다고 본다. |
| **A. 이슈 생성 — `FP-2`** | `FP-1`의 draft confirmation이 참이어야 action 조건을 충족한다. `user_decision_options=[]`; 완료 predicate는 `feature_proposal_issue_created=true`, `executor_reference=github-simple-executor`다. (`definitions/feature-proposal.json:63-81`) | 앞선 결정으로 확정된 이슈 유형·본문 값이 실행 범위를 정한다. `issue-creation`은 실제 요청값을 검토용으로 정리하고, Workflow Engine이 확정한 구조화 요청만 선택된 주체가 실행한다. | 계약상 요청에는 단일 대상 작업, 고정된 `request_id`, `target_baseline`, confirmed values, 전제·사후조건·검증 기준, 예정 실행 주체와 세션 관계가 필요하다. GitHub 상태 mutation은 권한 확인 경로이며 실제 호출 직전 재판정한다. (`structured-execution-contract.md:95-111`; `command-execution-path-contract.md`) | 실행 결과의 `request_id`와 baseline·실행 주체·세션·scope를 원 요청과 대조한다. 성공은 요청/결과 상관, 범위 준수, 모든 사후조건과 검증 기준이 충족된 경우뿐이다. Definition의 `feature_proposal_issue_created=true`는 새 GitHub 상태 재관측이 뒷받침해야 한다. 이번에는 요청 생성·GitHub 실행·재관측을 하지 않았다. |
| **B. 구현 계획 artifact와 승인 — `FC-3`** | 기능변경 이슈가 생성된 상태에서 `FC-3`, executor `feature-plan`. 선택지는 `confirm_feature_plan` / `revise_feature_plan`; 완료 predicate는 `feature_plan_proposal_usable=true`와 `feature_plan_confirmed=true` 모두다. (`definitions/feature-change.json:171-207`) | 산출물 계약은 작업 단위, `실행 그룹`, `실행 그룹 순서`, 선행조건·검증 기준과 보류 질문을 요구한다. plan Skill은 계획만 제안하고 승인·실행을 대신하지 않는다. (`artifact-output-contract.md:47-63`; `structured-execution-contract.md:10`) | 유효한 사용자 결정이 오기 전 `FC-3`는 완료되지 않는다. 승인 계획은 실행 단위·순서·범위를 고정한다. 계약은 이 계획 승인이 포함된 구현의 시작 권한도 제공하므로 각 구현 시작에 별도 승인을 요구하지 않는다. | `feature_plan_confirmed`는 사용자의 결정, `feature_plan_proposal_usable`은 Skill 산출물 provenance다. 이번에는 Skill 호출이나 사용자 결정 입력을 실행하지 않았다. |
| **B. 승인 계획 반영 — `FC-4`** | 선행 조건은 usable+confirmed 계획이며, executor `github-simple-executor`, 선택지는 없다. 완료 predicate는 `feature_plan_reflected=true`. (`definitions/feature-change.json:210-237`) | 결정된 계획을 원본 Issue에 반영하는 단일 GitHub 상태 변경으로 정의된다. | 실행 scope는 승인한 계획·원본 Issue에 한정된다. 일반 구조화 요청, command 권한 경로, 호출 직전 재판정이 필요하다. | `feature_plan_reflected=true`가 GitHub observation으로 확인된 뒤 `FC-5`로 간다. 실행 성공만으로 완료를 추정하지 않는다. |
| **B. 파일 변경 — `FI-5`** | 공통 `implementation`에서 `implementation_plan_reflected=true`와 허용된 `implementation_work_unit_phase`가 필요하다. `FI-5`의 `user_decision_options=[]`, executor `workflow-code-editor`; 완료 predicate는 phase가 `file_changes_verified`, `commit_message_confirmed`, `commit_created`, `all_work_units_completed` 중 하나다. (`definitions/implementation.json:329-368`) | parent plan과 해당 implementation unit이 target 파일·수정 범위·검증 기준을 제한한다. 작업 시작 때 별도 인간 승인을 추가하지 않는다. parent/child Workflow 전이와 현재 대상 환경의 실행 경로 연결은 Codex 오케스트레이션 책임으로 본다. | 오케스트레이션은 대상 저장소의 Harness 가용성을 확인한 뒤 실행 전에 `target_harness` 또는 계약상 허용된 `general_code_change` 중 하나로 확정한다. GitHub Agentic Loop 자체는 Harness를 호출하지 않는다. 요청의 `target_ids_or_files`, 확정값, baseline, 권한·도구·명령 경로는 유지한다. | 실행 결과는 `changed_files`, 실제 실행 식별자/session, verification, postcondition, 위험을 포함해야 한다. 요청과 baseline·session·실행 범위를 대조하고 phase가 요구값으로 바뀐 사실을 재관측한 뒤에만 `FI-5`를 완료할 수 있다. 실제 편집이나 결과 생성은 수행하지 않았다. |

**사례 비교:** A에서는 검토용 artifact가 사용자 결정에 앞서 필요하고, 결정 자체가 다음 GitHub mutation action `FP-2`의 전제다. B에서는 승인된 계획이 뒤의 GitHub 반영과 파일 변경 범위를 고정한다. 두 경로 모두 Definition의 task/fact가 실행 후 증거를 대신하지 않는다. 상위 계획에서 자식 `implementation`을 실제 시작하고 완료를 부모에 반영하는 연결은 이 저장소 helper에 구현돼 있지 않으며, 이 환경에서는 Codex 오케스트레이션이 그 전이를 맡는다고 본다. 이번 조사에서는 자식 Workflow를 시작하지 않았다.

## Definition 값과 실행 요청·결과의 연결

### `user_decision_options`와 completion

- **[계약]** 현재 작업에 결정을 기다려야 하는지는 현재 action의 `user_decision_options`가 비어 있는지로 판정한다. 값이 있으면 자동 실행 루프는 멈춘다. 유효 입력은 선택 번호·문구 또는 필수 식별값을 포함한 선택, 허용된 기타 의견이다. 필수값이 빠지거나 모호하면 같은 결정 단계에서 빠진 값만 다시 요청하고, 확정 전 completion fact를 만들지 않는다. (`structured-execution-contract.md:7-10,31-44`; `user-decision-contract.md:5-29`)
- **[현재 source]** Definition은 선택지, 정규 fact 조건, `completion_predicate`, `executor_reference`, 다음 transition을 같은 action에 선언한다. Evaluator는 이를 읽어 단일 action 또는 `completed`/`stopped`를 반환하고 외부 상태를 변경하지 않는다. (`evaluator.mjs:79-132`; `workflow-definition-contract.md`)
- **[현재 source]** orchestration Skill은 `action_required`에서 반환된 `task_action_id`, `user_decision_options`, `executor_reference`, `completion_predicate`를 실행 입력으로 사용하고, 사용자 선택을 다음 observation 묶음의 `user_input`으로 정규화한다고 선언한다. executor 후보는 사용자 결정이 모두 반영된 작업에 한한다. (`github-agentic-loop/SKILL.md:106-131,171-181,205-226`)
- **[저장소 범위 / 사용자 전제]** Codex 오케스트레이션이 artifact Skill을 호출하고 결과를 fact/provenance에 반영하며 사용자 입력을 `user_input`으로 정규화하는 책임을 맡는다고 본다. 그 호출 코드는 저장소 source에서 확인되지 않지만, 저장소 밖 오케스트레이션 경계이므로 결함으로 분류하지 않는다. 이번에는 동일 Definition action의 artifact 생성·제시·대기 순서를 실행하지 않아 runtime 관측은 없다.

### `executor_reference`와 구조화 실행 요청

- **[계약]** `executor_reference`는 실행 주체 자체의 실제 호출 결과가 아니다. 사용자 결정, 기준 snapshot과 허용 계획을 포함해 확정된 범위를 만들고, 실행 주체는 그 값을 변경하지 않는다. 파일이 아닌 단일 단순 상태 변경은 적절한 결정론적 경로 또는 `github-simple-executor`; 파일 수정은 file-change 계약에 따라 `workflow-code-editor`에 연결한다. (`structured-execution-contract.md:5-10,164-177`; `github-agentic-loop/SKILL.md:183-226`)
- **[계약]** 실행 가능 요청에는 `request_id`, `base_issue_or_pr`, `work_target_id`, `work_type`, `target_ids_or_files`, 불변 `confirmed_request_values`, `target_baseline`, `preconditions`, `expected_postconditions`, `verification_criteria`, 실행 경로·권한·사용 가능 도구·예정 executor와 session 관계가 필요하다. 필드 누락·불일치는 실행 전 중단 조건이다. (`structured-execution-contract.md:95-111`)
- **[현재 source]** `runWorkflowObservationCycle`은 `request`, `definition`, `currentTaskActionId`, GitHub 및 log observation callback을 입력으로 받는다. 반환된 observation result의 `request_id`와 `target_baseline`을 요청과 일치시키고 provenance/read-only 필드를 검사한 뒤 adapter와 evaluator를 호출한다. 이 함수는 GitHub나 log를 직접 읽지 않고, 실행 executor를 호출하거나 mutation result를 검증하지 않는다. (`composition-runtime.mjs:83-190,360-471`; `state-observation-contract.md:99-149`)
- **[현재 source / 사용자 전제]** `runWorkflowObservationCycle`의 caller는 `request_id`와 요청을 입력으로 제공해야 하며, 이 환경에서는 Codex 오케스트레이션이 ID·구조화 실행 요청을 구성하고 실행 결과를 계약과 대조할 책임이 있다. 해당 caller가 저장소에 없다는 것은 책임 누락의 증거가 아니다. 다만 이번 정적 조사에서는 실제 ID/요청/결과를 생성하지 않았으므로 runtime 보장을 확인하지 않았다. 계약에 선언된 atomic active-slot claim의 저장소 내 helper는 찾지 못했으며, Phase 2 Summary가 기록한 수용·보류 범위와 구분한다.

### 상관관계 식별자와 완료 판정

| 값 | 계약상 역할 | checkout에서 확인한 producer / 검사 |
| --- | --- | --- |
| `request_id` | 원 요청 선택의 유일한 키. 같은 ID는 불변 요청 하나를 가리키며 다른 필드로 대체하지 않는다. 순차 재전송은 이전 시도의 최종 성공/중단 뒤에만 가능하다. | composition runtime은 caller가 전달한 ID를 source callback에 넘기고 source 결과의 일치 여부를 검사한다. 이 환경에서는 Codex 오케스트레이션이 요청 ID를 만들 책임이 있다고 본다. 계약의 atomic active-slot claim은 Phase 2 Summary도 저장소 내 helper를 찾지 못한 수용·보류 범위로 기록했다. |
| `task_action_id` | Definition 내부 현재 action. 같은 루프의 재평가에는 evaluator가 돌려준 ID를 전달한다. 중단 후 재개는 저장 ID가 아니라 entry action부터 최신 상태로 다시 평가한다. | evaluator와 `runWorkflowObservationCycle` 입력/출력에서 확인된다. `request_id`와 별도의 값이며 서로 대체하지 않는다. |
| `target_baseline` | 실행 대상의 commit SHA 또는 동등한 식별자. 요청 생성 후 결과에서 같은 값인지 대조한다. 달라지면 새 관측·새 요청이 필요하다. | composition runtime은 observation callback 결과와 baseline을 deep equality로 대조한다. 이 환경에서는 Codex 오케스트레이션이 mutation 요청에도 baseline을 고정하고 결과와 비교할 책임이 있다고 본다. 실제 실행·비교는 이번에 관측하지 않았다. |
| 실행 session 식별 정보 | 예정·실제 executor, orchestration/session 관계를 구분한다. `same_session`이면 동일 ID, `separate_execution_session`이면 다른 ID이며 발급받은 session cleanup은 owner가 담당한다. | `workflow-code-editor`와 `github-simple-executor` Skill/contract가 요청·결과 필드를 요구한다. `agent-lifecycle-contract.md`는 실제 ID 발급 owner와 `close_agent` 정리를 선언한다. 이번에는 실행 session을 발급하지 않았으므로 실제 session 생성·상관은 관측하지 않았다. |
| 결과·완료 fact | 결과는 실제 행동·변경·검증을 기록하며 요청 범위와 비교한다. 모든 expected postcondition과 verification criterion이 충족되어야 실행 성공이다. 이후 fresh state observation에서 Definition의 completion predicate를 판단한다. | `structured-execution-contract.md`가 규칙을 선언한다. `composition-runtime.mjs`가 검사하는 것은 observation provider 결과이지 file/GitHub mutation의 structured result가 아니다. 이 환경에서는 Codex 오케스트레이션이 mutation result를 확인하고 재관측·재평가를 수행할 책임이 있다고 본다. 이번에 실행하지 않았으므로 실제 결과 검증은 관측하지 않았다. |

### 실행 경로와 사전조건

- **GitHub 상태 변경:** `command-execution-path-contract.md`는 Issue·PR·review·comment 변경 명령을 권한 확인 경로로 분류한다. 요청 생성 시 path와 permission/tool 조건을 기록하고 실제 명령 직전에 같은 경로인지, 권한·도구·변경 손실 조건이 맞는지 다시 확인한다. 불일치 또는 확인 불가면 명령 없이 중단한다.
- **파일 변경:** `file-change-execution-contract.md`는 baseline과 repository instructions를 확인한 뒤 Harness 준비도와 session cleanup capability를 실행 전에 판정하도록 한다. 이 환경별 확인과 Workflow 작업을 적절한 경로에 연결하는 책임은 Codex 오케스트레이션에 있다. 준비되어 있으면 `target_harness`, 실행 전에 준비되지 않았으면 계약상 조건을 충족하는 경우 `general_code_change` 하나를 선택 경로·근거·예정 session 관계에 반영한다. GitHub Agentic Loop는 Harness를 직접 호출하지 않는다.
- **실행 후 경로:** `workflow-code-editor/SKILL.md`는 경로별 결과를 공통 구조화 결과로 정규화하고 원 요청과 상관·범위·사후조건을 검사하도록 요구한다. Harness에는 Workflow 전용 필드가 아닌 `work_summary`, `target_files`, `target_baseline`, `change_constraints`, `verification_criteria`, repository instructions만 전달한다. (`target-harness-execution-contract.md:22-46`)
- **계약된 fallback:** Harness 미설치·준비도 실패·필요 `close_agent` 미노출이 파일 변경 시작 전에 확인되면 일반 경로로 갈 수 있다. 한번 선택 경로가 시작된 뒤 timeout·실패·부분 변경 가능성이 생기면 다른 경로로 fallback하거나 같은 변경을 재시도하지 않고, 실제 변경 여부·복구 조건을 기록해 중단한다. (`file-change-execution-contract.md:7-17,48-55`; `workflow-code-editor/SKILL.md:33-48,137-143`)
- **[실제 동작 검증 여부]** 이 선택 및 fallback source를 읽었을 뿐 Harness/일반 경로를 실행하지 않았다. 따라서 Codex 오케스트레이션이 실제로 한 경로만 선택·유지하는지 검증했다고 표현하지 않는다.

## 실패·도구 부재·결과 불일치의 중단과 재개

| 상황 | 계약상 정지·재개 규칙 | 현재 source에서의 연결 상태 |
| --- | --- | --- |
| 결정 미입력·형식 오류·필수 식별자 누락 | 사용자 결정 대기. 누락값만 같은 단계에서 요청하고 completion fact를 만들지 않는다. | Definition·결정 계약·Skill에 선언됨. 이번에는 입력 수집·정규화하지 않음. |
| 관측 provider 없음/오류, request/baseline/source correlation 오류 | `runWorkflowObservationCycle`은 평가 전에 `stopped`로 반환한다. 새 관측·원인 보완 전에는 사실을 추측하지 않는다. | observation helper의 source가 callback 누락·실패와 상관 오류를 차단함. 실제 provider 연결은 이번에 실행하지 않음. |
| 실행 주체·permission·tool 없음 또는 사전조건 불충족 | 실행하지 않고 구조화 실행 중단. 누락 입력, baseline, 사용자 결정, 권한·도구를 보완할 재개 조건을 기록한다. | contracts/Skills에 선언됨. 이번에 도구 사전조건을 판정하거나 실행 결과를 받지 않음. |
| baseline·확정 범위·요청과 결과 불일치 | 결과를 원 요청 대신 쓰지 않고 중단한다. baseline이 달라졌으면 다시 관측하고 바뀐 요청 내용은 새 `request_id`를 사용한다. | 계약에 선언됨. Composition runtime은 source observation의 요청/baseline을 검사하지만 mutation result는 이번에 생성·검사하지 않음. |
| Harness 경로 실행 시작 뒤 실패·timeout·부분 변경 | 일반 코드 변경 경로로 fallback 금지. 실제 변경·복구 조건을 보존하고 중단한다. 실행 전 Harness 준비 실패와 혼동하지 않는다. | file-change contract와 editor Skill에 선언됨; 해당 경로를 실행하지 않았다. |
| postcondition 또는 verification 실패 | 구조화 실행 성공이 아니다. 결과와 실패 근거를 보존해 중단한다. 성공하지 않은 상태에서 다음 전이로 진행하지 않는다. | 계약에 선언됨. 이번에 결과를 생성하거나 판정하지 않음. |
| 중단 후 재개 | GitHub 실행 상태·현재 코드 상태를 다시 읽고 선택 Definition adapter로 정규화한 뒤 entry action부터 재평가한다. 이전 action ID와 log는 보조 근거다. 로그와 GitHub가 충돌하면 GitHub 상태 우선이다. 재개 입력이 있으면 user-decision contract를 적용한다. | orchestration Skill, structured contract, composition observation code에 선언·구현됨. 이번에는 재개를 실행하지 않음. |
| ID cleanup 불가 | 새 session ID를 발급하기 전에 callable `close_agent`가 있는지 확인한다. 생성 owner는 결과를 보존한 뒤 자기 ID를 정리한다. cleanup 실패는 결과의 risk/failure로 남기고 성공으로 판정하지 않는다. | lifecycle contract/editor Skill에 선언됨. 이번에는 session이나 cleanup capability를 실행하지 않음. |

**완료 조건의 범위:** 구조화 실행 성공은 (1) 요청 사용 가능, (2) 결과 사용 가능 및 정확한 요청 상관, (3) 실행 범위 준수, (4) 모든 `expected_postconditions`, (5) 모든 `verification_criteria` 성공의 교집합이다. 그 뒤에도 Workflow 완료는 GitHub/local/user fact를 새로 관측·정규화하고 `completion_predicate`를 만족해야 한다. executor가 `completed` fact를 임의로 선언하는 것으로 대체되지 않는다.

## 계약과 저장소 source 연결, 오케스트레이션 책임 비교

| 계약 / 선언 | 현재 repository source에서 확인 | Codex 오케스트레이션 전제와 이번 관측 한계 |
| --- | --- | --- |
| `user_decision_options`가 있으면 대기; 유효 입력만 사용자 결정 fact | `definitions/*.json`, `user-decision-contract.md`, orchestration `SKILL.md`, evaluator | Codex 오케스트레이션이 이 입력 전이를 맡는다는 작업 전제. 이번에는 실제 사용자 입력을 fact로 변환하지 않음 |
| `executor_reference`를 artifact/execution 경로에 연결 | orchestration Skill의 전용 Skill 매핑, definition field, `github-simple-executor`·`workflow-code-editor` Skill | Codex 오케스트레이션이 dispatcher·구조화 요청 구성을 맡는다는 작업 전제. 저장소에는 실제 호출 source가 없으며 이번에 실행하지 않음 |
| read-only GitHub/log observation correlation | `runWorkflowObservationCycle`가 caller 제공 callbacks의 request/baseline, provenance, read-only 사후조건을 검사하고 adapter/evaluator를 실행 | callback은 caller가 공급해야 함. 실제 provider 연결은 이번 static-only 조사에서 호출·관측하지 않음 |
| mutation result correlation·postcondition | structured/file-change contract 및 editor/simple executor Skill이 필드와 판정 규칙을 선언 | Codex 오케스트레이션이 결과 비교와 다음 observation을 맡는다는 작업 전제. 이번에 mutation 결과를 만들거나 검사하지 않음 |
| 실행 session 발급·소유·cleanup | editor/simple executor/lifecycle 계약이 예정·실제 ID와 ownership/close 조건을 선언 | 실제 session 발급·cleanup은 실행 시 Codex와 선택된 경로의 책임. 이번에는 session을 발급하지 않음 |
| 실행 후 successor/parent handoff | composition runtime은 승인된 조건에서 handoff 또는 group 후보를 반환하고 side effect가 없다고 명시 | 반환값을 받아 Workflow 전이를 수행하는 책임은 이 환경의 Codex 오케스트레이션에 있음. 이번에는 handoff를 실행하지 않음 |

따라서 현재 repository source가 직접 보여주는 연결은 **provider가 이미 주어진 경우의 observation correlation → adapter → evaluator → handoff 산출**이다. 외부 GitHub 조회, 실행 주체 호출, 파일 변경, structured mutation result 검사, child Workflow dispatch 코드는 이 checkout에 포함되지 않는다. 이는 Codex 오케스트레이션의 책임을 부정하거나 저장소 결함으로 판단할 근거가 아니다. 다만 이번 조사에서는 실제 Workflow·외부 상태 변경을 실행하지 않았으므로 계약 준수나 runtime 결과를 검증했다고 말할 수 없다.

## 분석 결론과 후속 후보 분류

### 정적 분석 결론

- **FI-12는 Codex 오케스트레이션이 완성하는 복합 단계다.** Definition의 `executor_reference="pr-creation"`은 생성 입력의 검증·정리 Skill을 가리키고, `FI-10`에서 확정된 사용자 결정이 PR 생성 요청의 범위를 고정한다. `pr-creation`은 그 입력을 검증해 요청값을 반환하며 PR 자체를 생성하지 않는다. 이 환경에서는 Codex가 그 확정 요청을 GitHub 부수 효과로 실행하고 `pull_request_created`를 다시 관측해 완료를 판정한다고 해석한다. (`definitions/implementation.json:602-619`; `pr-creation/SKILL.md:8,23-55`; `artifact-output-contract.md:85-90`)
- **[판단 한계]** 저장소 안에 별도 actual-create action이나 외부 오케스트레이션 호출부가 없다는 점을 Definition/Skill 불일치 또는 미해결 책임으로 보지 않는다. 다만 이 보고서는 static-only이며 FI-12 실행, PR 생성, 사후조건 관측을 하지 않았으므로 이 경로의 실제 동작을 확인한 것은 아니다. 이 경계를 새 실행 wrapper나 승인 단계의 제안으로 확장하지 않는다.
- **확인된 runtime 결함:** 이번 정적 조사에서는 재현 가능한 runtime 실패를 확인하지 않았다. Workflow 및 외부 실행을 하지 않았으므로 이 문구는 runtime 정상 동작을 뜻하지 않는다.

### 정책 검토 후보

- Day 5 source만으로 새 승인 단계·권한 체계·위험별 승인 정책이 필요하다는 incident나 gap은 확인되지 않았다. 현재 결정 계약과 계획 승인 범위를 그대로 조사 대상으로 삼는다.
- Phase 8은 승인·권한·위험 분류를 정책 수준에서 검토하는 별도 단계다. Day 5의 contract 경계 결과를 새로운 승인 정책으로 승격하지 않는다.

### 기능 제안 후보

- **[사용자 지시] 기능제안 #139**는 문서 책임 경계에 대한 미확정 제안으로만 유지한다. Day 5의 정책·구현 지시로 사용하지 않는다. 필요하면 Phase 3 종합 또는 Phase 4 후속 후보로 넘긴다. 이번 작업은 GitHub Issue 상태를 조회하거나 바꾸지 않았다.
- **[Day 6 종료 후 예약된 변경]** `pr-creation`을 `pr-request`로 이름 변경하고 Skill 설명에서 “초안을 제안한다”는 문구를 제거한다. Day 6 분석 범위에는 넣지 않고, Day 6 보고서 완료 직후 별도의 좁은 변경 작업으로 시작한다. 실행 시 Skill 참조·호출명·관련 검사와 배포 산출물까지 함께 정렬한다. 이 보고서에서는 Skill이나 호출부를 변경하지 않았다.
- 새로운 실행 wrapper, approval system, executor registry, 영속 request registry를 기능 제안으로 만들 근거는 이번 조사에서 확인하지 않았다.

### 보류 후보

- **runtime 관측 미수행:** 이 checkout에서 Codex 오케스트레이션의 외부 호출 코드를 찾지 못한 것은 예상된 경계다. 실제 ID·baseline 생성, GitHub/file 실행, 결과 상관, session 발급·cleanup, handoff가 계약대로 수행되는지는 이 정적 조사에서 관측하지 않았다. 실행 사실이나 실패로 추정하지 않는다.
- **동일 `request_id` atomic active-slot claim:** contract에는 원자적 선점이 선언돼 있으나 저장소 내 실행 helper를 찾지 못했다. Phase 2 Summary는 이를 구현 증거와 분리해 수용·보류한 저가능성 위험으로 기록했고 실제 동시 충돌도 보고하지 않았다. 사용자 범위를 따라 여기서 다시 열거나 구현하지 않는다.
- **`FI-12` 실제 PR 생성과 사후관측:** Codex가 확정 요청을 실제로 실행하고 `pull_request_created`를 재관측하는 시나리오는 Day 6 재개·취소 검토에 남긴다. 이번 보고서는 경계 해석만 수정했고 runtime 검증은 하지 않았다.

## Fixture/test source가 보호하는 불변 조건

| Fixture/test source | 읽은 assertion의 목적 | 이번 실행 범위와 한계 |
| --- | --- | --- |
| `tests/workflow-definition/feature-proposal.test.mjs`, `fixtures/feature-proposal-states.json` | `FP-1`부터 draft confirm, `FP-2` 이슈 생성, `FP-3` 방향 결정, 방향별 close/terminal action을 분리한다. adapter의 user/GitHub source kind, duplicate/malformed observation 거부와 입력 불변성도 대상으로 한다. | source만 읽었다. Issue creation, 사용자 입력 해석, live GitHub 상태를 검증하지 않았다. |
| `tests/workflow-definition/implementation.test.mjs`, `fixtures/implementation-states.json` | user-confirmed 계획·PR draft fact, `FI-5` work phase, `FI-10` draft confirmation과 creation request, `FI-12` `pull_request_created` completion을 synthetic 상태로 연결한다. evaluator 입력 불변과 action 선택을 assertion한다. | source만 읽었다. plan 전달, PR 생성 또는 file edit 실행은 검증하지 않았다. |
| `tests/workflow-definition/workflow-composition-observations.test.mjs` | mock provider 결과의 request/baseline correlation, source mismatch·read-only/postcondition 실패 시 evaluator 전에 stop, GitHub/log 우선순위, handoff 계산을 보호한다. | mock callback만 사용하도록 작성됐다. 실제 API, 로그 reader, host binding, executor, 실제 session 발급/dispatch의 증거가 아니다. 실행하지 않았다. |
| `tests/skill-quality/reference-boundary-contract.test.mjs`, `skill-structure-contract.test.mjs` | Skill·reference의 문구상 경계, 정해진 필드와 계약 연결을 텍스트 수준에서 보호한다. | test source를 읽기만 했다. assertion 결과나 문구와 host runtime의 일치를 보장하지 않는다. |

**실행 여부:** 모든 테스트와 fixture runner는 실행하지 않았다. 통과·실패 수를 보고하지 않는다. 현재 작업의 정적 분석이며, fixture의 입력과 assertion은 synthetic이다.

## Day 6 재개·취소 검토를 위해 남길 시나리오와 질문

| 시나리오 | 다음 Day에서 추적할 사실·질문 |
| --- | --- |
| artifact가 usable하지만 사용자가 아직 선택하지 않음; revise 또는 잘못된 입력 | 새 user fact 없이 action이 계속 대기하는가? 수정된 artifact와 이전 선택·요청이 어떻게 분리되는가? 필요한 식별값이 빠졌을 때 completion fact가 생기지 않는가? |
| plan 승인 후 Codex 오케스트레이션이 파일 변경 경로를 연결하려는 시점에 대상 저장소에 Harness가 있거나 없음 | GitHub Agentic Loop는 변경 작업만 산출하고, 오케스트레이션이 대상 환경에 맞춰 `target_harness` 또는 허용된 일반 경로를 선택하는가? Harness/권한·도구/baseline 조건이 불충족이면 변경 시작 전에 멈추는가? |
| 파일 변경이 시작된 뒤 timeout/실패 또는 변경 상태를 알 수 없음 | fallback 없이 변경 여부를 어떻게 보존하는가? 재개 전에 Git 상태를 새로 관측하고, 새 baseline/범위가 필요하면 새 `request_id`로 고정하는가? |
| side effect는 일어난 것처럼 보이나 결과의 `request_id`, baseline, session, `changed_files` 또는 postcondition이 불일치 | 원 결과를 성공 사실로 채택하지 않고 stop하는가? 재관측 후 이전 요청을 순차 재전송할 수 있는 조건과 새 요청이 필요한 조건은 무엇인가? |
| 외부 provider 또는 실행 주체가 없거나 callback/tool 결과가 실패 | stop reason과 보완 조건이 어떻게 남는가? fallback이 허용되는 파일 변경 preflight 실패와 실행 시작 후 실패가 분리되는가? |
| 병합 보류와 취소·재개 | `FI-34`는 `merge_confirmed`/`merge_deferred`를 사용자 입력 fact로 받지만 completion은 `merge_confirmed`만 요구한다. Definition과 fixture/test source는 `merge_deferred`이면 `FI-34`가 `action_required`로 남는 기대를 표현하며, 사용자는 보류 선택 시 작업을 그대로 멈추기로 결정했다. 따라서 자동 전이·병합·terminal 완료는 없다. Day 6에서는 명시적으로 재개 요청이 왔을 때 같은 단계의 결정을 어떻게 다시 수집할지, 취소를 별도 상태로 표현할 필요가 있는지 검토한다. fixture는 읽기만 했고 테스트를 실행하지 않았다. 새 전역 취소 정책을 만들지 말고 source 경계를 우선 조사한다. |

동시 `request_id` 경쟁은 Phase 2에서 수용·보류된 범위다. Day 6에서 새 동시성 실험이나 registry 제안을 하지 않고 그 결정을 유지한다.

## Day 5 완료 조건 체크리스트

### Day 6 종료 후 이어갈 작업 (완료)

- [x] Day 6 보고서를 마친 뒤 별도 변경 작업으로 `pr-creation` Skill을 `pr-request`로 이름 변경하고, 설명에서 초안 제안 표현을 제거했다.
- [x] GitHub Agentic Loop의 연결 지점, 다른 참조, 관련 검사, 설치·제거 동작과 배포 문서를 정렬했다. PR 생성 부수 효과의 소유권을 Codex 오케스트레이션에 두는 합의는 유지한다.

- [x] 시작 branch, HEAD, 작업 트리, local `main`, cached `origin/main`, upstream을 기록했다. fetch하지 않았고 원격 최신 여부를 미확인으로 표시했다.
- [x] 사용자 결정, artifact 제안, 실행, 결과 검증의 계약상 책임과 checkout source 연결을 분리했다.
- [x] 초안 후 사용자 결정을 기다리는 `FP-1`과 결정 완료 후 GitHub mutation인 `FP-2`를 연결했다.
- [x] 승인 계획 `FC-3`/`FC-4`와 파일 변경 `FI-5` 경로의 scope, baseline, 결과·postcondition 기준을 추적하고 parent/child 전이는 Codex 오케스트레이션 책임이라는 사용자 전제를 기록했다.
- [x] `request_id`, `task_action_id`, `target_baseline`, 실행 session ID의 계약·source 연결을 구분하고 실제 실행을 관측하지 않은 범위를 명시했다.
- [x] 실행 경로 preflight, 사전조건, baseline/result correlation, fallback 금지, 완료 predicate, 실패·도구 부재·결과 불일치의 중단·재개 규칙을 기록했다.
- [x] GitHub Agentic Loop의 변경 작업 산출과 Codex 오케스트레이션의 Harness 가용성 판정·실행 경로 연결 책임을 분리해 기록했다.
- [x] `FI-12`를 `pr-creation`의 요청값 검증과 Codex 오케스트레이션의 PR 생성·사후관측으로 이어지는 복합 단계로 해석하고, 실제 실행은 확인하지 않았음을 기록했다.
- [x] `pr-creation`을 `pr-request`로 이름 변경하고 설명에서 초안 제안 문구를 제거하자는 사용자의 미반영 의견을 기록했다.
- [x] `FI-34`에서 `merge_deferred`를 선택하면 작업을 그대로 멈추고 자동 진행하지 않는다는 사용자 결정을 기록했다. 취소·terminal 완료와 구분했다.
- [x] fixture/test source가 의도한 불변 조건과 실행하지 않은 범위를 기록했다. 테스트, Workflow, GitHub, file mutation은 실행하지 않았다.
- [x] #139는 미확정 기능제안이라는 사용자 지시 범위로만 남겼으며 Day 5 정책·구현 지시로 다루지 않았다.
- [x] Phase 8 정책 승인 검토와 이번 계약/source 검토를 구분했고, 새 승인·권한 체계·실행 wrapper를 제안하지 않았다.
- [x] Day 6 재개·취소 시나리오와 미해결 질문을 남겼다.
