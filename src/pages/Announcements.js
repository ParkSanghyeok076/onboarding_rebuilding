import React, { useState } from 'react';
import './Pages.css';
import AnnouncementCard from '../components/AnnouncementCard';
import { announcements as announcementsData } from '../data/announcements';

function Announcements({ onBack }) {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // 상단 고정 공지사항과 일반 공지사항 분리 및 정렬
  const pinnedAnnouncements = announcementsData
    .filter(a => a.isPinned)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const regularAnnouncements = announcementsData
    .filter(a => !a.isPinned)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const allAnnouncements = [...pinnedAnnouncements, ...regularAnnouncements];

  // 목록 뷰
  if (!selectedAnnouncement) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">
          ← 메뉴로 돌아가기
        </button>

        <div className="announcements-container">
          <h1 className="page-title">📢 공지사항</h1>

          <div className="announcements-grid">
            {allAnnouncements.map(announcement => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onClick={() => setSelectedAnnouncement(announcement)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 상세 뷰
  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">
        ← 메뉴로 돌아가기
      </button>

      <div className="announcements-container">
        <button
          onClick={() => setSelectedAnnouncement(null)}
          className="detail-back-button"
        >
          ← 목록으로 돌아가기
        </button>

        <div className="announcement-detail">
          <div className="announcement-detail-header">
            {selectedAnnouncement.isPinned && (
              <span className="detail-pin-badge">📌 고정 공지</span>
            )}
            <h1 className="announcement-detail-title">
              {selectedAnnouncement.title}
            </h1>
            <div className="announcement-detail-meta">
              <span className="detail-author">{selectedAnnouncement.author}</span>
              <span className="detail-date">{selectedAnnouncement.date}</span>
            </div>
          </div>

          <div
            className="announcement-detail-content"
            dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
          />

          {selectedAnnouncement.pdfUrl && (
            <a
              href={selectedAnnouncement.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-link"
            >
              📎 첨부 파일 열기
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default Announcements;
