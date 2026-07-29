# Claude 리뷰 실행기 계약

`claude/*` 리뷰 실행 모드를 선택할 때 이 문서를 읽는다. 이 문서는 Workflow Engine 소유의
foreground 호출값, 실행 결과의 실패 판정과 재개 조건을 정의한다.

## Workflow Engine 호출 계약

| `task_action_id` | 논리 실행 모드 | 실제 호출 |
| --- | --- | --- |
| `FI-15` | `claude/code-review` | `$cc:review --wait --base <pr-base-branch> --scope branch` |
| `FI-16` | `claude/awesome-code-review` | `$cc:adversarial-review --wait --base <pr-base-branch> --scope branch` |

- 두 호출의 `--wait`는 Workflow Engine이 확정한 변경 불가능한 실행 제어값이다.
- 두 호출은 Workflow Engine 오케스트레이션과 같은 세션의 foreground 실행이며 결과가 반환될 때까지
  다음 전이를 평가하지 않는다.
- `--background`를 전달하거나 foreground/background 선택 질문을 추가하지 않는다.
- `$cc:review`와 `$cc:adversarial-review`는 각 스킬 계약에 따라 `--wait`를 Codex-side 실행
  제어값으로 처리하고 companion 명령에는 전달하지 않는다.
- 이 계약은 Workflow Engine의 `FI-15`와 `FI-16` 호출에만 적용한다. Workflow Engine 밖의
  `$cc:review`, `$cc:adversarial-review` 일반 호출 정책과 `FI-17`의
  `codex/awesome-code-review` 실행 방식은 변경하지 않는다.

## FI-16 의존성과 출력 계약

- `FI-16`의 `claude/awesome-code-review`는 논리 모드 이름이며 실제 실행기는 활성
  `sendbird/cc-plugin-codex`의 `$cc:adversarial-review`다.
- 실행 전 의존성은 Claude CLI 인증과 `$cc:setup`이 확인한 plugin·hook·companion 준비 상태다.
  Claude 환경 또는 Codex 전역의 외부 `awesome-code-review` 스킬에는 의존하지 않는다.
- `$cc:adversarial-review` companion stdout은 PR Review Template을 직접 보장하는 출력으로
  간주하지 않는다. Workflow Engine은 `review-runtime-contract.md`의 필수 섹션·필드에 맞게
  결과를 정규화하고 PR 번호와 head commit SHA에 연결한 뒤 Review Comment 입력으로 전달한다.
- 중요도, diff 위치, 문제, 영향, 권장 조치 또는 테스트 판단을 채울 수 없으면 Review Comment로
  전이하지 않고 누락 필드와 재개 조건을 산출한다.

## Claude 리뷰 실행 실패 판정 규칙

| 판정 상태                       | 판정 기준                                                                                                                                                                                                                                                                                                                                                                                                       | 재개 조건                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Claude 리뷰 실행 실패           | 선택된 `$cc:review --wait` 또는 `$cc:adversarial-review --wait` foreground 실행의 companion 명령 exit code가 `0`이 아니다.                                                                                                                                                                                                                                                                                       | companion stdout, exit code, stderr 출력이 기록된 상태다.                    |
| Claude CLI 재로그인 필요        | `Claude 리뷰 실행 실패`이고 companion stdout·stderr에 `Claude Code CLI is not authenticated`, `Run \`claude auth login\``, `Failed to authenticate`, `401 Invalid authentication credentials`, `Invalid authentication credentials` 중 하나가 포함되거나, 실패 직후 `$cc:setup` machine-readable probe가 `auth.available: false` 또는 `auth.loggedIn: false`를 보고한다.                                                | 사용자가 Claude CLI 인증 복구 후 재개를 요청한 상태다.                       |
| Claude 리뷰 실행 재시도 필요    | `Claude 리뷰 실행 실패`이고 실패 직후 `$cc:setup`이 인증 가능 상태를 유지하며 일시적인 네트워크 오류, socket 오류, rate limit, service unavailable 문구가 포함된다.                                                                                                                                                                                                       | 같은 리뷰 명령 재시도 사용자 결정이 있는 상태다.                             |
| Claude 리뷰 실행 원인 확인 필요 | `Claude 리뷰 실행 실패`이고 실패 직후 `$cc:setup`이 인증 가능 상태를 유지하며 `Claude CLI 재로그인 필요` 또는 `Claude 리뷰 실행 재시도 필요` 판정 기준에 맞지 않는다.                                                                                                                                                                                                     | 리뷰 실행 모드 유지 또는 다른 리뷰 실행 모드 선택 사용자 결정이 있는 상태다. |

- `$cc:review`와 `$cc:adversarial-review` 스킬은 resolved companion 명령 실패를 다른 Claude CLI
  호출로 대체하지 않고 그대로 반환한다. companion의 top-level wrapper 오류는 stderr에 기록되므로
  위 wrapper 문구를 직접 판정 근거로 사용할 수 있다.
- raw Claude 오류 문구가 companion 경계에서 바뀌거나 누락되더라도 실패 직후 `$cc:setup`의
  구조화된 인증 상태를 함께 확인한다. 따라서 재로그인 판정은 raw 문구 보존에만 의존하지 않는다.
