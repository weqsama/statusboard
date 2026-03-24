import { Router, Request, Response } from 'express';
import db from './database';
import axios from 'axios';

const router = Router();

// Get all services
router.get('/services', (req: Request, res: Response) => {
  const services = db.prepare('SELECT * FROM services').all();
  res.json(services);
});

// Add a service
router.post('/services', (req: Request, res: Response) => {
  const { name, url } = req.body;
  if (!name || !url) {
    res.status(400).json({ error: 'Name and URL are required' });
    return;
  }
  const result = db.prepare('INSERT INTO services (name, url) VALUES (?, ?)').run(name, url);
  res.json({ id: result.lastInsertRowid, name, url });
});

// Delete a service
router.delete('/services/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM pings WHERE service_id = ?').run(req.params.id);
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get ping history for a service (return newest 100, frontend will order oldest->newest)
router.get('/services/:id/pings', (req: Request, res: Response) => {
  const pings = db.prepare(`
    SELECT * FROM pings
    WHERE service_id = ?
    ORDER BY checked_at DESC
    LIMIT 100
  `).all(req.params.id);
  res.json(pings);
});

// Get latest ping for all services
router.get('/status', (req: Request, res: Response) => {
  const status = db.prepare(`
    SELECT s.id, s.name, s.url, p.status, p.response_time, p.checked_at
    FROM services s
    LEFT JOIN pings p ON p.id = (
      SELECT id FROM pings
      WHERE service_id = s.id
      ORDER BY checked_at DESC
      LIMIT 1
    )
  `).all();
  res.json(status);
});

export default router;

// manually trigger a ping for debugging/testing purposes
router.post('/services/:id/ping', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!service) return res.status(404).json({ error: 'Service not found' });

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

  const info = db.prepare(`
    INSERT INTO pings (service_id, status, response_time)
    VALUES (?, ?, ?)
  `).run(id, status, responseTime);

  const inserted = db.prepare(`
    SELECT id, service_id, status, response_time, checked_at
    FROM pings
    WHERE id = ?
  `).get(info.lastInsertRowid);

  const payload = {
    id: service.id,
    name: service.name,
    url: service.url,
    status: inserted.status,
    response_time: inserted.response_time,
    checked_at: inserted.checked_at,
    ping_id: inserted.id
  };

  // Emit via Socket.IO if attached to app
  const io = req.app.get('io');
  if (io && typeof io.emit === 'function') io.emit('statusUpdate', payload);

  res.json(inserted);
});