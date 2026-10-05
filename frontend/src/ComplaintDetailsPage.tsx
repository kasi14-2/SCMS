import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

type ComplaintDetails = {
  id: number;
  complaintNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  departmentName: string | null;
  submitterName: string;
  createdAt: string;
  attachments: { id: number; fileName: string; fileType: string }[];
};

const apiBase = 'http://localhost:8080';
const progressSteps = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

function displayStatus(status: string) {
  if (status === 'RESOLVED') return 'Success';
  return status.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

export default function ComplaintDetailsPage() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState<ComplaintDetails | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    const objectUrls: string[] = [];
    const token = localStorage.getItem('scms_token') ?? '';

    void fetch(`${apiBase}/api/complaints/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load this report.');
        return await response.json() as ComplaintDetails;
      })
      .then(async (detail) => {
        const imageAttachments = detail.attachments.filter((attachment) => attachment.fileType.startsWith('image/'));
        const previews = await Promise.all(imageAttachments.map(async (attachment) => {
          const response = await fetch(`${apiBase}/api/complaints/${detail.id}/attachments/${attachment.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) return [attachment.id, ''] as const;
          const objectUrl = URL.createObjectURL(await response.blob());
          objectUrls.push(objectUrl);
          return [attachment.id, objectUrl] as const;
        }));
        if (!disposed) {
          setComplaint(detail);
          setPreviewUrls(Object.fromEntries(previews.filter(([, url]) => url)));
        }
      })
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Could not load this report.'));

    return () => {
      disposed = true;
      objectUrls.forEach(URL.revokeObjectURL);
    };
  }, [id]);

  const downloadAttachment = async (attachment: ComplaintDetails['attachments'][number]) => {
    if (!complaint) return;
    const response = await fetch(`${apiBase}/api/complaints/${complaint.id}/attachments/${attachment.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('scms_token') ?? ''}` }
    });
    if (!response.ok) return;
    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = attachment.fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  if (error) return <div className="content-stack portal-content"><div className="auth-error" role="alert">{error}</div><Link className="text-action" to="/dashboard">Back to dashboard</Link></div>;
  if (!complaint) return <div className="loading-screen">Loading report…</div>;

  const currentStep = progressSteps.indexOf(complaint.status);
  const rejected = complaint.status === 'REJECTED';

  return (
    <div className="content-stack portal-content details-content">
      <section className="portal-heading">
        <div><p className="eyebrow">Report details · {complaint.complaintNumber}</p><h3>{complaint.title}</h3></div>
        <Link to="/dashboard" className="ghost-btn">Back to dashboard</Link>
      </section>
      <div className="details-layout">
        <section className="panel details-main">
          <div className="details-meta">
            <span className={`status-badge status-${complaint.status.toLowerCase()}`}>{displayStatus(complaint.status)}</span>
            <span className={`priority-badge ${complaint.priority.toLowerCase()}`}>{displayStatus(complaint.priority)}</span>
            <span className="muted-copy">Reported {new Date(complaint.createdAt).toLocaleString()}</span>
          </div>
          <h4>What happened</h4>
          <p className="details-description">{complaint.description}</p>
          <h4>Progress</h4>
          {rejected ? <p className="rejected-note">This report was rejected. Contact the service desk if you need more information.</p> : (
            <ol className="progress-track">{progressSteps.map((step, index) => <li className={index <= currentStep ? 'complete' : ''} key={step}><span className="progress-node" /><span>{displayStatus(step)}</span></li>)}</ol>
          )}
          <h4>Evidence</h4>
          {complaint.attachments.length === 0 ? <p className="muted-copy">No evidence was attached.</p> : (
            <div className="evidence-gallery">{complaint.attachments.map((attachment) => previewUrls[attachment.id] ? (
              <a className="evidence-image" href={previewUrls[attachment.id]} target="_blank" rel="noreferrer" key={attachment.id}>
                <img src={previewUrls[attachment.id]} alt={attachment.fileName} /><span>{attachment.fileName}</span>
              </a>
            ) : (
              <button className="evidence-file" key={attachment.id} onClick={() => void downloadAttachment(attachment)}><span className="file-preview-mark">PDF</span>{attachment.fileName}</button>
            ))}</div>
          )}
        </section>
        <aside className="panel details-aside">
          <p className="eyebrow">Handling team</p><h4>{complaint.departmentName ?? 'Awaiting assignment'}</h4>
          <div className="details-divider" />
          <p className="eyebrow">Submitted by</p><p>{complaint.submitterName}</p>
          <div className="details-divider" />
          <p className="eyebrow">Reference</p><strong>{complaint.complaintNumber}</strong>
        </aside>
      </div>
    </div>
  );
}
