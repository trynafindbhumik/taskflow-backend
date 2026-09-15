import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import routes from './routes';
import { initSocketIO } from './services/socket';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Initialize Socket.IO
initSocketIO(server);

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount modular API domain routes
app.use(routes);

// 404 Route handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// Centralized Global Error Handler Middleware
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🚀 TaskFlow Backend API & WebSocket running on http://localhost:${PORT}`);
});
