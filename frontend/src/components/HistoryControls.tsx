interface HistoryControlsProps {
	onBack: () => void;
	onForward: () => void;
	onDelete: () => void;
	backDisabled: boolean;
	forwardDisabled: boolean;
	deleteDisabled: boolean;
}

export const buttonBaseStyle =
	"flex items-center justify-center px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed";

export function HistoryControls({
	onBack,
	onForward,
	onDelete,
	backDisabled,
	forwardDisabled,
	deleteDisabled,
}: HistoryControlsProps) {
	return (
		<>
			<div className="flex flex-col gap-2">
				<h2 className="text-sm font-medium text-gray-700">Past searches</h2>
				<div className="inline-flex rounded-lg shadow-sm border border-gray-200 overflow-hidden w-fit">
					{/* Back Button */}
					<button
						type="button"
						className={buttonBaseStyle}
						disabled={backDisabled}
						onClick={onBack}
					>
						<img
							width="24px"
							height="24px"
							src="left-arrow-back-svgrepo-com.svg"
							alt="back"
						/>
					</button>

					{/* Forward Button */}
					<button
						type="button"
						className={`${buttonBaseStyle} border-l border-gray-200`}
						disabled={forwardDisabled}
						onClick={onForward}
					>
						<img
							width="24px"
							height="24px"
							src="right-arrow-next-svgrepo-com.svg"
							alt="next"
						/>
					</button>

					{/* Delete Button */}
					<button
						type="button"
						className={`${buttonBaseStyle} border-l border-gray-200`}
						disabled={deleteDisabled}
						onClick={onDelete}
					>
						<img
							width="24px"
							height="24px"
							src="red-x-10333.svg"
							alt="delete"
						/>
					</button>
				</div>
			</div>
		</>
	);
}
