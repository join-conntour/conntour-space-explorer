import axios from "axios";
import { useEffect, useState } from "react";
import { Source, Sources } from "./Sources";

// response of fetch of remote resource
interface RemoteRes<T> {
	data?: T;
	error?: string;
}

// The role of this component is to fetch data from server, show error/loading/data-display
export const DataLoader: React.FC = () => {
	const [data, setData] = useState<RemoteRes<Source[]>>();

	useEffect(() => {
		const fetchImages = async () => {
			try {
				const { data } = await axios.get("/api/sources");
				setData({ data });
			} catch (err) {
				setData({
					error: "Failed to fetch space images",
				});
			}
		};

		fetchImages();
	}, []);

	if (!data) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		);
	} else if (data.error) {
		return <div className="text-red-500 text-center p-4">{data.error}</div>;
	} else if (data.data) {
		return <Sources images={data.data} />;
	}
	return null;
};
