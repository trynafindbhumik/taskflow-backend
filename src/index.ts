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

initSocketIO(server);

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'TaskFlow API',
    status: 'ok',
    message: 'TaskFlow Backend REST API & WebSockets are running smoothly',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});


app.use(routes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🚀 TaskFlow Backend API & WebSocket running on http://localhost:${PORT}`);
});
