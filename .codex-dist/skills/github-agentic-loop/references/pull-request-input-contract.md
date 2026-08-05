# Pull Request 입력 계약

이 문서는 사용자가 확정한 Pull Request 제목과 본문을 PR 생성 직전까지 동일한 값으로 전달하기 위한
닫힌 immutable input과 결정론적 identity를 정의한다. PR 초안의 의미·template 판단은 `pr-proposal`,
PR 생성 요청값과 원격 상태 검증은 `pr-creation`의 책임이며, 이 계약은 두 작업 사이의 입력 무결성만
소유한다.

## 원본 입력

`preparePullRequestInput(input)`은 다음 다섯 필드만 가진 plain object를 받는다.

| 필드 | 형식 | 의미 |
| --- | --- | --- |
| `title` | blank가 아닌 string | 사용자가 확정한 `pr-proposal` 제목 |
| `body` | blank가 아닌 string | 사용자가 확정한 `pr-proposal` 본문 전체 |
| `base_branch` | blank가 아닌 string | 확정된 PR base branch |
| `head_branch` | blank가 아닌 string | 확정된 PR head branch |
| `related_issue` | 1 이상의 integer | PR 본문이 연결할 기준 이슈 번호 |

필드는 모두 필수다. 추가 필드, 배열, class instance, 잘못된 타입과 blank string은 허용하지 않는다.
`title`과 `body`는 확정된 문자열 자체이며 raw `pr-proposal` artifact나 renderer Markdown을 parse해서
복원하지 않는다.

## 준비된 입력과 identity

성공한 `preparePullRequestInput`은 `status=prepared`와 deep-frozen `pull_request_input`을 반환한다.
준비된 입력은 다음 필드를 선언 순서대로 가진다.

```text
input_type = validated_pull_request_input
format_version = 1
input_digest = sha256:<64 lowercase hex>
title
body
base_branch
head_branch
related_issue
```

`input_digest`는 `input_type`, `format_version`과 원본 입력 다섯 필드를 고정 순서 JSON payload로
직렬화한 SHA-256이다. 원본 객체의 key 순서는 identity에 영향을 주지 않으며 string과 배열처럼 값의
순서가 의미를 가지는 내용은 그대로 보존한다. 준비 과정은 원본 객체를 변경하거나 참조로 보관하지
않는다.

## load와 직렬화 경계

`loadPullRequestInput(input, { preparedInput })`은 현재 확정 원본 `input`과 저장·전달 후 다시 읽은
`preparedInput`을 함께 검증한다. `preparedInput`을 생략하면 현재 원본으로 새 immutable input을
준비하고 `preparation=prepared`를 반환한다. 값을 전달하면 닫힌 구조, type/version, digest 형식,
embedded 내용 digest와 현재 확정 원본 digest가 모두 같은 경우에만 `preparation=reused`로 로드한다.

JSON round-trip 후에도 같은 값을 로드할 수 있다. title, body, base/head branch, related issue,
type/version/digest의 변경, 필드 누락·추가, 직렬화 결과 대신 string 자체를 전달하는 경우에는 부분 입력을
채택하지 않는다.

## Fail-closed 결과

검증 실패는 `status=stopped`, `pull_request_input=null`, stable `reason`, `errors[].code`와 JSON pointer
`errors[].path`를 반환한다.

- 원본 오류: `reason=invalid_pull_request_input`, `pull_request_input.*`
- 준비된 입력 오류: `reason=invalid_prepared_pull_request_input`,
  `prepared_pull_request_input.*`
- 내용과 자기 digest 불일치: `prepared_pull_request_input.embedded_digest.mismatch`
- 현재 확정 원본과 identity 불일치: `prepared_pull_request_input.source_digest.mismatch`

오류가 하나라도 있으면 입력을 의미적으로 보정하거나 title/body를 template에서 다시 만들지 않고 PR 생성
실행을 시작하지 않는다.

## 책임 경계

- `pr-proposal`: 제목·본문의 내용, 저장소 template와 연관 이슈 문구를 제안하고 사용자 확정을 받는다.
- 이 계약: 확정된 title/body와 base/head/related issue를 immutable identity로 고정하고 전달 무결성을
  검사한다.
- `pr-creation`: 검증된 immutable input identity를 소비한다. 원격 branch와 기존 PR처럼 실행 시점에
  변하는 상태는 별도 live preflight에서 관측한다.

기존 `pr-proposal`과 `pr-creation` artifact manifest의 public field와 renderer output은 이 계약을
추가했다는 이유로 변경하지 않는다.
