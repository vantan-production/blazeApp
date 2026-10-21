// 最初の owner アカウントを作成する手動スクリプト
//
// 登録は招待制（owner が発行した招待トークンが必要）のため、最初の1人だけは
// API を経由せずここで作成する。デプロイ後に1回だけ実行する想定。
//
//   npm run create:owner -- --name=管理者 --email=owner@example.com --password='...'
//   npm run create:owner -- --name=管理者 --email=owner@example.com   # パスワードを対話入力
//
// 注意:
// - 本番DBに接続する。DATABASE_URL の向き先を必ず確認すること。
// - owner が既に存在する場合は何もしない。2人目以降の owner は
//   PATCH /api/admin/users/:userId/role で既存 owner が昇格させる。

import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createOwnerAccount } from "../src/admin/createOwner.js";
import {
  adminNameSchema,
  emailSchema,
  passwordBaseSchema,
} from "../src/db/schema.js";

const argValue = (argv: string[], key: string): string | undefined =>
  argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3);

// パスワードを引数で渡すとシェル履歴に残るため、未指定なら対話入力にする
async function promptPassword(): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return await rl.question("パスワード: ");
  } finally {
    rl.close();
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const name = argValue(argv, "name");
  const email = argValue(argv, "email");

  if (!name || !email) {
    console.error(
      "使い方: npm run create:owner -- --name=管理者 --email=owner@example.com [--password=...]",
    );
    process.exit(1);
  }

  const password = argValue(argv, "password") ?? (await promptPassword());

  // API と同じバリデーションを通す（強度チェック zxcvbn は API 側の登録フォーム向けなのでここでは課さない）
  const parsed = {
    name: adminNameSchema.safeParse(name),
    email: emailSchema.safeParse(email),
    password: passwordBaseSchema.safeParse(password),
  };

  for (const [field, result] of Object.entries(parsed)) {
    if (!result.success) {
      console.error(`${field}: ${result.error.issues[0]?.message ?? "入力が不正です"}`);
      process.exit(1);
    }
  }

  const owner = await createOwnerAccount({ name, email, password });

  console.log("owner を作成しました。");
  console.log(`  id:    ${owner.id}`);
  console.log(`  name:  ${owner.name}`);
  console.log(`  email: ${owner.email}`);
  console.log("この owner でログインし、他のメンバーは招待から追加してください。");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
