import React from 'react';

type CardColor = 'info' | 'success' | 'warning' | 'emergency' | 'default';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color?: CardColor;
  subtitle?: string;
  trend?: { value: number; label?: string };
}

const colorMap: Record<CardColor, { bg: string; iconBg: string; iconColor: string; trendUp: string; trendDown: string }> = {
  info:      { bg: 'bg-white',        iconBg: 'bg-blue-50',   iconColor: 'text-blue-600',  trendUp: 'text-blue-600',  trendDown: 'text-red-500'  },
  success:   { bg: 'bg-white',        iconBg: 'bg-green-50',  iconColor: 'text-green-600', trendUp: 'text-green-600', trendDown: 'text-red-500'  },
  warning:   { bg: 'bg-white',        iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600',trendUp: 'text-green-600', trendDown: 'text-red-500'  },
  emergency: { bg: 'bg-white',        iconBg: 'bg-red-50',    iconColor: 'text-red-600',   trendUp: 'text-green-600', trendDown: 'text-red-500'  },
  default:   { bg: 'bg-white',        iconBg: 'bg-gray-50',   iconColor: 'text-gray-600',  trendUp: 'text-green-600', trendDown: 'text-red-500'  },
};

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'default',
  subtitle,
  trend,
}) => {
  const c = colorMap[color];

  return (
    <div className={`${c.bg} rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <div className={`${c.iconBg} p-2 rounded-lg`}>
          <Icon className={`h-5 w-5 ${c.iconColor}`} />
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? c.trendUp : c.trendDown}`}>
          <span>{trend.value >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}%</span>
          {trend.label && <span className="text-gray-400 font-normal ml-1">{trend.label}</span>}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
