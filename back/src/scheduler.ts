import cron from 'node-cron';
import axios from 'axios';
import db from './database';

export function startScheduler() {
  cron.schedule('* * * * *', async () => {
    const services = db.prepare('SELECT * FROM services').all();

    for (const service of services as any[]) {
      const start = Date.now();
      let status = 'down';
      let responseTime = null;

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

      console.log(`[${service.name}] ${status} — ${responseTime}ms`);
    }
  });
}