import React from 'react';

const DashboardCard = ({ title, value, icon: Icon, trend, actionButton }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200 relative">
      <div className="flex flex-row items-center justify-between space-y-0">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <Icon className="h-5 w-5 text-[#207880]" />
      </div>
      {value && (
        <div className="pt-2 relative">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
          {actionButton && (
            <div className="absolute bottom-0 right-0">
              {actionButton}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardCard;






