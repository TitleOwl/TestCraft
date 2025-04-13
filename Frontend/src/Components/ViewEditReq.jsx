import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CSS/ViewEditReq.css';

// Icons
const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8v4l3 3"></path>
    <circle cx="12" cy="12" r="10"></circle>
  </svg>
);

const RequirementIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const TimeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const StatusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <line x1="9" y1="9" x2="9.01" y2="9"></line>
    <line x1="15" y1="9" x2="15.01" y2="9"></line>
  </svg>
);

const TypeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7"></polyline>
    <line x1="9" y1="20" x2="15" y2="20"></line>
    <line x1="12" y1="4" x2="12" y2="20"></line>
  </svg>
);

const IdIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="7" y1="12" x2="17" y2="12"></line>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const VerifiedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const ValidatedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="loading-spinner-container">
    <div className="loading-spinner"></div>
    <p>Loading...</p>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  let statusClass = "";
  
  switch (status) {
    case "WORKING":
      statusClass = "working"; // เปลี่ยนเป็นพิมพ์เล็ก
      break;
    case "VERIFIED":
      statusClass = "verified"; // ตรงกับ <select>
      break;
    case "VALIDATED":
      statusClass = "validated"; // ตรงกับ <select>
      break;
    case "WAITING FOR VERIFICATION":
      statusClass = "waiting-for-verification"; // เปลี่ยนเป็นรูปแบบ CSS-friendly
      break;
    case "WAITING FOR VALIDATION":
      statusClass = "waiting-for-validation"; // เปลี่ยนเป็นรูปแบบ CSS-friendly
      break;
    case "BASELINE":
      statusClass = "baseline"; // ตรงกับ <select>
      break;
    case "SUBMITTED":
      statusClass = "submitted"; // คงไว้
      break;
    case "REJECTED":
      statusClass = "rejected"; // คงไว้
      break;
    default:
      statusClass = "default";
  }
  return <span className={`req-status-badge ${statusClass}`}>{status}</span>;
};

