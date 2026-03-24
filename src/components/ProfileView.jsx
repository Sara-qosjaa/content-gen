import React from 'react';
import {
  Grid as GridIcon, Bookmark, Play, Plus, MoreHorizontal, Edit3
} from 'lucide-react';
import { defaultGridStyle } from './constants';
import { normalizeImageStyle, buildCssFilterFromStyle, combineFilters } from './utils';

export default function ProfileView({
  accountUsername,
  accountBrand,
  accountDescription,
  logoImage,
  posts,
  gridStyle,
  selectedAccountKey,
  accountSources,
  onAccountChange,
  onOpenPost,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-20">
        <h1 className="font-bold text-xl flex items-center gap-1">
          {accountUsername} <span className="text-blue-500 text-sm">✔</span>
        </h1>
        <div className="flex items-center gap-3">
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
          <Plus size={24} />
          <MoreHorizontal size={24} />
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 py-4 flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-1">
          <div className="w-full h-full rounded-full border-2 border-white bg-gray-200 overflow-hidden">
            <img src={logoImage} alt="avatar" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex gap-6 text-center flex-1 justify-center">
          <div><p className="font-bold text-lg">{posts.length}</p><p className="text-sm text-gray-600">posts</p></div>
          <div><p className="font-bold text-lg">99K</p><p className="text-sm text-gray-600">followers</p></div>
          <div><p className="font-bold text-lg">99</p><p className="text-sm text-gray-600">following</p></div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <h2 className="font-bold">{accountBrand}</h2>
        <p className="text-sm whitespace-pre-line">{accountDescription}</p>
        <a href="#" className="text-sm text-blue-900 font-semibold">{accountUsername}</a>
      </div>

      {/* Grid Tabs */}
      <div className="flex border-t">
        <div className="flex-1 flex justify-center py-3 border-b-2 border-black text-black">
          <GridIcon size={24} />
        </div>
        <div className="flex-1 flex justify-center py-3 text-gray-400">
          <Play size={24} />
        </div>
        <div className="flex-1 flex justify-center py-3 text-gray-400">
          <Bookmark size={24} />
        </div>
      </div>

      {/* Post Grid (Draggable) */}
      <div className="grid grid-cols-3 gap-1 bg-white flex-1 content-start">
        {posts.map((post, index) => {
          const coverSlide = post.slides[0];
          const coverImageStyle = normalizeImageStyle(coverSlide?.imageStyle);
          const gridStyleSafe = { ...defaultGridStyle, ...(gridStyle || {}) };
          const mediaOpacity = (coverImageStyle.opacity / 100) * (gridStyleSafe.opacity / 100);
          const mediaFilter = combineFilters(
            buildCssFilterFromStyle(coverImageStyle),
            buildCssFilterFromStyle(gridStyleSafe),
          );

          return (
            <div
              key={post.id}
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={(e) => onDrop(e, index)}
              onClick={() => onOpenPost(post.id)}
              className="aspect-square relative cursor-pointer group bg-gray-200"
            >
              {(post.slides[0].backgroundType === 'video' && post.slides[0].video) ? (
                <video
                  src={post.slides[0].video}
                  className="w-full h-full object-cover"
                  style={{ filter: mediaFilter, opacity: mediaOpacity, objectPosition: `${coverImageStyle.bgPosX ?? 50}% ${coverImageStyle.bgPosY ?? 50}%` }}
                  muted autoPlay loop playsInline
                />
              ) : (
                <img src={post.slides[0].image} className="w-full h-full object-cover" alt="Cover" style={{ filter: mediaFilter, opacity: mediaOpacity, objectPosition: `${coverImageStyle.bgPosX ?? 50}% ${coverImageStyle.bgPosY ?? 50}%` }} />
              )}
              {(coverImageStyle.tintOpacity > 0 || gridStyleSafe.tintOpacity > 0) && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundColor: (gridStyleSafe.tintOpacity > 0 ? gridStyleSafe.tintColor : coverImageStyle.tintColor) || '#000000',
                    opacity: Math.min(1, (coverImageStyle.tintOpacity + gridStyleSafe.tintOpacity) / 100),
                  }}
                />
              )}
              {(coverImageStyle.overlayOpacity > 0 || gridStyleSafe.overlayOpacity > 0) && (
                <div className="absolute inset-0" style={{ backgroundColor: '#000', opacity: Math.max(coverImageStyle.overlayOpacity, gridStyleSafe.overlayOpacity) / 100 }}></div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                <div className="w-6 h-px bg-white/70 mb-1"></div>
                <p className="text-white text-[13px] font-bold tracking-widest leading-tight drop-shadow-[0_1px_6px_rgba(255,255,255,0.6)] line-clamp-3">
                  {post.slides[0].text}
                </p>
                <div className="w-6 h-px bg-white/70 mt-1"></div>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white font-semibold flex items-center gap-1 text-xs">
                  <Edit3 size={14} /> Edit
                </span>
              </div>
              {/* Carousel Icon */}
              <div className="absolute top-2 right-2 text-white">
                <svg aria-label="Carousel" fill="currentColor" height="22" role="img" viewBox="0 0 48 48" width="22"><path d="M34.8 29.7V11c0-2.9-2.3-5.2-5.2-5.2H11c-2.9 0-5.2 2.3-5.2 5.2v18.7c0 2.9 2.3 5.2 5.2 5.2h18.7c2.8-.1 5.1-2.4 5.1-5.2zM39.2 15v16.1c0 4.5-3.7 8.2-8.2 8.2H14.9c-.6 0-.9.7-.5 1.1 1.6 1.5 3.7 2.4 6 2.4h13.4c5.5 0 10-4.5 10-10V18.5c0-2.3-.9-4.4-2.4-6-.4-.4-1.1-.1-1.1.5z"></path></svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
