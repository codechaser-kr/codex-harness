# Artifact Manifest 계약

이 문서는 thin 스킬 artifact의 기계적으로 검증 가능한 구조를 선언하는 manifest와 그 compiled representation의 실행 계약을 정의한다. artifact의 정책적 타당성, 추천 근거, 범위 적합성 같은 의미 판단은 `artifact-output-contract.md`와 각 전용 스킬이 계속 소유한다.

## Manifest 원천과 파일 경계

- `artifact-manifests/*.json`은 artifact별 필드 구조, 필수 여부, enum, cross-field rule과 renderer section 순서의 단일 machine-readable 원천이다.
- manifest 파일명은 `<artifact_type>.json`이고 `artifact_type`, `producer_skill`은 같은 thin 스킬 식별자를 사용한다.
- `artifact-output-contract.md`는 사용자에게 설명할 사용 가능 판정과 의미 규칙을 소유한다. 기계 규칙을 자연어 표에서 다시 구현하지 않는다.
- manifest와 Markdown 설명, producer skill reference의 drift 검출은 별도 회귀 테스트가 담당한다.

## Raw manifest 구조

manifest root는 다음 필드만 갖는 닫힌 객체다.

| 필드 | 의미 |
| --- | --- |
| `artifact_type` | kebab-case artifact 식별자 |
| `manifest_version` | manifest 문법 버전. 현재 값은 `1` |
| `producer_skill` | artifact를 만드는 thin 스킬 식별자 |
| `contract_section` | `artifact-output-contract.md`의 정확한 `###` section 제목 |
| `fields` | 최상위 artifact 필드 descriptor 배열 |
| `rules` | cross-field rule descriptor 배열 |
| `render` | 사용자 표시 순서 |

field descriptor는 `field_id`, `required`, `render_label`, `shape`만 갖는다. 같은 객체 안의 `field_id`는 고유해야 하며 `__proto__`, `prototype`, `constructor`는 사용할 수 없다. `shape.type`은 `string`, `integer`, `boolean`, `object`, `array` 중 하나다.

- `string`: 선택적으로 음이 아닌 `min_length`, 중복 없는 비어 있지 않은 string `enum_values`를 갖는다.
- `integer`: 선택적으로 integer `minimum`을 갖는다.
- `boolean`: 추가 shape 제약을 갖지 않는다.
- `object`: 비어 있지 않은 `fields`와 `additional_properties: false`를 갖는다.
- `array`: `items` shape와 선택적인 음이 아닌 integer `min_items`를 갖는다.

rule descriptor는 `rule_id`, `rule_type`, `source_path`, `target_path`와 선택적인 `allow_empty`를 갖는다. 현재 `rule_type`은 `unique_by`, `references`, `covers_exactly`를 허용하고 path는 `/`로 시작하는 JSON Pointer 형태다. `allow_empty: true`는 비어 있는 추천 ID를 허용하는 `references`에만 사용한다. manifest 구조 검증기는 rule 선언의 구조만 검증하고 실제 artifact에 대한 cross-field rule 실행은 artifact validator가 담당한다.

`render.section_order`는 최상위 `field_id`를 중복 없이 정확히 한 번씩 포함해야 한다. 이 순서는 artifact 의미를 검증하지 않으며 renderer가 검증 완료 artifact를 표시할 때만 사용한다.

## Compiled manifest 구조

compiler는 유효한 raw manifest를 다음 필드만 갖는 immutable compiled representation으로 준비한다.

| 필드 | 의미 |
| --- | --- |
| `artifact_type` | `compiled_artifact_manifest` 고정값 |
| `compiler_format_version` | compiled 표현 문법 버전 |
| `validator_version` | raw manifest validator 버전 |
| `source_digest` | 전체 raw manifest의 canonical SHA-256 digest |
| `contract_digest` | artifact 구조·rule·render 계약의 canonical SHA-256 digest |
| `compiled_digest` | compiled payload 전체의 canonical SHA-256 digest |
| `source_manifest` | 검증된 raw manifest의 독립 복제본 |
| `field_index` | 최상위 field 순서와 `field_id` lookup |
| `rule_plan` | rule 순서와 실행 준비 descriptor |
| `render_plan` | renderer section 순서 |

canonical 직렬화는 객체 key를 정렬하고 배열 순서를 보존한다. 따라서 JSON 객체 key 순서만 다른 입력은 같은 digest를 만들고, field·rule·render 순서 변경은 계약 변경으로 취급한다.

## Compile과 load 판정

- raw manifest가 닫힌 구조, 필수 필드, 타입, 식별자, 중복과 render 완전성 검증을 통과한 경우에만 compile한다.
- compile 실패는 `status: stopped`, `reason: invalid_artifact_manifest`와 stable `code`, JSON Pointer `path`, `message` 오류 배열을 반환한다.
- compiled candidate가 없으면 raw manifest를 compile한다.
- compiled candidate가 있으면 artifact type, compiler·validator version, source·contract·compiled digest와 deterministic representation을 모두 검증한다.
- 명시적으로 전달된 compiled candidate가 불일치하면 raw manifest로 자동 fallback하지 않고 `reason: invalid_compiled_artifact_manifest`로 fail closed한다.
- 성공한 compiled representation과 중첩 값은 모두 freeze하며 원본 raw manifest의 이후 변경과 격리한다.

## 런타임 책임 경계

manifest compiler와 loader는 변하지 않는 계약 준비만 담당한다. artifact validator는 artifact 값의 타입·필수 필드·enum과 cross-field rule을 검사하고 같은 입력에 같은 순서의 `code`, `path`, `message`를 반환한다. 구조 오류가 하나라도 있으면 의미 판단과 renderer 호출을 진행하지 않는다.

renderer는 validator가 성공한 structured artifact만 입력으로 받고 `render.section_order`와 각 field의 `render_label`에 따라 Markdown을 만든다. 빈 배열은 `없음`, 빈 string은 `N/A`로 표시하고, 배열·객체는 manifest field 순서를 보존한 목록으로 표시한다. renderer는 누락값을 생성하거나 값을 바꾸거나 정책·원인·범위의 의미를 판단하지 않는다. 같은 manifest와 artifact는 byte-stable Markdown을 반환한다.

artifact registry는 지원하는 12개 `artifact_type`의 manifest를 한 번 load·compile하고 process 안에서 immutable compiled manifest를 재사용한다. 누락·추가 manifest, 파일명과 `artifact_type` 불일치, parse·compile 오류가 있으면 registry 전체를 fail closed하며 일부 registry로 실행하지 않는다.

artifact runtime gate는 registry의 compiled manifest로 구조 검증과 renderer를 순서대로 실행한다. 성공 결과만 `artifact_type`, `contract_digest`, 입력의 immutable 독립 복제본 `value`, `rendered.content_type`, `rendered.output`을 가진 receipt로 반환한다. receipt는 현재 실행의 producer/consumer handoff이며 저장하거나 장기 재사용하는 receipt가 아니다. unknown artifact type, 구조 오류, stale compiled manifest에서는 `receipt: null`과 stable error를 반환하고 의미 판단이나 후속 소비를 호출하지 않는다.

compiled manifest는 의미 판단 결과나 GitHub 상태 변경 권한을 포함하지 않는다. `artifact-manifests/*.json`이 기계 규칙의 단일 원천이고 `artifact-output-contract.md`는 사용자 설명과 의미 판정을 소유한다. manifest의 `contract_section`, `producer_skill`, 최상위 `render_label`은 Markdown heading과 consumer skill 출력 이름에 대응하며, 회귀 테스트가 이 대응과 설치 tree 동일성을 검증한다.
