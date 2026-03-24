import express from 'express';
import cors from 'cors';
import { initDb } from './database';
import { startScheduler } from './scheduler';
import router from './routes';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/api', router);

initDb();

// Create HTTP server and attach Socket.IO so scheduler can emit events
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

// make io available to routes via app.get('io')
app.set('io', io);

startScheduler(io);

httpServer.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});