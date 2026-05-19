import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2 group ${className}`}>
      {/* Abstract F / IF Symbol */}
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 group-hover:border-primary/60 transition-colors">
        <div className="absolute h-4 w-0.5 bg-primary rounded-full left-2 top-2"></div>
        <div className="absolute h-0.5 w-3 bg-primary rounded-full left-2 top-2"></div>
        <div className="absolute h-0.5 w-2 bg-primary rounded-full left-2 top-4"></div>
        <div className="absolute h-1.5 w-1.5 bg-primary/50 rounded-full right-2 bottom-2 group-hover:bg-primary transition-colors"></div>
        <div className="absolute inset-0 glow-border rounded-lg"></div>
      </div>
      
      {/* Brand Name */}
      <span className="text-xl font-bold tracking-tight text-white">
        Insight<span className="text-primary">Forge</span>
      </span>
    </Link>
  );
}
