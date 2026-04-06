#!/usr/bin/env bash
# 이 파일은 소싱 전용입니다. 직접 실행하지 마세요.

trim_text() {
  local value="$1"
  value="${value//$'\t'/ }"
  value="${value//$'\n'/ }"
  value="${value//$'\r'/ }"
  printf '%s' "$value" | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//'
}
