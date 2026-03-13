import React, { useState, useEffect } from 'react';
import './Pages.css';
import AnnouncementCard from '../components/AnnouncementCard';
import { supabase } from '../lib/supabase';

function Announcements({ onBack }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (error) {
        console.error('공지사항 로드 실패:', error);
      } else {
        const mapped = data.map(a => ({
          ...a,
          isPinned: a.is_pinned,
          date: a.published_at ? a.published_at.slice(0, 10) : '',
          pdfUrl: a.pdf_url,
        }));
        setAnnouncements(mapped);
      }
      setLoading(false);
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="announcements-container">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  // 목록 뷰
  if (!selectedAnnouncement) {
    return (
      <div className="page-container">
        <div className="announcements-container">
          <h1 className="page-title">📢 공지사항</h1>

          <div className="announcements-grid">
            {announcements.map(announcement => (
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
