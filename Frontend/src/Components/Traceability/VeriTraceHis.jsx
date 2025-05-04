import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride'; // Optional
import { toast } from "react-toastify";
import axios from "axios";
import "./CSS/VeriTraceHis.css"; // <--- ตรวจสอบว่าไฟล์ CSS นี้มีอยู่จริงและถูกต้อง

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch, faTimes, faCalendarAlt, faUser, faClipboardCheck,
    faArrowLeft, faSortAmountDown, faSortAmountUp,
    faEye, faUsers, faListAlt, faHistory, faCheckCircle, faTimesCircle,
    faQuestionCircle, faProjectDiagram, // Icon for Traceability
    faFileAlt, // Icon for Requirement
    faPalette, // Icon for Design
    faCode, // Icon for Implement
    faVial // Icon for Test Case
} from "@fortawesome/free-solid-svg-icons";

// --- Modal Component (Adapted for Trace History - Single Row Table Layout) ---
const Modal = ({ show, onClose, traceItem = null, verificationBy = {} }) => {
    if (!show) return null;

    // --- Parsing Logic for Reviewer OBJECT structure (Keep as is) ---
    const reviewerObject = verificationBy && typeof verificationBy === 'object' && !Array.isArray(verificationBy)
                           ? verificationBy
                           : {};
    const parsedVerificationBy = Object.entries(reviewerObject)
        .map(([name, value]) => {
            if (typeof value !== 'boolean') {
                console.warn(`Modal (Trace) Warning: Value for reviewer "${name}" is not boolean:`, value);
                return { name: name, value: null };
            }
            return { name: name, value: value };
        });
    // --- End Parsing Logic ---

    // Helper to format ID with prefix
    const formatId = (prefix, id) => {
         if (id === null || id === undefined || id === '-') return null; // Return null if no ID
         return `${prefix}-${String(id).padStart(3, '0')}`;
    }

    // Helper to render status badge
    const renderStatusBadge = (st) => {
        if (!st || st === "-" || st === "N/A") return null;
        let statusClass = 'veritrace-his-status-neutral';
        const lowerStatus = String(st).toLowerCase();
        if (['approved', 'passed', 'complete', 'verified', 'validated', 'baseline', 'done', 'closed'].includes(lowerStatus)) {
            statusClass = 'veritrace-his-status-positive';
        } else if (['rejected', 'failed', 'error', 'blocked', 'cancelled', 'invalid', 'n/a'].includes(lowerStatus)) {
            statusClass = 'veritrace-his-status-negative';
        } else if (['draft', 'review', 'submitted', 'pending', 'in progress', 'new', 'open'].includes(lowerStatus)) {
            statusClass = 'veritrace-his-status-wip';
         }
        return <span className={`veritrace-his-status-badge ${statusClass}`}>{st}</span>;
    };

    // --- START: Helper to Render Cell Content for the single row table ---
    const renderTableCell = (artifactKey) => {
        let id = null;
        let prefix = '';
        let name = null;
        let status = null;

        // --- ASSUMPTION: traceItem contains these fields ---
        // Adjust field names based on your actual API response structure
        switch(artifactKey) {
            case 'req':
                id = traceItem?.requirement_id;
                prefix = 'REQ';
                name = traceItem?.requirement_name; // Adjust if needed
                status = traceItem?.requirement_status; // Adjust if needed
                break;
            case 'design':
                id = traceItem?.design_id;
                prefix = 'SD';
                name = traceItem?.design_name; // Adjust if needed
                status = traceItem?.design_status; // Adjust if needed
                break;
            case 'impl':
                id = traceItem?.implement_id;
                prefix = 'SC'; // Assuming SC prefix
                name = traceItem?.implement_file; // Assuming file name
                status = null; // Code usually doesn't have status
                break;
            case 'test':
                id = traceItem?.testcase_id;
                prefix = 'TC';
                name = traceItem?.testcase_name; // Adjust if needed
                status = traceItem?.testcase_status; // Adjust if needed
                break;
            default:
                return <span className="veritrace-his-artifact-nolink">-</span>; // Placeholder for invalid key
        }
        // --- End Assumption ---

        const formattedId = formatId(prefix, id);

        // If no ID for this artifact, show placeholder
        if (!formattedId) {
            return <span className="veritrace-his-artifact-nolink">Not Linked</span>;
        }

        // Determine display name (avoid showing default names like "Requirement 123")
        let displayName = '';
         if (artifactKey === 'impl') {
             displayName = name && name !== 'N/A' ? name : '';
         } else {
             // Check if name exists and is different from a potential default pattern
             const defaultNamePattern = `${artifactKey.charAt(0).toUpperCase() + artifactKey.slice(1)} ${id}`;
             displayName = name && name !== defaultNamePattern && name !== 'N/A' ? name : '';
         }


        return (
            <div className="veritrace-his-artifact-cell-content"> {/* Added wrapper div */}
                <div className="veritrace-his-artifact-id">{formattedId}</div>
                {displayName && <div className="veritrace-his-artifact-name">{displayName}</div>}
                {renderStatusBadge(status)}
            </div>
        );
    };
    // --- END: Helper to Render Cell Content ---


    return (
        <div className="veritrace-his-modal-overlay-review">
            <div className="veritrace-his-modal-content-review wide"> {/* Optional: Add class for wider modal */}
                <div className="veritrace-his-modal-header">
                    <h3>Traceability Verification Details (ID: {traceItem?.veritrace_id || 'N/A'})</h3>
                    <button className="veritrace-his-close-modal-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="veritrace-his-modal-body">
                    {/* --- START: Linked Items Section (Single Row Table Layout) --- */}
                    <div className="veritrace-his-linked-items-section">
                        <h4><FontAwesomeIcon icon={faProjectDiagram} className="veritrace-his-section-icon" />Traceability</h4>
                        {traceItem ? (
                            <div className="veritrace-his-modal-table-container"> {/* Added container for overflow */}
                                <table className="veritrace-his-modal-artifact-table horizontal"> {/* New class */}
                                    <thead>
                                        <tr>
                                            <th><FontAwesomeIcon icon={faFileAlt} /> REQUIREMENT</th>
                                            <th><FontAwesomeIcon icon={faPalette} /> DESIGN</th>
                                            <th><FontAwesomeIcon icon={faCode} /> CODE COMPONENT</th>
                                            <th><FontAwesomeIcon icon={faVial} /> TEST CASE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {/* Render a cell for each artifact type */}
                                            <td>{renderTableCell('req')}</td>
                                            <td>{renderTableCell('design')}</td>
                                            <td>{renderTableCell('impl')}</td>
                                            <td>{renderTableCell('test')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="veritrace-his-empty-message">Details not available.</div>
                        )}
                    </div>
                    {/* --- END: Linked Items Section --- */}


                    {/* Reviewer Section (Keep as is) */}
                    <div className="veritrace-his-reviewer-section">
                        <h4><FontAwesomeIcon icon={faUsers} className="veritrace-his-section-icon" />Reviewer</h4>
                        {parsedVerificationBy.length > 0 ? (
                            <div className="veritrace-his-reviewers-list">
                                {parsedVerificationBy.map((person, index) => (
                                     <div className="veritrace-his-reviewer-item" key={index}>
                                         <div className="veritrace-his-reviewer-avatar"><FontAwesomeIcon icon={faUser} /></div>
                                         <div className="veritrace-his-reviewer-info">
                                             <span className="veritrace-his-reviewer-name">{person.name}</span>
                                             {person.value === true && (<span className="veritrace-his-reviewer-status veritrace-his-verified">Verified</span>)}
                                             {person.value === false && (<span className="veritrace-his-reviewer-status veritrace-his-not-verified">Not Verified</span>)}
                                             {person.value === null && (<span className="veritrace-his-reviewer-status veritrace-his-unknown">Status Unknown</span>)}
                                         </div>
                                         {person.value === true && (<FontAwesomeIcon icon={faCheckCircle} className="veritrace-his-status-icon veritrace-his-verified" />)}
                                         {person.value === false && (<FontAwesomeIcon icon={faTimesCircle} className="veritrace-his-status-icon veritrace-his-not-verified" />)}
                                         {person.value === null && (<FontAwesomeIcon icon={faQuestionCircle} className="veritrace-his-status-icon veritrace-his-unknown" />)}
                                     </div>
                                ))}
                            </div>
                        ) : (
                            <div className="veritrace-his-empty-message">No verification information found for this record.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- VeriTraceHis Component ---
const VeriTraceHis = () => {
    // --- State Variables ---
    const [traceHistory, setTraceHistory] = useState([]);
    const [filteredTraceHistory, setFilteredTraceHistory] = useState([]);
    const [selectedTraceDetails, setSelectedTraceDetails] = useState(null); // Stores the whole trace item for the modal
    const [selectedVerificationBy, setSelectedVerificationBy] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState("verification_at");
    const [sortDirection, setSortDirection] = useState("desc");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [runTutorial, setRunTutorial] = useState(false);
    const [tutorialSteps] = useState([
        { target: '.veritrace-his-table', content: 'Verification Traceability History.', placement: 'top' },
        { target: '.veritrace-his-row:first-child .actions-cell .view-details-btn', content: 'Click for details.', placement: 'right' },
    ]);

    // --- Hooks ---
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Data Fetching ---
    const fetchTraceHistory = useCallback(() => {
        if (!projectId) {
            toast.error("Project ID missing."); setLoading(false); return Promise.reject("Missing Project ID");
        }
        setLoading(true);
        const apiUrl = `http://localhost:3001/veritrace-history/${projectId}`;
        console.log(`VERITRACE_HIS: Fetching history from: ${apiUrl}`);

        return axios.get(apiUrl)
            .then((response) => {
                console.log("VERITRACE_HIS: Raw Response Data:", response.data);
                // --- Corrected Data Processing ---
                const processedData = (response.data || []).map(item => {
                    const reviewerData = item.verification_by && typeof item.verification_by === 'object' && !Array.isArray(item.verification_by)
                                        ? item.verification_by
                                        : {};
                     // console.log(`VERITRACE_HIS: Proc item ${item.veritrace_id}: verification_by=`, reviewerData);
                    return { ...item, verification_by: reviewerData };
                });
                // --- End Corrected Data Processing ---
                console.log("VERITRACE_HIS: Processed Data for State:", processedData);
                setTraceHistory(processedData);
            })
            .catch((err) => {
                console.error("VERITRACE_HIS: Error fetching history:", err);
                const errorMsg = err.response?.data?.message || err.message || 'Failed to load trace history.';
                toast.error(`Error: ${err.response?.status || ''} - ${errorMsg}`);
                setTraceHistory([]);
            })
            .finally(() => { setLoading(false); setIsRefreshing(false); });
    }, [projectId]);

    // --- Effects ---
    useEffect(() => { fetchTraceHistory(); }, [fetchTraceHistory]);

    useEffect(() => { // Tutorial Trigger
        const tutorialShown = localStorage.getItem('veriTraceHisTutorialShown');
        if (!tutorialShown && !loading && traceHistory.length > 0) {
            const timer = setTimeout(() => setRunTutorial(true), 500); return () => clearTimeout(timer);
        }
    }, [loading, traceHistory]);

    // --- Filtering and Sorting Effect ---
    useEffect(() => {
        let result = [...traceHistory];
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(item => {
                // Adjust search fields based on table columns
                const roundMatch = item.create_round?.toString().includes(lowerSearchTerm);
                const statusMatch = item.veritrace_status?.toLowerCase().includes(lowerSearchTerm);
                const creatorMatch = item.create_by?.toLowerCase().includes(lowerSearchTerm);
                const dateMatch = formatDate(item.verification_at).toLowerCase().includes(lowerSearchTerm);
                return roundMatch || statusMatch || creatorMatch || dateMatch;
            });
        }

        // Sorting
        result.sort((a, b) => {
            let compareA, compareB;
            const field = sortField; // Use state directly

            switch (field) {
                case "create_round": compareA = a.create_round; compareB = b.create_round; break;
                case "veritrace_status": compareA = a.veritrace_status || ""; compareB = b.veritrace_status || ""; break;
                case "create_by": compareA = a.create_by || ""; compareB = b.create_by || ""; break;
                case "verification_at": compareA = a.verification_at ? new Date(a.verification_at) : null; compareB = b.verification_at ? new Date(b.verification_at) : null; break;
                default: // Default sort by verification_at descending
                    compareA = b.verification_at ? new Date(b.verification_at) : null;
                    compareB = a.verification_at ? new Date(a.verification_at) : null;
            }
            const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
            // Comparison logic (robust version)
            if (compareA === null && compareB === null) return 0;
            if (compareA === null) return 1 * directionMultiplier;
            if (compareB === null) return -1 * directionMultiplier;
            if (compareA instanceof Date && compareB instanceof Date) {
                 const timeA = isNaN(compareA.getTime()) ? (sortDirection === 'asc' ? Infinity : -Infinity) : compareA.getTime();
                 const timeB = isNaN(compareB.getTime()) ? (sortDirection === 'asc' ? Infinity : -Infinity) : compareB.getTime();
                 return (timeA - timeB) * directionMultiplier;
             }
            else if (typeof compareA === 'string' && typeof compareB === 'string') { return compareA.localeCompare(compareB) * directionMultiplier; }
            else if (typeof compareA === 'number' && typeof compareB === 'number') { return (compareA - compareB) * directionMultiplier; }
            return 0;

        });
        setFilteredTraceHistory(result);
    }, [traceHistory, searchTerm, sortField, sortDirection]);

    // --- Event Handlers ---
    const handleViewDetails = (traceItem) => { // Pass the whole item
        console.log("VERITRACE_HIS: handleViewDetails called with item:", traceItem);
        // --- Pass whole item to state ---
        setSelectedTraceDetails(traceItem);
        // --- Pass reviewer object (or {}) to state ---
        setSelectedVerificationBy(traceItem.verification_by || {});
        setShowModal(true);
    };

    const handleBack = () => { navigate(`/viewVerifyTrace?project_id=${projectId}`); }; // Navigate back

    const handleSortChange = (field) => { // Field name comes directly from header click
        if (sortField === field) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };
    const closeModal = () => setShowModal(false);
    const handleJoyrideCallback = (data) => { const { status } = data; if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) { setRunTutorial(false); localStorage.setItem('veriTraceHisTutorialShown', 'true'); } };
    const handleRestartTutorial = () => { setRunTutorial(false); localStorage.removeItem('veriTraceHisTutorialShown'); setTimeout(() => setRunTutorial(true), 100); };

    // --- Helper Functions ---
    const formatDate = (dateString) => { if (!dateString) return "N/A"; const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }; try { const date = new Date(dateString); if (isNaN(date.getTime())) { return "Invalid Date"; } return date.toLocaleDateString('en-GB', options); } catch (e) { return "Invalid Date"; } };
    const renderSortIcon = (field) => { if (sortField !== field) return null; return <FontAwesomeIcon icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} />; };

    // --- Render Logic ---
    if (loading && !isRefreshing) {
        return (
            <div className="veritrace-his-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading traceability verification history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="veritrace-his-container">
            <Joyride steps={tutorialSteps} run={runTutorial} continuous showProgress showSkipButton styles={{ options: { zIndex: 10000 } }} callback={handleJoyrideCallback} />
            <div className="veritrace-his-header">
                <button className="veritrace-his-back-btn" onClick={handleBack}><FontAwesomeIcon icon={faArrowLeft} /> Back</button>
                <h1><FontAwesomeIcon icon={faHistory} className="veritrace-his-title-icon" /> Traceability Verification History</h1>
                 <button onClick={handleRestartTutorial} className="veritrace-his-tutorial-help-button" title="Show Tutorial Again" style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '1.6rem', background: 'none', border: 'none', color: '#333', cursor: 'pointer', zIndex: 5 }}><FontAwesomeIcon icon={faQuestionCircle} /></button>
            </div>
            <div className="veritrace-his-content">
                <div className="veritrace-his-panel">
                    <div className="veritrace-his-panel-header">
                        <h2><FontAwesomeIcon icon={faListAlt} /> Trace History Log <span className="veritrace-his-count-badge">{filteredTraceHistory.length}</span></h2>
                        <div className="veritrace-his-tools">
                            <div className="veritrace-his-search">
                                <FontAwesomeIcon icon={faSearch} className="veritrace-his-search-icon" />
                                <input type="text" placeholder="Search Round, Status, Creator..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="veritrace-his-search-input" disabled={loading || isRefreshing} />
                                {searchTerm && (<button className="veritrace-his-clear-search" onClick={() => setSearchTerm("")} title="Clear search"><FontAwesomeIcon icon={faTimes} /></button>)}
                            </div>
                             {/* Optional Refresh Button */}
                        </div>
                    </div>
                    <div className="veritrace-his-table-container">
                        {isRefreshing && <div className="loading-state small"><div className="loading-spinner"></div> Refreshing...</div>}
                        {!isRefreshing && filteredTraceHistory.length === 0 ? (
                            <div className="veritrace-his-empty-state">
                                <FontAwesomeIcon icon={faHistory} className="empty-icon" />
                                <p>{searchTerm ? "No trace history found matching criteria." : "No traceability verification history available."}</p>
                                {searchTerm && <p className="empty-subtitle">Try clearing the search filter.</p>}
                            </div>
                        ) : (
                            <table className="veritrace-his-table">
                                <thead>
                                    <tr>
                                        {/* Table Headers */}
                                        <th onClick={() => handleSortChange('create_round')} className="veritrace-his-sortable-header">
                                            Round {renderSortIcon('create_round')}
                                        </th>
                                        <th onClick={() => handleSortChange('create_by')} className="veritrace-his-sortable-header">
                                            Create by {renderSortIcon('create_by')}
                                        </th>
                                        <th onClick={() => handleSortChange('verification_at')} className="veritrace-his-sortable-header">
                                        Verification_at {renderSortIcon('verification_at')}
                                        </th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {/* Table Body */}
                                    {filteredTraceHistory.map((traceItem) => (
                                        <tr key={traceItem.create_round} className="veritrace-his-row">
                                            <td className="veritrace-his-hist-round-cell">VERIF-{traceItem.create_round}</td>
                                            <td className="veritrace-his-hist-creator-cell">
                                                <div className="creator-info">
                                                    <FontAwesomeIcon icon={faUser} className="cell-icon" />
                                                    <span>{traceItem.create_by || "N/A"}</span>
                                                </div>
                                            </td>
                                            <td className="veritrace-his-hist-date-cell">
                                                <div className="date-info">
                                                    <FontAwesomeIcon icon={faCalendarAlt} className="cell-icon" />
                                                    <span>{formatDate(traceItem.verification_at)}</span>
                                                </div>
                                            </td>
                                            <td className="veritrace-his-actions-cell">
                                                <button
                                                    className="veritrace-his-view-details-btn"
                                                    title="View Details"
                                                    onClick={() => handleViewDetails(traceItem)} // Pass whole item
                                                >
                                                    <FontAwesomeIcon icon={faEye} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
            {/* Modal */}
            <Modal
                show={showModal}
                onClose={closeModal}
                traceItem={selectedTraceDetails} // Pass the whole trace item object
                verificationBy={selectedVerificationBy} // Pass the reviewer object
            />
        </div>
    );
};

export default VeriTraceHis; // Export the new component