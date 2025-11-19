import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Dayjs } from 'dayjs';
import { textFieldSxMuiStyling, popperSxMuiStyling } from '../constants/muiDatePickerStyles';

interface DateFilterProps {
  label: string;
  value: Dayjs | null;
  onChange: (newValue: Dayjs | null) => void;
  minDate?: Dayjs | null;
  maxDate?: Dayjs | null;
}

const DateFilter: React.FC<DateFilterProps> = ({ label, value, onChange, minDate, maxDate }) => {

  return (
    <DatePicker
      label={label}
      value={value}
      onChange={onChange}
      minDate={minDate || undefined}
      maxDate={maxDate || undefined}
      slotProps={{
        textField: {
          className: 'w-full',
          sx: textFieldSxMuiStyling,
        },
        popper: {
          sx: popperSxMuiStyling,
        },
      }}
    />
  );
};

export default DateFilter;

