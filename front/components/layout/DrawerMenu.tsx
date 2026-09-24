import { TrialBanner } from "@/components/ui/TrialBanner";
import { drawerNavColumns } from "@/lib/routes";
import { NavLinkList } from "./NavLinkList";
import { SnsShare } from "./SnsShare";

type Props = {
	id: string;
	onNavigate: () => void;
};

/** ドロワーメニュー本体（Figma: 1511:458）。全画面を覆い、ヘッダー（ロゴ・×）だけが上に残る。 */
export function DrawerMenu({ id, onNavigate }: Props) {
	return (
		<nav
			id={id}
			aria-label="メインメニュー"
			className="fixed inset-0 z-40 overflow-y-auto bg-brand-blue pt-[96px] pb-[105px]"
		>
			<div className="mx-auto flex w-full max-w-[402px] flex-col items-center px-[10px]">
				<div className="w-full py-4">
					<TrialBanner onNavigate={onNavigate} />
				</div>
				<div className="flex w-full flex-col items-center gap-[37px]">
					<div className="grid w-full grid-cols-2 justify-items-center gap-9 px-[10px] py-5">
						{drawerNavColumns.map((items) => (
							<NavLinkList
								key={items[0].href}
								items={items}
								onNavigate={onNavigate}
							/>
						))}
					</div>
					<SnsShare />
				</div>
			</div>
		</nav>
	);
}
