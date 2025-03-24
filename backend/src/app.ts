// app.ts
import express from 'express';
import http from 'http';
import { setupWebSocket } from './websocket';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware, routes, and other Express configurations
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Initialize WebSocket server
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
