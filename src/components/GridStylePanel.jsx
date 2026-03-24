import React from 'react';
import RangeControl from './RangeControl';

export default function GridStylePanel({ gridStyle, updateGridStyle, resetGridStyle }) {
  return (
    <div className="bg-neutral-50 border rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold">Grid Visual Organizer</h4>
        <button onClick={resetGridStyle} className="text-xs px-2 py-1 rounded border bg-white hover:bg-neutral-100">Reset Grid</button>
      </div>
      <p className="text-xs text-neutral-500">Use these controls to style the entire post grid when no image is selected.</p>

      <div className="grid grid-cols-2 gap-3">
        <RangeControl label="Grid Opacity" min={10} max={100} value={gridStyle?.opacity ?? 100} onChange={(v) => updateGridStyle('opacity', v)} suffix="%" />
        <RangeControl label="Grid Blur" min={0} max={12} value={gridStyle?.blur ?? 0} onChange={(v) => updateGridStyle('blur', v)} suffix="px" />
        <RangeControl label="Brightness" min={50} max={150} value={gridStyle?.brightness ?? 100} onChange={(v) => updateGridStyle('brightness', v)} suffix="%" />
        <RangeControl label="Contrast" min={50} max={180} value={gridStyle?.contrast ?? 100} onChange={(v) => updateGridStyle('contrast', v)} suffix="%" />
        <RangeControl label="Saturation" min={0} max={200} value={gridStyle?.saturate ?? 100} onChange={(v) => updateGridStyle('saturate', v)} suffix="%" />
        <RangeControl label="Grayscale" min={0} max={100} value={gridStyle?.grayscale ?? 0} onChange={(v) => updateGridStyle('grayscale', v)} suffix="%" />
        <RangeControl label="Sepia" min={0} max={100} value={gridStyle?.sepia ?? 0} onChange={(v) => updateGridStyle('sepia', v)} suffix="%" />
        <RangeControl label="Hue Shift" min={0} max={360} value={gridStyle?.hueRotate ?? 0} onChange={(v) => updateGridStyle('hueRotate', v)} suffix="deg" />
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <label className="block">
          <div className="text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">Filter Color</div>
          <input
            type="color"
            value={gridStyle?.tintColor || '#000000'}
            onChange={(e) => updateGridStyle('tintColor', e.target.value)}
            className="w-full h-9 border rounded"
          />
        </label>
        <RangeControl label="Color Strength" min={0} max={100} value={gridStyle?.tintOpacity ?? 0} onChange={(v) => updateGridStyle('tintOpacity', v)} suffix="%" />
      </div>
      <RangeControl label="Dark Overlay" min={0} max={80} value={gridStyle?.overlayOpacity ?? 0} onChange={(v) => updateGridStyle('overlayOpacity', v)} suffix="%" />
    </div>
  );
}
