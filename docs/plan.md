# plan.md

## Goal

Turn the current React mockup into a production-ready **Instagram carousel content system** for AstroLuna that can:

- manage a full 90-day content calendar
- edit carousel slides and metadata
- persist changes
- export content to Notion / JSON / publishing pipelines
- support ad-planning metadata
- scale beyond hardcoded posts

---

## Current State Summary

What the app already does well:

- previews Instagram-style profile and carousel views
- supports basic drag-and-drop reordering of posts
- lets you edit slide text and background image
- lets you assign audio labels
- has a simple media manager
- works as a good visual prototype

What it is missing:

- real persistence
- scalable content model
- export/import pipeline
- proper CRUD for posts/slides
- ad settings and campaign workflow
- schedule/status workflow
- validation and error handling
- 90-day content dataset support

---

## Highest Priority Improvements

### 1. Add persistence

### Why
Right now all edits are lost on refresh.

### Improve
- save `posts`, `images`, `audios`, and UI preferences in `localStorage`
- later support optional backend sync (Supabase / Firebase)

### Tasks
- hydrate state from storage on app load
- persist state on every meaningful update
- version stored schema to support future migrations

### Outcome
The editor becomes actually usable day to day.

---

### 2. Replace hardcoded content with imported data

### Why
Hardcoding posts in the component does not scale.

### Improve
- move content to external `content.json`
- import and normalize it on load
- support future import of markdown / CSV / generated content

### Tasks
- move `contentCalendar` into structured JSON
- add runtime validation for required fields
- map imported content into UI state

### Outcome
You can manage 90+ posts cleanly and generate/update them outside the component.

---

### 3. Expand the post data model

### Why
A real publishing workflow needs more than title + slides + audio.

### Improve
Add fields such as:
- `day`
- `theme`
- `subtitle`
- `caption`
- `hashtags`
- `cta_keyword`
- `status`
- `publish_date`
- `ad_settings`
- `cover_image`
- `notes`

### Recommended model
```json
{
  "id": "post-1",
  "day": 1,
  "title": "What is Reverse-ology?",
  "subtitle": "Why life sometimes moves backward before breakthroughs",
  "theme": "cycles",
  "caption": "....",
  "hashtags": ["#AstroLuna"],
  "status": "draft",
  "publish_date": null,
  "audio": "Deep Healing Solfeggio.mp3",
  "slides": [
    {
      "id": "post-1-slide-1",
      "type": "hook",
      "text": "What is Reverse-ology?",
      "image": "/images/bg-desert-milkyway.jpg"
    }
  ],
  "ad_settings": {
    "boost_day_1": true,
    "budget_usd": 20,
    "objective": "engagement"
  }
}
```

### Outcome
The content becomes publishable, not just previewable.

---

### 4. Add full CRUD for posts

### Why
You can reorder and edit, but not fully manage posts.

### Improve
Support:
- create post
- duplicate post
- delete post
- edit post title/subtitle
- reorder posts
- archive or mark complete

### Tasks
- add post-level action menu
- add duplicate button
- add delete confirmation
- add empty post template

### Outcome
The editor becomes a real content management tool.

---

### 5. Add full CRUD for slides

### Why
Slides are fixed and cannot be structurally managed.

### Improve
Support:
- add slide
- delete slide
- duplicate slide
- reorder slides
- assign slide type

### Tasks
- create slide toolbar
- support drag-and-drop slide ordering
- prevent accidental deletion of required slides
- allow template presets by slide type

### Outcome
You can adapt each carousel instead of only editing text.

---

## Medium Priority Improvements

### 6. Add slide types and design templates

### Why
Not every slide should render the same.

### Improve
Support different rendering presets for:
- hook
- mystery
- insight
- quote
- reflection
- CTA

### Add controls
- text alignment
- text size
- max width
- overlay opacity
- footer on/off
- watermark on/off
- quote styling
- line separators on/off

### Outcome
Carousel designs become more polished and reusable.

---

### 7. Add image and audio validation

### Why
The app currently accepts any string as media.

### Improve
- validate image URL/path before saving
- show missing asset fallback
- mark broken media clearly
- prevent deletion of assets still in use

### Tasks
- `onError` fallback image
- track media usage count
- disable remove button for in-use assets or offer replacement flow

### Outcome
Fewer broken previews and better reliability.

---

### 8. Add caption / hashtag / CTA editor

### Why
The post asset is more than the slides.

### Improve
Editable fields for:
- caption
- hashtags
- CTA text
- first comment
- notes
- hook category

### Outcome
The system can support actual publishing workflows.

---

### 9. Add publishing workflow fields

### Why
Content ops need state and scheduling.

### Improve
Add:
- `status`: draft / ready / scheduled / published
- `publish_date`
- `platforms`
- `approved_by`
- `last_edited_at`

