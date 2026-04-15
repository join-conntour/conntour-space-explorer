import React from 'react';
import type { Source } from '../types';

interface SourceCardProps {
  source: Source;
  onDiscover: (source: Source) => void;
  /** Optional confidence score (0-1) shown as a badge */
  score?: number;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? 'bg-green-600' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white ${color}`}>
      {pct}% match
    </span>
  );
}

export default function SourceCard({ source, onDiscover, score }: SourceCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow flex flex-col">
      {/* Image */}
      <div className="relative h-48 bg-gray-700 flex-shrink-0">
        {source.image_url ? (
          <img
            src={source.image_url}
            alt={source.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <span className="text-4xl">🛸</span>
          </div>
        )}
        {/* Type badge */}
        <span className="absolute top-2 right-2 bg-black/60 text-gray-200 text-xs px-2 py-1 rounded capitalize">
          {source.type}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 flex-1">
            {source.name}
          </h3>
          {score !== undefined && <ScoreBadge score={score} />}
        </div>

        <p className="text-gray-400 text-xs line-clamp-3 flex-1">{source.description}</p>

        <div className="text-gray-500 text-xs mt-1">{formatDate(source.launch_date)}</div>

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          {source.image_url && (
            <a
              href={source.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition-colors"
            >
              View Image
            </a>
          )}
          <button
            onClick={() => onDiscover(source)}
            className="flex-1 text-center text-xs border border-indigo-500 text-indigo-300 hover:bg-indigo-900 px-3 py-1.5 rounded-md transition-colors"
          >
            Discover Similar
          </button>
        </div>
      </div>
    </div>
  );
}
