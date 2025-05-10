import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride';
import { toast } from "react-toastify";
import axios from "axios";
// Updated CSS path to match the component name convention
import "./testcase_css/VeriTestHis.css"; // Make sure this CSS file uses 'veritesthis-' prefix

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch, faTimes, faCalendarAlt, faUser, faClipboardCheck,
    faVial, faArrowLeft, faSortAmountDown, faSortAmountUp,
    faEye, faUsers, faListAlt, faHistory, faCheckCircle, faQuestionCircle,
    faTimesCircle // Added faTimesCircle for modal status
} from "@fortawesome/free-solid-svg-icons";


// --- Modal Component (Updated with 'veritesthis-' prefix) ---
const Modal = ({ show, onClose, testCaseId = null, verificationBy = {} }) => {
    if (!show) return null;

    // Parsing Logic for OBJECT structure (unchanged)
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

    const displayTestCaseId = testCaseId;

    return (
        // Use consistent prefix for modal elements
        <div className="veritesthis-modal-overlay">
            <div className="veritesthis-modal-content">
                <div className="veritesthis-modal-header">
                    <h3>Test Case Verification Details</h3>
                    <button className="veritesthis-modal-close-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="veritesthis-modal-body">
                    {/* Reviewer Section */}
                    <div className="veritesthis-modal-reviewer-section">
                        <h4>
                            <FontAwesomeIcon icon={faUsers} className="veritesthis-modal-section-icon" />
                            Reviewers & Status
                        </h4>
                        {parsedVerificationBy.length > 0 ? (
                            <div className="veritesthis-modal-reviewers-list">
                                {parsedVerificationBy.map((person, index) => (
                                    <div className="veritesthis-modal-reviewer-item" key={index}>
                                        <div className="veritesthis-modal-reviewer-avatar"><FontAwesomeIcon icon={faUser} /></div>
                                        <div className="veritesthis-modal-reviewer-info">
                                            <span className="veritesthis-modal-reviewer-name">{person.name}</span>
                                            {/* Updated status classes */}
                                            {person.value === true && (<span className="veritesthis-modal-reviewer-status veritesthis-modal-status-verified">Verified</span>)}
                                            {person.value === false && (<span className="veritesthis-modal-reviewer-status veritesthis-modal-status-not-verified">Not Verified</span>)}
                                            {person.value === null && (<span className="veritesthis-modal-reviewer-status veritesthis-modal-status-unknown">Status Unknown</span>)}
                                        </div>
                                        {/* Updated status icon classes */}
                                        {person.value === true && (<FontAwesomeIcon icon={faCheckCircle} className="veritesthis-modal-status-icon veritesthis-modal-status-verified" />)}
                                        {person.value === false && (<FontAwesomeIcon icon={faTimesCircle} className="veritesthis-modal-status-icon veritesthis-modal-status-not-verified" />)}
                                        {person.value === null && (<FontAwesomeIcon icon={faQuestionCircle} className="veritesthis-modal-status-icon veritesthis-modal-status-unknown" />)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="veritesthis-modal-empty-message">No reviewer information found.</div>
                        )}
                    </div>
                    {/* Test Case Section */}
                    <div className="veritesthis-modal-testcase-section"> {/* Renamed section */}
                        <h4>
                            <FontAwesomeIcon icon={faVial} className="veritesthis-modal-section-icon" />
                            Test Case
                        </h4>
                        {displayTestCaseId !== null && displayTestCaseId !== undefined ? (
                            <div className="veritesthis-modal-testcase-list"> {/* Renamed list */}
                                <div className="veritesthis-modal-testcase-item"> {/* Renamed item */}
                                    <FontAwesomeIcon icon={faClipboardCheck} className="veritesthis-modal-testcase-icon" /> {/* Renamed icon */}
                                    <span className="veritesthis-modal-testcase-id">TC-{String(displayTestCaseId).padStart(3, '0')}</span> {/* Renamed ID */}
                                </div>
                            </div>
                        ) : (
                            <div className="veritesthis-modal-empty-message">No associated test case ID found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- VeriTestHis Component (Updated with 'veritesthis-' prefix) ---
const VeriTestHis = () => {
    // --- State Variables (unchanged) ---
    const [testCaseHistory, setTestCaseHistory] = useState([]);
    const [filteredTestCaseHistory, setFilteredTestCaseHistory] = useState([]);
    const [selectedTestCaseId, setSelectedTestCaseId] = useState(null);
    const [selectedVeriTestCaseBy, setSelectedVeriTestCaseBy] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState("veritestcase_at");
    const [sortDirection, setSortDirection] = useState("desc");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [runTutorial, setRunTutorial] = useState(false);

    // Updated Joyride targets
    const [tutorialSteps] = useState([
        {
            target: '.veritesthis-table', // Uses updated table class
            content: 'This table shows the history of all completed test case verification rounds.',
            placement: 'top',
            disableBeacon: true,
        },
        {
            target: '.veritesthis-row:first-child .veritesthis-actions-cell .veritesthis-view-details-btn', // Uses updated cell/button classes
            content: 'Click the eye icon to see details like the associated test case and reviewer actions.',
            placement: 'right',
        },
    ]);

    // --- Hooks (unchanged) ---
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Data Fetching (Logic unchanged) ---
    const fetchTestCaseHistory = useCallback(() => {
        if (!projectId) { toast.error("Project ID is missing."); setLoading(false); return Promise.reject("Missing Project ID"); }
        setLoading(true);
        const apiUrl = `http://localhost:3001/veritestcase-history/${projectId}`;
        console.log(`TESTCASE_HIS: Fetching history from: ${apiUrl}`);

        return axios.get(apiUrl)
            .then((response) => {
                console.log("TESTCASE_HIS: Raw Response Data:", response.data);
                const processedData = (response.data || []).map(item => {
                    const reviewerData = item.veritestcase_by && typeof item.veritestcase_by === 'object' && !Array.isArray(item.veritestcase_by)
                        ? item.veritestcase_by : {};
                    // console.log(`TESTCASE_HIS: Processing item ID ${item.veritestcase_id}: Original veritestcase_by:`, item.veritestcase_by, `Processed as:`, reviewerData);
                    return { ...item, veritestcase_by: reviewerData };
                });
                console.log("TESTCASE_HIS: Processed Data for State:", processedData);
                setTestCaseHistory(processedData);
            })
            .catch((err) => {
                console.error("TESTCASE_HIS: Error fetching history:", err);
                const errorMsg = err.response?.data?.message || err.message || 'Failed to load history.';
                toast.error(`Error: ${err.response?.status || ''} - ${errorMsg}`);
                setTestCaseHistory([]);
            })
            .finally(() => { setLoading(false); setIsRefreshing(false); });
    }, [projectId]);

    // --- Effects (Logic unchanged) ---
    useEffect(() => { fetchTestCaseHistory(); }, [fetchTestCaseHistory]);

    useEffect(() => { // Tutorial Trigger
        const tutorialShown = localStorage.getItem('veriTestHisTutorialShown');
        if (!tutorialShown && !loading && testCaseHistory.length > 0) {
            const timer = setTimeout(() => setRunTutorial(true), 500); return () => clearTimeout(timer);
        }
    }, [loading, testCaseHistory]);

    // --- Filtering and Sorting Effect (Logic unchanged) ---
    useEffect(() => {
        let result = [...testCaseHistory];
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(item => {
                const logIdMatch = `verif-${item.veritestcase_id}`.toLowerCase().includes(lowerSearchTerm);
                const creatorMatch = item.create_by && item.create_by.toLowerCase().includes(lowerSearchTerm);
                const dateMatch = formatDate(item.veritestcase_at).toLowerCase().includes(lowerSearchTerm);
                return logIdMatch || creatorMatch || dateMatch;
            });
        }
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
        setFilteredTestCaseHistory(result);
    }, [testCaseHistory, searchTerm, sortField, sortDirection]);

    // --- Event Handlers (Logic unchanged) ---
    const handleViewDetails = (testCaseId, veriTestCaseByFromItem) => {
        // console.log("--- TESTCASE_HIS: handleViewDetails Called ---"); // Optional logging
        // console.log("Received testCaseId:", testCaseId);
        // console.log("Received veriTestCaseByFromItem:", veriTestCaseByFromItem);
        setSelectedTestCaseId(testCaseId);
        setSelectedVeriTestCaseBy(veriTestCaseByFromItem || {}); // Default to empty object
        setShowModal(true);
    };
    const handleBack = () => { navigate(`/VeriTestcase?project_id=${projectId}`); };
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
    // Added class to sort icon
    const renderSortIcon = (displayField) => { const actualSortField = displayField === 'round_display' ? 'veritestcase_id' : displayField; if (sortField !== actualSortField) return null; return <FontAwesomeIcon icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} className="veritesthis-sort-icon" />; };


    // --- Render Logic (Updated class names) ---
    if (loading && !isRefreshing) {
        return (
            <div className="veritesthis-container">
                {/* Updated loading state classes */}
                <div className="veritesthis-loading-state">
                    <div className="veritesthis-loading-spinner"></div>
                    <p>Loading test case verification history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="veritesthis-container">
            <Joyride steps={tutorialSteps} run={runTutorial} continuous showProgress showSkipButton styles={{ options: { zIndex: 10000 } }} callback={handleJoyrideCallback} />
            <div className="veritesthis-header">
                <button className="veritesthis-back-btn" onClick={handleBack}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1>
                    <FontAwesomeIcon icon={faHistory} className="veritesthis-title-icon" />
                    Test Case Verification History
                </h1>
                {/* Updated tutorial button class */}
                <button onClick={handleRestartTutorial} className="veritesthis-tutorial-help-button veritesthis-tutorial-help-button-corner-vth" title="Show Tutorial Again" style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '1.6rem', background: 'none', border: 'none', color: '#333', cursor: 'pointer', zIndex: 5 }}><FontAwesomeIcon icon={faQuestionCircle} /></button>
            </div>
            <div className="veritesthis-content">
                <div className="veritesthis-panel">
                    <div className="veritesthis-panel-header">
                        {/* Added panel icon class */}
                        <h2><FontAwesomeIcon icon={faListAlt} className="veritesthis-panel-icon" /> History Log <span className="veritesthis-count-badge">{filteredTestCaseHistory.length}</span></h2>
                        <div className="veritesthis-tools">
                            <div className="veritesthis-search">
                                <FontAwesomeIcon icon={faSearch} className="veritesthis-search-icon" />
                                <input type="text" placeholder="Search Round/Log ID, Creator..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="veritesthis-search-input" disabled={loading || isRefreshing} />
                                {/* Updated clear search button class */}
                                {searchTerm && (<button className="veritesthis-clear-search-btn" onClick={() => setSearchTerm("")} title="Clear search"><FontAwesomeIcon icon={faTimes} /></button>)}
                            </div>
                            {/* Refresh Button Optional */}
                        </div>
                    </div>
                    <div className="veritesthis-table-container">
                        {/* Updated refreshing state structure */}
                        {isRefreshing && (
                            <div className="veritesthis-refreshing-state">
                                <div className="veritesthis-loading-spinner veritesthis-loading-spinner-small"></div> Refreshing...
                            </div>
                        )}
                        {!isRefreshing && filteredTestCaseHistory.length === 0 ? (
                            <div className="veritesthis-empty-state">
                                <FontAwesomeIcon icon={faHistory} className="veritesthis-empty-icon" />
                                <p>{searchTerm ? "No history found matching criteria." : "No test case verification history available."}</p>
                                {searchTerm && <p className="veritesthis-empty-subtitle">Try clearing the search filter.</p>}
                            </div>
                        ) : (
                            <table className="veritesthis-table">
                                <thead>
                                    <tr>
                                        {/* Updated sortable header class */}
                                        <th onClick={() => handleSortChange('round_display')} className="veritesthis-sortable-header">
                                            ROUND {renderSortIcon('round_display')}
                                        </th>
                                        <th onClick={() => handleSortChange('create_by')} className="veritesthis-sortable-header">
                                            CREATE BY {renderSortIcon('create_by')}
                                        </th>
                                        <th onClick={() => handleSortChange('veritestcase_at')} className="veritesthis-sortable-header">
                                            VERIFICATION AT {renderSortIcon('veritestcase_at')}
                                        </th>
                                        <th>DETAILS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTestCaseHistory.map((testCase) => (
                                        <tr key={testCase.veritestcase_round} className="veritesthis-row">
                                            {/* Updated cell classes */}
                                            <td className="veritesthis-cell-id">VERIF-{testCase.veritestcase_round}</td>
                                            <td className="veritesthis-cell-creator">
                                                <div className="veritesthis-cell-creator-info">
                                                    <FontAwesomeIcon icon={faUser} className="veritesthis-cell-icon" />
                                                    <span>{testCase.create_by || "N/A"}</span>
                                                </div>
                                            </td>
                                            <td className="veritesthis-cell-date">
                                                <div className="veritesthis-cell-date-info">
                                                    <FontAwesomeIcon icon={faCalendarAlt} className="veritesthis-cell-icon" />
                                                    <span>{formatDate(testCase.veritestcase_at)}</span>
                                                </div>
                                            </td>
                                            <td className="veritesthis-actions-cell">
                                                {/* Updated details button class */}
                                                <button
                                                    className="veritesthis-view-details-btn"
                                                    title="View Details"
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

            {/* Modal uses updated component with prefixed classes */}
            <Modal
                show={showModal}
                onClose={closeModal}
                testCaseId={selectedTestCaseId}
                verificationBy={selectedVeriTestCaseBy}
            />
        </div>
    );
};

export default VeriTestHis;