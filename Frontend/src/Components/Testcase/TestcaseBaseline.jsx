import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
// ใช้ CSS ที่เราสร้างให้ก่อนหน้านี้ หรือ CSS เดิมของคุณ
// ถ้าใช้ CSS ที่สร้างให้ ตรวจสอบว่า class names ใน JSX ตรงกัน
import "./testcase_css/TestcaseBaseline.css";

// --- Icons (เหมือนโค้ดแรก) ---
const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const BaselineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15"></line>
    <circle cx="18" cy="6" r="3"></circle>
    <circle cx="6" cy="18" r="3"></circle>
    <path d="M18 9a9 9 0 0 1-9 9"></path>
  </svg>
);

const AddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const TestCaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

// --- Helper Components (เหมือนโค้ดแรก แต่ LoadingState จะไม่ถูกใช้ในส่วน content หลัก) ---
const LoadingState = () => (
  <div className="testcase-baseline-loading-state"> {/* Changed class name */}
    <div className="testcase-baseline-loading-spinner"></div> {/* Changed class name */}
    <p>Loading test case baselines...</p>
  </div>
);

const EmptyState = () => (
  <div className="testcase-baseline-empty-state"> {/* Changed class name */}
    <div className="testcase-baseline-empty-icon">📊</div> {/* Changed class name */}
    <h3>No Test Case Baselines Found</h3>
    <p>Create your first test case baseline by clicking the 'Set Baseline' button.</p>
  </div>
);

