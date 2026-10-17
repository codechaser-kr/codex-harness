# Phase 2 · Day 3 — Discovery and Activation Observation

> 관측일: 2026-09-18
>
> 기준 브랜치/커밋: `docs/repository-evolution-workshop` / `55676473207de53d76a488b4d5db6219b4d237bb`
> 범위: source·설정은 변경하지 않았고, 이 보고서와 disposable observation target만 만들었다.

## 읽는 법과 증거 기준

이 문서는 Phase 1과 Day 2의 결론을 가설로만 사용했다. 현재 checkout의 source, 현재 host의
installed copy, 그리고 실제 `codex exec` 세션 trace를 우선했다. 증거 종류는 다음처럼 표시한다.

| 표기 | 의미 |
| --- | --- |
| **[RF] repository fact** | 현재 저장소의 source, 테스트, versioned 문서에서 직접 확인한 사실 |
| **[HO] host observation** | 이 host의 설치 경로, 노출된 도구, CLI sandbox에서 확인한 사실 |
| **[ARO] actual runtime observation** | 이번 Day 3의 실제 Codex CLI 또는 evaluator 실행 trace에서 확인한 사실 |
| **[HE] historical execution evidence** | Phase 1·Day 2에 기록됐지만 이번 세션에서 재실행하지 않은 사실 |
| **[AJ] analysis judgment** | 위 증거로부터 내린 평가·우선순위. 사실 자체가 아니다 |

`읽었다`는 것은 해당 CLI trace에서 content read 명령이 실행된 것을 뜻한다. 파일 line 수나
CLI가 보고한 input token은 실제 모델 context에 귀속되는 정확한 비용 계측값이 아니다. 특히
세션 공통 prompt·cache·tool output이 섞이므로, 이 보고서는 그것을 **상한 신호**로만 쓴다.

## 오늘의 학습 개념과 조사 순서

### 개념

- **Skill Discovery**: host가 모델에 노출한 skill description과 identifier 중에서 후보를 만드는 단계다.
- **Skill Activation**: 후보가 선택된 뒤 `SKILL.md`와 필요한 reference·실행 artifact를 실제로 읽는 단계다.
- **Progressive Activation**: 상위 계약을 먼저 읽고 현재 task에 필요한 leaf만 뒤늦게 여는 방식이다.
- **Routing Precision**: 현재 identifier·현재 설치 root·task에 맞는 실행 주체를 고르고 legacy나 인접 skill을
  열지 않는 정도다.
- **Context Acquisition Path**: `SKILL.md → reference map/conditional contract → leaf → target state → evaluator`
  같은 실제 read 순서다.
- **Over-activation / Under-activation**: 필요 없는 문서를 대량으로 읽는 것 / 필요한 안전 계약이나
  decision gate를 제때 읽지 못하는 것이다.
- **Operational Observation**: 정적 문서·테스트의 합격이 아니라, 실제 Codex CLI가 선택한 path·명령·중단·
  결과를 남기는 것이다.

### 조사 순서

1. 지정된 execution guide, Phase 2 guide, Phase 1 summary, Day 1·Day 2 보고서를 먼저 전체 읽었다.
2. 현재 source와 `$HOME/.agents/skills`의 18개 managed skill을 directory diff로 비교하고, `$HOME/.codex/skills`의
   legacy 후보는 읽기 전용으로 비교했다.
3. disposable target에서 Harness 최초 실행을 실제 `codex exec`으로 시도했다.
4. 같은 target의 actual artifact를 다시 읽는 Harness 재진입·evaluation-only 관측을 했다.
5. synthetic normalized state를 사용해 `github-agentic-loop`의 단일 next action을 실제 CLI와 current evaluator로
   계산했다.
6. concrete한 이슈 초안 요청으로 `issue-creation` thin skill을 직접 호출해 progressive activation을 관측했다.
7. 마지막으로 tests와 source 계약을 보조 증거로 대조했다. 이는 runtime activation 성공 판정에 사용하지 않았다.

## 현재 discovery surface와 설치 상태

