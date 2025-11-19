export const textFieldSxMuiStyling = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'rgba(196, 181, 253, 0.9)',
    borderRadius: '1.5rem',
    '& fieldset': {
      borderColor: 'rgba(147, 51, 234, 0.3)',
      borderWidth: '2px',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(147, 51, 234, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'rgba(147, 51, 234, 0.6)',
      borderWidth: '2px',
    },
    '&.Mui-error fieldset': {
      borderColor: 'rgba(147, 51, 234, 0.3)',
    },
  },
  '& .MuiPickersInputBase-root': {
    borderRadius: '1.5rem',
    '& fieldset': {
      borderColor: 'rgba(147, 51, 234, 0.3)',
      borderWidth: '2px',
      borderRadius: '1.5rem',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(147, 51, 234, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'rgba(147, 51, 234, 0.6)',
      borderWidth: '2px',
    },
  },
  '& .MuiPickersOutlinedInput-root': {
    borderRadius: '1.5rem',
    '& fieldset': {
      borderColor: 'rgba(147, 51, 234, 0.3)',
      borderWidth: '2px',
      borderRadius: '1.5rem',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(147, 51, 234, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'rgba(147, 51, 234, 0.6)',
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(196, 181, 253, 0.7)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'rgba(196, 181, 253, 0.9)',
  },
  '& .MuiInputBase-input': {
    color: 'rgba(196, 181, 253, 0.9)',
  },
  '& .MuiIconButton-root': {
    color: 'rgba(196, 181, 253, 0.9)',
    backgroundColor: 'transparent',
    padding: '8px',
    marginRight: '4px',
    '&:hover': {
      backgroundColor: 'rgba(147, 51, 234, 0.3)',
      color: 'rgba(196, 181, 253, 1)',
    },
  },
  '& .MuiPickersSectionList-root': {
    color: 'rgba(196, 181, 253, 0.9)',
    backgroundColor: 'transparent',
    '& .MuiPickersSection-root': {
      color: 'rgba(196, 181, 253, 0.9)',
    },
  },
  '& .MuiPickersInputBase-sectionsContainer': {
    color: 'rgba(196, 181, 253, 0.9)',
    backgroundColor: 'transparent',
  },
};

export const popperSxMuiStyling = {
  '& .MuiPaper-root': {
    backgroundColor: 'rgba(15, 10, 30, 0.98)',
    border: '2px solid rgba(147, 51, 234, 0.6)',
    borderRadius: '1rem',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 20px 25px -5px rgba(147, 51, 234, 0.3), 0 10px 10px -5px rgba(147, 51, 234, 0.2)',
  },
  '& .MuiPickersCalendarHeader-root': {
    color: 'rgba(196, 181, 253, 1)',
    padding: '8px 16px',
    '& .MuiPickersCalendarHeader-label': {
      color: 'rgba(196, 181, 253, 1)',
      fontWeight: 600,
      fontSize: '1rem',
    },
    '& .MuiIconButton-root': {
      color: 'rgba(196, 181, 253, 0.9)',
      '&:hover': {
        backgroundColor: 'rgba(147, 51, 234, 0.3)',
        color: 'rgba(196, 181, 253, 1)',
      },
    },
  },
  '& .MuiDayCalendar-header': {
    '& .MuiTypography-root': {
      color: 'rgba(196, 181, 253, 0.8)',
      fontWeight: 600,
    },
  },
  '& .MuiDayCalendar-weekContainer': {
    '& .MuiButtonBase-root': {
      color: 'rgba(196, 181, 253, 0.95)',
      fontWeight: 500,
      '&:hover': {
        backgroundColor: 'rgba(147, 51, 234, 0.4)',
        color: 'white',
      },
      '&.Mui-selected': {
        background: 'linear-gradient(135deg, rgba(147, 51, 234, 1), rgba(59, 130, 246, 1), rgba(6, 182, 212, 1))',
        color: 'white',
        fontWeight: 700,
        boxShadow: '0 4px 6px rgba(147, 51, 234, 0.4)',
        '&:hover': {
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(59, 130, 246, 0.9), rgba(6, 182, 212, 0.9))',
        },
      },
      '&.MuiPickersDay-today': {
        border: '2px solid rgba(147, 51, 234, 0.8)',
        fontWeight: 700,
        backgroundColor: 'rgba(147, 51, 234, 0.15)',
        color: 'rgba(196, 181, 253, 1)',
      },
    },
  },
  '& .MuiPickersMonth-root, & .MuiPickersYear-root': {
    color: 'rgba(196, 181, 253, 0.95)',
    fontWeight: 500,
    '&:hover': {
      backgroundColor: 'rgba(147, 51, 234, 0.4)',
      color: 'white',
    },
    '&.Mui-selected': {
      background: 'linear-gradient(135deg, rgba(147, 51, 234, 1), rgba(59, 130, 246, 1))',
      color: 'white',
      fontWeight: 700,
      boxShadow: '0 4px 6px rgba(147, 51, 234, 0.4)',
      '&:hover': {
        background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(59, 130, 246, 0.9))',
      },
    },
  },
  '& .MuiPickersYear-yearButton, & .MuiPickersMonth-monthButton': {
    color: 'rgba(196, 181, 253, 0.95)',
    fontWeight: 500,
    '&:hover': {
      backgroundColor: 'rgba(147, 51, 234, 0.4)',
      color: 'white',
    },
    '&.Mui-selected': {
      background: 'linear-gradient(135deg, rgba(147, 51, 234, 1), rgba(59, 130, 246, 1))',
      color: 'white',
      fontWeight: 700,
      boxShadow: '0 4px 6px rgba(147, 51, 234, 0.4)',
      '&:hover': {
        background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(59, 130, 246, 0.9))',
      },
    },
  },
  '& .MuiPickersYear-yearButton.Mui-disabled': {
    color: 'rgba(107, 114, 128, 0.5)',
  },
  '& .MuiYearCalendar-root, & .MuiMonthCalendar-root': {
    '& .MuiPickersYear-yearButton, & .MuiPickersMonth-monthButton': {
      color: 'rgba(196, 181, 253, 0.95)',
      backgroundColor: 'transparent',
      fontWeight: 500,
      '&:hover': {
        backgroundColor: 'rgba(147, 51, 234, 0.4)',
        color: 'white',
      },
      '&.Mui-selected': {
        background: 'linear-gradient(135deg, rgba(147, 51, 234, 1), rgba(59, 130, 246, 1), rgba(6, 182, 212, 1))',
        color: 'white',
        fontWeight: 700,
        boxShadow: '0 4px 6px rgba(147, 51, 234, 0.4)',
        '&:hover': {
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(59, 130, 246, 0.9), rgba(6, 182, 212, 0.9))',
        },
      },
    },
  },
  '& .MuiYearCalendar-button': {
    color: 'rgba(196, 181, 253, 0.95)',
    backgroundColor: 'transparent',
    fontWeight: 500,
    '&:hover': {
      backgroundColor: 'rgba(147, 51, 234, 0.4)',
      color: 'white',
    },
    '&.Mui-selected': {
      background: 'linear-gradient(135deg, rgba(147, 51, 234, 1), rgba(59, 130, 246, 1), rgba(6, 182, 212, 1))',
      color: 'white',
      fontWeight: 700,
      boxShadow: '0 4px 6px rgba(147, 51, 234, 0.4)',
      '&:hover': {
        background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(59, 130, 246, 0.9), rgba(6, 182, 212, 0.9))',
      },
    },
  },
};

