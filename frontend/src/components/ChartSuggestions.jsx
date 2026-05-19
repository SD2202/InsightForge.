import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Label
} from 'recharts';

export default function ChartSuggestions({ suggestions, data }) {
  if (!data || data.length === 0) return null;

  // Curated premium neon color palette for multi-series rendering
  const COLORS = ['#c084fc', '#38bdf8', '#34d399', '#fbbf24', '#f87171'];

  const formatAxisTick = (value) => {
    if (value === null || value === undefined) return '';
    const num = Number(value);
    if (isNaN(num)) return String(value);
    
    const absNum = Math.abs(num);
    if (absNum >= 1e12) {
      return (num / 1e12).toFixed(1) + 'T';
    }
    if (absNum >= 1e9) {
      return (num / 1e9).toFixed(1) + 'B';
    }
    if (absNum >= 1e6) {
      return (num / 1e6).toFixed(1) + 'M';
    }
    if (absNum >= 1e3) {
      return (num / 1e3).toFixed(1) + 'K';
    }
    return String(value);
  };

  const formatXAxisTick = (tick) => {
    if (tick === null || tick === undefined) return '';
    const str = String(tick);
    if (str.length > 16) {
      return str.substring(0, 14) + '...';
    }
    return str;
  };

  const columns = Object.keys(data[0]);
  
  // Extract columns that have numeric representations
  const numericColumns = useMemo(() => {
    return columns.filter(col => 
      data.some(row => typeof row[col] === 'number') || 
      data.some(row => row[col] !== null && row[col] !== '' && !isNaN(parseFloat(row[col])))
    );
  }, [columns, data]);

  // --- Dynamic Defaults ignoring index/serial/id columns ---
  const defaultAxisX = useMemo(() => {
    return columns.find(c => {
      const lower = c.toLowerCase();
      return !lower.includes('sr') && !lower.includes('id') && !lower.includes('index') && !lower.includes('serial');
    }) || columns[0];
  }, [columns]);

  const defaultValueY = useMemo(() => {
    return numericColumns.find(c => {
      const lower = c.toLowerCase();
      return !lower.includes('sr') && !lower.includes('id') && !lower.includes('index') && !lower.includes('serial');
    }) || numericColumns[0] || columns[0];
  }, [numericColumns, columns]);

  const defaultLegend = 'none';

  // --- POWERBI-STYLE WORKSPACE STATE HOOKS ---
  const [activeVisual, setActiveVisual] = useState('column'); // 'column', 'bar', 'line', 'area', 'scatter', 'pie'
  const [axisX, setAxisX] = useState(columns[0]);
  const [valueY, setValueY] = useState(numericColumns[0] || columns[0]);
  const [legendGroup, setLegendGroup] = useState('none'); // 'none' or a column key
  const [aggregation, setAggregation] = useState('sum'); // 'sum', 'avg', 'count'

  // Sync state hooks with rich calculated defaults on load
  useEffect(() => {
    if (columns.length > 0) {
      setAxisX(defaultAxisX);
      setValueY(defaultValueY);
      setLegendGroup(defaultLegend);
    }
  }, [data, defaultAxisX, defaultValueY]);

  // --- MULTI-SERIES DATA SEGMENTATION PARSER ---
  const chartData = useMemo(() => {
    if (!axisX || !valueY) return [];

    const isYNumeric = data.some(row => {
      const v = row[valueY];
      return typeof v === 'number' || (v !== null && v !== '' && !isNaN(parseFloat(v)));
    });

    // Case A: No Legend Split
    if (!legendGroup || legendGroup === 'none') {
      const groups = {};
      const counts = {};

      data.forEach(row => {
        let xVal = row[axisX];
        xVal = xVal !== undefined && xVal !== null && xVal !== '' ? String(xVal) : 'N/A';
        
        let yVal = 0;
        if (isYNumeric) {
          const parsed = parseFloat(row[valueY]);
          yVal = !isNaN(parsed) ? parsed : 0;
        } else {
          yVal = 1;
        }
        
        groups[xVal] = (groups[xVal] || 0) + yVal;
        counts[xVal] = (counts[xVal] || 0) + 1;
      });

      return Object.entries(groups)
        .map(([name, val]) => {
          let value = val;
          if (aggregation === 'avg') {
            value = counts[name] > 0 ? val / counts[name] : 0;
          } else if (aggregation === 'count') {
            value = counts[name];
          }
          return {
            name,
            value: Number(value.toFixed(2))
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }

    // Case B: Legend Splitting (Multi-Series Stacked/Grouped)
    const groups = {}; // axisX_val -> { legend_val -> { sum, count } }
    const uniqueLegends = new Set();

    data.forEach(row => {
      let xVal = row[axisX];
      xVal = xVal !== undefined && xVal !== null && xVal !== '' ? String(xVal) : 'N/A';

      let legVal = row[legendGroup];
      legVal = legVal !== undefined && legVal !== null && legVal !== '' ? String(legVal) : 'N/A';
      uniqueLegends.add(legVal);

      let yVal = 0;
      if (isYNumeric) {
        const parsed = parseFloat(row[valueY]);
        yVal = !isNaN(parsed) ? parsed : 0;
      } else {
        yVal = 1;
      }

      if (!groups[xVal]) {
        groups[xVal] = {};
      }
      if (!groups[xVal][legVal]) {
        groups[xVal][legVal] = { sum: 0, count: 0 };
      }

      groups[xVal][legVal].sum += yVal;
      groups[xVal][legVal].count += 1;
    });

    const sortedLegends = Array.from(uniqueLegends).slice(0, 5); // Display top 5 keys maximum

    return Object.entries(groups)
      .map(([xName, legendObj]) => {
        const rowObj = { name: xName };
        let overallValue = 0;

        sortedLegends.forEach(legVal => {
          const stats = legendObj[legVal];
          if (stats) {
            let value = stats.sum;
            if (aggregation === 'avg') {
              value = stats.count > 0 ? stats.sum / stats.count : 0;
            } else if (aggregation === 'count') {
              value = stats.count;
            }
            rowObj[legVal] = Number(value.toFixed(2));
            overallValue += value;
          } else {
            rowObj[legVal] = 0;
          }
        });

        rowObj.value = Number(overallValue.toFixed(2));
        return rowObj;
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

  }, [data, axisX, valueY, legendGroup, aggregation]);

  // Extract unique series sub-keys loaded in chartData
  const legendKeys = useMemo(() => {
    if (!legendGroup || legendGroup === 'none' || chartData.length === 0) return [];
    const keys = new Set();
    chartData.forEach(item => {
      Object.keys(item).forEach(k => {
        if (k !== 'name' && k !== 'value') {
          keys.add(k);
        }
      });
    });
    return Array.from(keys);
  }, [chartData, legendGroup]);

  // --- SPECIAL CORRELATION DATA (SCATTER PLOT ONLY) ---
  const scatterChartData = useMemo(() => {
    if (activeVisual !== 'scatter' || !axisX || !valueY) return [];
    return data.map(row => {
      const parsedX = parseFloat(row[axisX]);
      const parsedY = parseFloat(row[valueY]);
      return { ...row, xVal: parsedX, yVal: parsedY };
    }).filter(row => !isNaN(row.xVal) && !isNaN(row.yVal));
  }, [data, axisX, valueY, activeVisual]);

  const scatterStats = useMemo(() => {
    if (activeVisual !== 'scatter' || scatterChartData.length < 2) return null;
    
    const xVals = scatterChartData.map(d => d.xVal);
    const yVals = scatterChartData.map(d => d.yVal);
    
    const n = scatterChartData.length;
    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = yVals.reduce((a, b) => a + b, 0);
    const sumXSq = xVals.reduce((a, b) => a + b * b, 0);
    const sumYSq = yVals.reduce((a, b) => a + b * b, 0);
    const sumXY = scatterChartData.reduce((sum, d) => sum + d.xVal * d.yVal, 0);
    
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumXSq - sumX * sumX) * (n * sumYSq - sumY * sumY));
    const r = den !== 0 ? num / den : 0;

    let corrStrength = 'Weak';
    let corrDirection = '';
    if (Math.abs(r) >= 0.7) corrStrength = 'Strong';
    else if (Math.abs(r) >= 0.3) corrStrength = 'Moderate';
    
    if (r > 0.1) corrDirection = 'Positive';
    else if (r < -0.1) corrDirection = 'Negative';
    else {
      corrStrength = 'No';
      corrDirection = 'correlation';
    }

    const sortedY = [...yVals].sort((a, b) => a - b);
    const q1 = sortedY[Math.floor(n * 0.25)];
    const q3 = sortedY[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = scatterChartData.filter(d => d.yVal < lowerBound || d.yVal > upperBound).length;

    return {
      r: r.toFixed(3),
      label: `${corrStrength} ${corrDirection}`,
      outliers,
      minX: Math.min(...xVals),
      maxX: Math.max(...xVals),
      minY: Math.min(...yVals),
      maxY: Math.max(...yVals)
    };
  }, [scatterChartData, activeVisual]);

  // --- GENERAL MULTI-PURPOSE STATS (BAR, COLUMN, LINE, AREA, PIE) ---
  const generalStats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const values = chartData.map(d => d.value);
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = total / values.length;
    const topCat = chartData[0];
    const topContrib = total > 0 ? ((topCat.value / total) * 100).toFixed(1) : 0;

    let slopeTrend = 'Stable ➡️';
    if (chartData.length >= 2) {
      const n = chartData.length;
      const indices = Array.from({ length: n }, (_, i) => i);
      const sumX = indices.reduce((a, b) => a + b, 0);
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
      const sumXSq = indices.reduce((a, b) => a + b * b, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumXSq - sumX * sumX);
      
      if (slope > 0.05) slopeTrend = 'Growing 📈';
      else if (slope < -0.05) slopeTrend = 'Declining 📉';
    }

    return {
      topCategoryName: topCat.name,
      topCategoryVal: topCat.value,
      topContrib,
      avg: avg.toFixed(2),
      total: total.toFixed(2),
      cardinality: chartData.length,
      trend: slopeTrend
    };
  }, [chartData]);

  // --- CUSTOM TOOLTIP COMPONENT ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-brand-gray border border-white/10 p-3 rounded-xl text-sm shadow-xl">
          <p className="font-bold text-white mb-2">{label || 'Segment'}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="text-white/80 font-medium flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name || 'Value'}: <span className="font-mono font-bold text-primary">{formatAxisTick(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      
      {/* Visual Workspace Title */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
          <span className="bg-white/5 text-white p-2 text-xl border border-white/10 rounded-lg">📊</span>
          Interactive Report Builder
        </h2>
        <p className="text-white/60 font-semibold mt-1 ml-12 text-sm">
          Design custom high-end interactive charts with full PowerBI-style field mapping.
        </p>
      </div>

      {/* WORKSPACE LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SIDEBAR: VISUALIZATIONS & FIELDS WELLS (PowerBI Style) */}
        <div className="lg:col-span-3 flex flex-col gap-5 bg-white/5 border border-white/10 p-5 rounded-2xl">
          
          {/* Visualizations Panel */}
          <div>
            <h4 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2.5">Visualizations</h4>
            <div className="grid grid-cols-3 gap-2">
              {/* Stacked Column Button */}
              <button 
                onClick={() => setActiveVisual('column')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${activeVisual === 'column' ? 'border-primary bg-primary/10 text-white font-bold shadow-md shadow-primary/10' : 'border-white/10 bg-black/40 text-white/50 hover:text-white hover:border-white/20'}`}
                title="Clustered Column Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-[9px] uppercase tracking-wider">Column</span>
              </button>

              {/* Horizontal Bar Button */}
              <button 
                onClick={() => setActiveVisual('bar')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${activeVisual === 'bar' ? 'border-primary bg-primary/10 text-white font-bold shadow-md shadow-primary/10' : 'border-white/10 bg-black/40 text-white/50 hover:text-white hover:border-white/20'}`}
                title="Clustered Bar Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                </svg>
                <span className="text-[9px] uppercase tracking-wider">Bar</span>
              </button>

              {/* Line Button */}
              <button 
                onClick={() => setActiveVisual('line')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${activeVisual === 'line' ? 'border-primary bg-primary/10 text-white font-bold shadow-md shadow-primary/10' : 'border-white/10 bg-black/40 text-white/50 hover:text-white hover:border-white/20'}`}
                title="Line Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-[9px] uppercase tracking-wider">Line</span>
              </button>

              {/* Area Button */}
              <button 
                onClick={() => setActiveVisual('area')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${activeVisual === 'area' ? 'border-primary bg-primary/10 text-white font-bold shadow-md shadow-primary/10' : 'border-white/10 bg-black/40 text-white/50 hover:text-white hover:border-white/20'}`}
                title="Stacked Area Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 16v.01M12 16v.01M8 16v.01M21 16c0-2.898-2.148-5.3-5-5.874V9a3 3 0 00-3-3H9a3 3 0 00-3 3v1.126C3.148 10.7 1 13.102 1 16v3h20v-3z" />
                </svg>
                <span className="text-[9px] uppercase tracking-wider">Area</span>
              </button>

              {/* Scatter Button */}
              <button 
                onClick={() => setActiveVisual('scatter')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${activeVisual === 'scatter' ? 'border-primary bg-primary/10 text-white font-bold shadow-md shadow-primary/10' : 'border-white/10 bg-black/40 text-white/50 hover:text-white hover:border-white/20'}`}
                title="Correlation Scatter Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-[9px] uppercase tracking-wider">Scatter</span>
              </button>

              {/* Pie Button */}
              <button 
                onClick={() => setActiveVisual('pie')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${activeVisual === 'pie' ? 'border-primary bg-primary/10 text-white font-bold shadow-md shadow-primary/10' : 'border-white/10 bg-black/40 text-white/50 hover:text-white hover:border-white/20'}`}
                title="Pie Distribution Visual"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <span className="text-[9px] uppercase tracking-wider">Pie</span>
              </button>
            </div>
          </div>

          {/* Fields Mapping Wells */}
          <div className="flex flex-col gap-4 border-t border-white/10 pt-4">
            
            {/* Axis (X) */}
            <div className="flex flex-col gap-1 bg-black/30 border border-white/5 p-2 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Axis (X)</span>
              <select 
                value={axisX}
                onChange={e => setAxisX(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg py-1.5 px-2 text-xs font-semibold text-white/80 outline-none cursor-pointer focus:border-primary"
              >
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            {/* Value (Y) */}
            <div className="flex flex-col gap-1 bg-black/30 border border-white/5 p-2 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Value (Y)</span>
              <select 
                value={valueY}
                onChange={e => setValueY(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg py-1.5 px-2 text-xs font-semibold text-white/80 outline-none cursor-pointer focus:border-primary"
              >
                {numericColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            {/* Legend (Only active on Column, Bar, Line, Area) */}
            {['column', 'bar', 'line', 'area'].includes(activeVisual) && (
              <div className="flex flex-col gap-1 bg-black/30 border border-white/5 p-2 rounded-xl">
                <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Legend (Color split)</span>
                <select 
                  value={legendGroup}
                  onChange={e => setLegendGroup(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg py-1.5 px-2 text-xs font-semibold text-white/80 outline-none cursor-pointer focus:border-primary"
                >
                  <option value="none">-- None --</option>
                  {columns.map(col => col !== axisX && col !== valueY && <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
            )}

            {/* Aggregation (Hidden on Scatter) */}
            {activeVisual !== 'scatter' && (
              <div className="flex flex-col gap-1 bg-black/30 border border-white/5 p-2 rounded-xl">
                <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Aggregation</span>
                <select 
                  value={aggregation}
                  onChange={e => setAggregation(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg py-1.5 px-2 text-xs font-semibold text-white/80 outline-none cursor-pointer focus:border-primary"
                >
                  <option value="sum">Sum Total</option>
                  <option value="avg">Mathematical Average</option>
                  <option value="count">Record Count</option>
                </select>
              </div>
            )}

          </div>

        </div>

        {/* MAIN CANVAS VIEWPORT & INSIGHT CARDS */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Main Visual Canvas Frame */}
          <div className="h-[420px] w-full border border-white/10 bg-black/40 rounded-2xl p-5 relative shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              
              {/* RENDER COLUMN CHART */}
              {activeVisual === 'column' && (
                <BarChart data={chartData} margin={{ top: 15, right: 15, bottom: 95, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.3)" 
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                    tickMargin={10} 
                    angle={-45} 
                    textAnchor="end" 
                    height={95}
                    tickFormatter={formatXAxisTick}
                  >
                    <Label value={axisX} position="insideBottom" offset={-10} fill="rgba(255,255,255,0.4)" fontSize={11} fontWeight="bold" />
                  </XAxis>
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} tickFormatter={formatAxisTick} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  
                  {legendKeys.length > 0 ? (
                    legendKeys.map((key, idx) => (
                      <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                    ))
                  ) : (
                    <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} name={valueY} />
                  )}
                </BarChart>
              )}

              {/* RENDER HORIZONTAL BAR CHART */}
              {activeVisual === 'bar' && (
                <BarChart layout="vertical" data={chartData} margin={{ top: 15, right: 15, bottom: 45, left: 95 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} tickFormatter={formatAxisTick} domain={['auto', 'auto']}>
                    <Label value={valueY} position="insideBottom" offset={-5} fill="rgba(255,255,255,0.4)" fontSize={11} fontWeight="bold" />
                  </XAxis>
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.3)" 
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} 
                    width={90}
                    tickFormatter={formatXAxisTick}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  
                  {legendKeys.length > 0 ? (
                    legendKeys.map((key, idx) => (
                      <Bar key={key} dataKey={key} layout="vertical" fill={COLORS[idx % COLORS.length]} radius={[0, 4, 4, 0]} />
                    ))
                  ) : (
                    <Bar dataKey="value" fill="#a855f7" layout="vertical" radius={[0, 4, 4, 0]} name={valueY} />
                  )}
                </BarChart>
              )}

              {/* RENDER LINE CHART */}
              {activeVisual === 'line' && (
                <LineChart data={chartData} margin={{ top: 15, right: 15, bottom: 95, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.3)" 
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                    tickMargin={10} 
                    angle={-45} 
                    textAnchor="end" 
                    height={95}
                    tickFormatter={formatXAxisTick}
                  >
                    <Label value={axisX} position="insideBottom" offset={-10} fill="rgba(255,255,255,0.4)" fontSize={11} fontWeight="bold" />
                  </XAxis>
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} tickFormatter={formatAxisTick} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {legendKeys.length > 0 ? (
                    legendKeys.map((key, idx) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={COLORS[idx % COLORS.length]} strokeWidth={3} dot={{ stroke: COLORS[idx % COLORS.length], strokeWidth: 1.5, fill: '#1A1A1A', r: 3 }} activeDot={{ r: 5 }} />
                    ))
                  ) : (
                    <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={3} dot={{ stroke: '#c084fc', strokeWidth: 1.5, fill: '#1A1A1A', r: 3 }} activeDot={{ r: 5 }} name={valueY} />
                  )}
                </LineChart>
              )}

              {/* RENDER AREA CHART */}
              {activeVisual === 'area' && (
                <AreaChart data={chartData} margin={{ top: 15, right: 15, bottom: 95, left: 30 }}>
                  <defs>
                    {COLORS.map((col, idx) => (
                      <linearGradient key={`grad-${idx}`} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={col} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={col} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                    <linearGradient id="grad-solo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.3)" 
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                    tickMargin={10} 
                    angle={-45} 
                    textAnchor="end" 
                    height={95}
                    tickFormatter={formatXAxisTick}
                  >
                    <Label value={axisX} position="insideBottom" offset={-10} fill="rgba(255,255,255,0.4)" fontSize={11} fontWeight="bold" />
                  </XAxis>
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} tickFormatter={formatAxisTick} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {legendKeys.length > 0 ? (
                    legendKeys.map((key, idx) => (
                      <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={`url(#grad-${idx})`} strokeWidth={2.5} />
                    ))
                  ) : (
                    <Area type="monotone" dataKey="value" stroke="#a855f7" fill="url(#grad-solo)" strokeWidth={2.5} name={valueY} />
                  )}
                </AreaChart>
              )}

              {/* RENDER SCATTER PLOT */}
              {activeVisual === 'scatter' && (
                <ScatterChart margin={{ top: 20, right: 30, bottom: 45, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    type="number" 
                    dataKey="xVal" 
                    name={axisX} 
                    stroke="rgba(255,255,255,0.3)" 
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} 
                    tickFormatter={formatAxisTick}
                    domain={['auto', 'auto']}
                  >
                    <Label value={axisX} position="insideBottom" offset={-15} fill="rgba(255,255,255,0.4)" fontSize={11} fontWeight="bold" />
                  </XAxis>
                  <YAxis 
                    type="number" 
                    dataKey="yVal" 
                    name={valueY} 
                    stroke="rgba(255,255,255,0.3)" 
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} 
                    tickFormatter={formatAxisTick}
                    domain={['auto', 'auto']}
                  >
                    <Label value={valueY} angle={-90} position="insideLeft" offset={-10} fill="rgba(255,255,255,0.4)" fontSize={11} fontWeight="bold" style={{ textAnchor: 'middle' }} />
                  </YAxis>
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-brand-gray border border-white/10 p-3 rounded-xl text-sm shadow-xl">
                            <p className="font-bold text-white mb-2">Coordinate Point</p>
                            <p className="text-white/80 font-medium">{axisX}: <span className="font-mono font-bold text-primary">{formatAxisTick(payload[0].value)}</span></p>
                            <p className="text-white/80 font-medium">{valueY}: <span className="font-mono font-bold text-primary">{formatAxisTick(payload[1].value)}</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="DataPoints" data={scatterChartData} fill="#c084fc" shape="circle" />
                </ScatterChart>
              )}

              {/* RENDER PIE CHART */}
              {activeVisual === 'pie' && (
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              )}

            </ResponsiveContainer>
          </div>

          {/* DYNAMIC KPI SUMMARY CARDS */}
          {activeVisual === 'scatter' ? (
            scatterStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-white/40">Pearson Correlation (r)</span>
                  <p className="text-lg font-bold text-white mt-1">{scatterStats.r}</p>
                  <span className="text-xs text-primary font-bold">{scatterStats.label}</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-white/40">IQR Outliers Detected</span>
                  <p className="text-lg font-bold text-white mt-1">{scatterStats.outliers} Outliers</p>
                  <span className="text-xs text-amber-400 font-bold">Points deviating from median</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-white/40">Axes Boundary Ranges</span>
                  <p className="text-xs font-bold text-white mt-1 truncate">X: [{formatAxisTick(scatterStats.minX)} - {formatAxisTick(scatterStats.maxX)}]</p>
                  <p className="text-xs text-blue-400 font-semibold truncate">Y: [{formatAxisTick(scatterStats.minY)} - {formatAxisTick(scatterStats.maxY)}]</p>
                </div>
              </div>
            )
          ) : (
            generalStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-white/40">Leading Performer</span>
                  <p className="text-lg font-bold text-white mt-1 truncate">{generalStats.topCategoryName}</p>
                  <span className="text-xs text-primary font-bold">{formatAxisTick(generalStats.topCategoryVal)} ({generalStats.topContrib}%)</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-white/40">Mathematical Average</span>
                  <p className="text-lg font-bold text-white mt-1">{formatAxisTick(Number(generalStats.avg))}</p>
                  <span className="text-xs text-emerald-400 font-bold">Across {generalStats.cardinality} Segments</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-white/40">Cumulative Total</span>
                  <p className="text-lg font-bold text-white mt-1">{formatAxisTick(Number(generalStats.total))}</p>
                  <span className="text-xs text-blue-400 font-bold">Sum of Visual Groups</span>
                </div>
              </div>
            )
          )}

          {/* DYNAMIC NATURAL-LANGUAGE EXPLANATION BOX */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-2.5">
            <h4 className="text-xs uppercase font-bold text-white/55 flex items-center gap-1.5">
              <span>💡</span> PowerBI Automated Analyst Summary
            </h4>
            {activeVisual === 'scatter' ? (
              scatterStats && (
                <>
                  <p className="text-sm text-white/80 leading-relaxed font-medium">
                    This coordinate scatter chart maps the correlation vector between the independent metric <span className="text-primary font-bold">{axisX}</span> and the dependent metric <span className="text-primary font-bold">{valueY}</span>.
                  </p>
                  <p className="text-sm text-white/70 leading-relaxed">
                    The dynamic Pearson correlation coefficient is computed as <span className="font-mono text-white font-bold">{scatterStats.r}</span>, which labels the connection as a <span className="text-amber-400 font-bold">{scatterStats.label}</span>. 
                    {Number(scatterStats.outliers) > 0 ? (
                      <span>
                        {' '}Our Interquartile Range (IQR) alarm flagged <span className="text-red-400 font-bold">{scatterStats.outliers} isolated outliers</span> that significantly deviate from the standard coordinate cluster.
                      </span>
                    ) : (
                      <span> No significant outliers were detected, suggesting a cohesive, standard distribution.</span>
                    )}
                    {' '}The data points span from <span className="font-mono text-white font-bold">{formatAxisTick(scatterStats.minX)}</span> to <span className="font-mono text-white font-bold">{formatAxisTick(scatterStats.maxX)}</span> on the X dimension.
                  </p>
                </>
              )
            ) : (
              generalStats && (
                <>
                  <p className="text-sm text-white/80 leading-relaxed font-medium">
                    This visual represents <span className="text-primary font-bold">{valueY}</span> across different values of <span className="text-primary font-bold">{axisX}</span> aggregated via <span className="font-bold underline">{aggregation.toUpperCase()}</span>.
                    {legendKeys.length > 0 && (
                      <span> Segmented dynamically by a color Legend of <span className="text-emerald-400 font-bold">{legendGroup}</span> containing <span className="font-bold">{legendKeys.length} sub-series</span>.</span>
                    )}
                  </p>
                  <p className="text-sm text-white/70 leading-relaxed">
                    The dominant category in this selection is <span className="text-emerald-400 font-bold">{generalStats.topCategoryName}</span> with a total of <span className="font-mono text-white font-bold">{generalStats.topCategoryVal}</span>, which accounts for a substantial <span className="text-emerald-400 font-bold">{generalStats.topContrib}%</span> share of the visualized segment data.
                    Across the <span className="font-bold text-white">{generalStats.cardinality} categories shown</span>, the average aggregated value is <span className="font-mono text-white font-bold">{formatAxisTick(generalStats.avg)}</span>.
                    {(activeVisual === 'line' || activeVisual === 'area') && (
                      <span> Chronological progression checks run a linear regression fitting that indicates an overall <span className="text-emerald-400 font-bold">{generalStats.trend}</span> direction.</span>
                    )}
                  </p>
                </>
              )
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
