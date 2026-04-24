import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface SortHeaderProps {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  onSort: (field: string, order: 'asc' | 'desc') => void;
}

const SortHeader: React.FC<SortHeaderProps> = ({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
}) => {
  const isActive = currentSort === field;

  const handleClick = () => {
    if (isActive) {
      onSort(field, currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'asc');
    }
  };

  const renderIcon = () => {
    if (!isActive) {
      return <ArrowUpDown size={14} color="#9ca3af" />;
    }
    if (currentOrder === 'asc') {
      return <ArrowUp size={14} color="#6366f1" />;
    }
    return <ArrowDown size={14} color="#6366f1" />;
  };

  return (
    <th
      onClick={handleClick}
      style={{
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: 600,
        color: isActive ? '#6366f1' : '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {label}
        {renderIcon()}
      </div>
    </th>
  );
};

export { SortHeader };
export default SortHeader;
