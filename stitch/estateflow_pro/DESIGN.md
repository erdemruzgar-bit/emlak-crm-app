# Design System Document: High-End Real Estate Editorial

## 1. Overview & Creative North Star
**Creative North Star: The Architectural Curator**

This design system moves beyond the utility of a standard CRM to create a "Gallery" experience. It treats real estate data not as rows in a database, but as entries in a high-end architectural digest. 

To achieve this, the system breaks away from the rigid, boxed-in structures of traditional SaaS. We utilize **Intentional Asymmetry** and **Tonal Depth** to guide the user’s eye. By leaning into wide margins, generous white space (using our `24` and `20` spacing tokens), and overlapping "Glass" surfaces, the interface feels like an expansive, premium environment rather than a cramped administrative tool.

---

## 2. Colors
Our palette is rooted in a sophisticated "Cool Slate" foundation, punctuated by a high-energy "Electric Cobalt" for primary actions.

### Surface Hierarchy & Nesting (The "No-Line" Rule)
In this system, **1px solid borders are prohibited for sectioning.** We define boundaries through background color shifts and tonal layering.
- **The Base:** All views sit on `surface` (#f7f9fb).
- **The Navigation & Filters:** Sidebar elements use `surface_container_low` (#f2f4f6) to create a subtle recessed feel.
- **The Content Cards:** Properties and interactive elements sit on `surface_container_lowest` (#ffffff).
- **The Detail Sidebar:** Uses `surface_container_high` (#e6e8ea) to command attention and provide a tactile "closer" feel.

### The "Glass & Gradient" Rule
To add a signature polish, use **Glassmorphism** for floating elements like map tooltips or hovering price tags. Use `surface_container_lowest` with a 70% opacity and a `backdrop-blur` of 12px. 
*   **Signature Textures:** Primary CTAs should not be flat. Apply a subtle linear gradient from `primary` (#0051d5) to `primary_container` (#316bf3) at a 135-degree angle to provide a "lit from within" professional sheen.

---

## 3. Typography
We utilize **Inter** as our sole typeface, relying on extreme weight and scale contrast rather than multiple font families to achieve an editorial look.

- **Display & Headlines:** Use `display-md` for property titles in hero sections. The tight tracking and large scale convey authority.
- **Titles:** `title-lg` and `title-md` serve as the primary anchors for card information, providing a clear entry point for the eye.
- **Body & Labels:** Use `body-md` for descriptions. All metadata (sq ft, bed/bath) must use `label-md` or `label-sm` in `on_surface_variant` (#424754) to maintain a clean, secondary visual rank.
- **The Editorial Hook:** Large `headline-sm` headers should be used for filter categories, paired with ample `spacing-8` padding to ensure the UI "breathes."

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than traditional structural shadows.

- **The Layering Principle:** Instead of shadows, stack containers. A `surface_container_lowest` card placed on a `surface_container_low` background creates a natural, soft lift.
- **Ambient Shadows:** When a floating element (like a "Contact Agent" button) requires a shadow, use a diffuse, low-opacity effect: `box-shadow: 0 12px 32px rgba(25, 28, 30, 0.06)`. The color is derived from `on_surface` to look like natural light.
- **The Ghost Border Fallback:** If accessibility requires a stroke (e.g., in high-contrast modes), use a "Ghost Border": `outline_variant` (#c2c6d6) at 15% opacity. Never use 100% opaque borders.

---

## 5. Components

### Buttons & Inputs
- **Primary Action:** Large `rounded-xl` buttons using the signature cobalt gradient. Height: `spacing-12`.
- **Secondary/Filter Chips:** Use `secondary_container` (#d0e1fb) with `on_secondary_container` text. Corners should be `rounded-full` for a soft, approachable feel.
- **Input Fields:** Use `surface_container_low` backgrounds. No borders. On focus, transition the background to `surface_container_lowest` and apply a `primary` ghost border (20% opacity).

### Cards & Property Displays
- **Forbid Divider Lines:** Separate property images from text using vertical white space (`spacing-4`). 
- **The "Overlay" Badge:** Use `surface_container_lowest` with 80% opacity for "Home" or "Apartment" status badges, placed in the top-left of the image with a `rounded-md` corner.
- **Image Treatment:** All property images must use `rounded-lg` or `rounded-xl` to match the global radius scale.

### Property Sidebar (Detailed View)
- This component should feel like a "sheet" sliding over the map. Use `surface_container_highest` (#e0e3e5) for the background to provide the highest contrast against the main content area.
- Group attributes (6 Rooms, 4 Beds) in `surface_container_low` chips to keep the information dense but readable.

---

## 6. Do's and Don'ts

### Do:
- **Do** use `spacing-16` or `spacing-20` for page margins. Luxury is defined by the space you *don't* use.
- **Do** use `rounded-xl` (1.5rem) for main cards and the sidebar navigation to create a modern, friendly aesthetic.
- **Do** utilize `tertiary` (#924700) sparingly for "Hot Deals" or "Trending" alerts to provide a warm counterpoint to the blue primary color.

### Don't:
- **Don't** use 1px grey lines to separate list items. Use a `surface-variant` background shift or simply white space.
- **Don't** use pure black (#000000) for text. Use `on_surface` (#191c1e) to keep the contrast high but the "ink" soft.
- **Don't** use sharp corners. Every element, including image thumbnails and input fields, must adhere to the `rounded-md` to `rounded-xl` scale.