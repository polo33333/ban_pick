# Assets Directory

Thư mục chứa tất cả static assets của ứng dụng.

## 📁 Structure

```
assets/
├── app.ico              # Application icon
├── background.webp      # Main background image
├── vs.png              # VS logo
│
├── backgrounds/         # Character splash art backgrounds (45 files)
│   ├── Jiyan.webp
│   ├── Yinlin.webp
│   └── ...
│
├── elements/            # Element icons (6 files)
│   ├── 1.png           # Glacio
│   ├── 2.png           # Fusion
│   ├── 3.png           # Electro
│   ├── 4.png           # Aero
│   ├── 5.png           # Spectro
│   └── 6.png           # Havoc
│
├── icons/               # Character icons (45 files)
│   ├── Jiyan.webp
│   ├── Yinlin.webp
│   └── ...
│
└── live2d/              # Live2D/Spine animation files (75 files)
    ├── Jiyan/
    │   ├── Jiyan.skel
    │   ├── Jiyan.atlas
    │   └── Jiyan.png
    └── ...
```

---

## 🔗 URL Paths

### New Paths (Recommended)
```
/assets/backgrounds/Jiyan.webp
/assets/icons/Jiyan.webp
/assets/elements/1.png
/assets/live2d/Jiyan/Jiyan.skel
```

### Legacy Paths (Backward Compatible)
```
/background/Jiyan.webp  → serves from /assets/backgrounds/
/icon/Jiyan.webp        → serves from /assets/icons/
/element/1.png          → serves from /assets/elements/
/live2d/Jiyan/...       → serves from /assets/live2d/
```

**Note:** Legacy paths vẫn hoạt động nhờ server.js routing, nhưng nên dùng new paths cho code mới.

---

## 📊 Asset Types

### Backgrounds (45 files)
- **Format:** WebP
- **Purpose:** Character splash art backgrounds
- **Usage:** Displayed when character is selected

### Icons (45 files)
- **Format:** WebP
- **Purpose:** Character icons for grid display
- **Usage:** Champion selection grid

### Elements (6 files)
- **Format:** PNG
- **Purpose:** Element type icons
- **Mapping:**
  - `1.png` - Glacio (Ice)
  - `2.png` - Fusion (Fire)
  - `3.png` - Electro (Lightning)
  - `4.png` - Aero (Wind)
  - `5.png` - Spectro (Light)
  - `6.png` - Havoc (Dark)

### Live2D (75 files)
- **Format:** Spine WebGL files (.skel, .atlas, .png)
- **Purpose:** Character animations
- **Usage:** Animated character display for 5-star characters

---

## 🚀 Usage

### In HTML
```html
<!-- Background -->
<img src="/assets/backgrounds/Jiyan.webp" alt="Jiyan">

<!-- Icon -->
<img src="/assets/icons/Jiyan.webp" alt="Jiyan">

<!-- Element -->
<img src="/assets/elements/1.png" alt="Glacio">
```

### In JavaScript
```javascript
// Using character data
const char = state.characters['Jiyan'];
console.log(char.icon);       // "/icon/Jiyan.webp"
console.log(char.splash);     // "/background/Jiyan.webp"

// Element icon
const elementIcon = `/assets/elements/${char.element}.png`;
```

### In CSS
```css
.background {
  background-image: url('/assets/background.webp');
}

.character-splash {
  background-image: url('/assets/backgrounds/Jiyan.webp');
}
```

---

## 📝 File Naming Conventions

- **Characters:** Use exact character name (e.g., `Jiyan.webp`, `Xiangli Yao.webp`)
- **Elements:** Use element ID number (e.g., `1.png`, `2.png`)
- **Lowercase:** Folder names are lowercase
- **Spaces:** Character names with spaces keep spaces in filename

---

## 🔧 Server Configuration

Server.js serves assets with:
- **Direct access:** `/assets/*` serves from `public/assets/`
- **Legacy routes:** `/icon/*`, `/background/*`, etc. redirect to new paths
- **No compression:** Images served without compression for performance
- **Static caching:** Express.static handles caching headers

---

## 📦 Adding New Assets

### New Character
1. Add icon: `assets/icons/CharacterName.webp`
2. Add background: `assets/backgrounds/CharacterName.webp`
3. Add Live2D (if 5-star): `assets/live2d/CharacterName/`
4. Update `character_local.json` with paths

### New Element
1. Add icon: `assets/elements/7.png` (next ID)
2. Update `constants.js` with element mapping

---

## 🎯 Best Practices

1. **Use WebP:** For all character images (smaller size, better quality)
2. **Optimize:** Compress images before adding
3. **Naming:** Keep exact character names for consistency
4. **Organization:** Keep related files together
5. **Lazy Loading:** Use lazy loading for better performance

---

## 📏 Image Specifications

### Icons
- **Size:** 256x256px recommended
- **Format:** WebP
- **Quality:** 80-90%

### Backgrounds
- **Size:** 1920x1080px recommended
- **Format:** WebP
- **Quality:** 85-95%

### Elements
- **Size:** 64x64px or 128x128px
- **Format:** PNG (for transparency)

---

## 🔄 Migration Notes

**Previous Structure:**
```
public/
├── icon/
├── background/
├── element/
└── live2d/
```

**New Structure:**
```
public/assets/
├── icons/
├── backgrounds/
├── elements/
└── live2d/
```

**Backward Compatibility:**
- All old URLs still work
- Server.js redirects to new paths
- No code changes needed for existing references
- Gradual migration recommended
