import React, { useEffect, useState, useCallback } from 'react'; // ไม่ต้องใช้ useMemo
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faStar, faCalendarCheck, faUser, faEye,
    faSpinner, faExclamationTriangle, faInfoCircle, faLayerGroup
} from '@fortawesome/free-solid-svg-icons';

// *** เปลี่ยน Import CSS เป็นไฟล์ใหม่ ***
import "./CSS/currentBaselineTrace.css"; // <<--- เรียกใช้ CSS ใหม่

// --- Component หลัก: CurrentBaselineTrace ---
const CurrentBaselineTrace = () => {
    // ... (State definitions remain the same) ...
    const [latestBaselineEntry, setLatestBaselineEntry] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Fetch Data Effect (Logic remains the same) ---
     const fetchLatestBaseline = useCallback(async () => {
         setLoading(true); setError(''); setLatestBaselineEntry(null); setProjectName('');
         if (!projectId) { setError('Project ID missing.'); setLoading(false); return; }
         try {
              try {
                  const nameResponse = await axios.get(`http://localhost:3001/projectname?project_id=${projectId}`);
                  setProjectName((nameResponse.data && nameResponse.data.length > 0) ? nameResponse.data[0].project_name : `Project ${projectId}`);
              } catch (nameError) { setProjectName(`Project ${projectId}`); }
              const response = await axios.get(`http://localhost:3001/viewBaselineTrace?project_id=${projectId}`);
              if (response.data && response.data.success) {
                  const allBaselineData = Array.isArray(response.data.data) ? response.data.data : [];
                  if (allBaselineData.length > 0) {
                      const sortedBaselines = [...allBaselineData].sort((a, b) => b.baselinetrace_round - a.baselinetrace_round);
                      setLatestBaselineEntry(sortedBaselines[0]); setError('');
                  } else { setError('No baseline configured.'); setLatestBaselineEntry(null); }
              } else { throw new Error(response.data?.message || 'Unexpected data structure.'); }
          } catch (fetchError) {
              let errorMessage = '';
               if (fetchError.response) { errorMessage = `Error: ${fetchError.response.data?.message || `Status ${fetchError.response.status}`}`; }
               else if (fetchError.request) { errorMessage = 'Error: No response from server.'; }
               else { errorMessage = `Error: ${fetchError.message}`; }
               setError(errorMessage); setLatestBaselineEntry(null);
          } finally { setLoading(false); }
      }, [projectId]);

      useEffect(() => { fetchLatestBaseline(); }, [fetchLatestBaseline]);

    // --- Handlers (Logic remains the same) ---
    const handleViewRound = (round) => { navigate(`/viewBaselineCurrent?project_id=${projectId}&round=${round}`); };
    const handleBack = () => { navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Traceability" } }); }
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try { const date = parseISO(dateString); if (isValid(date)) { return format(date, 'PP H:mm'); } }
        catch (e) { console.error("Date format error:", e); } return 'Invalid Date';
    }

    // --- Render Logic ---
    return (
        // *** ใช้ Prefix cbt- ***
        <div className="cbt-container">
            {/* Header */}
            <div className="cbt-header">
                 <button className="cbt-back-btn" onClick={handleBack} aria-label="Go back">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                 </button>
                 <h1 className="cbt-title">
                    <FontAwesomeIcon icon={faStar} className="cbt-title-icon" />
                     Current Baseline: {projectName || 'Loading...'}
                 </h1>
            </div>

            {/* Content Area */}
            <div className="cbt-content">
                {loading ? (
                    <div className="cbt-loading"> {/* Use cbt- prefix */}
                        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                        <p>Loading current baseline...</p>
                    </div>
                ) : error ? (
                    <div className={`cbt-error-message ${error.startsWith('No baseline') ? 'cbt-info-message' : ''}`}> {/* Use cbt- prefix */}
                        <FontAwesomeIcon icon={error.startsWith('No baseline') ? faInfoCircle : faExclamationTriangle} size="2x" />
                        <p>{error.startsWith('No baseline') ? 'No Baseline Set' : 'Error Loading Data'}</p>
                        <span className="cbt-error-details">{error.startsWith('No baseline') ? 'Please set a baseline first.' : error}</span>
                    </div>
                ) : latestBaselineEntry ? (
                    <div className="cbt-summary-box"> {/* Use cbt- prefix */}
                        <div className="cbt-summary-item">
                             <span className="cbt-summary-label">
                                 <FontAwesomeIcon icon={faLayerGroup} /> Baseline Round:
                             </span>
                             <span className="cbt-summary-value cbt-round-value">
                                 {`BL-${latestBaselineEntry.baselinetrace_round}`}
                             </span>
                         </div>
                         <div className="cbt-summary-item">
                             <span className="cbt-summary-label">
                                 <FontAwesomeIcon icon={faUser} /> Set By:
                             </span>
                             <span className="cbt-summary-value">
                                 {latestBaselineEntry.baselinetrace_by || 'N/A'}
                             </span>
                         </div>
                         <div className="cbt-summary-item">
                             <span className="cbt-summary-label">
                                 <FontAwesomeIcon icon={faCalendarCheck} /> Set At:
                             </span>
                             <span className="cbt-summary-value">
                                 {formatDate(latestBaselineEntry.baselinetrace_at)}
                             </span>
                         </div>
                         <div className="cbt-summary-actions">
                             <button
                                 className="cbt-action-button cbt-view-button" /* Use cbt- prefix */
                                 onClick={() => handleViewRound(latestBaselineEntry.baselinetrace_round)}
                                 title={`View details for baseline round ${latestBaselineEntry.baselinetrace_round}`}
                                 aria-label={`View baseline round ${latestBaselineEntry.baselinetrace_round}`} >
                                 <FontAwesomeIcon icon={faEye} /> View Details
                             </button>
                         </div>
                     </div>
                ) : (
                    <div className="cbt-no-data"><p>Could not determine the current baseline.</p></div> /* Use cbt- prefix */
                )}
            </div> {/* End cbt-content */}
        </div> // End cbt-container
    );
};

export default CurrentBaselineTrace;