| 구분 | 관측 | 판정 |
| --- | --- | --- |
| Current source | **[RF]** `.codex-dist/skills/github-agentic-loop/`가 `name: github-agentic-loop`와 current Definition·adapter·evaluator·reference를 가진다. Harness source는 `.codex-dist/skills/harness/`다. | source의 canonical identifier는 `github-agentic-loop`이다. |
| Official installed copy | **[HO]** `/home/codechaser/.agents/skills/`에서 Harness와 `github-agentic-loop`를 포함한 installer-managed 18개 directory를 source와 `diff -qr`로 비교했고 출력이 없었다. | 사용자가 재설치한 official copy는 현재 source와 **18/18 parity**다. unrelated global skill은 이 비교 대상이 아니다. |
| Legacy/backup 후보 | **[HO]** `/home/codechaser/.codex/skills/harness/` 및 `/home/codechaser/.codex/skills/github-workflow-engine/`가 존재한다. source와의 read-only diff에는 Harness의 `SKILL.md` 및 4개 reference, workflow-engine의 `SKILL.md`·lifecycle/file-change/state/validation 관련 파일 등의 차이가 보였다. | divergence는 존재하지만, 그것만으로 legacy를 결함으로 단정하지 않는다. 삭제·정리는 하지 않았다. |
| Host의 model-visible discovery | **[ARO]** 네 isolated `codex exec` 세션 모두 시작 시 `Exceeded skills context budget of 2%. All skill descriptions were removed and 43 additional skills were not included ...`를 출력했다. | 이 host에서는 일반적인 description 기반 자동 discovery가 이번 세션들에서 관측 불가였다. 이후의 official skill 선택은 prompt의 명시 path/identifier 도움을 받은 activation이다. |
| 실제 duplicate routing | **[ARO]** Harness 최초 실행은 official root를 지정하지 않았고 `/home/codechaser/.codex/skills/harness/SKILL.md`를 검색·read했다. | legacy 오선택이 실제로 한 번 재현됐다. 이는 legacy 내용의 일반적 결함 판정이 아니라, 현재 host의 duplicate discovery/routing 위험이라는 관측이다. |

따라서 “official copy가 18/18 parity”와 “natural Harness 요청에서 legacy가 선택됐다”는 동시에 참이다.
전자는 설치 동기화 사실이고, 후자는 host discovery가 description을 잃은 조건에서 보인 routing 사실이다.
이 관측만으로 `$HOME/.codex/skills`를 제거해서는 안 된다.

### 정적 보조 검증

- **[RF]** `node .codex-dist/skills/github-agentic-loop/tests/workflow-definition/all-fixtures.test.mjs` 결과는
  tests 122, pass 116, skip 6, fail 0이었다. 6개 skip은 이 실행 sandbox에서 nested child process를 만들 수 없어서다.
- **[RF]** `node .codex-dist/skills/harness/tests/user-decision-boundary.test.mjs`는 3 pass, 0 fail이었다.
- **[RF]** `git diff --check`는 성공했다.

이는 current source의 계약·fixture 신호일 뿐, 실제 skill discovery나 end-to-end activation의 성공 증거는 아니다.

## 관측 환경과 범위

Harness 최초 실행 target은 `/tmp/day3-discovery-harness-target.s1LoCP`였다. `git init`된 disposable target에
Parcel identifier validation이라는 작은 README와 script 없는 `package.json`만 두었다. project-local Harness,
`team-spec.md`, `AGENTS.md`, `.codex/`, `.agents/`는 처음부터 없었다. **[ARO]** 첫 workspace-write CLI sandbox에서는
`.codex`와 `.agents`가 read-only tmpfs로 mount되어 config write가 실패했다. 따라서 Phase 3–4에도 도달하지 못했고,
Harness를 성공적으로 생성·실행했다고 주장할 수 없다.

현재 parent host의 callable tool surface에는 `close_agent`가 없다. **[HO]** 이 관측에서는 subagent도 만들지 않았다.
올바른 cleanup 결과라면 agent id `0`, `not_applicable` 기록이 예상되지만, 첫 실행은 log를 쓰기 전에 막혔으므로
그 기록의 실제 생성은 **미관측**이다.

아래의 Harness 재진입과 evaluation-only는 같은 read-only CLI 세션에서 함께 수행했다. 두 scenario intent를 구분해
평가하되, 독립적인 두 번의 activation trace라고 과장하지 않는다.

## 시나리오별 activation 관측 카드

### S1. Harness 최초 실행

