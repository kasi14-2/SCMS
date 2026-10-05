import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Link, useNavigate } from 'react-router-dom';

type ComplaintPriority = 'Critical' | 'High' | 'Medium' | 'Low';

type ComplaintItem = {
  id: string;
  title: string;
  status: string;
  priority: ComplaintPriority;
  department: string;
  description: string;
};

type ApiComplaint = {
  id: number;
  complaintNumber?: string;
  title: string;
  description: string;
  status?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  department?: { name?: string } | null;
  submittedBy?: { firstName?: string; lastName?: string; email?: string } | null;
};

type ApiPage<T> = {
  content?: T[];
};

const API_BASE_URL = 'http://localhost:8080';

const navItems = [
  { label: 'Overview', path: '/' },
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Complaints', path: '/complaints' },
  { label: 'Reports', path: '/reports' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Profile', path: '/profile' },
  { label: 'Login', path: '/login' },
  { label: 'Register', path: '/register' }
];

const initialComplaints: ComplaintItem[] = [
  { id: 'CMP-1048', title: 'Broken streetlight near market road', status: 'Assigned', priority: 'High', department: 'Electricity', description: 'Streetlight at the civic market intersection has been out for 3 days.' },
  { id: 'CMP-1052', title: 'Water leak in colony phase 2', status: 'In progress', priority: 'Critical', department: 'Water Supply', description: 'A major pipe burst is causing water pooling and disruption in the neighborhood.' },
  { id: 'CMP-1077', title: 'Garbage overflow near school zone', status: 'Resolved', priority: 'Medium', department: 'Sanitation', description: 'Overflowing waste bins are attracting pests near the school campus.' },
  { id: 'CMP-1105', title: 'Power outage at civic center', status: 'Escalated', priority: 'High', department: 'Electricity', description: 'Multiple feeders are down and the civic center is without power.' }
];

function getStoredToken() {
  return localStorage.getItem('scms_token') ?? '';
}

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText || 'Request failed');
  }

  return (await response.json()) as T;
}

function mapPriority(priority?: string): ComplaintPriority {
  switch (priority?.toUpperCase()) {
    case 'CRITICAL':
      return 'Critical';
    case 'HIGH':
      return 'High';
    case 'LOW':
      return 'Low';
    case 'MEDIUM':
    default:
      return 'Medium';
  }
}

