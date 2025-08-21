import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Shield, Zap, Settings2, Network, Clock, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';

const UserEditModal = ({ user, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    globalSkipGeonettech: false,
    processingPriority: 'user_override',
    status: 'active',
    networkSettings: {
      YELLO: { skipGeonettech: null, enabled: true },
      TELECEL: { skipGeonettech: null, enabled: true },
      AT_PREMIUM: { skipGeonettech: null, enabled: true },
      at: { skipGeonettech: null, enabled: true }
    },
    orderLimits: {
      dailyOrderLimit: null,
      hourlyOrderLimit: null,
      maxOrderAmount: null,
      minOrderAmount: null
    },
    settings: {
      requireManualApproval: false,
      allowDuplicateOrders: true,
      duplicateOrderTimeWindow: 5,
      isVIP: false,
      notifyOnOrder: false,
      notificationEmail: ''
    },
    notes: ''
  });

  useEffect(() => {
    if (user?.processingPrefs) {
      const prefs = user.processingPrefs;
      setFormData({
        globalSkipGeonettech: prefs.globalSkipGeonettech || false,
        processingPriority: prefs.processingPriority || 'user_override',
        status: prefs.status || 'active',
        networkSettings: prefs.networkSettings || formData.networkSettings,
        orderLimits: prefs.orderLimits || formData.orderLimits,
        settings: prefs.settings || formData.settings,
        notes: prefs.notes || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`http://localhost:5000/api/developer/admin/api-user-processing/${user._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        toast.success('Processing configuration saved successfully');
        onSave();
      } else {
        toast.error(data.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const networks = ['YELLO', 'TELECEL', 'AT_PREMIUM', 'at'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Configure API Processing
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {user?.name} ({user?.email})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="limited">Limited</option>
                <option value="monitoring">Monitoring</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Processing Priority
              </label>
              <select
                value={formData.processingPriority}
                onChange={(e) => setFormData({ ...formData, processingPriority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="user_override">User Settings First</option>
                <option value="inventory_first">Inventory First</option>
                <option value="always_manual">Always Manual</option>
                <option value="always_api">Always API</option>
              </select>
            </div>
          </div>

          {/* Global Processing Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Global Processing Method
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFormData({ ...formData, globalSkipGeonettech: false })}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  !formData.globalSkipGeonettech
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium">API Processing</span>
                </div>
              </button>
              
              <button
                onClick={() => setFormData({ ...formData, globalSkipGeonettech: true })}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  formData.globalSkipGeonettech
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-medium">Manual Processing</span>
                </div>
              </button>
            </div>
          </div>

          {/* Network Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Network-Specific Settings
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {networks.map(network => (
                <div key={network} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900 dark:text-white">{network}</span>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.networkSettings[network]?.enabled}
                        onChange={(e) => setFormData({
                          ...formData,
                          networkSettings: {
                            ...formData.networkSettings,
                            [network]: {
                              ...formData.networkSettings[network],
                              enabled: e.target.checked
                            }
                          }
                        })}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Enabled</span>
                    </label>
                  </div>
                  
                  <select
                    value={formData.networkSettings[network]?.skipGeonettech || 'inherit'}
                    onChange={(e) => setFormData({
                      ...formData,
                      networkSettings: {
                        ...formData.networkSettings,
                        [network]: {
                          ...formData.networkSettings[network],
                          skipGeonettech: e.target.value === 'inherit' ? null : e.target.value === 'true'
                        }
                      }
                    })}
                    disabled={!formData.networkSettings[network]?.enabled}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm disabled:opacity-50"
                  >
                    <option value="inherit">Inherit Global</option>
                    <option value="false">Use API</option>
                    <option value="true">Use Manual</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Order Limits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Order Limits
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Daily Limit
                </label>
                <input
                  type="number"
                  value={formData.orderLimits.dailyOrderLimit || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    orderLimits: {
                      ...formData.orderLimits,
                      dailyOrderLimit: e.target.value ? parseInt(e.target.value) : null
                    }
                  })}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Hourly Limit
                </label>
                <input
                  type="number"
                  value={formData.orderLimits.hourlyOrderLimit || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    orderLimits: {
                      ...formData.orderLimits,
                      hourlyOrderLimit: e.target.value ? parseInt(e.target.value) : null
                    }
                  })}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Min Order (GB)
                </label>
                <input
                  type="number"
                  value={formData.orderLimits.minOrderAmount || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    orderLimits: {
                      ...formData.orderLimits,
                      minOrderAmount: e.target.value ? parseInt(e.target.value) : null
                    }
                  })}
                  placeholder="No min"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Max Order (GB)
                </label>
                <input
                  type="number"
                  value={formData.orderLimits.maxOrderAmount || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    orderLimits: {
                      ...formData.orderLimits,
                      maxOrderAmount: e.target.value ? parseInt(e.target.value) : null
                    }
                  })}
                  placeholder="No max"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Settings
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.isVIP}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, isVIP: e.target.checked }
                  })}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">VIP User (Priority Processing)</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.requireManualApproval}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, requireManualApproval: e.target.checked }
                  })}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Require Manual Approval</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.allowDuplicateOrders}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, allowDuplicateOrders: e.target.checked }
                  })}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Allow Duplicate Orders</span>
              </label>
              
              {!formData.settings.allowDuplicateOrders && (
                <div className="ml-6">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Duplicate Time Window (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.settings.duplicateOrderTimeWindow}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        duplicateOrderTimeWindow: parseInt(e.target.value) || 5
                      }
                    })}
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Add any notes about this user's configuration..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserEditModal;