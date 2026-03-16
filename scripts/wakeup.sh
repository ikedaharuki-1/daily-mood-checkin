#!/bin/bash
# スリープ復帰時にdaily-mood-checkinをブラウザで開く

# GUIセッションが準備できるまで少し待つ
sleep 5

# サーバーが起動しているか確認し、起動していなければ起動する
if ! curl -s http://localhost:5001 > /dev/null 2>&1; then
  cd /Users/ikeda-haruki1/daily-mood-checkin || exit 1
  if [ -f .venv/bin/python ]; then
    PYTHON=".venv/bin/python"
  else
    PYTHON="python3"
  fi
  $PYTHON app.py &
  sleep 5
fi

open "http://localhost:5001"
