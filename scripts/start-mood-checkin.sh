#!/bin/bash
# Macログイン時に：最新コードを git pull → サーバー起動 → ブラウザで開く
# ※ 実際に launchd から使うのはホーム直下の ~/start-mood-checkin.sh（このファイルをコピーして使う）

PROJECT_DIR="/Users/ikeda-haruki1/daily-mood-checkin"
cd "$PROJECT_DIR" || exit 1

# 最新のコードを GitHub から取得（失敗してもローカルのまま起動する）
git pull origin main 2>/dev/null || true

if [ -f .venv/bin/python ]; then
  PYTHON=".venv/bin/python"
else
  PYTHON="python3"
fi

$PYTHON app.py &
PID=$!
sleep 3
open "http://localhost:5001"
wait $PID
