import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import './CSS/ViewDesign.css'; // ตรวจสอบ Path CSS ให้ถูกต้อง
import ViewDiagram from "./viewDiagram"; // ตรวจสอบ Path Component
import VericriDesignDetails from './VericriDesignDetails'; // *** IMPORT COMPONENT ที่จะใช้ใน MODAL ***

// --- Icon Imports/Definitions --- (ไอคอนทั้งหมดเหมือนเดิม)
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
const FileIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg> );
// --- End Icon Imports ---

// --- Loading Spinner Component --- (เหมือนเดิม)
const LoadingSpinner = ({ inline }) => (
    <div className={`design-loading-spinner-container ${inline ? 'inline' : ''}`}>
        <div className="design-loading-spinner small"></div>
        <p className="loading-text">{inline ? '' : 'Loading...'}</p>
    </div>
);

// --- Status Badge Component --- (เหมือนเดิม)
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

// --- Helper function to remove duplicates and sort history --- (เหมือนเดิม)
const getUniqueHistory = (historyArray) => {
    if (!Array.isArray(historyArray)) return [];
    const seen = new Map();
    const uniqueHistory = [];
    // เรียงลำดับตามเวลาก่อน เพื่อให้แน่ใจว่าถ้ามี key ซ้ำ จะเก็บอันล่าสุด (ถ้า logic ต้องการ)
    // หรือถ้าไม่ต้องการ ให้เรียงตอนท้ายสุดทีเดียว
    const sortedHistory = [...historyArray].sort((a, b) => new Date(b.design_at) - new Date(a.design_at)); // เรียงใหม่สุดไปเก่าสุดก่อน

    for (const item of sortedHistory) {
        // ใช้ history_id หรือ veridesign_id เป็น key หลัก ถ้ามีและไม่ซ้ำ
        // ถ้าไม่มี ใช้ status + timestamp เป็น key สำรอง
        // *** ปรับ Key ให้ดีที่สุดตามข้อมูลที่มี: ถ้ามี veridesign_id หรือ history_id ที่ unique ต่อ event ให้ใช้ตัวนั้น ***
        const primaryKey = item?.veridesign_id ?? item?.history_id; // <<< ลองใช้ veridesign_id ก่อน ถ้าไม่มี ใช้ history_id
        const fallbackKey = `${item?.design_status}_${item?.design_at}`;
        const key = primaryKey ? `id_${primaryKey}` : fallbackKey;

        if (key && !seen.has(key)) {
            seen.set(key, true);
            uniqueHistory.push(item);
        }
        // ถ้าไม่มี key หลัก แต่มี key สำรอง และยังไม่เคยเห็น ก็เพิ่มเข้าไป
        else if (!primaryKey && item?.design_status && item?.design_at && !seen.has(key)) {
             seen.set(key, true);
             uniqueHistory.push(item);
        }
    }
    // เรียงลำดับจากเก่าไปใหม่เพื่อแสดงผล
    uniqueHistory.sort((a, b) => new Date(a.design_at) - new Date(b.design_at));
    console.log("Unique History Data (Sorted Oldest First):", uniqueHistory); // Log ดูผลลัพธ์
    return uniqueHistory;
};


