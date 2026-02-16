# ValuQuick UX Audit — Production Readiness Review

> **Target Persona**: Rajesh, 48, government-registered property valuer in Tier-2 India. Uses WhatsApp and YouTube daily on a Redmi Note (6.4" screen, Android). Types slowly, prefers Hindi but knows valuation terminology in English. Gets frustrated when apps "do things without telling him." Has reading glasses but often doesn't wear them while on-site.

> **Audit Framework**: Nielsen's 10 Heuristics, Fitts's Law, Hick's Law, Cognitive Load Theory, and mobile-first accessibility (WCAG AA).

---

## Table of Contents

1. [Onboarding Flow](#1-onboarding-flow)
2. [Dashboard](#2-dashboard)
3. [Form Editor — Navigation](#3-form-editor--navigation)
4. [Form Editor — Field Interactions](#4-form-editor--field-interactions)
5. [Form Editor — Swipe-to-Hide](#5-form-editor--swipe-to-hide)
6. [Photo Upload](#6-photo-upload)
7. [Report Preview & Editor](#7-report-preview--editor)
8. [PDF Export & Download](#8-pdf-export--download)
9. [Offline & Saving Experience](#9-offline--saving-experience)
10. [Language Toggle (i18n)](#10-language-toggle-i18n)
11. [Referral System](#11-referral-system)
12. [Subscription & Pricing](#12-subscription--pricing)
13. [Team Management](#13-team-management)
14. [Branding Settings](#14-branding-settings)
15. [Typography & Readability](#15-typography--readability)
16. [Touch Targets & Motor Accessibility](#16-touch-targets--motor-accessibility)
17. [Error Handling & Recovery](#17-error-handling--recovery)
18. [Cross-Device Summary](#18-cross-device-summary)

---

## 1. Onboarding Flow

### Current State
- User lands on choice screen: "Create a new firm" vs "Join an existing firm."
- Create flow: firm name → referral code (optional) → template selection → done.
- No walkthrough of what ValuQuick does or how reports work.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 1.1 | **No explanation of what "firm" means** — Rajesh thinks "firm" is a company. He's a solo valuer. He doesn't know if he should create one or wait for an invite. | High | H2 (Match real world) |
| 1.2 | **Referral code is shown before value is proven** — asking for a referral code during signup creates friction. Rajesh hasn't used the app yet; he doesn't know anyone who has. | Medium | H8 (Aesthetic & minimalist) |
| 1.3 | **Template selection has no context** — user picks a visual template but doesn't know how it affects their report. No sample PDF shown. | Medium | H1 (Visibility of system status) |
| 1.4 | **"Skip for now (use Classic)" is a grey text link** — easily missed on mobile. If Rajesh doesn't understand templates, he may stare at the screen. | Medium | H6 (Recognition over recall) |
| 1.5 | **No progress indicator** — 3-step flow (name → template → done) has no step counter. User doesn't know how much is left. | Low | H1 (Visibility) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 1.1 | Rename "Create a new firm" to **"Start as Individual / Solo Valuer"** and keep "Create a firm" as a subtitle. Add a one-liner: "You can add team members later." | Low |
| 1.2 | Move referral code to **Settings or Dashboard** — not the signup flow. One less decision during onboarding. | Medium |
| 1.3 | Show a **mini preview image** of what the final PDF looks like for each template. Even a static screenshot helps. | Medium |
| 1.4 | Make "Skip" a **full-width secondary button** below "Create Firm" instead of a text link. | Low |
| 1.5 | Add a **step indicator** (dots or "Step 1 of 2") at the top of each onboarding screen. | Low |

---

## 2. Dashboard

### Current State
- Shows analytics cards (total, in-progress, completed), report list, tabs, "New Report" button.
- Welcome tour for first-time users.
- Trial banner shows remaining reports.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 2.1 | **"New Report" button is at the top-right** — on mobile, this is the hardest area to reach one-handed (Fitts's Law). The primary action should be at thumb-reach. | High | Fitts's Law |
| 2.2 | **Analytics cards show before the user has any reports** — "Total: 0, In Progress: 0, Completed: 0" adds no value and looks broken. | Medium | H8 (Minimalist design) |
| 2.3 | **Welcome tour has 3 action buttons** but clicking them doesn't navigate anywhere — they're informational cards that look like CTAs. | Medium | H4 (Consistency) |
| 2.4 | **Report cards show "completionPercentage" as a progress bar** but the percentage is always 0 (metadata field is never computed). | High | H1 (Visibility) — shows misleading info |
| 2.5 | **Delete confirmation is inline** (replaces the delete button with confirm/cancel) — on a small phone, tapping the wrong button is easy. | Medium | H5 (Error prevention) |
| 2.6 | **Too many icon-only buttons on each report card** (duplicate, delete, mark complete, download) — Rajesh doesn't know what each icon means. | High | H6 (Recognition over recall) |
| 2.7 | **Settings actions (Branding, Team) are icon-only in the header** — Rajesh won't know what the palette icon does. | Medium | H6 (Recognition) |
| 2.8 | **No confirmation before creating a new report** — tapping "New Report" instantly creates a Firestore document and opens the editor. Accidental taps create empty reports. | Medium | H5 (Error prevention) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 2.1 | On mobile, move "New Report" to a **floating action button (FAB)** at the bottom-right, thumb-accessible. Keep the top button on desktop. | Medium |
| 2.2 | **Hide analytics cards when user has 0 reports.** Only show after first report is created. | Low |
| 2.3 | Make welcome tour steps **actually navigate** — "Create Your First Report" should open the new report flow. Or make them clearly informational (remove blue CTA styling). | Low |
| 2.4 | Either **compute the real completion percentage** (count filled fields / total fields) or **remove the progress bar entirely**. A lie is worse than no info. | Medium |
| 2.5 | Use a **bottom sheet / modal confirmation** for delete: "Delete this report? This cannot be undone." with large Cancel/Delete buttons. | Medium |
| 2.6 | Add **text labels below each icon** on report cards, or use a **kebab menu (...)** that opens a list of actions with labels. This is the WhatsApp/YouTube pattern Rajesh knows. | Medium |
| 2.7 | Add **text labels** next to settings icons: "Branding", "Team". Or move them into a **single "Settings" button** that opens a menu. | Low |
| 2.8 | Show a **"Start New Report?" confirmation** or let the first "New Report" tap open a bottom sheet with options: "Blank Report" / "Copy from Previous". | Low |

---

## 3. Form Editor — Navigation

### Current State
- Desktop: left sidebar with 7 sections + icons.
- Mobile: bottom tab bar with 7 tiny icons + Previous/Next buttons in the content area.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 3.1 | **7 tabs in the bottom bar is too many for a 6" phone** — each tab is ~51px wide. Apple recommends min 49pt for touch targets. Labels are 9px and unreadable. | Critical | Fitts's Law, WCAG |
| 3.2 | **Tab labels are truncated or invisible** — "Technical" and "Location" labels get cut off. Rajesh taps blindly. | High | H6 (Recognition) |
| 3.3 | **No visual progress** — Rajesh filled Section 0 and 1 but tabs don't show which sections are complete. He doesn't know if he missed anything. | High | H1 (Visibility) |
| 3.4 | **"Preview Report" button is hidden at the bottom of the sidebar** (desktop) or behind a floating button (mobile) — the primary action is buried. | High | H1 (Visibility) |
| 3.5 | **Previous/Next buttons are below the form content on mobile** — user must scroll past all fields to find them, then they navigate away, losing scroll position. | Medium | H7 (Flexibility) |
| 3.6 | **No indication of which fields are required** — Rajesh fills random fields and doesn't know what's needed for a valid report. | High | H5 (Error prevention) |
| 3.7 | **Desktop sidebar shows all section names identically** — no visual weight difference between completed and incomplete sections. | Medium | H1 (Visibility) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 3.1 | **Reduce to 4-5 visible tabs** on mobile, with a scrollable tab bar or a "More" overflow. Group "Technical" + "Building" together. Or use a **step-by-step wizard** (show one section at a time with Next/Back) instead of tabs. | High |
| 3.2 | Use **icon-only tabs on mobile** (no labels) with a **tooltip on long-press** showing the section name. Increase icon size to 24px. | Low |
| 3.3 | Add **completion indicators** to tabs — a small green dot or checkmark on sections where required fields are filled. | Medium |
| 3.4 | On mobile, make "Preview Report" a **sticky bottom bar** that's always visible (above the tab bar) once the user has filled the minimum required fields. | Medium |
| 3.5 | Replace Previous/Next with **swipe-between-sections** gesture (horizontal swipe changes section). This is the pattern Rajesh knows from swiping through WhatsApp photos. | High |
| 3.6 | Mark required fields with a **red asterisk (\*)** and show a **"X of Y fields filled"** counter per section. | Medium |
| 3.7 | Add a **green checkmark or filled-circle** next to completed sections in the sidebar. Use a **grey circle** for incomplete. | Low |

---

## 4. Form Editor — Field Interactions

### Current State
- Fields use `FormInput`, `FormSelect`, `FormSelectWithCustom`, `FormTextarea` components.
- Dropdowns are searchable comboboxes with portal rendering.
- Date fields use a custom calendar picker.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 4.1 | **Custom combobox requires typing to search** — Rajesh types slowly on a phone. He'd rather scroll a short list. For fields with <10 options (roof type, brickwork), a plain dropdown is faster. | Medium | H7 (Flexibility) |
| 4.2 | **Custom date picker is non-native** — Android has an excellent native date picker that Rajesh already knows. The custom calendar takes more taps and has small touch targets. | High | Jakob's Law |
| 4.3 | **Number inputs accept any text** — `type="number"` on mobile shows a full keyboard on some Android devices instead of the numeric pad. `inputMode="decimal"` is more reliable. | Medium | H5 (Error prevention) |
| 4.4 | **No field-level validation** — Rajesh types "abc" in plot area (a number field) and only discovers the error when generating the report. | High | H9 (Help users recognize errors) |
| 4.5 | **Plot Area precision is 4 decimal places** (`step="0.0001"`) — this confuses Rajesh. He enters "250" and the field shows "250.0000". | Low | H2 (Match real world) |
| 4.6 | **Fields are in a 2-column grid on mobile** — on a 6" phone, each field is ~160px wide. Labels get truncated. Inputs are tiny. | High | WCAG touch targets |
| 4.7 | **"Land Share Fraction" and "Land Share Decimal" are separate fields** — Rajesh types "1/3" in the fraction field but must also type "0.333" in the decimal field. These should auto-calculate. | Medium | H7 (Flexibility) |
| 4.8 | **Dropdown portal can appear off-screen** on mobile when the field is near the bottom of the viewport — options list gets clipped. | Medium | H1 (Visibility) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 4.1 | For fields with **<10 options**, use a **native `<select>`** or a simple list picker. Reserve the searchable combobox for fields with 15+ options (city, bank name). | Medium |
| 4.2 | Use `type="date"` with native browser date picker on mobile. Keep the custom picker as a fallback for desktop. Detect touch devices with `'ontouchstart' in window`. | Medium |
| 4.3 | Add `inputMode="decimal"` to all number fields. This shows the numeric keyboard on Android/iOS. | Low |
| 4.4 | Add **real-time validation** — red border + inline error message when field loses focus with invalid data. For required fields, show "Required" when empty and user moves away. | Medium |
| 4.5 | Only show significant decimal places. Don't pad with zeros. Use `parseFloat(value).toString()` for display. | Low |
| 4.6 | Use **single-column layout on mobile** (`sm:grid-cols-2` but `grid-cols-1` by default). One field per row = larger touch targets + readable labels. | Medium |
| 4.7 | When user types "1/3" in the fraction field, **auto-calculate and fill the decimal** field (0.333). Parse simple fractions with a regex. | Low |
| 4.8 | Ensure dropdown portals **calculate available space** and flip upward if near the bottom of the viewport. | Medium |

---

## 5. Form Editor — Swipe-to-Hide

### Current State
- Users can swipe left on any form field to hide it from the report.
- A hint tooltip appears once per session.
- Hidden fields can be restored from a modal.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 5.1 | **Swipe gesture is undiscoverable** — Rajesh will never swipe a form field. This gesture has no precedent in apps he uses (WhatsApp, YouTube, Gmail). | Critical | H6 (Recognition), H10 (Help) |
| 5.2 | **Swipe hint shows once and disappears** — if Rajesh wasn't paying attention or didn't understand, it's gone forever. | High | H10 (Help & documentation) |
| 5.3 | **Accidentally hiding a field is irreversible without knowing about the "Hidden Fields" modal** — Rajesh hides a field by accident, panics, doesn't know how to get it back. | High | H3 (User control), H5 (Error prevention) |
| 5.4 | **Swipe conflicts with scrolling** — on a vertical form with horizontal swipe-to-hide, accidental triggers are common. Diagonal scrolling fires the swipe handler. | Medium | Motor accessibility |
| 5.5 | **No visual affordance** — fields don't look swipeable. There's no handle, drag indicator, or swipe icon. | High | H4 (Consistency) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 5.1 | **Replace swipe with a toggle/eye icon** per field. Small "hide" icon on the right side of each field. Tap to hide, tap again in the "Hidden" panel to restore. This is the pattern Rajesh knows from hiding columns in Excel or WhatsApp "hide chat." | Medium |
| 5.2 | Show a **persistent "Hidden: X fields" badge** at the top of each section. Tapping it opens the restore modal. This also solves discoverability. | Low |
| 5.3 | When a field is hidden, show a **brief toast notification**: "Field hidden. Tap 'Hidden (1)' to restore." with an **Undo** link that auto-expires after 5 seconds. | Medium |
| 5.4 | If keeping swipe: increase the **horizontal threshold to 100px** (currently feels like 50px) and require **<30 degree angle from horizontal** to avoid diagonal-scroll triggers. | Low |
| 5.5 | If keeping swipe: add a **subtle left-pointing chevron** or drag handle on the right edge of each field to signal swipeability. | Low |

---

## 6. Photo Upload

### Current State
- Drag-and-drop zone with text "Drag photos here or click to select."
- Uploaded photos show thumbnails in a list.
- Individual delete buttons per photo.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 6.1 | **"Drag and drop" is a desktop concept** — on mobile, Rajesh can only tap. The instruction is confusing. | Medium | H2 (Match real world) |
| 6.2 | **No camera option** — Rajesh is on-site at the property. He wants to take a photo directly, not browse his gallery. | High | H7 (Flexibility) |
| 6.3 | **No photo reordering** — the first uploaded photo becomes the cover photo. Rajesh can't change the order. | Medium | H3 (User control) |
| 6.4 | **No photo captions** — each photo in the report gets a generic label "Property photo 1." Rajesh may want to label them "Front elevation", "Kitchen", etc. | Low | H7 (Flexibility) |
| 6.5 | **Upload progress is per-file but no overall progress** — when uploading 10 photos, Rajesh doesn't know how many are done. | Low | H1 (Visibility) |
| 6.6 | **Large photo files from phone camera (5-10MB each) cause slow uploads** — no client-side compression indicator. Rajesh thinks the app is frozen. | Medium | H1 (Visibility) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 6.1 | Change mobile text to **"Tap to select photos from gallery"** and add a **"Take Photo" button** with camera icon. | Low |
| 6.2 | Add `capture="environment"` attribute to the file input to open the camera directly. Or add two buttons: **"Camera"** and **"Gallery."** | Low |
| 6.3 | Add **drag-to-reorder** on photo thumbnails (long-press + drag on mobile). Or add up/down arrow buttons. | Medium |
| 6.4 | Add an optional **caption input** below each photo thumbnail. Default to "Property photo 1" but let user edit. | Medium |
| 6.5 | Show **"Uploading 3 of 10 photos..."** overall progress message. | Low |
| 6.6 | Show **"Compressing photos..."** message during client-side resize (if happening). Add a note: "Photos are automatically optimized for the report." | Low |

---

## 7. Report Preview & Editor

### Current State
- Full-screen overlay with scaled A4 iframe.
- Text elements are `contentEditable` — click to edit inline.
- "Export PDF" button in toolbar.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 7.1 | **A4 content scaled down on a 6" phone is unreadable** — at scale ~0.48, 12pt text becomes ~6pt. Rajesh can't read his own report, let alone edit it. | Critical | WCAG readability |
| 7.2 | **"Click any text to edit" is the only instruction** — Rajesh doesn't know what `contentEditable` is. He doesn't realize he can tap on text in the preview. He treats it as a static preview. | High | H10 (Help) |
| 7.3 | **No zoom/pinch-to-zoom** — the iframe is scaled with CSS transform, but standard pinch-to-zoom may not work as expected inside the scaled container. | High | H3 (User control) |
| 7.4 | **Edited text is not saved** — if Rajesh makes edits, goes "Back to Form" (accidentally or intentionally), all edits are lost with no warning. The `beforeunload` handler only works on page close, not in-app navigation. | High | H5 (Error prevention) |
| 7.5 | **No undo button** — browser Ctrl+Z works but Rajesh on Android doesn't know about it. There's no visible undo button. | Medium | H3 (User control) |
| 7.6 | **Export button says just "Export"** on mobile (truncated from "Export PDF") — unclear what it does. | Low | H6 (Recognition) |
| 7.7 | **No page numbers or page separators** — the preview is one long scroll. Rajesh can't tell where page 1 ends and page 2 begins. | Medium | H2 (Match real world) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 7.1 | On mobile, **don't show the A4 preview as a scaled iframe.** Instead, show a **section-by-section text editor** — each editable field as a labeled input, same order as the PDF. Show a "Preview PDF" button that opens the actual PDF in the device's PDF viewer. | High |
| 7.2 | Add a **pulsing highlight on the first editable element** when the editor opens. Show a one-time tutorial: "Tap any highlighted text to change it." | Medium |
| 7.3 | Wrap the iframe area in a **pinch-to-zoom container** (CSS `touch-action: manipulation` with `overflow: auto`). Or allow double-tap to zoom. | Medium |
| 7.4 | Add a **"You have unsaved edits" confirmation dialog** when the user taps "Back to Form." | Low |
| 7.5 | Add an **Undo button** in the toolbar (uses `document.execCommand('undo')`). | Low |
| 7.6 | Always show full text: **"Export PDF"** — don't truncate on mobile. Abbreviate "Back to Form" to just a back arrow instead. | Low |
| 7.7 | Add **visual page breaks** — a dashed line with "Page 1 / Page 2" labels between `.page` divs in the iframe. | Medium |

---

## 8. PDF Export & Download

### Current State
- "Export PDF" triggers server-side Puppeteer conversion.
- Auto-downloads the PDF file.
- Shows spinner overlay during export.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 8.1 | **Download happens silently on Android** — Chrome downloads the PDF to the Downloads folder but the user sees no notification inside the app. Rajesh thinks nothing happened. | High | H1 (Visibility) |
| 8.2 | **No "Share via WhatsApp" option** — Rajesh's primary distribution channel is WhatsApp. He downloads the PDF, then must find it in Files app, then share. 4 extra steps. | High | H7 (Flexibility) |
| 8.3 | **File is named "Valuation_Report.pdf"** — when Rajesh has 20 reports, they all have the same name. He can't tell them apart in Downloads. | Medium | H6 (Recognition) |
| 8.4 | **15-30 second export time with no cancel option** — if Rajesh triggered it by accident, he's stuck waiting. | Low | H3 (User control) |
| 8.5 | **No success confirmation screen** — after export, the editor just closes. No "Your report is ready!" moment. | Medium | H1 (Visibility) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 8.1 | After download, show a **success screen**: "Report Downloaded!" with buttons: **"Open PDF"**, **"Share via WhatsApp"**, **"Back to Dashboard"**. | Medium |
| 8.2 | Add a **"Share" button** that uses `navigator.share()` (works on Android Chrome). Pre-fill with the PDF blob. Rajesh can then pick WhatsApp directly. | Medium |
| 8.3 | Name the file **"Valuation_[PropertyAddress]_[Date].pdf"** using the property address from form data. | Low |
| 8.4 | Add a **"Cancel" link** below the export spinner. Implement via `AbortController` on the fetch request. | Medium |
| 8.5 | Show a **celebration screen** with confetti/checkmark: "Report Generated Successfully!" with action buttons. This also solves 8.1. | Medium |

---

## 9. Offline & Saving Experience

### Current State
- Auto-save with 2-second debounce.
- Saves to IndexedDB when offline, syncs when back online.
- Small text status: "Saving..." / "Saved 12:30:45 PM" / "Offline" in sidebar.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 9.1 | **Save status is only in the desktop sidebar** — on mobile, there's no visible save status. Rajesh doesn't know if his work is saved. | High | H1 (Visibility) |
| 9.2 | **"Offline" indicator is tiny amber text** — easy to miss. Rajesh could be working offline for minutes without knowing. | Medium | H1 (Visibility) |
| 9.3 | **No explicit "Save" button** — auto-save is great for tech-savvy users, but Rajesh wants to tap a save button and see a confirmation. Invisible saves make him anxious. | High | H3 (User control), Jakob's Law |
| 9.4 | **Pending sync count "(2 pending)" is jargon** — Rajesh doesn't know what "pending" means in this context. | Low | H2 (Match real world) |
| 9.5 | **No warning when navigating away with unsaved changes** — if auto-save's 2-second debounce hasn't fired yet, changes are lost. | Medium | H5 (Error prevention) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 9.1 | Add a **save status indicator in the mobile top header** — a small cloud icon with checkmark (saved) or spinner (saving). | Low |
| 9.2 | When going offline, show a **full-width banner** at the top: "You're offline. Your work is being saved locally." with an amber background. Dismiss after 5 seconds but keep a small dot indicator. | Low |
| 9.3 | Add a **"Save" button** in the mobile floating controls. It triggers an immediate save (bypasses debounce) and shows a **green toast: "Saved!"**. Auto-save continues in the background. | Medium |
| 9.4 | Change text to **"2 changes waiting to sync"** — plain language. | Low |
| 9.5 | Before navigating back to dashboard, **flush the debounce** (save immediately) and wait for completion. | Low |

---

## 10. Language Toggle (i18n)

### Current State
- Toggle in dashboard header and editor sidebar footer.
- Switches between English and Hindi.
- Only translates UI labels, not form field labels or PDF content.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 10.1 | **Toggle is hidden at the bottom of the sidebar** — Rajesh doesn't scroll to the bottom. He never discovers Hindi mode. | High | H1 (Visibility) |
| 10.2 | **Form field labels stay in English** — even in Hindi mode, all 80+ form labels remain English. This is the part where Rajesh needs Hindi the most. | High | H4 (Consistency) |
| 10.3 | **Toggle label "हि" is ambiguous** — Rajesh sees a small "हि" button but doesn't know it switches language. No text label says "भाषा बदलें" (change language). | Medium | H6 (Recognition) |
| 10.4 | **Brief flash of English on page load** — LanguageContext initializes as 'en' then updates to stored preference. Hindi users see English for 200ms. | Low | H1 (Visibility) |
| 10.5 | **Landing page is not translated** — Rajesh arrives at the landing page in English. He can't switch to Hindi before signing in. | Medium | H7 (Flexibility) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 10.1 | Move the language toggle to the **dashboard header** (next to theme toggle, which is already visible) and the **mobile top bar** in the editor. | Low |
| 10.2 | Add Hindi translations for all form field labels (these are technical terms Rajesh uses daily in Hindi — he knows "भूमि क्षेत्रफल" more than "Plot Area"). Prioritize Section 0 and 2 labels first. | High |
| 10.3 | Change the toggle to show **"EN / हिंदी"** with the current language highlighted. Or use a standard globe icon with "Language" tooltip. | Low |
| 10.4 | Use `useState(() => getStoredLanguage())` for instant initialization. The SSR guard already returns 'en' on server, so hydration matches — but the useEffect switch causes the flash. | Low |
| 10.5 | Add the language toggle to the **landing page header/footer** so users can switch before signing in. | Medium |

---

## 11. Referral System

### Current State
- Dashboard shows referral card with code, copy, share buttons.
- Stats show total referrals and bonus days earned.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 11.1 | **Referral card is below the reports list** — user must scroll past all reports to find it. On a phone with 10 reports, it's invisible. | Medium | H1 (Visibility) |
| 11.2 | **"ABCXYZ" code is meaningless** — Rajesh doesn't know what to do with it. No explanation of the referral process. | Medium | H10 (Help) |
| 11.3 | **Share text is in English** — Rajesh's WhatsApp contacts are Hindi-speaking. The share message should be in the user's selected language. | Low | H4 (Consistency) |
| 11.4 | **No deep link** — the share message says "Use my referral code: ABCXYZ" but the recipient has to manually find where to enter it. A link like `valuquick.in/r/ABCXYZ` would auto-fill. | Medium | H7 (Flexibility) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 11.1 | Move referral card to a **tab or section in settings** rather than inline with reports. Or show it as a **dismissible banner** at the top of the dashboard. | Low |
| 11.2 | Add a one-liner: **"Share this code with other valuers. When they subscribe, you both get 30 days free!"** | Low |
| 11.3 | Translate share text to Hindi when the app is in Hindi mode. | Low |
| 11.4 | Generate a **referral link** (`valuquick.in/r/ABCXYZ`) that auto-fills the code during signup. Implement as a redirect route. | Medium |

---

## 12. Subscription & Pricing

### Current State
- Trial: 5 free reports.
- Banner shows remaining count.
- Pricing modal shows 3 plans.
- Payment via Razorpay.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 12.1 | **Trial banner shows "3 of 5 reports used" but doesn't explain what happens at 0** — Rajesh thinks his existing reports will be deleted. | Medium | H10 (Help) |
| 12.2 | **Pricing is only accessible from the trial banner** — if the banner is dismissed or trial is active, there's no way to find pricing from the dashboard menu. | Medium | H7 (Flexibility) |
| 12.3 | **Razorpay modal opens in a popup** — Android Chrome may block popups. Rajesh sees nothing happen and thinks the app is broken. | Medium | H9 (Error recovery) |
| 12.4 | **No success confirmation after payment** — after Razorpay, the page just refreshes. Rajesh doesn't know if payment went through. | High | H1 (Visibility) |
| 12.5 | **Annual pricing shows "₹750/month"** but charges ₹9,000 upfront — Rajesh may be shocked by the full amount at Razorpay checkout. | Medium | H2 (Match real world) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 12.1 | Add text: **"After 5 free reports, you'll need a subscription to create new ones. Your existing reports are always accessible."** | Low |
| 12.2 | Add a **"Subscription" link** in the dashboard settings menu (next to Branding and Team). | Low |
| 12.3 | Use Razorpay's **inline checkout** (`displayMode: "page"`) instead of popup mode. This works reliably on mobile. | Medium |
| 12.4 | After payment verification, show a **success screen**: "Payment Successful! Your subscription is active until [date]." with a confetti animation. | Medium |
| 12.5 | Show **both**: "₹750/month, billed annually at ₹9,000" — make the annual total prominent so there's no surprise. | Low |

---

## 13. Team Management

### Current State
- Modal with member list, invite by email, role selection.
- Seat usage counter.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 13.1 | **Invite requires email** — Rajesh's colleague may not know his email. In India, phone number is the primary identifier. | Medium | H2 (Match real world) |
| 13.2 | **"Admin" vs "Member" roles are not explained** — Rajesh doesn't know what each role can/cannot do. | Medium | H10 (Help) |
| 13.3 | **Seat purchase flow involves a separate modal within a modal** — complex nesting. On mobile, the inner modal may not render properly. | Medium | H8 (Minimalist) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 13.1 | Add a **"Share invite link"** option alongside email invite. Generate a one-time link that the colleague can open on their phone. | Medium |
| 13.2 | Add a brief **tooltip or info line**: "Members can create reports. Admins can also manage team and branding." | Low |
| 13.3 | Open seat purchase as a **full-screen page or bottom sheet**, not a modal-within-modal. | Medium |

---

## 14. Branding Settings

### Current State
- Modal with 4 tabs: Details, Design, Header, Footer.
- Logo upload, color picker, template selector.

### Issues

| # | Issue | Severity | Heuristic Violated |
|---|-------|----------|-------------------|
| 14.1 | **4 tabs inside a modal is complex** — on mobile, this is overwhelming. Rajesh just wants to add his logo and firm name. | Medium | Hick's Law |
| 14.2 | **No live preview of the actual PDF** — Rajesh changes colors and fonts but can't see the effect until he generates a report. | Medium | H1 (Visibility) |
| 14.3 | **Color picker is a hex input** — Rajesh doesn't know what "#3B82F6" means. He needs visual swatches. | Medium | H2 (Match real world) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 14.1 | Simplify to a **single scrollable page** instead of tabs. Put the most important fields first: Firm Name → Logo → Template → (Advanced: colors, header, footer). | Medium |
| 14.2 | Show a **mini PDF preview** that updates live as branding changes are made. Even a header/footer preview strip is helpful. | High |
| 14.3 | Offer **8-10 preset color swatches** (blue, green, maroon, black, navy, etc.) with an "Advanced" toggle for hex input. | Low |

---

## 15. Typography & Readability

### Issues

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 15.1 | **Base font size is 14px** (`text-sm` in most places) — too small for Rajesh without glasses. WCAG recommends 16px minimum for body text. | High | WCAG AA |
| 15.2 | **Tertiary text is `text-text-tertiary`** which may be low contrast — grey on dark background can fall below 4.5:1 contrast ratio. | Medium | WCAG AA |
| 15.3 | **Form labels are `text-xs` (12px)** — genuinely hard to read on a phone, especially in sunlight (on-site at a property). | High | WCAG AA |
| 15.4 | **Monospace referral code uses `tracking-[0.2em]`** — wide letter-spacing makes long codes harder to read, not easier. | Low | — |
| 15.5 | **Hindi text uses the same Inter font** — Inter has limited Devanagari support. Hindi characters may render with a fallback font causing inconsistent sizing. | Medium | Typography |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 15.1 | Increase base text to **16px** (`text-base`). Use `text-sm` only for metadata/timestamps. | Low |
| 15.2 | Audit all `text-text-tertiary` instances for **WCAG 4.5:1 contrast ratio**. Use a contrast checker tool. Darken/lighten as needed. | Medium |
| 15.3 | Increase form labels to **14px** (`text-sm`) minimum. Consider `text-base` for key field labels. | Low |
| 15.4 | Reduce letter-spacing to `tracking-wider` (0.05em) for referral codes. | Low |
| 15.5 | Add **Noto Sans Devanagari** as a Hindi-specific font in the font stack. Load conditionally when Hindi is selected. | Medium |

---

## 16. Touch Targets & Motor Accessibility

### Issues

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 16.1 | **Bottom tab bar icons are ~18px in a 51px-wide column** — Apple minimum is 44x44pt for touch targets. | Critical | WCAG, Fitts's Law |
| 16.2 | **Report card action buttons (copy, delete, complete) are 32x32px** — below the 44px minimum. Rajesh's fingers are not precise. | High | WCAG |
| 16.3 | **Close buttons on modals are small (24x24px)** — hard to tap accurately, especially for a modal that covers the screen. | Medium | Fitts's Law |
| 16.4 | **Date picker day cells are ~30x30px** — tight grid, especially on a phone. | Medium | WCAG |
| 16.5 | **"Previous Step" and "Next Step" buttons are text links** — no padding, small hit area. | Medium | Fitts's Law |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 16.1 | Increase bottom tab touch targets to **minimum 48x48px**. Reduce to 5 tabs max, or use a scrollable tab bar. | Medium |
| 16.2 | Increase action button size to **40x40px** minimum. Or consolidate into a **kebab menu** (single 44x44 button). | Low |
| 16.3 | Increase modal close buttons to **44x44px** with adequate padding. | Low |
| 16.4 | Increase date picker cell size to **40x40px** with 4px gap. | Low |
| 16.5 | Style Previous/Next as **full buttons** with padding (`py-3 px-4`), not text links. | Low |

---

## 17. Error Handling & Recovery

### Issues

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 17.1 | **API errors show raw messages** — "Failed to generate document" doesn't tell Rajesh what to do. | Medium | H9 (Error recovery) |
| 17.2 | **No retry mechanism** — when PDF generation fails, the error stays on screen. No "Try Again" button. | High | H3 (User control) |
| 17.3 | **Session expired modal has no auto-redirect** — Rajesh reads "Logged Out" but doesn't know he needs to click "Sign In Again." Some users will close the app entirely. | Medium | H10 (Help) |
| 17.4 | **Network errors during photo upload show no feedback** — the upload silently fails. Rajesh thinks the photo was added. | High | H9 (Error recognition) |
| 17.5 | **"Trial limit reached" error in the editor** — user has filled an entire form and is told they can't generate. Wasted effort. | High | H5 (Error prevention) |

### Recommendations

| # | Solution | Effort |
|---|----------|--------|
| 17.1 | Map error codes to **user-friendly messages**: "We couldn't generate your report. Please check your internet connection and try again." | Low |
| 17.2 | Add a **"Try Again" button** alongside every error message. For generation errors, also offer "Save and try later." | Low |
| 17.3 | Auto-redirect to login after **5 seconds** with a countdown: "Redirecting to sign-in in 5...4...3..." | Low |
| 17.4 | Show a **red badge on failed photos** with a "Retry" button. Toast message: "Photo upload failed. Tap to retry." | Medium |
| 17.5 | Check trial limit **before opening the editor** (at "New Report" click time). Show the subscription prompt immediately, not after form filling. | Medium |

---

## 18. Cross-Device Summary

### Mobile (< 640px) — Primary Device

| Area | Grade | Key Issue |
|------|-------|-----------|
| Navigation | D | 7 tabs too cramped; labels unreadable |
| Form Fields | C | 2-col grid too narrow; labels truncated |
| Touch Targets | D | Many buttons below 44px minimum |
| Typography | C | 12px labels, 14px body — too small |
| Report Preview | F | A4 content unreadable at 48% scale |
| Photo Upload | B | Works but lacks camera button |
| Saving Feedback | D | Status only in hidden sidebar |
| Overall | D+ | Usable but frustrating for target persona |

### Tablet (640px - 1024px)

| Area | Grade | Key Issue |
|------|-------|-----------|
| Navigation | B | Sidebar works well at this width |
| Form Fields | B+ | 2-col grid is comfortable |
| Touch Targets | B | Adequate for most controls |
| Typography | B | Readable at standard sizes |
| Report Preview | B | A4 preview at ~80% scale is usable |
| Overall | B | Mostly good, minor touch target fixes needed |

### Desktop (> 1024px)

| Area | Grade | Key Issue |
|------|-------|-----------|
| Navigation | A | Sidebar is clear and spacious |
| Form Fields | A | Comfortable 2-col layout |
| Touch Targets | N/A | Mouse cursor is precise |
| Typography | B+ | Could use slightly larger labels |
| Report Preview | A | Full-size A4 preview works well |
| Overall | A- | Good experience, minor polish needed |

---

## Priority Matrix

### Do First (High Impact, Low Effort)
1. Fix mobile form layout to single-column (4.6)
2. Increase base font size to 16px (15.1)
3. Add `inputMode="decimal"` to number fields (4.3)
4. Add mobile save status indicator (9.1)
5. Change photo upload text on mobile + add camera (6.1, 6.2)
6. Add "Try Again" buttons to all errors (17.2)
7. Move language toggle to visible location (10.1)
8. Name PDF files with property address (8.3)
9. Increase touch targets on report card actions (16.2)
10. Check trial limit before opening editor (17.5)

### Do Next (High Impact, Medium Effort)
11. Reduce bottom tabs to 5 or use scrollable bar (3.1)
12. Replace swipe-to-hide with toggle icons (5.1)
13. Add completion indicators to navigation (3.3)
14. Add "Share via WhatsApp" to export flow (8.2)
15. Add real-time field validation (4.4)
16. Show success screen after export (8.5)
17. Compute real completion percentage or remove bar (2.4)
18. Use kebab menu for report card actions (2.6)
19. Add "New Report" FAB on mobile dashboard (2.1)
20. Auto-calculate Land Share Decimal from fraction (4.7)

### Do Later (Medium Impact, Higher Effort)
21. Build section-by-section mobile editor instead of scaled A4 (7.1)
22. Translate form field labels to Hindi (10.2)
23. Add Noto Sans Devanagari font (15.5)
24. Add photo reordering (6.3)
25. Use native date picker on mobile (4.2)
26. Add referral deep links (11.4)
27. Simplify branding to single page (14.1)
28. Add invite link sharing (13.1)

---

*Generated on 2026-02-15. Audit covers the codebase at commit `24091df`.*
