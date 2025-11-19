# 🎨 Design System - Umar Academy Portal

## Color Palette

### Primary Colors
- **Primary Green:** `#1F3224` (Dark green)
- **Accent Gold:** `#E7AA39` (Gold/Amber)
- **Background:** `#F5F7F2` (Light green-gray)
- **Surface:** `#FFFFFF` (White)

### Color Usage
- **Primary:** Main actions, headers, important text
- **Accent:** Highlights, borders, secondary actions
- **Soft Primary:** Backgrounds, cards, subtle elements
- **Soft Accent:** Accent backgrounds, highlights

---

## Button Styles

### Primary Button
```tsx
className="px-6 py-3 bg-primary text-white rounded-xl font-extrabold shadow-lg hover:shadow-xl transition-all border-2 border-primary"
```

### Accent Button
```tsx
className="px-6 py-3 bg-accent text-primary rounded-xl font-extrabold shadow-lg hover:shadow-xl transition-all border-2 border-accent"
```

### Secondary Button
```tsx
className="px-6 py-3 bg-soft-primary text-primary rounded-xl font-extrabold shadow-lg hover:shadow-xl transition-all border-2 border-primary/30"
```

### Outline Button
```tsx
className="px-6 py-3 bg-transparent text-primary rounded-xl font-extrabold shadow-lg hover:bg-soft-primary transition-all border-2 border-primary"
```

---

## Mobile Responsiveness

### Breakpoints
- **xs:** 475px
- **sm:** 640px
- **md:** 768px
- **lg:** 1024px
- **xl:** 1280px

### Mobile Patterns
- Stack columns on mobile: `flex-col sm:flex-row`
- Full width on mobile: `w-full sm:w-auto`
- Smaller padding: `p-4 sm:p-6`
- Hide on mobile: `hidden sm:block`
- Show on mobile only: `block sm:hidden`

---

## Mushaf RTL Support

The Mushaf (Quran text) displays **right-to-left (RTL)** as Arabic text should.

### Implementation
- Main container: `dir="rtl"`
- Arabic text: `direction: rtl; text-align: right;`
- Controls: `dir="ltr"` (for English controls)

---

## Typography

### Fonts
- **Body:** System fonts (San Francisco, Segoe UI, etc.)
- **Arabic/Mushaf:** Amiri, Scheherazade New
- **Surah Names:** QPC V2 Font

### Font Weights
- **Normal:** 400
- **Semibold:** 600
- **Bold:** 700
- **Extrabold:** 800

---

## Spacing

### Padding
- **Small:** `p-2` (0.5rem)
- **Medium:** `p-4` (1rem)
- **Large:** `p-6` (1.5rem)
- **XL:** `p-8` (2rem)

### Margins
- **Small:** `m-2` (0.5rem)
- **Medium:** `m-4` (1rem)
- **Large:** `m-6` (1.5rem)

---

## Borders & Shadows

### Borders
- **Primary:** `border-2 border-primary`
- **Accent:** `border-2 border-accent`
- **Soft:** `border-2 border-primary/30`

### Shadows
- **Small:** `shadow-md`
- **Medium:** `shadow-lg`
- **Large:** `shadow-xl`
- **Hover:** `hover:shadow-xl`

---

## Cards

### Standard Card
```tsx
<div className="bg-white rounded-xl shadow-lg border-2 border-primary/30 p-6">
```

### Soft Card
```tsx
<div className="bg-soft-primary rounded-xl shadow-md border-2 border-primary/20 p-6">
```

---

## Forms

### Input Fields
```tsx
<input className="w-full px-4 py-3 border-2 border-primary/30 rounded-xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm font-medium" />
```

### Labels
```tsx
<label className="block text-sm font-extrabold text-primary mb-2">
```

---

## Mobile Touch Targets

All interactive elements should be at least **44x44px** for mobile:
- Buttons: `min-h-[44px] min-w-[44px]`
- Links: `min-h-[44px]`

---

## Animation & Transitions

### Standard Transition
```css
transition-all duration-200
```

### Hover Effects
- Scale: `hover:scale-105`
- Shadow: `hover:shadow-xl`
- Background: `hover:bg-primary/90`

---

## Accessibility

- **Focus States:** `focus:ring-2 focus:ring-primary`
- **Disabled States:** `disabled:opacity-50 disabled:cursor-not-allowed`
- **ARIA Labels:** Always include for icons/buttons

---

## Component Library

### Button Component
Use the `Button` component from `src/components/Button.tsx` for consistency:

```tsx
import Button from '../components/Button';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>
```

---

## RTL (Right-to-Left) Support

### Mushaf Components
- Main container: `dir="rtl"`
- Arabic text: Always RTL
- Controls/UI: `dir="ltr"` for English

### Implementation
```tsx
<div dir="rtl" className="mushaf-container">
  {/* Arabic text flows right-to-left */}
</div>
<div dir="ltr" className="controls">
  {/* English controls flow left-to-right */}
</div>
```

---

**All components should follow this design system for consistency!**

