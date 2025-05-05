import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride'; // Optional
import { toast } from "react-toastify";
import axios from "axios";
import "./CSS/VeriTraceHis.css"; // <--- ตรวจสอบว่าไฟล์ CSS นี้มีอยู่จริงและถูกต้อง

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch, faTimes, faCalendarAlt, faUser,
    faArrowLeft, faSortAmountDown, faSortAmountUp,
    faEye, faUsers, faListAlt, faHistory, faCheckCircle, faTimesCircle,
    faQuestionCircle, faProjectDiagram, faFileAlt, faPalette, faCode, faVial,
    faSync // Added for refresh icon
} from "@fortawesome/free-solid-svg-icons";

// --- Modal Component (UPDATED to handle arrays in traceItem) ---
const Modal = ({ show, onClose, traceItem = null, verificationBy = {} }) => {
    if (!show) return null;

    // --- Parsing Logic for Reviewer (Keep as is) ---
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
         if (id === null || id === undefined || id === '-') return null;
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

    // --- START: UPDATED Helper to Render Cell Content (Handles Arrays) ---
    const renderTableCell = (artifactKey) => {
        // --- Get potentially ARRAY data from the merged traceItem ---
        let ids = [];
        let names = [];
        let statuses = [];
        let prefix = '';

        switch(artifactKey) {
            case 'req':
                ids = traceItem?.requirement_ids || []; // Expecting arrays now
                names = traceItem?.requirement_names || [];
                statuses = traceItem?.requirement_statuses || [];
                prefix = 'REQ';
                break;
            case 'design':
                ids = traceItem?.design_ids || [];
                names = traceItem?.design_names || [];
                statuses = traceItem?.design_statuses || [];
                prefix = 'SD';
                break;
            case 'impl':
                ids = traceItem?.implement_ids || [];
                names = traceItem?.implement_files || []; // Name is file for impl
                statuses = []; // No status array needed for impl
                prefix = 'SC';
                break;
            case 'test':
                ids = traceItem?.testcase_ids || [];
                names = traceItem?.testcase_names || [];
                statuses = traceItem?.testcase_statuses || [];
                prefix = 'TC';
                break;
            default:
                return <span className="veritrace-his-artifact-nolink">-</span>;
        }

        // If no IDs found in the array, show placeholder
        if (!Array.isArray(ids) || ids.length === 0 || ids.every(id => id === null || id === undefined || id === '-')) {
            return <span className="veritrace-his-artifact-nolink">Not Linked</span>;
        }

        // Render each linked item vertically
        return (
            <div className="veritrace-his-artifact-cell-multi-content"> {/* Wrapper for multiple items */}
                {ids.map((id, index) => {
                    // Skip rendering if ID is invalid/missing for this specific index
                    if (id === null || id === undefined || id === '-') return null;

                    const formattedId = formatId(prefix, id);
                    // Get corresponding name and status safely
                    const displayName = (Array.isArray(names) && names[index] && names[index] !== 'N/A') ? names[index] : '';
                    const status = (Array.isArray(statuses) && statuses[index]) ? statuses[index] : null;

                    return (
                        // Wrap each item in a div for block display and styling
                        <div key={`${prefix}-${id}-${index}`} className="veritrace-his-artifact-item">
                            <div className="veritrace-his-artifact-id">{formattedId}</div>
                            {displayName && <div className="veritrace-his-artifact-name">{displayName}</div>}
                            {renderStatusBadge(status)}
                        </div>
                    );
                })}
            </div>
        );
    };
    // --- END: UPDATED Helper to Render Cell Content ---


    return (
        <div className="veritrace-his-modal-overlay-review">
            <div className="veritrace-his-modal-content-review wide">
                <div className="veritrace-his-modal-header">
                    <h3>Traceability Verification Details (Round: {traceItem?.create_round || 'N/A'})</h3> {/* Changed title */}
                    <button className="veritrace-his-close-modal-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="veritrace-his-modal-body">
                    {/* --- Linked Items Section (Uses Updated renderTableCell) --- */}
                    <div className="veritrace-his-linked-items-section">
                        <h4><FontAwesomeIcon icon={faProjectDiagram} className="veritrace-his-section-icon" />Traceability</h4>
                        {traceItem ? (
                            <div className="veritrace-his-modal-table-container">
                                <table className="veritrace-his-modal-artifact-table horizontal">
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

                    {/* Reviewer Section (Assumes merged verificationBy is passed) */}
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


// --- VeriTraceHis Component (UPDATED useEffect for grouping/merging) ---
const VeriTraceHis = () => {
    // --- State Variables ---
    const [traceHistory, setTraceHistory] = useState([]); // Raw data from API
    const [filteredTraceHistory, setFilteredTraceHistory] = useState([]); // Data after grouping, merging, filtering, sorting
    const [selectedTraceDetails, setSelectedTraceDetails] = useState(null);
    const [selectedVerificationBy, setSelectedVerificationBy] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState("verification_at");
    const [sortDirection, setSortDirection] = useState("desc");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [runTutorial, setRunTutorial] = useState(false);
    const [tutorialSteps] = useState([
        { target: '.veritrace-his-table', content: 'This table shows the history of traceability verification rounds.', placement: 'top' },
        { target: '.veritrace-his-row:first-child .veritrace-his-actions-cell .veritrace-his-view-details-btn', content: 'Click this button to see the details of the linked artifacts and reviewers for that specific verification round.', placement: 'right' },
        { target: '.veritrace-his-search-input', content: 'You can search the history by round number, creator, or date.', placement: 'bottom' },
        { target: '.veritrace-his-sortable-header', content: 'Click on column headers like "Round", "Create by", or "Verification_at" to sort the history.', placement: 'bottom' },
    ]);

    // --- Hooks ---
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Helper Functions ---
    const formatDate = useCallback((dateString) => { // Wrapped in useCallback as it's a dependency
        if (!dateString) return "N/A";
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.warn("Invalid Date detected:", dateString);
                return "Invalid Date";
            }
            return date.toLocaleDateString('en-GB', options);
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return "Invalid Date";
        }
    }, []); // No dependencies for formatDate itself

    // --- Data Fetching (No changes needed here) ---
    const fetchTraceHistory = useCallback(() => {
        if (!projectId) {
            toast.error("Project ID is missing in the URL.");
            setLoading(false);
            return Promise.reject("Missing Project ID");
        }
        setLoading(true);
        setIsRefreshing(true);
        const apiUrl = `http://localhost:3001/veritrace-history/${projectId}`;
        console.log(`VERITRACE_HIS: Fetching history from: ${apiUrl}`);

        return axios.get(apiUrl)
            .then((response) => {
                console.log("VERITRACE_HIS: Raw Response Data:", response.data);
                const rawData = Array.isArray(response.data) ? response.data : [];
                const processedData = rawData.map(item => ({
                    ...item,
                    verification_by: item.verification_by && typeof item.verification_by === 'object' && !Array.isArray(item.verification_by)
                                    ? item.verification_by : {}
                }));
                console.log("VERITRACE_HIS: Processed Data for State:", processedData);
                setTraceHistory(processedData);
            })
            .catch((err) => {
                console.error("VERITRACE_HIS: Error fetching history:", err);
                const errorMsg = err.response?.data?.message || err.message || 'Failed to load trace history.';
                toast.error(`Error loading history: ${err.response?.status || ''} - ${errorMsg}`);
                setTraceHistory([]);
            })
            .finally(() => {
                setLoading(false);
                setIsRefreshing(false);
             });
    }, [projectId]);

    // --- Effects ---
    useEffect(() => {
        fetchTraceHistory();
    }, [fetchTraceHistory]);

    useEffect(() => {
        if (!loading && traceHistory.length > 0) {
            const tutorialShown = localStorage.getItem('veriTraceHisTutorialShown');
            if (!tutorialShown) {
                const timer = setTimeout(() => setRunTutorial(true), 500);
                return () => clearTimeout(timer);
            }
        }
        if (loading || traceHistory.length === 0) {
            setRunTutorial(false);
        }
    }, [loading, traceHistory]);

    // --- UPDATED: Grouping, Merging, Filtering, and Sorting Effect ---
    useEffect(() => {
        let rawData = [...traceHistory];

        // --- START: Grouping and Merging Logic ---
        const groupedItems = rawData.reduce((acc, item) => {
            const key = item.create_round;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        const mergedResult = Object.values(groupedItems).map(group => {
            if (group.length === 1) return group[0]; // No merging needed if only one item

            // --- Merging Strategy ---
            // 1. Find the 'base' item (e.g., the one with the latest verification_at)
            group.sort((a, b) => new Date(b.verification_at) - new Date(a.verification_at));
            const baseItem = group[0];

            // 2. Initialize the merged item with base info and empty arrays/sets for traceability
            const mergedItem = {
                ...baseItem, // Use latest create_by, verification_at etc.
                // Use Sets to easily collect unique IDs during iteration
                _reqIds: new Set(),
                _designIds: new Set(),
                _implIds: new Set(),
                _testIds: new Set(),
                // Arrays to store the final ordered data corresponding to unique IDs
                requirement_ids: [], requirement_names: [], requirement_statuses: [],
                design_ids: [], design_names: [], design_statuses: [],
                implement_ids: [], implement_files: [], // Note: using 'implement_files' for name
                testcase_ids: [], testcase_names: [], testcase_statuses: [],
                // Merged verification_by
                verification_by: { ...baseItem.verification_by } // Start with base reviewers
            };

            // 3. Iterate through ALL items in the group to collect unique links and merge reviewers
            const artifactInfoMap = { req: {}, design: {}, impl: {}, test: {} }; // Store name/status per ID

            group.forEach(item => {
                // --- Collect Requirement Links ---
                if (item.requirement_id && !mergedItem._reqIds.has(item.requirement_id)) {
                    mergedItem._reqIds.add(item.requirement_id);
                    artifactInfoMap.req[item.requirement_id] = { name: item.requirement_name, status: item.requirement_status };
                }
                // --- Collect Design Links ---
                if (item.design_id && !mergedItem._designIds.has(item.design_id)) {
                    mergedItem._designIds.add(item.design_id);
                    artifactInfoMap.design[item.design_id] = { name: item.design_name, status: item.design_status };
                }
                // --- Collect Implementation Links ---
                if (item.implement_id && !mergedItem._implIds.has(item.implement_id)) {
                    mergedItem._implIds.add(item.implement_id);
                    artifactInfoMap.impl[item.implement_id] = { file: item.implement_file }; // Only file name relevant
                }
                // --- Collect Test Case Links ---
                if (item.testcase_id && !mergedItem._testIds.has(item.testcase_id)) {
                    mergedItem._testIds.add(item.testcase_id);
                    artifactInfoMap.test[item.testcase_id] = { name: item.testcase_name, status: item.testcase_status };
                }

                // --- Merge Reviewers ---
                if (item.verification_by) {
                    Object.entries(item.verification_by).forEach(([name, status]) => {
                        // Add if new, or prioritize 'true' status
                        if (!mergedItem.verification_by[name] || (mergedItem.verification_by[name] === false && status === true)) {
                            mergedItem.verification_by[name] = status;
                        }
                    });
                }
            });

            // 4. Populate the final arrays from the unique Sets and the info map
            mergedItem._reqIds.forEach(id => {
                mergedItem.requirement_ids.push(id);
                mergedItem.requirement_names.push(artifactInfoMap.req[id]?.name || 'N/A');
                mergedItem.requirement_statuses.push(artifactInfoMap.req[id]?.status || null);
            });
            mergedItem._designIds.forEach(id => {
                mergedItem.design_ids.push(id);
                mergedItem.design_names.push(artifactInfoMap.design[id]?.name || 'N/A');
                mergedItem.design_statuses.push(artifactInfoMap.design[id]?.status || null);
            });
            mergedItem._implIds.forEach(id => {
                mergedItem.implement_ids.push(id);
                mergedItem.implement_files.push(artifactInfoMap.impl[id]?.file || 'N/A');
            });
            mergedItem._testIds.forEach(id => {
                mergedItem.testcase_ids.push(id);
                mergedItem.testcase_names.push(artifactInfoMap.test[id]?.name || 'N/A');
                mergedItem.testcase_statuses.push(artifactInfoMap.test[id]?.status || null);
            });

             // 5. Clean up temporary Sets
             delete mergedItem._reqIds;
             delete mergedItem._designIds;
             delete mergedItem._implIds;
             delete mergedItem._testIds;


            console.log("MERGED ITEM for Round", mergedItem.create_round, mergedItem); // Log the merged item
            return mergedItem;
        });
        // --- END: Grouping and Merging Logic ---

        // Apply filtering to the MERGED result
        let filteredResult = mergedResult;
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredResult = mergedResult.filter(item => {
                const roundMatch = item.create_round?.toString().toLowerCase().includes(lowerSearchTerm);
                const creatorMatch = item.create_by?.toLowerCase().includes(lowerSearchTerm);
                const dateMatch = formatDate(item.verification_at)?.toLowerCase().includes(lowerSearchTerm);
                 // Add search within merged arrays if needed (more complex)
                return roundMatch || creatorMatch || dateMatch;
            });
        }

        // Apply Sorting to the filtered (and merged) result
        filteredResult.sort((a, b) => {
           // --- Keep existing robust sorting logic ---
           let compareA, compareB;
           const field = sortField;
           switch (field) {
               case "create_round": compareA = a.create_round; compareB = b.create_round; break;
               case "create_by": compareA = a.create_by || ""; compareB = b.create_by || ""; break;
               case "verification_at":
               default: compareA = a.verification_at ? new Date(a.verification_at) : null; compareB = b.verification_at ? new Date(b.verification_at) : null; break;
           }
           const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
           if (compareA === null && compareB === null) return 0;
           if (compareA === null) return 1 * directionMultiplier;
           if (compareB === null) return -1 * directionMultiplier;
           if (compareA instanceof Date && compareB instanceof Date) {
                const timeA = isNaN(compareA.getTime()) ? (sortDirection === 'asc' ? Infinity : -Infinity) : compareA.getTime();
                const timeB = isNaN(compareB.getTime()) ? (sortDirection === 'asc' ? Infinity : -Infinity) : compareB.getTime();
                return (timeA - timeB) * directionMultiplier;
           } else if (typeof compareA === 'string' && typeof compareB === 'string') {
               return compareA.localeCompare(compareB) * directionMultiplier;
           } else if (typeof compareA === 'number' && typeof compareB === 'number') {
               return (compareA - compareB) * directionMultiplier;
           }
           return 0;
        });

        setFilteredTraceHistory(filteredResult);

    }, [traceHistory, searchTerm, sortField, sortDirection, formatDate]); // Dependencies

    // --- Event Handlers (No changes needed) ---
    const handleViewDetails = (traceItem) => {
        console.log("VERITRACE_HIS: handleViewDetails called with MERGED item:", traceItem); // Log merged item
        setSelectedTraceDetails(traceItem);
        // Pass the merged verification_by to the modal state
        setSelectedVerificationBy(traceItem.verification_by || {});
        setShowModal(true);
    };

    const handleBack = () => navigate(`/viewVerifyTrace?project_id=${projectId}`);

    const handleSortChange = (field) => {
        setSortDirection(currentDirection => {
            if (sortField === field) {
                return currentDirection === 'asc' ? 'desc' : 'asc';
            } else {
                setSortField(field);
                return 'desc';
            }
        });
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedTraceDetails(null);
        setSelectedVerificationBy({});
    };

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTutorial(false);
            localStorage.setItem('veriTraceHisTutorialShown', 'true');
        }
    };

    const handleRestartTutorial = () => {
        setRunTutorial(false);
        localStorage.removeItem('veriTraceHisTutorialShown');
        setTimeout(() => {
            window.scrollTo(0, 0);
            setRunTutorial(true);
        }, 100);
    };


    // --- Helper to Render Sort Icons ---
    const renderSortIcon = (field) => {
        if (sortField !== field) return null;
        return <FontAwesomeIcon className="veritrace-his-sort-icon" icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} />;
    };


    // --- Render Logic ---
    if (loading && !isRefreshing) {
        return (
            <div className="veritrace-his-container">
                <div className="loading-state"> <div className="loading-spinner"></div> <p>Loading traceability verification history...</p> </div>
            </div>
        );
    }

    return (
        <div className="veritrace-his-container">
            <Joyride steps={tutorialSteps} run={runTutorial} continuous showProgress showSkipButton styles={{ options: { zIndex: 10000, arrowColor: '#fff', backgroundColor: '#fff', primaryColor: '#007bff', textColor: '#333', } }} callback={handleJoyrideCallback} />

            <div className="veritrace-his-header">
                <button className="veritrace-his-back-btn" onClick={handleBack} title="Go back to Verification Page"> <FontAwesomeIcon icon={faArrowLeft} /> Back </button>
                <h1> <FontAwesomeIcon icon={faHistory} className="veritrace-his-title-icon" /> Traceability Verification History </h1>
                <button onClick={handleRestartTutorial} className="veritrace-his-tutorial-help-button" title="Show Tutorial Again" style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '1.6rem', background: 'none', border: 'none', color: '#555', cursor: 'pointer', zIndex: 5 }} > <FontAwesomeIcon icon={faQuestionCircle} /> </button>
            </div>

            <div className="veritrace-his-content">
                <div className="veritrace-his-panel">
                    <div className="veritrace-his-panel-header">
                        <h2> <FontAwesomeIcon icon={faListAlt} /> Trace History Log <span className="veritrace-his-count-badge">{filteredTraceHistory.length}</span> </h2>
                        <div className="veritrace-his-tools">
                            <div className="veritrace-his-search">
                                <FontAwesomeIcon icon={faSearch} className="veritrace-his-search-icon" />
                                <input type="text" placeholder="Search Round, Creator, Date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="veritrace-his-search-input" disabled={loading || isRefreshing} />
                                {searchTerm && ( <button className="veritrace-his-clear-search" onClick={() => setSearchTerm("")} title="Clear search" disabled={loading || isRefreshing} > <FontAwesomeIcon icon={faTimes} /> </button> )}
                            </div>
                        </div>
                    </div>

                    <div className="veritrace-his-table-container">
                        {isRefreshing && ( <div className="loading-state small inline"> <div className="loading-spinner small"></div> Refreshing... </div> )}
                        {!isRefreshing && filteredTraceHistory.length === 0 ? (
                            <div className="veritrace-his-empty-state"> <FontAwesomeIcon icon={faHistory} className="empty-icon" /> <p>{searchTerm ? "No history entries found matching your search." : "No traceability verification history is available for this project yet."}</p> {searchTerm && <p className="empty-subtitle">Try adjusting or clearing your search filter.</p>} </div>
                        ) : (
                            <table className="veritrace-his-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSortChange('create_round')} className="veritrace-his-sortable-header"> Round {renderSortIcon('create_round')} </th>
                                        <th onClick={() => handleSortChange('create_by')} className="veritrace-his-sortable-header"> Create by {renderSortIcon('create_by')} </th>
                                        <th onClick={() => handleSortChange('verification_at')} className="veritrace-his-sortable-header"> Verification Date {renderSortIcon('verification_at')} </th>
                                        <th className="veritrace-his-actions-header">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTraceHistory.map((traceItem) => (
                                        <tr key={traceItem.veritrace_id || traceItem.create_round} className="veritrace-his-row">
                                            <td className="veritrace-his-hist-round-cell">VERIF-{traceItem.create_round}</td>
                                            <td className="veritrace-his-hist-creator-cell"> <div className="creator-info"> <FontAwesomeIcon icon={faUser} className="cell-icon" /> <span>{traceItem.create_by || "N/A"}</span> </div> </td>
                                            <td className="veritrace-his-hist-date-cell"> <div className="date-info"> <FontAwesomeIcon icon={faCalendarAlt} className="cell-icon" /> <span>{formatDate(traceItem.verification_at)}</span> </div> </td>
                                            <td className="veritrace-his-actions-cell"> <button className="veritrace-his-view-details-btn" title="View Details" onClick={() => handleViewDetails(traceItem)} > <FontAwesomeIcon icon={faEye} /> </button> </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <Modal show={showModal} onClose={closeModal} traceItem={selectedTraceDetails} verificationBy={selectedVerificationBy} />
        </div>
    );
};

export default VeriTraceHis;