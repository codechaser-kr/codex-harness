# Phase 2 · Day 4 — State and Persistence

> 관측일: 2026-10-18 (Asia/Seoul)  
> 기준 브랜치/커밋: `docs/repository-evolution-workshop` / `f24bb406f90b0aa4eb2ff380ce06bacd8cd3ab92`  
> 범위: 이 보고서 외 저장소 source·설정·설치본·기존 사용자 파일은 변경하지 않았다. 두 target은 새 `/tmp` 경로에만 준비했다.

## 문서 성격과 증거 표기

이 문서는 학습·조사 기록이며 공식 runtime 설계를 대체하지 않는다. 조사 시작 시 작업 트리는 clean이었다. 현재 checkout을 기준으로 삼았고 `origin`에 대한 fetch는 하지 않았다.

| 표기 | 의미 |
| --- | --- |
| **[RF] repository fact** | 현재 checkout의 source, 설정, tracked 문서와 실행한 저장소 명령으로 확인한 사실 |
| **[HO] host observation** | 설치 경로, host tool surface, sandbox, disposable target 준비에서 확인한 사실 |
| **[ARO] actual runtime observation** | 실제 GitHub read-only 조회 또는 런타임 실행 시도 결과. 실행이 시작되지 않은 경우 그 경계를 명시한다. |
| **[HE] historical execution evidence** | Day 3 보고서 등 과거 시점의 실행 기록. 현재 사실로 승격하지 않는다. |
| **[AJ] analysis judgment** | 위 증거로부터 도출한 영향·분류·후보 |
| **[SF] synthetic fixture/test** | 합성 입력으로 실행한 현재 source 테스트. 실제 GitHub나 Harness runtime 상태 관측과 구분한다. |

`gh auth status`는 현재 저장된 GitHub 인증이 유효하지 않다고 표시했다. 토큰·인증 내용은 읽거나 기록하지 않았다. 공개 저장소의 PR·Issue read-only 조회는 성공했으나, 인증이 필요한 비공개 상태는 검증하지 못했다. **[HO][ARO]**

## 오늘의 학습 개념과 조사 순서

### 학습 개념

- **Runtime State**는 실행 시 판단·전이에 실제로 쓰이는 상태다. 파일이 있다는 사실만으로 runtime state가 되지는 않는다.
- **Persistent State**는 실행 사이에 남는 상태다. **Ephemeral State**는 현재 대화의 판단, 도구 출력, 아직 저장하지 않은 선택처럼 세션 종료 후 보장되지 않는 상태다.
- **Source of Truth**는 질문마다 달라진다. 협업 진행은 GitHub, Harness 역할 정의는 타겟 `team-spec.md`, 설치 계약은 저장소 source가 정본이다.
- **Derived State**는 정본에서 계산·생성한다. Workflow normalized facts/evaluator 결과와 Harness agent·role skill은 재계산하거나 재생성할 수 있다.
- **Checkpoint**는 다음 실행이 재진입 지점을 찾도록 남긴 요약이다. Harness `latest-session-summary.md`와 Workflow 날짜별 log는 역할이 다르며 정본 GitHub 상태를 대체하지 않는다.
- **Configuration State**는 사용자가 선택했거나 실제 capability를 관측해 남긴 설정이다. 일반 workflow fact나 실행 log와 섞지 않는다.
- **Observation Record**는 어느 시점에 무엇을 읽고 실행했는지 보존한다. 기록된 관찰은 그 시점의 근거이지 현재 truth가 아니다.
- **State Ownership**은 생성·수정 권한과 충돌 시 우선순위를 함께 정한다. 두 runtime의 소유 구조가 다른 것은 결함의 증거가 아니다.

### 실제 조사 순서

1. 지정된 문서 8개를 모두 읽었다: Workshop `README.md`, `roadmap.md`, `execution-guide.md`, Phase 2 계획, Phase 1 summary, Day 1·2·3 보고서.
2. 현재 branch·HEAD·worktree, `.codex-dist/skills/`, 현재 설정과 `.harness/` 파일을 다시 확인했다.
3. `$HOME/.agents/skills/`, `$HOME/.codex/skills/`, installer가 정한 backup root를 읽기 전용으로 확인하고 관리 대상 18개 source/installed tree를 비교했다.
4. Harness 최초 실행 target과 P1–2 문서가 있는 재진입 target을 서로 다른 `/tmp` 경로에 준비했다. 기본 Codex home의 DB read-only 오류는 격리 `CODEX_HOME`으로 해결했다. H1 실제 실행은 Phase 0–2 상태와 로그를 target에 남겼지만 `.codex/agents`·`.agents/skills`가 read-only라 Phase 3 진입 경계에서 멈췄다.
5. GitHub 관측은 contract 순서대로 열린 PR을 먼저 조회하고, 후보가 없어서 열린 Issue를 조회했다. 그 뒤에만 현재 repository의 최소 local settings/log를 읽었다.
6. GitHub Agentic Loop와 Harness의 current contract·adapter·evaluator를 읽고, 합성 fixture/test를 실제 GitHub 관측과 분리해 실행했다.
7. file-change handoff readiness를 현재 repository에서 부수 효과 없이 판정한 뒤 이 보고서 경로를 정했다.

## 현재 구조 요약

Harness는 타겟 프로젝트 의미, 역할 경계와 변경 영향에 대한 orchestration을 담당하고, Phase 6의 선택과 변경 범위는 사용자에게 남긴다. GitHub Agentic Loop는 GitHub·local·user·skill 결과를 근거가 연결된 fact로 정규화하고 Definition evaluator로 next action 하나를 계산한 뒤, 확정 범위만 실행 주체에 보낸다. 이 둘은 공통 state store나 schema를 공유하지 않는다. **[RF]**

Harness의 역할 정본은 타겟 `.harness/docs/team-spec.md`다. `.codex/agents/*.toml`과 `.agents/skills/*/SKILL.md`는 그 정본에서 생성되는 실행 자산이다. Workflow Engine은 GitHub 실행 상태를 협업 정본으로 삼고 `.github-agentic-loop/settings.json`은 필요한 capability·preference 설정으로, 날짜별 log는 보조 observation record로 소유한다. **[RF]**

## 현재 상태 및 관측 결과

### GitHub 실제 관측 — PR 먼저, Issue 다음

| 순서 | 실제 명령/관측 | 결과와 범위 |
| --- | --- | --- |
| 인증 상태 | `gh auth status` | 현재 저장된 인증은 유효하지 않다고 보고했다. 인증 정보는 출력·기록하지 않았다. |
| 1. 열린 PR | `gh pr list --repo codechaser-kr/codex-harness --state open --json number,title,headRefName,baseRefName,url` | `[]`. 현재 이어갈 열린 PR 후보가 없었다. |
| 2. 열린 Issue | `gh issue list --repo codechaser-kr/codex-harness --state open --json number,title,labels,updatedAt,url` | Issue #37 한 건. `[검토] 프로젝트 이름을 GitHub Agentic Loop로 변경`, label `정책검토`, updatedAt `2026-07-04T14:27:15Z`. |
| Issue 내용 | `gh issue view 37 --repo codechaser-kr/codex-harness --json number,title,state,labels,body,comments,updatedAt,url` | state `OPEN`; 본문 후속 checklist 5개 모두 unchecked; comments `[]`. 읽은 이슈는 [Issue #37](https://github.com/codechaser-kr/codex-harness/issues/37)이다. |
| Review thread | 별도 조회 없음 | 열린 PR이 없어 현재 후보 PR의 review thread가 없다. 닫힌 과거 PR thread를 현재 작업 후보로 확장하지 않았다. |

GitHub Issue/PR/label/checklist/thread는 GitHub API 상태가 현재 정본이다. 이 조회에서는 Issue #37을 진행하거나 state를 바꾸지 않았다. **[ARO]**

### 이후 확인한 최소 local state

- 현재 target 설정은 `.github-agentic-loop/settings.json`이며 Git tracked 파일이다. `dependencies.commit`과 review capability의 `checkedAt`은 `2026-07-11`; 기본 review mode는 `claude/code-review`다. 이 기록은 설정값이지 현재 capability를 다시 probe한 결과가 아니다. **[RF]**
- 현재 repository에는 `.github-agentic-loop/logs/github-workflow-log-2026-08-02.md`부터 `2026-08-09.md`까지 날짜별 local log가 있다. 최신 log는 2026-08-09이고 Issue #129 / PR #134 당시의 관측과 실행을 기록한다. `.gitignore`가 `.github-agentic-loop/logs/`를 제외하므로 이 기록은 이 local checkout에만 남고 GitHub 또는 Git index의 정본이 아니다. **[RF]**
- 최신 local log에는 PR #134가 당시 `OPEN`이었다는 기록이 있지만 현재 열린 PR 조회는 비어 있다. 이는 시간상 자연스러운 차이다. log를 현재 상태로 재사용하지 않고 GitHub를 우선한다. Issue #37은 local log에서 찾지 못했다. **[RF][ARO]**
- 현재 checkout의 `.harness/`에는 생성기 개발 평가 지침, 문서 회귀 checklist, 과거 타겟 평가 corpus와 탐색 메모가 있다. 그러나 `.harness/docs/team-spec.md`, `.harness/docs/orchestration-plan.md`, `.harness/logs/session-log.md`, `.harness/logs/latest-session-summary.md`, `.codex/agents/`, project-local `.agents/skills/`는 없다. 이 저장소는 전역 Harness 설치는 있지만 project-local Target Harness는 준비되지 않았다. **[RF]**
- `.harness/evaluations/targets/hakakorea_second_frontend/2026-05-09-refresh-harness-meta.md`의 `재작성 필요` 판정은 과거 타겟 평가 기록이다. 현행 계약에서는 품질·변경 범위를 사용자가 결정하므로 현재 runtime verdict로 가져오지 않는다. **[RF][HE]**

### Source·installed·legacy 경로의 현재 상태

| 층 | 현재 재확인 | 소유와 지속성 |
| --- | --- | --- |
| Current source | `.codex-dist/skills/harness/`, `.codex-dist/skills/github-agentic-loop/` 및 companion skills | 저장소 Git history가 배포 source다. 현재 Workflow identifier는 `github-agentic-loop`다. **[RF]** |
| Official installed copy | `$HOME/.agents/skills/`에 installer 관리 18개가 있으며 관리 대상별 `diff -qr` 결과 18/18 parity | 사용자 환경의 별도 installed snapshot. source와 같아도 생명주기와 갱신 시점은 다르다. **[HO]** |
| Legacy 후보 | `$HOME/.codex/skills/`에는 `.system/`과 `.codex-system-skills.marker`만 있다. `harness`와 `github-workflow-engine` directory는 없다. | 현재 user-skill legacy 경로는 정리된 상태로 관측됐다. `.system`은 Codex system skill이라 legacy Harness로 분류하지 않는다. **[HO]** |
| Backup archive | `XDG_STATE_HOME` 및 `CODEX_HARNESS_BACKUP_ROOT`는 unset. installer가 정한 `$HOME/.local/state/codex-harness/backups/`는 비어 있다. inspected `$HOME/.codex/skills/`에도 backup copy가 없다. | 현재 legacy skill backup archive는 해당 경로에서 발견되지 않았다. `$HOME/.codex/archived_sessions/`는 `rollout-*.jsonl` session archive이며 skill backup이 아니다. 삭제·정돈은 하지 않았다. **[HO]** |

Day 3는 2026-09-18 당시 `$HOME/.codex/skills/harness`와 `github-workflow-engine`이 실제 존재하고, description budget 제한 환경에서 최초 Harness 요청이 legacy 경로를 읽은 관측을 남겼다. 당시 `$HOME/.agents/skills` source parity도 18/18이었다. 현재는 official 18/18 parity가 유지되면서 legacy 두 directory가 사라졌다. 따라서 Day 3의 legacy routing은 **역사적 실행 근거 [HE]**이고 현재 discovery 후보라는 표현으로 옮겨 쓰지 않는다. 삭제·backup archive 정리 시점은 현재 파일 관측만으로 확정할 수 없다. **[HO][AJ]**

### 주요 상태 표 — GitHub Agentic Loop와 host

| 상태 또는 artifact | 분류 | 소유자 · Source of Truth | 위치와 지속 범위 | 생성·갱신·읽기·폐기 | 재진입 시 보존/재계산 | 충돌 시 우선 | 근거와 한계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Issue/PR/label/checklist/comment/review thread | persistent | GitHub. PR thread는 diff feedback의 정본; 일반 PR issue comment는 review feedback 정본이 아님 | GitHub repository, 변경 이력 유지 | 사용자·허용 executor가 변경. 관측 때마다 API에서 읽음 | 그대로 보존하고 새 snapshot으로 재관측 | GitHub 실행 상태가 local log보다 우선 | #37 open/label/checklist/comments 실제 조회. 열린 PR이 없어 thread는 미관측/해당 후보 없음. **[ARO]** |
| `.github-agentic-loop/settings.json` | configuration | Workflow Engine이 지원 필드의 owner; capability 사실은 실제 probe + evidence, 선호는 사용자 입력 | 현재 repository target의 tracked JSON | 필요 작업에서 필요한 필드만 lazy init; malformed/unknown이면 자동 교정하지 않고 중단 | 유효 설정은 보존하고 필요한 필드만 재확인. freshness TTL은 계약에서 미정 | 사용자 결정·실제 관측이 config 설명보다 우선; 충돌값 자동 덮어쓰기 금지 | 현재 file의 `checkedAt`은 2026-07-11. 그 시점 이후 freshness는 검증 불가. **[RF]** |
| 날짜별 Workflow log | observation | Workflow Engine이 쓴 실행 보조 기록; GitHub 사실을 대체하지 않음 | `.github-agentic-loop/logs/github-workflow-log-YYYY-MM-DD.md`; 현재 ignored/local only | 실행·중단·재개 기록을 날짜별로 추가 | 요청 ID·task·재개 조건이 있을 때 필요한 최신 이전 일자만 읽음 | GitHub state > 날짜별 log | 현재 최신은 2026-08-09; issue #37 기록 없음. **[RF]** |
| normalized facts / evaluator output | derived | 현재 GitHub/local/user/skill evidence + Definition/adapter/evaluator | 실행 메모리·도구 결과; 장기 SoT 아님 | 매 실행에서 근거 수집 후 normalize/evaluate; 다음 action은 재계산 | 입력을 새로 모아 다시 계산. evaluator는 입력을 mutate하지 않음 | raw authoritative evidence와 Definition | adapter/evaluator source·synthetic tests로 확인; 현재 GH 전체 snapshot을 evaluator에 전달하지 않음. **[RF][SF]** |
| 현재 대화의 임시 판단과 tool output | ephemeral | 현재 Codex orchestration session | 대화/tool context; 별도 durable repository record로 자동 저장되지 않음 | 현재 요청에서 생성·소비. session 종료 후 보장 없음 | 저장된 observation record가 없으면 다시 관측·판단 | 저장된 GitHub/current source 및 명시적 사용자 결정 | 첫 CLI 시도는 기본 home DB 오류로 열리지 않았다. 격리 `CODEX_HOME`의 두 번째 실행은 열렸고 Harness가 별도 target log를 남겼다. CLI 자체 transcript의 재개 보존은 검증하지 않았다. **[HO][ARO]** |
| source / installed skill | persistent package snapshot | source는 meta repository, installed copy는 사용자 환경 | `.codex-dist/skills/`; `$HOME/.agents/skills/` | source는 commit; installed copy는 `install.sh`로 교체·backup | 설치본은 source에서 재설치할 때 갱신. parity는 매 시점 다시 비교 | 새 source는 다음 배포의 정본, 현재 실행은 설치된 snapshot 사용 | 현재 18/18 parity; 두 경로는 독립 파일 tree다. **[RF][HO]** |
| lock·marker·trace 별도 artifact | 없음/범위 제한 | runtime별 별도 lock registry나 공통 trace DB 없음 | 배포 source에서 per-request lock file/schema를 찾지 못함. host의 `.codex/skills/.system/.codex-system-skills.marker`는 system skill marker | Workflow state의 동시성은 live precondition/postcondition과 GitHub state 재조회로 다룸 | lock 상태 복원은 없음; 새 observation으로 재평가 | GitHub와 target-local 계약 | 검색 범위는 현재 skill source·reference. marker를 Harness/Loop checkpoint로 오인하지 않는다. **[RF][HO]** |

### 주요 상태 표 — Harness target

| 상태 또는 artifact | 분류 | 소유자 · Source of Truth | 위치와 지속 범위 | 생성·갱신·읽기·폐기 | 재진입 시 보존/재계산 | 충돌 시 우선 | 근거와 한계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `project-setup.md`, `domain-analysis.md` | persistent 입력/derived 분석 | 제품 의도는 사용자 입력, 사실은 target source; 분석은 두 입력의 파생물 | target `.harness/docs/` | 신규 구축 Phase 1에서 작성; 코드·입력이 바뀌면 재독해 | 이전 사실 보존 후 현재 source와 대조해 갱신 | current target source와 사용자 결정; 분석 문서는 근거 설명 | 계약상 Phase 1 산출물. H1의 실제 신규 실행에서 두 파일과 보조 문서가 기록됐으며 meta-repo에는 없음. **[RF][ARO]** |
| `team-spec.md` | persistent | 타겟 역할 inventory·책임·handoff의 정본 | target `.harness/docs/team-spec.md` | Phase 2 설계·사용자 확정 범위에서 갱신 | 재진입 시 역할 선택과 derived asset 비교의 기준 | `team-spec.md`가 agent/skill보다 우선; 사용자 승인 없이 선택 범위 변경 금지 | H1 runtime이 5개 역할의 Team Spec을 기록했다. 실제 derived asset과 대조는 Phase 3 쓰기 제한으로 미수행. **[RF][ARO]** |
| `.codex/config.toml`, `.codex/agents/*.toml`, `.agents/skills/*/SKILL.md` | derived, persistent execution configuration | `team-spec.md`와 `.codex-dist/skills/harness` 생성 계약 | target repository local | Phase 3/4 생성, 정렬 요청에서 갱신 | 재진입 때 inventory와 hash가 아니라 내용·역할 계약을 대조; 불일치는 audit | `team-spec.md`와 명시된 user scope | meta-repo target에는 여전히 없고 H1에서도 `.codex/agents`·`.agents/skills` 생성 시 `Read-only file system`으로 실패했다. **[RF][ARO]** |
| `.harness/docs/*` 운영·입력 문서 | persistent, 일부 derived | 각 문서는 target facts, team decisions 또는 운영 기준의 보조 원천 | target project files | 관련 Phase에서 부분 작성·갱신. 전부 한 번에 강제 생성하지 않음 | 재진입 시 해당 질문에 필요한 leaf만 읽음 | 설계 원천은 `team-spec`의 우선순위 및 current project facts | 현재 저장소의 `.harness/`는 생성기 평가 corpus이지 active project-local Harness가 아님. **[RF]** |
| `session-log.md` | observation | Harness 주 agent가 기록한 누적 session journal | target `.harness/logs/session-log.md` | 세션 진행·실패·환경 메모·사용자 결정 append/update | 해당 target의 실행 이력으로 읽되 현재 사실은 재관측 | current facts가 과거 기록보다 우선 | H1 runtime이 `harness-20261018-0445` 세션 1건을 실제 기록했다. Phase 0–2 completed, Phase 3 failed와 read-only 원인을 남김. 반복 append는 미관측. **[RF][ARO]** |
| `latest-session-summary.md` | observation + checkpoint | Harness가 남기는 최신 재진입 요약 | target `.harness/logs/latest-session-summary.md` | 종료·중단 시 최신 요약 갱신 | 다음 역할, 재진입 Phase, 우선 입력을 보존. 실제 산출물 증거와 대조해 상태 재계산 | current source/artifacts와 사용자 결정 | H1 runtime summary가 다음 Phase 3, `run_harness`, 실패 위험, Phase 6 미도달을 실제 기록했다. checkpoint는 완료를 증명하지 않는다. **[RF][ARO]** |
| Phase 6 사용자 판단 | pending은 persistent observation, 확정 결정은 user-owned state | `현재 유지 / 부분 수정 / 구조 재설계`의 선택과 범위는 사용자 | 대화; target logs/summaries에 보류·결정 근거를 기록 | Phase 6은 선택지 영향만 기록하고 Phase 7은 사용자 결정 이후 | 미결정이면 Phase 6에서 재개; 결정값과 범위를 다시 확인 | 명시적 최신 사용자 결정 | boundary test 3/3은 source 계약만 검증. 실제 Phase 6 도달 및 Phase 7 gate runtime 미관측. **[RF][SF]** |
| `.harness/evaluations/targets/*` | persistent observation corpus | 생성기 개발자는 타겟에서 읽은 평가 근거를 보존; 타겟 runtime state 아님 | meta repository의 Markdown corpus | 재평가 때 새 기록/재검토 메모 추가 | 역사 판정을 current runtime verdict로 쓰지 않음 | current user decision contract와 최신 source | `hakakorea_second_frontend` 2026-05-09 기록은 역사적 평가. **[RF][HE]** |

## Harness — 소유권, checkpoint, 실제 실행 관측

### Contract상 초기 실행과 재진입

- Phase 0은 `AGENTS.md`, `.codex/config.toml`, `.codex/agents/`, `.agents/skills/`, `.harness/docs/`, `.harness/logs/`를 확인해 `신규 구축 / 기존 확장 / 운영 유지보수`를 선택한다. target 파일이 없으면 Phase 1부터 시작한다.
- Phase 1의 `project-setup.md`는 사용자 입력과 보류 경계를 남기고, `domain-analysis.md`는 현재 target source와 사용자 입력으로 분석한다.
- Phase 2에서 `team-spec.md`가 역할 팀 정본이 된다. Phase 3/4는 agent·skill 파생 산출물을 만들고, Phase 5는 orchestration/handoff를 연결한다.
- Phase 6은 구조·계약 결과와 선택지별 영향을 준비해 `사용자 결정 대기`로 멈춘다. Phase 7 변경은 사용자가 선택한 구체 범위가 있을 때만 허용된다.
- `session-log.md`는 누적 journal이고 `latest-session-summary.md`는 최신 checkpoint다. 현재 session의 해석·도구 결과는 기록하기 전까지 ephemeral이다. missing artifact는 성공 근거로 채우지 않고 가장 이른 불완전 Phase를 다시 후보화한다.

이는 `.codex-dist/skills/harness/SKILL.md`, `references/initial-generation-contract.md`, `logging-contract.md`, `reentry-rules.md`, `team-spec-contract.md`에 명시된 구조다. 실제 생성→읽기→갱신→재진입 동작으로 확인한 결과와는 구분한다. **[RF]**

### Disposable target 관측

| run | target과 시작 상태 | 실제 명령·읽기/쓰기 | 상태 변경·중단 | 판정 |
| --- | --- | --- | --- | --- |
| H1-A 기본 home 시작 시도 | `/tmp/day4-state-harness-first.nPU1fp`; 최초 상태는 `README.md`, `package.json`, `src/index.mjs` 세 파일뿐. | `codex exec --json --ephemeral --sandbox workspace-write -C /tmp/day4-state-harness-first.nPU1fp -` (prompt stdin). | `/home/codechaser/.codex/state_5.sqlite` read-only 오류로 app-server 초기화 전에 종료. 이 시도는 target에 쓰지 않았다. | 첫 실행은 실패. 원인은 target이 아니라 기본 Codex home 상태 DB 접근이었다. **[HO][ARO]** |
| H1-B 격리 home 실제 실행 | 같은 H1 target, H1-A 뒤에도 프로젝트 입력 세 파일만 남아 있었음. | `CODEX_HOME=/tmp/day4-codex-home.8w60PS codex doctor`에서 격리 DB들의 integrity가 healthy임을 확인했다. `$HOME/.agents/skills/`의 `harness`, `github-agentic-loop`를 새 CODEX_HOME 아래 복사하고 `diff -qr`에서 차이가 없음을 확인했다. 이어 `CODEX_HOME=/tmp/day4-codex-home.8w60PS codex exec --json --ephemeral --sandbox workspace-write -C /tmp/day4-state-harness-first.nPU1fp -`로 실행해 Harness skill과 README/package/source를 읽었다. | `.harness/docs/`의 `exploration-notes.md`, `project-setup.md`, `logging-policy.md`, `domain-analysis.md`, `harness-architecture.md`, `team-structure.md`, `team-spec.md`와 `.harness/logs/session-log.md`, `latest-session-summary.md`를 생성·재독해. `.codex/agents`, `.agents/skills` 생성은 `Read-only file system`으로 실패. Phase 0–2 completed, Phase 3 진입 failed; Phase 4–6 미실행. | 격리 `CODEX_HOME`으로 DB 차단을 해결해 실제 persistence를 관측했다. 대상 하위 디렉터리의 읽기 전용 제한은 남아 있어 Phase 6까지 성공한 실행은 아니다. **[HO][ARO]** |
| H2 재진입 target 준비 | `/tmp/day4-state-harness-reentry.koF6L8`; 별도 `git init` target. project source는 H1에서 복사. `.harness/docs/`에 `project-setup.md`, `domain-analysis.md`, `harness-architecture.md`, `team-structure.md`, `team-spec.md`를 새로 seed했다. | `cp`와 `cat`으로 준비한 다섯 P1–2 문서는 각각 `Synthetic P1/P2 fixture seed`라고 표시한다. `rg --files --hidden --no-ignore`와 `git status --short`로 확인했다. | `.codex/agents/`, project-local `.agents/skills/`, `.harness/logs/`는 만들지 않았다. seed는 prior runtime output이 아니며 Team Spec 전체 schema validation도 하지 않았다. | P1–2 입력이 있는 별도 재진입용 **synthetic target 준비**는 됐지만 Harness에 읽히거나 재진입 phase를 실제 계산한 것은 아니다. **[HO]** |

두 번째 H1 실행 뒤 inventory와 `git status --short`로 9개 `.harness` 산출물이 지속된 것을 확인했다. H2는 계속 synthetic P1–2 seed target이며 실제 재진입 실행은 하지 않았다. 기존 repository source, installer, installed skill, settings와 local workflow log는 변경하지 않았다. **[HO][ARO]**

현재 callable collaboration surface에는 `close_agent`가 없다. H1 runtime preflight에서 subagent ID를 발급하지 않았고, 생성된 `session-log.md`와 `latest-session-summary.md` 양쪽에 실행 리소스 정리 `not_applicable (발급 subagent ID 0개)`가 실제 기록된 것을 재독해했다. 이는 추정이 아니라 **actual runtime observation [ARO]**이다.

## GitHub Agentic Loop — 순서, 파생 상태와 fail-closed

### 상태 관측과 owner 경계

`references/state-observation-contract.md`는 열린 PR을 먼저 찾고, 이어갈 PR 후보가 없을 때 열린 Issue를 보도록 한다. PR review feedback은 diff review thread와 resolved status에서 읽으며 일반 PR issue comment는 review feedback 정본이 아니다. 완료·미완료 조건은 GitHub에서 읽고, 날짜별 Workflow log 및 local 상태는 보조 근거다. 충돌하면 GitHub를 우선한다.

이번 actual read는 contract의 순서를 따랐다: 열린 PR `[]` → 열린 Issue #37 → 해당 Issue body/label/comments/checklist → local `.github-agentic-loop/settings.json` 및 최소 latest log. 따라서 과거 log의 PR #134 `OPEN` 기록이 현재 조회보다 우선하지 않는다. 실제 GH 상태 변경, Issue 생성/수정, comment, PR 생성 또는 thread 변경은 없었다. **[ARO]**

현재 Issue #37은 `정책검토` label, open status, unchecked follow-up만 확인됐다. 이 관측은 Issue의 텍스트를 읽은 것이며, #37의 workflow를 새로 시작하거나 evaluator next-action을 확정한 것은 아니다. 그 작업에는 추가 사용자 요청과 전체 evidence normalization이 필요하다. **[ARO][AJ]**

### Synthetic fixture/test와 실제 GitHub 관측 구분

| 증거 | 실행 결과 | 확인되는 범위 | 확인되지 않는 범위 |
| --- | --- | --- | --- |
| `[SF]` `node .codex-dist/skills/github-agentic-loop/tests/workflow-definition/all-fixtures.test.mjs` | 122 tests, 122 pass, 0 fail/cancel/skip | adapter의 missing/duplicate/wrong-source/malformed 입력 처리, evaluator의 missing fact로 인한 0개·복수 transition match 중단, `task_action_id` 기준 재개 등 현재 synthetic fixture 계약 | 현재 GitHub에서 후보 이슈/PR ambiguity를 수집해 멈추는 실제 skill flow, 사용자 답변 뒤 actual session resume |
| `[SF]` `node .codex-dist/skills/harness/tests/user-decision-boundary.test.mjs` | 3 pass, 0 fail | 현재 Harness 안내가 품질·범위 결정을 사용자에게 남기고 Phase 6 gate를 지키는지 | target에 로그를 쓴 후 다시 읽는 persistence, Phase 0→6 runtime |
| `[RF]` adapter/evaluator source | normalizer는 누락 fact를 임의 채우지 않고 가진 후보만 normalize; unknown/duplicate/conflicting/malformed evidence는 오류로 중단. evaluator는 zero/multiple rule match에서 `stopped` 반환 | 계산 경계가 외부 IO 없이 결정론적으로 동작하고 상태 입력을 바꾸지 않음 | 실제 GitHub observation layer의 모든 ambiguity가 이 evaluator test로 덮였다고 일반화할 수 없음 |

테스트 실행 성공은 synthetic input에 대한 repository verification이다. real GH observation은 읽기 전용 API 명령으로 확인했지만 missing/ambiguous live candidate, 실제 사용자 결정 후 새 세션의 재개는 이번에 실행하지 않았다. **[SF][ARO]**

## 지연 초기화, 중복, 충돌, 누락과 보존 범위

### 설정과 template

현재 source의 target bootstrap 계약은 `.github-agentic-loop/settings.json`을 Workflow Engine이 독점 소유한다고 정한다. 필요한 작업이 발생할 때 필요한 최상위 객체·필드만 lazy initialize하고 기존 유효 키를 보존한다. capability는 실제 probe와 `checkedAt`·`evidence`로 기록하고, user preference는 사용자 선택 후 기록한다. missing field는 즉시 오류가 아니지만 JSON parse 실패, 지원되지 않는 값·type은 자동 교정이나 fallback 없이 중단 후 수정된 값을 재관측한다. 같은 evidence와 선택을 반복 적용했을 때 추가 변경이 없어야 한다. **[RF]**

현재 파일은 저장소에 존재하며 `.workflow-engine/settings.json`은 현행 path가 아니다. 과거 Day 1/2의 `.workflow-engine/settings.json`은 당시·역사 path로만 기록한다. 현재 설정의 `checkedAt=2026-07-11`이 관측일보다 오래됐지만 계약에는 freshness TTL이 보이지 않는다. stale setting이 실제 잘못된 executor 선택을 만들었다는 증거는 없으므로 버그로 판정하지 않는다. **[RF][AJ]**

Issue template, PR template, GitHub label은 skill install 시 일괄 복사하지 않고 해당 workflow가 처음 필요로 할 때 감사·초기화한다. 기존 확장이나 conflict는 자동 overwrite하지 않고 사용자 판단/정해진 execution contract를 따른다. 이번 Issue #37의 label은 존재했으나 template bootstrap이나 label 변경은 수행하지 않았다. **[RF][ARO]**

### 같은 사실이 둘 이상 저장될 때

| 중복·차이 | 현재 우선순위와 안전 효과 | 남는 한계 |
| --- | --- | --- |
| GitHub 상태 ↔ 날짜별 local log | GitHub 우선. 오래된 open/merged snapshot이 next action을 지배하는 것을 막는다. | log는 사람이 잘못 current truth로 읽을 수 있다. 날짜·request ID와 보조 기록 표시가 필요하다. |
| `team-spec.md` ↔ generated agents/skills | `team-spec`이 role SoT, generated files는 derived. Phase 6이 역할 집합·포인터 drift를 감사한다. | 실제 mismatch repair가 자동인지 user-approved인지의 current runtime 경로는 미관측; contract는 무근거 overwrite를 허용하지 않는다. |
| source ↔ official installed copy | source가 다음 배포의 정본, installed tree는 현재 runtime snapshot. 현재 parity 18/18. | source 변경 후 재설치 전에는 drift 가능. 설치본 parity가 host가 어느 skill을 고르는지 증명하지 않는다. |
| GitHub checklist/body ↔ evaluator fact | raw GitHub evidence에서 fact를 다시 normalize하며 evaluator state를 저장소로 취급하지 않는다. | 관측 범위·field reference를 빠뜨리면 atomic stop 또는 후보 ambiguity가 남는다. |
| capability config ↔ 현재 도구 상태 | config에는 마지막 실제 관측/evidence가 남고 설정 자체는 보존된다. | freshness policy는 명시되지 않았다. config date가 오래됐다고 현재 capability를 단정할 수 없다. |
| 사용자 결정 ↔ log/checkpoint | Workflow decision은 확인된 사용자 입력과 subsequent GitHub reflection으로 연결한다. Harness Phase 6은 pending checkpoint를 남긴다. | 대화의 임시 문장만 있고 persisted target/GitHub reflection이 없으면 다음 세션이 그대로 복원된다고 보장할 수 없다. |

별도 공통 runtime schema, database, lock, source snapshot, receipt 계층은 현재 Day 4 근거에서 필요하다고 확인되지 않았다. Workflow 계산은 live observation과 순수 evaluator를, Harness는 semantic 판단과 target 문서를 쓰는 편이 각 owner 경계에 맞는다. **[AJ]**

## 실제 persistence·재진입 검증과 한계

| 항목 | 확인 결과 |
| --- | --- |
| Harness 최초 생성 | 기본 home 실행은 `state_5.sqlite` read-only 오류로 시작하지 못했다. 격리 `CODEX_HOME`으로 재실행한 H1은 Phase 0–2 산출물 7개 문서와 `session-log.md`, `latest-session-summary.md`를 실제 생성·재독해했다. Phase 3의 `.codex/agents`·`.agents/skills` 생성은 read-only 오류로 중단됐다. |
| Harness 재진입 | H2에 synthetic P1–2 seed는 준비했지만 실제 실행하지 않았다. H1의 실제 summary는 Phase 3 재진입을 가리킨다. H1 재진입, seed와 runtime output의 차이는 추가 검증이 필요하다. |
| Phase 6 gate | source contract와 boundary tests는 통과했다. H1이 Phase 3 진입에서 멈춰 실제 Phase 6 사용자 결정 checkpoint 및 Phase 7 차단은 **미관측**이다. |
| `close_agent` cleanup | callable tool이 없고 발급 ID가 0개였다. 두 H1 runtime 로그에 `not_applicable (발급 subagent ID 0개)`가 실제 기록돼 있음을 확인했다. ID가 있을 때의 cleanup 성공·실패 경로는 미관측이다. |
| Workflow live observation | PR-first / Issue-next read-only 관측 성공. 실제 workflow normalization/evaluation/next action 실행은 하지 않음. |
| Fail-closed / resume | synthetic tests는 missing/duplicate evidence와 zero/multiple evaluator match의 stop, task ID 재개 계약을 검증. live GitHub fail-closed와 사용자 결정 뒤 새 session resume는 **미관측**. |
| Persistence 기록 | H1의 target 문서와 로그는 프로세스 종료 뒤에도 target에 남았고 inventory로 확인했다. `--ephemeral` Codex thread의 다음 실행 간 복원은 검증하지 않았다. 본 보고서는 현재 조사 observation record이며 아직 commit 전이다. |

따라서 Harness는 H1의 Phase 0–2 artifact 및 중단 checkpoint persistence와 cleanup `not_applicable` 기록까지 실제 확인했다. Phase 3 이후, H2 재진입, Phase 6 user-decision gate는 여전히 미관측이다. 현재 GitHub 관측은 **[ARO]**, source contract는 **[RF]**, Day 3 discovery는 **[HE]**로 구분한다.

## File-change handoff readiness

현재 checkout에서 먼저 읽기 전용 readiness를 판정했다. global Harness installed skill은 존재하지만 target repository에 general Harness entry와 필요한 project-local `team-spec`·`orchestration-plan`·role assets가 없다. 따라서 현행 `target-harness-execution-contract.md` 기준으로 이 target은 `Target Harness 사용 불가`다. 같은 current session에서 실행하는 일반 파일 변경은 **`general_code_change`**를 시작 전 선택해야 한다. **[RF][HO]**

이 보고서 작성은 Workflow Engine structured handoff를 받은 `workflow-code-editor` 호출이 아니라 사용자가 직접 요청한 documentation task다. 관측한 준비도 판정은 `general_code_change`에 해당하며, 변경 실행을 시작한 뒤 다른 경로로 fallback하지 않았다. source contract 자체는 target Harness 준비도 실패를 실행 전 판정하고, 실행 시작 뒤 fallback하지 못하게 한다. 실제 structured request/result correlation은 이번 작업에서 실행하지 않았다. **[AJ]**

## Gap analysis — 영향과 안전 효과

| 후보/관찰 | 영향과 현재 안전 효과 | 분류 |
| --- | --- | --- |
| H1 신규 실행은 Phase 0–2에서 persistence 확인, Phase 3–6 및 H2 재진입 미관측 | 실제 target write와 checkpoint는 확인했지만 `.codex/agents`·`.agents/skills`의 `Read-only file system` 때문에 파생 자산 생성 및 후속 phase를 관찰하지 못했다. 코드 결함으로 단정할 근거는 없다. | **보류** — 해당 두 디렉터리가 writable한 승인된 disposable 실행 환경에서 H1 재진입·H2 재진입·Phase 6을 관측. 같은 sandbox 제한이면 더 진행하지 않음 |
| `close_agent` capability 부재 시 cleanup 기록 | 발급 subagent ID 0개에 대한 `not_applicable`이 H1의 두 로그에 실제 기록됐다. 로그가 capability 부재를 추정해 채운 것이 아니라 runtime preflight 결과와 일치한다. | **현재 수정 없음** — ID가 발급되는 환경의 성공·실패 cleanup 분기는 미관측 |
| current settings의 capability `checkedAt`이 2026-07-11 | 오래된 probe일 가능성은 있으나 current configured tools가 틀렸다는 증거는 없다. 갱신 TTL을 추가하면 재검사 비용과 capability semantics가 바뀐다. | **정책 검토 후보(조건부)** — 실제 stale capability로 잘못된 route/중단이 관측될 때 freshness 기준 결정 |
| Aug 9 local Workflow log와 현재 GH 상태 사이 시차 | 지금 contract처럼 GitHub를 먼저 읽으면 stale log가 동작을 지배하지 않는다. log를 current SoT로 오인하면 종료된 PR을 다시 처리하거나 open item을 놓칠 수 있다. | **현재 수정 없음** — 날짜·request 단위 보조 근거 유지; 실제 잘못된 resume이 발생하면 재검토 |
| open PR이 없을 때 Issue #37만 관측 | label/body/checklist/comments는 읽혔지만 이슈를 시작하는 사용자 요청은 없었다. Issue state를 읽는 것과 workflow action을 승인하는 것은 다르다. | **보류** — workflow 진행 요청과 unambiguous evidence가 있을 때 evaluate |
| GitHub missing/ambiguous live candidate, 결정 후 resume | source/tests의 합성 경계는 pass. 실제 GitHub lookup ambiguity와 fresh-session resume의 운영 실패/성공은 보이지 않았다. | **보류** — 실제 상태 유지 read-only scenario와 separate synthetic control로 검증 |
| 별도 lock/central state store 없음 | 현재 race나 중복 side effect는 관측되지 않았다. mutation 전후 live precondition/postcondition을 수행하는 계약이 있으며, lock 추가는 새로운 상태 owner·복구 규칙을 만든다. | **보류** — 동시 실행이 중복 side effect를 만든 사례 없이는 제안하지 않음 |
| 과거 `.codex/skills` legacy 및 backup archive가 현재 보이지 않음 | 현재 source/install 18/18과 legacy directory 부재가 확인됐다. cleanup이 언제 실행됐는지는 알 수 없지만 남은 archive를 잘못 다시 지울 필요도 없다. | **즉시 수정 없음** — 읽기 전용 관측 종료 |

### 변경 유형 요약

- **즉시 수정:** 현재 확인된 명백한 source·설정·runtime 오류 없음.
- **정책 검토:** configuration capability observation의 freshness를 요구할지 여부는 실제 stale-value 실패가 확인될 때 재논의한다. 현재 policy 변경은 제안하지 않는다.
- **기능 제안:** 현재 증거만으로 새 상태 저장소, 공통 runtime schema, lock service, trace database, Harness 실행기 또는 테스트 계층을 제안하지 않는다.
- **보류:** writable isolated Codex home은 준비됐지만 target의 `.codex/agents`·`.agents/skills`는 read-only다. 이 두 경로가 writable한 별도 승인 disposable 환경에서 H1/H2 재진입과 Phase 6, GitHub fail-closed 및 user-decision resume를 관측한다.

## Day 5로 넘길 idempotency·resume·recovery 조건

1. 격리 `CODEX_HOME` 상태 DB는 실제 `codex doctor`에서 healthy로 확인됐다. 남은 선행 조건은 target 내부 `.codex/agents`와 `.agents/skills`를 쓸 수 있는 승인된 disposable sandbox다. 기존 user home이나 mounted read-only 경로는 수정하지 않는다. 같은 제한이 재현되면 Phase 3 경계에서 멈춘다.
2. H1 fresh target과 H2 P1–2 target을 계속 분리한다. seed된 P1/P2 문서의 출처를 표시하고, generated `team-spec` 또는 logs와 섞지 않는다.
3. 각 실행 전·후 파일 inventory와 git 상태, selected installed path, 실제 read/write 경로, session id가 노출되는지, 중단 지점, target log의 cleanup 값을 비교한다. ID가 0이어도 `not_applicable`은 log에 실제 나타난 경우에만 관측으로 기록한다.
4. H1의 실제 최초 실행은 Phase 0–2까지 지속 상태를 남겼고, `latest-session-summary.md`는 Phase 3을 다음 재진입 지점으로 기록했다. writable target mount를 확보한 뒤 H1 재진입에서 기존 상태 보존·재계산을 확인하고, 사용자 선택은 대신하지 않은 채 Phase 6에서 멈춘다.
5. H2에는 synthetic P1–2 문서만 있다. 이 문서를 실제 prior runtime output으로 취급하지 말고, H1 재진입과 분리해 읽기·phase 선택 동작을 관찰한다. 누락/충돌 artifact의 처리 결과는 관측 뒤 기록한다.
6. Workflow는 매 주기 열린 PR을 먼저 읽고, 이어갈 PR이 없을 때 Issue를 읽은 뒤 최소 local state와 보조 log를 확인한다. live GitHub fact와 dated log가 충돌하면 GitHub가 우선하는지 실제로 남긴다.
7. Missing/ambiguous live evidence, synthetic fixture fail-closed, 사용자가 명시적으로 결정한 뒤의 resume을 서로 다른 세 관측으로 남긴다. fixture 통과를 live runtime 성공으로 대체하지 않는다.
8. file-change handoff는 실제 target-local Harness readiness를 실행 전에 판정한다. 지금처럼 준비되지 않은 target이면 `general_code_change`를 선택하고, 어떤 경로든 시작 후 다른 경로로 전환하지 않는다.
9. concurrency lock 또는 checkpoint 복제는 실제 중복 side effect, lost update 또는 재개 실패를 관측한 뒤에만 Day 5 후보로 올린다.

## Day 4 완료 조건 점검

- [x] 지정된 8개 문서와 current source·설정·현재 `.harness/` 평가 기록을 읽었다.
- [x] Runtime, persistent/ephemeral, SoT, derived, checkpoint, configuration, observation record, ownership 개념과 조사 순서를 제시했다.
- [x] 현재 source, official installed copy, legacy 후보와 installer backup root의 현재 상태를 다시 확인하고 Day 3 기록과 구분했다.
- [x] 두 Harness target을 별도 `/tmp` 경로에 준비했다. H2의 P1–2 문서는 synthetic seed로 명시했다.
- [x] 기본 home의 CLI 초기화 실패를 구분했고 격리 `CODEX_HOME`으로 H1 runtime을 실제 시작해 읽기·쓰기·중단 지점을 기록했다.
- [x] 열린 PR 조회 후 열린 Issue를 조회하고, 그 뒤 최소 local settings/log를 읽었다. GitHub 상태를 변경하지 않았다.
- [x] `close_agent` callable 여부를 확인하고 H1 로그의 실제 cleanup `not_applicable` 기록을 재독해했다.
- [x] current source/install/legacy 상태, settings, target `.harness`, generated assets, session state, daily log와 lock/marker 범위를 상태 표로 분류했다.
- [x] synthetic fixture/test 결과와 actual GitHub read-only 관측을 구분했다.
- [x] target-local Harness 미준비를 먼저 판정해 file-change handoff의 사전 경로가 `general_code_change`임을 기록했다.
- [x] H1 Phase 0–2 generated state, session log, latest checkpoint persistence를 확인했다.
- [ ] H1/H2 재진입 계산, Phase 3 이후 derived assets, Phase 6 사용자 결정 checkpoint는 target `.codex/agents`·`.agents/skills` read-only 제한으로 검증하지 못했다.
- [ ] 실제 GitHub missing/ambiguous candidate와 사용자 결정 후 fresh-session resume도 미관측이다.

## Day 종료 기록

### 오늘 새롭게 이해한 것

- persistence는 파일 유무가 아니라 질문별 owner와 충돌 우선순위로 이해해야 한다. GitHub Issue/PR은 협업 상태, `.github-agentic-loop/settings.json`은 설정, 날짜별 local log는 보조 관측 기록, evaluator state는 재계산되는 파생값이다.
- Harness의 `team-spec.md`는 역할 정의의 정본이고 agent/skill 자산은 파생물이다. `latest-session-summary.md`는 재진입 checkpoint지만 실제 산출물의 완료를 대신하지 않는다.
- 기본 Codex home의 read-only DB 문제는 격리 `CODEX_HOME`으로 해결할 수 있었다. 하지만 CLI DB가 writable해도 target의 `.codex/agents`와 `.agents/skills`가 writable하다는 뜻은 아니다. H1 runtime은 두 문제를 분리해 보여줬다.
- 사용자의 Phase 6 결정은 승인 전까지 pending이며, Phase 7은 결정과 범위가 저장·확인된 뒤에만 시작할 수 있다.

### 기존 생각이 바뀐 부분

- Day 3 legacy skill routing은 현재 상태가 아니다. 현재 `$HOME/.codex/skills`에는 legacy Harness/Workflow Engine이 없고 backup root도 비어 있다. Day 3은 당시 host의 역사적 관측으로 유지한다.
- local log가 오래됐다는 이유만으로 삭제·수정해야 하는 것은 아니다. current contract처럼 GitHub를 먼저 읽고 log를 보조 근거로 쓰면 stale history가 next action을 지배하지 않는다.
- cleanup `not_applicable`은 문서상 계약만 본 것이 아니라 H1의 실제 `session-log.md`와 `latest-session-summary.md`에서 확인했다. subagent ID가 0개였다는 runtime 근거와 함께 기록됐다.
- 최초 Codex CLI 호출은 시작 전 실패했지만 격리 `CODEX_HOME`으로 실행을 열 수 있었다. 그 다음 실패는 target의 특정 하위 디렉터리 쓰기 제한이었고, 이는 첫 오류와 다른 경계다.

### 저장소에서 확인한 근거

- Current source/install: `.codex-dist/skills/harness/**`, `.codex-dist/skills/github-agentic-loop/**`, `install.sh`, `$HOME/.agents/skills/**`.
- 설정·bootstrap: `.github-agentic-loop/settings.json`, `references/target-runtime-bootstrap-contract.md`.
- GitHub 상태 우선순위: `references/state-observation-contract.md`, 실제 `gh pr list` → `gh issue list` → `gh issue view 37` 결과.
- Harness SoT·checkpoint: `references/team-spec-contract.md`, `references/initial-generation-contract.md`, `references/logging-contract.md`, `references/reentry-rules.md`.
- Current local state: `.github-agentic-loop/logs/`의 2026-08-09 최신 log와 `.harness/evaluations/targets/hakakorea_second_frontend/2026-05-09-refresh-harness-meta.md` 과거 평가.
- Disposable H1 actual runtime: `/tmp/day4-state-harness-first.nPU1fp/.harness/docs/*`, `/tmp/day4-state-harness-first.nPU1fp/.harness/logs/session-log.md`, `latest-session-summary.md`; session ID `harness-20261018-0445`; `.codex/agents`·`.agents/skills` 생성 차단 확인.
- 합성 검증: Workflow fixture 122/122, Harness user-decision boundary 3/3.

### 현재 구조의 강점

- GitHub 정본과 local log의 보조 지위가 명시되어 오래된 상태를 재실행 근거로 쓰는 위험을 줄인다.
- normalized fact adapter와 pure evaluator가 결정론적 결과를 주며 missing/duplicate/multiple match에서 보수적으로 중단할 수 있다.
- Harness는 의미 구조를 기계 schema로 과도하게 합치지 않고, `team-spec`과 generated assets를 분리한다.
- user decision gate가 Phase 6과 Phase 7 사이의 권한 경계를 지킨다.
- 현재 official installed copy가 source와 18/18 parity이고, 과거 legacy 경로는 재삭제나 정돈 없이 읽기 전용으로 확인했다.

### 개선 후보

- `.codex/agents`와 `.agents/skills`를 쓸 수 있는 승인 disposable sandbox에서 H1 재진입, H2 seeded 재진입, Phase 6 checkpoint를 관측한다. 같은 경로가 계속 read-only면 실행을 그 경계에서 중단한다.
- capability settings의 stale observation을 현재 실행 전에 언제 재검증해야 하는지 실제 불일치 근거가 생길 때 검토한다.
- 실제 GH candidate ambiguity와 user-decision resume를 current session의 live observation으로 분리해 관측한다.

### 변경 유형 분류

- 즉시 수정: 없음.
- 정책 검토 필요: config freshness 기준은 실제 stale failure가 확인되기 전까지 열지 않는다.
- 기능 제안 필요: 새 state store·runtime schema·lock/trace service 제안 없음.
- 보류: H1의 Phase 3–6과 H2 재진입, ID가 발급되는 환경의 cleanup 분기, 실제 GitHub fail-closed/resume 관측.

### 남은 의문

1. H1의 두 번째 실행이 가능한 환경에서 기존 `session-log.md`에 새 기록을 append하고 `latest-session-summary.md`만 갱신하는가?
2. callable `close_agent`가 있어 ID가 발급되는 환경에서 cleanup 성공·실패 결과가 로그에 어떻게 기록되는가? 이번 H1에서는 ID가 0개여서 그 경로는 미관측이다.
3. 현재 settings의 capability `checkedAt`을 실행 직전 재검증할 freshness 기준이 필요한 실제 실패가 있는가?
4. 열린 PR이 없고 Issue 후보가 복수이거나 근거가 서로 맞지 않는 실제 GH 상태에서 Workflow Engine이 fail-closed하고 사용자 결정 이후 재조회·재개하는가?

### 다음 Day의 선행 조건

- 두 disposable target을 유지하고 target ownership 밖은 변경하지 않는다.
- H1은 Phase 2 checkpoint가 실제 생성됐고 다음 재진입이 Phase 3으로 기록돼 있다. H2는 synthetic P1–2 seed이므로 두 target의 문서와 로그를 섞지 않는다.
- target `.codex/agents`와 `.agents/skills`가 writable한 승인 격리 실행 환경을 확보한다. 현재 제한을 강제 권한이나 경로 변경으로 우회하지 않는다.
- 실제 run이 불가하면 blocked attempt로 남기고 fixture/test 결과를 runtime 성공으로 대체하지 않는다.
- Day 5는 같은 request 재실행, 부분 생성, 중단 후 재개, 설정 일부 누락, GitHub 중복 후보와 상태 재관측을 idempotency·recovery 관점으로 검증한다.
