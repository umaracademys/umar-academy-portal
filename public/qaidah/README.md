# Qaidah Images

Place your Qaidah page images in this directory.

## File Naming Convention

- Images should be named as: `1.png`, `2.png`, `3.png`, etc. (or `.jpg`/`.jpeg`)
- The viewer will automatically detect the total number of pages
- Supports both PNG and JPG formats

## Example Structure

```
public/qaidah/
  ├── 1.png
  ├── 2.png
  ├── 3.png
  └── ...
```

## Usage

Once images are placed here, access the Qaidah viewer at:
- `/qaidah` - Redirects to page 1
- `/qaidah/1` - View page 1
- `/qaidah/5` - View page 5
- etc.

## Features

- Zoom in/out (mouse wheel with Ctrl/Cmd, or buttons)
- Pinch-to-zoom on mobile
- Keyboard navigation (← → arrows)
- Page preloading for smooth navigation
- Drag to pan when zoomed in
