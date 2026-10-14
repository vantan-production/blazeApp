// 日本時間の日付の扱い（体験日との比較用）

// サーバー（ECS）は UTC で動くため、素の new Date() で日付を取ると
// 日本時間の0時〜9時の間は「昨日」扱いになり、前日が体験日だった人まで候補に出てしまう。
// 体験日は日本の日付で入力されているので、比較も日本時間の日付で行う。
const jstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 日本時間での今日の日付（YYYY-MM-DD） */
export function todayInJst(now: Date = new Date()): string {
  return jstDateFormatter.format(now);
}
