import React from 'react';

export default function InsightCard({ insight, index }) {
  // Determine severity styles
  let severityClass = 'insight-info';
  let badgeText = 'Insight';
  let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  
  if (insight.severity === 'success') {
    severityClass = 'insight-success';
    badgeText = 'Good';
    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  } else if (insight.severity === 'warning') {
    severityClass = 'insight-warning';
    badgeText = 'Attention';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }

  // Add a slight animation delay based on index
  const delay = `${index * 0.15}s`;

  return (
    <div 
      className={`glass-card p-5 ${severityClass} animate-slide-up opacity-0`}
      style={{ animationDelay: delay, animationFillMode: 'forwards' }}
    >
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-sm font-bold text-white uppercase tracking-wide">{insight.category}</h4>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border rounded-md ${badgeColor}`}>
          {badgeText}
        </span>
      </div>
      <p className="text-sm text-white/80 font-medium leading-relaxed">
        {insight.text}
      </p>
    </div>
  );
}
