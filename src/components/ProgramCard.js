import React, { useState } from 'react';

function ProgramCard({ program, onImageUpload }) {
  const [image, setImage] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        onImageUpload(program.id, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="program-card" onClick={() => document.getElementById(`file-${program.id}`).click()}>
      <input
        type="file"
        id={`file-${program.id}`}
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {image ? (
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
