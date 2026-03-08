# コードを読み解く — バックエンドとDB

`app.py` と DB（mood.db）の「どの部分が何をしているか」を、上から順に手に取るように説明します。  
実際のコードを開きながら、このドキュメントの「〇〇のブロック」と照らし合わせて読むとわかりやすいです。

---

## 全体の地図（app.py の構成）

```
1. 準備 … 道具の取り込みと「DBファイルの場所」の指定
2. キャッシュ対策 … 開発時に画面の更新が確実に見えるようにする（本題ではない）
3. DB に「つなぐ」「表を作る」 … get_db() と init_db()
4. 窓口（API）3つ …
   - 「トップページを返す」 … index()
   - 「今日の気分を教えて」 … get_today()
   - 「気分を保存して」 … post_mood()
   - 「過去の気分一覧を教えて」 … get_moods()
5. サーバーを起動する … 最後の if __name__ == "__main__":
```

以下、この順で「各パートの役割」を説明します。

---

## 1. 準備（ファイルの先頭）

```python
"""
朝イチ気分チェック — バックエンドAPI
...
"""
import os
import sqlite3
from datetime import date
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder="static")
DB_PATH = Path(__file__).parent / "mood.db"
```

### 何をしているか

| 行・ブロック | 役割（やさしく） |
|--------------|------------------|
| `""" ... """` | このファイルの説明（コメント）。プログラムの動きには影響しない。 |
| `import sqlite3` | **SQLite**（ファイル1つで動くDB）を扱うための道具を取り込む。 |
| `from datetime import date` | **日付**（今日は何年何月何日か）を使うための道具。 |
| `from pathlib import Path` | **ファイルのパス**（mood.db の場所）を扱うための道具。 |
| `from flask import ...` | **Flask** の道具：Webサーバー（`Flask`）、JSONで返す（`jsonify`）、リクエストの中身を読む（`request`）、ファイルを返す（`send_from_directory`）。 |
| `app = Flask(...)` | 「このアプリはWebサーバーです。画面のファイルは `static` フォルダに入っています」と**設計図**を決めている。 |
| `DB_PATH = Path(__file__).parent / "mood.db"` | **DBファイルの場所**を決めている。「この app.py があるフォルダのなかの `mood.db`」＝ `daily-mood-checkin/mood.db`。 |

**まとめ**: 「どの道具を使うか」と「DBはどこにあるか」を決めているブロックです。

---

## 2. DB に「つなぐ」— get_db()

```python
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
```

### 何をしているか

| 行 | 役割 |
|----|------|
| `def get_db():` | 「DBに接続する」という**処理をひとまとまり**にしたもの（関数）。 |
| `conn = sqlite3.connect(DB_PATH)` | `mood.db` というファイルに**つなぐ**。`conn` が「DBとの接続」を表す。 |
| `conn.row_factory = sqlite3.Row` | あとで「○列目の値」を `row["day"]` のように**名前で取れる**ようにする設定。 |
| `return conn` | その「接続」を、呼び出した側に**渡す**。 |

**たとえ**: 「金庫（mood.db）の鍵を開けて、中身を出し入れできる状態にして、その鍵を返す」イメージです。  
**いつ使うか**: 気分を「保存する」「読む」ときは、必ずこの `get_db()` で接続してから中身に触ります。

---

## 3. DB に「表があるか確認し、なければ作る」— init_db()

```python
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
        )
```

### 何をしているか

