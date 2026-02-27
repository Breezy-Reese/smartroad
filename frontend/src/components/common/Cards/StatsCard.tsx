import React from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: 'emergency' | 'hospital' | 'success' | 'warning' | 'info';
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'info',
  trend,
  onClick,
}) => {
  const colorClasses = {
    emergency: 'bg-red-50 text-red-600',
    hospital: 'bg-blue-50 text-blue-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-yellow-50 text-yellow-600',
    info: 'bg-gray-50 text-gray-600',
  };

  return (
    <div
      className={`
        bg-white rounded-lg shadow-lg p-6 
        ${onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={`
                  text-xs font-medium px-2 py-0.5 rounded-full
                  ${trend.positive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                `}
              >
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-gray-500 ml-2">{trend.label}</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;