import React, { useRef, useState } from 'react';
import {
  Image as ImageIcon, Play, Music, Plus, Trash2, Loader2
} from 'lucide-react';

function UploadButton({ accept, color, onUpload }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await onUpload(file.name, base64);
    } catch (err) {
      console.error('[MediaManager] Upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`${color} text-white p-2 rounded-lg disabled:opacity-60 flex items-center justify-center`}
      >
        {uploading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
      </button>
    </>
  );
}

export default function MediaManager({ images, videos, audios, addMedia, removeMedia, accountKey }) {
  const upload = async (type, filename, base64) => {
    const resp = await fetch('/api/upload-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountKey, type, filename, data: base64 }),
    });
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error);
    addMedia(type, json.path);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">

      {/* Images Manager */}
      <section>
        <h3 className="font-bold flex items-center gap-2 mb-4 text-neutral-800 border-b pb-2">
          <ImageIcon size={20} className="text-blue-500" /> Image Repository
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {images.map((img, i) => (
            <div key={i} className="group relative aspect-square rounded-lg overflow-hidden border">
              <img src={img} alt={`img-${i}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removeMedia('image', i)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove Image"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <UploadButton accept="image/*" color="bg-blue-500 hover:bg-blue-600" onUpload={(name, data) => upload('image', name, data)} />
        </div>
      </section>

      {/* Video Manager */}
      <section>
        <h3 className="font-bold flex items-center gap-2 mb-4 text-neutral-800 border-b pb-2">
          <Play size={20} className="text-emerald-500" /> Video Library
        </h3>
        <div className="space-y-3 mb-4">
          {videos.map((vid, i) => (
            <div key={i} className="border rounded-lg overflow-hidden bg-neutral-50 group">
              <div className="aspect-video bg-black">
                <video src={vid} className="w-full h-full object-cover" muted autoPlay loop playsInline />
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="text-xs font-medium truncate pr-2">{vid}</span>
                <button
                  onClick={() => removeMedia('video', i)}
                  className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                  title="Remove Video"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <UploadButton accept="video/*" color="bg-emerald-500 hover:bg-emerald-600" onUpload={(name, data) => upload('video', name, data)} />
        </div>
      </section>

      {/* Audio Manager */}
      <section>
        <h3 className="font-bold flex items-center gap-2 mb-4 text-neutral-800 border-b pb-2">
          <Music size={20} className="text-purple-500" /> Audio Library
        </h3>
        <div className="space-y-2 mb-4">
          {audios.map((aud, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-neutral-50 group">
              <span className="text-sm font-medium truncate flex-1">{aud}</span>
              <button
                onClick={() => removeMedia('audio', i)}
                className="text-neutral-400 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMedia('audio', e.target.elements.newAudio.value);
            e.target.reset();
          }}
          className="flex gap-2"
        >
          <input name="newAudio" type="text" placeholder="Enter audio name or URL..." className="flex-1 p-2 border rounded-lg text-sm outline-none focus:border-purple-500" />
          <button type="submit" className="bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600"><Plus size={20}/></button>
        </form>
      </section>

    </div>
  );
}
