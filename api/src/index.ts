import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { handleSatelliteInfoLLM } from './routes/message';

const app = express();
const port = 8000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


// Basic route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to StarTracker API' });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Satellite info endpoints (matching Python API)
app.get('/api/satellite-info-llm', handleSatelliteInfoLLM);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
