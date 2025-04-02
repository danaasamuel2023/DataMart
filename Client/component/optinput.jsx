// components/OtpInput.js
import { useState, useRef, useEffect } from 'react';

export default function OtpInput({ length = 6, value, onChange }) {
  const [otp, setOtp] = useState(value || Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Initialize the input refs array
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // When value prop changes, update internal state
  useEffect(() => {
    if (value) {
      const valueArray = value.split('').concat(Array(length).fill('')).slice(0, length);
      setOtp(valueArray);
    }
  }, [value, length]);

  const handleChange = (e, index) => {
    const newValue = e.target.value;
    
    // Only allow one digit
    if (newValue.length > 1) {
      return;
    }
    
    // Only allow numbers
    if (newValue && !/^\d+$/.test(newValue)) {
      return;
    }

    // Update the OTP array
    const newOtp = [...otp];
    newOtp[index] = newValue;
    setOtp(newOtp);

    // Call the onChange callback with the concatenated OTP
    if (onChange) {
      onChange(newOtp.join(''));
    }

    // Move focus to next input if a digit was entered
    if (newValue && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // If current input is empty and backspace is pressed, move to previous input
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        
        if (onChange) {
          onChange(newOtp.join(''));
        }
        
        inputRefs.current[index - 1].focus();
      }
    }
    
    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    
    // Handle right arrow
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text/plain').trim();
    
    // Check if pasted content contains only digits
    if (!/^\d+$/.test(pasteData)) {
      return;
    }
    
    const pasteDataArray = pasteData.split('').slice(0, length);
    const newOtp = [...Array(length).fill('')];
    
    pasteDataArray.forEach((digit, index) => {
      newOtp[index] = digit;
    });
    
    setOtp(newOtp);
    
    if (onChange) {
      onChange(newOtp.join(''));
    }
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex(val => val === '');
    if (nextEmptyIndex !== -1 && nextEmptyIndex < length) {
      inputRefs.current[nextEmptyIndex].focus();
    } else {
      inputRefs.current[length - 1].focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {[...Array(length)].map((_, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength="1"
          value={otp[index] || ''}
          onChange={e => handleChange(e, index)}
          onKeyDown={e => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}