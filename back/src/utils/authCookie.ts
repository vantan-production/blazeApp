// 認証トークンの Cookie（Set-Cookie ヘッダーの値）を組み立てる
//
// front（www.example.com）と API（api.example.com）が別ホストのとき、Domain なしの Cookie は
// API ホスト専用になり、front のサーバー側（lib/auth.ts の getCurrentUser）から読めない。
// COOKIE_DOMAIN（例: nishio-blaze.com）を指定すると、そのドメイン配下の全ホストで共有される。
// 未指定ならこれまでどおり API ホスト専用（ローカル開発・テストはこちら）。

const domainAttr = (): string => {
  const domain = process.env.COOKIE_DOMAIN;
  return domain ? `; Domain=${domain}` : "";
};

//  HttpOnlyはXSS攻撃対策
//  Secureはhttpsのみ送信可能httpは不可
//  SameSite=StrictはCSRF攻撃対策（www と api は同一サイトなので送られる）
//  Path=/はサイト全体でCookieの使用が可能
const baseAttrs = () => `HttpOnly; Secure; SameSite=Strict; Path=/${domainAttr()}`;

/** ログイン・登録・復活時に発行する Cookie（Max-Age=2592000は1ヶ月） */
export const tokenCookie = (rawToken: string): string =>
  `token=${rawToken}; ${baseAttrs()}; Max-Age=2592000`;

/** ログアウト・削除時に Cookie を消す（発行時と同じ Domain でないと消えない） */
export const clearedTokenCookie = (): string =>
  `token=; ${baseAttrs()}; Max-Age=0`;
