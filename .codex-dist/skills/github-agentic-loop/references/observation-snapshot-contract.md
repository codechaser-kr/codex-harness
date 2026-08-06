# Observation Snapshot 계약

이 문서는 한 Workflow 평가 주기에서 GitHub·local 원본 관측을 공유하기 위한 content-addressed immutable
snapshot의 구조, identity와 직렬화 경계를 정의한다. Markdown derived index, review diff position map,
repository profile과 평가 주기 cache는 별도 후속 계층이며 이 계약은 그 입력이 되는 raw observation만
소유한다.

## 원본 입력

`prepareObservationSnapshot(input)`은 `repository`, `captured_at`, `sources`만 가진 닫힌 plain object를
받는다. `repository`는 blank가 아닌 저장소 식별자이고 `captured_at`은 ISO UTC timestamp다. `sources`는
비어 있지 않은 배열이며 각 원소는 다음 닫힌 필드를 가진다.

| 필드 | 의미 |
| --- | --- |
| `source_type` | `github_issue`, `github_pull_request`, `local_repository` 중 하나 |
| `source_identifier` | snapshot 안에서 source type과 함께 고유한 조회 대상 식별자 |
| `github_updated_at` | GitHub source의 live `updatedAt`; local source는 `null` |
| `body_digest` | Issue·PR body의 `sha256:` digest; local source는 `null` |
| `base_sha`, `head_sha` | PR base/head Git object ID. Issue에는 둘 다 없고 local source는 `head_sha`만 사용 |
| `worktree_state_digest` | local worktree 상태의 `sha256:` digest; GitHub source는 `null` |
| `observed_value` | 해당 조회에서 얻은 비어 있지 않은 plain JSON object |

Issue는 `github_updated_at`과 `body_digest`, PR은 두 값과 `base_sha`·`head_sha`, local source는
`head_sha`와 `worktree_state_digest`가 필수다. 적용되지 않는 필드는 명시적 `null`이다. source identity
중복, 추가 필드, class instance, cyclic value, non-finite number와 `__proto__`·`constructor`·`prototype`
key는 허용하지 않는다.

GitHub source의 `observed_value.body`와 `observed_value.updatedAt`은 각각 `body_digest`와
`github_updated_at`의 원본이어야 한다. PR의 `observed_value.baseRefOid`·`headRefOid`는 base/head SHA와
일치해야 한다. local source의 `observed_value.head`와 raw `observed_value.worktree`는 각각 `head_sha`와
`worktree_state_digest`에 일치해야 한다. envelope metadata와 raw observation이 불일치하면 snapshot을
준비하지 않는다.

## 준비된 snapshot과 identity

성공한 준비 결과는 `status=prepared`, `preparation=prepared`와 deep-frozen
`observation_snapshot`을 반환한다. snapshot은 다음 필드를 선언 순서대로 가진다.

```text
snapshot_type = content_addressed_observation_snapshot
format_version = 1
input_snapshot_digest = sha256:<64 lowercase hex>
repository
captured_at
sources
```

`sources`는 `source_type`, `source_identifier` 순으로 canonical sort하고 `observed_value` object key는
재귀적으로 정렬한다. 배열 순서는 원본 의미 순서를 보존한다. `input_snapshot_digest`는 type/version,
repository, captured time과 canonical sources 전체를 고정 순서 JSON으로 직렬화한 SHA-256이다. 원본
객체의 key 또는 source 배열 순서는 identity에 영향을 주지 않지만 관측값·시간·GitHub/local baseline의
변경은 새 identity를 만든다.

준비 과정은 원본 객체 참조를 보관하거나 변경하지 않는다. snapshot과 nested source·observed value는
모두 deep-frozen이다.

## Load와 fail-closed

`loadObservationSnapshot(input, { preparedSnapshot })`은 현재 원본과 JSON round-trip을 거친 준비된
snapshot을 함께 검증한다. `preparedSnapshot`이 없으면 현재 원본으로 새 snapshot을 준비한다. 전달된
snapshot은 닫힌 구조, type/version, digest 형식, embedded 내용 digest와 현재 원본 digest가 모두 같은
경우에만 `status=loaded`, `preparation=reused`로 반환한다.

오류는 `status=stopped`, `observation_snapshot=null`, stable `reason`, `errors[].code`와 JSON Pointer
`errors[].path`를 반환한다.

- 원본 오류: `invalid_observation_snapshot_input`, `observation_snapshot_input.*`
- 준비된 입력 오류: `invalid_prepared_observation_snapshot`, `prepared_observation_snapshot.*`
- 준비된 내용과 자기 digest 불일치: `prepared_observation_snapshot.embedded_digest.mismatch`
- 현재 원본과 identity 불일치: `prepared_observation_snapshot.source_digest.mismatch`

오류가 하나라도 있으면 일부 source, 이전 snapshot 또는 raw 자유 형식 값을 fallback으로 사용하지 않는다.

## 책임 경계

- 이 snapshot은 원본 관측을 immutable identity에 묶는다. state adapter의 fact 정규화나 의미 판단을 하지 않는다.
- `github_updated_at`, body digest, PR base/head SHA, local HEAD·worktree 상태는 snapshot의 baseline이지 실행
  직전 live preflight 대체물이 아니다.
- GitHub live state가 snapshot, profile 또는 로그와 충돌하면 GitHub live state가 우선한다.
- Markdown parsing, diff mapping, repository convention과 artifact·decision receipt 저장·재사용은 이
  계약에 포함하지 않는다.
