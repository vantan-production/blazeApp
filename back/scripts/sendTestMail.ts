// Resend への実送信を確認する手動スクリプト
//
// 単体テスト（src/__tests__/mail.test.ts）はメール本文の組み立てまでしか検証できない。
// 「APIキーが有効か」「MAIL_FROM のドメインがResend側で検証済みか」「実際に届くか」は
// 本スクリプトで確認する。
//
//   npm run mail:preview                       # 送信せず本文だけ表示
//   npm run mail:send -- --to=you@example.com  # 実際に送信する
//   npm run mail:send -- --to=you@example.com --only=inquiry-reply
//
// 注意: 実行すると本物のメールが飛び、Resendの送信数を消費する。

import "dotenv/config";
import {
  buildPasswordResetEmail,
  buildTrialApplicationConfirmationEmail,
  buildTrialApplicationAdminNotification,
  buildInquiryAutoReplyEmail,
  sendMailMessage,
  type MailMessage,
  type TrialApplicationMailData,
} from "../src/utils/mail.js";

const TEMPLATE_KEYS = [
  "password-reset",
  "trial-confirmation",
  "trial-admin",
  "inquiry-reply",
] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const to = argv.find((a) => a.startsWith("--to="))?.slice("--to=".length);
  const only = argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);
  return { dryRun, to, only };
}

// 本文確認用のダミーデータ（実データは使わない）
const sampleTrial: TrialApplicationMailData = {
  email: "applicant@example.com",
  name: "テスト 太郎",
  furigana: "テスト タロウ",
  trialDate: "2026-10-01",
  gender: "male",
  birthDate: "2014-04-01",
  schoolName: "西尾第一小学校",
  cramSchool: "○○塾",
  phoneNumber: "09000000000",
  motivation: "referral",
  referrerName: "テスト 花子",
};

// 宛先を検証用アドレスに差し替えたメールを組み立てる。
// trial-admin は TRIAL_NOTIFICATION_EMAIL 未設定だと null になるため、
// 本文確認のために一時的に検証用アドレスを入れてから組み立てる。
function buildAll(to: string): Array<{ key: TemplateKey; message: MailMessage }> {
  const savedNotification = process.env["TRIAL_NOTIFICATION_EMAIL"];
  process.env["TRIAL_NOTIFICATION_EMAIL"] = to;
  const adminNotification = buildTrialApplicationAdminNotification(sampleTrial);
  if (savedNotification === undefined) {
    delete process.env["TRIAL_NOTIFICATION_EMAIL"];
  } else {
    process.env["TRIAL_NOTIFICATION_EMAIL"] = savedNotification;
  }

  const messages: Array<{ key: TemplateKey; message: MailMessage }> = [
    {
      key: "password-reset",
      message: buildPasswordResetEmail(to, "dummy-token-for-delivery-check"),
    },
    {
      key: "trial-confirmation",
      message: buildTrialApplicationConfirmationEmail(sampleTrial),
    },
    {
      key: "inquiry-reply",
      message: buildInquiryAutoReplyEmail({
        email: to,
        name: "テスト 次郎",
        title: "疎通確認",
        body: "これは配信確認用のテスト送信です。\n改行も確認します。",
      }),
    },
  ];

  if (adminNotification) {
    messages.splice(2, 0, { key: "trial-admin", message: adminNotification });
  }

  // 申込者宛/管理者宛のテンプレートも検証用アドレスに向ける
  return messages.map(({ key, message }) => ({ key, message: { ...message, to } }));
}

async function main() {
  const { dryRun, to, only } = parseArgs(process.argv.slice(2));

  if (only && !TEMPLATE_KEYS.includes(only as TemplateKey)) {
    console.error(`!! --only の値が不正です: ${only}`);
    console.error(`   指定できるのは ${TEMPLATE_KEYS.join(" / ")} です。`);
    process.exit(1);
  }

  // dry-run では宛先が不要なので、表示用のダミーアドレスを使う
  const target = to ?? (dryRun ? "preview@example.com" : undefined);
  if (!target) {
    console.error("!! 送信先を --to=you@example.com の形式で指定してください。");
    console.error("   本文だけ確認したい場合は --dry-run を付けてください。");
    process.exit(1);
  }

  const targets = buildAll(target).filter(({ key }) => !only || key === only);

  console.log(`MAIL_FROM: ${targets[0]?.message.from ?? "(未設定)"}`);
  console.log(`FRONTEND_URL: ${process.env["FRONTEND_URL"] ?? "(未設定・既定値を使用)"}`);
  console.log(`送信先: ${target}`);
  console.log(`対象テンプレート: ${targets.map((t) => t.key).join(", ")}`);
  console.log("");

  if (dryRun) {
    for (const { key, message } of targets) {
      console.log(`--- ${key} -------------------------------------------`);
      console.log(`件名: ${message.subject}`);
      console.log(message.html.trim());
      console.log("");
    }
    console.log("dry-run のため送信しませんでした。");
    return;
  }

  if (!process.env["RESEND_API_KEY"]) {
    console.error("!! RESEND_API_KEY が未設定です。back/.env に設定してから実行してください。");
    process.exit(1);
  }

  // NODE_ENV=test だと sendMailMessage が送信をスキップしてしまう
  if (process.env["NODE_ENV"] === "test") {
    console.error("!! NODE_ENV=test では実送信されません。NODE_ENV を外して実行してください。");
    process.exit(1);
  }

  let failed = 0;
  for (const { key, message } of targets) {
    try {
      await sendMailMessage(message, key);
      console.log(`OK   ${key}: ${message.subject}`);
    } catch (e) {
      failed += 1;
      console.error(`NG   ${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log("");
  if (failed > 0) {
    console.error(`${failed} 件の送信に失敗しました。`);
    process.exit(1);
  }
  console.log(`${targets.length} 件を送信しました。受信箱（迷惑メールフォルダも）を確認してください。`);
}

void main().catch((e) => {
  console.error("実行に失敗しました:", e);
  process.exit(1);
});
