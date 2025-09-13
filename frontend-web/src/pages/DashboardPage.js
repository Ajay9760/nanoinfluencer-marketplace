import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  MegaphoneIcon, 
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

// Animated counter component
const AnimatedCounter = ({ value, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const numericValue = typeof value === 'string' ? parseInt(value.replace(/[^\d]/g, '')) : value;
    let start = 0;
    const increment = numericValue / (duration / 50);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 50);
    
    return () => clearInterval(timer);
  }, [value, duration]);
  
  if (typeof value === 'string') {
    if (value.includes('$')) return `$${count.toLocaleString()}`;
    if (value.includes('%')) return `${count}%`;
  }
  return count.toLocaleString();
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { name: 'Total Campaigns', value: '12', icon: MegaphoneIcon, change: '+4.75%', changeType: 'positive' },
    { name: 'Active Influencers', value: '89', icon: UserGroupIcon, change: '+54.02%', changeType: 'positive' },
    { name: 'Total Revenue', value: '$24,780', icon: CurrencyDollarIcon, change: '+12.09%', changeType: 'positive' },
    { name: 'Avg. Engagement', value: '8.2%', icon: ChartBarIcon, change: '+2.1%', changeType: 'positive' },
  ]);
  
  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    // Here is where you would fetch real data from the API
    // Example: analyticsAPI.getDashboardStats().then(data => setStats(data.stats));
    
    return () => clearTimeout(timer);
  }, []);
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-gray-600">
          {user?.role === 'brand' 
            ? "Here's an overview of your campaign performance."
            : "Here's your influencer dashboard and earning opportunities."
          }
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item, index) => {
          const Icon = item.icon;
          const isPositive = item.changeType === 'positive';
          return (
            <div 
              key={item.name} 
              className="card hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:from-blue-600 group-hover:to-blue-700 transition-colors">
                    <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-gray-600 transition-colors">
                      {item.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        <AnimatedCounter value={item.value} duration={2000 + index * 200} />
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive ? (
                          <ArrowUpIcon className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownIcon className="h-3 w-3 mr-1" />
                        )}
                        {item.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Campaigns</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Summer Fashion Collection #{i}</p>
                  <p className="text-sm text-gray-600">Started 2 days ago • 5 influencers</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Influencers</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">U{i}</span>
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">@influencer{i}</p>
                    <p className="text-sm text-gray-600">{12 + i}.5K followers</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{8 + i}.2% ER</p>
                  <p className="text-sm text-gray-600">Engagement</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;