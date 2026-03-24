import React, { useRef, useCallback } from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, MoreHorizontal,
  Heart, MessageCircle, Send, Bookmark, Music, Download, CheckCircle
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { normalizeImageStyle, normalizeTextStyle, buildCssFilterFromStyle, renderMarkdownText } from './utils';
import { getEmbedFontCSS } from './fontEmbed';

export default function PostView({
  activePost,
  currentSlideIndex,
  setCurrentSlideIndex,
  accountUsername,
  logoImage,
  selectedAccountKey,
  accountSources,
  onAccountChange,
  onClosePost,
  updateSlideImageStyle,
  updateSlideTextStyle,
  posts,
  onNavigateToPost,
  onTogglePostStatus,
  imageViewerRef,
  textDragRef,
}) {
  const touchStartRef = useRef(null);
  const isSwipingRef = useRef(false);

  if (!activePost) {
    return <div className="p-6">No active post selected.</div>;
  }

  const slide = activePost.slides[currentSlideIndex];
  const slideImageStyle = normalizeImageStyle(slide?.imageStyle);
  const slideTextStyle = normalizeTextStyle(slide?.textStyle);
  const isVideoBackground = slide.backgroundType === 'video' && !!slide.video;
  const textAlignClass = slideTextStyle.textAlign === 'left' ? 'text-left items-start' : slideTextStyle.textAlign === 'right' ? 'text-right items-end' : 'text-center items-center';
  const slideTextInlineStyle = {
    fontFamily: slideTextStyle.fontFamily || 'Cormorant SC',
    fontWeight: slideTextStyle.fontWeight || 700,
    letterSpacing: `${(slideTextStyle.letterSpacing ?? 10) / 100}em`,
    color: slideTextStyle.textColor || '#ffffff',
  };
  const coverFontSize = `${(slideTextStyle.fontSize / 100) * 2.75}rem`;
  const innerFontSize = `${(slideTextStyle.fontSize / 100) * 1.75}rem`;

  const currentPostIndex = posts.findIndex(p => p.id === activePost.id);

  // Download current slide as id.jpg — captures the live DOM so fonts/placement match exactly
  const downloadCurrentSlide = async () => {
    const el = imageViewerRef?.current;
    if (!el) return;
    // Temporarily hide nav arrows so they don't appear in the downloaded image
    const arrows = el.querySelectorAll('button');
    arrows.forEach(btn => { btn.style.visibility = 'hidden'; });
    const pixelRatio = 1080 / el.offsetWidth;
    const fontEmbedCSS = await getEmbedFontCSS();
    const dataUrl = await toJpeg(el, { pixelRatio, quality: 0.95, cacheBust: true, fontEmbedCSS });
    arrows.forEach(btn => { btn.style.visibility = ''; });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${activePost.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Touch handlers for vertical swipe (next/prev post)
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dy = touch.clientY - touchStartRef.current.y;
    const dx = touch.clientX - touchStartRef.current.x;

    // If vertical movement is dominant, mark as swiping to prevent text drag
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dy = touch.clientY - touchStartRef.current.y;
    const dx = touch.clientX - touchStartRef.current.x;
    const elapsed = Date.now() - touchStartRef.current.time;

    // Only process vertical swipes (not horizontal which are for slide nav)
    // Require: vertical dominant, >80px distance, <500ms, and not a slow drag (hard slide)
    const isVerticalSwipe = Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 80;
    const isQuickSwipe = elapsed < 500;

    if (isVerticalSwipe && isQuickSwipe) {
      if (dy < 0 && currentPostIndex < posts.length - 1) {
        // Swipe up → next post
        onNavigateToPost(posts[currentPostIndex + 1].id);
      } else if (dy > 0 && currentPostIndex > 0) {
        // Swipe down → previous post
        onNavigateToPost(posts[currentPostIndex - 1].id);
      }
    }
    // If it's a slow/hard slide, do nothing — keep current post intact for editing

    touchStartRef.current = null;
    isSwipingRef.current = false;
  };

  const handleMouseDown = (e) => {
    const container = textDragRef?.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    if (e.altKey) {
      const startBgX = slideImageStyle.bgPosX ?? 50;
      const startBgY = slideImageStyle.bgPosY ?? 50;
      const onMouseMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const newX = Math.max(0, Math.min(100, startBgX - (dx / rect.width) * 100));
        const newY = Math.max(0, Math.min(100, startBgY - (dy / rect.height) * 100));
        updateSlideImageStyle('bgPosX', Math.round(newX * 10) / 10);
        updateSlideImageStyle('bgPosY', Math.round(newY * 10) / 10);
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    } else {
      const startPosX = slideTextStyle.posX ?? 50;
      const startPosY = slideTextStyle.posY ?? 50;
      const onMouseMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const newX = Math.max(0, Math.min(100, startPosX + (dx / rect.width) * 100));
        const newY = Math.max(0, Math.min(100, startPosY + (dy / rect.height) * 100));
        updateSlideTextStyle('posX', Math.round(newX * 10) / 10);
        updateSlideTextStyle('posY', Math.round(newY * 10) / 10);
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
  };

  return (
    <div className="flex flex-col bg-white overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-20">
        <div className="flex items-center gap-3">
          <button onClick={onClosePost} className="p-1 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img src={logoImage} alt="avatar" className="w-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{accountUsername}</p>
            {activePost.audio && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Music size={10} /> {activePost.audio}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedAccountKey}
            onChange={(e) => onAccountChange(e.target.value)}
            className="text-xs border rounded-md px-2 py-1.5 bg-white max-w-[130px]"
            aria-label="Switch account"
          >
            {accountSources.map((account) => (
              <option key={account.key} value={account.key}>{account.displayName}</option>
            ))}
          </select>
          <MoreHorizontal size={24} />
        </div>
      </div>

      {/* Image Viewer - 4:5 aspect ratio */}
      <div
        className="relative bg-neutral-900 w-full flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: '4 / 5', cursor: 'grab' }}
        ref={(el) => {
          if (textDragRef) textDragRef.current = el;
          if (imageViewerRef) imageViewerRef.current = el;
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isVideoBackground ? (
          <video
            src={slide.video}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: buildCssFilterFromStyle(slideImageStyle),
              opacity: slideImageStyle.opacity / 100,
              objectPosition: `${slideImageStyle.bgPosX ?? 50}% ${slideImageStyle.bgPosY ?? 50}%`,
            }}
            muted autoPlay loop playsInline
          />
        ) : (
          <img
            src={slide.image}
            alt="Slide Background"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: buildCssFilterFromStyle(slideImageStyle),
              opacity: slideImageStyle.opacity / 100,
              objectPosition: `${slideImageStyle.bgPosX ?? 50}% ${slideImageStyle.bgPosY ?? 50}%`,
            }}
          />
        )}
        {!isVideoBackground && slideImageStyle.tintOpacity > 0 && (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: slideImageStyle.tintColor || '#000000',
              opacity: slideImageStyle.tintOpacity / 100,
            }}
          />
        )}
        {(slideImageStyle.overlayOpacity > 0) && (
          <div className="absolute inset-0" style={{ backgroundColor: '#000', opacity: slideImageStyle.overlayOpacity / 100 }}></div>
        )}

        <div className="relative z-10 w-full h-full" style={{ pointerEvents: 'none' }}>
          {(slideTextStyle.textVisible !== false) && (
          <div
            className={`absolute ${textAlignClass}`}
            style={{
              left: `${slideTextStyle.posX ?? 50}%`,
              top: `${slideTextStyle.posY ?? 50}%`,
              transform: 'translate(-50%, -50%)',
              width: `${slideTextStyle.textWidth ?? 85}%`,
              pointerEvents: 'auto',
            }}
          >
            {currentSlideIndex === 0 ? (
              <div className={`flex flex-col ${slideTextStyle.textAlign === 'left' ? 'items-start' : slideTextStyle.textAlign === 'right' ? 'items-end' : 'items-center'} gap-5`}>
                <div className="w-16 h-px bg-white/60"></div>
                <h2 className="whitespace-pre-line leading-tight drop-shadow-[0_1px_6px_rgba(255,255,255,0.6)]"
                  style={{ ...slideTextInlineStyle, fontSize: coverFontSize }}>
                  {renderMarkdownText(slide.text, slideTextInlineStyle)}
                </h2>
                <div className="w-16 h-px bg-white/60"></div>
              </div>
            ) : (
              <h2 className="whitespace-pre-line leading-tight drop-shadow-[0_1px_6px_rgba(255,255,255,0.6)]"
                style={{ ...slideTextInlineStyle, fontSize: innerFontSize }}>
                {renderMarkdownText(slide.text, slideTextInlineStyle)}
              </h2>
            )}
          </div>
          )}
          <div className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm tracking-widest font-medium">
            @{accountUsername}
          </div>
        </div>

        {/* Nav Arrows */}
        {currentSlideIndex > 0 && (
          <button onClick={() => setCurrentSlideIndex(c => c - 1)} className="absolute left-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition">
            <ChevronLeft size={20} />
          </button>
        )}
        {currentSlideIndex < activePost.slides.length - 1 && (
          <button onClick={() => setCurrentSlideIndex(c => c + 1)} className="absolute right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition">
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-4 py-3 bg-white">
        {/* Posted status badge */}
        {activePost.status === 'posted' && (
          <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold mb-2">
            <CheckCircle size={14} />
            <span>Posted to Instagram</span>
          </div>
        )}
        <div className="flex justify-between mb-3">
          <div className="flex gap-4">
            <Heart size={26} className="text-black hover:text-red-500 cursor-pointer" />
            <MessageCircle size={26} className="text-black cursor-pointer" />
            <Send size={26} className="text-black cursor-pointer" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTogglePostStatus(activePost.id)}
              title={activePost.status === 'posted' ? 'Mark as not posted' : 'Mark as posted'}
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border transition-colors ${
                activePost.status === 'posted'
                  ? 'border-green-500 text-green-600 hover:bg-green-50'
                  : 'border-gray-300 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <CheckCircle size={13} />
              {activePost.status === 'posted' ? 'Posted' : 'Mark posted'}
            </button>
            <button onClick={downloadCurrentSlide} title={`Download as ${activePost.id}.jpg`}>
              <Download size={26} className="text-black cursor-pointer hover:text-blue-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-1.5 mb-3">
          {activePost.slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full ${i === currentSlideIndex ? 'w-1.5 bg-blue-500' : 'w-1.5 bg-gray-300'}`} />
          ))}
        </div>

        <p className="text-sm whitespace-pre-line">
          <span className="font-semibold mr-2">{accountUsername}</span>
          {activePost.caption || activePost.title}
        </p>
        {activePost.hashtags?.length > 0 && (
          <p className="text-sm text-blue-900 mt-1 break-words">
            {activePost.hashtags.join(' ')}
          </p>
        )}
      </div>
    </div>
  );
}