| 항목 | 관측과 판정 |
| --- | --- |
| 1. Discovery 후보 | **[ARO]** description 목록은 모두 제거되어 자동 후보 목록은 미관측이다. user의 “Harness 최초 실행” 요청에서 기대 후보는 official `harness`; 실제 파일 검색 후보는 legacy `~/.codex/skills/harness`였다. |
| 2. 예상 상위 문서 | **[AJ]** official `harness/SKILL.md` 다음 `references/reference-map.md`가 먼저여야 한다. |
| 3. 예상 leaf | **[AJ]** 최초 구성에는 `initial-generation-contract.md`를 중심으로 logging·team schema처럼 현재 stage에 필요한 1–2개 leaf가 뒤따라야 한다. |
| 4. 실제 read | **[ARO]** legacy `SKILL.md`(423 lines), legacy `reference-map.md`(320 lines)를 연 뒤 `initial-generation`, `logging`, `reentry-rules`, `verification-checklist`, `evolution`, `team-schema`, `agent-design-patterns`, `orchestrator`, `qa-guide`, `skill-writing`, `skill-testing`, `target-evaluation` 등을 전부 또는 일부 range로 열었다. |
| 5. 실제 명령·routing | **[ARO]** `rg`로 `/home/codechaser/.codex/skills/harness`를 찾고 `sed`로 `SKILL.md`·map·leaf를 읽었다. 이어 17 reference에 `wc -l`을 적용하고 `mkdir -p .codex ... .agents ...` 및 mount 확인을 실행했다. routing은 official source가 아닌 legacy Harness였다. |
| 6. 예상과 실제 차이 | **[ARO][AJ]** `official harness → map → small leaf set` 예상과 달리 `legacy harness → map → 다수 leaf`였다. description이 보이지 않은 host 상태가 이를 설명하지만 정당화하지는 않는다. |
| 7. 과활성화 | **[ARO]** 해당 17 reference의 합계는 3,653 source lines였고, 최소 12개 leaf를 opened했다. map의 scenario별 좁은 선택 원칙보다 넓다. 최초 생성이 여러 계약을 필요로 하더라도, 이 breadth는 over-activation 신호다. |
| 8. 안전 계약의 누락/지연 | **[ARO]** no-subagent를 선택해 위험한 spawn은 없었다. 하지만 writable target 확인은 넓은 reference read 뒤에 일어났고, `close_agent`가 없는 host에서 `not_applicable` cleanup log가 실제로 생성됐는지는 미관측이다. Phase 6도 도달하지 못했다. |
| 9. 분류 근거 | **[AJ]** discovery/routing은 부정확, document activation은 과활성화, write를 멈춘 행동은 안전 측면에서 적정이다. config write 실패는 Harness source의 under-activation이 아니라 sandbox 제약이다. |
| 10. 길이와 실제 context 비용 | **[ARO]** 3,653 lines는 token 수가 아니며 command output의 일부는 truncation될 수 있다. 다만 “skills context budget 2%” 오류와 이렇게 넓은 opened set은 비용 압력의 실제 신호다. 이 세션은 끝까지 완료되지 않아 정확한 usage summary도 없다. |
| 11. 과도한 file split 위험 | **[AJ]** 이미 map이 잘게 나뉜 leaf를 한꺼번에 나열·read했다. 더 쪼개면 candidate/link 수만 늘고 같은 browse-all 행동이 더 악화될 수 있다. |
| 12. 개선 우선순위 | **[AJ]** (1) entry prompt/host가 selected identifier와 installed path를 먼저 고정·기록, (2) reference-map에 최초 구성의 maximum leaf bundle을 더 명시, (3) 해당 bundle의 named section, (4) host가 description을 다시 노출한 뒤 description 정교화 순서다. description은 이번처럼 model-visible 목록이 비었을 때 단독 해결책이 아니다. |

결과: **실제 최초 실행은 실패가 아니라 “환경 제약으로 중단된 관측”이다.** `.codex`·`.agents` mount가 read-only여서
실제 target config를 만들 수 없었고, Phase 6 user decision gate와 cleanup log의 end-to-end 경로는 검증하지 못했다.

### S2. Harness 특정 Phase 재진입

| 항목 | 관측과 판정 |
| --- | --- |
| 1. Discovery 후보 | **[ARO]** 자동 description 후보는 다시 제거됐다. prompt가 official `/home/codechaser/.agents/skills/harness`를 명시했고 그것을 실제 read했다. |
| 2. 예상 상위 문서 | **[AJ]** `SKILL.md → reference-map.md` 뒤 reentry를 위한 phase selection·reentry rule이 우선이다. |
| 3. 예상 leaf | **[AJ]** `phase-selection-matrix.md`, `reentry-rules.md`; target의 상태가 평가 대상이면 `verification-checklist.md` 또는 `target-evaluation-playbook.md`가 조건부다. |
| 4. 실제 read | **[ARO]** official `SKILL.md`, `reference-map.md`, `phase-selection-matrix.md`, `reentry-rules.md`, `verification-checklist.md`, `target-evaluation-playbook.md`, target의 `README.md`와 `package.json`을 read했다. |
| 5. 실제 명령·routing | **[ARO]** 위 파일에 `sed`, target asset에 `rg --files`, `ls`, `git status --short`, `git log -1`을 실행했다. routing은 official Harness였다. `.harness/docs`·`.harness/logs`는 비어 있고 다른 persisted asset은 없었다. |
| 6. 예상과 실제 차이 | **[ARO]** “Phase 3 재진입”은 성립하지 않았다. prior write failure는 Phase 1–2 완료 증거가 아니므로 CLI는 `new build`, writable해진 뒤 가장 이른 candidate Phase 1이라고 판정했다. 이는 적정한 재진입 거부다. |
| 7. 과활성화 | **[AJ]** map과 4개 leaf는 map의 이상적 1–2개보다 넓지만, 이 요청이 reentry와 evaluation을 함께 물은 탓에 target evaluation leaf까지 조건부로 관련 있다. S1보다 훨씬 좁은 activation이다. |
| 8. 안전 계약의 누락/지연 | **[ARO]** asset 없는 target을 임의 Phase 3으로 진행하지 않았고 write·spawn을 하지 않았다. `close_agent` cleanup은 subagent가 없어서 실행 대상이 아니며 persistent log가 없으므로 실제 `not_applicable` 형식은 여전히 미관측이다. |
| 9. 분류 근거 | **[AJ]** routing precision과 “검증된 artifact가 없으면 earlier phase”라는 판단은 적정 activation이다. 다만 official path가 prompt로 강제됐으므로 generic automatic discovery의 적정성은 아니다. |
| 10. 길이와 실제 context 비용 | **[ARO]** CLI final usage는 input 390,813 / cached input 339,712 / output 7,096 tokens였다. 이는 platform prompt와 cache를 포함하므로 여섯 content file의 비용으로 환산할 수 없다. file read breadth만 비교 지표로 사용한다. |
| 11. 과도한 file split 위험 | **[AJ]** reentry 여부·evaluation은 서로 다른 조건을 가진 네 leaf를 요구한다. 단순 병합보다 map의 conditional selection을 강화하는 편이 낫다. |
| 12. 개선 우선순위 | **[AJ]** reference-map의 “artifact 없음이면 Phase 1” shortcut과 named section을 먼저 강화하고, 그 다음 entry prompt에서 observation-only target임을 명시한다. description 변경은 automatic discovery가 회복된 후 검토한다. |

