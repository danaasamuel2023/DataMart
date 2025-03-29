'use client'
import React, { useState, useEffect } from 'react';

// AnimatedCounter component to count up from 0 to a target value
const AnimatedCounter = ({ value, duration = 1000, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime;
    let animationFrame;
    const finalValue = Number(value) || 0;
    
    // Animation function
    const updateCounter = (timestamp) => {
      if (!startTime) startTime = timestamp;
      
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function for a smoother animation
      const easeOutQuad = t => t * (2 - t);
      const easedProgress = easeOutQuad(percentage);
      
      const currentValue = easedProgress * finalValue;
      setDisplayValue(currentValue);
      
      if (percentage < 1) {
        animationFrame = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(finalValue);
      }
    };
    
    // Start animation
    animationFrame = requestAnimationFrame(updateCounter);
    
    // Cleanup on unmount or value change
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);
  
  // Format the displayed value
  const formattedValue = () => {
    if (typeof displayValue !== 'number') return prefix + '0' + suffix;
    
    if (decimals > 0) {
      return `${prefix}${displayValue.toFixed(decimals)}${suffix}`;
    }
    
    return `${prefix}${Math.floor(displayValue)}${suffix}`;
  };
  
  return <>{formattedValue()}</>;
};

// CurrencyCounter for handling currency formatting
const CurrencyCounter = ({ value, duration = 1000, currency = 'GHS' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime;
    let animationFrame;
    const finalValue = Number(value) || 0;
    
    const updateCounter = (timestamp) => {
      if (!startTime) startTime = timestamp;
      
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const easeOutQuad = t => t * (2 - t);
      const easedProgress = easeOutQuad(percentage);
      
      const currentValue = easedProgress * finalValue;
      setDisplayValue(currentValue);
      
      if (percentage < 1) {
        animationFrame = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(finalValue);
      }
    };
    
    animationFrame = requestAnimationFrame(updateCounter);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);
  
  // Format currency using Intl.NumberFormat
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value);
  };
  
  return <>{formatCurrency(displayValue)}</>;
};

export { AnimatedCounter, CurrencyCounter };