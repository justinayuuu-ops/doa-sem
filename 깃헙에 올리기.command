#!/bin/bash
# 오늘도 도아 셈 — 더블클릭하면 바뀐 파일을 깃헙에 커밋하고 푸시한 뒤, 결과를 알려 준다.
cd "$(dirname "$0")" || exit 1
REPO="https://github.com/justinayuuu-ops/doa-sem"
SITE="https://justinayuuu-ops.github.io/doa-sem/"

# 맥 키체인에 로그인 정보를 저장하게 한다 — 처음 한 번만 입력하면 다음부터는 묻지 않는다
if [ -z "$(git config --global credential.helper)" ]; then
  git config --global credential.helper osxkeychain
fi

echo "▶ 오늘도 도아 셈 — 깃헙에 올리는 중…"
echo ""
git add -A
if ! git diff --cached --quiet; then
  git commit -q -m "업데이트 $(date '+%Y-%m-%d %H:%M')"
fi

push_ok=0
if git push -q origin main 2>/tmp/doasem_push_err; then
  push_ok=1
elif grep -q "rejected\|fetch first\|non-fast-forward" /tmp/doasem_push_err; then
  # 깃헙 웹에서 직접 올린 기록이 있으면 — 이 폴더의 파일을 기준으로 합친 뒤 다시 올린다
  echo "· 깃헙에 먼저 올라간 기록이 있어 합치는 중…"
  git fetch -q origin main && git merge -q -s ours origin/main -m "깃헙 웹 업로드 기록 합치기" && git push -q origin main && push_ok=1
else
  cat /tmp/doasem_push_err
fi

echo ""
if [ $push_ok -eq 1 ]; then
  local_head=$(git rev-parse HEAD)
  remote_head=$(git ls-remote origin -h refs/heads/main | cut -f1)
  if [ "$local_head" = "$remote_head" ]; then
    echo "✅ 깃헙에 올라갔어요!"
    echo "   마지막 커밋: $(git log -1 --pretty='%h  %s  (%cd)' --date=format:'%m/%d %H:%M')"
    echo "   저장소: $REPO"
    echo "   앱 주소: $SITE"
    echo ""
    echo "   1~2분 뒤 아이폰에서 앱을 두 번 열면 새 버전이 적용돼요."
  else
    echo "⚠️ 올린 것 같지만 깃헙의 최신 커밋과 달라요. 잠시 뒤 다시 실행해 주세요."
  fi
else
  echo "❌ 올리지 못했어요."
  echo "   · Username 을 물으면: justinayuuu-ops"
  echo "   · Password 를 물으면: 깃헙 비밀번호가 아니라 '토큰'을 붙여 넣어 주세요 (화면에 안 보여도 입력돼요)."
fi
echo ""
read -n 1 -s -r -p "아무 키나 누르면 창이 닫혀요."
