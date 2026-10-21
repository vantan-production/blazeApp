// 応答が返ってこない処理を待ち続けないための補助
// （メール送信のように外部サービスを待つ処理で、リクエストが ALB のタイムアウトまで固まらないようにする）

/** ms 以内に終わらなければ reject する（処理自体は止められないが、待つのはやめる） */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`送信が${ms}ms以内に終わりませんでした`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
