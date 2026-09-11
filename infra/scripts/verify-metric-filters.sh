#!/usr/bin/env bash
# CloudWatch のメトリクスフィルタが、アプリの実際のログ行に一致するかを
# **デプロイせずに** 検証する。
#
# ■ 何のための検証か
# アラームは infra/lib/backend-stack.ts のフィルタパターンと
# back/src/utils/monitoring.ts の出力するフィールド名との「文字列の一致」で成り立っている。
# どちらか片方だけを変えても、CDK は通り、テストも通り、デプロイも成功する。
# そして**アラームだけが静かに鳴らなくなる**。監視で最悪の壊れ方であり、
# 本番で異常が起きるまで誰も気づけない。
# ここでは両者を機械で突き合わせ、その食い違いを検出する。
#
# ■ AWS リソースは作らない
# 使うのは TestMetricFilter API のみ。パターンとログ行を渡すと一致結果を返すだけで、
# ロググループもメトリクスも作成しない。読み取り権限があれば実行できる。
#
# 前提:
#   - テスト用 Postgres / Redis が起動していること（back/docker-compose.test.yml）
#   - AWS の認証情報が設定されていること（aws sts get-caller-identity が通ること）
#
# 使い方:
#   infra/scripts/verify-metric-filters.sh

set -euo pipefail

cd "$(dirname "$0")/.."
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> アプリを動かして実際のログ行を採取する"
(cd ../back && npm run monitoring:samples --silent) > "$WORK/samples.ndjson"
echo "    $(wc -l < "$WORK/samples.ndjson" | tr -d ' ') 行を採取した"

echo "==> CDK を合成してフィルタパターンを取り出す"
npx cdk synth \
  -c stage=prod \
  -c corsOrigin=https://example.com \
  -c frontendUrl=https://example.com \
  -c mailFrom=noreply@example.com \
  -c alertEmail=verify@example.com \
  > "$WORK/synth.yaml" 2>/dev/null

echo "==> TestMetricFilter で突き合わせる"
python3 - "$WORK" <<'PY'
import json, re, subprocess, sys, pathlib

work = pathlib.Path(sys.argv[1])
synth = (work / "synth.yaml").read_text()
samples = [l for l in (work / "samples.ndjson").read_text().splitlines() if l.strip()]

# FilterPattern とその MetricFilter が作る MetricName を対にする
pairs = re.findall(
    r"FilterPattern: '(.+?)'\n\s+LogGroupName:[\s\S]*?MetricName: (\w+)", synth
)
if not pairs:
    sys.exit("!! 合成結果からフィルタパターンを取り出せなかった")

failed = []
for pattern, metric in pairs:
    (work / "req.json").write_text(
        json.dumps({"filterPattern": pattern, "logEventMessages": samples})
    )
    proc = subprocess.run(
        ["aws", "logs", "test-metric-filter",
         "--cli-input-json", f"file://{work / 'req.json'}", "--output", "json"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        print(f"  !! {metric}: AWS 呼び出しに失敗\n{proc.stderr.strip()[:300]}")
        failed.append(metric)
        continue

    kinds = []
    for m in json.loads(proc.stdout).get("matches", []):
        line = json.loads(samples[int(m["eventNumber"]) - 1])
        kinds.append(line.get("kind") or line["type"])

    if kinds:
        print(f"  OK   {metric:20s} -> {', '.join(kinds)}")
    else:
        # 一致0件＝このアラームは本番で永久に鳴らない
        print(f"  NG   {metric:20s} -> 一致するログ行が無い")
        print(f"       pattern: {pattern}")
        failed.append(metric)

if failed:
    sys.exit(
        f"\n!! {len(failed)} 件のフィルタがログ行に一致しない: {', '.join(failed)}\n"
        "   infra/lib/backend-stack.ts のパターンと\n"
        "   back/src/utils/monitoring.ts の出力フィールドを突き合わせること"
    )
print(f"\n全 {len(pairs)} 件のフィルタがログ行に一致した")
PY
