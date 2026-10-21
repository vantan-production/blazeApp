// DB接続の SSL 設定（src/db/ssl.ts）のテスト。
// 本番で RDS の証明書を検証できず `self-signed certificate in certificate chain` で
// 全接続が失敗した障害の再発防止として、
// - 環境ごとの ssl 設定
// - 同梱した RDS CA バンドルの中身
// - pg が実際に TLS ハンドシェイクで ca を使って検証すること
// を確かめる。

import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSslConfig, RDS_CA_BUNDLE_PATH } from "../db/ssl.js";

// テスト専用の自己署名CAと、それで署名した localhost 用サーバー証明書（実環境では使わない）
const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/tls",
);
const TEST_CA_PATH = path.join(fixtureDir, "ca.pem");
const serverCert = readFileSync(path.join(fixtureDir, "server.pem"), "utf-8");
const serverKey = readFileSync(path.join(fixtureDir, "server.key"), "utf-8");
const testCa = readFileSync(TEST_CA_PATH, "utf-8");

// PEM バンドルを証明書ごとに分けて読む
function parseBundle(pem: string): X509Certificate[] {
  return (
    pem.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
    ) ?? []
  ).map((c) => new X509Certificate(c));
}

describe("buildSslConfig", () => {
  it("test では SSL を無効にする（ローカルDockerのDBはSSL非対応）", () => {
    expect(buildSslConfig("test")).toBe(false);
  });

  it("production では RDS の CA バンドルを信頼し、証明書を厳格に検証する", () => {
    const ssl = buildSslConfig("production");
    expect(ssl).not.toBe(false);
    if (ssl === false) return;
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.ca).toBe(readFileSync(RDS_CA_BUNDLE_PATH, "utf-8"));
  });

  it("開発環境では暗号化のみ（証明書は検証しない）", () => {
    expect(buildSslConfig("development")).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("production で CA バンドルが無いときは起動時に失敗する（検証なしで繋がない）", () => {
    expect(() =>
      buildSslConfig("production", path.join(fixtureDir, "missing.pem")),
    ).toThrow();
  });
});

describe("同梱の RDS CA バンドル", () => {
  const certs = parseBundle(readFileSync(RDS_CA_BUNDLE_PATH, "utf-8"));

  it("Amazon RDS の CA 証明書だけが入っている", () => {
    expect(certs.length).toBeGreaterThan(0);
    for (const c of certs) {
      expect(c.subject).toContain("OU=Amazon RDS");
      expect(c.ca).toBe(true);
    }
  });

  it("本番DB（ap-northeast-1, rds-ca-rsa2048-g1）のルートCAが有効期限内で入っている", () => {
    const root = certs.find((c) =>
      c.subject.includes("CN=Amazon RDS ap-northeast-1 Root CA RSA2048 G1"),
    );
    expect(root).toBeDefined();
    expect(new Date(root?.validTo ?? 0).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("pg の TLS 接続での証明書検証", () => {
  // Postgres の SSLRequest に 'S' と返してから TLS に切り替えるだけの最小サーバー。
  // サーバー証明書と一緒にルートCAも送る（RDS と同じく、検証できないと
  // `self-signed certificate in certificate chain` になる構成）。
  let server: net.Server;
  let port: number;
  let handshakes = 0;

  beforeAll(async () => {
    server = net.createServer((socket) => {
      socket.once("data", () => {
        socket.write("S");
        const secure = new tls.TLSSocket(socket, {
          isServer: true,
          cert: `${serverCert}\n${testCa}`,
          key: serverKey,
        });
        secure.on("secure", () => {
          handshakes++;
          secure.destroy();
        });
        secure.on("error", () => secure.destroy());
      });
      socket.on("error", () => socket.destroy());
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    port = (server.address() as net.AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function connectError(
    ssl: ReturnType<typeof buildSslConfig>,
  ): Promise<Error> {
    const client = new pg.Client({
      connectionString: `postgres://u:p@localhost:${port}/db`,
      ssl,
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      throw new Error("接続できてしまった");
    } catch (err) {
      return err as Error;
    } finally {
      await client.end().catch(() => {});
    }
  }

  it("信頼する CA で署名された証明書ならハンドシェイクが通る", async () => {
    const before = handshakes;
    const err = await connectError(buildSslConfig("production", TEST_CA_PATH));
    // ハンドシェイク後にサーバーが切断するためエラーにはなるが、証明書エラーではない
    expect(err.message).not.toMatch(/certificate/i);
    expect(handshakes).toBe(before + 1);
  });

  it("信頼していない CA の証明書は拒否する（本番の障害と同じエラー）", async () => {
    // RDS の CA バンドルにはこのテスト用CAは入っていない
    const err = await connectError(buildSslConfig("production"));
    expect(err.message).toMatch(/self-signed certificate in certificate chain/);
  });

  it("ca を渡さないと Node の既定の信頼ストアでは検証できない（修正前の状態）", async () => {
    const err = await connectError({ rejectUnauthorized: true });
    expect(err.message).toMatch(/self-signed certificate in certificate chain/);
  });
});
