/** Centralized styles for React-Select components. */
export const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.75rem',
    backgroundColor: '#f9fafb',
    borderColor: state.isFocused ? '#7c3aed' : '#e5e7eb',
    padding: '0.4rem',
    fontWeight: '700',
    color: '#0f172a',
    boxShadow: 'none',
    '&:hover': {
      borderColor: '#7c3aed'
    }
  }),
  placeholder: (base) => ({
    ...base,
    color: '#9ca3af',
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase'
  }),
  singleValue: (base) => ({
    ...base,
    color: '#0f172a',
    fontWeight: '800',
    fontSize: '14px'
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '1rem',
    overflow: 'hidden',
    zIndex: 9999,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#0f172a' : state.isFocused ? 'rgba(124, 58, 237, 0.1)' : 'white',
    color: state.isSelected ? 'white' : '#0f172a',
    fontWeight: '700',
    fontSize: '12px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#7c3aed'
    }
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  input: (base) => ({
    ...base,
    color: '#0f172a',
    fontWeight: '700'
  })
};
