import React from 'react';
import { Link } from 'react-router-dom';
import { 
  UserGroupIcon, 
  ChartBarIcon, 
  ShieldCheckIcon, 
  CurrencyDollarIcon 
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Connect with Nano-Influencers',
    description: 'Access a curated network of authentic nano-influencers with 1k-50k followers who have higher engagement rates.',
    icon: UserGroupIcon,
  },
  {
    name: 'Advanced Analytics',
    description: 'Track campaign performance with detailed ROI metrics, engagement analytics, and conversion tracking.',
    icon: ChartBarIcon,
  },
  {
    name: 'Secure Payments',
    description: 'Escrow-based payment system ensures secure transactions with automated fund release after deliverable completion.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Budget-Friendly',
    description: 'Perfect for SMEs and startups with limited budgets. Get authentic marketing at affordable rates.',
    icon: CurrencyDollarIcon,
  },
];

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white">
        <header className="absolute inset-x-0 top-0 z-50">
          <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
            <div className="flex lg:flex-1">
              <span className="text-2xl font-bold text-blue-600">NanoInfluencer</span>
            </div>
            <div className="flex lg:flex-1 lg:justify-end">
              <Link to="/auth" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600">
                Log in <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </nav>
        </header>

        <div className="relative isolate px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Connect Brands with Authentic Nano-Influencers
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                A two-sided marketplace connecting brands with nano-influencers (1k–50k followers) who have 
                higher engagement rates and authenticity than celebrity influencers.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  to="/auth"
                  className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Get started
                </Link>
                <a href="#features" className="text-sm font-semibold leading-6 text-gray-900">
                  Learn more <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Everything you need</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Authentic influencer marketing made simple
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our platform ensures transparent campaign execution, ROI tracking, and AI-powered 
              influencer-brand matching for maximum campaign effectiveness.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {features.map((feature) => (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to boost your marketing?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Join thousands of brands and influencers who trust our platform for authentic marketing campaigns.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/auth"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;