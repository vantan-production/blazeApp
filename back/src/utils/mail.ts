// メール送信ユーティリティ（Resend）
//
// 各メールは「本文の組み立て（buildXxx）」と「送信（sendXxx）」に分けている。
// 組み立て部分は副作用が無いので単体テストで宛先・件名・エスケープを検証でき、
// 送信部分は scripts/sendTestMail.ts から実際のResend宛に流して疎通確認できる。

import { Resend } from "resend";

// モジュールロード時ではなく初回送信時に生成する（RESEND_API_KEY未設定のテスト環境等でのimport時エラーを避けるため）
let resend: Resend | undefined;
function getResendClient(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

// 組み立て済みのメール1通。Resend の emails.send() にそのまま渡せる形にしておく。
export interface MailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}

// 送信元アドレス（Resend側でドメイン検証済みのものを設定する）
// 環境変数はモジュールロード時ではなく参照時に読む（テストやスクリプトから差し替えられるようにするため）
function mailFrom(): string {
  return process.env.MAIL_FROM ?? "onboarding@resend.dev";
}

// リセットリンクの生成に使うフロントエンドのオリジン
function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? "http://localhost:3000";
}

// 体験申し込みの通知先（カンマ区切りで複数指定可）
export function trialNotificationEmails(): string[] {
  const raw = process.env.TRIAL_NOTIFICATION_EMAIL;
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

// メールHTMLに埋め込む前にユーザー入力をエスケープする（HTML/メールインジェクション対策）
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 組み立て済みのメールをResendへ送信する
 * テスト環境（NODE_ENV=test）では実送信せずスキップする
 * scripts/sendTestMail.ts からも同じ経路で送るため export している
 * @param message - buildXxx() が組み立てたメール
 * @param failureLabel - 送信失敗時のエラーメッセージに使う名称
 */
export async function sendMailMessage(
  message: MailMessage,
  failureLabel = "メール",
): Promise<void> {
  if (process.env.NODE_ENV === "test") return;

  const { error } = await getResendClient().emails.send(message);

  if (error) {
    throw new Error(`${failureLabel}の送信に失敗しました: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// パスワード再設定
// ---------------------------------------------------------------------------

/**
 * パスワード再設定メールを組み立てる
 * @param to - 送信先メールアドレス
 * @param token - リセットトークン（生値。DBにはハッシュのみ保存される）
 */
export function buildPasswordResetEmail(to: string, token: string): MailMessage {
  const resetUrl = `${frontendUrl()}/admin/reset-password?token=${encodeURIComponent(token)}`;

  return {
    from: mailFrom(),
    to,
    subject: "【西尾ブレイズ管理画面】パスワード再設定のご案内",
    html: `
      <p>パスワード再設定のリクエストを受け付けました。</p>
      <p>以下のリンクから新しいパスワードを設定してください（有効期限は1時間です）。</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>このリクエストに心当たりがない場合は、本メールを無視してください。</p>
    `,
  };
}

/**
 * パスワード再設定メールを送信する
 * テスト環境（NODE_ENV=test）では実送信せずスキップする
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  await sendMailMessage(buildPasswordResetEmail(to, token), "パスワード再設定メール");
}

// ---------------------------------------------------------------------------
// 体験申し込み
// ---------------------------------------------------------------------------

// 体験申し込みの通知に使う入力データ
export interface TrialApplicationMailData {
  email: string;
  name: string;
  furigana: string;
  trialDate: string;
  gender: "male" | "female" | "other";
  birthDate: string;
  schoolName: string;
  cramSchool?: string | undefined;
  phoneNumber: string;
  motivation: "flyer" | "instagram" | "referral" | "other";
  motivationOther?: string | undefined;
  referrerName?: string | undefined;
}

const GENDER_LABELS: Record<TrialApplicationMailData["gender"], string> = {
  male: "男性",
  female: "女性",
  other: "その他",
};

const MOTIVATION_LABELS: Record<TrialApplicationMailData["motivation"], string> = {
  flyer: "学校で配布されたチラシ",
  instagram: "インスタグラム",
  referral: "西尾ブレイズの選手、スタッフからの紹介",
  other: "その他",
};

function formatMotivation(data: TrialApplicationMailData): string {
  if (data.motivation === "other" && data.motivationOther) {
    return `${MOTIVATION_LABELS.other}（${escapeHtml(data.motivationOther)}）`;
  }
  if (data.motivation === "referral" && data.referrerName) {
    return `${MOTIVATION_LABELS.referral}（紹介者: ${escapeHtml(data.referrerName)}）`;
  }
  return MOTIVATION_LABELS[data.motivation];
}

/** 体験申し込みの受付確認メール（申込者宛）を組み立てる */
export function buildTrialApplicationConfirmationEmail(
  data: TrialApplicationMailData,
): MailMessage {
  return {
    from: mailFrom(),
    to: data.email,
    subject: "【西尾ブレイズ】体験申し込みを受け付けました",
    html: `
      <p>${escapeHtml(data.name)} 様</p>
      <p>体験申し込みを受け付けました。担当者よりご連絡いたしますので、しばらくお待ちください。</p>
      <p>体験日: ${escapeHtml(data.trialDate)}</p>
      <p>このメールに心当たりがない場合は、本メールを無視してください。</p>
    `,
  };
}

/**
 * 体験申し込みの受付確認メールを申込者に送信する
 * テスト環境（NODE_ENV=test）では実送信せずスキップする
 */
export async function sendTrialApplicationConfirmationEmail(
  data: TrialApplicationMailData,
): Promise<void> {
  await sendMailMessage(buildTrialApplicationConfirmationEmail(data), "体験申し込み確認メール");
}

/**
 * 体験申し込みの管理者通知メールを組み立てる
 * TRIAL_NOTIFICATION_EMAIL が未設定なら宛先が無いので null を返す
 */
export function buildTrialApplicationAdminNotification(
  data: TrialApplicationMailData,
): MailMessage | null {
  const to = trialNotificationEmails();
  if (to.length === 0) return null;

  return {
    from: mailFrom(),
    to,
    subject: "【西尾ブレイズ】新しい体験申し込みがありました",
    html: `
      <p>新しい体験申し込みがありました。</p>
      <ul>
        <li>体験日: ${escapeHtml(data.trialDate)}</li>
        <li>名前: ${escapeHtml(data.name)}（${escapeHtml(data.furigana)}）</li>
        <li>性別: ${GENDER_LABELS[data.gender]}</li>
        <li>生年月日: ${escapeHtml(data.birthDate)}</li>
        <li>学校名: ${escapeHtml(data.schoolName)}</li>
        <li>塾: ${data.cramSchool ? escapeHtml(data.cramSchool) : "なし"}</li>
        <li>メールアドレス: ${escapeHtml(data.email)}</li>
        <li>電話番号: ${escapeHtml(data.phoneNumber)}</li>
        <li>きっかけ: ${formatMotivation(data)}</li>
      </ul>
    `,
  };
}

/**
 * 体験申し込みがあったことを管理者宛に通知する
 * TRIAL_NOTIFICATION_EMAIL未設定時・テスト環境では実送信せずスキップする
 */
export async function sendTrialApplicationAdminNotification(
  data: TrialApplicationMailData,
): Promise<void> {
  const message = buildTrialApplicationAdminNotification(data);
  if (!message) {
    console.warn(
      "[trial-application] TRIAL_NOTIFICATION_EMAIL未設定のため通知メールをスキップしました",
    );
    return;
  }

  await sendMailMessage(message, "体験申し込み通知メール");
}

// ---------------------------------------------------------------------------
// 問い合わせ
// ---------------------------------------------------------------------------

// 問い合わせの自動返信に使う入力データ
export interface InquiryAutoReplyMailData {
  email: string;
  name: string;
  title: string;
  body: string;
}

/** 問い合わせ受付の自動返信メール（お客様宛）を組み立てる */
export function buildInquiryAutoReplyEmail(data: InquiryAutoReplyMailData): MailMessage {
  return {
    from: mailFrom(),
    to: data.email,
    subject: "【西尾ブレイズ】お問い合わせを受け付けました",
    html: `
      <p>${escapeHtml(data.name)} 様</p>
      <p>問い合わせありがとうございます。スタッフが順に対応していきます。今しばらくお待ちください。</p>
      <hr />
      <p>【お問い合わせ内容】</p>
      <p>件名: ${escapeHtml(data.title)}</p>
      <p>${escapeHtml(data.body).replace(/\n/g, "<br />")}</p>
      <hr />
      <p>※このメールは自動送信です。このメールへの返信ではお問い合わせを受け付けられません。</p>
    `,
  };
}

/**
 * 問い合わせ受付の自動返信メールをお客様に送信する
 * テスト環境（NODE_ENV=test）では実送信せずスキップする
 */
export async function sendInquiryAutoReplyEmail(
  data: InquiryAutoReplyMailData,
): Promise<void> {
  await sendMailMessage(buildInquiryAutoReplyEmail(data), "問い合わせ自動返信メール");
}
