import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faFileAlt, faTimes, faCheck } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import "./CSS/Uploadfile.css";

const UploadFile = ({ onClose, onUploadSuccess, projectId, requirementId }) => {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState("");
    const [title, setTitle] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [progress, setProgress] = useState(0);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 10 * 1024 * 1024) {
                setErrorMessage("File size exceeds 10MB. Please upload a smaller file.");
                return;
            }
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setErrorMessage("");
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add("drag-over");
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("drag-over");
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("drag-over");
        
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            if (droppedFile.type !== "application/pdf") {
                setErrorMessage("Only PDF files are accepted.");
                return;
            }
            if (droppedFile.size > 10 * 1024 * 1024) {
                setErrorMessage("File size exceeds 10MB. Please upload a smaller file.");
                return;
            }
            setFile(droppedFile);
            setFileName(droppedFile.name);
            setErrorMessage("");
        }
    };

    const removeFile = () => {
        setFile(null);
        setFileName("");
    };

    const handleSave = async () => {
        if (!file) {
            setErrorMessage("Please select a file.");
            return;
        }
        if (!title.trim()) {
            setErrorMessage("Please enter a title.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("project_id", projectId);
        formData.append("requirement_id", requirementId);

        setIsUploading(true);
        setErrorMessage("");
        setProgress(0);

        try {
            const response = await axios.post("http://localhost:3001/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setProgress(percentCompleted);
                }
            });

            const newFile = response.data;
            
            // Success state - give user visual feedback before closing
            setProgress(100);
            setTimeout(() => {
                if (onUploadSuccess) {
                    onUploadSuccess(newFile);
                }
                onClose();
            }, 1000);
            
        } catch (error) {
            console.error("Error uploading file:", error.response || error.message);
            setErrorMessage(
                error.response?.data?.message || 
                "Failed to upload file. Please try again."
            );
            setProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    const getFileSize = (size) => {
        if (size < 1024) {
            return size + " B";
        } else if (size < 1024 * 1024) {
            return (size / 1024).toFixed(2) + " KB";
        } else {
            return (size / (1024 * 1024)).toFixed(2) + " MB";
        }
    };

    return (
        <div className="upload-file-overlay">
            <div className="upload-file-container">
                <div className="upload-file-header">
                    <h2>Add File</h2>
                    <button 
                        className="upload-file-close" 
                        onClick={onClose} 
                        disabled={isUploading}
                        aria-label="Close"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {errorMessage && (
                    <div className="error-message">
                        <FontAwesomeIcon icon={faTimes} className="error-icon" />
                        {errorMessage}
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="title">Title</label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter descriptive title for this file"
                        disabled={isUploading}
                    />
                </div>

                <div 
                    className={`upload-dropzone ${file ? 'has-file' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {!file ? (
                        <>
                            <FontAwesomeIcon icon={faUpload} className="upload-icon" />
                            <div className="upload-text">
                                <span className="primary-text">
                                    Drag & Drop your file here
                                </span>
                                <span className="secondary-text">
                                    or
                                </span>
                                <label htmlFor="file-upload" className="browse-button">
                                    Browse Files
                                </label>
                            </div>
                            <div className="upload-limits">
                                Only PDF files. Max size: 10MB
                            </div>
                        </>
                    ) : (
                        <div className="file-preview">
                            <div className="file-icon">
                                <FontAwesomeIcon icon={faFileAlt} />
                            </div>
                            <div className="file-details">
                                <div className="file-name">{fileName}</div>
                                <div className="file-size">{getFileSize(file.size)}</div>
                            </div>
                            <button 
                                className="remove-file-button" 
                                onClick={removeFile}
                                disabled={isUploading}
                                aria-label="Remove file"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    )}
                    <input
                        id="file-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                        disabled={isUploading}
                    />
                </div>

                {isUploading && (
                    <div className="progress-container">
                        <div 
                            className="progress-bar" 
                            style={{ width: `${progress}%` }}
                        ></div>
                        <div className="progress-text">{progress}%</div>
                    </div>
                )}

                <div className="actions">
                    <button 
                        className="cancel-button" 
                        onClick={onClose} 
                        disabled={isUploading}
                    >
                        Cancel
                    </button>
                    <button 
                        className="save-button" 
                        onClick={handleSave} 
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <span className="loading-text">
                                <span className="loading-dots"></span>
                                Uploading
                            </span>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} className="button-icon" />
                                Save
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadFile;