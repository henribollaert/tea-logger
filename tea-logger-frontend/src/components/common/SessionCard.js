// src/components/common/SessionCard.js
import React from 'react';
import { Clock, Trash } from 'lucide-react';

const SessionCard = React.memo(({ 
  session, 
  onSessionClick, 
  onDeleteClick 
}) => {
  return (
    <div 
      className="session-card"
      onClick={() => onSessionClick(session)}
    >
      <div className="session-header">
        <div>
          <h3 className="session-title">{session.name}</h3>
          <div className="session-meta">
            {session.vendor && <span className="session-vendor">{session.vendor}</span>}
            {session.type && <span className="session-type">{session.type}</span>}
            {session.age && <span className="session-age">{session.age}</span>}
          </div>
        </div>
        <div className="session-timestamp">
          <Clock size={12} className="timestamp-icon" />
          {new Date(session.timestamp).toLocaleDateString()}
        </div>
      </div>
      {session.notes && (
        <p className="session-notes">{session.notes}</p>
      )}
      <button
        className="card-delete-button"
        onClick={(e) => onDeleteClick(e, session)}
        aria-label="Delete session"
      >
        <Trash size={16} />
      </button>
    </div>
  );
});

export default SessionCard;