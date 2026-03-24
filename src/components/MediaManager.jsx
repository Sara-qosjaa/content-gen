import React from 'react';
import {
  Image as ImageIcon, Play, Music, Plus, Trash2
} from 'lucide-react';

export default function MediaManager({ images, videos, audios, addMedia, removeMedia }) {
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMedia('image', e.target.elements.newImage.value);
            e.target.reset();
          }}
          className="flex gap-2"
        >
          <input name="newImage" type="text" placeholder="Paste image URL or path..." className="flex-1 p-2 border rounded-lg text-sm outline-none focus:border-blue-500" />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"><Plus size={20}/></button>
        </form>
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMedia('video', e.target.elements.newVideo.value);
            e.target.reset();
          }}
          className="flex gap-2"
        >
          <input name="newVideo" type="text" placeholder="Paste video URL or path..." className="flex-1 p-2 border rounded-lg text-sm outline-none focus:border-emerald-500" />
          <button type="submit" className="bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600"><Plus size={20}/></button>
        </form>
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
