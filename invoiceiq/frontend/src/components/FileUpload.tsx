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

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input {...getInputProps()} />
      
      <div className="space-y-4">
      <div className="mx-auto text-gray-400">
        <svg
          width="25"              // hard size (beats most CSS)
          height="25"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="inline-block align-middle shrink-0" // prevents flex growth/line-height weirdness
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}     // thinner at small size
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>


        
        <div>
          <p className="text-lg font-medium text-gray-900">
            {isUploading ? 'Uploading...' : 'Upload Invoice Files'}
          </p>
          <p className="text-sm text-gray-500">
            Drag and drop PDF or image files here, or click to select
          </p>
        </div>
        
        <div className="text-xs text-gray-400">
          Supports: PDF, PNG, JPG, JPEG
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
