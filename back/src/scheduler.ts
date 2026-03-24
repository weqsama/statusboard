import cron from 'node-cron';
import axios from 'axios';
import db from './database';
import { Server as SocketIOServer } from 'socket.io';

export function startScheduler(io?: SocketIOServer) {
  cron.schedule('* * * * *', async () => {
    const services = db.prepare('SELECT * FROM services').all();

    for (const service of services as any[]) {
      const start = Date.now();
      let status = 'down';
      let responseTime: number | null = null;

      try {
        await axios.get(service.url, { timeout: 5000 });
        status = 'up';
        responseTime = Date.now() - start;
      } catch {
        responseTime = Date.now() - start;
      }

      db.prepare(`
        INSERT INTO pings (service_id, status, response_time)
        VALUES (?, ?, ?)
      `).run(service.id, status, responseTime);

      const payload = {
        id: service.id,
        name: service.name,
        url: service.url,
        status,
        response_time: responseTime,
        checked_at: new Date().toISOString()
      };

      if (io) {
        io.emit('statusUpdate', payload);
      }

      console.log(`[${service.name}] ${status} — ${responseTime}ms`);
    }
  });
}