### S3. Harness 평가 또는 개선만 수행

| 항목 | 관측과 판정 |
| --- | --- |
| 1. Discovery 후보 | **[ARO]** S2와 동일한 explicit official Harness activation이다. 독립 세션은 아니며, 이 사실이 측정 한계다. |
| 2. 예상 상위 문서 | **[AJ]** `SKILL.md → reference-map.md`이며 evaluation-only에서는 execution/generation 문서가 아니라 evaluation·verification 문서가 중심이어야 한다. |
| 3. 예상 leaf | **[AJ]** `target-evaluation-playbook.md`, `verification-checklist.md`, 그리고 mode 판정을 위한 matrix/rules다. |
| 4. 실제 read | **[ARO]** S2의 네 leaf와 target README/package를 read했으며, generation contract나 agent implementation 문서는 읽지 않았다. |
| 5. 실제 명령·routing | **[ARO]** asset existence와 git 상태만 read-only로 조사했다. source/target asset을 변경하는 명령과 Phase 7 실행은 없었다. official Harness routing이다. |
| 6. 예상과 실제 차이 | **[ARO]** limited input에 대한 Phase 6-style decision support는 만들었지만 정상 P5→P6 산출물을 평가한 것은 아니다. CLI는 세 선택지(현 유지/부분 수정/구조 재설계)를 제시하고 `user decision pending`으로 멈췄다. |
| 7. 과활성화 | **[AJ]** 네 leaf는 concrete한 evaluation 질문에 관련이 있어 S1의 browse-all과 달리 과활성화로 단정하기 어렵다. 다만 future pure evaluation request에서는 matrix/rules가 이미 상태로 알려졌다면 target evaluation + verification만으로 더 줄일 여지는 있다. |
| 8. 안전 계약의 누락/지연 | **[ARO]** “Phase 6 user-decision gate: intact”, “Phase 7 was not entered”가 실제 CLI final에 남았다. 다만 이전 phase completion이 없는 synthetic decision support이므로 P5에서 gate까지의 실제 전이 검증은 미관측이다. |
| 9. 분류 근거 | **[AJ]** no-write, no-spawn, explicit user-decision pending은 적정 activation이다. 정상 Harness 평가가 아니라 missing-artifact diagnosis라는 한계를 함께 가진다. |
| 10. 길이와 실제 context 비용 | **[ARO]** S2와 같은 combined-session usage라 scenario별 token 분리는 불가능하다. 문서 길이만으로 evaluation-only의 실제 context 비용을 주장하지 않는다. |
| 11. 과도한 file split 위험 | **[AJ]** 평가 기준을 더 작은 독립 파일로 나누면 `Phase 6 gate`와 verification contract를 함께 놓칠 위험이 있다. 지금처럼 conditional map으로 연결하는 것이 안전하다. |
| 12. 개선 우선순위 | **[AJ]** named section으로 “evaluation-only, no execution” 진입점을 제공하고 reference-map의 leaf cap을 보완한다. file split은 우선순위가 아니다. |

이 관측은 Phase 6의 **결정 보류 행동**을 실제로 보였지만, writable target을 Phase 1부터 정상 생성해
P5→P6으로 들어간 end-to-end 검증을 대체하지 않는다. source test 3/3 pass도 그 한계를 해소하지 않는다.

### S4. GitHub Agentic Loop의 단일 next action 판단

| 항목 | 관측과 판정 |
| --- | --- |
| 1. Discovery 후보 | **[ARO]** description 목록은 제거됐다. prompt가 current official `github-agentic-loop`만 쓰고 legacy `github-workflow-engine`은 쓰지 말라고 명시했다. 실제 current identifier path만 read했다. |
| 2. 예상 상위 문서 | **[AJ]** `github-agentic-loop/SKILL.md` 뒤 `workflow-definition-contract.md`, `normalized-fact-adapter-contract.md`가 기본이고, 관측·사용자 선택이 있으므로 `state-observation-contract.md`, `user-decision-contract.md`가 조건부다. |
| 3. 예상 leaf | **[AJ]** `definitions/feature-change.json`, feature-change/workflow state adapter, normalized fact adapter, evaluator가 single deterministic decision에 필요한 leaf/code다. FC-1이 user decision이면 thin executor `issue-creation`은 아직 열지 않아야 한다. |
| 4. 실제 read | **[ARO]** official `SKILL.md`, 두 base contract, `feature-change.json`, feature-change/workflow state adapter, normalized fact adapter, evaluator, expression helper, state-observation·user-decision contract를 read했다. `structured-execution`·artifact-output과 `issue-creation`은 read하지 않았다. |
| 5. 실제 명령·routing | **[ARO]** 먼저 `git status --short --branch`, 이어 synthetic `/tmp` normalized-state를 (`jq` 부재 후 `sed`) 읽고 official evaluator를 `node --input-type=module --eval`로 한 번 실행했다. 결과는 `action_required`, `task_action_id: FC-1`, 선택지 `confirm_draft`/`revise_draft`, `executor_reference: issue-creation`이었다. legacy path나 GitHub mutation 명령은 trace에 없다. |
| 6. 예상과 실제 차이 | **[ARO][AJ]** Definition→adapter→evaluator→user decision이라는 핵심 path는 일치했다. 다만 helper implementation까지 넓게 읽은 것은 evaluator CLI를 통한 최소 계산보다 넓을 수 있다. 이 세션에서 official current selection은 explicit prompt의 결과이지 natural discovery 성공 증거가 아니다. |
| 7. 과활성화 | **[AJ]** 10개 이상 artifact의 read는 behavior trace/debug에는 설명 가능하지만 single next-action 답만 위해서는 넓다. 반대로 executor를 열지 않은 것은 progressive activation에 맞다. 정확한 token attribution이 없어 경미한 후보 과활성화로만 분류한다. |
| 8. 안전 계약의 누락/지연 | **[ARO]** FC-1에서 `action_required`로 멈추고 executor/GitHub 변경을 dispatch하지 않았다. 실제 missing fact의 fail-closed와 user 결정 뒤 resume은 이 session에서 입력하지 않아 미관측이다. |
| 9. 분류 근거 | **[AJ]** deterministic evaluator를 정확히 한 번 실행하고 user boundary에서 멈춘 것은 적정 activation이다. GitHub authoritative state를 사용하지 않은 synthetic fixture이므로 production routing·resume 안전을 판정할 수 없다. |
| 10. 길이와 실제 context 비용 | **[ARO]** opened set은 contract·JSON·adapter·evaluator code가 혼합되어 line 수와 semantic 비용의 관계가 더 약하다. 실제 command trace는 비용 범위를 보이지만 session-level meter는 없으므로 “정확히 몇 token이 과다”라는 결론은 내리지 않는다. |
| 11. 과도한 file split 위험 | **[AJ]** Definition, adapter, evaluator는 같은 deterministic boundary의 서로 다른 역할이다. 이들을 file 수만 보고 합치면 validator/evaluator의 독립 검증성이 약해진다. 반대로 helper를 매번 직접 읽게 하는 split은 route 오류·비용을 늘릴 수 있다. |
| 12. 개선 우선순위 | **[AJ]** (1) entry prompt에 workflow id·기준 Issue/PR·관측 범위를 명시, (2) reference-map 성격의 “single evaluation minimal path”를 제공, (3) evaluator trace용 named section, (4) description 정교화 순이다. host가 description을 제거한 현상은 source description만으로 해결할 수 없다. |

#### GitHub authoritative state와 local state의 순서

- **[RF]** `state-observation-contract.md`는 열린 PR을 먼저, 이어갈 PR 후보가 없을 때 열린 Issue를 찾고,
  GitHub 완료·미완료 근거가 보조 local/log 근거와 충돌하면 GitHub state를 우선하도록 정한다.
- **[ARO]** 이번 synthetic session은 `git status`를 먼저 읽고 `/tmp` local normalized state를 evaluator에 주었다.
  실제 GitHub API/`gh` 관측은 의도적으로 하지 않았다.
- **[AJ]** 따라서 production에서 “GitHub PR/Issue → 필요한 local state → normalize once → evaluate once”가
  실제로 지켜졌다고 주장할 수 없다. 이번 관측은 local fixture의 deterministic dispatch만 검증했다.

