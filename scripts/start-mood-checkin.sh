#!/bin/bash
# Macログイン時にサーバーを起動し、ブラウザで開く

PROJECT_DIR="/Users/ikeda-haruki1/Documents/daily-mood-checkin"
cd "$PROJECT_DIR" || exit 1

# venv があればそれを使う
if [ -f .venv/bin/python ]; then
  PYTHON=".venv/bin/python"
else
  PYTHON="python3"
fi

# バックグラウンドでサーバー起動
$PYTHON app.py &
PID=$!

# サーバーが立ち上がるまで少し待つ
sleep 3

# デフォルトブラウザで開く
open "http://localhost:5001"

# サーバーが落ちるまで待つ（このスクリプトが生きている限りサーバーも動く）
wait $PID
