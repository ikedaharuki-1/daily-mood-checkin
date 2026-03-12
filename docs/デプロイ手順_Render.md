# デプロイ手順 — Render で「サーバーを立てる」

**目的** … アプリを**自分のPCの外**（クラウド）で動かし、**誰でもアクセスできるURL**を手に入れる。  
「インフラを作る」＝ここでは「Render に Web サービスを1つ作り、GitHub のコードをそこで動かす」までを指します。

---

## 前提

- **GitHub** にこのプロジェクトのコードが入っていること（リポジトリが1つあること）
- **いまの状態**：このフォルダ（daily-mood-checkin）ではすでに `git init` と初回コミットまで済んでいます。あとは GitHub にリポジトリを作り、push するだけです。

### GitHub に push する（まだの場合）

1. **GitHub でリポジトリを新規作成**
   - https://github.com/new を開く
   - **Repository name** に `daily-mood-checkin` など好きな名前を入力
   - **Public** のまま
   - **「Add a README file」にチェックを入れない**（既にローカルにコードがあるため）
   - **Create repository** をクリック

2. **表示された「…or push an existing repository from the command line」のコマンドを、このフォルダで実行する**
   - このPCが **ikedaharuki-1** で GitHub に接続している場合、**ikedaharuki-1 のリポジトリ**を origin にするとそのまま push できます（下の「アカウントを ikedaharuki-1 にそろえる」を参照）。
   - それ以外の場合は、リポジトリの所有者のアカウント用に HTTPS + Token などで push。→ 下の「push が Permission denied のとき」を参照。

### アカウントを ikedaharuki-1 にそろえる（このPCの GitHub が ikedaharuki-1 の場合）

このPCでは **ikedaharuki-1** で GitHub に接続しているなら、**リポジトリも ikedaharuki-1 のもの**にすると、そのまま push できます。

1. **GitHub に ikedaharuki-1 でログイン**し、https://github.com/new で **新規リポジトリ**を作成する。  
   - リポジトリ名：`daily-mood-checkin`（任意）  
   - Public、README は追加しない  

2. **リモートを ikedaharuki-1 のリポジトリに変更**して push する：
   ```bash
   cd ~/daily-mood-checkin
   git remote set-url origin git@github.com:ikedaharuki-1/daily-mood-checkin.git
   git push -u origin main
   ```
3. **Render** では、GitHub 連携で **ikedaharuki-1 / daily-mood-checkin** を選べば、同じようにデプロイできます。

---

### push が Permission denied のとき

- **原因**：このPCで使っている GitHub の認証（SSH 鍵）が、リポジトリの所有者（例：ikedaharuki）と違うアカウント（例：ikedaharuki-1）になっている。
- **対処（どれかでOK）**  
  1. **HTTPS で push する**  
     - `git remote set-url origin https://github.com/ikedaharuki/daily-mood-checkin.git` で URL を HTTPS に変更  
     - `git push -u origin main` を実行  
     - ユーザー名・パスワードを聞かれたら、GitHub の **ユーザー名** と **Personal Access Token（パスワードの代わり）** を入力（Token は GitHub → Settings → Developer settings → Personal access tokens で作成）  
  2. **ikedaharuki 用の SSH 鍵をこのPCで使う**  
     - そのアカウント用の SSH 鍵を用意し、`~/.ssh/config` でこのリポジトリだけその鍵を使うように設定してから push。  
  3. **リポジトリの所有者が、このPCのアカウントを Collaborator に追加する**  
     - GitHub のリポジトリ → Settings → Collaborators で、このPCで使っている GitHub アカウントを追加。追加されたら同じ SSH で push できる。

---

## ステップ1：Render のアカウントを作る

1. ブラウザで **https://render.com** を開く  
2. **Get Started for Free** をクリック  
3. **GitHub でサインアップ**を選び、GitHub と連携する（推奨）  
4. 認証が終わると Render のダッシュボードが開く  

---

## ステップ2：新しい Web サービスを作る

