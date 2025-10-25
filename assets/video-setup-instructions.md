# Video Setup Instructions

## 📹 Adding Your Custom Demo Video

To replace the YouTube video with your own recorded demo video, follow these steps:

### 1. Video File Requirements

**Recommended Specifications:**
- **Format**: MP4 (H.264 codec) - best browser compatibility
- **Resolution**: 1920x1080 (Full HD) or 1280x720 (HD)
- **Duration**: 2-5 minutes (optimal for demo)
- **File Size**: Under 50MB for fast loading
- **Aspect Ratio**: 16:9 (widescreen)

### 2. Video Content Suggestions

**What to Show in Your Demo:**
1. **Upload Process** (30 seconds)
   - Drag & drop an invoice file
   - Show file preview
   - Explain supported formats

2. **Processing** (60 seconds)
   - Show the AI processing steps
   - Highlight the progress indicators
   - Explain what's happening behind the scenes

3. **Data Extraction** (90 seconds)
   - Show the extracted data fields
   - Demonstrate editing capabilities
   - Highlight accuracy and smart parsing

4. **Excel Export** (30 seconds)
   - Show the Excel file generation
   - Open the exported file
   - Highlight the professional formatting

### 3. File Placement

Place your video files in the `assets/` folder:

```
assets/
├── invoiceiq-demo.mp4          # Main video file (required)
├── invoiceiq-demo.webm         # WebM version (optional, for better compression)
└── demo-poster.jpg             # Video thumbnail (optional)
```

### 4. Video Optimization

**For Best Performance:**

1. **Compress the video:**
   ```bash
   # Using FFmpeg (recommended)
   ffmpeg -i your-video.mp4 -c:v libx264 -crf 23 -c:a aac -b:a 128k invoiceiq-demo.mp4
   
   # Create WebM version for better compression
   ffmpeg -i your-video.mp4 -c:v libvpx-vp9 -crf 30 -c:a libopus invoiceiq-demo.webm
   ```

2. **Create a poster image:**
   ```bash
   # Extract thumbnail from video
   ffmpeg -i your-video.mp4 -ss 00:00:05 -vframes 1 -q:v 2 demo-poster.jpg
   ```

### 5. Video Hosting Alternatives

If you prefer to host the video externally:

**Option A: GitHub (Free)**
- Upload to your repository
- Use direct GitHub links
- No bandwidth limits

**Option B: Cloud Storage**
- Google Drive, Dropbox, OneDrive
- Use public sharing links
- Update the video source in HTML

**Option C: Video Platforms**
- YouTube (unlisted)
- Vimeo (free tier)
- Update iframe source

### 6. HTML Updates

The demo section now supports:
- **Multiple formats** (MP4, WebM)
- **Fallback options** for unsupported browsers
- **Download option** for users who can't stream
- **Responsive design** for all screen sizes

### 7. Testing Your Video

**Check these items:**
- ✅ Video plays on desktop browsers
- ✅ Video plays on mobile devices
- ✅ Loading time is reasonable (< 10 seconds)
- ✅ Audio is clear and audible
- ✅ Video quality is professional
- ✅ Download link works

### 8. Performance Tips

**Optimize for web:**
- Keep file size under 50MB
- Use H.264 codec for maximum compatibility
- Consider creating multiple quality versions
- Add loading states for better UX

### 9. Accessibility

**Make your video accessible:**
- Add captions/subtitles if possible
- Ensure good audio quality
- Use clear, visible text in the video
- Consider screen reader users

### 10. Analytics (Optional)

**Track video engagement:**
```javascript
// Add to your video element
<video onplay="trackEvent('video_play')" 
       onpause="trackEvent('video_pause')"
       onended="trackEvent('video_complete')">
```

## 🎬 Recording Tips

**For Professional Results:**
1. **Use screen recording software** (OBS, Loom, Screencastify)
2. **Record in high resolution** (1080p minimum)
3. **Speak clearly and slowly**
4. **Show the actual interface** (not just slides)
5. **Keep it concise** (2-5 minutes max)
6. **Add captions** for better accessibility

## 📱 Mobile Considerations

**Ensure mobile compatibility:**
- Test on different screen sizes
- Consider touch interactions
- Optimize for slower connections
- Provide download option for mobile users

Your custom video will make the demo much more personal and engaging than a generic YouTube video! 🎉
