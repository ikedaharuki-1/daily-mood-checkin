# 朝イチ気分チェック

朝、その日はじめてページを開いたときに、5段階で気分を選んで記録するだけのアプリです。  
**Docker は不要**です。Python だけで動きます。

> **プロジェクトの場所**: ログイン時に自動起動させるため、プロジェクトは **`~/daily-mood-checkin`**（ホーム直下）にあります。

---

## 1. 初回だけ：Python で環境を用意する

```bash
cd ~/daily-mood-checkin
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 2. Mac ログイン時に起動＋ブラウザを開く

ログインすると**自動でサーバーが起動し、気分チェックのページがブラウザで開く**ようにします。  
そのときに **GitHub から最新のコードを pull** するので、常に最新版で動きます（ローカルのみ。Render は使いません）。

### 手順

1. **スクリプトを実行可能にする**

   ```bash
   chmod +x ~/start-mood-checkin.sh
   ```

2. **Launch Agent を登録する**

   ```bash
   # plist を LaunchAgents にコピー
   cp ~/daily-mood-checkin/scripts/com.moodcheckin.plist ~/Library/LaunchAgents/

   # ログイン時に実行されるように読み込む
   launchctl load ~/Library/LaunchAgents/com.moodcheckin.plist
   ```

3. **いま試す（ログインを待たずに動かす）**

   ```bash
   launchctl start com.moodcheckin
   ```

   数秒後にブラウザで http://localhost:5001 が開けばOKです。

### やめたいとき

```bash
launchctl unload ~/Library/LaunchAgents/com.moodcheckin.plist
```

### プロジェクトの場所を変えた場合・ログイン時に開かない場合

Launch Agent の plist には**絶対パス**が入っています。プロジェクトを `~/daily-mood-checkin` 以外に移した、または一度 Documents など別の場所に置いていた場合は、古いパスが `~/Library/LaunchAgents/com.moodcheckin.plist` に残っていることがあります。  
そのときは **plist を上書きして再読み込み**してください。

```bash
cp ~/daily-mood-checkin/scripts/com.moodcheckin.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.moodcheckin.plist
launchctl load ~/Library/LaunchAgents/com.moodcheckin.plist
launchctl start com.moodcheckin
```

あわせて、起動スクリプトがホーム直下にあることを確認してください（`~/start-mood-checkin.sh`）。ない場合は `cp ~/daily-mood-checkin/scripts/start-mood-checkin.sh ~/` でコピーし、`chmod +x ~/start-mood-checkin.sh` で実行可能にしてください。

---

## 動きのイメージ

- **Mac にログイン** → スクリプトが動く → サーバー起動 → **約12秒後**にブラウザで気分チェックのページが開く（ログイン直後は GUI がまだ準備できていないため、少し遅らせてから開いています）
- その日まだ記録していなければ **ポップアップで 1〜5 を選択** → 送信で記録
- 記録済みならポップアップは出ず、過去の一覧だけ表示

---

## うまく動かないとき（「読み込み中」のまま・ボタンが効かない）

**原因**: サーバーが止まっています。

**対処**（どれかでOK）:

1. **いちばん簡単**: フォルダ **daily-mood-checkin** を開き、**「サーバーを起動.command」** をダブルクリック。ターミナルが開いてサーバーが起動するので、ブラウザで http://localhost:5001 を**再読み込み**する。
2. ターミナルで `launchctl start com.moodcheckin` を実行してから、ページを再読み込みする。

サーバーが落ちても、Launch Agent に **KeepAlive** を入れてあるので、自動で再起動を試みます。それでも止まる場合は、上記 1 で「サーバーを起動.command」をダブルクリックして起動してください。

---

## ローカルではなく「公開URL」で動かす（オプション）

自分のPCの外でサーバーを立てて、誰でもアクセスできるURLで動かしたい場合は、**Render** などにデプロイできます。

- **説明** … `docs/ローカルと公開・インフラの違い.md`
- **手順** … `docs/デプロイ手順_Render.md`

GitHub にコードを push したあと、Render で Web サービスを作り、Build / Start コマンドを指定すると、`https://〇〇.onrender.com` のようなURLがもらえます。

---

## 手動でだけ動かす場合

ログイン時に開かず、必要なときだけ使う場合:

```bash
cd ~/daily-mood-checkin
source .venv/bin/activate
python app.py
```

ブラウザで **http://localhost:5001** を開く。

---

## 仕様

- その日1回だけ、5段階（1〜5）で気分を入力できる。
- 入力したら「今日は記録済み」となり、同じ日はポップアップが出ない。
- 過去の記録は一覧で確認できる（直近90日分）。

要求・要件・技術選定は `docs/要求・要件・技術選定.md` を参照。

---

## （参考）Docker で動かす場合

Docker を入れたあとで使う場合:

```bash
docker build -t mood-checkin .
docker run -p 5001:5001 -v $(pwd)/mood.db:/app/mood.db mood-checkin
```

ブラウザで http://localhost:5001 を開く。ログイン時に開くには、上記の Launch Agent の代わりに「ログイン時に開く項目」でブラウザを指定し、起動時に開くページを http://localhost:5001 にし、ログイン時に `docker run` する仕組みを別途用意する必要があります。まずは Python ＋ Launch Agent の運用が簡単です。
