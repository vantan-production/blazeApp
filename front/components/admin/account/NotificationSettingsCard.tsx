"use client";

import { useEffect, useId, useState } from "react";
import {
	accountRequest,
	type NotificationSettingKey,
	type NotificationSettings,
	notificationSettingItems,
} from "@/lib/admin/account";
import { toErrorMessage } from "@/lib/admin/api";
import { useToastStore } from "@/lib/store/useToastStore";
import { ToggleSwitch } from "./ToggleSwitch";

/**
 * メール通知の設定（GET/PATCH /api/notification-settings）。
 * スイッチを切り替えたらその項目だけをすぐに保存する
 */
export function NotificationSettingsCard() {
	const idPrefix = useId();
	const showToast = useToastStore((state) => state.showToast);
	const [settings, setSettings] = useState<NotificationSettings | null>(null);
	const [error, setError] = useState<string | null>(null);
	// 保存中の項目（二重送信を防ぐ）
	const [savingKey, setSavingKey] = useState<NotificationSettingKey | null>(
		null,
	);

	useEffect(() => {
		let ignore = false;
		accountRequest<NotificationSettings>("/api/notification-settings")
			.then((res) => {
				if (!ignore) setSettings(res.data);
			})
			.catch((err) => {
				if (!ignore)
					setError(toErrorMessage(err, "通知設定の取得に失敗しました。"));
			});
		return () => {
			ignore = true;
		};
	}, []);

	const updateSetting = async (key: NotificationSettingKey, value: boolean) => {
		setSavingKey(key);
		try {
			const res = await accountRequest<NotificationSettings>(
				"/api/notification-settings",
				{ method: "PATCH", payload: { [key]: value } },
			);
			setSettings(res.data);
			showToast(value ? "通知をオンにしました。" : "通知をオフにしました。");
		} catch (err) {
			showToast(toErrorMessage(err, "通知設定の保存に失敗しました。"), "error");
		} finally {
			setSavingKey(null);
		}
	};

	return (
		<section
			aria-labelledby={`${idPrefix}-heading`}
			className="flex w-full flex-col gap-3 text-brand-white"
		>
			<h2
				id={`${idPrefix}-heading`}
				className="text-[18px] leading-[26px] font-medium tracking-[1px]"
			>
				メール通知
			</h2>
			{error ? (
				<p className="text-[14px]">{error}</p>
			) : !settings ? (
				<p className="text-[14px]">読み込み中…</p>
			) : (
				<ul className="flex flex-col rounded-[10px] border border-brand-white">
					{notificationSettingItems.map((item) => {
						const labelId = `${idPrefix}-${item.key}-label`;
						const descriptionId = `${idPrefix}-${item.key}-description`;
						return (
							<li
								key={item.key}
								className="flex items-center gap-3 border-brand-white/40 px-[10px] py-3 not-last:border-b"
							>
								<div className="flex flex-1 flex-col gap-[2px]">
									<span
										id={labelId}
										className="text-[14px] leading-[22px] tracking-[1px]"
									>
										{item.label}
									</span>
									<span
										id={descriptionId}
										className="text-[11px] leading-[16px] tracking-[0.5px] opacity-80"
									>
										{item.description}
									</span>
								</div>
								<ToggleSwitch
									checked={settings[item.key]}
									onChange={(checked) => updateSetting(item.key, checked)}
									labelledBy={labelId}
									describedBy={descriptionId}
									disabled={savingKey !== null}
								/>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