const ViewEditReq = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [requirement, setRequirement] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [loadingRequirement, setLoadingRequirement] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('full'); // For tabs: 'full', 'verified', 'validated'

    // Format date and time
    const formatDate = (dateString) => {
        if (!dateString) return { date: 'N/A', time: 'N/A' };
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return { date: 'Invalid Date', time: '' };
            }
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const formattedDate = `${day}/${month}/${year}`;
            const formattedTime = `${hours}:${minutes}:${seconds}`;
            return { date: formattedDate, time: formattedTime };
        } catch (error) {
            console.error("Error formatting date:", error);
            return { date: 'Error', time: '' };
        }
    };

    useEffect(() => {
        const fetchRequirement = async (requirementId) => {
            setLoadingRequirement(true);
            setError(null);
            try {
                const response = await axios.get(`http://localhost:3001/requirement/${requirementId}`);
                setRequirement(response.data);
            } catch (error) {
                console.error('Error fetching requirement:', error);
                setError('Failed to load requirement data. Please try again.');
            } finally {
                setLoadingRequirement(false);
            }
        };

        // Check for requirement from location or URL
        if (location.state && location.state.requirement) {
            fetchRequirement(location.state.requirement.requirement_id);
            setRequirement(location.state.requirement);
            fetchHistory(location.state.requirement.requirement_id);
        } else if (location.search) {
            const queryParams = new URLSearchParams(location.search);
            const requirementId = queryParams.get('requirement_id');
            if (requirementId) {
                fetchRequirement(requirementId);
                fetchHistory(requirementId);
            }
        }
    }, [location]);

    // Fetch history data
    const fetchHistory = async (requirementId) => {
        setLoadingHistory(true);
        try {
            const response = await axios.get('http://localhost:3001/getHistoryByRequirementId', {
                params: { requirement_id: requirementId }
            });
            if (response.data && response.data.data) {
                setHistoryData(response.data.data);
            } else {
                setHistoryData([]);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Handle file click
    const handleFileClick = (fileId) => {
        const file = {
            filereq_id: fileId,
            filereq_name: "File",
            requirement_ids: requirement.requirement_id
        };
        navigate(`/ViewFile?filereq_id=${file.filereq_id}`, { state: { file } });
    };

    // Navigate to verification details
    const navigateToVeriDetails = (reqId) => {
        const projectId = requirement?.project_id || '';
        if (projectId && reqId) {
            navigate(`/VericriReqDetails?project_id=${projectId}&requirement_id=${reqId}`);
        } else {
            console.error("Missing projectId or requirementId for verification navigation");
        }
    };

    // Navigate to validation history
    const navigateToValiHistory = (reqId) => {
        if (reqId) {
            navigate(`/HistoryValidationReq/${reqId}`);
        } else {
            console.error("Missing requirementId for validation navigation");
        }
    };

    // Filter history by status
    const verifiedHistoryData = historyData.filter(history => history.requirement_status === 'VERIFIED');
    const validatedHistoryData = historyData.filter(history => history.requirement_status === 'VALIDATED');

    // Get project ID or use default
    const projectId = requirement?.project_id || '';

    if (loadingRequirement) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    if (!requirement) {
        return <div className="error-message">Requirement not found.</div>;
    }

    return (
        <div className="req-view-dashboard">
            <div className="req-view-header">
                <div className="req-view-header-left">
                    <button
                        className="req-back-button"
                        onClick={() =>
                            navigate(`/Dashboard?project_id=${projectId}`, {
                                state: { selectedSection: "Requirement" },
                            })
                        }
                    >
                        <BackIcon />
                        <span>Back</span>
                    </button>
                </div>
                <div className="req-view-header-title">
                    <RequirementIcon />
                    <h1>Requirement Details</h1>
                </div>
                <div className="req-view-header-right">
                    <div className="req-id-badge">
                        REQ-{String(requirement.requirement_id).padStart(3, '0')}
                    </div>
                </div>
            </div>

            <div className="req-view-content">
                <div className="req-view-card">
                    <div className="req-card-header">
                        <h2>{requirement.requirement_name}</h2>
                        <StatusBadge status={requirement.requirement_status} />
                    </div>
                    
                    <div className="req-info-grid">
                        <div className="req-info-item">
                            <div className="req-info-label">
                                <IdIcon />
                                <span>Requirement ID</span>
                            </div>
                            <div className="req-info-value">REQ-{String(requirement.requirement_id).padStart(3, '0')}</div>
                        </div>
                        
                        <div className="req-info-item">
                            <div className="req-info-label">
                                <TypeIcon />
                                <span>Type</span>
                            </div>
                            <div className="req-info-value">{requirement.requirement_type || 'Not specified'}</div>
                        </div>
                        
                        <div className="req-info-item">
                            <div className="req-info-label">
                                <StatusIcon />
                                <span>Status</span>
                            </div>
                            <div className="req-info-value">{requirement.requirement_status}</div>
                        </div>
                    </div>
                    
                    <div className="req-description-section">
                        <h3>Description</h3>
                        <div className="req-description-content">
                            {requirement.requirement_description || 'No description provided.'}
                        </div>
                    </div>
                    
                    {requirement.filereq_ids && requirement.filereq_ids.length > 0 && (
                        <div className="req-files-section">
                            <h3>Related Files</h3>
                            <div className="req-files-list">
                                {requirement.filereq_ids.map((fileId, index) => (
                                    <div 
                                        key={index} 
                                        className="req-file-item"
                                        onClick={() => handleFileClick(fileId)}
                                    >
                                        <FileIcon />
                                        <span>File ID: {fileId}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="req-history-card">
                    <div className="req-card-header">
                        <div className="req-history-title">
                            <HistoryIcon />
                            <h2>History</h2>
                        </div>
                    </div>
                    
                    {/* History Tabs */}
                    <div className="req-history-tabs">
                        <button 
                            className={`req-tab ${activeTab === 'full' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('full')}
                        >
                            Full History
                        </button>
                        <button 
                            className={`req-tab ${activeTab === 'verified' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('verified')}
                        >
                            <VerifiedIcon />
                            Verified
                        </button>
                        <button 
                            className={`req-tab ${activeTab === 'validated' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('validated')}
                        >
                            <ValidatedIcon />
                            Validated
                        </button>
                    </div>
                    
                    {/* Tab Content */}
                    <div className="req-history-tab-content">
                        {/* Full History Tab */}
                        {activeTab === 'full' && (
                            <div className="req-history-table-container">
                                {loadingHistory ? (
                                    <div className="req-history-loading">
                                        <div className="req-loading-spinner"></div>
                                        <p>Loading history...</p>
                                    </div>
                                ) : historyData.length > 0 ? (
                                    <table className="req-history-table">
                                        <thead>
                                            <tr>
                                                <th>
                                                    <div className="table-header-content">
                                                        <StatusIcon />
                                                        <span>Status</span>
                                                    </div>
                                                </th>
                                                <th>
                                                    <div className="table-header-content">
                                                        <CalendarIcon />
                                                        <span>Date</span>
                                                    </div>
                                                </th>
                                                <th>
                                                    <div className="table-header-content">
                                                        <TimeIcon />
                                                        <span>Time</span>
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyData.map((history, index) => {
                                                const { date, time } = formatDate(history.historyreq_at);
                                                return (
                                                    <tr key={index} className="req-history-row">
                                                        <td>
                                                            <StatusBadge status={history.requirement_status} />
                                                        </td>
                                                        <td>{date}</td>
                                                        <td>{time}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="req-empty-history">
                                        <div className="req-empty-icon">📋</div>
                                        <p>No history available for this requirement.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Verified History Tab */}
                        {activeTab === 'verified' && (
                            <div className="req-history-table-container">
                                {loadingHistory ? (
                                    <div className="req-history-loading">
                                        <div className="req-loading-spinner"></div>
                                        <p>Loading verified history...</p>
                                    </div>
                                ) : verifiedHistoryData.length > 0 ? (
                                    <table className="req-history-table">
                                        <thead>
                                            <tr>
                                                <th>Requirement Name</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                                <th>Time</th>
                                                <th>Details</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {verifiedHistoryData.map((history, index) => {
                                                const { date, time } = formatDate(history.historyreq_at);
                                                return (
                                                    <tr key={`verified-${index}`} className="req-history-row">
                                                        <td>{history.requirement_name}</td>
                                                        <td>
                                                            <StatusBadge status={history.requirement_status} />
                                                        </td>
                                                        <td>{date}</td>
                                                        <td>{time}</td>
                                                        <td>
                                                            <button
                                                                className="req-action-button"
                                                                onClick={() => navigateToVeriDetails(history.requirement_id)}
                                                            >
                                                                <EyeIcon />
                                                                <span className="button-text">View Details</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="req-empty-history">
                                        <div className="req-empty-icon">✓</div>
                                        <p>No verified history available for this requirement.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Validated History Tab */}
                        {activeTab === 'validated' && (
                            <div className="req-history-table-container">
                                {loadingHistory ? (
                                    <div className="req-history-loading">
                                        <div className="req-loading-spinner"></div>
                                        <p>Loading validated history...</p>
                                    </div>
                                ) : validatedHistoryData.length > 0 ? (
                                    <table className="req-history-table">
                                        <thead>
                                            <tr>
                                                <th>Requirement Name</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                                <th>Time</th>
                                                <th>Validation Details</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {validatedHistoryData.map((history, index) => {
                                                const { date, time } = formatDate(history.historyreq_at);
                                                return (
                                                    <tr key={`validated-${index}`} className="req-history-row">
                                                        <td>{history.requirement_name}</td>
                                                        <td>
                                                            <StatusBadge status={history.requirement_status} />
                                                        </td>
                                                        <td>{date}</td>
                                                        <td>{time}</td>
                                                        <td>
                                                            <button
                                                                className="req-action-button validation"
                                                                onClick={() => navigateToValiHistory(history.requirement_id)}
                                                            >
                                                                <EyeIcon />
                                                                <span className="button-text">View Validation</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="req-empty-history">
                                        <div className="req-empty-icon">✅</div>
                                        <p>No validated history available for this requirement.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewEditReq;