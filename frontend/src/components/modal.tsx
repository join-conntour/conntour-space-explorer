import { useEffect } from "react";

// done with some help from chatGPT
export function Modal({
	children,
	onClose,
}: {
	children?: React.ReactNode;
	onClose: () => void;
}) {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	// Lock body scroll
	useEffect(() => {
		const original = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = original;
		};
	}, []);

	return (
		<div
			className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
			onClick={onClose}
			onScroll={(e) => {
				e.stopPropagation();
				e.preventDefault();
			}}
		>
			<div
				className="relative bg-white rounded-2xl shadow-lg p-6 w-full max-w-md max-h-[80vh] overflow-auto shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				{children}
			</div>
		</div>
	);
}
