// src/components/common/TeaCard.js
import React from 'react';
import { Clock, Trash } from 'lucide-react';

// Memoize the component to prevent unnecessary re-renders
const TeaCard = React.memo(({ 
  tea, 
  onEditClick, 
  onDeleteClick, 
  onSessionHistoryToggle, 
  isExpanded,
  onSessionClick,
  onTeaCardClick 
}) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div id={`tea-${tea.id}`} className="tea-card">
      <div 
        className="tea-card-main"
        onClick={onTeaCardClick}
      >
        <div className="tea-info">
          <h3 className="tea-name">{tea.name}</h3>
          <div className="tea-details">
            {tea.type && <span className="tea-tag">{tea.type}</span>}
            {tea.vendor && <span className="tea-tag">{tea.vendor}</span>}
            {tea.year && <span className="tea-tag">{tea.year}</span>}
          </div>
          {tea.sessionCount > 0 && (
            <div className="tea-stats">
              <span 
                className="session-count clickable-stat"
                onClick={(e) => {
                  e.stopPropagation();
                  onSessionHistoryToggle(tea.id);
                }}
                title="View all brewing sessions"
              >
                <span className="stat-icon">📋</span> {tea.sessionCount} session{tea.sessionCount !== 1 ? 's' : ''}
              </span>
              {tea.lastBrewed && tea.sessions && tea.sessions.length > 0 && (
                <span 
                  className="last-brewed clickable-stat"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSessionClick(tea.sessions[0]);
                  }}
                  title="Go to most recent session"
                >
                  <span className="stat-icon">🕒</span> Last: {formatDate(tea.lastBrewed)}
                </span>
              )}
            </div>
          )}
          {tea.notes && <p className="tea-notes">{tea.notes}</p>}
        </div>
      </div>
      
      <button 
        className="card-delete-button" 
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick(e, tea);
        }}
        aria-label="Delete tea"
      >
        <Trash size={16} />
      </button>
      
      {/* Session History */}
      {isExpanded && (
        <div className="session-history">
          <h4 className="history-title">Brewing History</h4>
          {tea.sessions && tea.sessions.length > 0 ? (
            <div className="session-list">
              {tea.sessions.map(session => (
                <div 
                  key={session.id} 
                  className="history-session"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSessionClick(session);
                  }}
                >
                  <div className="session-date">
                    <Clock size={12} />
                    <span>{formatDate(session.timestamp)}</span>
                  </div>
                  {session.notes && (
                    <p className="session-history-notes">{session.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-history">No brewing sessions recorded yet.</p>
          )}
        </div>
      )}
    </div>
  );
});

export default TeaCard;