import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function ProgramCard({ program, userId, existingImageUrl, onImageUpload }) {
  const [image, setImage] = useState(existingImageUrl || null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const storagePath = `${userId}/${program.id}`;

      // 1. Storage 업로드 (upsert: true = 덮어쓰기)
      const { error: uploadError } = await supabase.storage
        .from('onboarding-images')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. DB에 제출 내역 기록
      const { error: dbError } = await supabase
        .from('onboarding_submissions')
        .upsert(
          { user_id: userId, program_id: program.id, image_url: storagePath, status: 'pending' },
          { onConflict: 'user_id,program_id' }
        );

      if (dbError) throw dbError;

      // 3. Signed URL 생성 (1시간 유효)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('onboarding-images')
        .createSignedUrl(storagePath, 3600);

      if (urlError) throw urlError;

      setImage(urlData.signedUrl);
      onImageUpload(program.id, urlData.signedUrl);
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="program-card"
      onClick={() => !uploading && document.getElementById(`file-${program.id}`).click()}
    >
      <input
        type="file"
        id={`file-${program.id}`}
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {uploading ? (
        <div className="upload-placeholder">
          <p>업로드 중...</p>
        </div>
      ) : image ? (
        <div className="image-preview">
          <img src={image} alt={program.title} />
        </div>
      ) : (
        <div className="upload-placeholder">
          <div className="upload-icon">📷</div>
          <h3>{program.title}</h3>
          <p>{program.description}</p>
        </div>
      )}
    </div>
  );
}

export default ProgramCard;