// --- Main Component ---
const TestcaseBaseline = () => {
  // --- State (นำ State จากโค้ดที่สองมาใช้) ---
  const [testcaseBaselines, setTestCaseBaselines] = useState([]); // เก็บข้อมูลดิบ
  const [groupedBaselines, setGroupedBaselines] = useState(new Map()); // เก็บข้อมูลที่จัดกลุ่มแล้ว
  const [selectedTestCase, setSelectedTestCase] = useState([]); // เก็บ test case ที่เลือกสำหรับ modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Routing & Props (เหมือนเดิม) ---
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  // --- Data Fetching (ใช้ logic จากโค้ดที่สอง) ---
  const fetchBaselines = useCallback(() => {
    // ไม่มี setLoading, setError ที่นี่ เพราะ UI ไม่ได้ใช้ loading/error state โดยตรง
    axios
      .get(`http://localhost:3001/testcasebaseline?project_id=${projectId}`)
      .then((response) => {
        setTestCaseBaselines(response.data); // อัปเดตข้อมูลดิบ
      })
      .catch((err) => {
        console.error("Error fetching testcase baseline:", err);
        toast.error("Error fetching testcase baseline."); // แสดง toast เมื่อ error
      });
  }, [projectId]);

  useEffect(() => {
    fetchBaselines();
  }, [fetchBaselines]);

  // --- Grouping Logic (ใช้ logic จากโค้ดที่สอง) ---
  useEffect(() => {
    const grouped = new Map();
    testcaseBaselines.forEach((baseline) => {
      const key = baseline.baselinetestcase_round;
      if (!grouped.has(key)) {
        grouped.set(key, {
          round: key,
          date: baseline.baselinetestcase_at, // เก็บ date ของกลุ่ม
          testcase: [], // เก็บ testcase_id ของกลุ่มนี้
        });
      }
      // เพิ่ม testcase_id เข้าไปในกลุ่ม (ตรวจสอบว่า property ชื่อ testcase_id ถูกต้อง)
      if(baseline.testcase_id !== undefined && baseline.testcase_id !== null) {
          grouped.get(key).testcase.push(baseline.testcase_id);
      }
    });
    setGroupedBaselines(grouped); // อัปเดต state ข้อมูลที่จัดกลุ่ม
  }, [testcaseBaselines]); // ทำงานเมื่อ testcaseBaselines เปลี่ยน

  // --- Formatting (นำ function formatDate จากโค้ดแรกมาใช้) ---
   const formatDate = (dateString) => {
     if (!dateString) return "N/A";
     try {
       const date = new Date(dateString);
       return date.toLocaleDateString('en-US', { // หรือ 'th-TH' ถ้าต้องการภาษาไทย
         year: 'numeric',
         month: 'long',
         day: 'numeric'
       });
     } catch (error) {
       console.error("Error formatting date:", error);
       return "Invalid date";
     }
   };

  // --- Handlers (ใช้ handlers จากโค้ดที่สอง) ---
  const handleSetBaselineClick = () => {
    navigate(`/CreateTestcasebaseline?project_id=${projectId}`);
  };

  // Handler เปิด Modal และ set state test case ที่เลือก
  const handleViewTestcase = (testcaseArray) => {
    setSelectedTestCase(Array.isArray(testcaseArray) ? testcaseArray : []); // ตรวจสอบว่าเป็น array
    setIsModalOpen(true);
  };

  const handleBack = () => {
    navigate(`/Dashboard?project_id=${projectId}`);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTestCase([]); // ล้างข้อมูลเมื่อปิด modal
  };

  // --- JSX Structure (ใช้โครงสร้างจากโค้ดแรก แต่ logic การแสดงผลบางส่วนมาจากโค้ดที่สอง) ---
  return (
    // ใช้ class name ให้ตรงกับ CSS ของคุณ (เช่น testcase-baseline-dashboard หรือ baseline-container)
    <div className="testcase-baseline-dashboard"> {/* หรือ className="baseline-container" */}

      {/* Header Section - โครงสร้างจากโค้ดแรก (ไม่มีปุ่ม Refresh) */}
      <div className="testcase-baseline-header"> {/* หรือ className="baseline-header" */}
        <div className="testcase-baseline-header-left"> {/* หรือ className="baseline-header-left" */}
          <button className="testcase-baseline-back-button" onClick={handleBack}> {/* หรือ className="baseline-back-button" */}
            <BackIcon />
            <span>Back</span>
          </button>
        </div>
        <div className="testcase-baseline-header-title"> {/* หรือ className="baseline-header-title" */}
          <BaselineIcon />
          <h1>Test Case Baseline Management</h1>
        </div>
        <div className="testcase-baseline-header-right"> {/* หรือ className="baseline-header-right" */}
          {/* ไม่มีปุ่ม Refresh */}
        </div>
      </div>

      {/* Controls Section - โครงสร้างจากโค้ดแรก */}
      <div className="testcase-baseline-controls"> {/* หรือ className="action-bar" */}
        <button className="testcase-baseline-create-button" onClick={handleSetBaselineClick}> {/* หรือ className="btn-create-baseline" */}
          <AddIcon />
          <span>Set New Baseline</span>
        </button>
      </div>

      {/* Content Section - โครงสร้างจากโค้ดแรก, เงื่อนไขแสดงผลใช้ groupedBaselines */}
      <div className="testcase-baseline-content"> {/* หรือ className="baseline-content" / "list-baseline" */}
        {/* ไม่มี Loading/Error state ที่นี่, แสดง EmptyState หรือ Table เท่านั้น */}
        {groupedBaselines.size === 0 ? (
          <EmptyState /> // ใช้ EmptyState component
        ) : (
          <div className="testcase-baseline-table-container"> {/* หรือ className="baseline-table-container" */}
            <table className="testcase-baseline-table"> {/* หรือ className="baseline-table" */}
              <thead>
                <tr>
                  {/* Headers แบบง่ายจากโค้ดที่สอง (ไม่มี sorting) */}
                  {/* ใช้ col-* class ถ้า CSS มีการกำหนด width */}
                  <th className="col-baseline">Baseline</th>
                  <th className="col-date">Date Created</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Map ข้อมูลจาก groupedBaselines (logic จากโค้ดที่สอง) */}
                {Array.from(groupedBaselines.values()).map((baselineGroup) => (
                  <tr key={baselineGroup.round} className="testcase-baseline-row"> {/* หรือ className="baseline-row" */}
                    <td className="col-baseline">
                      {/* แสดง BL-XXX */}
                      <span className="testcase-baseline-id">BL-{String(baselineGroup.round).padStart(3, '0')}</span> {/* หรือ className="baseline-id" */}
                    </td>
                    <td className="col-date">
                      {/* แสดงวันที่ + Icon (โครงสร้างจากโค้ดแรก, data จาก group) */}
                      <div className="date-info">
                        <CalendarIcon />
                        <span>{formatDate(baselineGroup.date)}</span>
                      </div>
                    </td>
                    <td className="col-actions">
                      {/* ปุ่ม View + Icon (โครงสร้างจากโค้ดแรก, logic จากโค้ดที่สอง) */}
                      <button
                        className="view-testcases-button" // หรือ className="view-details-button"
                        onClick={() => handleViewTestcase(baselineGroup.testcase)} // ส่ง array testcase id ไป
                      >
                        <ViewIcon />
                        <span>View Test Cases</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - โครงสร้างจากโค้ดแรก, logic การแสดงผลปรับปรุงจากโค้ดที่สอง */}
      {isModalOpen && (
        <div className="testcase-baseline-modal-overlay" onClick={closeModal}> {/* หรือ className="modal-overlay" */}
          <div className="testcase-baseline-modal-content" onClick={e => e.stopPropagation()}> {/* หรือ className="modal-content" */}
            {/* Modal Header */}
            <div className="testcase-baseline-modal-header"> {/* หรือ className="baseline-modal-header" */}
              <h2>Test Cases in this Baseline</h2>
              <button className="testcase-baseline-modal-close" onClick={closeModal}> {/* หรือ className="baseline-modal-close" */}
                <CloseIcon />
              </button>
            </div>
            {/* Modal Body */}
            <div className="testcase-baseline-modal-body"> {/* หรือ className="baseline-modal-body" */}
              {selectedTestCase.length === 0 ? (
                // ใช้โครงสร้าง Empty state ที่สวยงามขึ้น
                <div className="testcase-baseline-empty-testcases"> {/* หรือ className="baseline-empty-requirements" */}
                  <div className="testcase-baseline-empty-icon">📋</div> {/* หรือ className="baseline-empty-icon" */}
                  <p>No test cases in this baseline.</p>
                </div>
              ) : (
                // ใช้ list structure ที่สวยงามขึ้น
                <ul className="testcase-baseline-testcases-list"> {/* หรือ className="baseline-requirements-list" */}
                  {selectedTestCase.map((testcaseId, index) => (
                    <li key={index} className="testcase-baseline-testcase-item"> {/* หรือ className="baseline-requirement-item" */}
                      <TestCaseIcon />
                      {/* Format TC-XXX */}
                      <span>TC-{String(testcaseId).padStart(3, '0')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Modal Footer */}
            <div className="testcase-baseline-modal-footer"> {/* หรือ className="baseline-modal-footer" */}
              <button className="testcase-baseline-modal-button" onClick={closeModal}> {/* หรือ className="modal-close-button" */}
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container (เหมือนเดิม) */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
};

export default TestcaseBaseline;