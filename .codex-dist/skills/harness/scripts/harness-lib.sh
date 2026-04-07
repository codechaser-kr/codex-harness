#!/usr/bin/env bash
# 이 파일은 소싱 전용입니다. 직접 실행하지 마세요.

trim_text() {
  local value="$1"
  value="${value//$'\t'/ }"
  value="${value//$'\n'/ }"
  value="${value//$'\r'/ }"
  printf '%s' "$value" | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//'
}

join_by_comma() {
  local delimiter=", "
  local result=""
  local item

  for item in "$@"; do
    if [ -z "$result" ]; then
      result="$item"
    else
      result="$result$delimiter$item"
    fi
  done

  printf '%s\n' "$result"
}

join_by_plus() {
  local delimiter=" + "
  local result=""
  local item

  for item in "$@"; do
    if [ -z "$result" ]; then
      result="$item"
    else
      result="$result$delimiter$item"
    fi
  done

  printf '%s\n' "$result"
}

has_stack_manifest() {
  [ -f "package.json" ] \
    || [ -f "Cargo.toml" ] \
    || [ -f "pyproject.toml" ] \
    || [ -f "requirements.txt" ] \
    || [ -f "go.mod" ] \
    || [ -f "pom.xml" ] \
    || [ -f "build.gradle" ] \
    || [ -f "build.gradle.kts" ] \
    || [ -f "settings.gradle" ] \
    || [ -f "settings.gradle.kts" ] \
    || [ -f "Makefile" ] \
    || [ -f "CMakeLists.txt" ] \
    || [ -f "composer.json" ] \
    || [ -f "Gemfile" ]
}

detect_project_type() {
  if [ -f "package.json" ]; then
    echo "node"
    return
  fi

  if [ -f "Cargo.toml" ]; then
    echo "rust"
    return
  fi

  if [ -f "pyproject.toml" ] || [ -f "requirements.txt" ]; then
    echo "python"
    return
  fi

  if [ -f "go.mod" ]; then
    echo "go"
    return
  fi

  if [ -f "pom.xml" ] || [ -f "build.gradle" ] || [ -f "build.gradle.kts" ] || [ -f "settings.gradle" ] || [ -f "settings.gradle.kts" ]; then
    echo "java"
    return
  fi

  if [ -f "Makefile" ] || [ -f "CMakeLists.txt" ]; then
    echo "cpp"
    return
  fi

  if [ -f "composer.json" ]; then
    echo "php"
    return
  fi

  if [ -f "Gemfile" ]; then
    echo "ruby"
    return
  fi

  echo "unknown"
}

detect_stack_hint() {
  local hints=()

  [ -f "package.json" ] && hints+=("Node.js")
  [ -f "Cargo.toml" ] && hints+=("Rust")
  [ -f "pyproject.toml" ] && hints+=("Python")
  [ -f "requirements.txt" ] && hints+=("Python")
  [ -f "go.mod" ] && hints+=("Go")
  ([ -f "pom.xml" ] || [ -f "build.gradle" ] || [ -f "build.gradle.kts" ] || [ -f "settings.gradle" ] || [ -f "settings.gradle.kts" ]) && hints+=("Java")
  ([ -f "build.gradle" ] || [ -f "build.gradle.kts" ] || [ -f "settings.gradle" ] || [ -f "settings.gradle.kts" ]) && hints+=("Gradle")
  [ -f "Makefile" ] && hints+=("Make")
  [ -f "CMakeLists.txt" ] && hints+=("CMake")
  [ -f "composer.json" ] && hints+=("PHP")
  [ -f "Gemfile" ] && hints+=("Ruby")
  [ -f "tsconfig.json" ] && hints+=("TypeScript")
  [ -f "vite.config.ts" ] && hints+=("Vite")
  [ -f "next.config.js" ] && hints+=("Next.js")
  [ -f "next.config.mjs" ] && hints+=("Next.js")

  if [ "${#hints[@]}" -eq 0 ]; then
    echo "추정 불가"
    return
  fi

  local IFS=", "
  echo "${hints[*]}"
}

detect_project_signal_level() {
  if has_stack_manifest; then
    echo "stack"
    return
  fi

  local first_signal_path
  first_signal_path="$(
    find . -mindepth 1 -maxdepth 2 \
      ! -path './.git' ! -path './.git/*' \
      ! -path './.codex' ! -path './.codex/*' \
      ! -path './.harness' ! -path './.harness/*' \
      ! -name '.gitignore' \
      ! -name '.DS_Store' \
      -print -quit
  )"

  if [ -n "$first_signal_path" ]; then
    echo "low"
    return
  fi

  echo "empty"
}

detect_structure_hint() {
  local hints=()
  local candidate

  for candidate in src app lib cmd internal pkg packages services server client web api backend frontend docs tests test; do
    if [ -d "$candidate" ]; then
      hints+=("$candidate/")
    fi
  done

  if [ -f "README.md" ]; then
    hints+=("README.md")
  fi

  if [ "${#hints[@]}" -eq 0 ]; then
    echo "뚜렷한 핵심 디렉토리 없음"
    return
  fi

  local limited=("${hints[@]:0:5}")
  local IFS=", "
  echo "${limited[*]}"
}

has_react_signal() {
  grep -Rqs '"react"' . \
    --include='package.json' \
    --exclude-dir='.git' \
    --exclude-dir='.codex' \
    --exclude-dir='.harness' \
    --exclude-dir='node_modules' \
    --exclude-dir='.yarn'
}

has_electron_signal() {
  grep -Rqs '"electron\(\\|-builder\)\?"' . \
    --include='package.json' \
    --exclude-dir='.git' \
    --exclude-dir='.codex' \
    --exclude-dir='.harness' \
    --exclude-dir='node_modules' \
    --exclude-dir='.yarn'
}

detect_package_manager() {
  if [ -f ".yarnrc.yml" ] || [ -f ".pnp.cjs" ] || [ -f ".pnp.loader.mjs" ]; then
    echo "Yarn 4 PnP"
    return
  fi

  if [ -f "yarn.lock" ]; then
    echo "Yarn"
    return
  fi

  if [ -f "pnpm-lock.yaml" ]; then
    echo "pnpm"
    return
  fi

  if [ -f "package-lock.json" ]; then
    echo "npm"
    return
  fi

  if [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
    echo "bun"
    return
  fi

  echo "추정 불가"
}

detect_workspace_packages() {
  local packages=()
  local root
  local dir

  for root in packages apps libs services; do
    [ -d "$root" ] || continue

    for dir in "$root"/*; do
      [ -d "$dir" ] || continue
      packages+=("$dir")
    done
  done

  if [ "${#packages[@]}" -eq 0 ]; then
    echo "추정 불가"
    return
  fi

  local limited=("${packages[@]:0:5}")
  join_by_comma "${limited[@]}"
}

list_workspace_packages() {
  local packages=()
  local root
  local dir

  for root in packages apps libs services; do
    [ -d "$root" ] || continue

    for dir in "$root"/*; do
      [ -d "$dir" ] || continue
      packages+=("$dir")
    done
  done

  [ "${#packages[@]}" -eq 0 ] && return
  printf '%s\n' "${packages[@]:0:5}"
}

detect_config_hints() {
  local hints=()

  [ -f "package.json" ] && hints+=("package.json")
  [ -f "tsconfig.json" ] && hints+=("tsconfig.json")
  [ -f ".yarnrc.yml" ] && hints+=(".yarnrc.yml")
  [ -f "vite.config.ts" ] && hints+=("vite.config.ts")
  [ -f "vite.config.js" ] && hints+=("vite.config.js")
  [ -f "next.config.js" ] && hints+=("next.config.js")
  [ -f "next.config.mjs" ] && hints+=("next.config.mjs")
  [ -f "pom.xml" ] && hints+=("pom.xml")
  [ -f "build.gradle" ] && hints+=("build.gradle")
  [ -f "build.gradle.kts" ] && hints+=("build.gradle.kts")
  [ -f "Makefile" ] && hints+=("Makefile")
  [ -f "CMakeLists.txt" ] && hints+=("CMakeLists.txt")
  [ -f "composer.json" ] && hints+=("composer.json")
  [ -f "Gemfile" ] && hints+=("Gemfile")
  [ -f "electron-builder.yml" ] && hints+=("electron-builder.yml")

  if [ "${#hints[@]}" -eq 0 ]; then
    echo "추정 불가"
    return
  fi

  local limited=("${hints[@]:0:5}")
  join_by_comma "${limited[@]}"
}

build_project_type_label() {
  local signal_level="$1"
  local project_type="$2"

  case "$signal_level" in
    empty)
      echo "미정"
      return
      ;;
    low)
      echo "단서가 제한적인 프로젝트"
      return
      ;;
  esac

  case "$project_type" in
    node)
      local descriptors=()

      has_react_signal && descriptors+=("React")
      has_electron_signal && descriptors+=("Electron")

      if [ -d "packages" ] || [ -d "apps" ]; then
        if [ "${#descriptors[@]}" -gt 0 ]; then
          echo "$(join_by_plus "${descriptors[@]}") 기반 모노레포"
        else
          echo "Node 기반 모노레포"
        fi
      else
        if [ "${#descriptors[@]}" -gt 0 ]; then
          echo "$(join_by_plus "${descriptors[@]}") 기반 애플리케이션"
        else
          echo "Node 기반 애플리케이션"
        fi
      fi
      ;;
    rust)
      echo "Rust 프로젝트"
      ;;
    python)
      echo "Python 프로젝트"
      ;;
    go)
      echo "Go 프로젝트"
      ;;
    java)
      if [ -d "modules" ] || [ -d "services" ]; then
        echo "Java 기반 멀티모듈 프로젝트"
      else
        echo "Java 기반 애플리케이션"
      fi
      ;;
    cpp)
      echo "C/C++ 프로젝트"
      ;;
    php)
      echo "PHP 프로젝트"
      ;;
    ruby)
      echo "Ruby 프로젝트"
      ;;
    *)
      echo "구조 분석이 필요한 프로젝트"
      ;;
  esac
}

build_key_axes_hint() {
  local signal_level="$1"
  local structure_hint="$2"
  local axes=()

  if [ "$signal_level" = "empty" ]; then
    echo "미정"
    return
  fi

  if [ "$signal_level" = "low" ]; then
    echo "$structure_hint"
    return
  fi

  ([ -d "packages" ] || [ -d "apps" ]) && axes+=("워크스페이스 패키지")
  has_react_signal && axes+=("웹 UI")
  has_electron_signal && axes+=("데스크톱 셸")
  ([ -d "packages/common" ] || [ -d "common" ]) && axes+=("공용 컴포넌트/유틸리티")
  ([ -d "tests" ] || [ -d "test" ] || [ -f "vitest.config.ts" ] || [ -f "jest.config.js" ]) && axes+=("테스트/빌드")

  if [ "${#axes[@]}" -eq 0 ]; then
    echo "$structure_hint"
    return
  fi

  join_by_comma "${axes[@]}"
}

build_core_flow_hint() {
  case "$1" in
    empty)
      echo "미정"
      ;;
    low)
      echo "저장소 단서가 제한적이므로 README, 핵심 디렉토리, 사용자 확인 질문을 함께 보며 첫 성공 흐름을 정리해야 합니다."
      ;;
    *)
      case "$2" in
        node)
          echo "package.json과 $3 기준으로 애플리케이션 진입점, 주요 모듈, 실행 또는 빌드 흐름을 우선 정리해야 합니다."
          ;;
        rust)
          echo "Cargo.toml과 $3 기준으로 크레이트 진입점, 명령 실행 흐름, 주요 모듈 연결을 우선 정리해야 합니다."
          ;;
        python)
          echo "Python 설정 파일과 $3 기준으로 실행 진입점, 패키지 구조, 핵심 스크립트 흐름을 우선 정리해야 합니다."
          ;;
        go)
          echo "go.mod와 $3 기준으로 main 패키지, 내부 패키지 연결, 실행 흐름을 우선 정리해야 합니다."
          ;;
        java)
          echo "빌드 설정 파일과 $3 기준으로 애플리케이션 진입점, 모듈 경계, 실행 또는 테스트 흐름을 우선 정리해야 합니다."
          ;;
        cpp)
          echo "빌드 스크립트와 $3 기준으로 바이너리 진입점, 라이브러리 경계, 컴파일 흐름을 우선 정리해야 합니다."
          ;;
        php)
          echo "composer.json과 $3 기준으로 엔트리포인트, 프레임워크 구조, 의존성 경계를 우선 정리해야 합니다."
          ;;
        ruby)
          echo "Gemfile과 $3 기준으로 애플리케이션 구조, 실행 태스크, 핵심 도메인 경계를 우선 정리해야 합니다."
          ;;
        *)
          echo "$3 기준으로 저장소의 핵심 사용자 흐름과 주요 변경 영향 지점을 우선 정리해야 합니다."
          ;;
      esac
      ;;
  esac
}

build_initial_observation() {
  local signal_level="$1"
  local structure_hint="$2"
  local workspace_hint="${3:-}"
  local config_hint="${4:-}"

  case "$signal_level" in
    empty)
      echo "- 저장소를 분석한 뒤 이 내용을 구체화하세요."
      ;;
    low)
      echo "- 현재 저장소 단서가 제한적이므로 구조 단서와 사용자 응답을 함께 모아 초기 분석을 보강하세요."
      ;;
    *)
      if [ "$workspace_hint" = "추정 불가" ]; then
        echo "- 자동 재분석 결과: $structure_hint, $config_hint 단서를 기준으로 첫 분석 초안을 만들었습니다."
      else
        echo "- 자동 재분석 결과: $workspace_hint, $config_hint 단서를 기준으로 첫 분석 초안을 만들었습니다."
      fi
      ;;
  esac
}

classify_workspace_path() {
  local path="$1"
  local name
  name="$(basename "$path")"

  case "$name" in
    *common*|*shared*|*ui*|*design*|*core*)
      echo "공용 패키지 또는 공유 유틸리티 후보"
      ;;
    *desktop*|*electron*)
      echo "데스크톱 셸 또는 배포 패키지 후보"
      ;;
    *web*|*front*|*client*|*site*)
      echo "웹 애플리케이션 패키지 후보"
      ;;
    *api*|*server*|*backend*|*service*)
      echo "백엔드 또는 서비스 패키지 후보"
      ;;
    *test*|*qa*)
      echo "테스트 또는 검증 보조 패키지 후보"
      ;;
    *)
      echo "주요 워크스페이스 패키지 후보"
      ;;
  esac
}

build_structure_fact_block() {
  local signal_level="$1"
  local structure_hint="$2"
  local workspace_hint="$3"
  local package_manager_hint="$4"
  local config_hint="$5"
  local workspace_path

  case "$signal_level" in
    empty|low)
      return
      ;;
  esac

  if [ "$workspace_hint" != "추정 불가" ]; then
    while IFS= read -r workspace_path; do
      [ -n "$workspace_path" ] || continue
      printf '%s\n' "- \`$workspace_path\`: $(classify_workspace_path "$workspace_path")."
    done < <(list_workspace_packages)
  fi

  [ -d "src" ] && printf '%s\n' "- \`src/\`: 애플리케이션 핵심 소스 디렉토리 후보입니다."
  [ -d "app" ] && printf '%s\n' "- \`app/\`: 엔트리포인트 또는 라우팅 중심 디렉토리 후보입니다."
  [ -d "docs" ] && printf '%s\n' "- \`docs/\`: 운영 또는 설계 문서 단서가 모이는 디렉토리입니다."
  [ -d "tests" ] && printf '%s\n' "- \`tests/\`: 독립 테스트 시나리오 또는 검증 흐름 단서가 있습니다."
  [ -d "test" ] && printf '%s\n' "- \`test/\`: 테스트 보조 코드 또는 시나리오 단서가 있습니다."
  [ "$package_manager_hint" = "추정 불가" ] || printf '%s\n' "- 패키지 관리는 \`$package_manager_hint\` 단서가 확인됩니다."
  [ "$config_hint" = "추정 불가" ] || printf '%s\n' "- 주요 설정 단서: \`$config_hint\`."
  printf '%s\n' "- 현재 자동 분석 기준의 주요 구조 단서는 \`$structure_hint\` 입니다."
}

build_execution_flow_block() {
  local project_type="$1"
  local structure_hint="$2"
  local workspace_hint="$3"

  case "$project_type" in
    node)
      printf '%s\n' "- \`package.json\` 기반으로 실행, 빌드, 테스트 스크립트가 첫 진입점이 될 가능성이 높습니다."
      has_react_signal && printf '%s\n' "- React 단서가 있으므로 화면 진입점, 라우팅, 상태 관리 경계를 함께 읽어야 합니다."
      has_electron_signal && printf '%s\n' "- Electron 단서가 있으므로 메인/프리로드/렌더러 또는 패키징 흐름을 별도 축으로 봐야 합니다."
      [ "$workspace_hint" = "추정 불가" ] || printf '%s\n' "- 워크스페이스 패키지 간 의존 관계를 따라가며 변경 영향 범위를 먼저 정리해야 합니다."
      ;;
    rust)
      printf '%s\n' "- \`Cargo.toml\`과 \`src/\` 기준으로 바이너리 또는 라이브러리 진입점을 먼저 확인해야 합니다."
      printf '%s\n' "- 크레이트 경계와 feature 조합이 실제 실행 흐름을 바꿀 수 있으므로 이를 함께 기록해야 합니다."
      ;;
    python)
      printf '%s\n' "- Python 설정 파일과 패키지 디렉토리 기준으로 엔트리포인트 스크립트와 핵심 모듈을 먼저 확인해야 합니다."
      printf '%s\n' "- CLI, 서비스, 배치 중 어떤 실행 모델인지 먼저 구분해야 분석 품질이 올라갑니다."
      ;;
    go)
      printf '%s\n' "- \`go.mod\`와 \`cmd/\`, \`internal/\`, \`pkg/\` 구조를 기준으로 바이너리 진입점과 내부 패키지 경계를 먼저 읽어야 합니다."
      ;;
    java)
      printf '%s\n' "- \`pom.xml\`, \`build.gradle\`, \`build.gradle.kts\` 같은 빌드 설정 파일을 기준으로 모듈 경계와 실행 태스크를 먼저 확인해야 합니다."
      printf '%s\n' "- \`src/main\`, \`src/test\`, 멀티모듈 구조 여부가 실제 변경 영향 범위를 크게 좌우합니다."
      ;;
    cpp)
      printf '%s\n' "- \`Makefile\` 또는 \`CMakeLists.txt\` 기준으로 바이너리 타깃, 라이브러리 구성, 컴파일 흐름을 먼저 확인해야 합니다."
      printf '%s\n' "- 헤더와 구현 파일 경계, 빌드 옵션, 플랫폼별 조건부 빌드가 핵심 위험 지점이 됩니다."
      ;;
    php)
      printf '%s\n' "- \`composer.json\` 기준으로 의존성, 오토로딩, 프레임워크 진입점을 먼저 확인해야 합니다."
      printf '%s\n' "- 웹 요청 진입점과 CLI 태스크가 함께 있으면 두 흐름을 분리해 기록해야 합니다."
      ;;
    ruby)
      printf '%s\n' "- \`Gemfile\` 기준으로 런타임 의존성과 실행 태스크를 먼저 확인해야 합니다."
      printf '%s\n' "- Rails, Rack, 순수 Ruby 스크립트 중 어떤 실행 모델인지 구분해야 분석 품질이 올라갑니다."
      ;;
    *)
      printf '%s\n' "- \`$structure_hint\` 단서를 따라 핵심 사용자 흐름과 주요 변경 경계를 먼저 정리해야 합니다."
      ;;
  esac
}

build_harness_interest_block() {
  local signal_level="$1"
  local workspace_hint="$2"
  local key_axes_hint="$3"

  case "$signal_level" in
    empty|low)
      return
      ;;
  esac

  [ "$workspace_hint" = "추정 불가" ] || printf '%s\n' "- 패키지 또는 애플리케이션 경계를 흐리지 않는 변경 분류"
  printf '%s\n' "- \`$key_axes_hint\` 축에서 영향도가 큰 영역 식별"
  has_react_signal && printf '%s\n' "- 화면 구조, 상태 관리, 공용 컴포넌트 변경의 결합도 파악"
  has_electron_signal && printf '%s\n' "- 데스크톱 셸과 웹 코드 사이의 경계 및 배포 영향 범위 확인"
  [ -d "tests" ] || [ -d "test" ] && printf '%s\n' "- 기존 테스트 경로와 실제 검증 비용을 같이 고려한 역할 분리"
}

build_risky_change_block() {
  local signal_level="$1"
  local workspace_hint="$2"

  case "$signal_level" in
    empty|low)
      return
      ;;
  esac

  printf '%s\n' "- 진입점 설정 파일과 빌드 설정 변경"
  [ "$workspace_hint" = "추정 불가" ] || printf '%s\n' "- 워크스페이스 패키지 export 경로 또는 의존 관계 변경"
  has_react_signal && printf '%s\n' "- 라우팅, 전역 상태, 공용 UI 계층 변경"
  has_electron_signal && printf '%s\n' "- Electron 패키징, 업데이트, 메인/렌더러 경계 변경"
  [ -d "tests" ] || [ -d "test" ] && printf '%s\n' "- 테스트 픽스처 또는 공용 검증 유틸리티 변경"
}

build_open_question_block() {
  local signal_level="$1"
  local project_type="$2"
  local workspace_hint="$3"

  case "$signal_level" in
    empty)
      cat <<EOF
- 프로젝트 유형과 첫 성공 흐름은 사용자 확인이 필요합니다.
- 저장소 단서가 없으므로 기술 스택과 운영 제약도 아직 확정할 수 없습니다.
EOF
      ;;
    low)
      cat <<EOF
- README와 디렉토리 이름만으로는 실제 사용자 흐름을 확정하기 어렵습니다.
- 가장 먼저 분석해야 할 대표 진입점 파일을 사용자 또는 후속 역할이 지정해야 합니다.
EOF
      ;;
    *)
      if [ "$project_type" = "node" ] && [ "$workspace_hint" != "추정 불가" ]; then
        cat <<EOF
- 워크스페이스별 실제 책임 경계와 주력 패키지는 추가 확인이 필요합니다.
- 빌드/배포/테스트 중 어디가 가장 비싼 검증 축인지 후속 분석이 필요합니다.
EOF
      else
        cat <<EOF
- 자동 분석만으로는 핵심 사용자 흐름과 실패 비용을 완전히 확정할 수 없습니다.
- 대표 진입점 파일과 영향도가 큰 변경 경계는 후속 역할이 보강해야 합니다.
EOF
      fi
      ;;
  esac
}

build_domain_report_detail_block() {
  local signal_level="$1"
  local project_type="$2"
  local structure_hint="$3"
  local package_manager_hint="$4"
  local workspace_hint="$5"
  local key_axes_hint="$6"
  local config_hint="$7"
  local discovery_guidance="$8"
  local initial_observation_line="$9"
  local next_step_detail_line="${10}"

  case "$signal_level" in
    empty|low)
      cat <<EOF
## 분석 관점

이 문서는 현재 저장소를 하네스 관점에서 이해하기 위한 출발점입니다.

우선 다음을 정리해야 합니다.

- 이 저장소가 해결하려는 문제는 무엇인가
- 주요 사용자 또는 개발자 흐름은 무엇인가
- 어떤 품질 문제가 반복적으로 발생할 수 있는가
- 하네스가 우선적으로 다뤄야 할 핵심 축은 무엇인가

## 초기 질문

- 이 프로젝트는 애플리케이션인가, 라이브러리인가, 도구인가
- 핵심 기능은 어디에 모여 있는가
- 변경 시 영향이 큰 영역은 어디인가
- 검토를 자동화하거나 구조화할 가치가 큰 흐름은 무엇인가

## 사용자 확인 질문

- 저장소 단서만으로 판단이 어렵다면, 이 프로젝트는 애플리케이션, 라이브러리, 도구 중 무엇인가
- 가장 먼저 성공해야 할 사용자 또는 개발자 흐름은 무엇인가
- 선호하는 언어, 프레임워크, 런타임 제약이 있는가

## 질문 유도 메모

$discovery_guidance

## 초기 관찰 내용

$initial_observation_line

## 다음 단계

- 저장소 단서가 약하면 run-harness가 위 질문부터 사용자에게 짧게 확인합니다.
$next_step_detail_line
- 필요하면 디렉토리별 역할과 핵심 파일을 추가로 정리합니다.
EOF
      ;;
    *)
      cat <<EOF
## 사실 기준 구조

$(build_structure_fact_block "$signal_level" "$structure_hint" "$workspace_hint" "$package_manager_hint" "$config_hint")

## 핵심 실행 흐름

$(build_execution_flow_block "$project_type" "$structure_hint" "$workspace_hint")

## 하네스 관점 핵심 관심사

$(build_harness_interest_block "$signal_level" "$workspace_hint" "$key_axes_hint")

## 반복적으로 위험한 변경 유형

$(build_risky_change_block "$signal_level" "$workspace_hint")

## 초기 관찰 내용

$initial_observation_line

## 아직 열려 있는 질문

$(build_open_question_block "$signal_level" "$project_type" "$workspace_hint")

## 다음 단계

$next_step_detail_line
- qa-designer와 orchestrator가 위 구조와 흐름을 기준으로 후속 문서를 구체화합니다.
- 필요하면 대표 디렉토리와 핵심 파일 단위로 분석 해상도를 올립니다.
EOF
      ;;
  esac
}

build_architecture_report_block() {
  local signal_level="$1"
  local project_type_label="$2"
  local key_axes_hint="$3"
  local workspace_hint="$4"
  local core_flow_hint="$5"

  case "$signal_level" in
    empty|low)
      cat <<EOF
## 목적

이 문서는 현재 저장소에 어떤 범용 하네스 구조를 둘지 정의합니다.

## 권장 역할

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator

## 역할별 책임

### domain-analyst
- 저장소 목적과 도메인 파악
- 기술 스택과 핵심 흐름 분석
- 하네스 관점의 주요 관심사 정리

### harness-architect
- 로컬 하네스 구조 설계
- 역할 분리와 확장 방향 정의
- 스킬/리포트/시나리오 구성 제안

### skill-scaffolder
- 로컬 스킬 생성 및 보완
- 구조와 스킬의 일관성 유지

### qa-designer
- 품질 기준과 검토 관점 정의
- 체크포인트와 검토 흐름 정리

### orchestrator
- 여러 역할을 실제 작업 순서로 연결
- 반복 가능한 작업 흐름 정의

### validator
- 현재 하네스 구조가 최소 요건을 만족하는지 점검

## 설계 원칙

- 특정 프레임워크에 과도하게 고정하지 않는다.
- 사람이 읽고 수정할 수 있는 구조를 우선한다.
- 생성기와 프로젝트 로컬 산출물을 분리한다.
- 이후 프로젝트 특화 하네스로 확장할 수 있어야 한다.

## 다음 단계

- skill-scaffolder가 현재 구조를 실제 파일로 유지/보완합니다.
- qa-designer와 orchestrator가 이 구조를 운영 가능한 흐름으로 연결합니다.
EOF
      ;;
    *)
      cat <<EOF
## 목적

이 문서는 현재 저장소의 실제 구조와 변경 경계를 바탕으로 실행 하네스 역할을 어떻게 배치할지 정리합니다.

## 저장소 특성 요약

- 프로젝트 성격: $project_type_label
- 핵심 작업 축: $key_axes_hint
- 대표 흐름 가설: $core_flow_hint
EOF
      [ "$workspace_hint" = "추정 불가" ] || printf '%s\n' "- 워크스페이스 단서: $workspace_hint"
      cat <<EOF

## 권장 역할

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator
- run-harness

## 역할별 초점

### domain-analyst
- 실제 코드 경로와 워크스페이스 책임 경계를 구체화합니다.
- 자동 분석 초안이 놓친 핵심 사용자 흐름과 영향 범위를 보정합니다.

### harness-architect
- $key_axes_hint 축을 기준으로 역할 책임과 출력 문서를 정렬합니다.
- 변경 영향이 큰 경계를 중심으로 하네스 확장 포인트를 정합니다.

### skill-scaffolder
- 역할 스킬 설명이 현재 저장소 구조와 맞도록 유지합니다.
- 반복적으로 다루는 패키지/디렉토리 기준을 스킬 입력과 출력에 반영합니다.

### qa-designer
- 영향도가 큰 경계와 고비용 검증 흐름을 QA 질문 세트로 번역합니다.
- 기능 변경과 구조 변경을 구분한 검토 기준을 정리합니다.

### orchestrator
- 작업 시작점을 사용자 요청 종류와 영향 범위에 따라 분기합니다.
- 웹, 공용 패키지, 데스크톱 또는 빌드 흐름처럼 성격이 다른 작업을 다른 루프로 연결합니다.

### validator
- 프로젝트 특화 분석이 제네릭 초안으로 회귀하지 않았는지 확인합니다.
- 역할 문서와 운영 문서가 실제 저장소 구조를 반영하는지 점검합니다.

## 설계 원칙

- 역할은 저장소 구조보다 추상적이어야 하지만, 저장소 경계를 무시하면 안 됩니다.
- 핵심 작업 축이 많은 저장소일수록 역할 수를 늘리기보다 역할 판단 기준을 선명하게 둡니다.
- 자동 재생성 결과라도 실제 저장소 단서를 반영한 분석이 먼저 와야 합니다.
- 프로젝트 특화 판단이 필요한 부분은 후속 역할이 보강할 수 있게 열어 둡니다.

## 다음 단계

- skill-scaffolder가 역할 설명과 입력/출력 파일을 현재 구조 기준으로 다듬습니다.
- qa-designer와 orchestrator가 위 경계와 흐름을 운영 문서에 반영합니다.
EOF
      ;;
  esac
}

build_qa_report_block() {
  local signal_level="$1"
  local key_axes_hint="$2"
  local workspace_hint="$3"

  case "$signal_level" in
    empty|low)
      cat <<EOF
## 목적

이 문서는 저장소에서 중요하게 봐야 할 품질 기준과 검토 지점을 정리합니다.

## 기본 관점

범용 하네스 1차 단계에서는 다음을 우선합니다.

- 저장소 구조를 이해할 수 있는가
- 역할이 분리되어 있는가
- 생성된 하네스 산출물이 사람이 검토 가능한가
- 로컬 스킬 구성이 반복 사용에 적합한가

## 검토 질문

- 이 저장소에서 가장 중요한 실패 유형은 무엇인가
- 어떤 영역은 변경 영향도가 큰가
- 어떤 흐름은 반복적으로 점검할 가치가 있는가
- 어떤 산출물이 있으면 팀이 더 쉽게 검토할 수 있는가

## 체크포인트 예시

- 도메인 분석 리포트가 실제 저장소와 맞는가
- 하네스 역할 정의가 과하거나 부족하지 않은가
- 스킬 설명이 충분히 명확한가
- 오케스트레이션 계획이 실제 작업 흐름과 연결되는가

## 다음 단계

- 프로젝트별로 expected-state, diff, scenario 실행 전략이 필요해지면 이 문서를 확장합니다.
EOF
      ;;
    *)
      cat <<EOF
## 목적

이 문서는 현재 저장소에서 변경 영향이 큰 경계와 반복 검증이 필요한 흐름을 QA 관점으로 정리합니다.

## 핵심 품질 축

- $key_axes_hint
EOF
      [ "$workspace_hint" = "추정 불가" ] || printf '%s\n' "- 워크스페이스 경계와 패키지 간 영향 전파"
      has_react_signal && printf '%s\n' "- 화면 상태, 라우팅, 공용 UI 계층의 정합성"
      has_electron_signal && printf '%s\n' "- 데스크톱 셸, 패키징, 배포 경로의 분리 검증"
      ([ -d "tests" ] || [ -d "test" ]) && printf '%s\n' "- 테스트 픽스처와 공용 검증 유틸리티의 안정성"
      cat <<EOF

## 우선 검토 질문

- 이번 변경이 어떤 작업 축을 건드리는가
- 변경 범위가 단일 패키지인지, 공용 경계까지 전파되는가
- 빌드/테스트/배포 중 어떤 검증 경로를 반드시 다시 확인해야 하는가
- 자동화보다 사람이 직접 봐야 하는 결합 지점은 어디인가

## 체크포인트 예시

- 도메인 분석과 오케스트레이션 계획이 실제 저장소 구조를 반영하는가
- 역할 스킬 설명이 현재 프로젝트의 경계와 흐름을 충분히 드러내는가
- 영향이 큰 패키지나 공용 계층 변경 시 QA 질문이 더 구체적으로 보강되는가
- 무거운 검증 경로와 가벼운 검증 경로가 구분되어 운영되는가

## 다음 단계

- qa-designer가 대표 실패 유형과 고비용 검증 경로를 더 세분화합니다.
- validator가 구조 문서와 QA 문서 사이의 연결이 약한 지점을 다시 확인합니다.
EOF
      ;;
  esac
}

build_orchestration_report_block() {
  local signal_level="$1"
  local key_axes_hint="$2"
  local next_step_detail_line="$3"

  case "$signal_level" in
    empty|low)
      cat <<EOF
## 목적

이 문서는 여러 하네스 역할이 실제로 어떤 순서와 방식으로 협력해야 하는지 정리합니다.

## 기본 흐름

1. domain-analyst가 저장소를 분석한다.
2. harness-architect가 하네스 구조를 설계한다.
3. skill-scaffolder가 로컬 스킬과 기본 산출물을 정리한다.
4. qa-designer가 품질 전략과 검토 지점을 정의한다.
5. orchestrator가 반복 가능한 작업 흐름을 정리한다.
6. validator가 현재 구성이 최소 요건을 만족하는지 점검한다.

## 운영 원칙

- 먼저 분석하고, 그 다음 구조를 만든다.
- 구조를 만든 뒤 품질 관점을 붙인다.
- 역할 간 책임이 겹치지 않게 한다.
- 결과물은 사람이 쉽게 검토할 수 있어야 한다.

## 확장 방향

이 범용 하네스는 이후 다음으로 확장될 수 있습니다.

- 프로젝트 특화 하네스
- expected-state 구조
- diff 전략
- 시나리오 실행 연결
- 자동 검증 파이프라인

## 메모

이 문서는 현재 저장소의 실제 작업 흐름에 맞게 계속 수정되어야 합니다.
EOF
      ;;
    *)
      cat <<EOF
## 목적

이 문서는 현재 저장소에서 어떤 요청이 들어왔을 때 어떤 역할을 먼저 움직여야 하는지 운영 흐름으로 정리합니다.

## 시작 분기

이 섹션은 각 요청이 표준 전체 시퀀스 어디서 시작해야 하는지 정하는 진입점 규칙입니다.

1. run-harness가 요청이 기능 구현, 구조 정리, 공통 모듈 보강, 빌드/검증 보강 중 어디에 가까운지 먼저 분류합니다.
2. 변경이 $key_axes_hint 중 어느 축에 걸리는지 판단합니다.
3. 영향 범위가 넓거나 경계가 불명확하면 domain-analyst와 qa-designer부터 시작합니다.
4. 영향 범위가 좁고 구조 설명이 이미 충분하면 skill-scaffolder 또는 orchestrator부터 시작할 수 있습니다.
5. 시작 분기는 표준 전체 시퀀스의 일부 단계를 생략하는 규칙이 아니라, 어느 역할을 진입점으로 먼저 세울지 정하는 규칙입니다.

## 표준 전체 시퀀스

이 섹션은 모든 보강이 필요할 때 기준선으로 삼는 전체 순서입니다.

1. domain-analyst가 실제 코드 경로와 변경 경계를 재확인합니다.
2. harness-architect가 현재 역할 구조가 이번 변경 유형을 충분히 설명하는지 봅니다.
3. skill-scaffolder가 필요한 스킬 설명과 템플릿을 보강합니다.
4. qa-designer가 이번 축에 맞는 검토 질문과 체크포인트를 보강합니다.
5. orchestrator가 작업 시작 루프와 검증 루프를 정리합니다.
6. validator가 산출물이 다시 제네릭 초안으로 후퇴하지 않았는지 확인합니다.

## 순서 조정 규칙

- 시작 분기에서 뒤쪽 역할을 진입점으로 선택하더라도, 앞 단계의 판단이 이미 충분한 경우에만 일부 단계를 건너뜁니다.
- 구조 설명이 낡았거나 generic하면 domain-analyst부터 다시 시작해 표준 전체 시퀀스로 복귀합니다.
- 공용 경계나 다중 모듈 영향이 보이면 qa-designer와 validator를 뒤로 미루지 않습니다.

## 운영 원칙

- 작은 변경도 공용 경계나 빌드 경계를 건드리면 별도 검증 루프로 올립니다.
- 문서 재생성은 기존 문장을 보존하는 것보다 실제 저장소 분석을 반영하는 것을 우선합니다.
- 역할 호출 순서는 고정이 아니라 영향 범위와 검증 비용을 기준으로 조정합니다.

## 다음 단계

$next_step_detail_line
- orchestrator가 요청 유형별 시작 루프를 더 구체적인 예시로 보강합니다.
- validator가 실제 운영 흐름과 문서 흐름의 불일치를 다시 잡아냅니다.
EOF
      ;;
  esac
}

build_team_structure_report_block() {
  local signal_level="$1"
  local key_axes_hint="$2"

  case "$signal_level" in
    empty|low)
      cat <<EOF
## 목적

이 문서는 현재 프로젝트의 로컬 실행 하네스를 역할 팀 관점에서 설명합니다.

## 팀 구성

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator
- run-harness

## 설명

이 역할들은 각각 독립적인 판단 단위를 가지며,
함께 프로젝트 실행 하네스를 구성합니다.
EOF
      ;;
    *)
      cat <<EOF
## 목적

이 문서는 현재 저장소의 핵심 작업 축을 어떤 역할 팀이 나눠서 다뤄야 하는지 설명합니다.

## 팀 구성

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator
- run-harness

## 역할 팀 해석

- domain-analyst: $key_axes_hint 축에서 실제 코드 경계와 사용자 흐름을 읽는 역할
- harness-architect: 구조와 역할 책임을 저장소 특성에 맞게 재배치하는 역할
- skill-scaffolder: 로컬 스킬과 템플릿을 현재 저장소 운영 기준에 맞추는 역할
- qa-designer: 영향도가 큰 경계와 검증 비용을 QA 관점으로 번역하는 역할
- orchestrator: 요청 종류별 시작 루프와 보강 루프를 연결하는 역할
- validator: 제네릭 산출물 회귀와 역할 연결 약화를 잡아내는 역할
- run-harness: 현재 상태를 보고 어떤 역할부터 움직일지 결정하는 진입점
EOF
      ;;
  esac
}

build_team_playbook_report_block() {
  local signal_level="$1"
  local key_axes_hint="$2"
  local next_step_detail_line="$3"

  case "$signal_level" in
    empty|low)
      cat <<EOF
## 목적

이 문서는 프로젝트 로컬 실행 하네스 팀을 실제로 어떻게 시작하고 운용할지 요약합니다.

## 시작 순서

1. 기본적으로는 run-harness를 실행 하네스 팀의 진입점으로 사용합니다.
2. run-harness가 현재 상태를 보고, 저장소 단서가 약하면 사용자 확인 질문부터 정리하고, 단서가 충분하면 필요한 역할을 우선순위로 정합니다.
3. 새 프로젝트라면 domain-analyst부터 시작하는 흐름을 우선합니다.
4. 구조가 이미 있다면 orchestrator / validator 중심의 보강 루프를 우선합니다.

## 기본 운영 원칙

- 문서보다 역할 팀을 본체로 봅니다.
- \`.harness/reports\` 문서는 팀이 공유하는 보조 기준으로 사용합니다.
- 빈 저장소이거나 저장소 단서가 약하면 역할 호출보다 사용자 확인 질문을 먼저 남깁니다.
- validator 피드백이 나오면 architect / scaffolder / orchestrator가 다시 보강합니다.
- QA 질문이 약하면 qa-designer를 다시 호출해 보강합니다.
- 중요한 역할 호출이나 흐름 변경은 session-log에 남깁니다.

## 로그 운영

- 로그 정책은 \`.harness/logging-policy.md\`에서 확인합니다.
- 역할별 누적 기록은 \`.harness/logs/session-log.md\`에 남깁니다.
- 구조화된 이벤트 원장은 \`.harness/logs/session-events.tsv\`를 사용합니다.
- 최신 세션 요약은 \`.harness/logs/latest-session-summary.md\`에서 확인합니다.
- 역할 호출 빈도 집계는 \`.harness/logs/role-frequency.md\`에서 확인합니다.
- 반복 업무 템플릿 후보 분석 결과는 \`.harness/reports/template-candidates.md\`에서 확인합니다.

## 운영 메모

- 작은 프로젝트는 역할을 줄일 수 있습니다.
- 복잡한 프로젝트는 orchestrator 중심 운영이 중요합니다.
- 이후 프로젝트 특화 실행 하네스로 확장할 수 있습니다.
EOF
      ;;
    *)
      cat <<EOF
## 목적

이 문서는 현재 저장소의 실제 변경 경계를 기준으로 실행 하네스 팀을 어떻게 시작하고 되돌릴지 요약합니다.

## 시작 순서

1. run-harness가 요청을 받고 $key_axes_hint 중 어느 축을 건드리는지 먼저 분류합니다.
2. 영향 범위가 넓거나 공용 경계를 건드리면 domain-analyst와 qa-designer를 먼저 호출합니다.
3. 구조 보강이 필요하면 harness-architect와 skill-scaffolder를 붙여 역할 설명과 템플릿을 맞춥니다.
4. orchestrator가 작업 루프와 검증 루프를 묶고 validator가 최종 구조를 점검합니다.

## 기본 운영 원칙

- 문서 재생성은 실제 저장소 분석을 반영해야 하며, 제네릭 초안으로 되돌아가면 안 됩니다.
- 변경이 여러 작업 축을 동시에 건드리면 단일 역할 판단으로 끝내지 않습니다.
- 고비용 검증 경로는 초기에 식별하고 운영 계획에 반영합니다.
- 중요한 역할 호출이나 흐름 변경은 session-log에 남깁니다.

## 로그 운영

- 로그 정책은 \`.harness/logging-policy.md\`에서 확인합니다.
- 역할별 누적 기록은 \`.harness/logs/session-log.md\`에 남깁니다.
- 구조화된 이벤트 원장은 \`.harness/logs/session-events.tsv\`를 사용합니다.
- 최신 세션 요약은 \`.harness/logs/latest-session-summary.md\`에서 확인합니다.
- 역할 호출 빈도 집계는 \`.harness/logs/role-frequency.md\`에서 확인합니다.
- 반복 업무 템플릿 후보 분석 결과는 \`.harness/reports/template-candidates.md\`에서 확인합니다.

## 운영 메모

$next_step_detail_line
- orchestrator는 요청 유형별 시작 루프를 실제 사례 기준으로 계속 다듬어야 합니다.
- validator는 문서가 현재 저장소 분석을 유지하는지 반복 점검해야 합니다.
EOF
      ;;
  esac
}

build_domain_summary_block() {
  local signal_level="$1"
  local project_type_label="$2"
  local stack_hint="$3"
  local structure_hint="$4"
  local core_flow_hint="$5"
  local package_manager_hint="$6"
  local workspace_hint="$7"
  local key_axes_hint="$8"

  case "$signal_level" in
    empty)
      cat <<EOF
- 프로젝트 유형: 미정
- 주요 기술 스택: 미정
- 핵심 흐름: 미정
EOF
      ;;
    low)
      cat <<EOF
- 프로젝트 유형: $project_type_label
- 주요 기술 스택 추정: $stack_hint
- 주요 구조 단서: $structure_hint
- 핵심 흐름: $core_flow_hint
EOF
      ;;
    *)
      printf '%s\n' "- 프로젝트 유형: $project_type_label"
      printf '%s\n' "- 주요 기술 스택 추정: $stack_hint"
      [ "$package_manager_hint" = "추정 불가" ] || printf '%s\n' "- 패키지 관리: $package_manager_hint"
      [ "$workspace_hint" = "추정 불가" ] || printf '%s\n' "- 워크스페이스/패키지 단서: $workspace_hint"
      printf '%s\n' "- 주요 구조 단서: $structure_hint"
      [ "$key_axes_hint" = "$structure_hint" ] || printf '%s\n' "- 핵심 작업 축: $key_axes_hint"
      printf '%s\n' "- 핵심 흐름: $core_flow_hint"
      ;;
  esac
}

build_next_step_line() {
  local signal_level="$1"
  local context="${2:-init}"

  case "$signal_level" in
    empty|low)
      if [ "$context" = "refresh" ]; then
        echo "- domain-analyst가 실제 저장소 구조를 읽고 내용을 구체화합니다."
      else
        echo "- 답변이 모이면 domain-analyst가 저장소 요약과 핵심 흐름을 구체화합니다."
      fi
      ;;
    *)
      echo "- domain-analyst가 자동 관찰 결과를 바탕으로 실제 코드 경로와 사용자 흐름 기준으로 분석을 보정합니다."
      ;;
  esac
}

ensure_harness_log_scaffold() {
  local harness_dir=".harness"
  local log_dir="$harness_dir/logs"
  local logging_policy_file="$harness_dir/logging-policy.md"
  local session_log_file="$log_dir/session-log.md"
  local events_file="$log_dir/session-events.tsv"
  local latest_summary_file="$log_dir/latest-session-summary.md"
  local role_frequency_file="$log_dir/role-frequency.md"

  mkdir -p "$harness_dir" "$log_dir"

  if [ ! -f "$logging_policy_file" ]; then
    cat > "$logging_policy_file" <<'EOF'
# 로그 정책

## 목적

이 문서는 실행 하네스 팀을 실제로 운용할 때 어떤 로그를 남겨야 하는지 정의합니다.

## 자동화 도구

- 전역 설치된 `harness-log.sh`는 역할 호출 시 세션 로그에 자동 append 합니다.
- 전역 설치된 `harness-session-close.sh`는 세션 종료 시 최신 세션 요약과 역할 호출 빈도 통계를 자동 갱신합니다.
- 전역 설치된 `harness-role-stats.sh`는 누적 로그를 기준으로 역할 호출 빈도 통계를 다시 계산합니다.
- 전역 설치된 `harness-template-candidates.sh`는 누적 로그를 분석해 반복 업무 템플릿 후보를 `.harness/reports/template-candidates.md`로 정리합니다.

## 로그를 남겨야 하는 상황

- run-harness로 팀을 시작했을 때
- 특정 역할을 직접 호출했을 때
- validator 피드백이 나왔을 때
- QA 질문이 보강되었을 때
- orchestrator가 흐름을 변경했을 때
- 역할 팀 구조가 변경되었을 때

## 최소 로그 항목

- 시각
- 시작 요청 요약
- 진입점 역할
- 호출된 역할
- 입력으로 본 파일
- 출력/갱신된 파일
- 다음 권장 역할
- 남은 약점 또는 미해결 항목

## 원칙

- 로그는 짧지만 구조적으로 남깁니다.
- 사람이 읽을 수 있어야 합니다.
- 역할 흐름과 피드백 루프가 보이도록 남깁니다.
- 각 역할은 자신이 수행한 주요 변경과 다음 권장 단계를 남길 책임이 있습니다.
- 가능하면 수동 편집보다 자동 append 스크립트를 우선 사용합니다.
EOF
  fi

  if [ ! -f "$session_log_file" ]; then
    cat > "$session_log_file" <<'EOF'
# 실행 하네스 세션 로그

## 기록 원칙

각 세션마다 아래 형식으로 기록합니다.

---

### 세션

- 시각:
- 세션 ID:
- 상태:
- 시작 요청:
- 진입점:
- 호출 역할:
- 입력 파일:
- 출력 파일:
- 다음 권장 역할:
- 남은 약점:

---

## 예시

### 세션

- 시각: YYYY-MM-DD HH:MM
- 세션 ID: session-YYYYMMDD-HHMMSS
- 상태: started
- 시작 요청: 현재 프로젝트에 하네스 팀을 한 번 돌려줘
- 진입점: run-harness
- 호출 역할: domain-analyst, harness-architect, orchestrator
- 입력 파일: 없음
- 출력 파일: .harness/reports/domain-analysis.md, .harness/reports/harness-architecture.md
- 다음 권장 역할: qa-designer
- 남은 약점: QA 질문이 아직 추상적임
EOF
  fi

  if [ ! -f "$events_file" ]; then
    printf 'timestamp\tsession_id\tstatus\trequest\tentry_point\troles\tinputs\toutputs\tnext_role\tweaknesses\tnote\n' > "$events_file"
  fi

  if [ ! -f "$latest_summary_file" ]; then
    cat > "$latest_summary_file" <<'EOF'
# 최신 세션 요약

아직 종료된 세션 집계가 없습니다.
EOF
  fi

  if [ ! -f "$role_frequency_file" ]; then
    cat > "$role_frequency_file" <<'EOF'
# 역할 호출 빈도

아직 집계된 역할 호출 통계가 없습니다.
EOF
  fi
}
