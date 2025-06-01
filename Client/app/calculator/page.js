'use client'
import React, { useState, useEffect } from 'react';
import { BarChart3, Copy, Check, FileText, Trash2, Package } from 'lucide-react';

const CapacityOrderSummary = () => {
  const [bulkInput, setBulkInput] = useState('');
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState(false);
  const [parsedEntries, setParsedEntries] = useState([]);
  const [errors, setErrors] = useState([]);

  // Parse bulk input and create summary
  const parseBulkData = (input) => {
    if (!input.trim()) {
      setParsedEntries([]);
      setErrors([]);
      setSummary(null);
      return;
    }

    const lines = input.trim().split('\n');
    const entries = [];
    const parseErrors = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Match patterns like: "233123456789 5" or "0123456789 10.5"
      const match = trimmedLine.match(/^(\d+)\s+(\d*\.?\d+)$/);
      
      if (match) {
        const phoneNumber = match[1];
        const capacity = parseFloat(match[2]);
        
        if (capacity > 0) {
          entries.push({
            phoneNumber,
            capacity,
            lineNumber: index + 1
          });
        } else {
          parseErrors.push(`Line ${index + 1}: Invalid capacity "${match[2]}"`);
        }
      } else {
        parseErrors.push(`Line ${index + 1}: Invalid format "${trimmedLine}". Use: "phoneNumber capacity"`);
      }
    });

    setParsedEntries(entries);
    setErrors(parseErrors);

    // Create summary by unique capacity
    if (entries.length > 0) {
      const capacityCount = {};
      
      entries.forEach(entry => {
        const cap = entry.capacity;
        if (capacityCount[cap]) {
          capacityCount[cap]++;
        } else {
          capacityCount[cap] = 1;
        }
      });

      // Convert to array and sort by capacity (descending)
      const summaryArray = Object.entries(capacityCount)
        .map(([capacity, count]) => ({
          capacity: parseFloat(capacity),
          orderCount: count
        }))
        .sort((a, b) => b.capacity - a.capacity);

      const totalOrders = entries.length;
      const uniqueCapacities = summaryArray.length;

      setSummary({
        totalOrders,
        uniqueCapacities,
        breakdown: summaryArray
      });
    } else {
      setSummary(null);
    }
  };

  useEffect(() => {
    parseBulkData(bulkInput);
  }, [bulkInput]);

  const copySummary = () => {
    if (!summary) return;

    const breakdownText = summary.breakdown
      .map(item => `${item.capacity}GB: ${item.orderCount} orders`)
      .join('\n');

    const resultText = `
Capacity Order Summary:
======================

Total Orders: ${summary.totalOrders}
Unique Capacities: ${summary.uniqueCapacities}

Orders per Capacity:
${breakdownText}
    `.trim();

    navigator.clipboard.writeText(resultText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const clearInputs = () => {
    setBulkInput('');
    setSummary(null);
    setParsedEntries([]);
    setErrors([]);
  };

  const loadSampleData = () => {
    const sampleData = `233123456789 5
233987654321 10
233111222333 5
233444555666 15
233777888999 5
233666777888 20
233555444333 10
233222111000 15
233999888777 5
233888777666 10`;
    setBulkInput(sampleData);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
      <div className="flex items-center mb-6">
        <BarChart3 className="h-6 w-6 text-indigo-500 mr-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Capacity Order Summary</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bulk Input (Phone Number Capacity)
              </label>
              <button
                onClick={loadSampleData}
                className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-1 rounded transition-colors"
              >
                Load Sample
              </button>
            </div>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Enter one entry per line:&#10;233123456789 5&#10;233987654321 10&#10;233111222333 5"
                rows={12}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors font-mono text-sm"
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Format: Each line should contain "phoneNumber capacity" (e.g., "233123456789 5")
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={clearInputs}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </button>
            {summary && (
              <button
                onClick={copySummary}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Summary
                  </>
                )}
              </button>
            )}
          </div>

          {/* Parsing Status */}
          {parsedEntries.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center text-green-600 dark:text-green-400">
                <Check className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">
                  Parsed {parsedEntries.length} entries successfully
                </span>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="text-red-600 dark:text-red-400 text-sm">
                <div className="font-medium mb-2">{errors.length} Parsing Error(s):</div>
                <ul className="space-y-1 list-disc list-inside">
                  {errors.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {errors.length > 5 && (
                    <li className="text-gray-500">...and {errors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Summary Section */}
        <div>
          {summary ? (
            <div className="space-y-6">
              {/* Overview */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
                  Summary Overview
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                      {summary.totalOrders}
                    </div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-400">Total Orders</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                      {summary.uniqueCapacities}
                    </div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-400">Unique Capacities</div>
                  </div>
                </div>
              </div>

              {/* Orders per Capacity */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Orders per Capacity
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {summary.breakdown.map((item, index) => {
                    const percentage = ((item.orderCount / summary.totalOrders) * 100).toFixed(1);
                    
                    return (
                      <div 
                        key={index} 
                        className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <Package className="h-5 w-5 text-blue-500 mr-2" />
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                              {item.capacity} GB
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              {item.orderCount}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              orders
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-1">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                          {percentage}% of total orders
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Copy Format */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Quick Copy Format:
                </h5>
                <div className="bg-white dark:bg-gray-800 rounded border p-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                  {summary.breakdown.map((item, index) => (
                    <div key={index}>
                      {item.capacity}GB: {item.orderCount} orders
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Data to Summarize
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Enter bulk data to see order summary by capacity
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Format: "phoneNumber capacity" on each line
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CapacityOrderSummary;