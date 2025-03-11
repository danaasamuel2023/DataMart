'use client'
import React, { useState } from 'react';

const PricingComparisonTable = () => {
  // Pricing data from your document
  const normalPrices = [
    { capacity: '1', mb: '1000', price: '5.7' },
    { capacity: '2', mb: '2000', price: '10.70' },
    { capacity: '3', mb: '3000', price: '16.00' },
    { capacity: '4', mb: '4000', price: '20.00' },
    { capacity: '5', mb: '5000', price: '25.50' },
    { capacity: '6', mb: '6000', price: '29.00' },
    { capacity: '8', mb: '8000', price: '40.00' },
    { capacity: '10', mb: '10000', price: '47.50' },
    { capacity: '12', mb: '15000', price: '55.50' },
    { capacity: '15', mb: '15000', price: '79.50' },
    { capacity: '20', mb: '20000', price: '90.00' },
    { capacity: '25', mb: '25000', price: '105.00' },
    { capacity: '30', mb: '30000', price: '128.00' },
    { capacity: '40', mb: '40000', price: '165.00' },
    { capacity: '50', mb: '50000', price: '206.00' },
    { capacity: '100', mb: '100000', price: '390.00' }
  ];

  const agentPrices = [
    { capacity: '1', mb: '1000', price: '4.7' },

    { capacity: '2', mb: '2000', price: '9.70' },
    { capacity: '3', mb: '3000', price: '14.00' },
    { capacity: '4', mb: '4000', price: '19.50' },
    { capacity: '5', mb: '5000', price: '23.5' },
    { capacity: '6', mb: '6000', price: '29.50' },
    { capacity: '10', mb: '10000', price: '47.50' },
    { capacity: '15', mb: '15000', price: '79.50' },
    { capacity: '20', mb: '20000', price: '87.00' },
    { capacity: '25', mb: '25000', price: '105.00' },
    { capacity: '30', mb: '30000', price: '130.00' },
    { capacity: '40', mb: '40000', price: '162.00' },
    { capacity: '50', mb: '50000', price: '206.00' },
    { capacity: '100', mb: '100000', price: '407.00' }
  ];

  // Function to calculate price per GB
  const pricePerGB = (mb, price) => {
    const gbValue = parseInt(mb) / 1000;
    return (parseFloat(price) / gbValue).toFixed(2);
  };

  // Function to find agent price for a specific capacity
  const findAgentPrice = (capacity) => {
    const plan = agentPrices.find(plan => plan.capacity === capacity);
    return plan ? plan.price : "-";
  };

  // Function to find agent price per GB for a specific capacity
  const findAgentPricePerGB = (capacity) => {
    const plan = agentPrices.find(plan => plan.capacity === capacity);
    if (!plan) return "-";
    return pricePerGB(plan.mb, plan.price);
  };

  // Function to determine if a plan is popular (for highlighting)
  const isPopular = (capacity) => {
    return ['5', '10', '20'].includes(capacity);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          MTNUP2U Bundle Pricing Comparison
        </h1>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Capacity (GB)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MB
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Regular Price ($)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent Price ($)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Regular Price/GB ($)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent Price/GB ($)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {normalPrices.map((plan, idx) => (
                  <tr 
                    key={`plan-${plan.capacity}`}
                    className={`${
                      isPopular(plan.capacity) 
                        ? 'bg-blue-50 hover:bg-blue-100' 
                        : idx % 2 === 0 
                          ? 'bg-white hover:bg-gray-50' 
                          : 'bg-gray-50 hover:bg-gray-100'
                    } transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {plan.capacity}
                      {isPopular(plan.capacity) && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Popular
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {parseInt(plan.mb).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {plan.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {findAgentPrice(plan.capacity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pricePerGB(plan.mb, plan.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {findAgentPricePerGB(plan.capacity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-8 flex justify-between items-center p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <div className="h-4 w-4 rounded bg-blue-50 mr-2"></div>
            <span className="text-sm text-gray-600">Regular row</span>
          </div>
          <div className="flex items-center ml-4">
            <div className="h-4 w-4 rounded bg-blue-100 mr-2"></div>
            <span className="text-sm text-gray-600">Popular plan</span>
          </div>
          <div className="flex items-center ml-4">
            <span className="text-sm text-gray-600">"-" indicates plan not available</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingComparisonTable;