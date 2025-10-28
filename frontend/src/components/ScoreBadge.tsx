export type ScoreBadgeProps = {
	value: number; // 0–1
};

export function ScoreBadge({ value }: ScoreBadgeProps) {
	const clamped = Math.max(0, Math.min(1, value));

	// pick color by range
	const color =
		clamped < 0.33
			? "bg-red-500"
			: clamped < 0.66
				? "bg-yellow-400"
				: "bg-green-500";

	const label = (clamped * 100).toFixed(0) + "%";

	return (
		<span
			className={`inline-flex items-center justify-center rounded-full ${color} text-white text-[10px] font-medium px-2 py-0.5 leading-tight`}
			title={`Score: ${label}`}
		>
			{label}
		</span>
	);
}
