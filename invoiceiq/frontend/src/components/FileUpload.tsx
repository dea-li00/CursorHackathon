import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, isUploading }) => {

  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles);
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    multiple: true,
    disabled: isUploading
  });

  const rootProps = getRootProps({
    className: [
      'file-upload',
      isDragActive ? 'file-upload--active' : '',
      isUploading ? 'file-upload--disabled' : ''
    ].join(' ').trim()
  });

  return (
    <div
      {...rootProps}
      aria-busy={isUploading}
      data-state={isUploading ? 'uploading' : isDragActive ? 'drag-active' : 'idle'}
    >
      <input {...getInputProps()} />
      <div className="file-upload__content">
        <div className="file-upload__icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 16V4" />
            <path d="m8 12 4 4 4-4" />
            <rect width="20" height="12" x="2" y="8" rx="2" ry="2" />
          </svg>
        </div>

        <div>
          <p className="file-upload__title">
            {isUploading ? 'Uploading…' : 'Upload invoice files'}
          </p>
          <p className="file-upload__subtitle">
            Drag & drop PDF or image files, or click to browse from your machine.
          </p>
        </div>

        <div className="file-upload__legend">
          Supports PDF, PNG, JPG, JPEG
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
