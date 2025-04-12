import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import './CSS/ViewDesign.css';
import ViewDiagram from "./viewDiagram";

// --- Icon Imports/Definitions ---
const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="19" y1="12" x2="5" y2="12"></line> <polyline points="12 19 5 12 12 5"></polyline> </svg> );
const HistoryIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M12 8v4l3 3"></path> <circle cx="12" cy="12" r="10"></circle> </svg> );
const DesignIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path> <polyline points="14 2 14 8 20 8"></polyline> <line x1="16" y1="13" x2="8" y2="13"></line> <line x1="16" y1="17" x2="8" y2="17"></line> <polyline points="10 9 9 9 8 9"></polyline> </svg> );
const IdIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect> <line x1="16" y1="2" x2="16" y2="6"></line> <line x1="8" y1="2" x2="8" y2="6"></line> <line x1="7" y1="12" x2="17" y2="12"></line> </svg> );
const TypeIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <polyline points="4 7 4 4 20 4 20 7"></polyline> <line x1="9" y1="20" x2="15" y2="20"></line> <line x1="12" y1="4" x2="12" y2="20"></line> </svg> );
const StatusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <circle cx="12" cy="12" r="10"></circle> <path d="M8 14s1.5 2 4 2 4-2 4-2"></path> <line x1="9" y1="9" x2="9.01" y2="9"></line> <line x1="15" y1="9" x2="15.01" y2="9"></line> </svg> );
const CalendarIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect> <line x1="16" y1="2" x2="16" y2="6"></line> <line x1="8" y1="2" x2="8" y2="6"></line> <line x1="3" y1="10" x2="21" y2="10"></line> </svg> );
const TimeIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <circle cx="12" cy="12" r="10"></circle> <polyline points="12 6 12 12 16 14"></polyline> </svg> );
const EyeIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path> <circle cx="12" cy="12" r="3"></circle> </svg> );
const VerifiedIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path> <polyline points="22 4 12 14.01 9 11.01"></polyline> </svg> );
const FileIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg> ); // Added File Icon
// --- End Icon Imports ---

// --- Loading Spinner Component ---
const LoadingSpinner = ({ inline }) => ( // Added inline prop for modal spinner
    <div className={`design-loading-spinner-container ${inline ? 'inline' : ''}`}>
        <div className="design-loading-spinner small"></div> {/* Optional: smaller spinner */}
        <p className="loading-text">{inline ? '' : 'Loading...'}</p>
    </div>
);

// --- Status Badge Component ---
const StatusBadge = ({ status }) => {
    let statusClass = "";
    switch (status?.toUpperCase()) {
        case "WORKING": statusClass = "working"; break;
        case "VERIFIED": statusClass = "verified"; break;
        case "BASELINE": statusClass = "baseline"; break;
        case "SUBMITTED": statusClass = "submitted"; break;
        case "REJECTED": statusClass = "rejected"; break;
        case "APPROVED": statusClass = "approved"; break;
        case "IMPLEMENTED": statusClass = "implemented"; break;
        case "DRAFT": statusClass = "draft"; break;
        case "UNDER REVIEW": statusClass = "under-review"; break;
        default: statusClass = "default-status";
    }
    return <span className={`design-status-badge ${statusClass}`}>{status || 'N/A'}</span>;
};

// --- Helper function to remove duplicates and sort history ---
const getUniqueHistory = (historyArray) => {
    if (!Array.isArray(historyArray)) return [];
    const seen = new Map();
    const uniqueHistory = [];
    for (const item of historyArray) {
        const key = `${item?.design_status}_${item?.design_at}`;
        if (item?.design_status && item?.design_at && !seen.has(key)) {
            seen.set(key, true);
            uniqueHistory.push(item);
        }
    }
    uniqueHistory.sort((a, b) => new Date(a.design_at) - new Date(b.design_at));
    return uniqueHistory;
};