**Fail-closed와 resume:** current source 계약은 근거가 없거나 후보가 여럿이면 추론하지 않고 중단하도록 하지만
**[RF]**, 이번 actual input은 유효한 FC-1 decision state였으므로 fail-closed branch와 decision 뒤 resume branch는
**미관측**이다. Day 2의 관련 기록은 **[HE]**일 뿐 Day 3 runtime 증거가 아니다.

### S5. 특정 thin skill 직접 호출 — `issue-creation`

| 항목 | 관측과 판정 |
| --- | --- |
| 1. Discovery 후보 | **[ARO]** description 후보는 제거됐지만 prompt가 official `issue-creation` 하나를 명시했다. parent loop·legacy는 후보로 활성화하지 않았다. |
| 2. 예상 상위 문서 | **[AJ]** `/home/codechaser/.agents/skills/issue-creation/SKILL.md` 하나다. GitHub Agentic Loop `SKILL.md`는 direct concrete draft에는 상위 문서가 아니다. |
| 3. 예상 leaf | **[AJ]** `github-templates.md`, artifact-output contract의 issue-creation named section, target의 feature issue template만 필요하다. |
| 4. 실제 read | **[ARO]** official `issue-creation/SKILL.md`, official `github-agentic-loop/references/github-templates.md`, artifact-output contract의 `이슈 생성(issue-creation) 출력 판정 규칙` named section, `.github/ISSUE_TEMPLATE/feature_template.md`를 read했다. |
| 5. 실제 명령·routing | **[ARO]** target template를 `rg --files`로 찾고 named section을 `rg`/`awk`로 좁혀 읽었다. actual routing은 official thin skill이었으며 GitHub API·issue creation·file mutation은 실행하지 않았다. |
| 6. 예상과 실제 차이 | **[ARO]** 예상한 세 reference 범위와 일치했다. parent loop Definition/evaluator, 다른 thin skill, legacy workflow-engine은 열지 않았다. |
| 7. 과활성화 | **[AJ]** 실제 필요한 4개 content artifact로 제한된 적정 activation이다. `github-templates.md` 전체 read가 큰 경우 named section을 더 좁힐 여지는 있으나 현재 trace만으로 과활성화라고 할 수 없다. |
| 8. 안전 계약의 누락/지연 | **[ARO]** 결과는 비구속적 issue draft였고 실제 생성은 별도 확인을 요구했다. mutation gate가 적시에 작동했다. |
| 9. 분류 근거 | **[AJ]** concrete request → thin `SKILL.md` → named contract section → target template → draft라는 경로가 progressive activation과 routing precision의 가장 명확한 긍정 사례다. 자동 discovery의 긍정 사례는 아니다. |
| 10. 길이와 실제 context 비용 | **[ARO]** final usage는 input 94,884 / cached input 76,800 / output 3,967 tokens였으나 shared prompt/cache를 포함한다. 좁은 opened set과 이 session meter를 동일시할 수 없다. |
| 11. 과도한 file split 위험 | **[AJ]** 이미 named section이 정밀한 진입점으로 작동했다. template contract를 더 작게 나누면 direct request가 어느 조각을 열지 모를 가능성이 더 크다. |
| 12. 개선 우선순위 | **[AJ]** 현재는 named section과 target-template discovery가 먼저이며 file split은 불필요하다. host description가 복구되면 thin skill description의 direct-draft trigger를 검증하는 것이 다음 순서다. |

## Harness activation 평가

| 구분 | 결론 | 근거 |
| --- | --- | --- |
| Discovery / routing | **문제 관측** | **[ARO]** 최초 자연어 Harness 요청이 legacy `/home/codechaser/.codex/skills/harness`를 선택했다. 동시에 skills context budget 때문에 description 기반 discovery 자체가 비가시 상태였다. |
| 최초 실행의 activation | **과활성화** | **[ARO]** map 뒤 다수의 cross-stage leaf를 opened하고 17 reference/3,653 lines를 인벤토리했다. |
| 재진입 판단 | **적정** | **[ARO]** persisted Phase 1–2 asset 부재를 근거로 Phase 3 재개를 거부하고 Phase 1 후보로 되돌렸다. |
| evaluation-only | **대체로 적정, 제한적** | **[ARO]** write와 Phase 7을 피하고 user decision pending을 유지했다. 단, 정상 생성물에 대한 P5→P6 검증이 아니라 missing-artifact diagnosis다. |
| Phase 6 gate | **부분 관측** | **[ARO]** evaluation response가 gate intact/Phase 7 미진입을 명시했다. **[RF]** boundary test 3/3도 통과했다. 그러나 complete build flow에서 gate까지 도달한 runtime은 미관측이다. |
| cleanup | **미관측** | **[HO]** `close_agent`는 callable하지 않고 **[ARO]** subagent ID도 없었다. 올바른 `not_applicable` log가 target에 실제 기록됐는지는 write failure로 관측 불가다. |

