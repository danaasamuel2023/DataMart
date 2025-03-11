'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  RefreshCw, 
  ArrowRight 
} from 'lucide-react';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    referralCode: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      // TODO: Replace with actual signup API call
      const response = await fetch('https://datamartbackened.onrender.com/api/v1/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phoneNumber: formData.phoneNumber,
          referredBy: formData.referralCode
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to login or dashboard
        window.location.href = '/SignIn';
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
            Create Account
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                name="name"
                placeholder="Full Name" 
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required 
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="email" 
                name="email"
                placeholder="Email Address" 
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required 
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="tel" 
                name="phoneNumber"
                placeholder="Phone Number" 
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required 
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="password" 
                name="password"
                placeholder="Password" 
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required 
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="password" 
                name="confirmPassword"
                placeholder="Confirm Password" 
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required 
              />
            </div>
            <div className="relative">
              <RefreshCw className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                name="referralCode"
                placeholder="Referral Code (Optional)" 
                value={formData.referralCode}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
            >
              Sign Up <ArrowRight className="ml-2" size={20} />
            </button>
          </form>
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Already have an account? 
              <Link href="/login" className="text-blue-600 ml-1 hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}