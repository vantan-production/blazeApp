"use client";

import { useState } from "react";
import { z } from "zod";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminTextField } from "@/components/admin/AdminTextField";
import { toErrorMessage } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import {
	ADMIN_ROLE_DESCRIPTIONS,
	ADMIN_ROLE_LABELS,
	INVITATION_ROLES,
	type InvitationCreated,
	type InvitationRole,
	requestAdminJson,
} from "@/lib/admin/users";
import { useToastStore } from "@/lib/store/useToastStore";
import { emailSchema } from "@/lib/validation/schemas";

const invitationSchema = z.object({
	email: emailSchema,
	role: z.enum(["admin", "member"]),
});

type InvitationValues = z.input<typeof invitationSchema>;

type Props = {
	/** 発行できたら一覧を読み直す */
	onCreated: () => void;
};

/**
 * 招待の新規発行フォーム（POST /api/admin/invitations）。
 * 招待リンクは API から返らず、招待先に招待メールで届く（有効期限は7日）
 */
export function InvitationForm({ onCreated }: Props) {
	const showToast = useToastStore((state) => state.showToast);
	const [values, setValues] = useState<InvitationValues>({
		email: "",
		role: "member",
	});
	const [errors, setErrors] = useState<FieldErrors<InvitationValues>>({});
	const [pending, setPending] = useState(false);

	const canSubmit = invitationSchema.safeParse(values).success && !pending;

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = validateForm(invitationSchema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setErrors({});
		setPending(true);
		try {
			await requestAdminJson<InvitationCreated>(
				"/api/admin/invitations",
				"POST",
				result.data,
			);
			showToast(`${result.data.email} に招待メールを送りました。`);
			setValues({ email: "", role: values.role });
			onCreated();
		} catch (err) {
			// 登録済みのアドレス（409）などは back の文言を入力欄の下に出す
			setErrors({
				email: toErrorMessage(err, "招待を発行できませんでした。"),
			});
		} finally {
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={submit}
			noValidate
			className="flex w-full flex-col gap-4 rounded-[10px] border border-white/60 px-3 pt-3 pb-4"
		>
			<h2 className="text-[16px] leading-[22px] font-medium tracking-[1px]">
				新しく招待する
			</h2>
			<AdminTextField
				tone="dark"
				label="招待する人のメールアドレス"
				type="email"
				autoComplete="off"
				placeholder="example@example.com"
				value={values.email}
				error={errors.email}
				onChange={(event) =>
					setValues((prev) => ({ ...prev, email: event.target.value }))
				}
			/>
			<fieldset className="flex flex-col gap-2">
				<legend className="mb-[2px] text-[12px] leading-[22px] font-medium">
					ロール
				</legend>
				{INVITATION_ROLES.map((role) => (
					<RoleOption
						key={role}
						role={role}
						checked={values.role === role}
						onSelect={() => setValues((prev) => ({ ...prev, role }))}
					/>
				))}
				<p className="text-[11px] leading-[18px] opacity-80">
					オーナーとして招待することはできません。登録後に「ユーザー管理」でロールを変更してください。
				</p>
			</fieldset>
			<AdminButton
				type="submit"
				variant="light"
				size="sm"
				disabled={!canSubmit}
			>
				{pending ? "送信中…" : "招待メールを送る"}
			</AdminButton>
			<p className="text-[11px] leading-[18px] opacity-80">
				招待メールのリンクから7日以内に登録してもらいます。同じアドレスにもう一度送ると、前に送ったリンクは使えなくなります。
			</p>
		</form>
	);
}

type RoleOptionProps = {
	role: InvitationRole;
	checked: boolean;
	onSelect: () => void;
};

/** ロールの選択肢（名前と、何ができるかの説明） */
function RoleOption({ role, checked, onSelect }: RoleOptionProps) {
	return (
		<label
			className={`flex cursor-pointer gap-2 rounded-[10px] px-3 py-2 ring-1 ring-white/60 ${checked ? "bg-brand-white text-brand-blue" : ""}`}
		>
			<input
				type="radio"
				name="invitation-role"
				value={role}
				checked={checked}
				onChange={onSelect}
				className="mt-1 accent-brand-blue"
			/>
			<span className="flex flex-col">
				<span className="text-[14px] leading-[22px] font-medium tracking-[1px]">
					{ADMIN_ROLE_LABELS[role]}
				</span>
				<span className="text-[11px] leading-[16px]">
					{ADMIN_ROLE_DESCRIPTIONS[role]}
				</span>
			</span>
		</label>
	);
}
