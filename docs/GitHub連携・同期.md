# GitHub 連携・同期

このリポジトリの変更を GitHub に反映する手順と、簡単な指示のしかたです。

---

## 手動で反映するとき

```bash
cd ~/daily-mood-checkin
git add -A
git status   # 確認
git commit -m "ここにメッセージ"
git push origin main
```

---

## 簡単に指示したいとき（Cursor などで）

「GitHub に反映して」「GitHub 連携して」「push して」「同期して」などと指示すれば、  
このリポジトリで `git add` → `commit` → `push origin main` を行うようにしています。

- プロジェクトの `.cursor/rules` に「GitHub 連携」用のルールを置いてあります。
- 変更内容に合わせたコミットメッセージを付けてもらうか、自分でメッセージを指定してください。
