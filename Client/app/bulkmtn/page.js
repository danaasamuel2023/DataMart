'use client'

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Upload, FileText, Users, CheckCircle, AlertCircle, Download, FileUp, Info } from 'lucide-react';

const BulkDataPurchase = () => {
  const [file, setFile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dataPrices, setDataPrices] = useState([]);
  const [activeTab, setActiveTab] = useState('file');
  const [userData, setUserData] = useState(null);
  const [manualEntry, setManualEntry] = useState({
    phoneNumbers: '',
    dataAmount: '1' // This is kept for backward compatibility but not used in the new format
  });
  
  useEffect(() => {
    // Safely access localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          setUserData(JSON.parse(storedUserData));
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
        setError('Failed to load user data from storage');
      }
    }
    
    // Load data prices with GH₵ currency
    setDataPrices([
      { capacity: '1', mb: '1000', price: '4.30', network: 'YELLO' },
      { capacity: '2', mb: '2000', price: '9.20', network: 'YELLO' },
      { capacity: '3', mb: '3000', price: '13.5', network: 'YELLO' },
      { capacity: '4', mb: '4000', price: '18.50', network: 'YELLO' },
      { capacity: '5', mb: '5000', price: '23.50', network: 'YELLO' },
      { capacity: '6', mb: '6000', price: '27.00', network: 'YELLO' },
      { capacity: '8', mb: '8000', price: '35.50', network: 'YELLO' },
      { capacity: '10', mb: '10000', price: '43.50', network: 'YELLO' },
      { capacity: '15', mb: '15000', price: '62.50', network: 'YELLO' },
      { capacity: '20', mb: '20000', price: '83.00', network: 'YELLO' },
      { capacity: '25', mb: '25000', price: '105.00', network: 'YELLO' },
      { capacity: '30', mb: '30000', price: '129.00', network: 'YELLO' },
      { capacity: '40', mb: '40000', price: '166.00', network: 'YELLO' },
      { capacity: '50', mb: '50000', price: '207.00', network: 'YELLO' },
      { capacity: '100', mb: '100000', price: '407.00', network: 'YELLO' }
    ]);
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };

  const handleManualEntryChange = (e) => {
    setManualEntry({
      ...manualEntry,
      [e.target.name]: e.target.value
    });
  };

  const processExcelFile = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          setError('The file contains no data');
          return;
        }
        
        // Process and validate data
        const processedOrders = [];
        const errors = [];
        const seenPhoneNumbers = new Set(); // Track phone numbers to prevent duplicates
        
        // First check if there are any headers at all
        if (jsonData.length > 0) {
          // Check if we need to detect columns
          const firstRow = jsonData[0];
          const foundPhoneHeader = Object.keys(firstRow).some(key => 
            /phone|number|mobile|cell/i.test(key)
          );
          const foundDataHeader = Object.keys(firstRow).some(key => 
            /data|amount|gb|gig/i.test(key)
          );
          
          // Process with intelligent column detection
          jsonData.forEach((row, index) => {
            let phoneNumber, dataAmount;
            
            // If we have standard headers, use them
            if (foundPhoneHeader && foundDataHeader) {
              // Try to find the phone number column
              for (const key of Object.keys(row)) {
                if (/phone|number|mobile|cell/i.test(key)) {
                  phoneNumber = row[key];
                  break;
                }
              }
              
              // Try to find the data amount column
              for (const key of Object.keys(row)) {
                if (/data|amount|gb|gig/i.test(key)) {
                  dataAmount = row[key];
                  break;
                }
              }
            } else {
              // No properly named headers - try to detect by value type
              for (const [key, value] of Object.entries(row)) {
                // Phone numbers are usually strings with mostly digits
                const valueStr = String(value);
                if (!phoneNumber && valueStr && /^\d{9,15}$/.test(valueStr.replace(/\D/g, ''))) {
                  phoneNumber = value;
                  continue;
                }
                
                // Data amounts are usually numbers between 1-100
                if (!dataAmount && !isNaN(parseFloat(value)) && parseFloat(value) >= 1 && parseFloat(value) <= 100) {
                  dataAmount = value;
                }
              }
            }
            
            if (!phoneNumber || !dataAmount) {
              errors.push(`Row ${index + 2}: Unable to identify phone number or data amount`);
              return;
            }
            
            // Clean the phone number
            const cleanedPhone = String(phoneNumber).replace(/\D/g, '');
            
            // Check for duplicates within this batch
            if (seenPhoneNumbers.has(cleanedPhone)) {
              errors.push(`Row ${index + 2}: Duplicate phone number (${cleanedPhone})`);
              return;
            }
            
            seenPhoneNumbers.add(cleanedPhone);
            
            // Find the price for this data amount
            const priceData = dataPrices.find(p => p.capacity === String(dataAmount));
            
            if (!priceData) {
              errors.push(`Row ${index + 2}: Invalid data amount (${dataAmount}GB)`);
              return;
            }
            
            processedOrders.push({
              phoneNumber: cleanedPhone,
              network: priceData.network,
              capacity: parseInt(priceData.capacity, 10),
              price: parseFloat(priceData.price)
            });
          });
        }
        
        if (errors.length > 0) {
          setError(`File contains errors:\n${errors.join('\n')}`);
        }
        
        setOrders(processedOrders);
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Failed to process the Excel file. Please check the format.');
    }
  };

  const processManualEntry = () => {
    if (!manualEntry.phoneNumbers.trim()) {
      setError('Please enter at least one phone number');
      return;
    }
    
    // Split by new lines to get each entry
    const entries = manualEntry.phoneNumbers
      .split(/\n/)
      .filter(entry => entry.trim().length > 0);
    
    if (entries.length === 0) {
      setError('Please enter at least one valid entry');
      return;
    }
    
    const processedOrders = [];
    const errors = [];
    const seenPhoneNumbers = new Set(); // Track phone numbers to prevent duplicates
    
    // Process each line (format should be "phone_number data_amount")
    entries.forEach((entry, index) => {
      // Split the entry by space to get phone number and data amount
      const parts = entry.trim().split(/\s+/);
      
      // Check if we have both parts
      if (parts.length < 2) {
        errors.push(`Line ${index + 1}: Format should be "phone_number data_amount" (e.g., "0246783840 2")`);
        return;
      }
      
      const phoneNumber = parts[0].trim();
      const dataAmount = parts[1].trim();
      
      // Validate phone number
      if (!/^\d{10,12}$/.test(phoneNumber.replace(/\D/g, ''))) {
        errors.push(`Line ${index + 1}: Invalid phone number format`);
        return;
      }
      
      // Clean the phone number
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      
      // Check for duplicates within this batch
      if (seenPhoneNumbers.has(cleanedPhone)) {
        errors.push(`Line ${index + 1}: Duplicate phone number (${cleanedPhone})`);
        return;
      }
      
      seenPhoneNumbers.add(cleanedPhone);
      
      // Find the price for this data amount
      const priceData = dataPrices.find(p => p.capacity === dataAmount);
      
      if (!priceData) {
        errors.push(`Line ${index + 1}: Invalid data amount (${dataAmount}GB)`);
        return;
      }
      
      processedOrders.push({
        phoneNumber: cleanedPhone,
        network: priceData.network,
        capacity: parseInt(priceData.capacity, 10),
        price: parseFloat(priceData.price)
      });
    });
    
    if (errors.length > 0) {
      setError(`Input contains errors:\n${errors.join('\n')}`);
      return;
    }
    
    setOrders(processedOrders);
  };

  const submitBulkOrders = async () => {
    if (!userData || !userData.id) {
      setError('User not authenticated. Please log in again.');
      return;
    }
    
    if (orders.length === 0) {
      setError('No orders to process. Please add orders first.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await axios.post('https://datamartbackened.onrender.com/api/bulk-purchase-data', {
        userId: userData.id,
        orders: orders
      });
      
      setResult(response.data);
      // Optionally reset the form if successful
      if (response.data.status === 'success') {
        setOrders([]);
        setFile(null);
        setManualEntry({
          phoneNumbers: '',
          dataAmount: '1'
        });
      }
    } catch (error) {
      console.error('Error submitting bulk orders:', error);
      // Handle error response appropriately
      if (error.response && error.response.data) {
        setResult(error.response.data); // Use the error response as the result to display details
      } else {
        setError(error.message || 'Failed to process bulk orders');
      }
    } finally {
      setIsProcessing(false);
    }
  };
  const downloadTemplate = () => {
    // Create a template worksheet
    const template = XLSX.utils.book_new();
    const data = [
      { 
        PhoneNumber: '0551234567', 
        DataAmount: '1',
        Note: 'Enter phone numbers in this column and data amounts in GB'
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(template, worksheet, 'Bulk Data Orders');
    
    // Generate and download the file
    XLSX.writeFile(template, 'bulk_data_order_template.xlsx');
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Bulk Data Purchase</h2>
      
      {/* Tab navigation */}
      <div className="flex mb-6 border-b dark:border-gray-700">
        <button 
          onClick={() => setActiveTab('file')} 
          className={`flex items-center py-2 px-4 mr-2 ${activeTab === 'file' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400'}`}
        >
          <FileUp className="w-5 h-5 mr-2" />
          Excel Upload
        </button>
        <button 
          onClick={() => setActiveTab('manual')} 
          className={`flex items-center py-2 px-4 ${activeTab === 'manual' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400'}`}
        >
          <Users className="w-5 h-5 mr-2" />
          Manual Entry
        </button>
      </div>
      
      {/* File upload section */}
      {activeTab === 'file' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Upload Excel File with Orders:</label>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-1 w-full">
                <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-blue-400 focus:outline-none">
                  <span className="flex flex-col items-center space-y-2">
                    <Upload className="w-6 h-6 text-gray-500 dark:text-gray-300" />
                    <span className="font-medium text-gray-600 dark:text-gray-200">
                      {file ? file.name : "Drop files or click to upload"}
                    </span>
                  </span>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls" 
                    onChange={handleFileChange} 
                    className="hidden"
                  />
                </label>
              </div>
              <button 
                onClick={processExcelFile} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                Process File
              </button>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Need a template? Download one below:</p>
            <button 
              onClick={downloadTemplate} 
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </button>
          </div>
        </div>
      )}
      
      {/* Manual entry section */}
      {activeTab === 'manual' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 mb-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Available Data Packages:</h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
              {dataPrices.map((price) => (
                <div key={price.capacity} className="bg-white dark:bg-gray-700 p-2 rounded border border-blue-200 dark:border-blue-800">
                  <p className="font-bold">{price.capacity}GB</p>
                  <p>GH₵{price.price}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Phone Numbers with Data Amounts (one entry per line):</label>
            <textarea 
              name="phoneNumbers" 
              value={manualEntry.phoneNumbers} 
              onChange={handleManualEntryChange} 
              rows={6}
              placeholder="e.g. 0246783840 2&#10;0551234567 5&#10;0244555666 10"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Format: Phone Number [space] Data Amount (GB)</p>
          </div>
          
          <button 
            onClick={processManualEntry} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
          >
            <Users className="w-4 h-4 mr-2" />
            Add to Order List
          </button>
        </div>
      )}
      
      {/* Order preview */}
      {orders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-900 dark:text-white">
            <FileText className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Orders Preview ({orders.length} orders)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Network</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data Amount (GB)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price (GH₵)</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{order.phoneNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{order.network}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{order.capacity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{order.price}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">Total:</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                    GH₵{orders.reduce((sum, order) => sum + order.price, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button 
              onClick={submitBulkOrders} 
              disabled={isProcessing} 
              className={`px-6 py-2 rounded-md flex items-center ${isProcessing ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'} text-white transition`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Submit Bulk Order
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}
      
      {/* Result display */}
      {result && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-900 dark:text-white">
            {result.status === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2 text-red-500 dark:text-red-400" />
            )}
            {result.status === 'success' ? 'Order Processing Results' : 'Order Processing Failed'}
          </h3>
          
          {result.status === 'success' ? (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{result.data.totalOrders}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">Successful Orders</p>
                <p className="text-2xl font-semibold text-green-700 dark:text-green-400">{result.data.successfulOrders}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">Invalid Orders</p>
                <p className="text-2xl font-semibold text-red-700 dark:text-red-400">{result.data.invalidOrders.length}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">New Wallet Balance</p>
                <p className="text-2xl font-semibold text-blue-700 dark:text-blue-400">GH₵{result.data.newWalletBalance.toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">Error Details</p>
                <p className="text-lg font-semibold text-red-700 dark:text-red-400">{result.data.errorDetails || result.message}</p>
                {result.data.totalRefunded && (
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    Total Refunded: <span className="font-semibold">GH₵{result.data.totalRefunded.toFixed(2)}</span>
                  </p>
                )}
                {result.data.newWalletBalance !== undefined && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    New Wallet Balance: <span className="font-semibold">GH₵{result.data.newWalletBalance.toFixed(2)}</span>
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Display invalid orders from validation */}
          {result.status === 'success' && result.data.invalidOrders.length > 0 && (
            <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
              <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-800">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Invalid Orders
                </h4>
              </div>
              <ul className="divide-y divide-red-100 dark:divide-red-800">
                {result.data.invalidOrders.map((order, index) => (
                  <li key={index} className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">{order.phoneNumber}:</span> {order.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Display failed orders from the API */}
          {result.status === 'error' && result.data.failedOrders && result.data.failedOrders.length > 0 && (
            <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden mt-4">
              <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-800">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Failed Orders
                </h4>
              </div>
              <ul className="divide-y divide-red-100 dark:divide-red-800">
                {result.data.failedOrders.map((order, index) => (
                  <li key={index} className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">{order.phoneNumber}:</span> {order.reason}
                    {order.capacity && (
                      <span className="ml-2 text-xs text-gray-500">({order.capacity}GB)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkDataPurchase;