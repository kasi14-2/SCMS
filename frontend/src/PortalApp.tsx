import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import ComplaintDetailsPage from './ComplaintDetailsPage';
import InsightsPage from './InsightsPage';

type SessionUser = {
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
};

type Complaint = {
  id: number;
  complaintNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  departmentId: number | null;
  departmentName: string | null;
  submitterName: string;
  submitterEmail: string;
  createdAt: string;
  attachments: { id: number; fileName: string; fileType: string }[];
};

type Department = { id: number; name: string; description: string | null };
type NotificationItem = { id: number; title: string; message: string; read: boolean; createdAt: string };
type Page<T> = { content: T[]; totalElements: number };

const apiBase = 'http://localhost:8080';
const statuses = ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const headers = new Headers(options.headers);
  const token = localStorage.getItem('scms_token');
  if (!isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  if (!response.ok) {
    const raw = await response.text();
    let message = raw || response.statusText || 'Request failed';
    try {
      message = JSON.parse(raw).message || message;
    } catch {
      // Keep the raw response when the server did not return JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function isAdmin(user: SessionUser) {
  return user.roles.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN');
}

function displayStatus(status: string) {
  if (status === 'RESOLVED') return 'Success';
  return status.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

export default function PortalApp() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('scms_token')) {
      setCheckingSession(false);
      return;
    }
    void api<SessionUser>('/api/users/me')
      .then(setSession)
      .catch(() => {
        localStorage.removeItem('scms_token');
        localStorage.removeItem('scms_role');
      })
      .finally(() => setCheckingSession(false));
  }, []);

  const acceptSession = (user: SessionUser) => {
    setSession(user);
    localStorage.setItem('scms_role', user.roles[0] ?? 'CITIZEN');
    navigate('/dashboard', { replace: true });
  };

  const signOut = () => {
    localStorage.removeItem('scms_token');
    localStorage.removeItem('scms_role');
    setSession(null);
    navigate('/login', { replace: true });
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<AccessPage onAuthenticated={acceptSession} />} />
      <Route path="/register" element={<AccessPage startWithRegistration onAuthenticated={acceptSession} />} />
      <Route element={<RequireSession user={session} checking={checkingSession} />}>
        <Route element={<PortalLayout user={session!} onSignOut={signOut} />}>
          <Route path="/dashboard" element={<Dashboard user={session!} />} />
          <Route path="/complaints/new" element={<NewComplaint />} />
          <Route path="/complaints/:id" element={<ComplaintDetailsPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/insights" element={<AdminInsightsRoute user={session} />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequireSession({ user, checking }: { user: SessionUser | null; checking: boolean }) {
  if (checking) return <div className="loading-screen">Loading your workspace…</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminInsightsRoute({ user }: { user: SessionUser | null }) {
  if (!user) return <Navigate to="/login" replace />;
  return isAdmin(user) ? <InsightsPage /> : <Navigate to="/dashboard" replace />;
}

function PortalLayout({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  const admin = isAdmin(user);
  return (
    <div className="app-shell portal-shell">
      <aside className="sidebar">
        <Link className="brand-block portal-brand" to="/dashboard">
          <span className="brand-mark">SC</span>
          <span><span className="eyebrow">Public service</span><strong>SCMS</strong></span>
        </Link>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
          {admin && <NavLink to="/insights" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Insights</NavLink>}
          {!admin && <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Notifications</NavLink>}
        </nav>
        <div className="sidebar-identity">
          <span className="role-mark">{admin ? 'A' : 'C'}</span>
          <span><strong>{admin ? 'Administrator' : `${user.firstName} ${user.lastName}`}</strong><small>{admin ? 'Operations access' : user.email}</small></span>
        </div>
        <button className="signout-btn" onClick={onSignOut}>Sign out</button>
      </aside>
      <main className="main-panel">
        <header className="topbar portal-topbar">
          <div>
            <p className="eyebrow">Smart Complaint Management System</p>
            <h2>{admin ? 'Service desk' : 'My service requests'}</h2>
          </div>
          {!admin && <Link to="/complaints/new" className="primary-btn">＋ Report an issue</Link>}
        </header>
        <Outlet />
      </main>
    </div>
  );
}

function Dashboard({ user }: { user: SessionUser }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [streamConnected, setStreamConnected] = useState(false);
  const [liveNotification, setLiveNotification] = useState<NotificationItem | null>(null);
  const admin = isAdmin(user);

  useEffect(() => {
    setLoading(true);
    const requests: Promise<unknown>[] = [api<Page<Complaint>>('/api/complaints?page=0&size=100')];
    if (admin) requests.push(api<Department[]>('/api/departments'));
    else requests.push(api<NotificationItem[]>('/api/notifications'));
    void Promise.all(requests)
      .then(([page, secondary]) => {
        setComplaints((page as Page<Complaint>).content ?? []);
        if (admin) setDepartments(secondary as Department[]);
        else setNotifications(secondary as NotificationItem[]);
        setError('');
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load your dashboard.'))
      .finally(() => setLoading(false));
  }, [admin, refreshKey]);

  useEffect(() => {
    if (admin) return;

    const controller = new AbortController();
    let reconnectTimer: number | undefined;

    const connect = async () => {
      while (!controller.signal.aborted) {
        try {
          const token = localStorage.getItem('scms_token');
          if (!token) return;
          const response = await fetch(`${apiBase}/api/notifications/stream`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal
          });
          if (!response.ok || !response.body) throw new Error('Notification stream unavailable');
          setStreamConnected(true);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (!controller.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split(/\r?\n\r?\n/);
            buffer = frames.pop() ?? '';
            for (const frame of frames) {
              const data = frame.split(/\r?\n/)
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.slice(5).trimStart())
                .join('\n');
              if (!data) continue;
              const notification = JSON.parse(data) as NotificationItem;
              setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
              setLiveNotification(notification);
            }
          }
        } catch {
          if (controller.signal.aborted) return;
          setStreamConnected(false);
        }

        if (!controller.signal.aborted) {
          await new Promise<void>((resolve) => {
            reconnectTimer = window.setTimeout(resolve, 2500);
          });
        }
      }
    };

    void connect();
    return () => {
      controller.abort();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
    };
  }, [admin]);

  useEffect(() => {
    if (!liveNotification) return;
    const timeout = window.setTimeout(() => setLiveNotification(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [liveNotification]);

  const updateStatus = async (complaint: Complaint, status: string) => {
    try {
      await api(`/api/complaints/${complaint.id}/status?status=${status}`, { method: 'PATCH' });
      setRefreshKey((current) => current + 1);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update this complaint.');
    }
  };

  const assignDepartment = async (complaint: Complaint) => {
    const departmentId = assignments[complaint.id] ?? String(complaint.departmentId ?? '');
    if (!departmentId) return;
    try {
      await api(`/api/complaints/${complaint.id}/assign?departmentId=${departmentId}`, { method: 'PATCH' });
      setRefreshKey((current) => current + 1);
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Could not assign this complaint.');
    }
  };

  const openCount = complaints.filter((item) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(item.status)).length;
  const resolvedCount = complaints.filter((item) => ['RESOLVED', 'CLOSED'].includes(item.status)).length;
  const assignedCount = complaints.filter((item) => item.departmentId !== null).length;

  return (
    <div className="content-stack portal-content">
      <section className="portal-heading">
        <div><p className="eyebrow">{admin ? 'Triage and resolution' : 'Your reports'}</p><h3>{admin ? 'Complaint queue' : 'Track your requests'}</h3></div>
        <span className="live-indicator"><i className={!admin && !streamConnected ? 'connecting' : ''} /> {admin ? 'Live records' : streamConnected ? 'Live updates' : 'Connecting'}</span>
      </section>
      {!admin && liveNotification && <aside className="live-toast" role="status"><div><p>New update</p><strong>{liveNotification.title}</strong><span>{liveNotification.message}</span></div><button aria-label="Dismiss notification" onClick={() => setLiveNotification(null)}>×</button></aside>}
      <section className="stats-grid portal-stats" aria-label="Complaint totals">
        <div className="stat-card"><span>Total reports</span><strong>{complaints.length}</strong></div>
        <div className="stat-card"><span>Open</span><strong>{openCount}</strong></div>
        <div className="stat-card"><span>Assigned</span><strong>{assignedCount}</strong></div>
        <div className="stat-card"><span>Resolved</span><strong>{resolvedCount}</strong></div>
      </section>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <section className="panel table-panel portal-table-panel">
        <div className="panel-header"><div><h4>{admin ? 'All submitted issues' : 'Your submitted issues'}</h4><p>{admin ? 'Review reports, assign a department, and update progress.' : 'Updates to your reports appear here as they are handled.'}</p></div></div>
        {loading ? <div className="empty-state">Loading complaints…</div> : complaints.length === 0 ? (
          <div className="empty-state"><span className="empty-mark">＋</span><h4>No reports yet</h4><p>{admin ? 'New resident reports will appear in this queue.' : 'When you report an issue, its status and updates will appear here.'}</p>{!admin && <Link to="/complaints/new" className="primary-btn">Report an issue</Link>}</div>
        ) : (
          <div className="table-scroll"><table>
            <thead><tr><th>Reference / issue</th>{admin && <th>Resident</th>}<th>Status</th><th>Priority</th><th>Department</th><th>Evidence</th>{admin && <th>Actions</th>}</tr></thead>
            <tbody>{complaints.map((complaint) => (
              <tr key={complaint.id}>
                <td><strong className="reference-id">{complaint.complaintNumber}</strong><Link className="issue-title issue-link" to={`/complaints/${complaint.id}`}>{complaint.title}</Link><small>{new Date(complaint.createdAt).toLocaleDateString()}</small></td>
                {admin && <td><span>{complaint.submitterName}</span><small>{complaint.submitterEmail}</small></td>}
                <td>{admin ? <select className="table-select" aria-label={`Status for ${complaint.complaintNumber}`} value={complaint.status} onChange={(event) => void updateStatus(complaint, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}</select> : <span className={`status-badge status-${complaint.status.toLowerCase()}`}>{displayStatus(complaint.status)}</span>}</td>
                <td><span className={`priority-badge ${complaint.priority.toLowerCase()}`}>{displayStatus(complaint.priority)}</span></td>
                <td>{admin ? <div className="assign-control"><select className="table-select" aria-label={`Department for ${complaint.complaintNumber}`} value={assignments[complaint.id] ?? String(complaint.departmentId ?? '')} onChange={(event) => setAssignments((current) => ({ ...current, [complaint.id]: event.target.value }))}><option value="">Choose department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><button className="text-action" onClick={() => void assignDepartment(complaint)}>Assign</button></div> : complaint.departmentName ?? 'Awaiting assignment'}</td>
                <td>{complaint.attachments.length ? <div className="attachment-list">{complaint.attachments.map((attachment) => <button key={attachment.id} className="attachment-link" onClick={() => void downloadAttachment(complaint.id, attachment)}>{attachment.fileName}</button>)}</div> : <span className="muted-copy">None</span>}</td>
                {admin && <td><span className="muted-copy">{complaint.description}</span></td>}
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      {!admin && notifications.length > 0 && <section className="panel recent-updates"><div className="panel-header"><div><h4>Recent updates</h4><p>Messages about your complaint progress.</p></div><Link to="/notifications" className="text-action">View all</Link></div>{notifications.slice(0, 3).map((item) => <article className="notification-item" key={item.id}><span className="notification-dot" /><div><h5>{item.title}</h5><p>{item.message}</p></div><small>{new Date(item.createdAt).toLocaleDateString()}</small></article>)}</section>}
    </div>
  );
}

async function downloadAttachment(complaintId: number, attachment: Complaint['attachments'][number]) {
  const response = await fetch(`${apiBase}/api/complaints/${complaintId}/attachments/${attachment.id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('scms_token') ?? ''}` }
  });
  if (!response.ok) return;
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = attachment.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function NewComplaint() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [landmark, setLandmark] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const data = new FormData();
    data.set('title', title.trim());
    data.set('description', description.trim());
    data.set('priority', priority);
    if (landmark.trim()) data.set('landmark', landmark.trim());
    files.forEach((file) => data.append('files', file));
    try {
      await api<Complaint>('/api/complaints', { method: 'POST', body: data });
      navigate('/dashboard');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit this report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content-stack portal-content">
      <section className="portal-heading"><div><p className="eyebrow">New report</p><h3>Describe the issue</h3></div><Link to="/dashboard" className="ghost-btn">Back to dashboard</Link></section>
      <section className="panel report-form-panel">
        <form className="complaint-form" onSubmit={submit}>
          <label className="form-field"><span>Issue title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} placeholder="A short summary of the problem" required /></label>
          <label className="form-field"><span>What happened?</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={6} maxLength={4000} placeholder="Describe the problem, where it is, and who or what is affected." required /></label>
          <div className="form-grid">
            <label className="form-field"><span>Urgency</span><select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="LOW">Low</option><option value="MEDIUM">Normal</option><option value="HIGH">High</option><option value="CRITICAL">Urgent</option></select></label>
            <label className="form-field"><span>Location or landmark</span><input value={landmark} onChange={(event) => setLandmark(event.target.value)} maxLength={255} placeholder="Street, area, or nearby landmark" /></label>
          </div>
          <label className="form-field upload-field"><span>Photos or documents</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /><small>JPEG, PNG, WebP, or PDF. Up to 10 MB per file.</small></label>
          {files.length > 0 && <div className="selected-evidence">{files.map((file) => <SelectedEvidence key={`${file.name}-${file.size}`} file={file} />)}</div>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="submit-actions"><button type="submit" className="primary-btn" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit report'}</button></div>
        </form>
      </section>
    </div>
  );
}

function SelectedEvidence({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const fileLabel = file.type === 'application/pdf' ? 'PDF' : 'FILE';
  return (
    <div className="selected-evidence-item">
      {previewUrl ? <img src={previewUrl} alt={`Preview of ${file.name}`} /> : <span className="file-preview-mark">{fileLabel}</span>}
      <span className="selected-evidence-name">{file.name}<small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></span>
    </div>
  );
}

function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void api<NotificationItem[]>('/api/notifications').then(setNotifications)
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Could not load notifications.'));
  }, []);
  return <div className="content-stack portal-content"><section className="portal-heading"><div><p className="eyebrow">Updates</p><h3>Notifications</h3></div></section>{error && <div className="auth-error" role="alert">{error}</div>}<section className="panel notification-panel">{notifications.length === 0 ? <div className="empty-state"><h4>No updates yet</h4><p>Updates about your reports will appear here.</p></div> : notifications.map((item) => <article className="notification-item" key={item.id}><span className="notification-dot" /><div><h5>{item.title}</h5><p>{item.message}</p></div><small>{new Date(item.createdAt).toLocaleString()}</small></article>)}</section></div>;
}

function AccessPage({ onAuthenticated, startWithRegistration = false }: { onAuthenticated: (user: SessionUser) => void; startWithRegistration?: boolean }) {
  const [mode, setMode] = useState<'login' | 'register'>(startWithRegistration ? 'register' : 'login');
  const [accountType, setAccountType] = useState<'resident' | 'admin'>('resident');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ firstName, lastName, email: identifier, password, phoneNumber: '' }) });
      }
      const loginKey = accountType === 'admin' ? 'admin' : identifier;
      const result = await api<{ accessToken: string; roles: string[] }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: loginKey, password }) });
      localStorage.setItem('scms_token', result.accessToken);
      const profile = await api<SessionUser>('/api/users/me');
      onAuthenticated({ ...profile, roles: profile.roles ?? result.roles ?? [] });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="access-screen">
      <div className="access-brand"><span className="brand-mark">SC</span><div><span className="eyebrow">Public service</span><strong>SCMS</strong></div></div>
      <section className="access-panel">
        <div className="access-heading"><p className="eyebrow">Smart Complaint Management System</p><h1>{mode === 'login' ? 'Your city, heard.' : 'Create your account.'}</h1><p>{mode === 'login' ? 'Sign in to report and follow local service issues.' : 'Create a resident account to report and track issues.'}</p></div>
        <div className="segmented-control" role="group" aria-label="Account type"><button className={accountType === 'resident' ? 'selected' : ''} onClick={() => { setAccountType('resident'); setIdentifier(''); }}>Resident</button><button className={accountType === 'admin' ? 'selected' : ''} onClick={() => { setAccountType('admin'); setMode('login'); setIdentifier('admin'); }}>Administrator</button></div>
        {accountType === 'admin' && <p className="admin-hint">Use the administrator username and password provided by your system owner.</p>}
        <form className="access-form" onSubmit={submit}>
          {mode === 'register' && <div className="form-grid"><label className="form-field"><span>First name</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required /></label><label className="form-field"><span>Last name</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required /></label></div>}
          <label className="form-field"><span>{mode === 'register' || accountType === 'resident' ? 'Email address' : 'Username'}</span><input type={mode === 'register' || accountType === 'resident' ? 'email' : 'text'} value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" placeholder={accountType === 'admin' ? 'admin' : 'you@example.com'} readOnly={accountType === 'admin'} required /></label>
          <label className="form-field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : undefined} required /></label>
          {mode === 'register' && <label className="form-field"><span>Confirm password</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button type="submit" className="primary-btn access-submit" disabled={submitting}>{submitting ? 'Please wait…' : mode === 'register' ? 'Create account and sign in' : 'Sign in'}</button>
        </form>
        {accountType === 'resident' && <p className="access-switch">{mode === 'login' ? 'New to the service?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}> {mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>}
      </section>
      <footer className="access-footer">Service requests are shared only with the teams handling them.</footer>
    </main>
  );
}