// --- Simple Modal Component --- (เหมือนเดิม)
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
    const designId = queryParams.get("design_id"); // ID หลักของ Design หน้านี้

    // State หลัก
    const [designData, setDesignData] = useState(null);
    const [baselineRequirements, setBaselineRequirements] = useState([]);
    const [historyData, setHistoryData] = useState([]); // ข้อมูล History ดิบจาก API
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('full'); // Tab ใน History Card

    // State สำหรับ Verification History Modal
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null); // เก็บ history item ที่ถูกคลิก

    // State สำหรับ Related Files Modal (เหมือนเดิม)
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [relatedFiles, setRelatedFiles] = useState([]);
    const [isFetchingFiles, setIsFetchingFiles] = useState(false);
    const [fileError, setFileError] = useState(null);

    // --- Verification Modal Handlers ---
    const openVerificationModal = (historyItem) => {
        console.log("Opening verification modal for:", historyItem); // Log ดูข้อมูล historyItem ที่ส่งมา
        // *** ตรวจสอบว่า historyItem มี veridesign_id หรือ history_id ที่ unique หรือไม่ ***
        if (!historyItem?.veridesign_id && !historyItem?.history_id && !historyItem?.design_at) {
             console.error("History item is missing a unique identifier (veridesign_id, history_id, or timestamp)!", historyItem);
             // อาจจะแสดงข้อผิดพลาดให้ผู้ใช้ทราบ หรือไม่เปิด Modal เลย
             alert("Cannot view details: Missing identifier in history data.");
             return;
        }
        setSelectedHistoryItem(historyItem); // เก็บ history item ที่คลิกไว้ใน state
        setIsVerificationModalOpen(true);    // เปิด Modal
    };
    const closeVerificationModal = () => {
        setIsVerificationModalOpen(false);
        setSelectedHistoryItem(null); // ล้าง history item ที่เลือกไว้เมื่อปิด Modal
    };

    // --- Related Files Modal Handlers & Fetching --- (เหมือนเดิม)
    const fetchRelatedFiles = async () => {
        if (!designId) return;
        setIsFetchingFiles(true);
        setFileError(null);
        setRelatedFiles([]);
        try {
            const response = await axios.get(`http://localhost:3001/designs/${designId}/files`);
            setRelatedFiles(response.data || []);
        } catch (err) {
            console.error("Error fetching related files:", err);
            setFileError("Failed to load related files. Please try again.");
            setRelatedFiles([]);
        } finally {
            setIsFetchingFiles(false);
        }
    };

    const openFileModal = () => {
        setIsFileModalOpen(true);
        fetchRelatedFiles();
    };

    const closeFileModal = () => {
        setIsFileModalOpen(false);
    };

    // --- Initial Data Fetching Effect --- (Logic การ fetch เหมือนเดิม)
    useEffect(() => {
        const fetchDesign = async () => {
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
                        design_status: design.design_status || "WORKING", // ควรใช้ status ล่าสุดที่ได้มา
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
        const fetchRequirements = async () => {
             try {
                const response = await axios.get(`http://localhost:3001/project/${projectId}/requirement`, {
                    params: { status: "BASELINE" }, // ดึงเฉพาะ Baseline requirements
                });
                 const requirementsWithNumericIds = (response.data || []).map(req => ({
                     ...req,
                     requirement_id: Number(req.requirement_id) // แปลง ID เป็นตัวเลข
                 }));
                setBaselineRequirements(requirementsWithNumericIds);
            } catch (err) {
                console.error("Error fetching requirements:", err);
                setBaselineRequirements([]); // Set เป็น array ว่างถ้า error
            }
        };
        const fetchHistory = async () => {
            try {
                // *** API Endpoint นี้ต้องคืน veridesign_id หรือ history_id ที่ unique ต่อ event มาด้วย ***
                const response = await axios.get(`http://localhost:3001/getHistoryByDesignId`, {
                    params: { design_id: designId }, // Fetch history เฉพาะของ designId นี้
                });
                // ตรวจสอบให้แน่ใจว่า response.data.data เป็น Array ก่อน set state
                const rawHistory = Array.isArray(response.data?.data) ? response.data.data : [];
                console.log("Raw history data fetched:", rawHistory); // Log ดูข้อมูลดิบ
                setHistoryData(rawHistory);
            } catch (err) {
                console.error("Error fetching history:", err);
                setHistoryData([]); // Set เป็น array ว่างถ้า error
            }
        };

        if (designId && projectId) {
            setLoading(true);
            setError(null);
            Promise.all([fetchDesign(), fetchRequirements(), fetchHistory()])
                .then(() => setLoading(false))
                .catch((err) => {
                    console.error("Error during initial data fetching:", err);
                    setError("Failed to fetch initial page data. Please check the console.");
                    setLoading(false);
                });
        } else {
            setError("Missing required parameters (designId or projectId).");
            setLoading(false);
        }
    }, [designId, projectId]); // Dependencies เหมือนเดิม

    // --- Date/Time Formatting Helper --- (เหมือนเดิม)
    const formatDateTime = (datetime) => {
        if (!datetime) return { date: "N/A", time: "N/A" };
        const dateObj = new Date(datetime);
        if (isNaN(dateObj.getTime())) return { date: "Invalid Date", time: "" };

        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = dateObj.getFullYear();
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0'); // Optional: include seconds

        return { date: `${day}/${month}/${year}`, time: `${hours}:${minutes}:${seconds}` };
    };

    // Processed History Data (ใช้ getUniqueHistory)
    const uniqueHistoryData = getUniqueHistory(historyData); // <<< ใช้ function ที่ปรับปรุงแล้ว
    const verificationHistory = uniqueHistoryData.filter(
        (history) => history.design_status?.toUpperCase() === "VERIFIED"
    );

    // --- Render Logic ---
    if (loading) return <LoadingSpinner />;
    if (error && !designData) return <div className="design-error-message">{error}</div>; // แสดง Error ถ้าโหลดไม่ได้เลย
    if (!designData) return <div className="design-not-found-message">Design details could not be loaded. It might be missing or an error occurred.</div>;

    // --- Render ---
    return (
        <div className="view-design-container">
            <div className="design-view-dashboard">
                {/* --- Header --- (เหมือนเดิม) */}
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

                {/* แสดง Error ด้านบน ถ้ามี แต่ยังพอมี designData ให้แสดง */}
                {error && <div className="design-error-message subtle">{error}</div>}

                {/* --- Content Area --- */}
                <div className="design-content">
                    {/* --- Details Card --- (โครงสร้างเหมือนเดิม) */}
                    <div className="design-details-card">
                        <div className="design-card-header">
                            <h2>{designData.diagram_name || `Design ${designData.design_id}`}</h2>
                            <StatusBadge status={designData.design_status} />
                        </div>

                        <div className="design-info-grid">
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
                                 {/* ใช้ StatusBadge เพื่อความสวยงามและสอดคล้องกัน */}
                                 <div className="design-info-value"><StatusBadge status={designData.design_status} /></div>
                             </div>
                        </div>

                        <div className="design-description-section">
                             <h3>Description</h3>
                              <div className="design-description-content">
                                  {designData.design_description || 'No description provided.'}
                              </div>
                         </div>

                        <div className="design-requirements-section">
                             <h3>Linked Requirements (Baseline)</h3>
                             <div className="design-requirements-list">
                                 {/* ตรวจสอบ baselineRequirements และ designData.requirement_id ให้ดีขึ้น */}
                                 {baselineRequirements.length > 0 && Array.isArray(designData.requirement_id) && designData.requirement_id.length > 0 ? (
                                     <ul>
                                         {baselineRequirements
                                             .filter((req) => designData.requirement_id.includes(req.requirement_id))
                                             .map((req) => (
                                                 <li key={req.requirement_id}>{`REQ-${String(req.requirement_id).padStart(3, '0')}: ${req.requirement_name}`}</li>
                                             ))}
                                         {/* แสดงข้อความถ้า filter แล้วไม่เจอ Requirement ที่ตรงกัน */}
                                         {baselineRequirements.filter((req) => designData.requirement_id.includes(req.requirement_id)).length === 0 &&
                                              <li>No matching baseline requirements found for this design.</li>
                                          }
                                     </ul>
                                 ) : (
                                      <p>No linked requirements found or baseline data unavailable.</p>
                                  )}
                              </div>
                          </div>

                        {/* --- Related Files Section --- (ปุ่มเปิด Modal เหมือนเดิม) */}
                        <div className="design-related-files-section">
                             <div className="design-section-header-action">
                                  <h3>Related Files</h3>
                                  <button
                                      className="icon-button view-files-button"
                                      onClick={openFileModal}
                                      title="View Related Files"
                                  >
                                      <EyeIcon />
                                  </button>
                              </div>
                              {/* เนื้อหาแสดงใน Modal */}
                          </div>
                    </div> {/* End Details Card */}

                    {/* --- History Card --- */}
                    <div className="design-history-card">
                        {/* ... History Card Header & Tabs (เหมือนเดิม) ... */}
                         <div className="design-card-header">
                              <div className="design-history-title">
                                  <HistoryIcon />
                                  <h1 className="history-design-topic">History: {designData.diagram_name || `Design ${designData.design_id}`}</h1>
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
                            {/* Full History Tab (เหมือนเดิม) */}
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
                                                    // *** ใช้ Key ที่ Unique จริงๆ ***
                                                    const historyKey = history.veridesign_id ?? history.history_id ?? `${history.design_status}-${history.design_at}-${Math.random()}`;
                                                    return (
                                                        <tr key={historyKey}>
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

                            {/* Verification History Tab (ปุ่ม View Details เรียก openVerificationModal) */}
                            {activeTab === 'verified' && (
                                <div className="design-history-table-container">
                                    {verificationHistory.length > 0 ? (
                                        <table className="history-table-design verification-history-table">
                                             <thead>
                                                <tr>
                                                    <th><StatusIcon /> Status</th>
                                                    <th><CalendarIcon /> Date</th>
                                                    <th><TimeIcon /> Time</th>
                                                    <th><EyeIcon /> Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {verificationHistory.map((history) => {
                                                    const { date, time } = formatDateTime(history.design_at);
                                                     // *** ใช้ Key ที่ Unique จริงๆ ***
                                                    const historyKey = history.veridesign_id ?? history.history_id ?? `${history.design_status}-${history.design_at}-${Math.random()}`;
                                                    return (
                                                        <tr key={historyKey}>
                                                            <td><StatusBadge status={history.design_status} /></td>
                                                            <td>{date}</td>
                                                            <td>{time}</td>
                                                            <td>
                                                                {/* ปุ่มนี้จะเรียก Function `openVerificationModal` และส่ง history object ทั้งหมดไปด้วย */}
                                                                <button
                                                                    className="view-details-button"
                                                                    onClick={() => openVerificationModal(history)} // ส่ง history item ไปทั้ง object
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

                {/* --- Diagram Container --- (เหมือนเดิม) */}
                <div className="design-diagram-container">
                    <ViewDiagram designId={designId} />
                </div>

            </div> {/* End Dashboard */}

            {/* --- Modal for Verification Details --- */}
            {/* Modal นี้จะ Render ก็ต่อเมื่อ isVerificationModalOpen เป็น true */}
            {/* และจะส่ง Props ที่จำเป็น (projectId, designId, selectedHistoryItem) ไปให้ VericriDesignDetails */}
            <Modal
                isOpen={isVerificationModalOpen}
                onClose={closeVerificationModal}
                title="Verification Details" // หัวข้อ Modal
            >
                {/* Render VericriDesignDetails เฉพาะเมื่อมี selectedHistoryItem */}
                {selectedHistoryItem ? (
                    <VericriDesignDetails
                        projectId={projectId}             // ส่ง projectId จาก ViewDesign
                        designId={designId}               // ส่ง designId หลักของหน้านี้
                        historyItem={selectedHistoryItem} // *** ส่ง history record ที่เฉพาะเจาะจง ***
                        onClose={closeVerificationModal}  // Optional: ส่ง handler ปิด Modal ไปด้วย
                    />
                ) : (
                    // แสดง Loading หรือข้อความ กรณีที่ selectedHistoryItem ยังไม่มีค่า (ซึ่งไม่ควรเกิดนาน)
                    <p>Loading details...</p>
                 )}
            </Modal>

            {/* --- Modal for Related Files (เหมือนเดิม) --- */}
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
                                  <li key={file.id || file.name}>
                                      <FileIcon />
                                      {/* ตรวจสอบว่า file.url ถูกต้อง */}
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