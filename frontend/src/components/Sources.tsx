import React, { useEffect, useState, useRef } from 'react';
import { debounce, DebouncedFunc } from 'lodash';
import apiClient from '../api';
import { CONFIDENCE_THRESHOLD_HIGH, CONFIDENCE_THRESHOLD_MEDIUM, PAGINATION_LIMIT } from '../constants';
import { Source, SourcesResponse } from '../types';
import { Button, Badge, Icon, EmptyState, ErrorMessage, Pagination, ResultsCount, LoadingSpinner } from './shared';
import { cardClasses, badgeClasses, textClasses, buttonClasses } from '../styles/classes';
import { isInvalidDate } from '../utils/dateUtils';

interface SourcesProps {
  sources?: Source[];
  showConfidence?: boolean;
  onSourceClick?: (source: Source) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    onPageChange: (page: number) => void;
  };
  startDate?: string;
  endDate?: string;
}

const Sources: React.FC<SourcesProps> = ({ sources, showConfidence = false, onSourceClick, pagination, startDate = '', endDate = '' }) => {
  const [images, setImages] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [paginationData, setPaginationData] = useState<{
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  } | null>(null);

  const fetchImagesRef = useRef<DebouncedFunc<() => Promise<void>> | null>(null);

  useEffect(() => {
    if (sources !== undefined) {
      setImages(sources);
      setLoading(false);
      return;
    }

    // Don't make API call if dates are invalid
    if (isInvalidDate(startDate) || isInvalidDate(endDate)) {
      return;
    }

    const fetchImages = async () => {
      try {
        setLoading(true);
        const params: { page: number; limit: number; start_date?: string; end_date?: string } = {
          page: pagination?.page || page,
          limit: pagination?.limit || PAGINATION_LIMIT,
        };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await apiClient.get<SourcesResponse>('/api/sources', { params });
        setImages(response.data.results);
        setPaginationData({
          total: response.data.total,
          page: response.data.page,
          limit: response.data.limit,
          total_pages: response.data.total_pages,
        });
        setPage(response.data.page);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch space images');
        setLoading(false);
      }
    };

    // Create debounced version if it doesn't exist
    if (!fetchImagesRef.current) {
      fetchImagesRef.current = debounce(fetchImages, 400);
    } else {
      // Cancel previous debounced call and create new one with updated closure
      fetchImagesRef.current.cancel();
      fetchImagesRef.current = debounce(fetchImages, 400);
    }

    fetchImagesRef.current();

    // Cleanup function to cancel pending debounced calls
    return () => {
      if (fetchImagesRef.current) {
        fetchImagesRef.current.cancel();
      }
    };
  }, [sources, page, pagination?.page, pagination?.limit, startDate, endDate]);

  useEffect(() => {
    // Reset to first page when filters change
    if (sources === undefined) {
      setPage(1);
    }
  }, [startDate, endDate, sources]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} className="text-center p-6" />;
  }

  const getConfidenceColor = (confidence?: number) => {
    if (confidence === undefined) return '';
    if (confidence > CONFIDENCE_THRESHOLD_HIGH) return 'border-green-500';
    if (confidence > CONFIDENCE_THRESHOLD_MEDIUM) return 'border-yellow-500';
    return 'border-red-500';
  };

  const handlePageChange = (newPage: number) => {
    if (pagination) {
      pagination.onPageChange(newPage);
    } else {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentPagination = pagination || paginationData;
  const displayPage = pagination?.page || page;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Top Pagination */}
      {currentPagination && (
        <div className="mb-8">
          <Pagination
            currentPage={displayPage}
            totalPages={currentPagination.total_pages}
            onPageChange={handlePageChange}
          />
          <ResultsCount
            currentPage={displayPage}
            limit={currentPagination.limit}
            total={currentPagination.total}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((image) => (
          <div
            key={image.id}
            className={`${cardClasses.containerHover} ${
              showConfidence && image.confidence !== undefined
                ? `border-2 ${getConfidenceColor(image.confidence)}`
                : ''
            }`}
          >
            {/* Image - fixed height */}
            <div className="w-full h-48 bg-gradient-to-br from-purple-900/30 to-blue-900/30 flex-shrink-0 overflow-hidden rounded-t-3xl">
              {image.image_url ? (
                <img
                  src={image.image_url}
                  alt={image.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-purple-400/50">
                  <Icon name="image" className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Content - flex column with grow */}
            <div className="p-5 flex flex-col flex-grow">
              {/* Title and confidence badge */}
              <div className="flex justify-between items-start mb-2 flex-shrink-0">
                <h2 className={`${textClasses.title} flex-1 pr-2 line-clamp-2 leading-tight`}>{image.name}</h2>
                {showConfidence && image.confidence !== undefined && (
                  <Badge
                    variant="confidence"
                    confidence={
                      image.confidence > CONFIDENCE_THRESHOLD_HIGH
                        ? 'high'
                        : image.confidence > CONFIDENCE_THRESHOLD_MEDIUM
                        ? 'medium'
                        : 'low'
                    }
                    className="ml-2"
                  >
                    {(image.confidence * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>

              {/* Date - positioned right after title, aligned across all cards */}
              <div className="mb-3 h-[1.25rem] flex-shrink-0 flex items-center">
                {image.launch_date && (
                  <p className="text-xs text-purple-300/70 font-medium">
                    {new Date(image.launch_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                )}
              </div>

              {/* Description - fixed height */}
              <p className="text-purple-200/80 mb-3 line-clamp-3 h-[4.5rem] flex-shrink-0 text-sm leading-relaxed">{image.description}</p>

              {/* Keywords - fixed height to keep cards uniform */}
              {image.keywords && image.keywords.length > 0 ? (
                <div className="mb-4 flex-shrink-0 h-[3.5rem] overflow-hidden">
                  <div className="flex flex-wrap gap-2">
                    {image.keywords.slice(0, 3).map((keyword, index) => (
                      <Badge key={index} variant="keyword">
                        {keyword}
                      </Badge>
                    ))}
                    {image.keywords.length > 3 && (
                      <Badge variant="keyword" className="bg-purple-900/30 text-purple-300 border-purple-500/30">
                        +{image.keywords.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4 flex-shrink-0 h-[3.5rem]"></div>
              )}

              {/* Button - pushed to bottom */}
              <div className="mt-auto flex-shrink-0">
                {onSourceClick ? (
                  <Button
                    variant="primary"
                    onClick={() => onSourceClick(image)}
                    className="w-full px-4 py-3"
                  >
                    View Details
                  </Button>
                ) : (
                  image.image_url && (
                    <a
                      href={image.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-block w-full text-center ${buttonClasses.primary}`}
                    >
                      View Details
                    </a>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Pagination */}
      {currentPagination && currentPagination.total_pages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={displayPage}
            totalPages={currentPagination.total_pages}
            onPageChange={handlePageChange}
          />
          <ResultsCount
            currentPage={displayPage}
            limit={currentPagination.limit}
            total={currentPagination.total}
          />
        </div>
      )}
    </div>
  );
};

export default Sources; 