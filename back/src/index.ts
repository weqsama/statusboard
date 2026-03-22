import express from 'express';
import cors from 'cors';
import { initDb } from './database';
import { startScheduler } from './scheduler';
import router from './routes';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/api', router);

initDb();
startScheduler();

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});