function mapStatus(status?: string): string {
  if (!status) return 'Submitted';
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeComplaint(item: ApiComplaint): ComplaintItem {
  return {
    id: item.complaintNumber ?? `CMP-${item.id}`,
    title: item.title,
    status: mapStatus(item.status),
    priority: mapPriority(item.priority),
    department: item.department?.name ?? 'Unassigned',
    description: item.description
  };
}

async function loadComplaintsFromApi(): Promise<ComplaintItem[]> {
  const token = getStoredToken();
  if (!token) {
    return initialComplaints;
  }

  try {
    const page = await fetchJson<ApiPage<ApiComplaint>>('/api/complaints?page=0&size=20', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const content = page.content ?? [];
    return content.length > 0 ? content.map(normalizeComplaint) : initialComplaints;
  } catch (error) {
    console.warn('Could not load complaints from API:', error);
    return initialComplaints;
  }
}

export default function App() {
  const [complaints, setComplaints] = useState<ComplaintItem[]>(initialComplaints);

  useEffect(() => {
    const loadComplaints = async () => {
      const nextComplaints = await loadComplaintsFromApi();
      setComplaints(nextComplaints);
    };

    void loadComplaints();
  }, []);

  const handleCreateComplaint = async (newComplaint: ComplaintItem) => {
    const token = getStoredToken();

    if (!token) {
      setComplaints((current) => [newComplaint, ...current]);
      return;
    }

    try {
      await fetchJson('/api/complaints', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newComplaint.title,
          description: newComplaint.description,
          priority: newComplaint.priority.toUpperCase(),
          departmentId: null,
          categoryId: null,
          landmark: '',
          latitude: null,
          longitude: null,
          anonymous: false
        })
      });

      const nextComplaints = await loadComplaintsFromApi();
      setComplaints(nextComplaints);
    } catch (error) {
      console.warn('API complaint creation failed, keeping local item:', error);
      setComplaints((current) => [newComplaint, ...current]);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">SC</div>
          <div>
            <p className="eyebrow">Public service</p>
            <h1>SCMS</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span className="status-pill online">System online</span>
          <p>Response time is within SLA for 94% of active issues.</p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Smart Complaint Management System</p>
            <h2>Operations overview</h2>
          </div>

          <div className="topbar-actions">
            <button className="ghost-btn">Alerts</button>
            <Link to="/complaints/new" className="primary-btn">New complaint</Link>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/complaints" element={<ComplaintsPage complaints={complaints} />} />
          <Route path="/complaints/new" element={<NewComplaintPage onSubmit={handleCreateComplaint} />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
        </Routes>
      </main>
    </div>
  );
}

function HomePage() {
  return (
    <div className="content-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow accent">Citizen-first platform</p>
          <h3>Resolve service issues faster with transparent tracking.</h3>
          <p>
            Track complaints from submission to resolution, monitor SLA compliance,
            and improve citizen satisfaction across departments.
          </p>
          <div className="hero-actions">
            <Link to="/complaints/new" className="primary-btn">File a complaint</Link>
            <Link to="/dashboard" className="ghost-btn">View dashboard</Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="mini-stat">
            <span>Resolved today</span>
            <strong>248</strong>
          </div>
          <div className="mini-stat highlight">
            <span>Pending escalations</span>
            <strong>18</strong>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {[
          { label: 'Total complaints', value: '12,480', trend: '+12.4%' },
          { label: 'SLA compliance', value: '94.2%', trend: '+2.1%' },
          { label: 'Avg. response', value: '4.3h', trend: '-0.8h' },
          { label: 'Citizen satisfaction', value: '4.8/5', trend: '+0.2' }
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.trend}</small>
          </div>
        ))}
      </section>

      <section className="two-column-grid">
        <div className="panel">
          <div className="panel-header">
            <h4>Department workload</h4>
            <span className="chip neutral">This month</span>
          </div>
          <div className="bars">
            {[
              { name: 'Water', value: 78 },
              { name: 'Roads', value: 64 },
              { name: 'Sanitation', value: 82 },
              { name: 'Electricity', value: 70 }
            ].map((bar) => (
              <div key={bar.name} className="bar-row">
                <label>{bar.name}</label>
                <div className="bar-track">
                  <span style={{ width: `${bar.value}%` }} />
                </div>
                <strong>{bar.value}%</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h4>Latest updates</h4>
            <span className="chip blue">Live</span>
          </div>
          <ul className="activity-list">
            <li><span className="dot green" /> Complaint CMP-1048 assigned to Sanitation team.</li>
            <li><span className="dot amber" /> SLA warning raised for road maintenance issue.</li>
            <li><span className="dot blue" /> New public complaint received from Ward 12.</li>
            <li><span className="dot red" /> Electricity issue escalated to the admin desk.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="content-stack">
      <section className="stats-grid compact">
        {[
          { label: 'Open complaints', value: '1,284', tone: 'blue' },
          { label: 'Resolved', value: '3,612', tone: 'green' },
          { label: 'Overdue', value: '96', tone: 'red' },
          { label: 'Avg. resolution', value: '7.2 days', tone: 'amber' }
        ].map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.tone}`}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </section>

      <section className="two-column-grid">
        <div className="panel">
          <div className="panel-header">
            <h4>Complaint status</h4>
            <span className="chip neutral">Last 30 days</span>
          </div>
          <div className="chart-box">
            {['38%', '72%', '54%', '81%', '66%', '90%', '76%'].map((height, index) => (
              <span key={index} style={{ height }} />
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h4>Priority overview</h4>
            <span className="chip blue">Today</span>
          </div>
          <div className="priority-list">
            <div><span className="priority-dot critical" /> Critical <strong>18</strong></div>
            <div><span className="priority-dot high" /> High <strong>42</strong></div>
            <div><span className="priority-dot medium" /> Medium <strong>76</strong></div>
            <div><span className="priority-dot low" /> Low <strong>34</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ComplaintsPage({ complaints }: { complaints: ComplaintItem[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <h4>Complaint register</h4>
        <div className="page-actions">
          <Link to="/complaints/new" className="primary-btn small">New complaint</Link>
          <button className="primary-btn small">Export</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Complaint ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Department</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.title}</td>
              <td><span className="status-badge assigned">{item.status}</span></td>
              <td><span className={`priority-badge ${item.priority.toLowerCase()}`}>{item.priority}</span></td>
              <td>{item.department}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function NewComplaintPage({ onSubmit }: { onSubmit: (item: ComplaintItem) => void }) {
  const [form, setForm] = useState({
    title: '',
    category: 'Water Supply',
    department: 'Public Works',
    priority: 'Medium',
    description: ''
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    const newComplaint: ComplaintItem = {
      id: `CMP-${String(Date.now()).slice(-5)}`,
      title: form.title.trim(),
      status: 'Submitted',
      priority: form.priority as ComplaintItem['priority'],
      department: form.department,
      description: form.description.trim() || 'No additional details provided.'
    };

    onSubmit(newComplaint);
    setForm({ title: '', category: 'Water Supply', department: 'Public Works', priority: 'Medium', description: '' });
  };

  return (
    <section className="panel form-panel">
      <div className="panel-header">
        <h4>File a complaint</h4>
        <Link to="/complaints" className="ghost-btn small">Back to list</Link>
      </div>

      <form className="complaint-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="form-field">
            <span>Complaint title</span>
            <input name="title" value={form.title} onChange={handleChange} placeholder="Streetlight outage near market" required />
          </label>

          <label className="form-field">
            <span>Category</span>
            <select name="category" value={form.category} onChange={handleChange}>
              <option>Water Supply</option>
              <option>Roads & Transport</option>
              <option>Sanitation</option>
              <option>Electricity</option>
              <option>Public Safety</option>
            </select>
          </label>

          <label className="form-field">
            <span>Department</span>
            <select name="department" value={form.department} onChange={handleChange}>
              <option>Public Works</option>
              <option>Water Supply</option>
              <option>Sanitation</option>
              <option>Electricity</option>
              <option>Health Services</option>
            </select>
          </label>

          <label className="form-field">
            <span>Priority</span>
            <select name="priority" value={form.priority} onChange={handleChange}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </label>
        </div>

        <label className="form-field full-width">
          <span>Issue details</span>
          <textarea name="description" value={form.description} onChange={handleChange} rows={6} placeholder="Describe the issue, its location, and any impact on residents." />
        </label>

        <div className="page-actions submit-actions">
          <button type="submit" className="primary-btn">Submit complaint</button>
        </div>
      </form>
    </section>
  );
}

function ReportsPage() {
  return (
    <div className="content-stack">
      <section className="stats-grid compact">
        {[
          { label: 'Department reports', value: '12', tone: 'blue' },
          { label: 'SLA breaches', value: '4', tone: 'red' },
          { label: 'Monthly trend', value: '+18%', tone: 'green' },
          { label: 'User rating', value: '4.8', tone: 'amber' }
        ].map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.tone}`}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h4>Monthly complaint volume</h4>
          <span className="chip neutral">Updated daily</span>
        </div>
        <div className="report-grid">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => (
            <div className="report-item" key={month}>
              <div className="report-bar" style={{ height: `${55 + (index * 8)}%` }} />
              <span>{month}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function NotificationsPage() {
  const notifications = [
    { title: 'Complaint acknowledged', body: 'CMP-1048 has been acknowledged by the Water Department.', time: '2 min ago' },
    { title: 'Escalation alert', body: 'Requested review for high-priority road issue.', time: '28 min ago' },
    { title: 'Feedback received', body: 'Citizen rated your resolution as 5 stars.', time: '1 hr ago' }
  ];

  return (
    <section className="panel">
      <div className="panel-header">
        <h4>Notifications</h4>
        <button className="ghost-btn small">Mark all read</button>
      </div>

      <div className="notification-list">
        {notifications.map((item) => (
          <div key={item.title} className="notification-item">
            <div className="dot blue" />
            <div>
              <h5>{item.title}</h5>
              <p>{item.body}</p>
            </div>
            <small>{item.time}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfilePage() {
  return (
    <section className="panel profile-panel">
      <div className="profile-header">
        <div className="avatar">VP</div>
        <div>
          <h4>Vivek Patil</h4>
          <p>Administrator • Public Works</p>
        </div>
      </div>

      <div className="profile-grid">
        <div><label>Name</label><p>Vivek Patil</p></div>
        <div><label>Email</label><p>vivek@example.com</p></div>
        <div><label>Role</label><p>Admin</p></div>
        <div><label>Region</label><p>Ward 7</p></div>
      </div>
    </section>
  );
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      if (mode === 'register') {
        await fetchJson('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            password: form.password,
            phoneNumber: ''
          })
        });
      }

      const result = await fetchJson<{ accessToken?: string; refreshToken?: string; tokenType?: string; expiresIn?: number }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password })
      });

      if (!result.accessToken) {
        throw new Error('No token returned by the server.');
      }

      localStorage.setItem('scms_token', result.accessToken);
      navigate('/complaints');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Authentication failed.');
    }
  };

  return (
    <section className="auth-card">
      <div className="auth-panel">
        <h3>{mode === 'login' ? 'Welcome back' : 'Create an account'}</h3>
        <p>{mode === 'login' ? 'Sign in to your dashboard.' : 'Join the complaint management portal.'}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <input type="text" name="firstName" value={form.firstName} onChange={handleChange} placeholder="First name" required />
              <input type="text" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last name" required />
            </>
          )}
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email address" required />
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" required />
          {mode === 'register' && (
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm password" required />
          )}
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="primary-btn full-width">
            {mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      </div>
    </section>
  );
}
