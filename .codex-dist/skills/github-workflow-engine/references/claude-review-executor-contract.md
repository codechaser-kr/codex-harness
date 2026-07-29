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

## Claude 리뷰 실행 실패 판정 규칙

| 판정 상태                       | 판정 기준                                                                                                                                                                   | 재개 조건                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Claude 리뷰 실행 실패           | 선택된 `$cc:review --wait` 또는 `$cc:adversarial-review --wait` foreground 실행의 companion 명령 exit code가 `0`이 아니다.                                                  | companion stdout, exit code, stderr 출력이 기록된 상태다.                    |
| Claude CLI 재로그인 필요        | `Claude 리뷰 실행 실패`이고 출력에 `Failed to authenticate`, `401 Invalid authentication credentials`, `Invalid authentication credentials` 중 하나가 포함된다.             | 사용자가 Claude CLI 인증 복구 후 재개를 요청한 상태다.                       |
| Claude 리뷰 실행 재시도 필요    | `Claude 리뷰 실행 실패`이고 인증 실패 문구 없이 일시적인 네트워크 오류, socket 오류, rate limit, service unavailable 문구가 포함된다.                                       | 같은 리뷰 명령 재시도 사용자 결정이 있는 상태다.                             |
| Claude 리뷰 실행 원인 확인 필요 | `Claude 리뷰 실행 실패`이고 `Claude CLI 재로그인 필요` 또는 `Claude 리뷰 실행 재시도 필요` 판정 기준에 맞지 않는다.                                                         | 리뷰 실행 모드 유지 또는 다른 리뷰 실행 모드 선택 사용자 결정이 있는 상태다. |