Harness의 핵심은 **semantic orchestration과 사용자 소유 decision gate**다. 그러므로 artifact가 없는 target에서
그럴듯한 Phase 3을 만들지 않고 Phase 1로 되돌아간 것은 속도보다 결정 소유권을 지킨 결과다. 반면 이 의미적
넓이가 모든 phase reference를 먼저 읽어도 된다는 뜻은 아니다. S1은 map의 progressive rule이 runtime에서
잘 지켜지지 않을 수 있음을 보였다.

## GitHub Agentic Loop activation 평가

| 구분 | 결론 | 근거 |
| --- | --- | --- |
| Current identifier | **explicit activation은 관측** | **[ARO]** official `github-agentic-loop` path를 read하고 legacy `github-workflow-engine` 파일은 trace에 없었다. description 제거 조건이므로 generic automatic identifier 선택은 미검증이다. |
| Definition·adapter·evaluator | **핵심 path 적정** | **[ARO]** definition을 validator/adapter/evaluator로 해석해 evaluator를 한 번 호출했고 FC-1 `action_required`를 얻었다. |
| 사용자 경계와 자동 경계 | **적정** | **[ARO]** user decision action에서 executor `issue-creation`을 dispatch하지 않았고 mutation도 없었다. |
| authoritative GitHub 관측 | **미관측** | **[ARO]** local fixture로만 실행했고 real PR/Issue를 읽지 않았다. source의 PR→Issue 우선 규칙은 **[RF]**이다. |
| fail-closed/resume | **미관측** | valid FC-1 state만 사용했다. source/fixture는 보조 증거일 뿐 실제 Codex CLI의 missing-evidence 중단과 재개는 아직 보지 못했다. |
| thin skill handoff | **적정한 지연** | **[ARO]** S4에서는 decision 앞에서 executor를 열지 않았고, S5에서만 direct request로 `issue-creation`을 좁게 활성화했다. |

GitHub Agentic Loop의 핵심은 **fact normalization, deterministic evaluator, next-action dispatch**다.
따라서 Harness처럼 role 설계 자료를 넓게 조율하는 것이 목표가 아니다. `SKILL.md`가 정한 file-change handoff도
동일한 이유로 target-local Harness 준비도를 먼저 판정하고, 준비되지 않았다면 `target_harness`가 아니라
`general_code_change`를 선택해야 한다. 일단 실행을 시작한 뒤 임의 fallback하지 않는다. **[RF]** 이는 두 runtime을
공통 stage 이름으로 비교할 수는 있어도, 동일 runtime schema나 shared registry로 만들 수 없다는 근거다.

## Gap analysis — 오류·비용·안전 효과

| gap | 실제 효과 | 결론 |
| --- | --- | --- |
| Skill descriptions removed at 2% budget | **[ARO]** 후보가 model-visible하지 않아 설명문 기반 routing을 검증할 수 없고, S1은 legacy path를 실제 선택했다. | 가장 먼저 host/entry layer에서 selected identifier·path를 기록해야 한다. source description만 고쳐서는 이 incident를 해결하지 못한다. |
| Harness S1 browse-all | **[ARO]** 많은 reference read 후에야 unwritable config mount를 확인했다. | 초기 runnable-target/readiness preflight를 좁은 early path로 올리면 비용과 실패 지연을 줄일 수 있다. 이는 source 변경 제안이 아니라 관측 기반 개선 후보다. |
| Writable target 부재 | **[ARO]** config write가 실패해 Phase 3–6과 cleanup persistence가 검증되지 않았다. | “Harness runtime 성공”이 아니라 environment-blocked run으로 남겨야 한다. |
| Loop synthetic fixture | **[ARO]** deterministic FC-1 decision은 확인했지만 GitHub API observation·fail-closed·resume은 확인하지 못했다. | local evaluator success를 production loop success로 일반화하지 않는다. |
| Thin skill direct path | **[ARO]** 4개 content artifact, named section, no mutation으로 draft를 만들었다. | progressive activation이 실제 비용·안전 양쪽에 이득을 주는 긍정 대조군이다. |

### 개선 우선순위

1. **Entry prompt와 host 관측 기록** — current identifier와 official installed root를 first line에서 고정하고
   selected path, skill-description visibility, fallback 금지를 기록한다. duplicate가 있는 host에서 가장 직접적인
   routing 안전장치다.
2. **Reference-map** — Harness 최초 구성·재진입·evaluation-only마다 “반드시 읽을 leaf / 조건부 leaf / 이번
   요청에서 열지 말 leaf”와 small maximum bundle을 명확히 한다. Loop에는 single-evaluation minimal path를 둔다.
3. **Named section** — thin skill처럼 execution intent별 entry section을 제공한다. evaluation-only와 readiness
   preflight를 특히 좁힐 수 있다.
