import { useState } from "react";
import { Source } from "./Sources";
import { Modal } from "./modal";

export const ImageCard: React.FC<{ image: Source }> = ({ image }) => {
  const [open, setOpen] = useState(false);
  return <>
    <div key={image.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
      {image.image_url && (
        <img
          src={image.image_url}
          alt={image.name}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-2">{image.name}</h2>
        <p className="text-gray-600 mb-2 line-clamp-3">{image.description}</p>
        <p className="text-sm text-gray-500 mb-4">
          {image.launch_date && new Date(image.launch_date).toLocaleDateString()}
        </p>
        {image.image_url && (
          <a
            href={image.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors mr-8"
          >
            View Full Image
          </a>
        )}
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          onClick={() => setOpen(true)}>Read more</button>
      </div>
    </div >
    {open && <Modal onClose={() => setOpen(false)}>
      <h2 className="text-xl font-semibold text-gray-900 mb-3">
        {image.name}
      </h2>
      <h2 className="text-l font-semibold text-gray-500 ml-auto mb-3">
        {new Date(image.launch_date).toDateString()}
      </h2>
      <p className="text-gray-600 text-sm leading-relaxed mb-6">
        {image.description}
      </p>
      <button
        onClick={() => setOpen(false)}
        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
      >
        Close
      </button>
    </Modal>}
  </>;
}
