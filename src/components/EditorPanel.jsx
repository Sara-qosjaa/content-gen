import React from 'react';
import {
  Grid as GridIcon, ChevronLeft, ChevronRight, Download, Loader2,
  Eye, EyeOff,
} from 'lucide-react';

// 3×3 placement snap grid positions
const SNAP_POSITIONS = [
  { label: '↖', posX: 15, posY: 15 },
  { label: '↑',  posX: 50, posY: 15 },
  { label: '↗', posX: 85, posY: 15 },
  { label: '←', posX: 15, posY: 50 },
  { label: '·',  posX: 50, posY: 50 },
  { label: '→', posX: 85, posY: 50 },
  { label: '↙', posX: 15, posY: 80 },
  { label: '↓',  posX: 50, posY: 80 },
  { label: '↘', posX: 85, posY: 80 },
];

function PlacementGrid({ posX, posY, onSnap }) {
  return (
    <div className="grid grid-cols-3 gap-1 w-full">
      {SNAP_POSITIONS.map((snap) => {
        const active = Math.abs(posX - snap.posX) < 5 && Math.abs(posY - snap.posY) < 5;
        return (
          <button
            key={snap.label}
            title={`X:${snap.posX}% Y:${snap.posY}%`}
            onClick={() => onSnap(snap.posX, snap.posY)}
            className={`h-8 rounded text-sm font-bold transition-colors
              ${active
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500'}`}
          >
            {snap.label}
          </button>
        );
      })}
    </div>
  );
}
import { FONT_OPTIONS, FONT_WEIGHT_OPTIONS, TEXT_ALIGN_OPTIONS } from './constants';
import { buildCssFilterFromStyle } from './utils';
import RangeControl from './RangeControl';
import GridStylePanel from './GridStylePanel';

