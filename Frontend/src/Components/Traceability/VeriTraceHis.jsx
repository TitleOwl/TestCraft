import React, { useState, useEffect, useCallback } from "react";
 import { useNavigate, useLocation } from "react-router-dom";
 import Joyride, { STATUS } from 'react-joyride'; // Optional
 import { toast } from "react-toastify";
 import axios from "axios";
 import "./CSS/VeriTraceHis.css"; // Ensure this CSS file uses the veritrace-his- prefix

 import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
 import {
     faSearch, faTimes, faCalendarAlt, faUser,
     faArrowLeft, faSortAmountDown, faSortAmountUp,
     faEye, faUsers, faListAlt, faHistory, faCheckCircle, faTimesCircle,
     faQuestionCircle, faProjectDiagram, faFileAlt, faPalette, faCode, faVial,
     faSync // Added for refresh icon
 } from "@fortawesome/free-solid-svg-icons";

 // --- Modal Component (UPDATED with 'veritrace-his-' prefix) ---
 const Modal = ({ show, onClose, traceItem = null, verificationBy = {} }) => {
     if (!show) return null;

     // Parsing Logic for Reviewer (unchanged)
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

     // Helper to format ID with prefix (unchanged)
     const formatId = (prefix, id) => {
          if (id === null || id === undefined || id === '-') return null;
          return `<span class="math-inline">\{prefix\}\-</span>{String(id).padStart(3, '0')}`;
     }

     // Helper to render status badge (uses veritrace-his- classes already)
     const renderStatusBadge = (st) => {
          if (!st || st === "-" || st === "N/A") return null;
          let statusClass = 'veritrace-his-status-neutral'; // Default class
          const lowerStatus = String(st).toLowerCase();
          if (['approved', 'passed', 'complete', 'verified', 'validated', 'baseline', 'done', 'closed'].includes(lowerStatus)) {
              statusClass = 'veritrace-his-status-positive';
          } else if (['rejected', 'failed', 'error', 'blocked', 'cancelled', 'invalid', 'n/a'].includes(lowerStatus)) {
              statusClass = 'veritrace-his-status-negative';
          } else if (['draft', 'review', 'submitted', 'pending', 'in progress', 'new', 'open'].includes(lowerStatus)) {
              statusClass = 'veritrace-his-status-wip';
          }
          // Added base class for easier targeting
          return <span className={`veritrace-his-status-badge ${statusClass}`}>{st}</span>;
     };

     // Helper to Render Cell Content (Uses veritrace-his- classes already)
     const renderTableCell = (artifactKey) => {
          let ids = [];
          let names = [];
          let statuses = [];
          let prefix = '';

          switch(artifactKey) {
              case 'req':
                  ids = traceItem?.requirement_ids || [];
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
                  names = traceItem?.implement_files || [];
                  statuses = [];
                  prefix = 'SC';
                  break;
              case 'test':
                  ids = traceItem?.testcase_ids || [];
                  names = traceItem?.testcase_names || [];
                  statuses = traceItem?.testcase_statuses || [];
                  prefix = 'TC';
                  break;
              default:
                  return <span className="veritrace-his-artifact-nolink">-</span>; // No prefix needed here
          }

          if (!Array.isArray(ids) || ids.length === 0 || ids.every(id => id === null || id === undefined || id === '-')) {
              return <span className="veritrace-his-artifact-nolink">Not Linked</span>; // No prefix needed here
          }

          return (
              <div className="veritrace-his-artifact-cell-multi-content">
                  {ids.map((id, index) => {
                      if (id === null || id === undefined || id === '-') return null;
                      const formattedId = formatId(prefix, id);
                      const displayName = (Array.isArray(names) && names[index] && names[index] !== 'N/A') ? names[index] : '';
                      const status = (Array.isArray(statuses) && statuses[index]) ? statuses[index] : null;
                      return (
                          <div key={`<span class="math-inline">\{prefix\}\-</span>{id}-${index}`} className="veritrace-his-artifact-item">
                              <div className="veritrace-his-artifact-id">{formattedId}</div>
                              {displayName && <div className="veritrace-his-artifact-name">{displayName}</div>}
                              {renderStatusBadge(status)}
                          </div>
                      );
                  })}
              </div>
          );
     };

     return (
         // Updated modal classes with prefix
         <div className="veritrace-his-modal-overlay">
             <div className="veritrace-his-modal-content wide"> {/* Keep wide modifier if needed */}
                 <div className="veritrace-his-modal-header">
                     <h3>Traceability Verification Details (Round: {traceItem?.create_round || 'N/A'})</h3>
                     <button className="veritrace-his-modal-close-button" onClick={onClose}>
                         <FontAwesomeIcon icon={faTimes} />
                     </button>
                 </div>
                 <div className="veritrace-his-modal-body">
                     {/* Linked Items Section */}
                     <div className="veritrace-his-modal-linked-items-section">
                         <h4><FontAwesomeIcon icon={faProjectDiagram} className="veritrace-his-modal-section-icon" />Traceability</h4>
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
                             <div className="veritrace-his-modal-empty-message">Details not available.</div>
                         )}
                     </div>

                     {/* Reviewer Section */}
                     <div className="veritrace-his-modal-reviewer-section">
                         <h4><FontAwesomeIcon icon={faUsers} className="veritrace-his-modal-section-icon" />Reviewer</h4>
                         {parsedVerificationBy.length > 0 ? (
                             <div className="veritrace-his-modal-reviewers-list">
                                 {parsedVerificationBy.map((person, index) => (
                                      <div className="veritrace-his-modal-reviewer-item" key={index}>
                                           <div className="veritrace-his-modal-reviewer-avatar"><FontAwesomeIcon icon={faUser} /></div>
                                           <div className="veritrace-his-modal-reviewer-info">
                                                <span className="veritrace-his-modal-reviewer-name">{person.name}</span>
                                                {/* Status text - uses specific classes from helper */}
                                                {person.value === true && (<span className="veritrace-his-reviewer-status veritrace-his-status-verified">Verified</span>)}
                                                {person.value === false && (<span className="veritrace-his-reviewer-status veritrace-his-status-not-verified">Not Verified</span>)}
                                                {person.value === null && (<span className="veritrace-his-reviewer-status veritrace-his-status-unknown">Status Unknown</span>)}
                                           </div>
                                           {/* Status icon - uses specific classes */}
                                           {person.value === true && (<FontAwesomeIcon icon={faCheckCircle} className="veritrace-his-status-icon veritrace-his-status-verified" />)}
                                           {person.value === false && (<FontAwesomeIcon icon={faTimesCircle} className="veritrace-his-status-icon veritrace-his-status-not-verified" />)}
                                           {person.value === null && (<FontAwesomeIcon icon={faQuestionCircle} className="veritrace-his-status-icon veritrace-his-status-unknown" />)}
                                      </div>
                                 ))}
                             </div>
                         ) : (
                             <div className="veritrace-his-modal-empty-message">No verification information found for this record.</div>
                         )}
                     </div>
                 </div>
             </div>
         </div>
     );
 };


 // --- VeriTraceHis Component (UPDATED with 'veritrace-his-' prefix) ---
 const VeriTraceHis = () => {
     // --- State Variables (unchanged) ---
     const [traceHistory, setTraceHistory] = useState([]);
     const [filteredTraceHistory, setFilteredTraceHistory] = useState([]);
     const [selectedTraceDetails, setSelectedTraceDetails] = useState(null);
     const [selectedVerificationBy, setSelectedVerificationBy] = useState({});
     const [showModal, setShowModal] = useState(false);
     const [loading, setLoading] = useState(true);
     const [searchTerm, setSearchTerm] = useState("");
     const [sortField, setSortField] = useState("verification_at");
     const [sortDirection, setSortDirection] = useState("desc");
     const [isRefreshing, setIsRefreshing] = useState(false);
     const [runTutorial, setRunTutorial] = useState(false);

     // Joyride targets use updated class names
     const [tutorialSteps] = useState([
         { target: '.veritrace-his-table', content: 'This table shows the history of traceability verification rounds.', placement: 'top' },
         { target: '.veritrace-his-row:first-child .veritrace-his-actions-cell .veritrace-his-view-details-btn', content: 'Click this button to see the details of the linked artifacts and reviewers for that specific verification round.', placement: 'right' },
         { target: '.veritrace-his-search-input', content: 'You can search the history by round number, creator, or date.', placement: 'bottom' },
         { target: '.veritrace-his-sortable-header', content: 'Click on column headers like "Round", "Create by", or "Verification Date" to sort the history.', placement: 'bottom' },
     ]);

     // --- Hooks (unchanged) ---
     const navigate = useNavigate();
     const location = useLocation();
     const queryParams = new URLSearchParams(location.search);
     const projectId = queryParams.get("project_id");

     // --- Helper Functions (unchanged) ---
     const formatDate = useCallback((dateString) => {
          if (!dateString) return "N/A";
          const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };
          try {
              const date = new Date(dateString);
              if (isNaN(date.getTime())) { console.warn("Invalid Date detected:", dateString); return "Invalid Date"; }
              return date.toLocaleDateString('en-GB', options);
          } catch (e) { console.error("Error formatting date:", dateString, e); return "Invalid Date"; }
     }, []);

     // --- Data Fetching (unchanged) ---
     const fetchTraceHistory = useCallback(() => {
          if (!projectId) { toast.error("Project ID is missing in the URL."); setLoading(false); return Promise.reject("Missing Project ID"); }
          setLoading(true);
          setIsRefreshing(true); // Set refreshing true during fetch
          const apiUrl = `http://localhost:3001/veritrace-history/${projectId}`;
          console.log(`VERITRACE_HIS: Fetching history from: ${apiUrl}`);

          return axios.get(apiUrl)
              .then((response) => {
                  console.log("VERITRACE_HIS: Raw Response Data:", response.data);
                  const rawData = Array.isArray(response.data) ? response.data : [];
                  const processedData = rawData.map(item => ({
                      ...item,
                      verification_by: item.verification_by && typeof item.verification_by === 'object' && !Array.isArray(item.verification_by) ? item.verification_by : {}
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
              .finally(() => { setLoading(false); setIsRefreshing(false); });
     }, [projectId]);

     // --- Effects (Logic unchanged, but dependencies updated) ---
     useEffect(() => { fetchTraceHistory(); }, [fetchTraceHistory]);

     useEffect(() => { // Tutorial trigger
         if (!loading && traceHistory.length > 0) {
             const tutorialShown = localStorage.getItem('veriTraceHisTutorialShown');
             if (!tutorialShown) {
                 const timer = setTimeout(() => setRunTutorial(true), 500);
                 return () => clearTimeout(timer);
             }
         }
         if (loading || traceHistory.length === 0) { setRunTutorial(false); }
     }, [loading, traceHistory]);

     // --- Grouping, Merging, Filtering, Sorting Effect (Logic unchanged, uses traceHistory state) ---
     useEffect(() => {
          let rawData = [...traceHistory];
          const groupedItems = rawData.reduce((acc, item) => {
              const key = item.create_round;
              if (!acc[key]) acc[key] = [];
              acc[key].push(item);
              return acc;
          }, {});

          const mergedResult = Object.values(groupedItems).map(group => {
              if (group.length === 1) return group[0];
              group.sort((a, b) => new Date(b.verification_at) - new Date(a.verification_at));
              const baseItem = group[0];
              const mergedItem = {
                  ...baseItem,
                  _reqIds: new Set(), _designIds: new Set(), _implIds: new Set(), _testIds: new Set(),
                  requirement_ids: [], requirement_names: [], requirement_statuses: [],
                  design_ids: [], design_names: [], design_statuses: [],
                  implement_ids: [], implement_files: [],
                  testcase_ids: [], testcase_names: [], testcase_statuses: [],
                  verification_by: { ...baseItem.verification_by }
              };
              const artifactInfoMap = { req: {}, design: {}, impl: {}, test: {} };
              group.forEach(item => {
                  if (item.requirement_id && !mergedItem._reqIds.has(item.requirement_id)) { mergedItem._reqIds.add(item.requirement_id); artifactInfoMap.req[item.requirement_id] = { name: item.requirement_name, status: item.requirement_status }; }
                  if (item.design_id && !mergedItem._designIds.has(item.design_id)) { mergedItem._designIds.add(item.design_id); artifactInfoMap.design[item.design_id] = { name: item.design_name, status: item.design_status }; }
                  if (item.implement_id && !mergedItem._implIds.has(item.implement_id)) { mergedItem._implIds.add(item.implement_id); artifactInfoMap.impl[item.implement_id] = { file: item.implement_file }; }
                  if (item.testcase_id && !mergedItem._testIds.has(item.testcase_id)) { mergedItem._testIds.add(item.testcase_id); artifactInfoMap.test[item.testcase_id] = { name: item.testcase_name, status: item.testcase_status }; }
                  if (item.verification_by) { Object.entries(item.verification_by).forEach(([name, status]) => { if (!mergedItem.verification_by[name] || (mergedItem.verification_by[name] === false && status === true)) { mergedItem.verification_by[name] = status; } }); }
              });
              mergedItem._reqIds.forEach(id => { mergedItem.requirement_ids.push(id); mergedItem.requirement_names.push(artifactInfoMap.req[id]?.name || 'N/A'); mergedItem.requirement_statuses.push(artifactInfoMap.req[id]?.status || null); });
              mergedItem._designIds.forEach(id => { mergedItem.design_ids.push(id); mergedItem.design_names.push(artifactInfoMap.design[id]?.name || 'N/A'); mergedItem.design_statuses.push(artifactInfoMap.design[id]?.status || null); });
              mergedItem._implIds.forEach(id => { mergedItem.implement_ids.push(id); mergedItem.implement_files.push(artifactInfoMap.impl[id]?.file || 'N/A'); });
              mergedItem._testIds.forEach(id => { mergedItem.testcase_ids.push(id); mergedItem.testcase_names.push(artifactInfoMap.test[id]?.name || 'N/A'); mergedItem.testcase_statuses.push(artifactInfoMap.test[id]?.status || null); });
              delete mergedItem._reqIds; delete mergedItem._designIds; delete mergedItem._implIds; delete mergedItem._testIds;
              // console.log("MERGED ITEM for Round", mergedItem.create_round, mergedItem); // Optional log
              return mergedItem;
          });

          let filteredResult = mergedResult;
          if (searchTerm) {
              const lowerSearchTerm = searchTerm.toLowerCase();
              filteredResult = mergedResult.filter(item => {
                  const roundMatch = item.create_round?.toString().toLowerCase().includes(lowerSearchTerm);
                  const creatorMatch = item.create_by?.toLowerCase().includes(lowerSearchTerm);
                  const dateMatch = formatDate(item.verification_at)?.toLowerCase().includes(lowerSearchTerm);
                  return roundMatch || creatorMatch || dateMatch;
              });
          }

          filteredResult.sort((a, b) => {
              let compareA, compareB;
              const field = sortField;
              switch (field) {
                  case "create_round": compareA = a.create_round; compareB = b.create_round; break;
                  case "create_by": compareA = a.create_by || ""; compareB = b.create_by || ""; break;
                  case "verification_at": default: compareA = a.verification_at ? new Date(a.verification_at) : null; compareB = b.verification_at ? new Date(b.verification_at) : null; break;
              }
              const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
              if (compareA === null && compareB === null) return 0;
              if (compareA === null) return 1 * directionMultiplier;
              if (compareB === null) return -1 * directionMultiplier;
              if (compareA instanceof Date && compareB instanceof Date) {
                  const timeA = isNaN(compareA.getTime()) ? (sortDirection === 'asc' ? Infinity : -Infinity) : compareA.getTime();
                  const timeB = isNaN(compareB.getTime()) ? (sortDirection === 'asc' ? Infinity : -Infinity) : compareB.getTime();
                  return (timeA - timeB) * directionMultiplier;
              } else if (typeof compareA === 'string' && typeof compareB === 'string') { return compareA.localeCompare(compareB) * directionMultiplier; }
              else if (typeof compareA === 'number' && typeof compareB === 'number') { return (compareA - compareB) * directionMultiplier; }
              return 0;
          });
          setFilteredTraceHistory(filteredResult);
     }, [traceHistory, searchTerm, sortField, sortDirection, formatDate]); // Added formatDate dependency

     // --- Event Handlers (Logic unchanged) ---
     const handleViewDetails = (traceItem) => {
          console.log("VERITRACE_HIS: handleViewDetails called with MERGED item:", traceItem);
          setSelectedTraceDetails(traceItem);
          setSelectedVerificationBy(traceItem.verification_by || {});
          setShowModal(true);
     };
     const handleBack = () => navigate(`/viewVerifyTrace?project_id=${projectId}`);
     const handleSortChange = (field) => {
          setSortDirection(currentDirection => {
              if (sortField === field) { return currentDirection === 'asc' ? 'desc' : 'asc'; }
              else { setSortField(field); return 'desc'; }
          });
     };
     const closeModal = () => { setShowModal(false); setSelectedTraceDetails(null); setSelectedVerificationBy({}); };
     const handleJoyrideCallback = (data) => { const { status } = data; if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) { setRunTutorial(false); localStorage.setItem('veriTraceHisTutorialShown', 'true'); } };
     const handleRestartTutorial = () => { setRunTutorial(false); localStorage.removeItem('veriTraceHisTutorialShown'); setTimeout(() => { window.scrollTo(0, 0); setRunTutorial(true); }, 100); };


     // Helper to Render Sort Icons
     const renderSortIcon = (field) => {
          if (sortField !== field) return null;
          // Added prefix class
          return <FontAwesomeIcon className="veritrace-his-sort-icon" icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} />;
     };


     // --- Render Logic (Updated class names) ---
     if (loading && !isRefreshing) {
         return (
             <div className="veritrace-his-container">
                 {/* Updated loading state classes */}
                 <div className="veritrace-his-loading-state">
                     <div className="veritrace-his-loading-spinner"></div>
                     <p>Loading traceability verification history...</p>
                 </div>
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
                         {/* Added panel icon class */}
                         <h2> <FontAwesomeIcon icon={faListAlt} className="veritrace-his-panel-icon"/> Trace History Log <span className="veritrace-his-count-badge">{filteredTraceHistory.length}</span> </h2>
                         <div className="veritrace-his-tools">
                             <div className="veritrace-his-search">
                                 <FontAwesomeIcon icon={faSearch} className="veritrace-his-search-icon" />
                                 <input type="text" placeholder="Search Round, Creator, Date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="veritrace-his-search-input" disabled={loading || isRefreshing} />
                                 {/* Updated clear search button class */}
                                 {searchTerm && ( <button className="veritrace-his-clear-search-btn" onClick={() => setSearchTerm("")} title="Clear search" disabled={loading || isRefreshing} > <FontAwesomeIcon icon={faTimes} /> </button> )}
                             </div>
                         </div>
                     </div>

                     <div className="veritrace-his-table-container">
                          {/* Updated refreshing state structure */}
                         {isRefreshing && (
                            <div className="veritrace-his-refreshing-state">
                                <div className="veritrace-his-loading-spinner veritrace-his-loading-spinner-small"></div> Refreshing...
                            </div>
                         )}
                         {!isRefreshing && filteredTraceHistory.length === 0 ? (
                             <div className="veritrace-his-empty-state">
                                 {/* Updated empty icon/subtitle classes */}
                                 <FontAwesomeIcon icon={faHistory} className="veritrace-his-empty-icon" />
                                 <p>{searchTerm ? "No history entries found matching your search." : "No traceability verification history is available for this project yet."}</p>
                                 {searchTerm && <p className="veritrace-his-empty-subtitle">Try adjusting or clearing your search filter.</p>}
                             </div>
                         ) : (
                             <table className="veritrace-his-table">
                                 <thead>
                                     <tr>
                                         {/* Updated header/cell classes */}
                                         <th onClick={() => handleSortChange('create_round')} className="veritrace-his-sortable-header"> Round {renderSortIcon('create_round')} </th>
                                         <th onClick={() => handleSortChange('create_by')} className="veritrace-his-sortable-header"> Create by {renderSortIcon('create_by')} </th>
                                         <th onClick={() => handleSortChange('verification_at')} className="veritrace-his-sortable-header"> Verification Date {renderSortIcon('verification_at')} </th>
                                         <th className="veritrace-his-actions-header">Details</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {filteredTraceHistory.map((traceItem) => (
                                         <tr key={traceItem.veritrace_id || traceItem.create_round} className="veritrace-his-row">
                                             {/* Updated cell classes */}
                                             <td className="veritrace-his-cell-round">VERIF-{traceItem.create_round}</td>
                                             <td className="veritrace-his-cell-creator">
                                                 <div className="veritrace-his-cell-creator-info">
                                                     <FontAwesomeIcon icon={faUser} className="veritrace-his-cell-icon" />
                                                     <span>{traceItem.create_by || "N/A"}</span>
                                                 </div>
                                             </td>
                                             <td className="veritrace-his-cell-date">
                                                 <div className="veritrace-his-cell-date-info">
                                                     <FontAwesomeIcon icon={faCalendarAlt} className="veritrace-his-cell-icon" />
                                                     <span>{formatDate(traceItem.verification_at)}</span>
                                                 </div>
                                             </td>
                                             <td className="veritrace-his-actions-cell">
                                                 {/* Updated button class */}
                                                 <button className="veritrace-his-view-details-btn" title="View Details" onClick={() => handleViewDetails(traceItem)} >
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

             {/* Modal component uses updated classes internally */}
             <Modal show={showModal} onClose={closeModal} traceItem={selectedTraceDetails} verificationBy={selectedVerificationBy} />
         </div>
     );
 };

 export default VeriTraceHis;