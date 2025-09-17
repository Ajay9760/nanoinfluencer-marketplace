import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
// import { useAuth } from '../../contexts/AuthContext'; // Commented out as unused
import { campaignsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CreateCampaignModal = ({ isOpen, onClose, onCampaignCreated }) => {
  // const { user } = useAuth(); // Commented out as unused
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: 'awareness',
    budget: '',
    currency: 'USD',
    targetFollowerRange: { min: 1000, max: 50000 },
    targetEngagementRate: '',
    contentRequirements: {
      platforms: ['instagram'],
      contentTypes: ['post']
    },
    applicationDeadline: '',
    campaignStartDate: '',
    campaignEndDate: ''
  });

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'number' ? parseFloat(value) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await campaignsAPI.create({
        ...formData,
        budget: parseFloat(formData.budget),
        targetEngagementRate: formData.targetEngagementRate ? parseFloat(formData.targetEngagementRate) : null
      });

      toast.success('Campaign created successfully!');
      onCampaignCreated && onCampaignCreated(response.campaign);
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        goal: 'awareness',
        budget: '',
        currency: 'USD',
        targetFollowerRange: { min: 1000, max: 50000 },
        targetEngagementRate: '',
        contentRequirements: {
          platforms: ['instagram'],
          contentTypes: ['post']
        },
        applicationDeadline: '',
        campaignStartDate: '',
        campaignEndDate: ''
      });

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create campaign';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Create New Campaign
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="input-field mt-1"
                  placeholder="e.g., Summer Fashion Collection 2024"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows="4"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input-field mt-1"
                  placeholder="Describe your campaign goals, target audience, and key messages..."
                />
              </div>
            </div>

            {/* Campaign Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="goal" className="block text-sm font-medium text-gray-700">
                  Campaign Goal *
                </label>
                <select
                  id="goal"
                  name="goal"
                  required
                  value={formData.goal}
                  onChange={handleInputChange}
                  className="input-field mt-1"
                >
                  <option value="awareness">Brand Awareness</option>
                  <option value="conversions">Conversions</option>
                  <option value="engagement">Engagement</option>
                  <option value="ugc">User Generated Content</option>
                  <option value="brand_mention">Brand Mention</option>
                </select>
              </div>

              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                  Total Budget *
                </label>
                <div className="mt-1 relative">
                  <input
                    type="number"
                    id="budget"
                    name="budget"
                    required
                    min="1"
                    value={formData.budget}
                    onChange={handleInputChange}
                    className="input-field pr-16"
                    placeholder="5000"
                  />
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="absolute right-2 top-2 border-none bg-transparent text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Target Audience</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="targetFollowerRange.min" className="block text-sm font-medium text-gray-700">
                    Min Followers
                  </label>
                  <input
                    type="number"
                    name="targetFollowerRange.min"
                    value={formData.targetFollowerRange.min}
                    onChange={handleInputChange}
                    className="input-field mt-1"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label htmlFor="targetFollowerRange.max" className="block text-sm font-medium text-gray-700">
                    Max Followers
                  </label>
                  <input
                    type="number"
                    name="targetFollowerRange.max"
                    value={formData.targetFollowerRange.max}
                    onChange={handleInputChange}
                    className="input-field mt-1"
                    placeholder="50000"
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Campaign Timeline</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="applicationDeadline" className="block text-sm font-medium text-gray-700">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    name="applicationDeadline"
                    value={formData.applicationDeadline}
                    onChange={handleInputChange}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="campaignStartDate" className="block text-sm font-medium text-gray-700">
                    Campaign Start Date
                  </label>
                  <input
                    type="date"
                    name="campaignStartDate"
                    value={formData.campaignStartDate}
                    onChange={handleInputChange}
                    className="input-field mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Campaign'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaignModal;