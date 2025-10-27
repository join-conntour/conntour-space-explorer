import { Source } from "./Sources";

export const ImageCard: React.FC<{ image: Source }> = ({ image }) =>
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
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          View Full Image
        </a>
      )}
    </div>
  </div>;