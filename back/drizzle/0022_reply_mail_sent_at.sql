-- 問い合わせへの返信を、問い合わせ元のメールアドレスにも送る
--
-- reply.mail_sent_at: 返信メールが問い合わせ元に届いた（Resend が受け付けた）時刻。
-- 未送信・送信失敗・宛先なし（email 欄追加前の問い合わせ）は NULL のまま。
-- 返信自体は送信の成否にかかわらず保存し、NULL の返信は管理画面から再送できるようにする。
-- この機能より前の返信はメールを送っていないため、既存行も NULL のままにする。
ALTER TABLE "reply" ADD COLUMN "mail_sent_at" timestamp;
