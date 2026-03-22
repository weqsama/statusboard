import { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001/api';

interface Service {
  id: number;
  name: string;
  url: string;
  status: 'up' | 'down' | null;
  response_time: number | null;
  checked_at: string | null;
}

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const fetchStatus = async () => {
    const res = await axios.get(`${API}/status`);
    setServices(res.data);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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
        <div key={service.id} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          marginBottom: 12,
          borderRadius: 8,
          background: service.status === 'up' ? '#e6ffed' : service.status === 'down' ? '#fff0f0' : '#f5f5f5',
          border: `1px solid ${service.status === 'up' ? '#b7ebc0' : service.status === 'down' ? '#ffc9c9' : '#ddd'}`
        }}>
          <div>
            <strong>{service.name}</strong>
            <span style={{ marginLeft: 12, color: '#666', fontSize: 14 }}>{service.url}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontWeight: 'bold', color: service.status === 'up' ? 'green' : service.status === 'down' ? 'red' : '#999' }}>
              {service.status ? service.status.toUpperCase() : 'PENDING'}
            </span>
            {service.response_time && <span style={{ color: '#666', fontSize: 14 }}>{service.response_time}ms</span>}
            <button onClick={() => deleteService(service.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;