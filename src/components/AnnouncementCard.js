import React from 'react';
import './AnnouncementCard.css';

function AnnouncementCard({ announcement, onClick }) {
  return (
    <div
      className={`announcement-card ${announcement.isPinned ? 'pinned' : ''}`}
      onClick={onClick}
    >
      <div className="announcement-header">
        <h3 className="announcement-title">
          {announcement.isPinned && <span className="pin-icon">📌</span>}
          {announcement.title}
        </h3>
        {announcement.pdfUrl && <span className="pdf-icon">📎</span>}
      </div>

      <div className="announcement-meta">
        <span className="announcement-author">{announcement.author}</span>
        <span className="announcement-date">{announcement.date}</span>
      </div>

      <div className="announcement-preview">
        {announcement.content.substring(0, 100).replace(/<[^>]*>/g, '')}...
      </div>
    </div>
  );
}

export default AnnouncementCard;