export default function EditorPanel({
  activePostId,
  activePost,
  currentSlideIndex,
  setCurrentSlideIndex,
  audios,
  images,
  videos,
  gridStyle,
  isDownloading,
  updateSlideContent,
  updatePostAudio,
  updateSlideBackgroundType,
  updateSlideImageStyle,
  resetCurrentSlideImageStyle,
  updateSlideTextStyle,
  resetCurrentSlideTextStyle,
  updateGridStyle,
  resetGridStyle,
  applyGridFiltersToSlide,
  downloadCarousel,
}) {
  if (!activePostId) {
    return (
      <div className="space-y-6">
        <div className="text-center py-10 text-neutral-500 space-y-4">
          <GridIcon size={48} className="mx-auto text-neutral-300" />
          <p>Select a post from the grid to edit its content.</p>
          <p className="text-sm">Drag and drop posts in the mockup to reorder them.</p>
        </div>
        <GridStylePanel gridStyle={gridStyle} updateGridStyle={updateGridStyle} resetGridStyle={resetGridStyle} />
      </div>
    );
  }

  if (!activePost) return null;

  const currentSlide = activePost.slides[currentSlideIndex];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-3 pb-4 border-b">
        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
          Editing Post
        </span>
        <h3 className="font-bold text-neutral-800 truncate flex-1" title={activePost.title}>{activePost.title}</h3>
        <button
          onClick={downloadCarousel}
          disabled={isDownloading}
          title="Download all slides as JPG ZIP"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors shrink-0"
        >
          {isDownloading
            ? <><Loader2 size={14} className="animate-spin" /> Exporting…</>
            : <><Download size={14} /> Download ZIP</>
          }
        </button>
      </div>

      {/* Audio Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-neutral-700">Post Audio Track</label>
        <select
          value={activePost.audio || ''}
          onChange={(e) => updatePostAudio(e.target.value)}
          className="w-full p-2.5 border rounded-lg bg-neutral-50 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">No Audio</option>
          {audios.map((aud, i) => <option key={i} value={aud}>{aud}</option>)}
        </select>
      </div>

      {/* Slide Editor */}
      <div className="bg-neutral-50 border rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold flex items-center gap-2">
            Slide {currentSlideIndex + 1} <span className="text-neutral-400 font-normal text-sm">of {activePost.slides.length}</span>
          </h4>
          <div className="flex gap-2">
            <button disabled={currentSlideIndex === 0} onClick={() => setCurrentSlideIndex(c => c - 1)} className="p-1.5 bg-white border rounded hover:bg-neutral-100 disabled:opacity-50"><ChevronLeft size={16}/></button>
            <button disabled={currentSlideIndex === activePost.slides.length - 1} onClick={() => setCurrentSlideIndex(c => c + 1)} className="p-1.5 bg-white border rounded hover:bg-neutral-100 disabled:opacity-50"><ChevronRight size={16}/></button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">Slide Text</label>
            <textarea
              rows={6}
              value={currentSlide.text}
              onChange={(e) => updateSlideContent('text', e.target.value)}
              className="w-full p-3 border rounded-lg resize-none outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              placeholder="Enter slide text here..."
            />
            <p className="text-xs text-neutral-400 mt-1">Use <code className="bg-neutral-100 px-1 rounded">**word**</code> to bold specific words</p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">Background Media Type</label>
            <select
              value={currentSlide.backgroundType || 'image'}
              onChange={(e) => updateSlideBackgroundType(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>

          {(currentSlide.backgroundType || 'image') === 'video' ? (
            <div>
              <label className="block text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">Background Video</label>
              <select
                value={currentSlide.video || ''}
                onChange={(e) => updateSlideContent('video', e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {videos.length === 0 && <option value="">No videos available</option>}
                {videos.map((vid, i) => (
                  <option key={i} value={vid}>Video {i + 1} - {vid.substring(0,20)}...</option>
                ))}
              </select>
              <div className="mt-3 aspect-video rounded-lg overflow-hidden border border-neutral-200 relative bg-black">
                {currentSlide.video ? (
                  <video src={currentSlide.video} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/70 text-xs">No video selected</div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">Background Image</label>
              <select
                value={currentSlide.image}
                onChange={(e) => updateSlideContent('image', e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {images.map((img, i) => (
                  <option key={i} value={img}>Image {i + 1} - {img.substring(0,20)}...</option>
                ))}
              </select>
              {/* Thumbnail Preview */}
              <div className="mt-3 aspect-video rounded-lg overflow-hidden border border-neutral-200 relative">
                <img
                  src={currentSlide.image}
                  alt="preview"
                  className="w-full h-full object-cover"
                  style={{
                    filter: buildCssFilterFromStyle(currentSlide.imageStyle),
                    opacity: (currentSlide.imageStyle?.opacity ?? 100) / 100,
                  }}
                />
                {(currentSlide.imageStyle?.tintOpacity ?? 0) > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundColor: currentSlide.imageStyle?.tintColor || '#000000',
                      opacity: (currentSlide.imageStyle?.tintOpacity ?? 0) / 100,
                    }}
                  />
                )}
              </div>

              <div className="bg-white border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-sm">Image Styling Studio</h5>
                  <div className="flex gap-1">
                    <button onClick={applyGridFiltersToSlide} className="text-xs px-2 py-1 rounded border hover:bg-neutral-50">Apply Grid Filters</button>
                    <button onClick={resetCurrentSlideImageStyle} className="text-xs px-2 py-1 rounded border hover:bg-neutral-50">Reset Filters</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <RangeControl label="Opacity" min={10} max={100} value={currentSlide.imageStyle?.opacity ?? 100} onChange={(v) => updateSlideImageStyle('opacity', v)} suffix="%" />
                  <RangeControl label="Blur" min={0} max={16} value={currentSlide.imageStyle?.blur ?? 0} onChange={(v) => updateSlideImageStyle('blur', v)} suffix="px" />
                  <RangeControl label="Brightness" min={50} max={160} value={currentSlide.imageStyle?.brightness ?? 100} onChange={(v) => updateSlideImageStyle('brightness', v)} suffix="%" />
                  <RangeControl label="Contrast" min={50} max={180} value={currentSlide.imageStyle?.contrast ?? 100} onChange={(v) => updateSlideImageStyle('contrast', v)} suffix="%" />
                  <RangeControl label="Saturation" min={0} max={220} value={currentSlide.imageStyle?.saturate ?? 100} onChange={(v) => updateSlideImageStyle('saturate', v)} suffix="%" />
                  <RangeControl label="Grayscale" min={0} max={100} value={currentSlide.imageStyle?.grayscale ?? 0} onChange={(v) => updateSlideImageStyle('grayscale', v)} suffix="%" />
                  <RangeControl label="Sepia" min={0} max={100} value={currentSlide.imageStyle?.sepia ?? 0} onChange={(v) => updateSlideImageStyle('sepia', v)} suffix="%" />
                  <RangeControl label="Hue Shift" min={0} max={360} value={currentSlide.imageStyle?.hueRotate ?? 0} onChange={(v) => updateSlideImageStyle('hueRotate', v)} suffix="deg" />
                </div>
                <RangeControl label="Dark Overlay" min={0} max={80} value={currentSlide.imageStyle?.overlayOpacity ?? 0} onChange={(v) => updateSlideImageStyle('overlayOpacity', v)} suffix="%" />
                <div className="grid grid-cols-2 gap-3">
                  <RangeControl label="Bg Pos X" min={0} max={100} value={currentSlide.imageStyle?.bgPosX ?? 50} onChange={(v) => updateSlideImageStyle('bgPosX', v)} suffix="%" />
                  <RangeControl label="Bg Pos Y" min={0} max={100} value={currentSlide.imageStyle?.bgPosY ?? 50} onChange={(v) => updateSlideImageStyle('bgPosY', v)} suffix="%" />
                </div>
                <p className="text-xs text-neutral-400">Hold Alt + drag image to reposition</p>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <label className="block">
                    <div className="text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">Filter Color</div>
                    <input
                      type="color"
                      value={currentSlide.imageStyle?.tintColor || '#000000'}
                      onChange={(e) => updateSlideImageStyle('tintColor', e.target.value)}
                      className="w-full h-9 border rounded"
                    />
                  </label>
                  <RangeControl label="Color Strength" min={0} max={100} value={currentSlide.imageStyle?.tintOpacity ?? 0} onChange={(v) => updateSlideImageStyle('tintOpacity', v)} suffix="%" />
                </div>
              </div>
            </div>
          )}

          {/* Text Styling Studio */}
          <div className="bg-white border rounded-xl p-4 space-y-4">
            {/* Header row with visibility toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h5 className="font-semibold text-sm">Text Styling</h5>
                <button
                  title={currentSlide.textStyle?.textVisible === false ? 'Show text' : 'Hide text'}
                  onClick={() => updateSlideTextStyle('textVisible', !(currentSlide.textStyle?.textVisible ?? true))}
                  className={`p-1 rounded transition-colors ${
                    currentSlide.textStyle?.textVisible === false
                      ? 'bg-neutral-200 text-neutral-400'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  {currentSlide.textStyle?.textVisible === false
                    ? <EyeOff size={15} />
                    : <Eye size={15} />}
                </button>
              </div>
              <button onClick={resetCurrentSlideTextStyle} className="text-xs px-2 py-1 rounded border hover:bg-neutral-50">Reset Text</button>
            </div>

            <div className={`space-y-3 transition-opacity duration-200 ${currentSlide.textStyle?.textVisible === false ? 'opacity-40 pointer-events-none' : ''}`}>
              <label className="block">
                <div className="text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">Font Family</div>
                <select
                  value={currentSlide.textStyle?.fontFamily || 'Cormorant SC'}
                  onChange={(e) => updateSlideTextStyle('fontFamily', e.target.value)}
                  className="w-full p-2 border rounded-lg bg-neutral-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">Font Weight</div>
                  <select
                    value={currentSlide.textStyle?.fontWeight || 700}
                    onChange={(e) => updateSlideTextStyle('fontWeight', Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-neutral-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {FONT_WEIGHT_OPTIONS.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </label>
                <RangeControl label="Font Size" min={40} max={200} value={currentSlide.textStyle?.fontSize ?? 100} onChange={(v) => updateSlideTextStyle('fontSize', v)} suffix="%" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">Text Align</div>
                  <select
                    value={currentSlide.textStyle?.textAlign || 'center'}
                    onChange={(e) => updateSlideTextStyle('textAlign', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-neutral-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {TEXT_ALIGN_OPTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </label>
                <RangeControl label="Letter Spacing" min={0} max={30} value={currentSlide.textStyle?.letterSpacing ?? 10} onChange={(v) => updateSlideTextStyle('letterSpacing', v)} />
              </div>

              {/* Text Width */}
              <RangeControl
                label="Text Width"
                min={20} max={100}
                value={currentSlide.textStyle?.textWidth ?? 85}
                onChange={(v) => updateSlideTextStyle('textWidth', v)}
                suffix="%"
              />

              <div className="grid grid-cols-2 gap-3 items-end">
                <label className="block">
                  <div className="text-xs font-semibold mb-1 text-neutral-500 uppercase tracking-wide">Text Color</div>
                  <input
                    type="color"
                    value={currentSlide.textStyle?.textColor || '#ffffff'}
                    onChange={(e) => updateSlideTextStyle('textColor', e.target.value)}
                    className="w-full h-9 border rounded"
                  />
                </label>
              </div>

              {/* Placement */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Placement</div>
                <PlacementGrid
                  posX={currentSlide.textStyle?.posX ?? 50}
                  posY={currentSlide.textStyle?.posY ?? 50}
                  onSnap={(x, y) => {
                    updateSlideTextStyle('posX', x);
                    updateSlideTextStyle('posY', y);
                  }}
                />
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <RangeControl label="Pos X" min={0} max={100} value={currentSlide.textStyle?.posX ?? 50} onChange={(v) => updateSlideTextStyle('posX', v)} suffix="%" />
                  <RangeControl label="Pos Y" min={0} max={100} value={currentSlide.textStyle?.posY ?? 50} onChange={(v) => updateSlideTextStyle('posY', v)} suffix="%" />
                </div>
                <p className="text-xs text-neutral-400">Or drag text in the preview</p>
              </div>

              {/* Live preview */}
              <div className="rounded-lg bg-neutral-900 p-4 text-center overflow-hidden">
                <p style={{
                  fontFamily: currentSlide.textStyle?.fontFamily || 'Cormorant SC',
                  fontWeight: currentSlide.textStyle?.fontWeight || 700,
                  fontSize: `${((currentSlide.textStyle?.fontSize ?? 100) / 100) * 14}px`,
                  letterSpacing: `${(currentSlide.textStyle?.letterSpacing ?? 10) / 100}em`,
                  color: currentSlide.textStyle?.textColor || '#ffffff',
                  textAlign: currentSlide.textStyle?.textAlign || 'center',
                  width: `${currentSlide.textStyle?.textWidth ?? 85}%`,
                  margin: '0 auto',
                }}>
                  Preview Text
                </p>
              </div>
            </div>
          </div>

          {(currentSlide.backgroundType || 'image') !== 'image' && (
            <GridStylePanel gridStyle={gridStyle} updateGridStyle={updateGridStyle} resetGridStyle={resetGridStyle} />
          )}
        </div>
      </div>
    </div>
  );
}
