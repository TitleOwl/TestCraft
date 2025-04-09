import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faFileAlt,
  faPaperclip,
  faHistory,
  faCheckCircle,
  faUserCheck,
  faListCheck
} from "@fortawesome/free-solid-svg-icons";
import TestProcedures from "./TestProcedures";
import "./testcase_css/TestcaseDetail.css";

const TestcaseDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const testcase = location.state?.testcase || {};
  const queryParams = new URLSearchParams(location.search);
  let projectId = location.state?.projectId || testcase?.project_id || queryParams.get("project_id") || "";

  // States for History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState(null);

  // States for Verification Result
  const [verificationResult, setVerificationResult] = useState(null);
  const [loadingVerification, setLoadingVerification] = useState(false);
  const [errorVerification, setErrorVerification] = useState(null);

  // Fetch Data Effect
  useEffect(() => {
    const fetchHistory = async (tcId) => {
      if (!tcId) return;
      setLoadingHistory(true); setErrorHistory(null);
      try {
        const response = await axios.get('http://localhost:3001/getHistoryByTestcaseId', { params: { testcase_id: tcId } });
        setHistory(response.data?.data || []);
      } catch (err) { console.error("❌ Error fetching history:", err); setErrorHistory("Failed to load history."); }
      finally { setLoadingHistory(false); }
    };

    const fetchVerificationResult = async (tcId) => {
      if (!tcId) return;
      setLoadingVerification(true); setErrorVerification(null);
      try {
        const response = await axios.get('http://localhost:3001/get-testcase-verification-result', { params: { testcase_id: tcId } });
        setVerificationResult(response.data?.data || null);
      } catch (err) { console.error("❌ Error fetching verification result:", err); setErrorVerification("Failed to load verification result."); }
      finally { setLoadingVerification(false); }
    };

    const currentTestcaseId = testcase?.testcase_id;
    if (currentTestcaseId) {
      fetchHistory(currentTestcaseId);
      fetchVerificationResult(currentTestcaseId);
    } else {
      setHistory([]); setVerificationResult(null);
    }
  }, [testcase?.testcase_id]);

  // Format Date Function
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Format Status Function
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Parse JSON Safely Function
  const parseJsonSafe = (jsonString, defaultValue = []) => {
    // เพิ่มการตรวจสอบเผื่อกรณีที่ได้รับ Array มาโดยตรงจาก state (ถ้ามีการแก้ไขในอนาคต)
    if (Array.isArray(jsonString)) {
      return jsonString;
    }
    if (typeof jsonString !== 'string' || !jsonString) {
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(jsonString);
      // ตรวจสอบว่าเป็น Array จริงๆ หลัง Parse
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch (e) {
      console.error("Error parsing JSON string:", e, "\nString was:", jsonString);
      // ลองจัดการกรณีเป็น String ตัวเลขเดี่ยวๆ ที่ไม่ได้อยู่ใน []
      if (!isNaN(Number(jsonString))) {
        return [Number(jsonString)];
      }
      return defaultValue;
    }
  };

  return (
    <div className="testcase-detail-container">
      {/* Back Button */}
      <button onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } })} className="backreq-button">
        <FontAwesomeIcon icon={faArrowLeft} /> Back
      </button>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="testcase-detail-header"><h2>Test Case Detail</h2></div>

        {/* Test Case Info Section */}
        <div className="testcase-detail-section">
          <p><strong>Test Case:</strong> TC-0{testcase.testcase_id} - {testcase.testcase_name || "Untitled"}</p>
          <div className="testcase-detail-info-grid">
            {[
              { label: "Test Case ID", value: `TC-00${testcase.testcase_id}` },
              { label: "Title", value: testcase.testcase_name || "N/A" },
              { label: "Description", value: testcase.testcase_des || "N/A" },
              { label: "Test Type", value: testcase.testcase_type || "N/A" },
              { label: "Priority", value: testcase.testcase_priority || "N/A" },
              { label: "Created By", value: testcase.testcase_by || "Unknown" },
              { label: "Created Date", value: formatDate(testcase.testcase_at) },
            ].map(({ label, value }) => (
              <div key={label}><strong>{label}:</strong> {value}</div>
            ))}
            {/* Current Status */}
            <div>
              <strong>Current Status:</strong>
              <span className={`testcase-detail-status testcase-detail-status-${testcase.testcase_status?.toLowerCase().replace(/\s/g, "-") || "unknown"}`}>
                {formatStatus(testcase.testcase_status) || "Unknown"}
              </span>
            </div>
            {/* --- *** แก้ไขส่วนแสดง Implement ID ให้เรียงลำดับ *** --- */}
            <div>
              <strong>Linked Implement IDs:</strong>
              {
                (() => { // ใช้ IIFE เพื่อจัดการ logic การ sort
                  // Parse ข้อมูล implement_id (ซึ่งควรจะเป็น JSON string หรือ null)
                  const ids = parseJsonSafe(testcase.implement_id || "[]");

                  // ตรวจสอบว่าเป็น Array และมีข้อมูลหรือไม่
                  if (!Array.isArray(ids) || ids.length === 0) {
                    return ' None'; // เติมวรรคหน้า None เล็กน้อย
                  }

                  // เรียงลำดับ ID (แบบตัวเลข จากน้อยไปมาก)
                  // ต้องแน่ใจว่า ID ใน Array เป็นตัวเลขก่อน sort
                  const sortedIds = ids
                    .map(id => Number(id)) // แปลงทุกตัวเป็น Number
                    .filter(id => !isNaN(id)) // กรองตัวที่ไม่ใช่ Number ออก
                    .sort((a, b) => a - b); // เรียงแบบตัวเลข

                  // นำ Array ที่เรียงแล้วมา join เป็น string
                  return ` ${sortedIds.join(', ')}`; // เติมวรรคหน้า
                })()
              }
            </div>
            {/* --- *** จบส่วนแก้ไข *** --- */}
          </div>
        </div>
        <div className="test-procedures-wrapper">
          {testcase && testcase.testcase_id && <TestProcedures testcaseId={testcase.testcase_id} />}
        </div>

        {/* Verification Result Section */}
        <div className="testcase-detail-section verification-result-section">
          <h3><FontAwesomeIcon icon={faCheckCircle} /> Latest Verification Result</h3>
          {loadingVerification && <p>Loading verification data...</p>}
          {errorVerification && <p className="error-message">{errorVerification}</p>}
          {!loadingVerification && !errorVerification && (
            verificationResult ? (
              <div className="verification-details">
                <p><strong>Verified At:</strong> {formatDate(verificationResult.verify_at)}</p>
                <div>
                  <strong><FontAwesomeIcon icon={faUserCheck} /> Verified By:</strong>
                  <ul className="reviewer-list">
                    {parseJsonSafe(verificationResult.verify_by, []).map((reviewer, index) => (<li key={index}>{reviewer}</li>))}
                    {parseJsonSafe(verificationResult.verify_by, []).length === 0 && <li>N/A</li>}
                  </ul>
                </div>
                <div>
                  <strong><FontAwesomeIcon icon={faListCheck} /> Checklist Used:</strong>
                  <ul className="checklist-list">
                    {parseJsonSafe(verificationResult.verification_checklist, []).map((item, index) => (<li key={index}>{item}</li>))}
                    {parseJsonSafe(verificationResult.verification_checklist, []).length === 0 && <li>N/A</li>}
                  </ul>
                </div>
              </div>
            ) : (<p>No verification information found.</p>)
          )}
          --------------------------------------------------------------------- เเยกนะhistory อยู้เเถบข้างก็ได้
          <div className="history-sidebar">
            <h3><FontAwesomeIcon icon={faHistory} /> History</h3>
            {loadingHistory && <p>Loading history...</p>}
            {errorHistory && <p className="error-message">{errorHistory}</p>}
            {!loadingHistory && !errorHistory && (
              history.length > 0 ? (
                <ul className="history-list">
                  {history.map((item) => (
                    <li key={item.historytestcase_id} className="history-item">
                      <div><span className="history-status">{formatStatus(item.testcase_status)}</span></div>
                      <span className="history-time">{formatDate(item.testcase_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (<p>No history recorded.</p>)
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default TestcaseDetail;