// --- Simple Modal Component ---
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- Main ViewDesign Component ---
const ViewDesign = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const designId = queryParams.get("design_id");

    // State for core data
    const [designData, setDesignData] = useState(null);
    const [baselineRequirements, setBaselineRequirements] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('full');

    // State for Verification History Modal
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

    // State for Related Files Modal
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [relatedFiles, setRelatedFiles] = useState([]);
    const [isFetchingFiles, setIsFetchingFiles] = useState(false);
    const [fileError, setFileError] = useState(null);

    // --- Verification Modal Handlers ---
    const openVerificationModal = (historyItem) => {
        setSelectedHistoryItem(historyItem);
        setIsVerificationModalOpen(true);
    };
    const closeVerificationModal = () => {
        setIsVerificationModalOpen(false);
        setSelectedHistoryItem(null);
    };

    // --- Related Files Modal Handlers & Fetching ---
    const fetchRelatedFiles = async () => {
        if (!designId) return; // Don't fetch if designId is missing
        setIsFetchingFiles(true);
        setFileError(null); // Clear previous errors
        setRelatedFiles([]); // Clear previous files
        try {
            // !!! IMPORTANT: Replace with your actual API endpoint !!!
            const response = await axios.get(`http://localhost:3001/designs/${designId}/files`);
            // Assuming the API returns an array of file objects like:
            // [{ id: 1, name: 'file1.pdf', url: '/api/files/download/1' }, ...]
            setRelatedFiles(response.data || []);
        } catch (err) {
            console.error("Error fetching related files:", err);
            setFileError("Failed to load related files. Please try again.");
            setRelatedFiles([]); // Ensure files array is empty on error
        } finally {
            setIsFetchingFiles(false);
        }
    };

    const openFileModal = () => {
        setIsFileModalOpen(true);
        fetchRelatedFiles(); // Fetch files when the modal is opened
    };

    const closeFileModal = () => {
        setIsFileModalOpen(false);
        // Optional: Clear files/error when closing modal if you want fresh data next time
        // setRelatedFiles([]);
        // setFileError(null);
    };

    // --- Initial Data Fetching Effect ---
    useEffect(() => {
        const fetchDesign = async () => { /* ... (fetchDesign implementation - unchanged) ... */
             try {
                const response = await axios.get(`http://localhost:3001/designedit`, {
                    params: { project_id: projectId, design_id: designId },
                });
                console.log('Raw response from /designedit:', response.data);
                if (response.data && response.data.length > 0) {
                    const design = response.data[0];
                    let parsedRequirementIds = [];
                    if (design.requirement_id && typeof design.requirement_id === 'string') {
                        try {
                            const parsed = JSON.parse(design.requirement_id);
                            if (Array.isArray(parsed)) {
                                parsedRequirementIds = parsed.map(id => Number(id));
                            } else { console.warn("Parsed req IDs not an array:", parsed); }
                        } catch (e) { console.error("Failed to parse req IDs:", design.requirement_id, e); }
                    } else if (Array.isArray(design.requirement_id)) {
                        parsedRequirementIds = design.requirement_id.map(id => Number(id));
                    } else { console.warn("req IDs neither string nor array:", design.requirement_id); }

                    setDesignData({
                        design_id: design.design_id,
                        diagram_name: design.diagram_name || "",
                        design_type: design.design_type || "",
                        diagram_type: design.diagram_type || "",
                        design_description: design.design_description || "",
                        requirement_id: parsedRequirementIds,
                        design_status: design.design_status || "WORKING",
                        project_id: projectId
                    });
                } else {
                    console.log("No design data found");
                    setError("No design data found for the specified ID.");
                    setDesignData(null);
                }
            } catch (err) {
                console.error("Error fetching design:", err);
                setError("Failed to fetch design data. Please try again.");
                setDesignData(null);
            }
        };
        const fetchRequirements = async () => { /* ... (fetchRequirements implementation - unchanged) ... */
             try {
                const response = await axios.get(`http://localhost:3001/project/${projectId}/requirement`, {
                    params: { status: "BASELINE" },
                });
                const requirementsWithNumericIds = (response.data || []).map(req => ({
                    ...req,
                    requirement_id: Number(req.requirement_id)
                }));
                setBaselineRequirements(requirementsWithNumericIds);
            } catch (err) {
                console.error("Error fetching requirements:", err);
                setBaselineRequirements([]);
            }
         };
        const fetchHistory = async () => { /* ... (fetchHistory implementation - unchanged) ... */
             try {
                const response = await axios.get(`http://localhost:3001/getHistoryByDesignId`, {
                    params: { design_id: designId },
                });
                setHistoryData(response.data.data || []);
                console.log("Raw history data fetched:", response.data.data);
            } catch (err) {
                console.error("Error fetching history:", err);
                setHistoryData([]);
            }
        };

        if (designId && projectId) {
            setLoading(true);
            setError(null);
            Promise.all([fetchDesign(), fetchRequirements(), fetchHistory()])
                .then(() => setLoading(false))
                .catch((err) => {
                    console.error("Error during initial data fetching:", err);
                    setError("Failed to fetch design data. Please check the console.");
                    setLoading(false);
                });
        } else {
            setError("Missing required parameters (designId or projectId). Cannot load page.");
            setLoading(false);
        }
    }, [designId, projectId]);

    // --- Date/Time Formatting Helper ---
    const formatDateTime = (datetime) => { /* ... (formatDateTime implementation - unchanged) ... */
        if (!datetime) return { date: "N/A", time: "N/A" };
        const dateObj = new Date(datetime);
        if (isNaN(dateObj.getTime())) return { date: "Invalid Date", time: "" };

        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0');

        return { date: `${day}/${month}/${year}`, time: `${hours}:${minutes}:${seconds}` };
     };

    // Processed History Data
    const uniqueHistoryData = getUniqueHistory(historyData);
    const verificationHistory = uniqueHistoryData.filter(
        (history) => history.design_status?.toUpperCase() === "VERIFIED"
    );

    // --- Render Logic ---
    if (loading) return <LoadingSpinner />;
    if (error) return <div className="design-error-message">{error}</div>;
    if (!designData) return <div className="design-not-found-message">Design details could not be loaded.</div>;

    // Format date/time for the selected verification history item
    const verificationModalDateTime = selectedHistoryItem ? formatDateTime(selectedHistoryItem.design_at) : { date: '', time: '' };

    return (
        <div className="view-design-container">
            <div className="design-view-dashboard">
                {/* --- Header --- */}
                <div className="design-header">
                     <div className="design-header-left">
                         <button
                             className="backtodesign-button"
                             onClick={() =>
                                 navigate(`/Dashboard?project_id=${projectId}`, {
                                     state: { selectedSection: "Design" },
                                 })
                             }
                         >
                             <BackIcon />
                             <span>Back</span>
                         </button>
                     </div>
                     <div className="design-header-title">
                         <DesignIcon />
                         <h1 className="view-design-title">Design Details</h1>
                     </div>
                     <div className="design-header-right">
                         <div className="design-id-badge">
                             DES-{String(designData.design_id).padStart(3, '0')}
                         </div>
                     </div>
                 </div>

                {/* --- Content Area --- */}
                <div className="design-content">
                    {/* --- Details Card --- */}
                    <div className="design-details-card">
                        <div className="design-card-header">
                            <h2>{designData.diagram_name}</h2>
                            <StatusBadge status={designData.design_status} />
                        </div>

                        <div className="design-info-grid">
                            {/* ... Info items ... */}
                             <div className="design-info-item">
                                 <div className="design-info-label"> <IdIcon /> <span>Design ID</span> </div>
                                 <div className="design-info-value">SD-{String(designData.design_id).padStart(3, '0')}</div>
                             </div>
                             <div className="design-info-item">
                                 <div className="design-info-label"> <TypeIcon /> <span>Design Type</span> </div>
                                 <div className="design-info-value">{designData.design_type || 'N/A'}</div>
                             </div>
                             <div className="design-info-item">
                                 <div className="design-info-label"> <TypeIcon /> <span>Diagram Type</span> </div>
                                 <div className="design-info-value">{designData.diagram_type || 'N/A'}</div>
                             </div>
                             <div className="design-info-item">
                                 <div className="design-info-label"> <StatusIcon /> <span>Status</span> </div>
                                 <div className="design-info-value">{designData.design_status || 'N/A'}</div>
                             </div>
                        </div>

                        <div className="design-description-section">
                            {/* ... Description ... */}
                            <h3>Description</h3>
                             <div className="design-description-content">
                                 {designData.design_description || 'No description provided.'}
                             </div>
                        </div>

                        <div className="design-requirements-section">
                             {/* ... Requirements ... */}
                             <h3>Linked Requirements (Baseline)</h3>
                             <div className="design-requirements-list">
                                 {baselineRequirements.length > 0 && Array.isArray(designData.requirement_id) && designData.requirement_id.length > 0 ? (
                                     <ul>
                                         {baselineRequirements
                                             .filter((req) => designData.requirement_id.includes(req.requirement_id))
                                             .map((req) => (
                                                 <li key={req.requirement_id}>{`REQ-${String(req.requirement_id).padStart(3, '0')}: ${req.requirement_name}`}</li>
                                             ))}
                                         {baselineRequirements.filter((req) => designData.requirement_id.includes(req.requirement_id)).length === 0 &&
                                             <li>No matching baseline requirements found for this design.</li>
                                         }
                                     </ul>
                                 ) : (
                                     <p>No linked requirements found or baseline data unavailable.</p>
                                 )}
                             </div>
                        </div>

                        {/* --- Related Files Section (MODIFIED) --- */}
                        <div className="design-related-files-section">
                            <div className="design-section-header-action"> {/* Flex container */}
                                <h3>Related Files</h3>
                                <button
                                    className="icon-button view-files-button" // Style as needed
                                    onClick={openFileModal}
                                    title="View Related Files" // Tooltip for accessibility
                                >
                                    <EyeIcon />
                                </button>
                            </div>
                            {/* Content is now shown in the modal */}
                        </div>

                    </div> {/* End Details Card */}

                    {/* --- History Card --- */}
                    <div className="design-history-card">
                         {/* ... History Card Content (Tabs, Tables) - Unchanged ... */}
                         <div className="design-card-header">
                             <div className="design-history-title">
                                 <HistoryIcon />
                                 <h1 className="history-design-topic">History: {designData.diagram_name}</h1>
                             </div>
                         </div>

                         <div className="design-history-tabs">
                             <button
                                 className={`design-tab ${activeTab === 'full' ? 'active' : ''}`}
                                 onClick={() => setActiveTab('full')}
                             >
                                 Full History ({uniqueHistoryData.length})
                             </button>
                             <button
                                 className={`design-tab ${activeTab === 'verified' ? 'active' : ''}`}
                                 onClick={() => setActiveTab('verified')}
                             >
                                 <VerifiedIcon />
                                 Verification ({verificationHistory.length})
                             </button>
                         </div>

                         <div className="design-history-tab-content">
                             {/* Full History Tab */}
                             {activeTab === 'full' && (
                                 <div className="design-history-table-container">
                                     {uniqueHistoryData.length > 0 ? (
                                         <table className="history-table-design">
                                             <thead>
                                                 <tr>
                                                     <th><StatusIcon /> Status</th>
                                                     <th><CalendarIcon /> Date</th>
                                                     <th><TimeIcon /> Time</th>
                                                 </tr>
                                             </thead>
                                             <tbody>
                                                 {uniqueHistoryData.map((history) => {
                                                     const { date, time } = formatDateTime(history.design_at);
                                                     return (
                                                         <tr key={history.history_id || `${history.design_status}-${history.design_at}`}>
                                                             <td><StatusBadge status={history.design_status} /></td>
                                                             <td>{date}</td>
                                                             <td>{time}</td>
                                                         </tr>
                                                     );
                                                 })}
                                             </tbody>
                                         </table>
                                     ) : (
                                         <p>No history available.</p>
                                     )}
                                 </div>
                             )}

                             {/* Verification History Tab */}
                             {activeTab === 'verified' && (
                                 <div className="design-history-table-container">
                                     {verificationHistory.length > 0 ? (
                                         <table className="history-table-design verification-history-table">
                                             <thead>
                                                 <tr>
                                                     <th><StatusIcon /> Status</th>
                                                     <th><CalendarIcon /> Date</th>
                                                     <th><TimeIcon /> Time</th>
                                                     <th><EyeIcon /> Action</th> {/* Header Icon */}
                                                 </tr>
                                             </thead>
                                             <tbody>
                                                 {verificationHistory.map((history) => {
                                                     const { date, time } = formatDateTime(history.design_at);
                                                     return (
                                                         <tr key={history.history_id || `${history.design_status}-${history.design_at}`}>
                                                             <td><StatusBadge status={history.design_status} /></td>
                                                             <td>{date}</td>
                                                             <td>{time}</td>
                                                             <td>
                                                                 <button
                                                                     className="view-details-button"
                                                                     onClick={() => openVerificationModal(history)} // Open verification modal
                                                                 >
                                                                     <EyeIcon />
                                                                     <span style={{ marginLeft: '5px' }}>View Details</span>
                                                                 </button>
                                                             </td>
                                                         </tr>
                                                     );
                                                 })}
                                             </tbody>
                                         </table>
                                     ) : (
                                         <p>No unique verification history available.</p>
                                     )}
                                 </div>
                             )}
                         </div> {/* End Tab Content */}
                    </div> {/* End History Card */}
                </div> {/* End Content Area */}

                {/* --- Diagram Container --- */}
                <div className="design-diagram-container">
                    <ViewDiagram designId={designId} />
                </div>

            </div> {/* End Dashboard */}

            {/* --- Modal for Verification Details --- */}
            <Modal
                isOpen={isVerificationModalOpen}
                onClose={closeVerificationModal}
                title="Verification Details"
            >
                {selectedHistoryItem ? (
                    <div>
                        <p><strong>Status:</strong> <StatusBadge status={selectedHistoryItem.design_status} /></p>
                        <p><strong>Date:</strong> {verificationModalDateTime.date}</p>
                        <p><strong>Time:</strong> {verificationModalDateTime.time}</p>
                        <p><em>(More details would appear here)</em></p>
                    </div>
                ) : (
                    <p>Loading details...</p>
                )}
            </Modal>

            {/* --- Modal for Related Files (NEW) --- */}
            <Modal
                isOpen={isFileModalOpen}
                onClose={closeFileModal}
                title="Related Files"
            >
                {isFetchingFiles && <LoadingSpinner inline={true} />}
                {fileError && <p className="error-text">{fileError}</p>}
                {!isFetchingFiles && !fileError && (
                    relatedFiles.length > 0 ? (
                        <ul className="related-files-modal-list">
                            {relatedFiles.map(file => (
                                <li key={file.id || file.name}> {/* Use a unique key */}
                                    <FileIcon />
                                    {/* !!! Ensure file.url is a valid URL from your API !!! */}
                                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                                        {file.name || 'Unnamed File'}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No related files found for this design.</p>
                    )
                )}
            </Modal>

        </div> // End Main Container
    );
};

export default ViewDesign;