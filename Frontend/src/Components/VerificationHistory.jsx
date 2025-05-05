import React, { useState, useEffect, useCallback } from "react";
 import { useNavigate, useLocation } from "react-router-dom";
 import Joyride, { STATUS } from 'react-joyride'; // Optional: If you want a tutorial
 import { toast } from "react-toastify";
 import axios from "axios";
 import "./CSS/VerificationHistory.css"; // ตรวจสอบว่าไฟล์ CSS นี้มีการปรับปรุง class names ให้ตรงกันด้วย

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

 // --- Modal Component (with updated class names) ---
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
         // Added prefix to modal classes
         <div className="verification-history-modal-overlay">
             <div className="verification-history-modal-content">
                 <div className="verification-history-modal-header">
                     <h3>Verification Details</h3>
                     <button className="verification-history-modal-close-button" onClick={onClose}>
                         <FontAwesomeIcon icon={faTimes} />
                     </button>
                 </div>
                 <div className="verification-history-modal-body">
                     {/* Reviewer Section */}
                     <div className="verification-history-modal-reviewer-section">
                         <h4>
                             <FontAwesomeIcon icon={faUsers} className="verification-history-modal-section-icon" />
                             Reviewers & Status
                         </h4>
                         {parsedVerificationBy.length > 0 ? (
                             <div className="verification-history-modal-reviewers-list">
                                 {parsedVerificationBy.map((reviewer, index) => (
                                     <div className="verification-history-modal-reviewer-item" key={index}>
                                         <div className="verification-history-modal-reviewer-avatar"><FontAwesomeIcon icon={faUser} /></div>
                                         <div className="verification-history-modal-reviewer-info">
                                             <span className="verification-history-modal-reviewer-name">{reviewer.name}</span>
                                             {/* Conditional class names also prefixed */}
                                             <span className={`verification-history-modal-reviewer-status ${reviewer.value ? 'verification-history-modal-reviewer-status-verified' : 'verification-history-modal-reviewer-status-not-verified'}`}>
                                                 {reviewer.value ? 'Verified' : 'Not Verified'}
                                             </span>
                                         </div>
                                         <FontAwesomeIcon
                                             icon={reviewer.value ? faCheckCircle : faTimes}
                                             className={`verification-history-modal-status-icon ${reviewer.value ? 'verification-history-modal-status-icon-verified' : 'verification-history-modal-status-icon-not-verified'}`}
                                         />
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <div className="verification-history-modal-empty-message">No reviewer information found.</div>
                         )}
                     </div>
                     {/* Requirement Section */}
                     <div className="verification-history-modal-requirement-section">
                         <h4>
                             <FontAwesomeIcon icon={faClipboardList} className="verification-history-modal-section-icon" />
                             Requirements
                         </h4>
                         {(Array.isArray(requirements) && requirements.length > 0) ? (
                             <div className="verification-history-modal-requirements-list">
                                 {requirements.map((req, index) => (
                                     <div key={index} className="verification-history-modal-requirement-item">
                                         <FontAwesomeIcon icon={faClipboardCheck} className="verification-history-modal-req-icon" />
                                         <span className="verification-history-modal-req-id">REQ-{req.toString().padStart(3, '0')}</span>
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <div className="verification-history-modal-empty-message">No associated requirements found.</div>
                         )}
                     </div>
                 </div>
             </div>
         </div>
     );
 };


 // --- VerificationHistory Component (with updated class names) ---
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

     // Updated Joyride target selectors to match new class names
     const [tutorialSteps] = useState([
      {
          target: '.verification-history-table', // Updated target
          content: 'This table shows the history of all completed verification attempts.',
          placement: 'top',
          disableBeacon: true,
      },
      {
          target: '.verification-history-table-row:first-child .verification-history-view-details-btn', // Updated target
          content: 'Click the eye icon to see details like associated requirements and reviewer actions for that specific verification round.',
          placement: 'right',
       },
     ]);

     // --- Hooks ---
     const navigate = useNavigate();
     const location = useLocation();
     const queryParams = new URLSearchParams(location.search);
     const projectId = queryParams.get("project_id");

     // --- Data Fetching (No class name changes here) ---
     const fetchVerificationHistory = useCallback(() => {
         if (!projectId) {
             toast.error("Project ID is missing. Cannot load history.");
             setLoading(false);
             return Promise.reject("Missing Project ID");
         }
         setLoading(true);

         // --- !!! ATTENTION: CHECK API URL !!! ---
         const apiUrl = `http://localhost:3001/verification-history/${projectId}`; // Using full path as an example
         console.log(`Attempting to fetch history from: ${apiUrl}`);

         return axios
             .get(apiUrl)
             .then((response) => {
                 console.log("Successfully fetched verification history:", response.data);
                 const processedData = (response.data || []).map(item => ({
                     ...item,
                     requirements: Array.isArray(item.requirements) ? item.requirements : [],
                     verification_by: Array.isArray(item.verification_by) ? item.verification_by : []
                 }));
                 setVerifications(processedData);
             })
             .catch((err) => {
                 console.error("Error fetching verification history:", err);
                 if (err.response) {
                     console.error("Error response data:", err.response.data);
                     console.error("Error response status:", err.response.status);
                     toast.error(`Error: ${err.response.status} - ${err.response.data?.message || 'Failed to load history.'}`);
                 } else if (err.request) {
                     console.error("Error request:", err.request);
                     toast.error("Network Error: Could not connect to the server to load history.");
                 } else {
                     console.error('Error message:', err.message);
                     toast.error(`Error: ${err.message}`);
                 }
                 setVerifications([]);
             })
             .finally(() => {
                 setLoading(false);
                 setIsRefreshing(false);
             });
     }, [projectId]);

     // --- Initial Data Load ---
     useEffect(() => {
         fetchVerificationHistory();
     }, [fetchVerificationHistory]);

     // --- Tutorial Trigger ---
     useEffect(() => {
         const tutorialShown = localStorage.getItem('verificationHistoryTutorialShown');
         if (!tutorialShown && !loading && verifications.length > 0) {
             const timer = setTimeout(() => setRunTutorial(true), 500);
             return () => clearTimeout(timer);
         }
     }, [loading, verifications]);

     const handleJoyrideCallback = (data) => {
         const { status } = data;
         if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
             setRunTutorial(false);
             localStorage.setItem('verificationHistoryTutorialShown', 'true');
         }
     };

     const handleRestartTutorial = () => {
         setRunTutorial(false);
         localStorage.removeItem('verificationHistoryTutorialShown');
         setTimeout(() => setRunTutorial(true), 100);
     };
     // --- End Tutorial Logic ---

     // --- Filtering and Sorting Logic (No class name changes here) ---
     useEffect(() => {
         let result = [...verifications];

         if (searchTerm) {
             const lowerSearchTerm = searchTerm.toLowerCase();
             result = result.filter(item => {
                 const idMatch = `verif-${item.id}`.toLowerCase().includes(lowerSearchTerm);
                 const creatorMatch = item.create_by && item.create_by.toLowerCase().includes(lowerSearchTerm);
                 const statusMatch = item.verification_status && item.verification_status.toLowerCase().includes(lowerSearchTerm);
                 return idMatch || creatorMatch || statusMatch;
             });
         }

         result.sort((a, b) => {
             let compareA, compareB;
             const field = sortField;
             switch (field) {
                 case "id": compareA = a.id; compareB = b.id; break;
                 case "verification_at": compareA = a.verification_at ? new Date(a.verification_at) : null; compareB = b.verification_at ? new Date(b.verification_at) : null; break;
                 case "create_by": compareA = a.create_by || ""; compareB = b.create_by || ""; break;
                 case "status": compareA = a.verification_status || ""; compareB = b.verification_status || ""; break;
                 default: compareA = a.id; compareB = b.id;
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

         setFilteredVerifications(result);
     }, [verifications, searchTerm, sortField, sortDirection]);

     // --- Event Handlers ---
     const handleViewDetails = (requirements, verificationBy) => {
         setSelectedRequirements(requirements || []);
         setSelectedVerificationBy(verificationBy || []);
         setShowModal(true);
     };

     const handleBack = () => {
         navigate(`/VerificationList?project_id=${projectId}`);
         // navigate(`/Dashboard?project_id=${projectId}`); // Alternative navigation
     };

     const handleSortChange = (field) => {
         if (sortField === field) {
             setSortDirection(currentDirection => currentDirection === 'asc' ? 'desc' : 'asc');
         } else {
             setSortField(field);
             setSortDirection('desc'); // Default to descending for new field
         }
     };

     const closeModal = () => setShowModal(false);

     // --- Helper Functions ---
     const formatDate = (dateString) => {
         if (!dateString) return "N/A";
         const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
         try {
             const date = new Date(dateString);
             if (isNaN(date.getTime())) { return "Invalid Date"; }
             return date.toLocaleDateString('en-GB', options); // Example: 'en-GB' locale
         } catch (e) {
             console.error("Error formatting date:", dateString, e);
             return "Invalid Date";
         }
     };

     const renderSortIcon = (field) => {
         if (sortField !== field) return null;
         // Added prefix to sort icon class
         return <FontAwesomeIcon icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} className="verification-history-sort-icon" />;
     };

     // --- Render Logic ---
     // Initial loading state
     if (loading && !isRefreshing) {
         return (
             // Added prefix to loading state classes
             <div className="verification-history-container">
                 <div className="verification-history-loading-state">
                     <div className="verification-history-loading-spinner"></div>
                     <p>Loading verification history...</p>
                 </div>
             </div>
         );
     }

     // Main component render (with updated class names)
     return (
         <div className="verification-history-container">
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
             <div className="verification-history-header">
                 <button className="verification-history-back-btn" onClick={handleBack}>
                     <FontAwesomeIcon icon={faArrowLeft} /> Back
                 </button>
                 <h1>
                     <FontAwesomeIcon icon={faHistory} className="verification-history-title-icon" />
                     Verification History
                 </h1>
                 {/* Optional Tutorial Restart Button */}
                 <button
                     onClick={handleRestartTutorial}
                     // Adjusted class name for tutorial button
                     className="verification-history-tutorial-help-button"
                     title="Show Tutorial Again"
                     // Keep inline styles or move to CSS with the new class
                     style={{
                         position: 'absolute', top: '15px', right: '20px', fontSize: '1.6rem',
                         background: 'none', border: 'none', color: '#333', cursor: 'pointer', zIndex: 5
                      }}
                 >
                     <FontAwesomeIcon icon={faQuestionCircle} />
                 </button>
             </div>

             {/* Content Section */}
             <div className="verification-history-content">
                 <div className="verification-history-panel">
                     {/* Panel Header: Title, Count, Tools */}
                     <div className="verification-history-panel-header">
                         <h2>
                             <FontAwesomeIcon icon={faListAlt} className="verification-history-panel-icon"/>
                             History Log
                             <span className="verification-history-count-badge">{filteredVerifications.length}</span>
                         </h2>
                         <div className="verification-history-tools">
                             {/* Search Input */}
                             <div className="verification-history-search">
                                 <FontAwesomeIcon icon={faSearch} className="verification-history-search-icon" />
                                 <input
                                     type="text"
                                     placeholder="Search ID, initiator, status..."
                                     value={searchTerm}
                                     onChange={(e) => setSearchTerm(e.target.value)}
                                     className="verification-history-search-input"
                                     disabled={loading || isRefreshing} // Disable search while loading/refreshing
                                 />
                                 {searchTerm && (
                                     <button
                                         className="verification-history-clear-search-btn"
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
                     <div className="verification-history-table-container">
                         {/* Show loading indicator inside table area during refresh */}
                         {isRefreshing && (
                            // Added prefix to refresh state classes
                            <div className="verification-history-refreshing-state">
                                <div className="verification-history-loading-spinner verification-history-loading-spinner-small"></div>
                                Refreshing...
                            </div>
                         )}

                         {/* Conditional rendering: Empty state or Table */}
                         {!isRefreshing && filteredVerifications.length === 0 ? (
                             <div className="verification-history-empty-state">
                                 <FontAwesomeIcon icon={faHistory} className="verification-history-empty-icon" />
                                 <p>{searchTerm ? "No history found matching your criteria." : "No verification history available for this project."}</p>
                                 {searchTerm && <p className="verification-history-empty-subtitle">Try clearing the search filter.</p>}
                             </div>
                         ) : (
                             <table className="verification-history-table">
                                 <thead>
                                     <tr>
                                         {/* Added prefix to header classes */}
                                         <th onClick={() => handleSortChange('id')} className="verification-history-sortable-header">Round {renderSortIcon('id')}</th>
                                         <th onClick={() => handleSortChange('create_by')} className="verification-history-sortable-header">Create By {renderSortIcon('create_by')}</th>
                                         <th onClick={() => handleSortChange('verification_at')} className="verification-history-sortable-header">Verification At {renderSortIcon('verification_at')}</th>
                                         <th>Details</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {/* Map through filtered data to render rows */}
                                     {filteredVerifications.map((verification) => (
                                         // Added prefix to row class
                                         <tr key={verification.id} className="verification-history-table-row">
                                             {/* Added prefix to cell classes */}
                                             <td className="verification-history-cell-id">VERIF-{verification.id}</td>
                                             <td className="verification-history-cell-creator">
                                                 <div className="verification-history-cell-creator-info">
                                                     <FontAwesomeIcon icon={faUser} className="verification-history-cell-icon" />
                                                     <span>{verification.create_by || "N/A"}</span>
                                                 </div>
                                             </td>
                                             <td className="verification-history-cell-date">
                                                 <div className="verification-history-cell-date-info">
                                                     <FontAwesomeIcon icon={faCalendarAlt} className="verification-history-cell-icon" />
                                                     <span>{formatDate(verification.verification_at)}</span>
                                                 </div>
                                             </td>
                                             <td className="verification-history-cell-actions">
                                                 <button
                                                     // Added prefix to button class
                                                     className="verification-history-view-details-btn"
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

             {/* Modal for displaying details (uses the updated Modal component) */}
             <Modal
                 show={showModal}
                 onClose={closeModal}
                 requirements={selectedRequirements}
                 verificationBy={selectedVerificationBy}
             />
         </div> // End Container
     );
 };

 export default VerificationHistory;