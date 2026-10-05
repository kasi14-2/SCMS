import { useEffect, useState } from 'react';

type Complaint = {
  id: number;
  complaintNumber: string;
  title: string;
  status: string;
  priority: string;
  departmentId: number | null;
  departmentName: string | null;
  createdAt: string;
};

type Page<T> = { content: T[] };

const apiBase = 'http://localhost:8080';
const statusGroups = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

function displayStatus(status: string) {
  if (status === 'RESOLVED') return 'Success';
  return status.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

export default function InsightsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('scms_token') ?? '';
    void fetch(`${apiBase}/api/complaints?page=0&size=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load service insights.');
        return await response.json() as Page<Complaint>;
      })
      .then((page) => setComplaints(page.content ?? []))
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Could not load service insights.'))
      .finally(() => setLoading(false));
  }, []);

  const statuses = statusGroups.map((status) => ({
    status,
    count: complaints.filter((complaint) => complaint.status === status).length
  }));
  const departments = complaints.reduce<Record<string, number>>((counts, complaint) => {
    const name = complaint.departmentName ?? 'Awaiting assignment';
    counts[name] = (counts[name] ?? 0) + 1;
    return counts;
  }, {});
  const maximumDepartmentCount = Math.max(1, ...Object.values(departments));
  const urgentCount = complaints.filter((complaint) => ['HIGH', 'CRITICAL'].includes(complaint.priority)).length;
  const unassignedCount = complaints.filter((complaint) => !complaint.departmentId).length;

  return (
    <div className="content-stack portal-content insights-content">
      <section className="portal-heading">
        <div><p className="eyebrow">Operations</p><h3>Service insights</h3></div>
        <span className="live-indicator"><i /> Live records</span>
      </section>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Loading insights…</div> : <>
        <section className="insights-overview">
          <div><span>Reports in queue</span><strong>{complaints.length}</strong></div>
          <div><span>Awaiting assignment</span><strong>{unassignedCount}</strong></div>
          <div><span>High urgency</span><strong>{urgentCount}</strong></div>
          <div><span>Successful</span><strong>{statuses.find((item) => item.status === 'RESOLVED')?.count ?? 0}</strong></div>
        </section>
        <div className="insights-grid">
          <section className="panel insight-panel">
            <div className="panel-header"><div><h4>Progress by status</h4><p>Current reports across the queue.</p></div></div>
            {statuses.map(({ status, count }) => <div className="insight-bar-row" key={status}>
              <span>{displayStatus(status)}</span><div className="insight-track"><i style={{ width: `${complaints.length ? (count / complaints.length) * 100 : 0}%` }} /></div><strong>{count}</strong>
            </div>)}
          </section>
          <section className="panel insight-panel">
            <div className="panel-header"><div><h4>Department workload</h4><p>Reports grouped by assigned team.</p></div></div>
            {Object.keys(departments).length === 0 ? <p className="muted-copy">No reports have been submitted yet.</p> : Object.entries(departments).sort((first, second) => second[1] - first[1]).map(([department, count]) => <div className="insight-bar-row" key={department}>
              <span>{department}</span><div className="insight-track"><i style={{ width: `${(count / maximumDepartmentCount) * 100}%` }} /></div><strong>{count}</strong>
            </div>)}
          </section>
        </div>
      </>}
    </div>
  );
}
