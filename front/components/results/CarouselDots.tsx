type Props = {
	count: number;
	index: number;
	onSelect: (index: number) => void;
};

/** カルーセルの現在位置を示すドット。現在の位置は黄色の横長にする */
export function CarouselDots({ count, index, onSelect }: Props) {
	return (
		<div className="flex items-center gap-2">
			{Array.from({ length: count }, (_, i) => (
				<button
					// biome-ignore lint/suspicious/noArrayIndexKey: 位置そのものを表すドットのため
					key={i}
					type="button"
					onClick={() => onSelect(i)}
					aria-label={`${i + 1}枚目を表示`}
					aria-current={i === index}
					className={`h-2 cursor-pointer rounded-full transition-all ${
						i === index ? "w-6 bg-brand-yellow" : "w-2 bg-brand-white/40"
					}`}
				/>
			))}
		</div>
	);
}
