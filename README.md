## 起動コマンド
起動
``` docker compose up ```


build
``` docker compose up --build ```


## コンポーネント分け
**UI**
ボタンなどの小さいコンポーネント用
**layout**
header,footerなどのコンポーネント用
**features**
特定ディレクトリ毎に分けディレクトリを作成しコンポーネントファイルを作成する


## デプロイ・引き渡し時に設定すること

### TRIAL_NOTIFICATION_EMAIL（体験申し込みの通知先）

体験申し込みがあったときに、スタッフ宛へ通知メールを送る宛先。カンマ区切りで複数指定できる。

**未設定だと通知メールは一切送信されない。** 申し込み自体は成功してDBに保存されるため管理画面からは確認できるが、
誰にも気付かれないまま溜まっていくことになる。クライアントへ引き渡す前に、運用担当者のアドレスを確認して設定すること。

- 設定場所: GitHub の Settings > Secrets and variables > Actions > Variables
- 変数名: `PROD_TRIAL_NOTIFICATION_EMAIL`（dev環境は `DEV_TRIAL_NOTIFICATION_EMAIL`）
- 設定してから main に push すると、デプロイ経由でバックエンドに反映される

注意点:

- deploy.yml が `A && B || C` 記法を使っている都合上、PROD側だけ空にすると DEV 側の値が使われてしまう。使うなら両方設定すること。
- 未設定でもデプロイは失敗しない（`corsOrigin` などと違いガードを掛けていない）ので、設定漏れに気付けない。ここで確認すること。