4. **Description** — host가 descriptions를 실제 노출하는 환경에서 current identifier와 near-miss identifier의
   구분을 재검증한 뒤 조정한다. 이번 2% removal 환경에서는 우선순위 1–3을 대체하지 못한다.
5. **File split은 우선하지 않음** — S1은 이미 쪼개진 leaf를 과도하게 열었고 S5는 named section으로 충분히
   좁혔다. 더 쪼개면 routing edge와 안전 계약 누락 가능성이 증가한다.

## 아직 추론에 머무는 항목

- **미관측**: descriptions가 정상 노출된 generic Codex discovery에서 `github-agentic-loop`가 legacy
  `github-workflow-engine`보다 선택되는지.
- **미관측**: writable disposable target에서 Harness의 `SKILL.md → reference-map → selected leaf` 순서가
  P1부터 P6까지 유지되는지, 그리고 Phase 6이 정상 P5 결과에서 Phase 7을 차단하는지.
- **미관측**: callable `close_agent` 부재일 때 Harness/Loop log에 agent id `0`, cleanup `not_applicable`가
  실제 persistence되는지.
- **미관측**: real GitHub PR/Issue 우선 관측, missing/ambiguous fact의 fail-closed, user decision 뒤 resume의
  actual CLI behavior.
- **[AJ]** opened source line 수와 CLI model context cost의 정확한 함수 관계. 현재 trace에는 artifact별 token meter가 없다.

## Day 4로 넘길 상태와 persistence 관찰 조건

1. `.codex`·`.agents`를 write할 수 있는 새 disposable target을 준비하고, target-local Harness가 전혀 없는
   baseline과 P1–2 artifact를 의도적으로 남긴 reentry baseline을 분리한다.
2. 각 run 시작 시 skill-description visibility, selected absolute path, target mount mode, writable 여부를 log의
   첫 항목으로 남긴다. descriptions가 다시 제거되면 automatic discovery 성공으로 해석하지 않는다.
3. Harness는 P1→P6 정상 흐름 후 user decision pending log와 Phase 7 미진입을 확인하고, no-subagent case의
   `not_applicable` cleanup record까지 persistence를 검사한다.
4. Loop는 실제 read-only GitHub PR/Issue snapshot을 먼저 관측하고, local status·current date log를 필요한
   최소 범위로 합친 뒤 normalize once/evaluate once를 trace한다. 별도로 missing evidence와 ambiguous candidate를
   입력해 fail-closed, decision 입력 후 resume을 재현한다.
5. file change handoff에서는 target-local Harness readiness가 없으면 `general_code_change`를 선택한 뒤, 시작 후
   fallback하지 않는 trace를 확보한다.

## Day 3 완료 조건 체크리스트

- [x] 지정된 사전 문서 다섯 개와 관련 current source·reference를 읽었다.
- [x] Discovery, activation, progressive activation, routing precision, context path, over/under activation,
  operational observation의 조사 순서를 먼저 정하고 보고서에 기록했다.
- [x] current source, official installed copy, legacy 후보를 구분하고 18/18 parity를 재확인했다.
- [x] Harness 최초 실행을 disposable target에서 실제 시도했고, blocked 상태를 성공으로 주장하지 않았다.
- [x] Harness 재진입 및 evaluation-only intent를 실제 read-only CLI session에서 관측했다.
- [x] GitHub Agentic Loop의 single next action과 deterministic evaluator 결과를 실제로 관측했다.
- [x] concrete한 thin skill direct invocation과 named-section activation을 실제로 관측했다.
- [x] Phase 6 decision pending/Phase 7 미진입 응답, no-subagent 상태, source test를 서로 다른 증거 종류로 기록했다.
- [x] source·설정·legacy 설치물을 변경하거나 삭제하지 않았다.
- [ ] descriptions가 정상인 automatic discovery, Harness end-to-end P6, cleanup persistence, real GitHub observation,
  fail-closed/resume은 아직 runtime으로 검증하지 못했다. Day 4의 명시적 관측 조건이다.

## 결론

Day 3의 가장 중요한 실제 결과는 두 가지다. 첫째, official 설치본은 source와 18/18 parity지만, description이
전부 제거된 current host에서 natural Harness 요청은 legacy copy를 실제 선택했다. 이는 static parity가 routing
precision을 보장하지 않는다는 증거다. 둘째, `issue-creation` direct call은 상위 Loop를 열지 않고 named section과
target template만 읽어 draft에서 멈췄다. 이는 progressive activation이 실제로 가능한 경로라는 대조 증거다.

Harness의 초기 run은 sandbox의 read-only config mount 때문에 end-to-end로 실패했고, Loop는 synthetic local fact만
평가했다. 그러므로 이 보고서는 실제로 보지 못한 Phase 6 complete-flow, cleanup persistence, GitHub authoritative
re-observation, fail-closed/resume을 성공으로 표시하지 않는다.
