import { Router, Request, Response } from 'express';
import db from './database';

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

// Get ping history for a service
router.get('/services/:id/pings', (req: Request, res: Response) => {
  const pings = db.prepare(`
    SELECT * FROM pings
    WHERE service_id = ?
    ORDER BY checked_at ASC
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