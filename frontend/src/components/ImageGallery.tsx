import React from "react";
import { indexBy } from "../utils/stdlib";
import { ImageCard } from "./ImageCard";
import { Source, ImageSet } from "./Sources";

export const ImageGallery = React.memo(
  ({ images, chosenSet }: { images: Source[]; chosenSet?: ImageSet; }) => {
    if (!chosenSet) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map(
            (image) => image && <ImageCard key={image.id} image={image} />
          )}
        </div>
      );
    }
    const indexById = indexBy("id" as const, images);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chosenSet.map(({ id, key }) => {
          const image = indexById.get(id)!;
          return <ImageCard key={id} image={image} score={key} />;
        })}
      </div>
    );
  }
);
