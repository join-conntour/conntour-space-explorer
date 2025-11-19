import React, { useState } from 'react';
import { Source } from '../types';
import { Button, Badge, Icon, Card } from './shared';
import { cardClasses, textClasses, badgeClasses } from '../styles/classes';
import { formatDate } from '../utils/dateUtils';

interface ImageDetailProps {
  source: Source;
  onBack: () => void;
}

const ImageDetail: React.FC<ImageDetailProps> = ({ source, onBack }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleViewFullImage = () => {
    if (source.original_url) {
      window.open(source.original_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Determine which image URL to use (medium_url preferred, fallback to thumb_url)
  const displayImageUrl = source.medium_url || source.thumb_url;

  // Calculate aspect ratio and container height
  const aspectRatio = source.medium_width && source.medium_height
    ? source.medium_height / source.medium_width
    : null;
  
  // Use a max height of 600px, but maintain aspect ratio
  const maxHeight = 600;
  const containerHeight = aspectRatio && source.medium_width
    ? Math.min(source.medium_width * aspectRatio, maxHeight)
    : maxHeight;

  return (
    <div>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto overflow-hidden">
            {/* Image Container with Reserved Space */}
          {displayImageUrl && (
            <div 
              className="w-full bg-gradient-to-br from-purple-900/30 to-blue-900/30 relative overflow-hidden rounded-t-3xl"
              style={{
                height: imageLoaded || imageError ? 'auto' : `${containerHeight}px`,
                minHeight: imageLoaded || imageError ? 'auto' : '200px'
              }}
            >
              {/* Loading Skeleton */}
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-purple-900/20 to-blue-900/20 flex items-center justify-center">
                  <Icon name="image" className="w-16 h-16 text-purple-400/50" />
                </div>
              )}
              
              {/* Actual Image */}
              <img
                src={displayImageUrl}
                alt={source.name}
                className={`w-full h-auto object-contain mx-auto transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ maxHeight: `${maxHeight}px` }}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(true);
                }}
              />
              
              {/* Error State */}
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-blue-900/30">
                  <div className="text-center text-purple-300">
                    <Icon name="info" className="w-16 h-16 mx-auto mb-3" />
                    <p className="font-semibold">Failed to load image</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6 md:p-8">
            {/* Title */}
            <h1 className={`text-3xl font-bold ${textClasses.headingGradient} mb-6`}>{source.name}</h1>

            {/* Metadata */}
            <div className="flex flex-wrap gap-3 mb-8">
              {source.launch_date && (
                <Badge variant="metadata">
                  <Icon name="calendar" className="w-4 h-4" />
                  <span>{formatDate(source.launch_date, 'long')}</span>
                </Badge>
              )}
              <Badge variant="metadataBlue">
                <Icon name="tag" className="w-4 h-4" />
                <span className="capitalize">{source.type}</span>
              </Badge>
              <Badge variant="metadataCyan">
                <Icon name="check" className="w-4 h-4" />
                <span>{source.status}</span>
              </Badge>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className={`${textClasses.heading3} mb-4`}>Description</h2>
              <p className={`${textClasses.bodyLight} leading-relaxed text-lg`}>{source.description}</p>
            </div>

            {/* Keywords */}
            {source.keywords && source.keywords.length > 0 && (
              <div className="mb-8">
                <h2 className={`${textClasses.heading3} mb-4`}>Keywords</h2>
                <div className="flex flex-wrap gap-3">
                  {source.keywords.map((keyword, index) => (
                    <Badge key={index} variant="keywordLarge">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* View Full Image Button */}
            {source.original_url && (
              <div className="pt-6 border-t border-purple-500/30">
                <Button
                  variant="primary"
                  onClick={handleViewFullImage}
                  className="w-full md:w-auto px-8 py-4 flex items-center justify-center gap-2"
                >
                  <Icon name="image" />
                  View Full Image
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ImageDetail;

