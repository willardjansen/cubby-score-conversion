# PDF to MusicXML Frontend - Development Specification (Next.js)

## Project Overview
Next.js frontend for PDF to MusicXML converter with real-time validation reporting and download functionality.

## Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: React hooks (useState)

---

## TODO List - Frontend

### Phase 1: Project Setup

- [ ] **Task F1.1**: Initialize Next.js project
  - Run: `npx create-next-app@latest pdf-to-musicxml-frontend`
  - Select: TypeScript, Tailwind CSS, App Router
  - Install dependencies: `npm install lucide-react`
  - Verify dev server runs: `npm run dev`

- [ ] **Task F1.2**: Project structure setup
  - Create `.env.local` with API_URL
  - Set up Tailwind config
  - Test basic page renders
  - Configure TypeScript strict mode

---

### Phase 2: Core UI Components

- [ ] **Task F2.1**: File upload component
  - Implement drag-and-drop functionality (currently click-only)
  - Add file validation (PDF only, max 50MB)
  - Show file preview/info after selection
  - Add ability to remove/replace file
  - Visual feedback on drag-over

- [ ] **Task F2.2**: Conversion progress indicator
  - Replace simple spinner with detailed progress
  - Show conversion stages:
    - "Uploading PDF..."
    - "Processing images..."
    - "Running OMR..."
    - "Validating results..."
  - Add progress bar (0-100%)
  - Estimate remaining time

- [ ] **Task F2.3**: Validation report component
  - Create reusable `ValidationCard` component
  - Color-coded confidence levels (green/yellow/red)
  - Expandable sections for detailed info
  - Icons for each validation category
  - Responsive layout for mobile

---

### Phase 3: API Integration

- [ ] **Task F3.1**: API service layer
  - Create `lib/api.ts` for API calls
  - Implement `convertPDF()` function
  - Add proper error handling
  - Handle network timeouts
  - Retry logic for failed requests

- [ ] **Task F3.2**: Handle API responses
  - Parse validation report from response headers/body
  - Download MusicXML file as blob
  - Create object URL for download
  - Handle different error types:
    - Network errors
    - Server errors (500)
    - Validation errors (400)
    - Timeout errors

- [ ] **Task F3.3**: Environment configuration
  - Read API URL from env variables
  - Support different environments (dev/staging/prod)
  - Add API key authentication if needed
  - Configure CORS properly

---

### Phase 4: User Experience Enhancements

- [ ] **Task F4.1**: Loading states
  - Skeleton loaders during conversion
  - Disable UI interactions during processing
  - Prevent duplicate submissions
  - Show cancellation option for long conversions

- [ ] **Task F4.2**: Error handling UI
  - User-friendly error messages
  - Suggestions for common errors:
    - "PDF too large" → compress file
    - "Invalid PDF" → check file format
    - "Server unavailable" → try again later
  - Retry button for failed conversions
  - Error logging for debugging

- [ ] **Task F4.3**: Success feedback
  - Animated success state
  - Preview of MusicXML metadata
  - Automatic download option (toggle)
  - Share results (copy validation report)
  - "Convert another" button

---

### Phase 5: Advanced Features

- [ ] **Task F5.1**: Conversion history
  - Store past conversions in localStorage
  - Show recent conversions list
  - Re-download previous MusicXML files
  - Clear history option

- [ ] **Task F5.2**: Batch upload
  - Support multiple PDF files
  - Queue management
  - Individual validation reports per file
  - Bulk download as ZIP

- [ ] **Task F5.3**: Settings panel
  - Toggle strict vs permissive mode
  - Adjust validation thresholds
  - Configure auto-download
  - Dark mode toggle

---

### Phase 6: Validation Report Enhancements

- [ ] **Task F6.1**: Interactive validation report
  - Click sections to expand details
  - Show warnings/suggestions for low confidence
  - Link to help documentation
  - Export report as PDF/JSON

