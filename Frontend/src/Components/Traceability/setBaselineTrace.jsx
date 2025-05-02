import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faLayerGroup, faPlus, faEye, faUsers, faCheckCircle,
    faHourglassHalf, faSpinner, faExclamationTriangle, faTimes, faCheckSquare, faUser // เพิ่ม faUser
} from '@fortawesome/free-solid-svg-icons';

import "./CSS/setBaselineTrace.css"; // <<--- Import CSS for this component

// --- Main Component ---
const SetBaselineTrace = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- State ---
    const [verifiedData, setVerifiedData] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [selectedReviewers, setSelectedReviewers] = useState({});
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- Fetch Data ---
    useEffect(() => {
        setLoading(true); setError(''); setVerifiedData([]); setProjectName('');
        if (!projectId) { setError('Project ID is missing.'); setLoading(false); return; }

        // Fetch project name
        axios.get(`http://localhost:3001/projectname?project_id=${projectId}`)
            .then(nameResponse => {
                setProjectName((nameResponse.data && nameResponse.data.length > 0) ? nameResponse.data[0].project_name : 'N/A');
            })
            .catch(nameError => { console.error("Error fetching project name:", nameError); setProjectName('N/A'); });

        // Fetch verification data
        axios.get('http://localhost:3001/getVerificationTrace')
            .then(response => {
                if (response.data.success && Array.isArray(response.data.data)) {
                    let filteredData = response.data.data.filter(item => item.veritrace_status === "VERIFIED" && String(item.project_id) === String(projectId));
                    const uniqueRoundsMap = new Map();
                    filteredData.forEach(item => {
                        if (item && item.create_round !== null && item.create_round !== undefined) {
                             if (!uniqueRoundsMap.has(item.create_round)) { uniqueRoundsMap.set(item.create_round, item); }
                         }
                    });
                    setVerifiedData(Array.from(uniqueRoundsMap.values()).sort((a, b) => a.create_round - b.create_round));
                    setError('');
                } else { setError(response.data?.message || 'Could not fetch records.'); setVerifiedData([]); }
            })
            .catch(fetchError => {
                let errorMessage = '';
                 if (fetchError.response) { errorMessage = `Error: ${fetchError.response.data?.message || `Status ${fetchError.response.status}`}`; }
                 else if (fetchError.request) { errorMessage = 'Error: No response from server.'; }
                 else { errorMessage = `Error: ${fetchError.message}`; }
                 setError(errorMessage); setVerifiedData([]);
            })
            .finally(() => { setLoading(false); });
    }, [projectId]);

    // --- Handlers ---
    const handleShowReviewers = (verificationBy) => {
        if (!verificationBy) { setSelectedReviewers({}); setShowPopup(true); return; }
        try {
            const parsedReviewers = JSON.parse(verificationBy);
            setSelectedReviewers(typeof parsedReviewers === 'object' && parsedReviewers !== null ? parsedReviewers : {});
            setShowPopup(true);
        } catch (error) {
            console.error("Error parsing reviewers JSON:", error);
            setSelectedReviewers({});
            setShowPopup(true);
            alert("Error displaying reviewers: Invalid data format."); // Or use a better alert
        }
    };

    const handleSetBaseline = (round) => { navigate(`/createBaselineTrace?project_id=${projectId}&round=${round}`); };
    const handleBack = () => { navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Traceability" } }); };

    // --- Render Logic ---
    return (
        <div className="sbt-container"> {/* Use sbt- prefix */}
            {/* Header */}
            <div className="sbt-header">
                 <button className="sbt-back-btn" onClick={handleBack} aria-label="Go back">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                 </button>
                 <h1 className="sbt-title">
                    <FontAwesomeIcon icon={faCheckSquare} className="sbt-title-icon" />
                     Select Verified Round to Set as Baseline
                 </h1>
                 <span className="sbt-project-name">Project: {projectName || '...'}</span>
                 {/* Move Set Baseline button here if desired */}
                 {/* <button className="sbt-set-baseline-btn" onClick={handleSetBaseline} title="Set New Baseline"><FontAwesomeIcon icon={faPlus} /> Set New Baseline </button> */}
            </div>

             {/* Content Area */}
            <div className="sbt-content">
                {loading ? ( /* Loading State */
                    <div className="sbt-loading"> <FontAwesomeIcon icon={faSpinner} spin size="2x" /><p>Loading verified records...</p> </div>
                ) : error ? ( /* Error State */
                    <div className="sbt-error-message"> <FontAwesomeIcon icon={faExclamationTriangle} size="2x" /><p>Error Loading Data</p><span className="sbt-error-details">{error}</span></div>
                ) : ( /* Data Loaded State */
                    <div className="sbt-table-container">
                        <table className="sbt-table">
                            <thead>
                                <tr>
                                    <th>Round</th><th>Verified By (Creator)</th><th>Verification Date</th>
                                    <th>Status</th><th>Reviewers</th><th className="sbt-action-header">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {verifiedData.length === 0 ? ( /* No Verified Data */
                                    <tr><td colSpan="6" className="sbt-no-data"><p>No "VERIFIED" traceability records found.</p><span className="sbt-no-data-subtle">Complete verification first.</span></td></tr>
                                ) : ( /* Verified Data Rows */
                                    verifiedData.map((item) => {
                                        let formattedDate = 'N/A';
                                         if(item.verification_at) {
                                             try {
                                                 const date = parseISO(item.verification_at);
                                                 if(isValid(date)) { formattedDate = format(date, 'PP H:mm'); }
                                             } catch (e) { console.error("Date fmt error", e); }
                                         }
                                          let reviewersDisplay = <span className="sbt-no-reviewers">-</span>;
                                          let reviewerCount = 0;
                                          if (item.verification_by) {
                                              try {
                                                  const parsed = JSON.parse(item.verification_by);
                                                  reviewerCount = Object.keys(parsed).length;
                                                  if (reviewerCount > 0) {
                                                      reviewersDisplay = (
                                                          <button
                                                              className="sbt-action-button sbt-view-reviewers-button"
                                                              onClick={() => handleShowReviewers(item.verification_by)} // Corrected onClick
                                                              title="View Reviewer Status"
                                                              aria-label={`View reviewers for round ${item.create_round}`} >
                                                              <FontAwesomeIcon icon={faUsers} /> ({reviewerCount})
                                                          </button>
                                                      );
                                                  }
                                              } catch (e) { reviewersDisplay = <span className="sbt-error-text">Err</span>; }
                                          }

                                         return (
                                            <tr key={item.create_round}>
                                                <td data-label="Round" className="sbt-td-round">{`Round ${item.create_round}`}</td>
                                                <td data-label="Verified By">{item.create_by || 'N/A'}</td>
                                                <td data-label="Date">{formattedDate}</td>
                                                <td data-label="Status">
                                                     <span className="sbt-status-badge sbt-status-verified"><FontAwesomeIcon icon={faCheckCircle} /> VERIFIED</span>
                                                </td>
                                                <td data-label="Reviewers" className="sbt-td-center">{reviewersDisplay}</td>
                                                <td data-label="Action" className="sbt-td-actions">
                                                    <button
                                                        className="sbt-action-button sbt-set-baseline-button"
                                                        onClick={() => handleSetBaseline(item.create_round)} // Pass round to handler
                                                        title={`Set round ${item.create_round} as baseline`}
                                                        aria-label={`Set round ${item.create_round} as baseline`} >
                                                        <FontAwesomeIcon icon={faCheckSquare} /> Set Baseline
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div> {/* End sbt-content */}

            {/* Reviewers Popup (ใช้โครงสร้างและ Class ที่แก้แล้ว) */}
            {/* *** แก้ไข className ให้มี .show conditional *** */}
            <div className={`sbt-popup-overlay ${showPopup ? 'show' : ''}`} onClick={() => setShowPopup(false)}>
                <div className="sbt-popup-content sbt-reviewer-popup-content" onClick={(e) => e.stopPropagation()}>
                    <div className="sbt-popup-header">
                         <h3>Reviewer Status</h3>
                         <button className="sbt-popup-close" onClick={() => setShowPopup(false)} title="Close" aria-label="Close popup">
                             <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                    <div className="sbt-popup-body">
                        <div className="sbt-reviewer-section">
                            {Object.keys(selectedReviewers).length === 0 ? (
                                <div className="sbt-empty-message">No reviewers assigned or data error.</div>
                            ) : (
                                <div className="sbt-reviewers-list">
                                    {Object.entries(selectedReviewers).map(([reviewer, status], index) => (
                                        <div className={`sbt-reviewer-item ${status ? 'sbt-verified' : 'sbt-pending'}`} key={index}>
                                            <div className="sbt-reviewer-avatar"><FontAwesomeIcon icon={faUser} /></div>
                                            <div className="sbt-reviewer-info">
                                                <span className="sbt-reviewer-name">{reviewer}</span>
                                                <span className="sbt-reviewer-status-text">{status ? 'Verified' : 'Pending/Not Verified'}</span>
                                            </div>
                                            <FontAwesomeIcon icon={status ? faCheckCircle : faHourglassHalf} className="sbt-status-icon" aria-label={status ? 'Verified' : 'Pending'}/>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
             {/* สิ้นสุด Popup Conditional Rendering */}

        </div> // End sbt-container
    );
};

export default SetBaselineTrace;