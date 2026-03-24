import React from 'react';
import { defaultImageStyle, defaultTextStyle } from './constants';

export const formatAccountName = (name) =>
  name
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getAccountKeyFromPath = (path) => path.split('/').pop().replace('.json', '');

export const normalizeTextStyle = (style) => {
  const raw = { ...defaultTextStyle, ...(style || {}) };
  if (raw.textPosition && raw.posX === undefined && raw.posY === undefined) {
    if (raw.textPosition === 'top') { raw.posX = 50; raw.posY = 20; }
    else if (raw.textPosition === 'bottom') { raw.posX = 50; raw.posY = 75; }
    else { raw.posX = 50; raw.posY = 50; }
  }
  delete raw.textPosition;
  return raw;
};

export const renderMarkdownText = (text, baseStyle) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 900 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

export const buildCssFilterFromStyle = (style) => {
  const safe = { ...defaultImageStyle, ...(style || {}) };
  return [
    `brightness(${safe.brightness}%)`,
    `contrast(${safe.contrast}%)`,
    `saturate(${safe.saturate}%)`,
    `blur(${safe.blur}px)`,
    `grayscale(${safe.grayscale}%)`,
    `sepia(${safe.sepia}%)`,
    `hue-rotate(${safe.hueRotate}deg)`,
  ].join(' ');
};

export const combineFilters = (...filters) => filters.filter(Boolean).join(' ').trim();

export const normalizeImageStyle = (style) => ({
  ...defaultImageStyle,
  ...(style || {}),
});

export const buildAccountMediaPath = (accountKey, type, fileName) => `/${accountKey}/${type}/${fileName}`;

export const getInitialImagesForAccountSync = (accountKey, baseImageNames) =>
  baseImageNames.map((name) => buildAccountMediaPath(accountKey, 'images', name));

export const getInitialVideosForAccountSync = (accountKey, baseVideoNames) =>
  baseVideoNames.map((name) => buildAccountMediaPath(accountKey, 'videos', name));

export const getLogoForAccount = (accountKey) => buildAccountMediaPath(accountKey, 'images', `${accountKey}-logo.jpg`);

export const createFallbackSlide = (postId, postIndex, images, videos, fallbackText = 'Add slide content') => ({
  id: `${postId}-s1`,
  text: fallbackText,
  image: images.length > 0 ? images[postIndex % images.length] : '',
  video: videos.length > 0 ? videos[postIndex % videos.length] : '',
  backgroundType: 'image',
  imageStyle: normalizeImageStyle(),
  textStyle: normalizeTextStyle(),
});

export const generatePosts = (contentData, images, videos, audios) => {
  const sourcePosts = Array.isArray(contentData?.posts) ? contentData.posts : [];

  return sourcePosts
    .filter(post => post && post.id && (post.title || post.hook))
    .map((post, postIndex) => {
      const normalizedTitle = post.title || post.hook || `Post ${postIndex + 1}`;
      const normalizedSlides = Array.isArray(post.slides)
        ? post.slides
            .filter(Boolean)
            .map((slide, slideIndex) => ({
              id: `${post.id}-s${slideIndex + 1}`,
              text: slide.text || slide.heading || '',
              image: images.length > 0 ? images[postIndex % images.length] : '',
              video: videos.length > 0 ? videos[postIndex % videos.length] : '',
              backgroundType: 'image',
              imageStyle: normalizeImageStyle(slide.imageStyle),
              textStyle: normalizeTextStyle(slide.textStyle),
            }))
        : [];

      return {
        id: post.id,
        title: normalizedTitle,
        caption: post.caption || '',
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        audio: audios[postIndex % audios.length],
        status: post.status || 'draft',
        slides: normalizedSlides.length > 0
          ? normalizedSlides
          : [createFallbackSlide(post.id, postIndex, images, videos, post.hook || normalizedTitle)]
      };
    });
};
