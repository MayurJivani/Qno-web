// app.ts
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { setupWebSocketServer } from './scripts/WebSocket';
import { Logger } from './utils/Logger';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware, routes, and other Express configurations
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize WebSocket server
setupWebSocketServer(server);

server.listen(PORT, () => {
  Logger.info('SERVER_START', `Server is running on port ${PORT}`);
});
