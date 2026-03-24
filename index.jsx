import React, { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toJpeg as domToJpeg } from 'html-to-image';
import { getEmbedFontCSS } from './src/components/fontEmbed';

import {
  defaultImageStyle, defaultGridStyle, defaultTextStyle,
  baseImageNames, baseVideoNames, initialAudio,
  SETTINGS_API_PATH,
} from './src/components/constants';

import {
  formatAccountName, getAccountKeyFromPath,
  normalizeTextStyle, normalizeImageStyle, buildCssFilterFromStyle,
  buildAccountMediaPath, getInitialImagesForAccountSync, getInitialVideosForAccountSync,
  getLogoForAccount, createFallbackSlide, generatePosts,
} from './src/components/utils';

import ProfileView from './src/components/ProfileView';
import PostView from './src/components/PostView';
import EditorPanel from './src/components/EditorPanel';
import MediaManager from './src/components/MediaManager';

// --- Account data loading ---
const dataModules = import.meta.glob('./data/*.json', { eager: true });

const accountSources = Object.entries(dataModules)
  .map(([path, moduleData]) => {
    const key = getAccountKeyFromPath(path);
    const data = moduleData?.default ?? moduleData;
    return {
      key,
      data,
      displayName: data?.brand || formatAccountName(key),
      username: `${key}.ai`
    };
  })
  .sort((a, b) => a.displayName.localeCompare(b.displayName));

const accountDataByKey = accountSources.reduce((acc, source) => {
  acc[source.key] = source.data;
  return acc;
}, {});

const defaultAccountKey = accountSources.find((source) => source.key === 'astroluna')?.key || accountSources[0]?.key || '';

// --- Account state builders ---
const buildDefaultAccountState = (accountKey) => {
  const images = getInitialImagesForAccountSync(accountKey, baseImageNames);
  const videos = getInitialVideosForAccountSync(accountKey, baseVideoNames);
  const audios = [...initialAudio];
  const posts = generatePosts(accountDataByKey[accountKey], images, videos, audios);
  return { images, videos, audios, posts, gridStyle: { ...defaultGridStyle } };
};

const buildDefaultAccountStateByKey = () => {
  const next = {};
  accountSources.forEach(({ key }) => {
    next[key] = buildDefaultAccountState(key);
  });
  return next;
};

const normalizeAccountState = (rawState, accountKey) => {
  const fallback = buildDefaultAccountState(accountKey);
  if (!rawState || typeof rawState !== 'object') return fallback;

  return {
    images: Array.isArray(rawState.images) && rawState.images.length > 0 ? rawState.images : fallback.images,
    videos: Array.isArray(rawState.videos) && rawState.videos.length > 0 ? rawState.videos : fallback.videos,
    audios: Array.isArray(rawState.audios) && rawState.audios.length > 0 ? rawState.audios : fallback.audios,
    posts: Array.isArray(rawState.posts) && rawState.posts.length > 0
      ? rawState.posts.map((post, postIndex) => ({
          ...post,
          slides: Array.isArray(post.slides) && post.slides.length > 0
            ? post.slides.map((slide) => ({
                ...slide,
                imageStyle: normalizeImageStyle(slide?.imageStyle),
                textStyle: normalizeTextStyle(slide?.textStyle),
              }))
            : fallback.posts[postIndex]?.slides || [createFallbackSlide(post.id || `post-${postIndex + 1}`, postIndex, fallback.images, fallback.videos, post.title || post.hook || 'Add slide content')],
        }))
      : fallback.posts,
    gridStyle: { ...defaultGridStyle, ...(rawState.gridStyle || {}) },
  };
};

const normalizeAccountStateByKey = (rawByKey) => {
  const next = {};
  accountSources.forEach(({ key }) => {
    next[key] = normalizeAccountState(rawByKey?.[key], key);
  });
  return next;
};

