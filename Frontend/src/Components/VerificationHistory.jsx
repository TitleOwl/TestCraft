import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride'; // Optional: If you want a tutorial
import { toast } from "react-toastify";
import axios from "axios";
import "./CSS/VerificationHistory.css"; // Make sure this CSS file exists and is styled

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faCheck,
    faTimes,
    faCalendarAlt,
    faUser,
    faClipboardCheck,
    faClipboardList,
    faArrowLeft,
    faSync,
    faSortAmountDown,
    faSortAmountUp,
    faEye,
    faUsers,
    faListAlt,
    faHistory, // New Icon for History
    faCheckCircle,
    faQuestionCircle // Optional: for tutorial button
} from "@fortawesome/free-solid-svg-icons";

// --- Modal Component ---
// Ensure this Modal component is correctly defined or imported.
// This is the version from previous examples, assuming it handles the props correctly.
const Modal = ({ show, onClose, requirements = [], verificationBy = [] }) => {
    if (!show) return null;

    // Parse verificationBy strings (assuming ["Name: value"] format from backend) into objects
    const parsedVerificationBy = (verificationBy || [])
        .map((entry) => {
            if (typeof entry !== 'string' || !entry.includes(': ')) {
                console.warn("Invalid verificationBy entry format in Modal:", entry);
                return { name: 'Unknown Reviewer', value: false };
            }
            const [name, valueStr] = entry.split(": ");
            return { name, value: valueStr === "true" };
        });

    return (
        <div className="modal-overlay-review"> {/* Use appropriate CSS */}
            <div className="modal-content-review">
                <div className="modal-header">
                    <h3>Verification Details</h3>
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
                                {parsedVerificationBy.map((reviewer, index) => (
                                    <div className="reviewer-item" key={index}>
                                        <div className="reviewer-avatar"><FontAwesomeIcon icon={faUser} /></div>
                                        <div className="reviewer-info">
                                            <span className="reviewer-name">{reviewer.name}</span>
                                            <span className={`reviewer-status ${reviewer.value ? 'verified' : 'not-verified'}`}>
                                                {reviewer.value ? 'Verified' : 'Not Verified'}
                                            </span>
                                        </div>
                                        <FontAwesomeIcon
                                            icon={reviewer.value ? faCheckCircle : faTimes}
                                            className={`status-icon ${reviewer.value ? 'verified' : 'not-verified'}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-message">No reviewer information found.</div>
                        )}
                    </div>
                    {/* Requirement Section */}
                    <div className="requirement-section">
                        <h4>
                            <FontAwesomeIcon icon={faClipboardList} className="section-icon" />
                            Requirements
                        </h4>
                        {(Array.isArray(requirements) && requirements.length > 0) ? (
                            <div className="requirements-list">
                                {requirements.map((req, index) => (
                                    <div key={index} className="requirement-item">
                                        <FontAwesomeIcon icon={faClipboardCheck} className="req-icon" />
                                        <span className="req-id">REQ-{req.toString().padStart(3, '0')}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-message">No associated requirements found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- VerificationHistory Component ---
const VerificationHistory = () => {
    // --- State Variables ---
    const [verifications, setVerifications] = useState([]); // Raw history data from API
    const [filteredVerifications, setFilteredVerifications] = useState([]); // Data displayed in table
    const [selectedRequirements, setSelectedRequirements] = useState([]); // For modal
    const [selectedVerificationBy, setSelectedVerificationBy] = useState([]); // For modal
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState("verification_at"); // Default sort field
    const [sortDirection, setSortDirection] = useState("desc"); // Default sort direction (newest first)
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [runTutorial, setRunTutorial] = useState(false); // Optional tutorial state
    const [tutorialSteps] = useState([ // Optional tutorial steps
      {
         target: '.verificationhistory-table',
         content: 'This table shows the history of all completed verification attempts.',
         placement: 'top',
         disableBeacon: true,
      },
      {
         target: '.verificationhistory-row:first-child .view-details-btn',
         content: 'Click the eye icon to see details like associated requirements and reviewer actions for that specific verification round.',
         placement: 'right',
       },
    ]);

    // --- Hooks ---
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Data Fetching ---
    const fetchVerificationHistory = useCallback(() => {
        if (!projectId) {
            toast.error("Project ID is missing. Cannot load history.");
            setLoading(false);
            return Promise.reject("Missing Project ID");
        }
        setLoading(true);

        // --- !!! ATTENTION: CHECK API URL !!! ---
        // Option 1: Relative path (works if Frontend/Backend on same host/port OR using a proxy correctly)
        // const apiUrl = `/verification-history/${projectId}`;

        // Option 2: Full path (use if Backend is on a DIFFERENT port, e.g., 3001, AND no proxy is used/working for this path)
        // ** Replace 3001 with your actual backend port if different **
        const apiUrl = `http://localhost:3001/verification-history/${projectId}`;

        // Option 3: If using a proxy specifically for paths starting with /api
        // const apiUrl = `/api/verification-history/${projectId}`; // (Backend route must also start with /api)

        // --- Choose the correct apiUrl based on your setup ---

        console.log(`Attempting to fetch history from: ${apiUrl}`);

        return axios
            .get(apiUrl) // Use the determined apiUrl
            .then((response) => {
                console.log("Successfully fetched verification history:", response.data);
                // Ensure data is an array and process it
                const processedData = (response.data || []).map(item => ({
                    ...item,
                    // Ensure these fields are always arrays for consistency
                    requirements: Array.isArray(item.requirements) ? item.requirements : [],
                    verification_by: Array.isArray(item.verification_by) ? item.verification_by : []
                }));
                setVerifications(processedData);
                // Note: Sorting/filtering will happen in the useEffect below
            })
            .catch((err) => {
                console.error("Error fetching verification history:", err);
                if (err.response) {
                    // Server responded with a status code outside 2xx range
                    console.error("Error response data:", err.response.data);
                    console.error("Error response status:", err.response.status);
                    console.error("Error response headers:", err.response.headers);
                    toast.error(`Error: ${err.response.status} - ${err.response.data?.message || 'Failed to load history.'}`);
                } else if (err.request) {
                    // Request was made but no response received (e.g., network error, server down)
                    console.error("Error request:", err.request);
                    toast.error("Network Error: Could not connect to the server to load history.");
                } else {
                    // Something else happened in setting up the request
                    console.error('Error message:', err.message);
                    toast.error(`Error: ${err.message}`);
                }
                setVerifications([]); // Clear data on error
                // No need to reject promise here unless specifically needed upstream
            })
            .finally(() => {
                // This runs regardless of success or failure
                setLoading(false);
                setIsRefreshing(false); // Ensure refreshing state is turned off
            });
    }, [projectId]); // Dependency: fetch again if projectId changes

    // --- Initial Data Load ---
    useEffect(() => {
        fetchVerificationHistory();
    }, [fetchVerificationHistory]); // Fetch when component mounts or fetch function changes

    // --- Tutorial Trigger ---
    useEffect(() => {
        const tutorialShown = localStorage.getItem('verificationHistoryTutorialShown');
        // Run tutorial only if not shown before, data exists, and not currently loading
        if (!tutorialShown && !loading && verifications.length > 0) {
            const timer = setTimeout(() => setRunTutorial(true), 500); // Slight delay
            return () => clearTimeout(timer);
        }
    }, [loading, verifications]); // Depend on loading state and data

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTutorial(false);
            localStorage.setItem('verificationHistoryTutorialShown', 'true');
        }
    };

    const handleRestartTutorial = () => {
        // Ensure Joyride unmounts/resets before starting again
        setRunTutorial(false);
        localStorage.removeItem('verificationHistoryTutorialShown');
        setTimeout(() => setRunTutorial(true), 100); // Restart after a short delay
    };
    // --- End Tutorial Logic ---

    // --- Filtering and Sorting Logic ---
    useEffect(() => {
        let result = [...verifications]; // Start with the raw data

        // Apply search filter (case-insensitive)
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(item => {
                const idMatch = `verif-${item.id}`.toLowerCase().includes(lowerSearchTerm);
                const creatorMatch = item.create_by && item.create_by.toLowerCase().includes(lowerSearchTerm);
                const statusMatch = item.verification_status && item.verification_status.toLowerCase().includes(lowerSearchTerm);
                // Add more fields to search if needed (e.g., search requirements)
                // const requirementsMatch = item.requirements && item.requirements.some(reqId => `req-${reqId}`.toLowerCase().includes(lowerSearchTerm));
                return idMatch || creatorMatch || statusMatch /* || requirementsMatch */;
            });
        }

        // Apply sorting
        result.sort((a, b) => {
            let compareA, compareB;
            const field = sortField;

            // Get values to compare based on the sort field
            switch (field) {
                case "id": compareA = a.id; compareB = b.id; break;
                case "verification_at": compareA = a.verification_at ? new Date(a.verification_at) : null; compareB = b.verification_at ? new Date(b.verification_at) : null; break;
                case "create_by": compareA = a.create_by || ""; compareB = b.create_by || ""; break;
                case "status": compareA = a.verification_status || ""; compareB = b.verification_status || ""; break;
                default: compareA = a.id; compareB = b.id; // Fallback to sorting by ID
            }

            const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

            // Handle nulls (consistently place them at start/end)
            if (compareA === null && compareB === null) return 0;
            if (compareA === null) return 1 * directionMultiplier; // Nulls last in ascending, first in descending
            if (compareB === null) return -1 * directionMultiplier; // Nulls first in ascending, last in descending

            // Handle specific types
            if (compareA instanceof Date && compareB instanceof Date) {
                // Handle invalid dates resulting in NaN
                const timeA = isNaN(compareA.getTime()) ? (sortDirection === 'asc' ? Infinity : -Infinity) : compareA.getTime();
                const timeB = isNaN(compareB.getTime()) ? (sortDirection === 'asc' ? Infinity : -Infinity) : compareB.getTime();
                return (timeA - timeB) * directionMultiplier;
            } else if (typeof compareA === 'string' && typeof compareB === 'string') {
                return compareA.localeCompare(compareB) * directionMultiplier;
            } else if (typeof compareA === 'number' && typeof compareB === 'number') {
                 return (compareA - compareB) * directionMultiplier;
            }

            // Fallback if types are mixed or unexpected
            return 0;
        });

        setFilteredVerifications(result); // Update the state for the table
    }, [verifications, searchTerm, sortField, sortDirection]); // Recalculate when dependencies change

    // --- Event Handlers ---
    const handleViewDetails = (requirements, verificationBy) => {
        setSelectedRequirements(requirements || []);
        setSelectedVerificationBy(verificationBy || []); // Pass the already processed array
        setShowModal(true);
    };

    const handleBack = () => {
        // Navigate back to the previous logical page (e.g., Verification List or Dashboard)
        // Option 1: Go back to Verification List (if appropriate)
         navigate(`/VerificationList?project_id=${projectId}`);
        // Option 2: Go to Dashboard
        // navigate(`/Dashboard?project_id=${projectId}`);
    };


    const handleSortChange = (field) => {
        if (sortField === field) {
            // Toggle direction if sorting by the same field
            setSortDirection(currentDirection => currentDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Change field and set default direction (e.g., descending for date/id)
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const closeModal = () => setShowModal(false);

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) { return "Invalid Date"; } // Check if date is valid
            // Use 'en-GB' for DD/MM/YYYY or adjust locale as needed
            return date.toLocaleDateString('en-GB', options);
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return "Invalid Date";
        }
    };

    const renderSortIcon = (field) => {
        if (sortField !== field) return null;
        return <FontAwesomeIcon icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} />;
    };

    // --- Render Logic ---
    // Initial loading state
    if (loading && !isRefreshing) {
        return (
            <div className="verificationhistory-container"> {/* Use consistent container class */}
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading verification history...</p>
                </div>
            </div>
        );
    }

    // Main component render
    return (
        <div className="verificationhistory-container">
            {/* Optional Tutorial */}
            <Joyride
                steps={tutorialSteps}
                run={runTutorial}
                continuous
                showProgress
                showSkipButton
                styles={{ options: { zIndex: 10000, /* other styles */ } }}
                callback={handleJoyrideCallback}
            />

            {/* Header Section */}
            <div className="verificationhistory-header">
                <button className="verificationhistory-back-btn" onClick={handleBack}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1>
                    <FontAwesomeIcon icon={faHistory} className="verificationhistory-title-icon" />
                    Verification History
                </h1>
                {/* Optional Tutorial Restart Button */}
                <button
                    onClick={handleRestartTutorial}
                    className="tutorial-help-button tutorial-help-button-corner-vh"
                    title="Show Tutorial Again"
                    style={{ /* Consider moving styles to CSS */
                         position: 'absolute', top: '15px', right: '20px', fontSize: '1.6rem',
                         background: 'none', border: 'none', color: '#333', cursor: 'pointer', zIndex: 5
                     }}
                >
                    <FontAwesomeIcon icon={faQuestionCircle} />
                </button>
            </div>

            {/* Content Section */}
            <div className="verificationhistory-content">
                <div className="verificationhistory-panel">
                    {/* Panel Header: Title, Count, Tools */}
                    <div className="verificationhistory-panel-header">
                        <h2>
                            <FontAwesomeIcon icon={faListAlt} />
                            History Log
                            <span className="verificationhistory-count-badge">{filteredVerifications.length}</span>
                        </h2>
                        <div className="verificationhistory-tools">
                            {/* Search Input */}
                            <div className="verificationhistory-search">
                                <FontAwesomeIcon icon={faSearch} className="verificationhistory-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search ID, initiator, status..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="verificationhistory-search-input"
                                    disabled={loading} // Disable search while loading
                                />
                                {searchTerm && (
                                    <button
                                        className="verificationhistory-clear-search"
                                        onClick={() => setSearchTerm("")}
                                        title="Clear search"
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="verificationhistory-table-container">
                        {/* Show loading indicator inside table area during refresh */}
                        {isRefreshing && <div className="loading-state small"><div className="loading-spinner"></div> Refreshing...</div>}

                        {/* Conditional rendering: Empty state or Table */}
                        {!isRefreshing && filteredVerifications.length === 0 ? (
                            <div className="verificationhistory-empty-state">
                                <FontAwesomeIcon icon={faHistory} className="empty-icon" />
                                <p>{searchTerm ? "No history found matching your criteria." : "No verification history available for this project."}</p>
                                {searchTerm && <p className="empty-subtitle">Try clearing the search filter.</p>}
                            </div>
                        ) : (
                            <table className="verificationhistory-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSortChange('id')} className="sortable-header">Round {renderSortIcon('id')}</th>
                                        <th onClick={() => handleSortChange('create_by')} className="sortable-header">Create By {renderSortIcon('create_by')}</th>
                                        <th onClick={() => handleSortChange('verification_at')} className="sortable-header">Verification_at{renderSortIcon('verification_at')}</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map through filtered data to render rows */}
                                    {filteredVerifications.map((verification) => (
                                        <tr key={verification.id} className="verificationhistory-row">
                                            {/* Verification ID */}
                                            <td className="hist-id-cell">VERIF-{verification.id}</td>
                                            {/* Initiator */}
                                            <td className="hist-creator-cell">
                                                <div className="creator-info">
                                                    <FontAwesomeIcon icon={faUser} className="cell-icon" />
                                                    <span>{verification.create_by || "N/A"}</span>
                                                </div>
                                            </td>
                                            {/* Date Completed */}
                                            <td className="hist-date-cell">
                                                <div className="date-info">
                                                    <FontAwesomeIcon icon={faCalendarAlt} className="cell-icon" />
                                                    <span>{formatDate(verification.verification_at)}</span>
                                                </div>
                                            </td>
                                            {/* Details Button */}
                                            <td className="actions-cell">
                                                <button
                                                    className="view-details-btn" // Use consistent class
                                                    title="View Details"
                                                    onClick={() => handleViewDetails(verification.requirements, verification.verification_by)}
                                                >
                                                    <FontAwesomeIcon icon={faEye} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div> {/* End Table Container */}
                </div> {/* End Panel */}
            </div> {/* End Content */}

            {/* Modal for displaying details */}
            <Modal
                show={showModal}
                onClose={closeModal}
                requirements={selectedRequirements}
                // Modal expects array of strings ["Name: value"], pass the data from backend
                verificationBy={selectedVerificationBy}
            />
        </div> // End Container
    );
};

export default VerificationHistory;