### Outcome
The app becomes useful for managing a content pipeline.

---

### 10. Add ad planning fields

### Why
Your strategy includes boosting organic winners.

### Improve
Per-post ad settings:
- boost on day 1
- budget
- campaign objective
- audience
- age range
- gender
- interests
- countries
- notes

### Outcome
Organic + paid strategy stays attached to each post.

---

## Technical Code Improvements

### 11. Fix `activePost` crash risk

### Problem
This line can crash if `activePost` is undefined:

```js
const slide = activePost.slides[currentSlideIndex];
```

### Fix
Guard before rendering:

```js
if (!activePost) {
  return <div className="p-6">No active post selected.</div>;
}
```

### Outcome
Safer rendering.

---

### 12. Use functional state updates

### Problem
Patterns like this can create stale state issues:

```js
setPosts(posts.map(...))
```

### Fix
Use:

```js
setPosts(prev => prev.map(...))
```

Also update:
- `setImages([...images, value])`
- `setAudios([...audios, value])`

to functional forms.

### Outcome
More reliable updates during rapid edits.

---

### 13. Reset drag state correctly

### Problem
`draggedIdx` may remain set if drag is canceled.

### Fix
Add:
- `onDragEnd={() => setDraggedIdx(null)}`
- optional visual drag state styling

### Outcome
Cleaner drag-and-drop behavior.

---

### 14. Remove unused imports

### Unused currently
- `useEffect`
- `GripVertical`

### Outcome
Cleaner code and fewer lint warnings.

---

### 15. Avoid direct asset assumptions

### Problem
These assume a certain bundler/static path setup:
- `input_file_0.png`
- `/images/...`

### Improve
- import assets properly when bundled
- or store asset paths in public directory with validation
- or use uploaded assets with object URLs

### Outcome
More reliable deployment behavior.

---

## UX Improvements

### 16. Add mobile swipe support

### Why
Carousel preview should feel like a real mobile post.

### Improve
- swipe left/right for slide navigation
- keyboard arrows on desktop

### Outcome
Closer to actual Instagram behavior.

---

### 17. Add search, filters, and theme grouping

### Why
90 posts become hard to manage in one grid.

### Improve
Filter by:
- theme
- status
- date
- boosted/not boosted

### Outcome
Much easier navigation.

---

### 18. Add bulk actions

### Useful for scale
- assign same audio to multiple posts
- duplicate post structure
- bulk update hashtags
- bulk update boost settings

### Outcome
Faster content ops.

---

### 19. Add autosave and unsaved-change indicators

### Improve
- autosave timestamp
- dirty state indicator
- restore last edited post on reload

### Outcome
Better editing experience.

---

### 20. Add export/import pipeline

### Export targets
- `content.json`
- `plan.md`
- Notion markdown
- CSV content calendar
- per-post JSON

### Outcome
The tool becomes interoperable with your wider MicroAI workflow.

---

## Suggested File Structure

```text
src/
  components/
    InstagramShell.jsx
    ProfileView.jsx
    PostView.jsx
    EditorPanel.jsx
    MediaManager.jsx
    SlideEditor.jsx
    PostList.jsx
  data/
    content.json
    media.json
  hooks/
    useLocalStorageState.js
  utils/
    contentValidation.js
    exportHelpers.js
    mediaHelpers.js
  styles/
    app.css
  App.jsx
```

---

## Recommended Implementation Order

### Phase 1 — Make it usable
1. move data to `content.json`
2. add localStorage persistence
3. add `activePost` guard
4. switch to functional state updates
5. remove unused imports

### Phase 2 — Make it scalable
6. add post CRUD
7. add slide CRUD
8. add caption/hashtag/CTA fields
9. add status + publish metadata
10. add search/filtering

### Phase 3 — Make it production-ready
11. add ad settings
12. add media validation
13. add export/import pipeline
14. add slide type templates
15. add swipe support and polish

---

## Recommended New Features for Your AstroLuna Workflow

### Content Ops
- 90-day calendar view
- theme tagging
- caption generator field
- “best hook” tracker
- save/share prediction rating

### Paid Growth
- mark posts for boost testing
- attach target audience metadata
- track ad budget per post
- separate organic and paid winners

### Repurposing
- duplicate carousel into story sequence
- export short caption summary
- export talking points for future reels

---

## Success Criteria

The upgrade is successful when you can:

- load all 90 posts from JSON
- edit them without losing work on refresh
- manage posts/slides as reusable content assets
- track captions, hashtags, and ad settings
- export the calendar cleanly
- use the app as a real publishing tool, not just a mockup

---

## Final Summary

Right now the app is a **strong prototype**.

With the changes above, it can become a real **AstroLuna carousel content operating system**.
