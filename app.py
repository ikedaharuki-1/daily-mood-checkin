"""
朝イチ気分チェック — バックエンドAPI
- 今日の気分を取得 / 保存
- 過去の気分一覧
"""

# === 準備：使う道具の取り込みと設定 ===
import os
import sqlite3          # DB（SQLite）を扱う
from datetime import date   # 今日の日付を取得する
from pathlib import Path    # ファイルパス（mood.db の場所）を扱う

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder="static")   # Webサーバーの設計図。画面は static フォルダから配信
DB_PATH = Path(__file__).parent / "mood.db"      # DBファイルの場所（このフォルダ内の mood.db）


# === 開発時：ブラウザのキャッシュを抑止（JS更新を確実に反映） ===
@app.after_request
def no_cache_static(response):
    """開発時は静的ファイルのキャッシュを抑止（JSの更新を確実に反映）"""
    if request.path.startswith("/static") or request.path == "/":
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response


# === DB：mood.db に接続する ===
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # 取得した行を row["day"] のように名前で参照できるようにする
    return conn


# === DB：気分を入れる「表」がなければ作る ===
def init_db():
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS moods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day DATE NOT NULL UNIQUE,
                score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5)
            )
            """
        )   # moods 表：id（通し番号）, day（日付・1日1行）, score（1〜5）


# === 窓口①：トップページ（index.html）を返す ===
@app.route("/")
def index():
    return send_from_directory("static", "index.html")


# === 窓口②：今日の気分を取得（なければ null） ===
@app.route("/api/today", methods=["GET"])
def get_today():
    """今日の気分を取得。なければ null。"""
    init_db()
    today = date.today().isoformat()
    with get_db() as conn:
        row = conn.execute(
            "SELECT day, score FROM moods WHERE day = ?", (today,)
        ).fetchone()
    if row is None:
        return jsonify({"mood": None})
    return jsonify({"mood": {"day": row["day"], "score": row["score"]}})


# === 窓口③：気分を保存（1〜5）。その日がなければ登録、あれば上書き ===
@app.route("/api/mood", methods=["POST"])
def post_mood():
    """気分を保存（1〜5）。その日がなければ登録、あれば上書き。"""
    init_db()
    data = request.get_json()
    if not data or "score" not in data:
        return jsonify({"error": "score is required"}), 400
    score = int(data["score"])
    if score < 1 or score > 5:
        return jsonify({"error": "score must be 1-5"}), 400
    today = date.today().isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO moods (day, score) VALUES (?, ?)",
            (today, score),
        )
        conn.commit()
    return jsonify({"ok": True, "day": today, "score": score})


# === 窓口④：過去の気分一覧を取得（新しい順・最大90件） ===
@app.route("/api/moods", methods=["GET"])
def get_moods():
    """過去の気分一覧（新しい順）。"""
    init_db()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT day, score FROM moods ORDER BY day DESC LIMIT 90"
        ).fetchall()
    return jsonify({
        "moods": [{"day": r["day"], "score": r["score"]} for r in rows]
    })


# === このファイルを直接実行したとき：DBの表を用意してからサーバーを起動 ===
# 本番（Render など）では PORT が環境変数で渡されるので、あればそれを使う
if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