1. Render のダッシュボードで **「New +」** をクリック  
2. **「Web Service」** を選ぶ  
3. **「Connect a repository」** のところで、**GitHub の daily-mood-checkin のリポジトリ**を選ぶ（または「Configure account」で GitHub のアクセスを許可してから選ぶ）  
4. リポジトリが一覧に出たら、**daily-mood-checkin** の横の **「Connect」** をクリック  

---

## ステップ3：設定を入力する

次のように入力します。**名前は好きなものでOK**（例：mood-checkin）。

| 項目 | 入力する内容 |
|------|----------------|
| **Name** | 例：`mood-checkin`（サービスの名前。URL の一部になる） |
| **Language / Runtime** | **必ず「Python 3」を選ぶ**（Docker ではなく）。選ぶと「Build Command」「Start Command」の入力欄が出ます。 |
| **Branch** | `main` のまま |
| **Region** | そのままでOK（Oregon や Singapore など） |
| **Root Directory** | 空のままでOK |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn --bind 0.0.0.0:$PORT app:app` |
| **Instance Type** | **Free** のまま |

**Advanced** を開いている場合：
- **Health Check Path** が `/healthz` になっているなら、このアプリにはそのURLがないので **`/`** に変更するか、空にする。

**ポイント**

- **Build Command** … デプロイのとき、どのコマンドで「必要なものを入れるか」。ここでは `requirements.txt` で Flask と gunicorn を入れる。  
- **Start Command** … どのコマンドで「アプリを起動するか」。`gunicorn` が Flask の app を動かし、`$PORT` は Render が自動で入れる番号（ポート）。  

**Instance Type** は **Free** のままにして、「無料枠で動かす」にします。

---

## ステップ4：デプロイする

1. 画面下の **「Create Web Service」** をクリック  
2. Render が自動で **ビルド**（pip install）と **起動**（gunicorn）を始める  
3. ログが流れ、「Build successful」「Your service is live at …」のように表示されるまで待つ（1〜3分程度）  
4. 画面上部に **「https://〇〇.onrender.com」** のような URL が出る → それが**立てたサーバーの住所**  

---

## ステップ5：動作確認

1. その URL をブラウザで開く  
2. 朝イチ気分チェックの画面が出ればOK  
3. 1〜5 のどれかを押して記録できるか確認する  

**注意**

- 無料枠では、しばらくアクセスがないと**スリープ**します。再度開くときは数十秒かかることがあります。  
- 無料枠では **mood.db は再起動で消える**ことがあります。学習用として「公開URLで動く」を体験する目的なら問題ありません。  

---

## まとめ：何をしたか（インフラの視点）

| やったこと | インフラ的にいうと |
|------------|---------------------|
| GitHub にコードを置いた | 「どのプログラムを動かすか」を渡した |
| Render で Web サービスを作った | 「どこで動かすか」＝Render のサーバー1台を用意した |
| Build / Start コマンドを指定した | 「どう組み立てて、どう起動するか」を決めた |
| URL がもらえた | そのサーバーに**公開用の住所**が付いた |

＝ **「サーバーを立てた」＝「クラウドのコンピュータの上で、自分のアプリを動かし、URL でアクセスできるようにした」** という状態になっています。

---

## うまく動かないとき

- **Build が失敗する** … ログの「Error」の行を確認。`requirements.txt` の内容や、Build Command の typo がないか見直す。  
- **Start で失敗する** … Start Command が `gunicorn --bind 0.0.0.0:$PORT app:app` になっているか確認。ファイル名が `app.py` で、その中で Flask の変数名が `app` になっているかも確認。  
- **ページは開くが API が 404** … 静的ファイル（JS）のパスは `static/app.js` のままなので、同じオリジンなら `/api/today` などは動く。ブラウザの開発者ツールの「Network」で、どのURLが失敗しているか確認する。

---

*次の段階として、本格的にデータを残したい場合は「PostgreSQL を追加する」などのステップに進めます。まずはこの「公開URLで動く」までを体験すると、ローカルとインフラの違いが手に取るようにわかります。*
