import React from 'react';

const shimmerStyle = `
  @keyframes skeletonShimmer {
    0% {
      background-position: -400px 0;
    }
    100% {
      background-position: 400px 0;
    }
  }
`;

const baseSkeletonStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
  backgroundSize: '800px 100%',
  animation: 'skeletonShimmer 1.5s ease-in-out infinite',
  borderRadius: '6px',
};

interface SkeletonTextProps {
  lines?: number;
  width?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, width = '100%' }) => {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div style={{ width }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...baseSkeletonStyle,
              height: '14px',
              marginBottom: i < lines - 1 ? '10px' : '0',
              width: i === lines - 1 && lines > 1 ? '60%' : '100%',
            }}
          />
        ))}
      </div>
    </>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div
        style={{
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ ...baseSkeletonStyle, width: '40px', height: '40px', borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...baseSkeletonStyle, height: '16px', width: '60%', marginBottom: '8px' }} />
            <div style={{ ...baseSkeletonStyle, height: '12px', width: '40%' }} />
          </div>
        </div>
        <div style={{ ...baseSkeletonStyle, height: '14px', width: '100%', marginBottom: '10px' }} />
        <div style={{ ...baseSkeletonStyle, height: '14px', width: '90%', marginBottom: '10px' }} />
        <div style={{ ...baseSkeletonStyle, height: '14px', width: '70%' }} />
      </div>
    </>
  );
};

interface SkeletonRowProps {
  columns?: number;
}

export const SkeletonRow: React.FC<SkeletonRowProps> = ({ columns = 5 }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div
            style={{
              ...baseSkeletonStyle,
              height: '14px',
              width: i === 0 ? '70%' : i === columns - 1 ? '50%' : '80%',
            }}
          />
        </td>
      ))}
    </tr>
  );
};

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ rows = 5, columns = 5 }) => {
  return (
    <>
      <style>{shimmerStyle}</style>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} style={{ padding: '14px 16px', textAlign: 'left' }}>
                <div style={{ ...baseSkeletonStyle, height: '12px', width: '70%' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </>
  );
};

export default {
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonRow,
};
