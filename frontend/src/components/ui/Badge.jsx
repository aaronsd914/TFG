import React from 'react';

const variants = {
  default:     'btn-accent',
  secondary:   'bg-gray-100 text-gray-700 border border-gray-200',
  destructive: 'bg-red-100 text-red-800 border border-red-300',
  outline:     'border border-gray-300 text-gray-700 bg-transparent',
  success:     'bg-green-100 text-green-800 border border-green-300',
  warning:     'bg-yellow-100 text-yellow-800 border border-yellow-300',
  info:        'bg-blue-100 text-blue-800 border border-blue-300',
  purple:      'bg-purple-100 text-purple-800 border border-purple-300',
};

export function Badge({ variant = 'default', className = '', children, ...props }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
