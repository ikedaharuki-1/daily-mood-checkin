#!/bin/bash
# このフォルダ（daily-mood-checkin）に移動し、Python で app.py を起動する
cd "$(dirname "$0")"
echo "朝イチ気分チェック — サーバーを起動しています..."
if [ -f .venv/bin/python ]; then
  .venv/bin/python app.py
else
  python3 app.py
fi
echo "終了するにはこのウィンドウを閉じるか、Ctrl+C を押してください。"