- [ ] **Task F6.2**: Visual confidence indicators
  - Circular progress charts for each priority
  - Overall score visualization
  - Comparison to average scores
  - Historical trend if available

- [ ] **Task F6.3**: Detailed metadata display
  - Pretty-print composer names
  - Show instrument icons
  - Display tempo markings with notation
  - Preview first few measures (future: MusicXML renderer)

---

### Phase 7: Responsive Design

- [ ] **Task F7.1**: Mobile optimization
  - Test on mobile devices (iOS/Android)
  - Touch-friendly upload area
  - Scrollable validation report
  - Mobile-optimized download flow

- [ ] **Task F7.2**: Tablet layout
  - Two-column layout on tablets
  - Side-by-side upload and results
  - Optimized spacing and fonts

- [ ] **Task F7.3**: Desktop enhancements
  - Wider max-width for large screens
  - Keyboard shortcuts
  - Multi-file drag-and-drop zones

---

### Phase 8: Performance Optimization

- [ ] **Task F8.1**: Code splitting
  - Lazy load validation report component
  - Dynamic imports for heavy components
  - Optimize bundle size

- [ ] **Task F8.2**: Image optimization
  - Use Next.js Image component for icons
  - Optimize SVG assets
  - Add loading placeholders

- [ ] **Task F8.3**: Caching strategy
  - Cache API responses (if applicable)
  - Service worker for offline support
  - Prefetch common resources

---

### Phase 9: Testing

- [ ] **Task F9.1**: Component testing
  - Test file upload validation
  - Test error states
  - Test success states
  - Test responsive breakpoints

- [ ] **Task F9.2**: Integration testing
  - Test full conversion flow
  - Test API error handling
  - Test download functionality
  - Test with various PDF sizes

- [ ] **Task F9.3**: User acceptance testing
  - Test with real orchestral scores
  - Gather feedback on UI/UX
  - Test accessibility (keyboard navigation, screen readers)
  - Cross-browser testing (Chrome, Firefox, Safari)

---

### Phase 10: Deployment

- [ ] **Task F10.1**: Build optimization
  - Run production build: `npm run build`
  - Analyze bundle size
  - Optimize static assets
  - Configure CDN for assets

- [ ] **Task F10.2**: VPS deployment
  - Build Docker image for Next.js app
  - Configure nginx/caddy reverse proxy
  - Set up SSL certificates
  - Point frontend to production API

- [ ] **Task F10.3**: Environment variables
  - Set NEXT_PUBLIC_API_URL for production
  - Configure analytics (optional)
  - Set up error tracking (Sentry, etc.)

---

### Phase 11: Documentation

- [ ] **Task F11.1**: User guide
  - How to upload PDFs
  - Understanding validation reports
  - Troubleshooting common issues
  - Best practices for PDF quality

- [ ] **Task F11.2**: Developer documentation
  - Component documentation
  - API integration guide
  - Deployment instructions
  - Environment setup

---

## Future Enhancements (Post-MVP)

- [ ] Real-time MusicXML preview renderer
- [ ] Manual correction interface for low-confidence elements
- [ ] User accounts and cloud storage
- [ ] Collaborative score editing
- [ ] Integration with Cubby Remote
- [ ] Export to other formats (MIDI, Sibelius)
- [ ] AI-powered suggestions for fixing errors

---

## Setup Instructions for Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local`:**
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Ensure backend is running:**
   ```bash
   cd ../backend
   uvicorn main:app --reload
   ```

5. **Test the full flow:**
   - Upload a test PDF
   - Verify API connection
   - Check validation report displays
   - Test download functionality

---

## Notes for Claude Code

- Start with basic upload and API integration (Phase 1-3)
- Mock validation data initially until backend is ready
- Use TypeScript strictly - define all interfaces
- Test mobile responsiveness early
- Keep components small and reusable
- Add proper error boundaries
- Use Next.js 14 App Router conventions
- Leverage server components where possible for better performance
