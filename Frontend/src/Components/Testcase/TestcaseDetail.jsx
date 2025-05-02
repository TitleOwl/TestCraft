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

// ปรับปรุง parseJsonSafe ให้รองรับ input หลายแบบและคืนค่า Default ที่ถูกต้อง
const parseJsonSafe = (jsonString, defaultValue = []) => {
  if (Array.isArray(jsonString)) { // ถ้า Input เป็น Array อยู่แล้ว
    // ตรวจสอบ element แรกเพื่อเดาชนิดข้อมูล (ถ้ามี)
    if (jsonString.length === 0) return [];
    if (typeof jsonString[0] === 'object' && jsonString[0] !== null) return jsonString;
    if (typeof jsonString[0] === 'number') return jsonString;
    if (typeof jsonString[0] === 'string') return jsonString; // รองรับ Array of string ด้วย
    console.warn("parseJsonSafe received an array with unexpected element type:", jsonString[0]);
    return defaultValue; // คืนค่า Default ถ้าชนิดข้อมูลใน Array ไม่รู้จัก
  }
  if (typeof jsonString !== 'string' || !jsonString) { // ถ้าไม่ใช่ String หรือเป็น String ว่าง
    return defaultValue;
  }
  try {
    const parsed = JSON.parse(jsonString);
    // คืนค่า parsed ถ้าเป็น Array, มิฉะนั้นคืนค่า Default
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    console.error("Error parsing JSON string:", e, "\nString was:", jsonString);
    return defaultValue; // คืนค่า Default ถ้า Parse ไม่สำเร็จ
  }
};


// --- Status Badge Component (วางนอก Component หลักได้) ---
const StatusBadge = ({ status }) => {
  let statusClass = "";
  switch (status) {
    case "WORKING": statusClass = "working"; break;
    case "VERIFIED": statusClass = "verified"; break;
    case "VALIDATED": statusClass = "validated"; break;
    case "WAITING FOR VERIFICATION": statusClass = "waiting-for-verification"; break;
    case "WAITING FOR VALIDATION": statusClass = "waiting-for-validation"; break;
    case "BASELINE": statusClass = "baseline"; break;
    case "SUBMITTED": statusClass = "submitted"; break;
    case "REJECTED": statusClass = "rejected"; break;
    default: statusClass = "default";
  }
  return (
    <span className={`testcase-detail-status-badge ${statusClass}`}>
      {status || 'N/A'}
    </span>
  );
};


