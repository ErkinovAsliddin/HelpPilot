// src/routes/incidents.ts
// Feature: helppilot

import { Router } from 'express';
import {
  getIncidentById,
  listIncidents,
  updateIncident,
} from '../db/incidentRepository.js';
import { bus } from '../pipeline/eventBus.js';

const router = Router();

router.get('/api/incidents', (req, res) => {
  const status = (req.query as Record<string, string>)['status'];
  const incidents = listIncidents(status ? { status } : {});
  res.json({ incidents });
});

router.get('/api/incidents/:id', (req, res) => {
  const incident = getIncidentById(req.params['id'] as string);
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  res.json(incident);
});

router.post('/api/incidents/:id/approve', (req, res) => {
  const id = req.params['id'] as string;
  const incident = getIncidentById(id);
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  if (incident.status === 'approved' || incident.status === 'closed') {
    res.status(409).json({ error: 'Incident already approved or closed' });
    return;
  }
  const body = req.body as Record<string, string>;
  const adminId = body['adminId'];
  const now = new Date().toISOString();

  updateIncident(id, { status: 'approved', admin_id: adminId, approved_at: now });
  bus.emit('incident.approved', { incidentId: id, adminId: adminId || '' });
  res.json({ success: true });
});

router.post('/api/incidents/:id/close', (req, res) => {
  const id = req.params['id'] as string;
  const incident = getIncidentById(id);
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  const cooldownUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  updateIncident(id, { status: 'closed', closed_at: new Date().toISOString(), cooldown_until: cooldownUntil });
  res.json({ success: true });
});

export default router;
