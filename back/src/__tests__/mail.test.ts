// メール本文の単体テスト
// 実送信は NODE_ENV=test でスキップされるため、送信直前の「組み立て結果」を検証する。
// Resendへの実疎通は scripts/sendTestMail.ts で別途確認する（README参照）。

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildPasswordResetEmail,
  buildTrialApplicationConfirmationEmail,
  buildTrialApplicationAdminNotification,
  buildInquiryAutoReplyEmail,
  trialNotificationEmails,
  sendInquiryAutoReplyEmail,
  type TrialApplicationMailData,
} from "../utils/mail.js";

// 各テストで書き換える環境変数（元の値に戻す）
const ENV_KEYS = ["MAIL_FROM", "FRONTEND_URL", "TRIAL_NOTIFICATION_EMAIL"] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  process.env["MAIL_FROM"] = "noreply@nishioblaze.test";
  process.env["FRONTEND_URL"] = "https://nishioblaze.test";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

const trialData: TrialApplicationMailData = {
  email: "applicant@example.com",
  name: "山田 太郎",
  furigana: "ヤマダ タロウ",
  trialDate: "2026-10-01",
  gender: "male",
  birthDate: "2014-04-01",
  schoolName: "西尾第一小学校",
  cramSchool: undefined,
  phoneNumber: "09012345678",
  motivation: "flyer",
};

describe("buildPasswordResetEmail", () => {
  it("宛先・件名・送信元を設定する", () => {
    const mail = buildPasswordResetEmail("admin@example.com", "raw-token");
    expect(mail.to).toBe("admin@example.com");
    expect(mail.from).toBe("noreply@nishioblaze.test");
    expect(mail.subject).toBe("【西尾ブレイズ管理画面】パスワード再設定のご案内");
  });

  it("FRONTEND_URL を使った再設定リンクを含む", () => {
    const mail = buildPasswordResetEmail("admin@example.com", "raw-token");
    expect(mail.html).toContain(
      "https://nishioblaze.test/admin/reset-password?token=raw-token",
    );
  });

  it("トークンをURLエンコードする", () => {
    const mail = buildPasswordResetEmail("admin@example.com", "a+b/c=d&e");
    expect(mail.html).toContain("token=a%2Bb%2Fc%3Dd%26e");
    expect(mail.html).not.toContain("token=a+b/c=d&e");
  });

  it("MAIL_FROM 未設定時は Resend の既定アドレスにフォールバックする", () => {
    delete process.env["MAIL_FROM"];
    expect(buildPasswordResetEmail("admin@example.com", "t").from).toBe(
      "onboarding@resend.dev",
    );
  });
});

describe("buildTrialApplicationConfirmationEmail", () => {
  it("申込者宛に体験日を含めて送る", () => {
    const mail = buildTrialApplicationConfirmationEmail(trialData);
    expect(mail.to).toBe("applicant@example.com");
    expect(mail.subject).toBe("【西尾ブレイズ】体験申し込みを受け付けました");
    expect(mail.html).toContain("山田 太郎 様");
    expect(mail.html).toContain("2026-10-01");
  });

  it("氏名のHTMLをエスケープする", () => {
    const mail = buildTrialApplicationConfirmationEmail({
      ...trialData,
      name: '<script>alert("x")</script>',
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });
});

describe("buildTrialApplicationAdminNotification", () => {
  it("TRIAL_NOTIFICATION_EMAIL 未設定なら null を返す", () => {
    expect(buildTrialApplicationAdminNotification(trialData)).toBeNull();
  });

  it("カンマ区切りの複数宛先を配列にする", () => {
    process.env["TRIAL_NOTIFICATION_EMAIL"] = "a@example.com, b@example.com ,";
    const mail = buildTrialApplicationAdminNotification(trialData);
    expect(mail?.to).toEqual(["a@example.com", "b@example.com"]);
  });

  it("申込内容を一覧で含む", () => {
    process.env["TRIAL_NOTIFICATION_EMAIL"] = "staff@example.com";
    const mail = buildTrialApplicationAdminNotification(trialData);
    expect(mail?.subject).toBe("【西尾ブレイズ】新しい体験申し込みがありました");
    expect(mail?.html).toContain("山田 太郎");
    expect(mail?.html).toContain("ヤマダ タロウ");
    expect(mail?.html).toContain("男性");
    expect(mail?.html).toContain("西尾第一小学校");
    expect(mail?.html).toContain("09012345678");
    expect(mail?.html).toContain("学校で配布されたチラシ");
    expect(mail?.html).toContain("塾: なし");
  });

  it("きっかけが「その他」なら自由入力を併記する", () => {
    process.env["TRIAL_NOTIFICATION_EMAIL"] = "staff@example.com";
    const mail = buildTrialApplicationAdminNotification({
      ...trialData,
      motivation: "other",
      motivationOther: "友人の<紹介>",
    });
    expect(mail?.html).toContain("その他（友人の&lt;紹介&gt;）");
  });

  it("きっかけが「紹介」なら紹介者名を併記する", () => {
    process.env["TRIAL_NOTIFICATION_EMAIL"] = "staff@example.com";
    const mail = buildTrialApplicationAdminNotification({
      ...trialData,
      motivation: "referral",
      referrerName: "鈴木 花子",
    });
    expect(mail?.html).toContain("紹介者: 鈴木 花子");
  });
});

describe("buildInquiryAutoReplyEmail", () => {
  it("問い合わせ者宛に件名と内容を含めて送る", () => {
    const mail = buildInquiryAutoReplyEmail({
      email: "guest@example.com",
      name: "佐藤 次郎",
      title: "入団について",
      body: "質問があります。",
    });
    expect(mail.to).toBe("guest@example.com");
    expect(mail.from).toBe("noreply@nishioblaze.test");
    expect(mail.subject).toBe("【西尾ブレイズ】お問い合わせを受け付けました");
    expect(mail.html).toContain("佐藤 次郎 様");
    expect(mail.html).toContain("件名: 入団について");
    expect(mail.html).toContain("質問があります。");
    expect(mail.html).toContain("このメールは自動送信です");
  });

  it("本文の改行を <br /> に変換する", () => {
    const mail = buildInquiryAutoReplyEmail({
      email: "guest@example.com",
      name: "佐藤 次郎",
      title: "件名",
      body: "1行目\n2行目",
    });
    expect(mail.html).toContain("1行目<br />2行目");
  });

  it("件名・本文のHTMLをエスケープする", () => {
    const mail = buildInquiryAutoReplyEmail({
      email: "guest@example.com",
      name: "佐藤 次郎",
      title: "<b>強調</b>",
      body: "<img src=x onerror=alert(1)>",
    });
    expect(mail.html).not.toContain("<b>強調</b>");
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;b&gt;強調&lt;/b&gt;");
  });
});

describe("trialNotificationEmails", () => {
  it("未設定なら空配列", () => {
    expect(trialNotificationEmails()).toEqual([]);
  });

  it("空文字だけの指定は無視する", () => {
    process.env["TRIAL_NOTIFICATION_EMAIL"] = " , ,";
    expect(trialNotificationEmails()).toEqual([]);
  });
});

describe("送信ガード", () => {
  it("NODE_ENV=test では RESEND_API_KEY が無くても実送信せず解決する", async () => {
    expect(process.env["NODE_ENV"]).toBe("test");
    await expect(
      sendInquiryAutoReplyEmail({
        email: "guest@example.com",
        name: "佐藤 次郎",
        title: "件名",
        body: "本文",
      }),
    ).resolves.toBeUndefined();
  });
});