| 行・ブロック | 役割 |
|--------------|------|
| `def init_db():` | 「DBの表を用意する」処理のまとまり。 |
| `with get_db() as conn:` | DBに接続して、その接続を `conn` という名前で使う。`with` のあいだだけ接続が開き、終わったら閉じる。 |
| `conn.execute(""" ... """)` | DBに対して **「この内容を実行して」** と頼む。ここでは「表を作る」命令。 |
| `CREATE TABLE IF NOT EXISTS moods` | **「moods という表がなければ作る」**。すでにあれば何もしない。 |
| `id INTEGER PRIMARY KEY AUTOINCREMENT` | 1行ごとに **通し番号（id）** を自動で振る。主キー＝1行を特定するための番号。 |
| `day DATE NOT NULL UNIQUE` | **日付（day）**。必須（NOT NULL）。**同じ日付は2回出てこない**（UNIQUE＝その列の値は1日1つだけ）。 |
| `score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5)` | **気分の点数（score）**。1〜5の整数だけ許可（CHECK）。 |

**表のイメージ（moods）**

| id | day       | score |
|----|-----------|-------|
| 1  | 2026-03-08| 4     |
| 2  | 2026-03-07| 3     |

- **id**: 自動採番（行の識別用）
- **day**: その日の日付（1日1行）
- **score**: その日の気分（1〜5）

**まとめ**: 「気分を入れておく表」がDBのなかに1つある、と保証しているブロックです。APIの処理の最初で `init_db()` を呼ぶので、初回でも表がなければ作られます。

---

## 4. 窓口（API）の説明のしかた — @app.route

どのURLで・どんなメソッド（GET/POST）で来たときに、どの関数が動くかは **`@app.route(...)`** で決まります。

- `@app.route("/")` → 「`/` にアクセスしたとき」
- `@app.route("/api/today", methods=["GET"])` → 「`/api/today` に **GET** でアクセスしたとき」
- `@app.route("/api/mood", methods=["POST"])` → 「`/api/mood` に **POST** でアクセスしたとき」

つまり「**この関数が、このURLの窓口になる**」と宣言している部分です。

---

## 5. 窓口① — トップページを返す（index）

```python
@app.route("/")
def index():
    return send_from_directory("static", "index.html")
```

### 何をしているか

| 行 | 役割 |
|----|------|
| `@app.route("/")` | **URL が `http://localhost:5001/` のとき** に、下の関数が動く。 |
| `def index():` | 「トップページ用」の処理。 |
| `return send_from_directory("static", "index.html")` | `static` フォルダにある **index.html** をそのまま返す。＝ブラウザに「朝イチ気分チェック」の画面を送る。 |

**まとめ**: ブラウザで「/」を開いたときに、表示用のHTMLを渡しているだけの窓口です。

---

## 6. 窓口② — 今日の気分を教える（get_today）

```python
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
```

### 何をしているか（流れ）

1. **今日の日付を文字にする**  
   `today = date.today().isoformat()`  
   → 例: `"2026-03-08"`

2. **DBの表を用意する**  
   `init_db()`  
   → 表がなければ作る。

3. **DBから「今日の行」を1行だけ取る**  
   - `SELECT day, score FROM moods WHERE day = ?`  
     「moods の表から、day が ? の行の day と score を取る」  
   - `(today,)` が ? に入る。＝「今日の日付の行」だけ。  
   - `.fetchone()` で **1行だけ** 取る（なければ `None`）。

4. **結果をJSONで返す**  
   - 行がなければ → `{"mood": null}`（今日はまだ記録していない）  
   - 行があれば → `{"mood": {"day": "2026-03-08", "score": 4}}` のように返す。

**SQLの意味（日本語）**

- `SELECT day, score` … 「day と score の列を取り出す」
- `FROM moods` … 「moods という表から」
- `WHERE day = ?` … 「day が ?（ここでは今日の日付）の行だけ」

**まとめ**: 「今日の気分はもう記録されているか？」をDBに聞いて、結果をJSONで返す窓口です。

---

## 7. 窓口③ — 気分を保存する（post_mood）

```python
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
```

### 何をしているか（流れ）

1. **表を用意する**  
   `init_db()`

2. **リクエストの「中身」を読む**  
   `data = request.get_json()`  
   → ブラウザが送った JSON（例: `{"score": 4}`）を Python の辞書として受け取る。

