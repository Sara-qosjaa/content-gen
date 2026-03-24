import React from 'react';

export default function RangeControl({ label, min, max, step = 1, value, onChange, suffix = '' }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}
