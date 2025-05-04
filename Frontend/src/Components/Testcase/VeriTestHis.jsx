import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride';
import { toast } from "react-toastify";
import axios from "axios";
import "./testcase_css/VeriTestHis.css"; // Ensure CSS is correct

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch, faTimes, faCalendarAlt, faUser, faClipboardCheck,
    faVial, faArrowLeft, faSortAmountDown, faSortAmountUp,
    faEye, faUsers, faListAlt, faHistory, faCheckCircle, faQuestionCircle,
    faTimesCircle // Added faTimesCircle for modal status
} from "@fortawesome/free-solid-svg-icons";


// --- Modal Component (Adapted for Test Case & OBJECT structure) ---
const Modal = ({ show, onClose, testCaseId = null, verificationBy = {} }) => { // <-- Default verificationBy to {}
    if (!show) return null;

    // --- Parsing Logic for OBJECT structure ---
    const reviewerObject = verificationBy && typeof verificationBy === 'object' && !Array.isArray(verificationBy)
                           ? verificationBy
                           : {};
    const parsedVerificationBy = Object.entries(reviewerObject)
        .map(([name, value]) => {
            if (typeof value !== 'boolean') {
                console.warn(`Modal (Test Case) Warning: Value for reviewer "${name}" is not boolean:`, value);
                return { name: name, value: null }; // Treat as unknown
            }
            return { name: name, value: value };
        });
    // --- End Parsing Logic ---

    const displayTestCaseId = testCaseId;

    return (
        <div className="modal-overlay-review"> {/* Use CSS classes from VeriTestHis.css */}
            <div className="modal-content-review">
                <div className="modal-header">
                    <h3>Test Case Verification Details</h3>
                    <button className="close-modal-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="modal-body">
                    {/* Reviewer Section */}
                    <div className="reviewer-section">
                        <h4>
                            <FontAwesomeIcon icon={faUsers} className="section-icon" />
                            Reviewers & Status
                        </h4>
                        {parsedVerificationBy.length > 0 ? (
                            <div className="reviewers-list">
                                {parsedVerificationBy.map((person, index) => (
                                    <div className="reviewer-item" key={index}>
                                        <div className="reviewer-avatar"><FontAwesomeIcon icon={faUser} /></div>
                                        <div className="reviewer-info">
                                            <span className="reviewer-name">{person.name}</span>
                                            {person.value === true && (<span className="reviewer-status verified">Verified</span>)}
                                            {person.value === false && (<span className="reviewer-status not-verified">Not Verified</span>)}
                                            {person.value === null && (<span className="reviewer-status unknown">Status Unknown</span>)}
                                        </div>
                                        {person.value === true && (<FontAwesomeIcon icon={faCheckCircle} className="status-icon verified" />)}
                                        {/* Use faTimesCircle for false status */}
                                        {person.value === false && (<FontAwesomeIcon icon={faTimesCircle} className="status-icon not-verified" />)}
                                        {person.value === null && (<FontAwesomeIcon icon={faQuestionCircle} className="status-icon unknown" />)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-message">No reviewer information found.</div>
                        )}
                    </div>
                    {/* Test Case Section */}
                    <div className="requirement-section"> {/* Keep class name or rename if CSS is adapted */}
                        <h4>
                            <FontAwesomeIcon icon={faVial} className="section-icon" />
                            Associated Test Case
                        </h4>
                        {displayTestCaseId !== null && displayTestCaseId !== undefined ? (
                            <div className="requirements-list"> {/* Keep class name or rename */}
                                <div className="requirement-item"> {/* Keep class name or rename */}
                                    <FontAwesomeIcon icon={faClipboardCheck} className="req-icon" /> {/* Keep icon or change */}
                                    <span className="req-id">TC-{String(displayTestCaseId).padStart(3, '0')}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-message">No associated test case ID found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- VeriTestHis Component ---
const VeriTestHis = () => {
    // --- State Variables ---
    const [testCaseHistory, setTestCaseHistory] = useState([]);
    const [filteredTestCaseHistory, setFilteredTestCaseHistory] = useState([]);
    const [selectedTestCaseId, setSelectedTestCaseId] = useState(null);
    // <<< Initialize state to null or {} >>>
    const [selectedVeriTestCaseBy, setSelectedVeriTestCaseBy] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState("veritestcase_at");
    const [sortDirection, setSortDirection] = useState("desc");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [runTutorial, setRunTutorial] = useState(false);
    const [tutorialSteps] = useState([
     {
       target: '.veritesthis-table', // Class for Test Case History table
       content: 'This table shows the history of all completed test case verification rounds.',
       placement: 'top',
       disableBeacon: true,
      },
      {
        target: '.veritesthis-row:first-child .actions-cell .view-details-btn', // Class for button
        content: 'Click the eye icon to see details like the associated test case and reviewer actions.',
        placement: 'right',
       },
    ]);

    // --- Hooks ---
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Data Fetching ---
    const fetchTestCaseHistory = useCallback(() => {
        if (!projectId) {
            toast.error("Project ID is missing."); setLoading(false); return Promise.reject("Missing Project ID");
        }
        setLoading(true);
        const apiUrl = `http://localhost:3001/veritestcase-history/${projectId}`; // API for test case
        console.log(`TESTCASE_HIS: Fetching history from: ${apiUrl}`);

        return axios.get(apiUrl)
            .then((response) => {
                console.log("TESTCASE_HIS: Raw Response Data:", response.data); // Log raw response

                // --- START: CORRECTED DATA PROCESSING FOR TEST CASE ---
                const processedData = (response.data || []).map(item => {
                    // Check if item.veritestcase_by is a non-array object, otherwise default to {}
                    const reviewerData = item.veritestcase_by && typeof item.veritestcase_by === 'object' && !Array.isArray(item.veritestcase_by)
                                        ? item.veritestcase_by
                                        : {};
                    // Log the processing for each item
                     console.log(`TESTCASE_HIS: Processing item ID ${item.veritestcase_id}: Original veritestcase_by:`, item.veritestcase_by, `Processed as:`, reviewerData);
                    return {
                        ...item, // Keep other fields from the item
                        veritestcase_by: reviewerData // Assign the processed object (or {} )
                    };
                });
                // --- END: CORRECTED DATA PROCESSING FOR TEST CASE ---

                console.log("TESTCASE_HIS: Processed Data for State:", processedData); // Log final data
                setTestCaseHistory(processedData); // Set state with processed data
            })
            .catch((err) => {
                console.error("TESTCASE_HIS: Error fetching history:", err);
                const errorMsg = err.response?.data?.message || err.message || 'Failed to load history.';
                toast.error(`Error: ${err.response?.status || ''} - ${errorMsg}`);
                setTestCaseHistory([]);
            })
            .finally(() => { setLoading(false); setIsRefreshing(false); });
    }, [projectId]);

    // --- Effects ---
    useEffect(() => { fetchTestCaseHistory(); }, [fetchTestCaseHistory]);

    useEffect(() => { // Tutorial Trigger
        const tutorialShown = localStorage.getItem('veriTestHisTutorialShown');
        if (!tutorialShown && !loading && testCaseHistory.length > 0) {
            const timer = setTimeout(() => setRunTutorial(true), 500); return () => clearTimeout(timer);
        }
    }, [loading, testCaseHistory]);

     // --- Filtering and Sorting Effect (uses testCaseHistory state) ---
    useEffect(() => {
        let result = [...testCaseHistory]; // Use the processed state
        if (searchTerm) {
             const lowerSearchTerm = searchTerm.toLowerCase();
             // Filter based on visible columns (adjust if needed)
             result = result.filter(item => {
                const logIdMatch = `verif-${item.veritestcase_id}`.toLowerCase().includes(lowerSearchTerm); // Use VERIF- prefix like table
                const creatorMatch = item.create_by && item.create_by.toLowerCase().includes(lowerSearchTerm);
                const dateMatch = formatDate(item.veritestcase_at).toLowerCase().includes(lowerSearchTerm);
                return logIdMatch || creatorMatch || dateMatch;
             });
        }

        // Sort based on state
        result.sort((a, b) => {
            let compareA, compareB;
            const field = sortField === 'round_display' ? 'veritestcase_id' : sortField;

            switch (field) {
                case "veritestcase_id": compareA = a.veritestcase_id; compareB = b.veritestcase_id; break;
                case "create_by": compareA = a.create_by || ""; compareB = b.create_by || ""; break;
                case "veritestcase_at": compareA = a.veritestcase_at ? new Date(a.veritestcase_at) : null; compareB = b.veritestcase_at ? new Date(b.veritestcase_at) : null; break;
                default:
                    compareA = b.veritestcase_at ? new Date(b.veritestcase_at) : null;
                    compareB = a.veritestcase_at ? new Date(a.veritestcase_at) : null;
            }
            const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
            // Comparison logic... (keep as is)
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
        setFilteredTestCaseHistory(result); // Update filtered state
    }, [testCaseHistory, searchTerm, sortField, sortDirection]); // Depend on processed testCaseHistory state


    // --- Event Handlers ---
    const handleViewDetails = (testCaseId, veriTestCaseByFromItem) => {
        // --- LOGGING: Check data received by handler ---
        console.log("--- TESTCASE_HIS: handleViewDetails Called ---");
        console.log("Received testCaseId:", testCaseId);
        console.log("Received veriTestCaseByFromItem:", veriTestCaseByFromItem, `(Type: ${typeof veriTestCaseByFromItem})`);
        console.log("--------------------------------------");
        // --- End Logging ---

        setSelectedTestCaseId(testCaseId);
        // --- FIX: Default to empty OBJECT {} ---
        setSelectedVeriTestCaseBy(veriTestCaseByFromItem || {});
        setShowModal(true);
    };

    const handleBack = () => { navigate(`/VeriTestcase?project_id=${projectId}`); }; // Navigate back

    const handleSortChange = (displayField) => {
        const actualSortField = displayField === 'round_display' ? 'veritestcase_id' : displayField;
        if (sortField === actualSortField) {
            setSortDirection(currentDirection => currentDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(actualSortField);
            setSortDirection('desc');
        }
    };

    const closeModal = () => setShowModal(false);
    const handleJoyrideCallback = (data) => { const { status } = data; if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) { setRunTutorial(false); localStorage.setItem('veriTestHisTutorialShown', 'true'); } };
    const handleRestartTutorial = () => { setRunTutorial(false); localStorage.removeItem('veriTestHisTutorialShown'); setTimeout(() => setRunTutorial(true), 100); };

    // --- Helper Functions ---
    const formatDate = (dateString) => { if (!dateString) return "N/A"; const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }; try { const date = new Date(dateString); if (isNaN(date.getTime())) { return "Invalid Date"; } return date.toLocaleDateString('en-GB', options); } catch (e) { return "Invalid Date"; } };
    const renderSortIcon = (displayField) => { const actualSortField = displayField === 'round_display' ? 'veritestcase_id' : displayField; if (sortField !== actualSortField) return null; return <FontAwesomeIcon icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} />; };


    // --- Render Logic ---
    if (loading && !isRefreshing) {
        return (
            <div className="veritesthis-container"> {/* Use VeriTestHis CSS classes */}
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading test case verification history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="veritesthis-container"> {/* Use VeriTestHis CSS classes */}
            <Joyride steps={tutorialSteps} run={runTutorial} continuous showProgress showSkipButton styles={{ options: { zIndex: 10000 } }} callback={handleJoyrideCallback} />
            <div className="veritesthis-header">
                <button className="veritesthis-back-btn" onClick={handleBack}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1>
                    <FontAwesomeIcon icon={faHistory} className="veritesthis-title-icon" />
                     Test Case Verification History
                </h1>
                 <button onClick={handleRestartTutorial} className="tutorial-help-button tutorial-help-button-corner-vth" title="Show Tutorial Again" style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '1.6rem', background: 'none', border: 'none', color: '#333', cursor: 'pointer', zIndex: 5 }}><FontAwesomeIcon icon={faQuestionCircle} /></button>
            </div>
            <div className="veritesthis-content">
                <div className="veritesthis-panel">
                    <div className="veritesthis-panel-header">
                        <h2><FontAwesomeIcon icon={faListAlt} /> History Log <span className="veritesthis-count-badge">{filteredTestCaseHistory.length}</span></h2>
                        <div className="veritesthis-tools">
                            <div className="veritesthis-search">
                                <FontAwesomeIcon icon={faSearch} className="veritesthis-search-icon" />
                                <input type="text" placeholder="Search Round/Log ID, Creator..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="veritesthis-search-input" disabled={loading || isRefreshing} />
                                {searchTerm && (<button className="veritesthis-clear-search" onClick={() => setSearchTerm("")} title="Clear search"><FontAwesomeIcon icon={faTimes} /></button>)}
                            </div>
                             {/* Refresh Button Optional */}
                        </div>
                    </div>
                    <div className="veritesthis-table-container">
                        {isRefreshing && <div className="loading-state small"><div className="loading-spinner"></div> Refreshing...</div>}
                        {!isRefreshing && filteredTestCaseHistory.length === 0 ? (
                            <div className="veritesthis-empty-state">
                                <FontAwesomeIcon icon={faHistory} className="empty-icon" />
                                <p>{searchTerm ? "No history found matching criteria." : "No test case verification history available."}</p>
                                {searchTerm && <p className="empty-subtitle">Try clearing the search filter.</p>}
                            </div>
                        ) : (
                            <table className="veritesthis-table">
                                <thead>
                                    <tr>
                                        {/* Table Headers matching the previous request structure */}
                                        <th onClick={() => handleSortChange('round_display')} className="sortable-header">
                                            ROUND {renderSortIcon('round_display')}
                                        </th>
                                        <th onClick={() => handleSortChange('create_by')} className="sortable-header">
                                            CREATE BY {renderSortIcon('create_by')}
                                        </th>
                                        <th onClick={() => handleSortChange('veritestcase_at')} className="sortable-header">
                                            VERIFICATION_AT {renderSortIcon('veritestcase_at')}
                                        </th>
                                        <th>DETAILS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {/* Use filteredTestCaseHistory which has OBJECTS in veritestcase_by */}
                                    {filteredTestCaseHistory.map((testCase) => (
                                        <tr key={testCase.veritestcase_round} className="veritesthis-row">
                                             {/* Display Round/Log ID */}
                                            <td className="hist-id-cell">VERIF-{testCase.veritestcase_round}</td>
                                             {/* Display Creator */}
                                            <td className="hist-creator-cell">
                                                <div className="creator-info">
                                                    <FontAwesomeIcon icon={faUser} className="cell-icon" />
                                                    <span>{testCase.create_by || "N/A"}</span>
                                                </div>
                                            </td>
                                             {/* Display Date */}
                                            <td className="hist-date-cell">
                                                <div className="date-info">
                                                    <FontAwesomeIcon icon={faCalendarAlt} className="cell-icon" />
                                                    <span>{formatDate(testCase.veritestcase_at)}</span>
                                                </div>
                                            </td>
                                            {/* Display Details Button */}
                                            <td className="actions-cell">
                                                <button
                                                    className="view-details-btn"
                                                    title="View Details"
                                                    // Pass the OBJECT from the item state
                                                    onClick={() => handleViewDetails(testCase.testcase_id, testCase.veritestcase_by)}
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

            {/* Modal - Now expects verificationBy as an OBJECT */}
            <Modal
                show={showModal}
                onClose={closeModal}
                testCaseId={selectedTestCaseId}
                verificationBy={selectedVeriTestCaseBy} // Pass the state which should hold an object
            />
        </div>
    );
};

export default VeriTestHis;