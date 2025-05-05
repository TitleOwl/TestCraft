import React, { useState, useEffect, useCallback } from "react";
 import { useNavigate, useLocation } from "react-router-dom";
 import Joyride, { STATUS } from 'react-joyride';
 import { toast } from "react-toastify";
 import axios from "axios";
 // Updated CSS import name slightly for clarity, ensure the actual CSS file name matches.
 import "./CSS/VeriDesignHis.css"; // Make sure this CSS file uses 'veridesign-his-' prefix

 import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
 import {
     faSearch, faTimes, faCalendarAlt, faUser, faClipboardCheck,
     faClipboardList, faArrowLeft, faSync, faSortAmountDown, faSortAmountUp,
     faEye, faUsers, faListAlt, faHistory, faCheckCircle, faTimesCircle,
     faQuestionCircle, faLayerGroup, faPalette // Assuming faPalette is for Design
 } from "@fortawesome/free-solid-svg-icons";

 // --- Modal Component (Updated Class Names) ---
 const Modal = ({ show, onClose, designId = null, veriDesignBy = {} }) => {
     if (!show) return null;

     const reviewerObject = veriDesignBy && typeof veriDesignBy === 'object' && !Array.isArray(veriDesignBy)
                             ? veriDesignBy
                             : {};

     const parsedVeriDesignBy = Object.entries(reviewerObject)
         .map(([name, value]) => {
             if (typeof value !== 'boolean') {
                 console.warn(`Modal Warning: Value for reviewer "${name}" is not boolean:`, value);
                 return { name: name, value: null }; // Treat non-boolean as unknown
             }
             return { name: name, value: value };
         });

     const displayDesignId = designId; // Use the prop directly

     return (
         // Simplified modal class names
         <div className="veridesign-his-modal-overlay">
             <div className="veridesign-his-modal-content">
                 <div className="veridesign-his-modal-header">
                     <h3>Design Verification Details</h3>
                     <button className="veridesign-his-modal-close-button" onClick={onClose}>
                         <FontAwesomeIcon icon={faTimes} />
                     </button>
                 </div>
                 <div className="veridesign-his-modal-body">
                     {/* Design Section */}
                     <div className="veridesign-his-modal-design-section"> {/* Renamed from requirement-section */}
                         <h4><FontAwesomeIcon icon={faPalette} className="veridesign-his-modal-section-icon" /> Design</h4>
                         {displayDesignId !== null && displayDesignId !== undefined ? (
                             <div className="veridesign-his-modal-design-list"> {/* Renamed from requirements-list */}
                                 <div className="veridesign-his-modal-design-item"> {/* Renamed from requirement-item */}
                                     <FontAwesomeIcon icon={faClipboardCheck} className="veridesign-his-modal-design-icon" /> {/* Renamed from req-icon */}
                                     <span className="veridesign-his-modal-design-id">SD-{String(displayDesignId).padStart(3, '0')}</span> {/* Renamed from req-id */}
                                 </div>
                             </div>
                         ) : (
                             <div className="veridesign-his-modal-empty-message">No associated design found.</div>
                         )}
                     </div>
                     {/* Reviewer Section */}
                     <div className="veridesign-his-modal-reviewer-section">
                         <h4><FontAwesomeIcon icon={faUsers} className="veridesign-his-modal-section-icon" /> Reviewer</h4>
                         {parsedVeriDesignBy.length > 0 ? (
                             <div className="veridesign-his-modal-reviewers-list">
                                 {parsedVeriDesignBy.map((person, index) => (
                                     <div className="veridesign-his-modal-reviewer-item" key={index}>
                                         <div className="veridesign-his-modal-reviewer-avatar"><FontAwesomeIcon icon={faUser} /></div>
                                         <div className="veridesign-his-modal-reviewer-info">
                                             <span className="veridesign-his-modal-reviewer-name">{person.name}</span>
                                             {/* Status text - uses modifier classes */}
                                             {person.value === true && (<span className="veridesign-his-modal-reviewer-status veridesign-his-modal-reviewer-status-verified">Verified</span>)}
                                             {person.value === false && (<span className="veridesign-his-modal-reviewer-status veridesign-his-modal-reviewer-status-not-verified">Not Verified</span>)}
                                             {person.value === null && (<span className="veridesign-his-modal-reviewer-status veridesign-his-modal-reviewer-status-unknown">Status Unknown</span>)}
                                         </div>
                                         {/* Status icon - uses modifier classes */}
                                         {person.value === true && (<FontAwesomeIcon icon={faCheckCircle} className="veridesign-his-modal-status-icon veridesign-his-modal-status-icon-verified" />)}
                                         {person.value === false && (<FontAwesomeIcon icon={faTimesCircle} className="veridesign-his-modal-status-icon veridesign-his-modal-status-icon-not-verified" />)}
                                         {person.value === null && (<FontAwesomeIcon icon={faQuestionCircle} className="veridesign-his-modal-status-icon veridesign-his-modal-status-icon-unknown" />)}
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <div className="veridesign-his-modal-empty-message">No verification information found.</div>
                         )}
                     </div>
                 </div>
             </div>
         </div>
     );
 };

 // --- VeriDesignHis Component (Updated Class Names) ---
 const VeriDesignHis = () => {
     // --- State Variables ---
     const [designHistory, setDesignHistory] = useState([]);
     const [filteredHistory, setFilteredHistory] = useState([]);
     const [selectedDesignId, setSelectedDesignId] = useState(null);
     const [selectedVeriDesignBy, setSelectedVeriDesignBy] = useState(null); // Initialize to null or {}
     const [showModal, setShowModal] = useState(false);
     const [loading, setLoading] = useState(true);
     const [searchTerm, setSearchTerm] = useState("");
     const [sortField, setSortField] = useState("veridesign_at"); // Default sort field
     const [sortDirection, setSortDirection] = useState("desc"); // Default sort direction
     const [isRefreshing, setIsRefreshing] = useState(false);
     const [runTutorial, setRunTutorial] = useState(false);
     const [tutorialSteps] = useState([
         { target: '.veridesign-his-table', content: 'This table shows the history of design verification activities.', placement: 'top', disableBeacon: true },
         // Target remains valid as it uses specific cell/button classes
         { target: '.veridesign-his-row:first-child .veridesign-his-actions-cell .veridesign-his-view-details-btn', content: 'Click the eye icon for details.', placement: 'right' },
     ]);

     // --- Hooks ---
     const navigate = useNavigate();
     const location = useLocation();
     const queryParams = new URLSearchParams(location.search);
     const projectId = queryParams.get("project_id");

     // --- Data Fetching (Logic Unchanged) ---
     const fetchDesignHistory = useCallback(() => {
         if (!projectId) { toast.error("Project ID is missing."); setLoading(false); return Promise.reject("Missing Project ID"); }
         setLoading(true);
         const apiUrl = `http://localhost:3001/veridesign-history/${projectId}`;
         console.log(`Workspaceing design history from: ${apiUrl}`);

         return axios.get(apiUrl)
             .then((response) => {
                 console.log("Fetched design history Raw Response Data:", response.data);
                 const processedData = (response.data || []).map(item => {
                     const reviewerData = item.veridesign_by && typeof item.veridesign_by === 'object' && !Array.isArray(item.veridesign_by)
                                         ? item.veridesign_by : {};
                    // console.log(`Processing item ID ${item.veridesign_id}: Original veridesign_by:`, item.veridesign_by, `Processed as:`, reviewerData);
                     return { ...item, veridesign_by: reviewerData };
                 });
                 console.log("Processed Data for State:", processedData);
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

     // --- Effects (Logic Unchanged) ---
     useEffect(() => { fetchDesignHistory(); }, [fetchDesignHistory]);

     useEffect(() => { // Tutorial Trigger
         const tutorialShown = localStorage.getItem('veriDesignHisTutorialShown');
         if (!tutorialShown && !loading && designHistory.length > 0) {
             const timer = setTimeout(() => setRunTutorial(true), 500); return () => clearTimeout(timer);
         }
     }, [loading, designHistory]);

     // --- Filtering and Sorting Effect (Logic Unchanged) ---
     useEffect(() => {
         let result = [...designHistory];
         if (searchTerm) {
             const lowerSearchTerm = searchTerm.toLowerCase();
             result = result.filter(item => {
                 const roundString = `verif-${item.veridesign_round}`; // Use round for display
                 const roundMatch = roundString.toLowerCase().includes(lowerSearchTerm) || item.veridesign_round.toString().includes(lowerSearchTerm);
                 const creatorMatch = item.create_by && item.create_by.toLowerCase().includes(lowerSearchTerm);
                 const dateMatch = formatDate(item.veridesign_at).toLowerCase().includes(lowerSearchTerm);
                 return roundMatch || creatorMatch || dateMatch;
             });
         }

         result.sort((a, b) => {
             let compareA, compareB;
             // Sort by actual data field based on display header clicked
             const field = sortField === 'round_display' ? 'veridesign_round' : sortField; // Map display 'Round' to 'veridesign_round'

             switch (field) {
                 case "veridesign_round": compareA = a.veridesign_round; compareB = b.veridesign_round; break; // Use round for sorting
                 case "create_by": compareA = a.create_by || ""; compareB = b.create_by || ""; break;
                 case "veridesign_at": compareA = a.veridesign_at ? new Date(a.veridesign_at) : null; compareB = b.veridesign_at ? new Date(b.veridesign_at) : null; break;
                 default: // Default sort by date descending
                     compareA = b.veridesign_at ? new Date(b.veridesign_at) : null;
                     compareB = a.veridesign_at ? new Date(a.veridesign_at) : null;
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
         setFilteredHistory(result);
     }, [designHistory, searchTerm, sortField, sortDirection]);

     // --- Event Handlers (Logic Unchanged) ---
     const handleViewDetails = (designId, veriDesignByFromItem) => {
         // console.log("--- handleViewDetails Called ---"); // Optional logging
         // console.log("Received designId:", designId);
         // console.log("Received veriDesignByFromItem:", veriDesignByFromItem);
         setSelectedDesignId(designId ?? null);
         setSelectedVeriDesignBy(veriDesignByFromItem || {}); // Default to empty object if null/undefined
         setShowModal(true);
     };
     const handleBack = () => { navigate(`/VeriDesign?project_id=${projectId}`); };
     const handleSortChange = (displayField) => {
         const actualSortField = displayField === 'round_display' ? 'veridesign_round' : displayField; // Map to actual field
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
     const renderSortIcon = (displayField) => {
         const actualSortField = displayField === 'round_display' ? 'veridesign_round' : displayField; // Map to actual field
         if (sortField !== actualSortField) return null;
         // Added consistent class for potential styling
         return <FontAwesomeIcon icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} className="veridesign-his-sort-icon" />;
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
                 {/* Using specific class for potential corner styling */}
                 <button onClick={handleRestartTutorial} className="veridesign-his-tutorial-help-button veridesign-his-tutorial-help-button-corner-vdh" title="Show Tutorial Again" style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '1.6rem', background: 'none', border: 'none', color: '#333', cursor: 'pointer', zIndex: 5 }}><FontAwesomeIcon icon={faQuestionCircle} /></button>
             </div>
             <div className="veridesign-his-content">
                 <div className="veridesign-his-panel">
                     <div className="veridesign-his-panel-header">
                         <h2><FontAwesomeIcon icon={faListAlt} className="veridesign-his-panel-icon" /> Design History Log <span className="veridesign-his-count-badge">{filteredHistory.length}</span></h2>
                         <div className="veridesign-his-tools">
                             <div className="veridesign-his-search">
                                 <FontAwesomeIcon icon={faSearch} className="veridesign-his-search-icon" />
                                 <input type="text" placeholder="Search Round, Creator..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="veridesign-his-search-input" disabled={loading || isRefreshing} />
                                 {/* Updated clear search button class */}
                                 {searchTerm && (<button className="veridesign-his-clear-search-btn" onClick={() => setSearchTerm("")} title="Clear search"><FontAwesomeIcon icon={faTimes} /></button>)}
                             </div>
                             {/* Refresh button commented out */}
                         </div>
                     </div>
                     <div className="veridesign-his-table-container">
                         {/* Updated refreshing state structure */}
                         {isRefreshing && (
                             <div className="veridesign-his-refreshing-state">
                                 <div className="veridesign-his-loading-spinner veridesign-his-loading-spinner-small"></div> Refreshing...
                             </div>
                         )}
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
                                         {/* Display 'Round' but use 'round_display' for handleSortChange */}
                                         <th onClick={() => handleSortChange('round_display')} className="veridesign-his-sortable-header">
                                             Round {renderSortIcon('round_display')}
                                         </th>
                                         <th onClick={() => handleSortChange('create_by')} className="veridesign-his-sortable-header">
                                             Create By {renderSortIcon('create_by')}
                                         </th>
                                         <th onClick={() => handleSortChange('veridesign_at')} className="veridesign-his-sortable-header">
                                             Verification At {renderSortIcon('veridesign_at')} {/* Changed underscore */}
                                         </th>
                                         <th>Details</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {filteredHistory.map((item) => (
                                         <tr key={item.veridesign_round} className="veridesign-his-row">
                                             {/* Simplified cell class names */}
                                             <td className="veridesign-his-cell-id">VERIF-{item.veridesign_round}</td>
                                             <td className="veridesign-his-cell-creator">
                                                 <div className="veridesign-his-creator-info">
                                                     <FontAwesomeIcon icon={faUser} className="veridesign-his-cell-icon" />
                                                     <span>{item.create_by || "N/A"}</span>
                                                 </div>
                                             </td>
                                             <td className="veridesign-his-cell-date">
                                                 <div className="veridesign-his-date-info">
                                                     <FontAwesomeIcon icon={faCalendarAlt} className="veridesign-his-cell-icon" />
                                                     <span>{formatDate(item.veridesign_at)}</span>
                                                 </div>
                                             </td>
                                             <td className="veridesign-his-actions-cell">
                                                 <button
                                                     className="veridesign-his-view-details-btn"
                                                     title="View Details"
                                                     onClick={() => handleViewDetails(item.design_id, item.veridesign_by)}
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
             <Modal show={showModal} onClose={closeModal} designId={selectedDesignId} veriDesignBy={selectedVeriDesignBy} />
         </div>
     );
 };

 export default VeriDesignHis;