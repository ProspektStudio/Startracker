# StarTracker API (Node.js)

Node.js Express server providing API endpoints for StarTracker.

## Installation

```bash
npm install
```

## Building

```bash
npm run build
```

## Running

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server runs on port 8000 by default (or the `PORT` environment variable if set).

## Endpoints

### GET /api/hello
Returns a simple hello message.

**Response:**
```json
{
  "message": "Hello World"
}
```

### GET /api/satellite-info-llm
Streams satellite information using LLM.

**Query Parameters:**
- `group` (required): String between 1-50 characters
- `name` (required): String between 1-50 characters

**Response:**
Server-Sent Events (SSE) stream with `text/event-stream` content type.

**Example:**
```
GET /api/satellite-info-llm?group=starlink&name=Starlink-1234
```

## Notes

The `generateSatelliteInfoStream` function in `server.ts` is currently a placeholder. Replace it with your actual Gemini API integration or equivalent LLM service.
