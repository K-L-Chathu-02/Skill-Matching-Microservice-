import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUpload = ({ onFileSelect, selectedFile }) => {
    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            onFileSelect(acceptedFiles[0]);
        }
    }, [onFileSelect]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf']
        },
        multiple: false
    });

    return (
        <div>
            <div
                {...getRootProps()}
                className={`file-upload ${isDragActive ? 'drag-active' : ''}`}
            >
                <input {...getInputProps()} />
                <div className="file-upload-icon">📄</div>
                {isDragActive ? (
                    <div className="file-upload-text">
                        Drop the PDF file here...
                    </div>
                ) : (
                    <div className="file-upload-text">
                        Drag & drop a PDF file here, or click to select
                        <br />
                        <small>Powered by Node.js backend with pdf-poppler</small>
                    </div>
                )}
            </div>

            {selectedFile && (
                <div className="uploaded-file">
                    ✅ <strong>File selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
            )}
        </div>
    );
};

export default FileUpload;
