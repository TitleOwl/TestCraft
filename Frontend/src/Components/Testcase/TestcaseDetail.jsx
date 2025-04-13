import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import TestProcedures from "./TestProcedures";
// Import CSS ใหม่
import "./testcase_css/TestcaseDetail.css"; // <--- ใช้ CSS ไฟล์นี้

// --- Icon Imports/Definitions ---
// (เหมือนเดิม)
const BackIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="19" y1="12" x2="5" y2="12"></line> <polyline points="12 19 5 12 12 5"></polyline> </svg>);
const HistoryIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M12 8v4l3 3"></path> <circle cx="12" cy="12" r="10"></circle> </svg>);
const IdIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect> <line x1="16" y1="2" x2="16" y2="6"></line> <line x1="8" y1="2" x2="8" y2="6"></line> <line x1="7" y1="12" x2="17" y2="12"></line> </svg>);
const TypeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <polyline points="4 7 4 4 20 4 20 7"></polyline> <line x1="9" y1="20" x2="15" y2="20"></line> <line x1="12" y1="4" x2="12" y2="20"></line> </svg>);
const StatusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <circle cx="12" cy="12" r="10"></circle> <path d="M8 14s1.5 2 4 2 4-2 4-2"></path> <line x1="9" y1="9" x2="9.01" y2="9"></line> <line x1="15" y1="9" x2="15.01" y2="9"></line> </svg>);
const CalendarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect> <line x1="16" y1="2" x2="16" y2="6"></line> <line x1="8" y1="2" x2="8" y2="6"></line> <line x1="3" y1="10" x2="21" y2="10"></line> </svg>);
const TimeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <circle cx="12" cy="12" r="10"></circle> <polyline points="12 6 12 12 16 14"></polyline> </svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);
const PriorityIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>);
const LinkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>);
const CheckCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>);
const UserCheckIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>);
const ListCheckIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>);
const TestcaseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><polyline points="9 15 11 17 15 13"></polyline></svg>);
// --- End Icon Imports ---

// --- Loading Spinner Component ---
const LoadingSpinner = () => (
  <div className="testcase-detail-loading-spinner-container">
    <div className="testcase-detail-loading-spinner"></div>
    <p className="loading-text">Loading...</p>
  </div>
);

// --- Helper Functions (formatStatus, parseJsonSafe) ---
const formatStatus = (status) => {
  if (!status) return 'Unknown';
  // ลบ .toLowerCase() ออก และอาจจะไม่ต้องแปลง Title Case
  // แค่แทนที่ _ ด้วย space และคืนค่าที่เป็น Uppercase เดิม
  return status.replace(/_/g, ' '); // <--- แก้ไขเป็นแบบนี้
};

const parseJsonSafe = (jsonString, defaultValue = []) => {
  if (Array.isArray(jsonString)) return jsonString;
  if (typeof jsonString !== 'string' || !jsonString) return defaultValue;
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    console.error("Error parsing JSON string:", e, "\nString was:", jsonString);
    // ลองแปลงเป็นตัวเลขถ้า parse ไม่ได้
    if (!isNaN(Number(jsonString))) return [Number(jsonString)];
    return defaultValue;
  }
};


// --- Status Badge Component ---
const StatusBadge = ({ status }) => {
  let statusClass = ""; // ตัวแปรเก็บชื่อ class ที่จะใช้

  // ใช้ switch case กับค่า status ที่รับเข้ามาโดยตรง (ซึ่งเป็นตัวพิมพ์ใหญ่)
  switch (status) {
    case "WORKING":
      statusClass = "working"; // กำหนด class สำหรับ WORKING
      break;
    case "VERIFIED":
      statusClass = "verified"; // กำหนด class สำหรับ VERIFIED
      break;
    case "VALIDATED":
      statusClass = "validated"; // กำหนด class สำหรับ VALIDATED
      break;
    case "WAITING FOR VERIFICATION":
      statusClass = "waiting-for-verification"; // กำหนด class สำหรับ WAITING FOR VERIFICATION
      break;
    case "WAITING FOR VALIDATION":
      statusClass = "waiting-for-validation"; // กำหนด class สำหรับ WAITING FOR VALIDATION
      break;
    case "BASELINE":
      statusClass = "baseline"; // กำหนด class สำหรับ BASELINE
      break;
    case "SUBMITTED":
      statusClass = "submitted"; // กำหนด class สำหรับ SUBMITTED
      break;
    case "REJECTED":
      statusClass = "rejected"; // กำหนด class สำหรับ REJECTED
      break;
    default:
      statusClass = "default"; // class เริ่มต้น หรือสำหรับ status ที่ไม่รู้จัก
  }

  // คืนค่า span พร้อม class ที่ถูกต้อง และแสดงข้อความ status ดิบๆ (ตัวพิมพ์ใหญ่)
  // ใช้ base class จากโค้ดบล็อกที่ 2 คือ 'testcase-detail-status-badge'
  return (
    <span className={`testcase-detail-status-badge ${statusClass}`}>
      {/* แสดงค่า status ที่รับเข้ามาโดยตรง หรือ 'N/A' ถ้าไม่มีค่า */}
      {status || 'N/A'}
    </span>
  );
};


