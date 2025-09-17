import React from 'react';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const DemoBanner = () => {
  const [isVisible, setIsVisible] = React.useState(true);
  
  // Only show on GitHub Pages
  const isGitHubPages = window.location.hostname === 'ajay9760.github.io';
  
  if (!isGitHubPages || !isVisible) return null;

  return (
    <div className="bg-blue-600 text-white">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex w-0 flex-1 items-center">
            <span className="flex rounded-lg bg-blue-800 p-2">
              <InformationCircleIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            <p className="ml-3 font-medium text-white truncate">
              <span className="md:hidden">
                Demo Mode: Frontend-only preview
              </span>
              <span className="hidden md:inline">
                🚀 You're viewing the demo version. For full functionality, run locally or deploy your own instance.
              </span>
            </p>
          </div>
          <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
            <a
              href="https://github.com/Ajay9760/nanoinfluencer-marketplace#-quick-start"
              className="flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50"
              target="_blank"
              rel="noopener noreferrer"
            >
              Run Locally
            </a>
          </div>
          <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
            <button
              type="button"
              className="-mr-1 flex rounded-md p-2 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white sm:-mr-2"
              onClick={() => setIsVisible(false)}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;