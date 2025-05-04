import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride';
import { toast } from "react-toastify";
import axios from "axios";
import "./CSS/VeriDesignHis.css"; // Ensure this CSS file exists and uses veridesign-his- prefix

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch, faTimes, faCalendarAlt, faUser, faClipboardCheck,
    faClipboardList, faArrowLeft, faSync, faSortAmountDown, faSortAmountUp,
    faEye, faUsers, faListAlt, faHistory, faCheckCircle, faTimesCircle,
    faQuestionCircle, faLayerGroup, faPalette
} from "@fortawesome/free-solid-svg-icons";

// --- Modal Component (Should be the version expecting an OBJECT for veriDesignBy) ---
const Modal = ({ show, onClose, designId = null, veriDesignBy = {} }) => {
    if (!show) return null;

    // --- Log entry point and received prop ---
    // console.log("--- Modal Component Render ---");
    // console.log("Modal received veriDesignBy prop:", veriDesignBy);

    // Ensure veriDesignBy is treated as an object
    const reviewerObject = veriDesignBy && typeof veriDesignBy === 'object' && !Array.isArray(veriDesignBy)
                           ? veriDesignBy
                           : {};
    // console.log("Modal using reviewerObject:", reviewerObject);


    // Convert object to array [{ name, value }]
    const parsedVeriDesignBy = Object.entries(reviewerObject)
        .map(([name, value]) => {
            // console.log(`Modal parsing entry - Name: ${name}, Value: ${value}`);
            if (typeof value !== 'boolean') {
                console.warn(`Modal Warning: Value for reviewer "${name}" is not boolean:`, value);
                return { name: name, value: null };
            }
            return { name: name, value: value };
        });

     // console.log("Modal final parsedVeriDesignBy for render:", parsedVeriDesignBy);
     // console.log("--- Modal Component End Parsing ---");

    const displayDesignId = designId;

    return (
        <div className="veridesign-his-modal-overlay-review">
            <div className="veridesign-his-modal-content-review">
                <div className="veridesign-his-modal-header">
                    <h3>Design Verification Details</h3>
                    <button className="veridesign-his-close-modal-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="veridesign-his-modal-body">
                    <div className="veridesign-his-requirement-section">
                        <h4><FontAwesomeIcon icon={faPalette} className="veridesign-his-section-icon" />Design</h4>
                        {displayDesignId !== null && displayDesignId !== undefined ? (
                            <div className="veridesign-his-requirements-list">
                                <div className="veridesign-his-requirement-item">
                                    <FontAwesomeIcon icon={faClipboardCheck} className="veridesign-his-req-icon" />
                                    <span className="veridesign-his-req-id">SD-{String(displayDesignId).padStart(3, '0')}</span>
                                </div>
                            </div>
                        ) : (<div className="veridesign-his-empty-message">No associated design found.</div>)}
                    </div>
                    <div className="veridesign-his-reviewer-section">
                        <h4><FontAwesomeIcon icon={faUsers} className="veridesign-his-section-icon" /> Reviewer</h4>
                         {/* --- Log Check Condition --- */}
                         {/* {console.log("Modal rendering check: parsedVeriDesignBy.length > 0 ?", parsedVeriDesignBy.length > 0)} */}
                        {parsedVeriDesignBy.length > 0 ? (
                            <div className="veridesign-his-reviewers-list">
                                {parsedVeriDesignBy.map((person, index) => (
                                    <div className="veridesign-his-reviewer-item" key={index}>
                                        <div className="veridesign-his-reviewer-avatar"><FontAwesomeIcon icon={faUser} /></div>
                                        <div className="veridesign-his-reviewer-info">
                                            <span className="veridesign-his-reviewer-name">{person.name}</span>
                                            {person.value === true && (<span className="veridesign-his-reviewer-status veridesign-his-verified">Verified</span>)}
                                            {person.value === false && (<span className="veridesign-his-reviewer-status veridesign-his-not-verified">Not Verified</span>)}
                                            {person.value === null && (<span className="veridesign-his-reviewer-status veridesign-his-unknown">Status Unknown</span>)}
                                        </div>
                                        {person.value === true && (<FontAwesomeIcon icon={faCheckCircle} className="veridesign-his-status-icon veridesign-his-verified" />)}
                                        {person.value === false && (<FontAwesomeIcon icon={faTimesCircle} className="veridesign-his-status-icon veridesign-his-not-verified" />)}
                                        {person.value === null && (<FontAwesomeIcon icon={faQuestionCircle} className="veridesign-his-status-icon veridesign-his-unknown" />)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="veridesign-his-empty-message">No verification information found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- VeriDesignHis Component ---
const VeriDesignHis = () => {
    // --- State Variables ---
    const [designHistory, setDesignHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [selectedDesignId, setSelectedDesignId] = useState(null);
    // <<< Initialize state to null or {} instead of [] for clarity, although Modal defaults it >>>
    const [selectedVeriDesignBy, setSelectedVeriDesignBy] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState("veridesign_at");
    const [sortDirection, setSortDirection] = useState("desc");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [runTutorial, setRunTutorial] = useState(false);
    const [tutorialSteps] = useState([
        { target: '.veridesign-his-table', content: 'This table shows the history of design verification activities.', placement: 'top', disableBeacon: true },
        { target: '.veridesign-his-row:first-child .veridesign-his-actions-cell .veridesign-his-view-details-btn', content: 'Click the eye icon for details.', placement: 'right' }, // More specific target
    ]);

    // --- Hooks ---
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Data Fetching ---
    const fetchDesignHistory = useCallback(() => {
        if (!projectId) {
            toast.error("Project ID is missing."); setLoading(false); return Promise.reject("Missing Project ID");
        }
        setLoading(true);
        const apiUrl = `http://localhost:3001/veridesign-history/${projectId}`;
        console.log(`Workspaceing design history from: ${apiUrl}`); // Corrected log message typo

        return axios.get(apiUrl)
            .then((response) => {
                console.log("Fetched design history Raw Response Data:", response.data); // Log raw response

                // --- START: CORRECTED DATA PROCESSING ---
                const processedData = (response.data || []).map(item => {
                    // Check if item.veridesign_by is a non-array object, otherwise default to {}
                    const reviewerData = item.veridesign_by && typeof item.veridesign_by === 'object' && !Array.isArray(item.veridesign_by)
                                        ? item.veridesign_by
                                        : {};
                    // Log the processing for each item
                     console.log(`Processing item ID ${item.veridesign_id}: Original veridesign_by:`, item.veridesign_by, `Processed as:`, reviewerData);
                    return {
                        ...item, // Keep other fields from the item
                        veridesign_by: reviewerData // Assign the processed object (or {} )
                    };
                });
                // --- END: CORRECTED DATA PROCESSING ---

                console.log("Processed Data for State:", processedData); // Log the final array being set to state
                setDesignHistory(processedData);
            })
            .catch((err) => {
                console.error("Error fetching design history:", err);
                const errorMsg = err.response?.data?.message || err.message || 'Failed to load design history.';
                toast.error(`Error: ${err.response?.status || ''} - ${errorMsg}`);
                setDesignHistory([]);
            })
            .finally(() => { setLoading(false); setIsRefreshing(false); });
    }, [projectId]);

    // --- Effects ---
    useEffect(() => { fetchDesignHistory(); }, [fetchDesignHistory]);

    useEffect(() => { // Tutorial Trigger
        const tutorialShown = localStorage.getItem('veriDesignHisTutorialShown');
        if (!tutorialShown && !loading && designHistory.length > 0) {
            const timer = setTimeout(() => setRunTutorial(true), 500); return () => clearTimeout(timer);
        }
    }, [loading, designHistory]);

    // --- Filtering and Sorting Effect (Logic unchanged, uses designHistory state) ---
    useEffect(() => {
        let result = [...designHistory];
        if (searchTerm) {
             const lowerSearchTerm = searchTerm.toLowerCase();
             // Simplified filter based on visible columns
             result = result.filter(item => {
                const idString = `verif-${item.veridesign_id}`;
                const idMatch = idString.toLowerCase().includes(lowerSearchTerm) || item.veridesign_id.toString().includes(lowerSearchTerm);
                const creatorMatch = item.create_by && item.create_by.toLowerCase().includes(lowerSearchTerm);
                const dateMatch = formatDate(item.veridesign_at).toLowerCase().includes(lowerSearchTerm);
                return idMatch || creatorMatch || dateMatch;
             });
        }

        result.sort((a, b) => {
            let compareA, compareB;
             // Map display field ('round_display') to actual data field ('veridesign_id')
            const field = sortField === 'round_display' ? 'veridesign_id' : sortField;

            switch (field) {
                case "veridesign_id": compareA = a.veridesign_id; compareB = b.veridesign_id; break;
                case "create_by": compareA = a.create_by || ""; compareB = b.create_by || ""; break;
                case "veridesign_at": compareA = a.veridesign_at ? new Date(a.veridesign_at) : null; compareB = b.veridesign_at ? new Date(b.veridesign_at) : null; break;
                default: // Default sort by date descending
                    compareA = b.veridesign_at ? new Date(b.veridesign_at) : null; // Note: b first for desc default
                    compareB = a.veridesign_at ? new Date(a.veridesign_at) : null;
            }

            const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

             // Comparison logic
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
        setFilteredHistory(result);
    }, [designHistory, searchTerm, sortField, sortDirection]); // Depends on the *processed* designHistory state

    // --- Event Handlers ---
    const handleViewDetails = (designId, veriDesignByFromItem) => {
        // --- LOGGING STEP 1: Check data received by the handler ---
        console.log("--- handleViewDetails Called ---");
        console.log("Received designId:", designId);
        console.log("Received veriDesignByFromItem:", veriDesignByFromItem, `(Type: ${typeof veriDesignByFromItem})`);
        console.log("------------------------------");
        // --- End Logging ---

        setSelectedDesignId(designId ?? null);
        // --- FIX: Default to empty OBJECT {} ---
        setSelectedVeriDesignBy(veriDesignByFromItem || {});
        setShowModal(true);
    };

    const handleBack = () => { navigate(`/VeriDesign?project_id=${projectId}`); };
    // const handleRefresh = () => { if (isRefreshing) return; setIsRefreshing(true); setSearchTerm(""); fetchDesignHistory(); }; // Uncomment if needed

    const handleSortChange = (displayField) => { // Use displayField from header
         // Map display field to actual data field if necessary
         const actualSortField = displayField === 'round_display' ? 'veridesign_id' : displayField;
        if (sortField === actualSortField) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(actualSortField);
            setSortDirection('desc');
        }
    };
    const closeModal = () => setShowModal(false);
    const handleJoyrideCallback = (data) => { const { status } = data; if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) { setRunTutorial(false); localStorage.setItem('veriDesignHisTutorialShown', 'true'); } };
    const handleRestartTutorial = () => { setRunTutorial(false); localStorage.removeItem('veriDesignHisTutorialShown'); setTimeout(() => setRunTutorial(true), 100); };

    // --- Helper Functions ---
    const formatDate = (dateString) => { if (!dateString) return "N/A"; const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }; try { const date = new Date(dateString); if (isNaN(date.getTime())) { return "Invalid Date"; } return date.toLocaleDateString('en-GB', options); } catch (e) { return "Invalid Date"; } };
    const renderSortIcon = (displayField) => { // Use displayField from header
         const actualSortField = displayField === 'round_display' ? 'veridesign_id' : displayField;
        if (sortField !== actualSortField) return null;
        return <FontAwesomeIcon icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} />;
     };

    // --- Render Logic ---
    if (loading && !isRefreshing) {
        return (
            <div className="veridesign-his-container">
                <div className="veridesign-his-loading-state">
                    <div className="veridesign-his-loading-spinner"></div>
                    <p>Loading design verification history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="veridesign-his-container">
            <Joyride steps={tutorialSteps} run={runTutorial} continuous showProgress showSkipButton styles={{ options: { zIndex: 10000 } }} callback={handleJoyrideCallback} />
            <div className="veridesign-his-header">
                <button className="veridesign-his-back-btn" onClick={handleBack}><FontAwesomeIcon icon={faArrowLeft} /> Back</button>
                <h1><FontAwesomeIcon icon={faHistory} className="veridesign-his-title-icon" /> Design Verification History</h1>
                 <button onClick={handleRestartTutorial} className="veridesign-his-tutorial-help-button veridesign-his-tutorial-help-button-corner-vdh" title="Show Tutorial Again" style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '1.6rem', background: 'none', border: 'none', color: '#333', cursor: 'pointer', zIndex: 5 }}><FontAwesomeIcon icon={faQuestionCircle} /></button>
            </div>
            <div className="veridesign-his-content">
                <div className="veridesign-his-panel">
                    <div className="veridesign-his-panel-header">
                        <h2><FontAwesomeIcon icon={faListAlt} /> Design History Log <span className="veridesign-his-count-badge">{filteredHistory.length}</span></h2>
                        <div className="veridesign-his-tools">
                            <div className="veridesign-his-search">
                                <FontAwesomeIcon icon={faSearch} className="veridesign-his-search-icon" />
                                 {/* Updated placeholder for displayed columns */}
                                <input type="text" placeholder="Search Round, Creator..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="veridesign-his-search-input" disabled={loading || isRefreshing} />
                                {searchTerm && (<button className="veridesign-his-clear-search" onClick={() => setSearchTerm("")} title="Clear search"><FontAwesomeIcon icon={faTimes} /></button>)}
                            </div>
                             {/* <button className={`veridesign-his-refresh-btn ${isRefreshing ? 'refreshing' : ''}`} onClick={handleRefresh} disabled={isRefreshing}>
                                <FontAwesomeIcon icon={faSync} spin={isRefreshing} />
                            </button> */}
                        </div>
                    </div>
                    <div className="veridesign-his-table-container">
                        {isRefreshing && <div className="veridesign-his-loading-state veridesign-his-small"><div className="veridesign-his-loading-spinner"></div> Refreshing...</div>}
                        {!isRefreshing && filteredHistory.length === 0 ? (
                            <div className="veridesign-his-empty-state">
                                <FontAwesomeIcon icon={faHistory} className="veridesign-his-empty-icon" />
                                <p>{searchTerm ? "No design history found matching criteria." : "No design verification history available."}</p>
                                {searchTerm && <p className="veridesign-his-empty-subtitle">Try clearing the search filter.</p>}
                            </div>
                        ) : (
                            <table className="veridesign-his-table">
                                <thead>
                                    <tr>
                                        {/* Displaying 'Round' but sorting by veridesign_id */}
                                        <th onClick={() => handleSortChange('round_display')} className="veridesign-his-sortable-header">
                                            Round {renderSortIcon('round_display')}
                                        </th>
                                        <th onClick={() => handleSortChange('create_by')} className="veridesign-his-sortable-header">
                                            Create By {renderSortIcon('create_by')}
                                        </th>
                                        <th onClick={() => handleSortChange('veridesign_at')} className="veridesign-his-sortable-header">
                                            Verification_at {renderSortIcon('veridesign_at')}
                                        </th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {/* Iterate over filteredHistory which contains processed data */}
                                    {filteredHistory.map((item) => {
                                         // --- LOGGING STEP 2 (Optional): Check item data before rendering row ---
                                         // console.log(`Rendering row for ID ${item.veridesign_id} -> veridesign_by:`, item.veridesign_by, `(Type: ${typeof item.veridesign_by})`);
                                         return (
                                            <tr key={item.veridesign_round} className="veridesign-his-row">
                                                {/* Display Round/Log ID */}
                                                <td className="veridesign-his-hist-id-cell">VERIF-{item.veridesign_round}</td>
                                                {/* Display Creator */}
                                                <td className="veridesign-his-hist-creator-cell">
                                                    <div className="veridesign-his-creator-info">
                                                        <FontAwesomeIcon icon={faUser} className="veridesign-his-cell-icon" />
                                                        <span>{item.create_by || "N/A"}</span>
                                                    </div>
                                                </td>
                                                {/* Display Date */}
                                                <td className="veridesign-his-hist-date-cell">
                                                    <div className="veridesign-his-date-info">
                                                        <FontAwesomeIcon icon={faCalendarAlt} className="veridesign-his-cell-icon" />
                                                        <span>{formatDate(item.veridesign_at)}</span>
                                                    </div>
                                                </td>
                                                {/* Display Details Button */}
                                                <td className="veridesign-his-actions-cell">
                                                    <button
                                                        className="veridesign-his-view-details-btn"
                                                        title="View Details"
                                                        // Pass the veridesign_by object directly from the item
                                                        onClick={() => handleViewDetails(item.design_id, item.veridesign_by)}
                                                    >
                                                        <FontAwesomeIcon icon={faEye} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
            {/* Modal - passing state */}
            <Modal show={showModal} onClose={closeModal} designId={selectedDesignId} veriDesignBy={selectedVeriDesignBy} />
        </div>
    );
};

export default VeriDesignHis;