// --- Main Component ---
const TestcaseDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const testcase = location.state?.testcase || {};
  const queryParams = new URLSearchParams(location.search);
  let projectId = location.state?.projectId || testcase?.project_id || queryParams.get("project_id") || "";

  // States (เหมือนเดิม)
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loadingVerification, setLoadingVerification] = useState(false);
  const [errorVerification, setErrorVerification] = useState(null);
  const [loadingComponent, setLoadingComponent] = useState(true);
  const [errorComponent, setErrorComponent] = useState(null);
  const [testcaseData, setTestcaseData] = useState(location.state?.testcase || {}); // ใช้ testcase จาก state ดีกว่า
  const [activeTab, setActiveTab] = useState('history');

  // Combined Fetch Effect (เหมือนเดิม)
  useEffect(() => {
    const currentTestcaseId = testcaseData?.testcase_id; // <<< อ้างอิงจาก testcaseData state
    if (!currentTestcaseId) {
      // หากไม่มี testcase_id ใน state ลองหาจาก location.state อีกครั้ง (เผื่อโหลดครั้งแรก)
      const initialTestcaseId = location.state?.testcase?.testcase_id;
      if (!initialTestcaseId) {
        setErrorComponent("Test Case ID not found.");
        setLoadingComponent(false);
        return;
      }
      // ถ้าเจอใน location.state ให้ใช้ ID นั้น (แต่อาจจะไม่ต้อง fetch ใหม่ถ้าข้อมูลครบแล้ว)
      // หรืออาจจะตั้งค่า testcaseData state ตรงนี้เลยถ้ายังไม่ได้ตั้ง
      // setTestcaseData(location.state.testcase); // ถ้าจำเป็น
    }

    const fetchData = async () => {
      setLoadingComponent(true); setErrorComponent(null);
      setLoadingHistory(true); setErrorHistory(null);
      setLoadingVerification(true); setErrorVerification(null);
      const idToFetch = testcaseData?.testcase_id || location.state?.testcase?.testcase_id; // ใช้ ID ล่าสุด

      if (!idToFetch) {
        setErrorComponent("Test Case ID is missing for fetching data.");
        setLoadingComponent(false);
        return;
      }

      try {
        const [historyRes, verificationRes] = await Promise.all([
          axios.get('http://localhost:3001/getHistoryByTestcaseId', { params: { testcase_id: idToFetch } })
            .catch(err => { console.error("❌ Error fetching history:", err); setErrorHistory("Failed to load history."); return { data: { data: [] } }; }),
          axios.get('http://localhost:3001/get-testcase-verification-result', { params: { testcase_id: idToFetch } })
            .catch(err => { console.error("❌ Error fetching verification result:", err); setErrorVerification("Failed to load verification result."); return { data: { data: null } }; })
        ]);
        setHistory(historyRes.data?.data || []);
        setVerificationResult(verificationRes.data?.data || null);

        // Optional: อัปเดต testcaseData state หากต้องการข้อมูลล่าสุดเสมอ
        // const testcaseRes = await axios.get('API_TO_GET_TESTCASE_BY_ID', { params: { testcase_id: idToFetch } });
        // setTestcaseData(testcaseRes.data?.data || {});

      } catch (err) { console.error("❌ Error fetching test case details:", err); setErrorComponent("Failed to load test case data."); }
      finally { setLoadingHistory(false); setLoadingVerification(false); setLoadingComponent(false); }
    };
    fetchData();
  }, [testcaseData?.testcase_id, location.state?.testcase?.testcase_id]); // Dependency ควรจะ stable

  // Format Date/Time Function (เหมือนเดิม)
  const formatDateTime = (datetime) => {
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

  // Processed History Data (เหมือนเดิม)
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(a.testcase_at) - new Date(b.testcase_at));
  }, [history]);

  const sortedImplementData = useMemo(() => {
    const data = parseJsonSafe(testcaseData.implement_id || "[]", []);
    return data.sort((a, b) => {
      const idA = Number(a.id);
      const idB = Number(b.id);
      if (isNaN(idA) || isNaN(idB)) return 0;
      return idA - idB;
    });
  }, [testcaseData.implement_id]);

  // Loading / Error / No Data States (เหมือนเดิม)
  if (loadingComponent) return <LoadingSpinner />;
  if (errorComponent) return <div className="testcase-detail-error-message">{errorComponent}</div>;
  // ใช้ testcaseData state ในการเช็คข้อมูลหลัก
  if (!testcaseData || !testcaseData.testcase_id) return <div className="testcase-detail-not-found-message">Test Case data is unavailable.</div>;

  // --- ลบ statusClassMap และการคำนวณ statusClassName ตรงนี้ ---
  // const statusClassMap = { ... }; // <--- ลบออก
  // const statusClassName = statusClassMap[testcaseData?.testcase_status] || ''; // <--- ลบออก

  return (
    <div className="testcase-detail-dashboard">

      {/* Header (เหมือนเดิม) */}
      <div className="testcase-detail-header">
        <div className="testcase-detail-header-left">
          <button className="testcase-detail-back-button" onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } })}>
            <BackIcon />
            <span>Back</span>
          </button>
        </div>
        <div className="testcase-detail-header-title">
          <TestcaseIcon />
          <h1 className="testcase-detail-title">Test Case Details</h1>
          <div className="testcase-detail-id-badge">
            TC-{String(testcaseData.testcase_id).padStart(3, '0')}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="testcase-detail-content">

        {/* Details Card (Left Column) */}
        <div className="testcase-detail-card">
          {/* --- ใช้ Component StatusBadge --- */}
          <div className="testcase-detail-card-header"> {/* ใช้ className เดิม หรือจะเติม -testcasedetail ก็ได้ */}
            <h2>{testcaseData.testcase_name || "Untitled Test Case"}</h2>
            {/* ใช้ StatusBadge component แทน span เดิม */}
            <StatusBadge status={testcaseData.testcase_status} />
          </div>
          {/* --- สิ้นสุดการใช้ StatusBadge --- */}

          <div className="testcase-detail-info-grid">
            {/* Info Items */}
            <div className="testcase-detail-info-item">
              <div className="testcase-detail-info-label"> <IdIcon /> <span>Test Case ID</span> </div>
              <div className="testcase-detail-info-value">TC-{String(testcaseData.testcase_id).padStart(3, '0')}</div>
            </div>
            <div className="testcase-detail-info-item">
              <div className="testcase-detail-info-label"> <TypeIcon /> <span>Test Type</span> </div>
              <div className="testcase-detail-info-value">{testcaseData.testcase_type || 'N/A'}</div>
            </div>
            <div className="testcase-detail-info-item">
              <div className="testcase-detail-info-label"> <PriorityIcon /> <span>Priority</span> </div>
              <div className="testcase-detail-info-value">{testcaseData.testcase_priority || 'N/A'}</div>
            </div>
            <div className="testcase-detail-info-item">
              <div className="testcase-detail-info-label"> <UserIcon /> <span>Created By</span> </div>
              <div className="testcase-detail-info-value">{testcaseData.testcase_by || 'Unknown'}</div>
            </div>
            <div className="testcase-detail-info-item">
              <div className="testcase-detail-info-label"> <CalendarIcon /> <span>Created Date</span> </div>
              <div className="testcase-detail-info-value">{formatDateTime(testcaseData.testcase_at).date}</div>
            </div>
            <div className="testcase-detail-info-item">
              <div className="testcase-detail-info-label"> <StatusIcon /> <span>Current Status</span> </div>
              {/* แสดง Status แบบข้อความธรรมดาใน info grid */}
              <div className="testcase-detail-info-value">{formatStatus(testcaseData.testcase_status)}</div>
            </div>
          </div>
          <div className="testcase-detail-description-section">
            <h3>Description</h3>
            <div className="testcase-detail-description-content">
              {testcaseData.testcase_des || 'No description provided.'}
            </div>
          </div>
          <div className="testcase-detail-linked-ids-section">
            <h3><LinkIcon /> Linked Implement Files</h3>
            <div className="testcase-detail-linked-ids-list">
              {sortedImplementData.length > 0 ? (
                <ul>
                  {sortedImplementData.map(item => (
                    <li key={item.id}>
                      <span className="implement-id-tag">IMP-{String(item.id).padStart(3, '0')}</span>
                      <span className="implement-separator"> : </span>
                      <span className="implement-filename">📄{item.filename}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>None</p>
              )}
            </div>
          </div>
          <div className="testcase-detail-procedures-section">
            <div className="test-procedures-wrapper">
              <TestProcedures testcaseId={testcaseData.testcase_id} />
            </div>
          </div>
        </div> {/* End Details Card */}

        {/* History Card (Right Column) */}
        <div className="testcase-history-card">
          <div className="testcase-detail-card-header">
            <div className="testcase-detail-history-title">
              <HistoryIcon />
              <h1 className="testcase-detail-history-topic">
                History
              </h1>
            </div>
          </div>

          {/* History Tabs */}
          <div className="testcase-detail-history-tabs">
            <button
              className={`testcase-detail-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <HistoryIcon />
              Status Change Log ({sortedHistory.length})
            </button>
            <button
              className={`testcase-detail-tab ${activeTab === 'verification' ? 'active' : ''}`}
              onClick={() => setActiveTab('verification')}
            >
              <CheckCircleIcon />
              Verification
            </button>
          </div>

          {/* Tab Content */}
          <div className="testcase-detail-history-tab-content">
            {/* History Tab Content */}
            {activeTab === 'history' && (
              <div className="testcase-detail-history-table-container">
                {loadingHistory && <p>Loading history...</p>}
                {errorHistory && <p className="testcase-detail-error-message">{errorHistory}</p>}
                {!loadingHistory && !errorHistory && sortedHistory.length > 0 ? (
                  <table className="testcase-detail-history-table">
                    <thead>
                      <tr>
                        <th><StatusIcon /> Status</th>
                        <th><CalendarIcon /> Date</th>
                        <th><TimeIcon /> Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHistory.map((item) => {
                        const { date, time } = formatDateTime(item.testcase_at);
                        // *** ไม่ต้องคำนวณ statusClassName ตรงนี้แล้ว ***
                        return (
                          <tr key={item.historytestcase_id}>
                            <td>
                              {/* --- ใช้ Component StatusBadge --- */}
                              <StatusBadge status={item.testcase_status} />
                            </td>
                            <td>{date}</td>
                            <td>{time}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  !loadingHistory && !errorHistory && <p>No history recorded.</p>
                )}
              </div>
            )}

            {/* Verification Tab Content */}
            {activeTab === 'verification' && (
              <div className="testcase-detail-verification-tab-container">
                <div className="testcase-detail-verification-content">
                  {loadingVerification && <p>Loading verification data...</p>}
                  {errorVerification && <p className="testcase-detail-error-message">{errorVerification}</p>}
                  {!loadingVerification && !errorVerification && (
                    verificationResult ? (
                      <div className="testcase-detail-verification-details">
                        <p><strong>Verified At:</strong> {formatDateTime(verificationResult.verify_at).date} {formatDateTime(verificationResult.verify_at).time}</p>
                        <div className="testcase-detail-verification-sub-item">
                          <strong><UserCheckIcon /> Verified By:</strong>
                          <ul className="testcase-detail-reviewer-list">
                            {parseJsonSafe(verificationResult.verify_by, []).map((reviewer, index) => (<li key={index}>{reviewer}</li>))}
                            {parseJsonSafe(verificationResult.verify_by, []).length === 0 && <li>N/A</li>}
                          </ul>
                        </div>
                        <div className="testcase-detail-verification-sub-item">
                          <strong><ListCheckIcon /> Checklist Used:</strong>
                          <ul className="testcase-detail-checklist-list">
                            {parseJsonSafe(verificationResult.verification_checklist, []).map((item, index) => (<li key={index}>{item}</li>))}
                            {parseJsonSafe(verificationResult.verification_checklist, []).length === 0 && <li>N/A</li>}
                          </ul>
                        </div>
                      </div>
                    ) : (<p>No verification information found.</p>)
                  )}
                </div>
              </div>
            )}
          </div> {/* End Tab Content */}
        </div> {/* End History Card */}

      </div> {/* End Content Area */}

    </div > // End Main Container: testcase-detail-dashboard
  );
};

export default TestcaseDetail;