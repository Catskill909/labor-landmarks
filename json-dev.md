# JSON Feed Development & Spec Compliance

## Overview
The current `/api/landmarks` endpoint returns a plain JSON array. To improve compatibility with standard feed readers and aggregators, we should transition to the official [JSON Feed](https://jsonfeed.org/version/1.1) specification (RFC 8890).

## Current Issues
1. **Spec Non-Compliance**: The current feed is an array, whereas RFC 8890 requires a top-level object with `version`, `title`, and `items`.
2. **Missing Metadata**: The feed lacks a title, home_page_url, and icon reference.
3. **Proxy Issues**: Absolute URLs for images may be incorrect in production if `trust proxy` is not enabled in Express.

## Proposed Implementation

### 1. Server Configuration
- Enable `app.set('trust proxy', true)` in `server/index.ts`.

### 2. New Endpoint: `GET /api/feed.json`
Implement a new endpoint that returns the official JSON Feed structure:
```json
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "Labor Landmarks Feed",
  "home_page_url": "https://labor-map.com",
  "feed_url": "https://labor-map.com/api/feed.json",
  "items": [
    {
      "id": "1",
      "url": "https://labor-map.com/landmark/1",
      "title": "Landmark Name",
      "content_text": "Description...",
      "image": "...",
      "date_published": "..."
    }
  ]
}
```

### 3. Content Type
The new feed should use `application/feed+json` as its `Content-Type` header.

### 4. Backward Compatibility
Keep the existing `/api/landmarks` endpoint as-is to avoid breaking the current frontend implementation.

### 5. Frontend Updates
- Update the **JSON Data Feed** modal to point to `/api/feed.json`.
- Update the modal description to highlight standard compliance.

## Verification Plan
- Use a JSON Feed validator (e.g., [validator.jsonfeed.org](https://validator.jsonfeed.org/)).
- Verify image absolute URLs are correct behind the inverse proxy.
