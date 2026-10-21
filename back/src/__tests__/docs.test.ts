// APIドキュメント（/docs）のテスト
// 手書きの OpenAPI 定義が実際のルーティングとずれていないかを機械的に検証する。
// ルートを増やしたのに docs/paths/ を更新し忘れた場合、このテストが落ちる。

import { describe, it, expect } from "vitest";
import { app } from "../app.js";
import { buildOpenApiDocument } from "../docs/openapi.js";

const openApiDocument = buildOpenApiDocument("http://localhost:8080");

// Hono の :param 形式を OpenAPI の {param} 形式に変換する
const toOpenApiPath = (path: string) =>
  path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");

// 実際に登録されているエンドポイント（ミドルウェアと /docs 自身は除く）
const registeredEndpoints = (): string[] => {
  const seen = new Set<string>();
  for (const route of app.routes) {
    if (route.method === "ALL") continue;
    if (route.path === "/docs" || route.path === "/docs/openapi.json") continue;
    seen.add(`${route.method.toLowerCase()} ${toOpenApiPath(route.path)}`);
  }
  return [...seen].sort();
};

// OpenAPI 定義に書かれているエンドポイント
const documentedEndpoints = (): string[] => {
  const paths = openApiDocument.paths as Record<string, Record<string, unknown>>;
  const list: string[] = [];
  for (const [path, item] of Object.entries(paths)) {
    for (const method of Object.keys(item)) {
      list.push(`${method} ${path}`);
    }
  }
  return list.sort();
};

describe("APIドキュメント", () => {
  it("/docs が Scalar のリファレンスを返す", async () => {
    const res = await app.request("/docs");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("/docs/openapi.json");
  });

  it("/docs/openapi.json が OpenAPI 3.1 の定義を返す", async () => {
    const res = await app.request("/docs/openapi.json");
    expect(res.status).toBe(200);

    const doc = (await res.json()) as Record<string, unknown>;
    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.paths as object).length).toBeGreaterThan(0);
  });

  it("実装済みの全エンドポイントがドキュメントに載っている", () => {
    const documented = new Set(documentedEndpoints());
    const missing = registeredEndpoints().filter((e) => !documented.has(e));
    expect(missing).toEqual([]);
  });

  it("ドキュメントに実装されていないエンドポイントが載っていない", () => {
    const registered = new Set(registeredEndpoints());
    const extra = documentedEndpoints().filter((e) => !registered.has(e));
    expect(extra).toEqual([]);
  });
});
