import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';
import DateFilter from './DateFilter';
import { Button } from './shared';
import { cardClasses } from '../styles/classes';

interface FiltersSectionProps {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  onStartDateChange: (date: Dayjs | null) => void;
  onEndDateChange: (date: Dayjs | null) => void;
  onClear: () => void;
}

const FiltersSection: React.FC<FiltersSectionProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className={`mb-6 ${cardClasses.section}`}>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1">
            <DateFilter
              label="Start Date"
              value={startDate}
              onChange={onStartDateChange}
              maxDate={endDate}
            />
          </div>
          <div className="flex-1">
            <DateFilter
              label="End Date"
              value={endDate}
              onChange={onEndDateChange}
              minDate={startDate}
            />
          </div>
          {(startDate || endDate) && (
            <Button variant="clear" onClick={onClear}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </LocalizationProvider>
  );
};

export default FiltersSection;