export default function InstagramMockup() {
  const hasLoadedSettingsRef = useRef(false);
  const textDragRef = useRef(null);
  const imageViewerRef = useRef(null);

  const [selectedAccountKey, setSelectedAccountKey] = useState(defaultAccountKey);

  const selectedAccount = accountSources.find((account) => account.key === selectedAccountKey) || accountSources[0];
  const accountBrand = selectedAccount?.displayName || 'Account';
  const accountUsername = selectedAccount?.username || 'account.ai';
  const accountDescription = selectedAccount?.data?.description || 'Content library preview.';
  const logoImage = getLogoForAccount(selectedAccountKey);

  // --- STATE ---
  const [view, setView] = useState('profile');
  const [activePostId, setActivePostId] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [accountStateByKey, setAccountStateByKey] = useState(() => buildDefaultAccountStateByKey());
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('editor');
  const [isDownloading, setIsDownloading] = useState(false);

  const activeAccountState = accountStateByKey[selectedAccountKey] || buildDefaultAccountState(selectedAccountKey);
  const { images, videos, audios, posts, gridStyle } = activeAccountState;
  const activePost = posts.find(p => p.id === activePostId);

  const updateCurrentAccountState = (updater) => {
    setAccountStateByKey((prev) => {
      const current = prev[selectedAccountKey] || buildDefaultAccountState(selectedAccountKey);
      return { ...prev, [selectedAccountKey]: updater(current) };
    });
  };

  // --- Settings load/save ---
  useEffect(() => {
    let isCancelled = false;
    const loadSettings = async () => {
      try {
        const response = await fetch(SETTINGS_API_PATH, { credentials: 'include' });
        if (!response.ok) return;
        const payload = await response.json();
        const settings = payload?.settings;
        if (!settings || isCancelled) return;

        if (settings.selectedAccountKey && accountDataByKey[settings.selectedAccountKey]) {
          setSelectedAccountKey(settings.selectedAccountKey);
        }
        if (settings.activeTab === 'editor' || settings.activeTab === 'media') {
          setActiveTab(settings.activeTab);
        }
        if (settings.accountStateByKey) {
          setAccountStateByKey(normalizeAccountStateByKey(settings.accountStateByKey));
        }
      } catch (error) {
        console.error('Failed to load user settings:', error);
      } finally {
        if (!isCancelled) hasLoadedSettingsRef.current = true;
      }
    };
    loadSettings();
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    if (!hasLoadedSettingsRef.current) return;
    const timeoutId = setTimeout(() => {
      fetch(SETTINGS_API_PATH, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { selectedAccountKey, device: 'mobile', activeTab, accountStateByKey },
        }),
      }).catch((error) => console.error('Failed to save user settings:', error));
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [selectedAccountKey, activeTab, accountStateByKey]);

  // --- HANDLERS ---
  const handleAccountChange = (accountKey) => {
    setSelectedAccountKey(accountKey);
    setView('profile');
    setActivePostId(null);
    setCurrentSlideIndex(0);
  };

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const newPosts = [...posts];
    const draggedPost = newPosts[draggedIdx];
    newPosts.splice(draggedIdx, 1);
    newPosts.splice(targetIdx, 0, draggedPost);
    updateCurrentAccountState((current) => ({ ...current, posts: newPosts }));
    setDraggedIdx(null);
  };

  const openPost = (id) => {
    setActivePostId(id);
    setCurrentSlideIndex(0);
    setView('post');
  };

  const closePost = () => {
    setView('profile');
    setActivePostId(null);
  };

  const navigateToPost = (postId) => {
    setActivePostId(postId);
    setCurrentSlideIndex(0);
  };

  const updateSlideContent = (field, value) => {
    updateCurrentAccountState((current) => ({
      ...current,
      posts: current.posts.map((p) => {
        if (p.id !== activePostId) return p;
        const newSlides = [...p.slides];
        newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], [field]: value };
        return { ...p, slides: newSlides };
      }),
    }));
  };

  const updatePostAudio = (audioVal) => {
    updateCurrentAccountState((current) => ({
      ...current,
      posts: current.posts.map((p) => (p.id === activePostId ? { ...p, audio: audioVal } : p)),
    }));
  };

  const updateSlideBackgroundType = (backgroundType) => {
    updateCurrentAccountState((current) => ({
      ...current,
      posts: current.posts.map((p) => {
        if (p.id !== activePostId) return p;
        const newSlides = [...p.slides];
        const currentSlide = newSlides[currentSlideIndex];
        newSlides[currentSlideIndex] = {
          ...currentSlide,
          backgroundType,
          image: currentSlide.image || current.images[0] || '',
          video: currentSlide.video || current.videos[0] || '',
        };
        return { ...p, slides: newSlides };
      }),
    }));
  };

  const updateSlideImageStyle = (field, value) => {
    updateCurrentAccountState((current) => ({
      ...current,
      posts: current.posts.map((p) => {
        if (p.id !== activePostId) return p;
        const newSlides = [...p.slides];
        const currentSlide = newSlides[currentSlideIndex];
        newSlides[currentSlideIndex] = {
          ...currentSlide,
          imageStyle: { ...normalizeImageStyle(currentSlide.imageStyle), [field]: value },
        };
        return { ...p, slides: newSlides };
      }),
    }));
  };

  const resetCurrentSlideImageStyle = () => {
    updateCurrentAccountState((current) => ({
      ...current,
      posts: current.posts.map((p) => {
        if (p.id !== activePostId) return p;
        const newSlides = [...p.slides];
        newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], imageStyle: { ...defaultImageStyle } };
        return { ...p, slides: newSlides };
      }),
    }));
  };

  const updateSlideTextStyle = (field, value) => {
    updateCurrentAccountState((current) => ({
      ...current,
      posts: current.posts.map((p) => {
        if (p.id !== activePostId) return p;
        const newSlides = [...p.slides];
        const currentSlide = newSlides[currentSlideIndex];
        newSlides[currentSlideIndex] = {
          ...currentSlide,
          textStyle: { ...normalizeTextStyle(currentSlide.textStyle), [field]: value },
        };
        return { ...p, slides: newSlides };
      }),
    }));
  };

  const resetCurrentSlideTextStyle = () => {
    updateCurrentAccountState((current) => ({
      ...current,
      posts: current.posts.map((p) => {
        if (p.id !== activePostId) return p;
        const newSlides = [...p.slides];
        newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], textStyle: { ...defaultTextStyle } };
        return { ...p, slides: newSlides };
      }),
    }));
  };

  const updateGridStyle = (field, value) => {
    updateCurrentAccountState((current) => ({
      ...current,
      gridStyle: { ...defaultGridStyle, ...(current.gridStyle || {}), [field]: value },
    }));
  };

  const resetGridStyle = () => {
    updateCurrentAccountState((current) => ({ ...current, gridStyle: { ...defaultGridStyle } }));
  };

  const applyGridFiltersToSlide = () => {
    updateCurrentAccountState((current) => ({
      ...current,
      posts: current.posts.map((p) => {
        if (p.id !== activePostId) return p;
        const newSlides = [...p.slides];
        const currentSlide = newSlides[currentSlideIndex];
        const gs = { ...defaultGridStyle, ...(current.gridStyle || {}) };
        newSlides[currentSlideIndex] = {
          ...currentSlide,
          imageStyle: {
            ...normalizeImageStyle(currentSlide.imageStyle),
            brightness: gs.brightness, contrast: gs.contrast, saturate: gs.saturate,
            blur: gs.blur, grayscale: gs.grayscale, sepia: gs.sepia, hueRotate: gs.hueRotate,
            tintColor: gs.tintColor, tintOpacity: gs.tintOpacity, overlayOpacity: gs.overlayOpacity,
          },
        };
        return { ...p, slides: newSlides };
      }),
    }));
  };

  const addMedia = (type, value) => {
    if (!value.trim()) return;
    updateCurrentAccountState((current) => {
      if (type === 'image') return { ...current, images: [...current.images, value] };
      if (type === 'video') return { ...current, videos: [...current.videos, value] };
      if (type === 'audio') return { ...current, audios: [...current.audios, value] };
      return current;
    });
  };

  const removeMedia = (type, index) => {
    updateCurrentAccountState((current) => {
      if (type === 'image') return { ...current, images: current.images.filter((_, i) => i !== index) };
      if (type === 'video') return { ...current, videos: current.videos.filter((_, i) => i !== index) };
      if (type === 'audio') return { ...current, audios: current.audios.filter((_, i) => i !== index) };
      return current;
    });
  };

  // --- DOWNLOAD ZIP ---
  // Cycles through slides, captures each from the live DOM via html-to-image
  // so fonts, text placement, shadows and filters all match the preview exactly.
  const downloadCarousel = async () => {
    if (!activePost || isDownloading) return;
    setIsDownloading(true);
    const originalSlideIndex = currentSlideIndex;
    try {
      const [{ default: JSZip }] = await Promise.all([
        import('jszip'),
      ]);
      const toJpeg = domToJpeg;
      const zip = new JSZip();
      const el = imageViewerRef.current;
      if (!el) throw new Error('Image viewer element not found');
      const pixelRatio = 1080 / el.offsetWidth;

      // Pre-fetch & base64-encode all font files once before the loop
      const fontEmbedCSS = await getEmbedFontCSS();

      // Wait for React to repaint after a slide change
      const waitForRender = () => new Promise(resolve =>
        requestAnimationFrame(() => setTimeout(resolve, 100))
      );

      for (let i = 0; i < activePost.slides.length; i++) {
        setCurrentSlideIndex(i);
        await waitForRender();
        const dataUrl = await toJpeg(el, { pixelRatio, quality: 0.95, cacheBust: true, fontEmbedCSS });
        zip.file(`slide-${String(i + 1).padStart(2, '0')}.jpg`, dataUrl.split(',')[1], { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (activePost.title || activePost.id || 'carousel')
        .replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
      a.download = `${safeName}_slides.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Carousel download failed:', err);
    } finally {
      setCurrentSlideIndex(originalSlideIndex);
      setIsDownloading(false);
    }
  };

  // --- RENDER ---
  const renderAppContent = () => {
    if (view === 'profile') {
      return (
        <ProfileView
          accountUsername={accountUsername}
          accountBrand={accountBrand}
          accountDescription={accountDescription}
          logoImage={logoImage}
          posts={posts}
          gridStyle={gridStyle}
          selectedAccountKey={selectedAccountKey}
          accountSources={accountSources}
          onAccountChange={handleAccountChange}
          onOpenPost={openPost}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      );
    }

    return (
      <PostView
        activePost={activePost}
        currentSlideIndex={currentSlideIndex}
        setCurrentSlideIndex={setCurrentSlideIndex}
        accountUsername={accountUsername}
        logoImage={logoImage}
        selectedAccountKey={selectedAccountKey}
        accountSources={accountSources}
        onAccountChange={handleAccountChange}
        onClosePost={closePost}
        updateSlideImageStyle={updateSlideImageStyle}
        updateSlideTextStyle={updateSlideTextStyle}
        posts={posts}
        onNavigateToPost={navigateToPost}
        imageViewerRef={imageViewerRef}
        textDragRef={textDragRef}
      />
    );
  };

  return (
    <div className="flex w-full h-screen bg-neutral-100 overflow-hidden font-sans">

      {/* LEFT PANEL: Mockup Area */}
      <div className="flex-1 flex flex-col relative border-r border-neutral-200">

        {/* Top bar - title only, no mobile/desktop toggle */}
        <div className="h-14 border-b bg-white flex items-center justify-between px-6 shadow-sm z-10">
          <h2 className="font-semibold text-neutral-800 flex items-center gap-2">
            Instagram Post Pre-visualizer
          </h2>
        </div>

        {/* Device Container - always mobile */}
        <div className="flex-1 overflow-hidden bg-neutral-100 flex items-center justify-center p-6 relative">
          <div className="transition-all duration-500 ease-in-out bg-white shadow-2xl relative flex flex-col w-[375px] h-[812px] rounded-[3rem] border-[10px] border-neutral-900 overflow-hidden ring-4 ring-neutral-200"
          >
            {/* Notch simulation */}
            <div className="absolute top-0 inset-x-0 h-6 bg-transparent z-50 flex justify-center">
              <div className="w-40 h-6 bg-neutral-900 rounded-b-3xl"></div>
            </div>
            {/* Inner Content */}
            <div className="flex-1 h-full w-full overflow-hidden mt-4">
              {renderAppContent()}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Editor Dashboard */}
      <div className="w-[400px] bg-white shadow-[-4px_0_15px_rgba(0,0,0,0.05)] flex flex-col z-20">
        <div className="flex border-b">
          <button
            className={`flex-1 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'editor' ? 'border-blue-500 text-blue-600' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}`}
            onClick={() => setActiveTab('editor')}
          >
            Content Editor
          </button>
          <button
            className={`flex-1 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'media' ? 'border-blue-500 text-blue-600' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}`}
            onClick={() => setActiveTab('media')}
          >
            Media Manager
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'editor' && (
            <EditorPanel
              activePostId={activePostId}
              activePost={activePost}
              currentSlideIndex={currentSlideIndex}
              setCurrentSlideIndex={setCurrentSlideIndex}
              audios={audios}
              images={images}
              videos={videos}
              gridStyle={gridStyle}
              isDownloading={isDownloading}
              updateSlideContent={updateSlideContent}
              updatePostAudio={updatePostAudio}
              updateSlideBackgroundType={updateSlideBackgroundType}
              updateSlideImageStyle={updateSlideImageStyle}
              resetCurrentSlideImageStyle={resetCurrentSlideImageStyle}
              updateSlideTextStyle={updateSlideTextStyle}
              resetCurrentSlideTextStyle={resetCurrentSlideTextStyle}
              updateGridStyle={updateGridStyle}
              resetGridStyle={resetGridStyle}
              applyGridFiltersToSlide={applyGridFiltersToSlide}
              downloadCarousel={downloadCarousel}
            />
          )}

          {activeTab === 'media' && (
            <MediaManager
              images={images}
              videos={videos}
              audios={audios}
              addMedia={addMedia}
              removeMedia={removeMedia}
            />
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #d4d4d4; border-radius: 10px; }
      `}} />
    </div>
  );
}
