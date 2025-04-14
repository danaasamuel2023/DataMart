'use client'
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

const RegisterFriendForm = () => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  
  // Load user data from localStorage
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
  }, []);
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset messages
    setSuccessMessage(null);
    setErrorMessage(null);
    
    if (!validateForm()) {
      return;
    }
    
    if (!userData || !userData.id) {
      setErrorMessage("User not logged in or user ID not available.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`https://datamartbackened.onrender.com/api/register-friend/${userData.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to register friend");
      }
      
      // Store the entered password temporarily for display (we don't want to reset the form yet)
      const enteredPassword = formData.password;
      
      setSuccessMessage({
        message: "Registration Successful! 🎉",
        details: {
          ...data,
          friend: {
            ...data.friend,
            // Include the entered password (this is just for UI display, not stored in DB)
            enteredPassword: enteredPassword.substring(0, 3) + '•••••'
          }
        }
      });
      
      // Reset form after showing success message
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          phoneNumber: '',
          password: ''
        });
      }, 500);
      
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-center mb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
          <UserPlus size={24} className="text-blue-600 dark:text-blue-300" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
        Register an Account for a Agent
      </h2>
      
      {!userData ? (
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 p-4 rounded-md mb-4">
          <p className="flex items-center">
            <AlertCircle size={16} className="mr-2" />
            Please log in to register a friend.
          </p>
        </div>
      ) : userData.walletBalance < 15 ? (
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 p-4 rounded-md mb-4">
          <p className="flex items-center">
            <AlertCircle size={16} className="mr-2" />
            Insufficient balance. You need at least 15 cedis to register a friend.
          </p>
        </div>
      ) : null}
      
      {errorMessage && (
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-md mb-4">
          <p className="flex items-center">
            <AlertCircle size={16} className="mr-2" />
            {errorMessage}
          </p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-4 rounded-md mb-4">
          <div className="flex items-center mb-2">
            <CheckCircle size={18} className="mr-2" />
            <span className="font-bold text-lg">{successMessage.message}</span>
          </div>
          
          <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded-md">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Friend's Account Created Successfully!</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              Please share these login details with your friend:
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded border border-blue-100 dark:border-blue-800">
              <p className="text-sm mb-1"><strong>Email:</strong> {successMessage.details.friend.email}</p>
              <p className="text-sm mb-1"><strong>Name:</strong> {successMessage.details.friend.name}</p>
              <p className="text-sm"><strong>Password:</strong> The password you entered in the form</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
              Remind them to change their password after first login for security.
            </p>
          </div>
          
          <div className="mt-3 flex justify-between text-sm">
            <div>
              <strong>Deducted:</strong> {successMessage.details.deductedAmount} cedis
            </div>
            <div>
              <strong>New Balance:</strong> {successMessage.details.newWalletBalance} cedis
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label 
            htmlFor="name" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`pl-10 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500 dark:border-red-500' : ''
              }`}
              placeholder="John Doe"
            />
          </div>
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label 
            htmlFor="email" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`pl-10 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-500 dark:border-red-500' : ''
              }`}
              placeholder="example@email.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label 
            htmlFor="phoneNumber" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone size={16} className="text-gray-400" />
            </div>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className={`pl-10 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${
                errors.phoneNumber ? 'border-red-500 dark:border-red-500' : ''
              }`}
              placeholder="+233 XX XXX XXXX"
            />
          </div>
          {errors.phoneNumber && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phoneNumber}</p>
          )}
        </div>
        
        <div className="mb-6">
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-gray-400" />
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`pl-10 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${
                errors.password ? 'border-red-500 dark:border-red-500' : ''
              }`}
              placeholder="Minimum 8 characters"
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
          )}
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          <p>Registration fee: <span className="font-bold">15 cedis</span></p>
       
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !userData  }
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-300"
        >
          {isLoading ? 'Registering...' : 'Register an Agent'}
        </button>
      </form>
      
      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Note: 15 cedis will be deducted from your wallet balance.
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          After registration, you will be able to share login details with your friend.
        </p>
      </div>
    </div>
  );
};

export default RegisterFriendForm;