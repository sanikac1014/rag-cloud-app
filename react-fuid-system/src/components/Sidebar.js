import React, { useState } from 'react';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ArrowPathIcon,
  BuildingOfficeIcon,
  CubeIcon,
  CalendarIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { formatNumber, timeAgo } from '../utils/textNormalizer';

const Sidebar = ({ currentPage, onPageChange, data, isLoading, onRefresh, onLogout, isCollapsed, onCollapseChange }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshData = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Error refreshing data:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const navigationItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: HomeIcon,
      description: 'Overview and analytics'
    },
    {
      id: 'search',
      name: 'Search Database',
      icon: MagnifyingGlassIcon,
      description: 'Find companies, and products'
    },
    {
      id: 'generate',
      name: 'Generate ID',
      icon: PlusIcon,
      description: 'Create new unique identifiers'
    },
    {
      id: 'status',
      name: 'Applications',
      icon: InformationCircleIcon,
      description: 'Track approval status'
    }
  ];

  const stats = data ? {
    companies: data.total_companies || 0,
    products: data.total_products || 0,
    fuids: data.total_fuids || 0
  } : { companies: 0, products: 0, fuids: 0 };

  const avgProductsPerCompany = stats.companies > 0 ? (stats.products / stats.companies).toFixed(1) : '0.0';

  return (
    <div className={`fixed inset-y-0 left-0 z-50 bg-flywl-grey-800 shadow-strong border-r border-flywl-grey-700 lg:block transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-flywl-grey-700 bg-flywl-grey-900">
          <div className="flex items-center">
            {!isCollapsed && (
              <h1 className="text-lg font-semibold text-flywl-orange-400">
                Marketplace Search Platform
              </h1>
            )}
          </div>
          <button
            onClick={() => onCollapseChange(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-flywl-grey-700 transition-colors duration-200 text-flywl-grey-400 hover:text-flywl-orange-400"
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4" />
            ) : (
              <ChevronLeftIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="mb-4">
            {!isCollapsed && (
              <h2 className="text-xs font-semibold text-flywl-grey-400 uppercase tracking-wider mb-3">
                Navigation
              </h2>
            )}
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-flywl-grey-700 text-white' 
                      : 'text-flywl-grey-300 hover:text-white hover:bg-flywl-grey-700'
                  }`}
                  title={isCollapsed ? item.name : ''}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-flywl-orange-400' : 'text-flywl-grey-400 group-hover:text-flywl-orange-400'}`} />
                  {!isCollapsed && (
                    <div className="ml-3 flex-1 text-left">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className={`text-xs ${isActive ? 'text-flywl-orange-300' : 'text-flywl-grey-500'}`}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Stats */}
          {!isCollapsed && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold text-flywl-grey-400 uppercase tracking-wider mb-3">
                Quick Stats
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-flywl-grey-900 rounded-lg border border-flywl-grey-700">
                  <div className="flex items-center space-x-2">
                    <BuildingOfficeIcon className="w-4 h-4 text-flywl-orange-400" />
                    <span className="text-sm text-flywl-grey-300">Companies</span>
                  </div>
                  <span className="text-sm font-semibold text-flywl-orange-400">
                    {formatNumber(stats.companies)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-flywl-grey-900 rounded-lg border border-flywl-grey-700">
                  <div className="flex items-center space-x-2">
                    <CubeIcon className="w-4 h-4 text-flywl-orange-400" />
                    <span className="text-sm text-flywl-grey-300">Products</span>
                  </div>
                  <span className="text-sm font-semibold text-flywl-orange-400">
                    {formatNumber(stats.products)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-flywl-grey-900 rounded-lg border border-flywl-grey-700">
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 text-flywl-orange-400 font-bold text-xs flex items-center justify-center">ID</span>
                    <span className="text-sm text-flywl-grey-300">IDs</span>
                  </div>
                  <span className="text-sm font-semibold text-flywl-orange-400">
                    {formatNumber(stats.fuids)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Data Status */}
          {!isCollapsed && (
            <div className="mt-6">
              <h2 className="text-xs font-semibold text-flywl-grey-400 uppercase tracking-wider mb-3">
                Data Status
              </h2>
              <div className="p-3 bg-flywl-grey-900 rounded-lg border border-flywl-grey-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-flywl-grey-300">Last Updated</span>
                  <CalendarIcon className="w-4 h-4 text-flywl-grey-500" />
                </div>
                <p className="text-xs text-flywl-grey-500">
                  {data?.last_updated ? timeAgo(data.last_updated) : 'Never'}
                </p>
                <div className="mt-2 pt-2 border-t border-flywl-grey-700">
                  <p className="text-xs text-flywl-grey-500">
                    Avg: {avgProductsPerCompany} products/company
                  </p>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-flywl-grey-700 bg-flywl-grey-900">
          <div className={`space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
            <button
              onClick={onLogout}
              className={`${isCollapsed ? 'w-8 h-8 p-0' : 'w-full'} flex items-center justify-center px-3 py-2 text-sm font-medium text-flywl-grey-300 bg-flywl-grey-800 hover:bg-flywl-grey-700 hover:text-white rounded-lg transition-colors duration-200`}
              title={isCollapsed ? 'Logout' : ''}
            >
              <ArrowRightOnRectangleIcon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-2'}`} />
              {!isCollapsed && 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 