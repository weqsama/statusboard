import { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const API = 'http://localhost:3001/api';

interface Service {
  id: number;
  name: string;
  url: string;
  status: 'up' | 'down' | null;
  response_time: number | null;
  checked_at: string | null;
}

interface Ping {
  id: number;
  service_id: number;
  status: string;
  response_time: number | null;
  checked_at: string;
}

function formatTime(dateStr: string) {
  if (!dateStr) return '';

  // time parsing attempt
  const looksLikeIso = /T|Z|\+|UTC/.test(dateStr);
  const normalized = looksLikeIso ? dateStr : `${dateStr} UTC`;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pings, setPings] = useState<{ [key: number]: Ping[] }>({});

  const fetchStatus = async () => {
    const res = await axios.get(`${API}/status`);
    setServices(res.data);
  };

  const fetchPings = async (id: number) => {
    const res = await axios.get(`${API}/services/${id}/pings`);
    // API returns newest first; reverse to oldest->newest for chart rendering
    const ordered = Array.isArray(res.data) ? res.data.slice().reverse() : res.data;
    setPings(prev => ({ ...prev, [id]: ordered }));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Realtime updates via Socket.IO
  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('statusUpdate', (payload: any) => {
      // Update services list
      setServices(prev => prev.map(s => s.id === payload.id ? {
        ...s,
        status: payload.status,
        response_time: payload.response_time,
        checked_at: payload.checked_at
      } : s));

      // Append to pings for the service so newest datapoint is on the right.
      // Use DB-provided ping id when available to keep frontend in sync with persisted rows
      setPings(prev => {
        const existing = prev[payload.id] || [];
        const newPing = {
          id: payload.ping_id || Date.now(),
          service_id: payload.id,
          status: payload.status,
          response_time: payload.response_time,
          checked_at: payload.checked_at
        };

        // Avoid duplicates: if the last entry already has this id, skip appending
        if (existing.length > 0 && existing[existing.length - 1].id === newPing.id) {
          return prev;
        }

        const combined = [...existing, newPing];
        const sliced = combined.slice(-100);
        return { ...prev, [payload.id]: sliced };
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  const handleCardClick = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchPings(id);
    }
  };

  const addService = async () => {
    if (!name || !url) return;
    await axios.post(`${API}/services`, { name, url });
    setName('');
    setUrl('');
    fetchStatus();
  };

  const deleteService = async (id: number) => {
    await axios.delete(`${API}/services/${id}`);
    fetchStatus();
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <h1>Status Monitor</h1>

      <div style={{ marginBottom: 32 }}>
        <h2>Add Service</h2>
        <input
          placeholder="Name (e.g. Discord)"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ marginRight: 8, padding: 8 }}
        />
        <input
          placeholder="URL (e.g. https://discord.com)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          style={{ marginRight: 8, padding: 8, width: 280 }}
        />
        <button onClick={addService} style={{ padding: '8px 16px' }}>Add</button>
      </div>

      <h2>Services</h2>
      {services.length === 0 && <p>No services added yet.</p>}
      {services.map(service => (
        <div key={service.id} style={{ marginBottom: 12 }}>
          <div
            onClick={() => handleCardClick(service.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderRadius: expandedId === service.id ? '8px 8px 0 0' : 8,
              background: service.status === 'up' ? '#e6ffed' : service.status === 'down' ? '#fff0f0' : '#f5f5f5',
              border: `1px solid ${service.status === 'up' ? '#b7ebc0' : service.status === 'down' ? '#ffc9c9' : '#ddd'}`,
              cursor: 'pointer'
            }}
          >
            <div>
              <strong>{service.name}</strong>
              <span style={{ marginLeft: 12, color: '#666', fontSize: 14 }}>{service.url}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontWeight: 'bold', color: service.status === 'up' ? 'green' : service.status === 'down' ? 'red' : '#999' }}>
                {service.status ? service.status.toUpperCase() : 'PENDING'}
              </span>
              {service.response_time && <span style={{ color: '#666', fontSize: 14 }}>{service.response_time}ms</span>}
              <button
                onClick={e => { e.stopPropagation(); deleteService(service.id); }}
                style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          </div>

          {expandedId === service.id && (
            <div style={{
              padding: 16,
              border: `1px solid ${service.status === 'up' ? '#b7ebc0' : service.status === 'down' ? '#ffc9c9' : '#ddd'}`,
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              background: 'white'
            }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Response Time — Last 100 Pings</h4>
              {pings[service.id] && pings[service.id].length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={pings[service.id]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="checked_at" tickFormatter={formatTime} tick={{ fontSize: 11 }} />
                    <YAxis unit="ms" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => [`${value}ms`, 'Response Time']}
                      labelFormatter={(label: any) => formatTime(label)}
                    />
                    <Line
                      type="monotone"
                      dataKey="response_time"
                      stroke="#4caf50"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: '#999' }}>No ping history yet.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default App;
