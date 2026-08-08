# Markdown Derived Index 계약

이 문서는 content-addressed observation snapshot의 GitHub Issue·PR body에서 heading, section value,
checkbox와 issue/PR reference를 한 번 파싱해 공유하는 immutable derived index의 구조와 identity를
정의한다. 이 index는 raw body를 대체하지 않고 body digest와 parser version에 종속된 파생값이다.

## 원본 입력

`prepareMarkdownDerivedIndex(input)`은 다음 세 필드만 가진 닫힌 plain object를 받는다.

| 필드 | 의미 |
| --- | --- |
| `body` | snapshot의 GitHub source에서 선택한 raw Markdown body |
| `body_digest` | raw body의 `sha256:` digest |
| `parser_version` | 현재 runtime이 지원하는 parser version |

`body_digest`는 `body`의 실제 SHA-256과 일치해야 하며 `parser_version`은 runtime 상수
`MARKDOWN_DERIVED_INDEX_PARSER_VERSION`과 같아야 한다. 추가 필드, 지원하지 않는 parser version과
digest 불일치는 index 준비 전에 거부한다.

## 파싱 규칙

파서는 LF와 CRLF body를 line 단위로 읽고 source line과 column은 1부터 센다. fenced code block과
inline code span 안의 Markdown token은 index에 넣지 않는다.

- ATX heading `#`부터 `######`까지 level, text와 line을 기록한다.
- section은 heading 다음 line부터 다음 ATX heading 직전까지다. `value`는 HTML comment를 제거하고
  바깥 공백을 trim한 문자열이며 빈 section은 빈 문자열이다.
- `- [ ]`, `- [x]`, `- [X]`와 같은 unordered-list checkbox는 checked 상태, text, line, column과
  가장 가까운 앞 heading index를 기록한다.
- `#번호`는 `issue_or_pull_request`, GitHub `/issues/번호` URL은 `issue`, `/pull/번호` URL은
  `pull_request` reference로 기록한다. 바로 앞 keyword가 `Ref` 또는 `Refs`면 relationship은 `refs`,
  아니면 `mention`이다.
- heading 전 token의 `heading_index`는 `null`이다. 배열 순서는 source line·column 순서를 보존한다.

파서는 GitHub의 실제 issue/PR 상태, reference 대상 존재 여부, template 의미와 section 사용 가능 여부를
판정하지 않는다. 이런 의미와 live state는 Workflow Engine과 실행 직전 preflight가 소유한다.

## 준비된 index와 identity

성공 결과는 `status=prepared`, `preparation=prepared`와 다음 닫힌 `markdown_index`를 반환한다.

```text
index_type = markdown_derived_index
format_version = 1
index_digest = sha256:<64 lowercase hex>
body_digest
parser_version
headings[]
sections[]
checkboxes[]
references[]
```

`index_digest`는 type/version, body digest, parser version과 모든 derived array를 고정 field 순서의
JSON으로 직렬화한 SHA-256이다. body key order 같은 표현이 없으므로 동일 body digest와 parser version은
byte-stable identity를 만든다. body 또는 parser version이 바뀌면 새 identity가 필요하다.

index와 모든 nested record·array는 deep-frozen이며 입력 객체 참조를 보관하거나 변경하지 않는다.

## Load와 fail-closed

`loadMarkdownDerivedIndex(input, { preparedIndex })`는 현재 body/parser input과 JSON round-trip을 거친
prepared index를 함께 검증한다. 준비된 값이 없으면 새 index를 준비한다. 전달된 index는 닫힌 root와
nested shape, type/version, digest 형식, embedded digest와 현재 input digest가 모두 같은 경우에만
`status=loaded`, `preparation=reused`로 반환한다.

오류는 `status=stopped`, `markdown_index=null`, stable `reason`, `errors[].code`와 JSON Pointer
`errors[].path`를 반환한다.

- 원본 오류: `invalid_markdown_derived_index_input`, `markdown_derived_index_input.*`
- 준비된 구조 오류: `invalid_prepared_markdown_derived_index`, `prepared_markdown_derived_index.*`
- 준비된 내용과 자기 digest 불일치: `prepared_markdown_derived_index.embedded_digest.mismatch`
- 현재 body/parser input과 identity 불일치: `prepared_markdown_derived_index.source_digest.mismatch`

오류가 하나라도 있으면 일부 section, 이전 index 또는 raw 자유 형식 fallback을 사용하지 않는다.
self-consistent tampering도 current input으로 다시 준비한 identity와 다르면 거부한다.

## 책임 경계

- index는 raw GitHub body의 파생 구조이며 observation snapshot의 `input_snapshot_digest`나 live state를
  대체하지 않는다.
- C1 core는 단일 body의 prepare/load와 parsing만 소유한다. evaluation-cycle cache와 state adapter·thin
  skill consumer 공유는 `FE129-2-C2` runtime이 소유한다.
- section value의 정책 의미, checkbox 완료 fact, reference 연결 대상, 사용자 결정과 Workflow 전이는
  index에 저장하지 않는다.
- GitHub live state가 index, snapshot 또는 로그와 충돌하면 GitHub live state가 우선한다.
