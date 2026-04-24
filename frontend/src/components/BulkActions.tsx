import React, { useState } from 'react';
import { Trash2, ChevronDown, X } from 'lucide-react';

interface UpdateOption {
  label: string;
  value: string;
}

interface BulkActionsProps {
  selectedCount: number;
  onDelete?: () => void;
  onUpdate?: (value: string) => void;
  updateOptions?: UpdateOption[];
  onDeselectAll: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  onDelete,
  onUpdate,
  updateOptions = [],
  onDeselectAll,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (selectedCount === 0) return null;

  const handleUpdateSelect = (value: string) => {
    onUpdate?.(value);
    setDropdownOpen(false);
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#1e293b',
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        animation: 'bulkActionsSlideDown 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes bulkActionsSlideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>
        <strong>{selectedCount}</strong> item{selectedCount !== 1 ? 's' : ''} selected
      </span>

      <div style={{ flex: 1 }} />

      {onUpdate && updateOptions.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'transparent',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Update
            <ChevronDown size={14} />
          </button>
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                minWidth: '160px',
                zIndex: 200,
                overflow: 'hidden',
              }}
            >
              {updateOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleUpdateSelect(option.value)}
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLDivElement).style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLDivElement).style.backgroundColor = 'transparent';
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Trash2 size={14} />
          Delete
        </button>
      )}

      <button
        onClick={onDeselectAll}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backgroundColor: 'transparent',
          color: '#ffffff',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        <X size={14} />
        Deselect
      </button>
    </div>
  );
};

export default BulkActions;
