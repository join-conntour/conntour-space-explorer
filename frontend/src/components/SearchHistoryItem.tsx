import React from 'react';
import { SearchHistoryItem as SearchHistoryItemType } from '../types';
import { Badge, Icon, Button } from './shared';
import { badgeClasses } from '../styles/classes';

interface SearchHistoryItemProps {
  item: SearchHistoryItemType;
  isSelected: boolean;
  onSelect: (searchId: string) => void;
  onDelete: (searchId: string, e: React.MouseEvent) => void;
  formatDate: (timestamp: string) => string;
  variant?: 'inline' | 'popout';
}

const SearchHistoryItem: React.FC<SearchHistoryItemProps> = ({
  item,
  isSelected,
  onSelect,
  onDelete,
  formatDate,
  variant = 'inline',
}) => {
  const paddingClass = variant === 'inline' ? 'p-5' : 'p-4';
  const titleSizeClass = variant === 'inline' ? 'text-lg' : 'text-base';
  const marginTopClass = variant === 'inline' ? 'mt-3' : 'mt-2';
  const badgePaddingClass = variant === 'inline' ? 'px-3 py-1' : 'px-2.5 py-1';

  return (
    <div
      onClick={() => onSelect(item.id)}
      className={`${paddingClass} hover:bg-purple-500/20 cursor-pointer transition-all duration-200 ${
        isSelected
          ? variant === 'inline'
            ? 'bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-l-4 border-purple-500'
            : 'bg-gradient-to-r from-purple-900/40 to-blue-900/40'
          : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className={`font-bold text-purple-100 ${titleSizeClass}`}>{item.query}</p>
          <div className={`flex items-center gap-3 ${marginTopClass} text-sm text-purple-300/80`}>
            <Badge variant="timestamp" className={badgePaddingClass}>
              <Icon name="clock" className="w-4 h-4" />
              {formatDate(item.timestamp)}
            </Badge>
            <Badge variant="resultCount" className={badgePaddingClass}>
              <Icon name="image" className="w-4 h-4" />
              {item.result_count} results
            </Badge>
          </div>
        </div>
        <Button
          variant="iconDanger"
          onClick={(e) => onDelete(item.id, e)}
          className="ml-2 text-red-400 hover:text-red-300"
          title="Delete"
        >
          <Icon name="delete" className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default SearchHistoryItem;