// --- Main Component ---
const TestcaseDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // --- ⬇️ State ทั้งหมดอยู่ข้างใน Component ---
  const [testcaseData, setTestcaseData] = useState(() => location.state?.testcase || {});
  const [history, setHistory] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);
  const [allImplementFiles, setAllImplementFiles] = useState([]);

  // Loading States
  const [loadingComponent, setLoadingComponent] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingVerification, setLoadingVerification] = useState(true);

  // Error States
  const [errorComponent, setErrorComponent] = useState(null);
  const [errorHistory, setErrorHistory] = useState(null);
  const [errorVerification, setErrorVerification] = useState(null);

  // UI State
  const [activeTab, setActiveTab] = useState('history');
  // --- ⬆️ สิ้นสุดการประกาศ State ---

  // --- หา Test Case ID และ Project ID จาก URL/State ---
  const { testcaseId, projectId } = useMemo(() => {
    const queryParams = new URLSearchParams(location.search);
    // หา testcaseId จาก query ก่อน ถ้าไม่มีค่อยเอาจาก state
    const tcId = queryParams.get("testcase_id") || location.state?.testcase?.testcase_id;
    // หา projectId จาก state ก่อน ถ้าไม่มีค่อยหาจาก query หรือจาก testcaseData ที่อาจจะโหลดมาแล้ว
    const projId = location.state?.projectId || queryParams.get("project_id") || testcaseData?.project_id;
    // console.log("Calculated IDs - TC:", tcId, "Proj:", projId); // Optional Debug
    return { testcaseId: tcId, projectId: projId };
  }, [location.search, location.state, testcaseData?.project_id]); // ใช้ testcaseData?.project_id ด้วยเผื่อมีการอัปเดตจาก Fetch

  const formatSwComponent = (id) => `SC-${String(id).padStart(3, '0')}`;

  // --- Effect สำหรับ Fetch ข้อมูลทั้งหมด ---
  useEffect(() => {
    // ต้องมีทั้ง Test Case ID และ Project ID ก่อนเริ่ม Fetch
    if (!testcaseId || !projectId) {
      const missing = [];
      if (!testcaseId) missing.push("Test Case ID");
      if (!projectId) missing.push("Project ID");
      setErrorComponent(`${missing.join(' and ')} is missing in URL or state.`);
      setLoadingComponent(false);
      setLoadingHistory(false);
      setLoadingVerification(false);
      // ไม่ต้อง set loading implement files ที่นี่
      return;
    }

    let isMounted = true; // ติดตาม Component Mount status

    const fetchData = async () => {
      // ตั้งค่า Loading states ทั้งหมดเป็น true
      setLoadingComponent(true); setErrorComponent(null);
      setLoadingHistory(true); setErrorHistory(null);
      setLoadingVerification(true); setErrorVerification(null);
      setAllImplementFiles([]); // เคลียร์ข้อมูล implement เก่า

      console.log(`Workspaceing all data for TC ID: ${testcaseId}, Project ID: ${projectId}`);

      try {
        // ดึงข้อมูล 4 อย่างพร้อมกัน
        const [mainDataRes, historyRes, verificationRes, implementRes] = await Promise.all([
          axios.get(`http://localhost:3001/testcaseedit/${testcaseId}`)
            .catch(err => { console.error("❌ Error fetching main test case data:", err); throw new Error("Failed to load main test case data."); }), // ถ้าหลักไม่ได้ ให้โยน Error
          axios.get('http://localhost:3001/getHistoryByTestcaseId', { params: { testcase_id: testcaseId } })
            .catch(err => { console.error("❌ Error fetching history:", err); if (isMounted) setErrorHistory("Failed to load history."); return { data: { data: [] } }; }), // จัดการ Error แยกส่วน
          axios.get('http://localhost:3001/get-testcase-verification-result', { params: { testcase_id: testcaseId } })
            .catch(err => { console.error("❌ Error fetching verification result:", err); if (isMounted) setErrorVerification("Failed to load verification result."); return { data: { data: null } }; }), // จัดการ Error แยกส่วน
          axios.get('http://localhost:3001/implementrelation', { params: { project_id: projectId } })
            .catch(err => { console.error("❌ Error fetching all implement files:", err); /* อาจแสดง Error รวม */ return { data: { data: [] } }; }) // จัดการ Error แยกส่วน
        ]);

        if (isMounted) {
          // 1. อัปเดตข้อมูล Test Case หลัก
          if (mainDataRes.data) {
            console.log("Fetched main data:", mainDataRes.data);
            setTestcaseData(mainDataRes.data);
          } else {
            throw new Error("Main test case data received is empty or invalid.");
          }

          // 2. อัปเดต History
          console.log("Fetched history:", historyRes.data?.data);
          setHistory(historyRes.data?.data || []);
          setLoadingHistory(false); // ปิด Loading History

          // 3. อัปเดต Verification
          console.log("Fetched verification:", verificationRes.data?.data);
          setVerificationResult(verificationRes.data?.data || null);
          setLoadingVerification(false); // ปิด Loading Verification

          // 4. อัปเดต Implement Files
          console.log("Fetched implements:", implementRes.data?.data);
          setAllImplementFiles(implementRes.data?.data || []);
          // ไม่ต้องมี loadingAllImplementFiles แล้ว ใช้ loadingComponent แทน

        }

      } catch (err) {
        console.error("❌ Error during data fetching:", err);
        if (isMounted) {
          setErrorComponent(err.message || "Failed to load test case details.");
          // ปิด Loading states อื่นๆ ด้วยหากเกิด Error ที่ fetch หลัก
          setLoadingHistory(false);
          setLoadingVerification(false);
        }
      } finally {
        // ปิด Loading หลักเมื่อทุกอย่างเสร็จสิ้น (ไม่ว่าจะ success หรือ error ที่ Promise.all)
        if (isMounted) {
          setLoadingComponent(false);
        }
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
    // Dependency คือ testcaseId และ projectId ที่คำนวณจาก useMemo ซึ่งจะเปลี่ยนเมื่อ URL หรือ state เปลี่ยน
  }, [testcaseId, projectId]);


  // Format Date/Time Function
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

  // Processed History Data
  const sortedHistory = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return [...history].sort((a, b) => new Date(a.testcase_at) - new Date(b.testcase_at));
  }, [history]);

  // Memoized Value for Linked Implement Details
  const linkedImplementDetails = useMemo(() => {
    // parseJsonSafe จะคืน Array เสมอ
    const linkedData = parseJsonSafe(testcaseData.implement_id || "[]", []);

    // ถ้ายังโหลดข้อมูลหลักไม่เสร็จ หรือไม่มีข้อมูล Implement ทั้งหมดเลย ให้คืนค่าตามสถานะ
    if (loadingComponent && allImplementFiles.length === 0) {
      if (Array.isArray(linkedData) && linkedData.length > 0 && typeof linkedData[0] === 'number') {
        // ถ้ามี ID แต่ยังไม่มี filename ให้แสดงชั่วคราว
        return linkedData.map(id => ({ id: id, filename: '(Loading...)' })).sort((a, b) => a.id - b.id);
      }
      return []; // ถ้าไม่มีข้อมูล ID เลย หรือ implement_id ไม่ใช่ array ตัวเลข
    }

    // ถ้าโหลดเสร็จแล้ว แต่ไม่มีข้อมูล Implement ทั้งหมด (API คืนค่าว่าง)
    if (!loadingComponent && allImplementFiles.length === 0) {
      if (Array.isArray(linkedData) && linkedData.length > 0 && typeof linkedData[0] === 'number') {
        // ถ้ามี ID แต่หา filename ไม่เจอ
        return linkedData.map(id => ({ id: id, filename: '(Not Found)' })).sort((a, b) => a.id - b.id);
      }
      return []; // ถ้าไม่มีข้อมูล ID เลย
    }

    // --- กรณีมี allImplementFiles แล้ว ---
    const details = linkedData.map(itemOrId => {
      const idToFind = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId.id : itemOrId;
      // ตรวจสอบ ID ให้เข้มงวดขึ้น
      if (typeof idToFind !== 'number' || isNaN(idToFind) || idToFind <= 0) {
        console.warn("Invalid or non-positive ID found in linked data:", itemOrId);
        return null;
      }
      const foundFile = allImplementFiles.find(file => file.implement_id === idToFind);
      if (foundFile) {
        return { id: foundFile.implement_id, filename: foundFile.implement_filename || '(No Filename)' }; // ให้มี default filename
      } else {
        // แสดงว่า ID ที่ Link ไว้ ไม่มีอยู่ในรายการ Implement ของ Project นี้
        return { id: idToFind, filename: `(File not found for ID: ${idToFind})` };
      }
    }).filter(Boolean); // กรอง null ที่เกิดจาก ID ไม่ถูกต้อง

    details.sort((a, b) => a.id - b.id);
    return details;
    // Dependency คือ implement_id จาก testcaseData และ รายการ implement files ทั้งหมด
  }, [testcaseData.implement_id, allImplementFiles, loadingComponent]); // เพิ่ม loadingComponent


  // --- Loading / Error / No Data States ---
  // ถ้ายังโหลด Component หลักอยู่ ให้แสดง Loading Spinner
  if (loadingComponent) {
    return <LoadingSpinner />;
  }
  // ถ้ามี Error หลัก ให้แสดง Error
  if (errorComponent) {
    return <div className="testcase-detail-error-message">{errorComponent}</div>;
  }
  // ถ้าโหลดเสร็จแล้ว แต่ไม่มีข้อมูล Test Case (เช่น ID ผิด)
  if (!testcaseData || !testcaseData.testcase_id) {
    return <div className="testcase-detail-not-found-message">Test Case data could not be loaded or is invalid.</div>;
  }


  // --- Render ส่วนที่เหลือ ---
  return (
    <div className="testcase-detail-dashboard">

      {/* Header */}
      <div className="testcase-detail-header">
        <div className="testcase-detail-header-left">
          <button
            className="testcase-detail-back-button"
            onClick={() => {
              const targetProjectId = projectId || testcaseData.project_id; // ใช้ ID ที่แน่นอนที่สุด
              if (window.history.length > 2) { navigate(-1); }
              else { navigate(`/Dashboard?project_id=${targetProjectId}`, { state: { selectedSection: "Testcase" } }); }
            }} >
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
          <div className="testcase-detail-card-header">
            <h2>{testcaseData.testcase_name || "Untitled Test Case"}</h2>
            <StatusBadge status={testcaseData.testcase_status} />
          </div>
          <div className="testcase-detail-info-grid">
            {/* แสดง Info Items โดยใช้ testcaseData */}
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
              <div className="testcase-detail-info-label"> <CalendarIcon /> <span>Test Case Creation Date</span> </div>
              <div className="testcase-detail-info-value">{formatDateTime(testcaseData.create_at).date}</div>
            </div>
            <div className="testcase-detail-info-item">
              <div className="testcase-detail-info-label"> <StatusIcon /> <span>Current Status</span> </div>
              <div className="testcase-detail-info-value">{formatStatus(testcaseData.testcase_status)}</div>
            </div>
          </div>
          <div className="testcase-detail-description-section">
            <h3>Description</h3>
            <div className="testcase-detail-description-content">
              {testcaseData.testcase_des || 'No description provided.'}
            </div>
          </div>

          {/* Linked Code Component Files Section */}
          <div className="testcase-detail-linked-ids-section">
            <h3><LinkIcon /> Linked Code Component Files</h3>
            <div className="testcase-detail-linked-ids-list">
              {/* ใช้ loadingComponent เพราะข้อมูล Implement มาพร้อมข้อมูลหลัก */}
              {loadingComponent ? (
                <p>Loading linked files...</p>
              ) : linkedImplementDetails.length > 0 ? (
                linkedImplementDetails.map((file) => (
                  <div key={file.id} className="testcase-detail-implement-item">
                    <span className="file-id">{formatSwComponent(file.id)}</span> -{" "}
                    <span className="file-name">📄 {file.filename}</span>
                  </div>
                ))
              ) : (
                <div>No linked files found.</div>
              )}
            </div>
          </div>

          {/* Test Procedures Section */}
          <div className="testcase-detail-procedures-section">
            <div className="test-procedures-wrapper">
              {/* ตรวจสอบว่ามี testcase_id ก่อนส่งต่อ */}
              {testcaseData.testcase_id && <TestProcedures testcaseId={testcaseData.testcase_id} />}
            </div>
          </div>
        </div> {/* End Details Card */}

        {/* History Card (Right Column) */}
        <div className="testcase-history-card">
          <div className="testcase-detail-card-header">
            <div className="testcase-detail-history-title">
              <HistoryIcon />
              <h1 className="testcase-detail-history-topic"> History </h1>
            </div>
          </div>
          <div className="testcase-detail-history-tabs">
            <button className={`testcase-detail-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')} > <HistoryIcon /> Status Change Log ({/* ป้องกัน Error ถ้า sortedHistory ไม่ใช่ Array */ Array.isArray(sortedHistory) ? sortedHistory.length : 0}) </button>
            <button className={`testcase-detail-tab ${activeTab === 'verification' ? 'active' : ''}`} onClick={() => setActiveTab('verification')} > <CheckCircleIcon /> Verification </button>
          </div>
          <div className="testcase-detail-history-tab-content">
            {/* History Tab Content */}
            {activeTab === 'history' && (
              <div className="testcase-detail-history-table-container">
                {loadingHistory && <p>Loading history...</p>}
                {errorHistory && <p className="testcase-detail-error-message">{errorHistory}</p>}
                {!loadingHistory && !errorHistory && sortedHistory.length > 0 ? (
                  <table className="testcase-detail-history-table">
                    <thead><tr><th><StatusIcon /> Status</th><th><CalendarIcon /> Date</th><th><TimeIcon /> Time</th></tr></thead>
                    <tbody>
                      {sortedHistory.map((item) => {
                        // เพิ่มการตรวจสอบ item ก่อนใช้งาน
                        if (!item || !item.historytestcase_id) return null;
                        const { date, time } = formatDateTime(item.testcase_at);
                        return (<tr key={item.historytestcase_id}><td><StatusBadge status={item.testcase_status} /></td><td>{date}</td><td>{time}</td></tr>);
                      })}
                    </tbody>
                  </table>
                ) : (!loadingHistory && !errorHistory && <p>No history recorded.</p>)}
              </div>
            )}
            {/* Verification Tab Content (คงไว้ตามโค้ดเดิมที่คุณให้มา) */}
            {activeTab === 'verification' && (
              <div className="testcase-detail-verification-tab-container">
                <div className="testcase-detail-verification-content">
                  {loadingVerification && <p>Loading verification data...</p>}
                  {errorVerification && <p className="testcase-detail-error-message">{errorVerification}</p>}
                  {!loadingVerification && !errorVerification && (verificationResult ? (
                    <div className="testcase-detail-verification-details">
                      <p><strong>Verified At:</strong> {formatDateTime(verificationResult.verify_at).date} {formatDateTime(verificationResult.verify_at).time}</p>
                      <div className="testcase-detail-verification-sub-item"><strong><UserCheckIcon /> Verified By:</strong><ul className="testcase-detail-reviewer-list">{parseJsonSafe(verificationResult.verify_by, []).map((reviewer, index) => (<li key={index}>{reviewer}</li>))}{parseJsonSafe(verificationResult.verify_by, []).length === 0 && <li>N/A</li>}</ul></div>
                      <div className="testcase-detail-verification-sub-item"><strong><ListCheckIcon /> Checklist Used:</strong><ul className="testcase-detail-checklist-list">{parseJsonSafe(verificationResult.verification_checklist, []).map((item, index) => (<li key={index}>{item}</li>))}{parseJsonSafe(verificationResult.verification_checklist, []).length === 0 && <li>N/A</li>}</ul></div>
                    </div>
                  ) : (<p>No verification information found.</p>)
                  )}
                </div>
              </div>
            )}
          </div> {/* End Tab Content */}
        </div> {/* End History Card */}

      </div> {/* End Content Area */}

    </div > // End Main Container
  );
};

export default TestcaseDetail;