3. **score があるか・1〜5か をチェック**  
   - `score` がなければ → `{"error": "score is required"}` を 400 で返す。  
   - あっても 1〜5 でなければ → `{"error": "score must be 1-5"}` を 400 で返す。

4. **今日の日付を取得**  
   `today = date.today().isoformat()`

5. **DBに「今日の日付 + 点数」を保存する**  
   - `INSERT OR REPLACE INTO moods (day, score) VALUES (?, ?)`  
     「moods に (day, score) を入れる。同じ day がすでにあったら**上書き**（REPLACE）」  
   - `(today, score)` が ? に入る。  
   - `conn.commit()` で **本当に書き込む**。

6. **成功したことをJSONで返す**  
   `{"ok": True, "day": "2026-03-08", "score": 4}` のように返す。

**SQLの意味（日本語）**

- `INSERT OR REPLACE INTO moods (day, score)`  
  「moods に day と score を入れる。同じ day がすでにあればその行を置き換える」
- `VALUES (?, ?)`  
  「値はこのあと渡す (today, score)」

**まとめ**: ブラウザから送られた「今日の気分（1〜5）」を受け取り、DBの「今日」の行に保存（または上書き）し、「保存したよ」とJSONで返す窓口です。

---

## 8. 窓口④ — 過去の気分一覧を教える（get_moods）

```python
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
```

### 何をしているか（流れ）

1. **表を用意する**  
   `init_db()`

2. **DBから「日付の新しい順に最大90件」取る**  
   - `SELECT day, score FROM moods`  
     「moods から day と score を取る」  
   - `ORDER BY day DESC`  
     「day の**新しい順**（降順）」  
   - `LIMIT 90`  
     「**最大90行**だけ」  
   - `.fetchall()` で **全部** 取る。

3. **1行ずつ「日付と点数」の辞書にして、JSONで返す**  
   `{"moods": [{"day": "2026-03-08", "score": 4}, ...]}` のような形。

**SQLの意味（日本語）**

- `ORDER BY day DESC` … 「day で並べる。DESC＝大きい（新しい）順」
- `LIMIT 90` … 「90件まで」

**まとめ**: 過去の記録を「新しい順・最大90日分」だけDBから取り出し、一覧用のJSONで返す窓口です。

---

## 9. サーバーを起動する（最後のブロック）

```python
if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5001, debug=True)
```

### 何をしているか

| 行 | 役割 |
|----|------|
| `if __name__ == "__main__":` | 「このファイルを**直接**実行したときだけ」中の処理を動かす。ほかのファイルから import されたときは動かない。 |
| `init_db()` | 起動時に1回、表がなければ作る。 |
| `app.run(host="0.0.0.0", port=5001, debug=True)` | **Webサーバーを立ち上げる**。どこからでもアクセスできるように（`0.0.0.0`）、ポート **5001** で待ち受け、開発用のデバッグをオンにしている。 |

**まとめ**: 「このプログラムを python app.py で実行したとき、DBの表を用意してから、5001番でサーバーを動かす」という入口です。

---

## 10. DB（mood.db）とコードの関係まとめ

- **どこにあるか**: `daily-mood-checkin/mood.db`（app.py と同じフォルダ）
- **中身**: 1つの表 `moods`（列: id, day, score）
- **触り方**: 必ず `get_db()` で接続 → `conn.execute(...)` で SQL を実行 → 必要なら `conn.commit()` で保存
- **3つのAPIでの使い方**:
  - **get_today** … `SELECT` で「今日」の1行を読む
  - **post_mood** … `INSERT OR REPLACE` で「今日」の1行を書く（または上書き）
  - **get_moods** … `SELECT ... ORDER BY day DESC LIMIT 90` で過去の行を読む

このドキュメントと `app.py` を並べて、「このブロックはここに書いてある役割だな」と対応させながら読むと、バックエンドとDBの仕組みが手に取るようにわかります。
