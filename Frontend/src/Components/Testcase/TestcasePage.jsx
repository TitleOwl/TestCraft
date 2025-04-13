import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import ConfirmationModal from "./ConfirmationModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faTrash,
  faEye,
  faPlus,
  faPlayCircle,
  faCheckCircle,
  faFileAlt,
  faHistory,
  faSearch,
  faTimes,
  faSort,
  faFilter,
  faHome,
  faChevronRight,
  faQuestionCircle,
  faTable,
  faListAlt
} from "@fortawesome/free-solid-svg-icons";
import "./testcase_css/TestcasePage.css";
// import './testcase_css/ConfirmationModal.css'; // สร้างไฟล์ CSS สำหรับตกแต่ง

const TestcasePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectName, setProjectName] = useState("Project Name");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [filteredTestCases, setFilteredTestCases] = useState([]);
  const [activeTab, setActiveTab] = useState("testcases");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testCaseToDeleteId, setTestCaseToDeleteId] = useState(null);
  useEffect(() => {
    fetchProjectDetails();
    fetchTestCases();
  }, [projectId]);

  // Filter test cases when search or filters change
  useEffect(() => {
    if (!testCases.length) {
      setFilteredTestCases([]);
      return;
    }

    let filtered = testCases.filter((test) =>
      test.testcase_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `TC-00${test.testcase_id}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(test => test.testcase_status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter(test => test.testcase_priority === priorityFilter);
    }

    setFilteredTestCases(filtered);
  }, [searchQuery, testCases, statusFilter, priorityFilter]);

  const fetchProjectDetails = async () => {
    if (!projectId) return;

    try {
      const response = await axios.get(`http://localhost:3001/project/${projectId}`);
      setProjectName(response.data.project_name);
    } catch (error) {
      console.error("Error fetching project details:", error);
    }
  };

  const fetchTestCases = async () => {
    if (!projectId) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`http://localhost:3001/testcases?project_id=${projectId}`);
      setTestCases(response.data);
      setFilteredTestCases(response.data);
    } catch (error) {
      setError("Failed to load test cases.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    try {
      // ใช้ Date constructor และ handle timezone ให้ถูกต้อง
      const date = new Date(dateString);

      // ตรวจสอบว่าวันที่ถูกต้องหรือไม่ (Invalid Date check)
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      // ฟอร์แมตแบบ dd MMM yyyy (14 Feb 2025) ซึ่งเป็นรูปแบบที่อ่านง่าย
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Date error";
    }
  };

  const handleCreateTestcase = () => {
    navigate(`/CreateTestcase?project_id=${projectId}`);
  };

  const handleTestExecution = () => {
    navigate(`/ExecutionList?project_id=${projectId}`);
  };

  const handleCreateVeri = () => {
    navigate(`/CreateVeriTest?project_id=${projectId}`);
  };

  const handleVerilist = () => {
    navigate(`/VeriTestcase?project_id=${projectId}`);
  };

  const handleBaselineTest = () => {
    navigate(`/TestcaseBaseline?project_id=${projectId}`);
  };

  const handleDeleteTestcase = (id) => {
    setTestCaseToDeleteId(id); // เก็บ ID ที่จะลบ
    setIsModalOpen(true);      // เปิด Modal
  };

  // --- ฟังก์ชันปิด Modal ---
  const closeModal = () => {
    setIsModalOpen(false);
    setTestCaseToDeleteId(null); // ล้าง ID ที่เก็บไว้
  };

  // --- ฟังก์ชันที่เรียกเมื่อยืนยันการลบใน Modal ---
  const confirmDeletion = async () => {
    if (!testCaseToDeleteId) return; // ป้องกันกรณีไม่มี ID

    const idToDelete = testCaseToDeleteId; // เก็บ ID ไว้ก่อนปิด Modal
    closeModal(); // ปิด Modal ทันที

    try {
      await axios.delete(`http://localhost:3001/testcases/${idToDelete}`);

      // Update state หลังลบสำเร็จ
      setTestCases((prevTestCases) =>
        prevTestCases.filter((test) => test.testcase_id !== idToDelete)
      );

      // --- ใช้ Toastify สำหรับ Success ---
      toast.success("Test Case deleted successfully.", {
      });

    } catch (error) {
      console.error("Delete error:", error);
      // --- ใช้ Toastify สำหรับ Error ---
      toast.error("ลบ Test Case ไม่สำเร็จ ลองใหม่อีกครั้ง", {
      });
    }
  };

  return (
    <div className="testcase-container">
      <div className="testcase-header">
        <div className="testcase-header-top">
          <div className="testcase-project-info">
            <div className="testcase-breadcrumb">
              <FontAwesomeIcon icon={faHome} />
              <span className="testcase-breadcrumb-divider">/</span>
              Projects
              <span className="testcase-breadcrumb-divider">/</span>
              {projectName}
            </div>
            <div className="testcase-project-title">
              <h1 className="testcase-project-name">{projectName || "Project"}</h1>
              <span className="testcase-badge">TEST CASE MANAGEMENT</span>

            </div>
          </div>
          <div className="testcase-actions">
            <button className="testcase-execution-button" onClick={handleTestExecution}>
              <FontAwesomeIcon icon={faPlayCircle} style={{ marginRight: '8px' }} />
              Test Execution
            </button>
          </div>
        </div>

        <div className="testcase-tab-bar">
          <div
            className={`testcase-tab ${activeTab === 'testcases' ? 'active' : ''}`}
            onClick={() => setActiveTab('testcases')}
          >
            <FontAwesomeIcon icon={faTable} className="testcase-tab-icon" />
            Test Cases
          </div>

          <div
            className={`testcase-tab ${activeTab === 'createVeri' ? 'active' : ''}`}
            onClick={handleCreateVeri}
          >
            <FontAwesomeIcon icon={faPlus} className="testcase-tab-icon" />
            Create Verification
          </div>

          <div
            className={`testcase-tab ${activeTab === 'viewVeri' ? 'active' : ''}`}
            onClick={handleVerilist}
          >
            <FontAwesomeIcon icon={faCheckCircle} className="testcase-tab-icon" />
            View Verification
          </div>

          <div
            className={`testcase-tab ${activeTab === 'baseline' ? 'active' : ''}`}
            onClick={handleBaselineTest}
          >
            <FontAwesomeIcon icon={faHistory} className="testcase-tab-icon" />
            Baseline
          </div>
        </div>
      </div>

      <div className="testcase-toolbar">
        <div className="testcase-toolbar-left">
          <div className="testcase-search-container">
            <FontAwesomeIcon icon={faSearch} className="testcase-search-icon" />
            <input
              type="text"
              className="testcase-search-input"
              placeholder="Search test cases by ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="testcase-clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>

          <select
            className="testcase-filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">Filter by Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            className="testcase-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Filter by Status</option>
            <option value="VERIFIED">Verified</option>
            <option value="VALIDATED">Validated</option>
            <option value="WORKING">Working</option>
            <option value="WAITING FOR VERIFICATION">Waiting for Verification</option>
            <option value="WAITING FOR VALIDATION">Waiting for Validation</option>
            <option value="BASELINE">Baseline</option>
          </select>

          <button className="testcase-create-button" onClick={handleCreateTestcase}>
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
            Add Test Case
          </button>
        </div>
      </div>

      <div className="testcase-content-card">
        <div className="testcase-card-header">
          <div>
            <h2 className="testcase-card-title">
              <FontAwesomeIcon icon={faTable} className="testcase-card-icon" />
              Test Cases
            </h2>
            <p className="testcase-card-description">
              Manage and track all test cases for this project
            </p>
          </div>
        </div>

        <div className="testcase-table-container">
          {loading ? (
            <div className="testcase-loading-state">
              <div className="testcase-loading-spinner"></div>
              <p>Loading test cases...</p>
            </div>
          ) : error ? (
            <div className="testcase-error-message">{error}</div>
          ) : filteredTestCases.length === 0 ? (
            <div className="testcase-empty-state">
              <FontAwesomeIcon icon={faListAlt} className="testcase-empty-icon" />
              <p className="testcase-empty-text">
                No test cases found. Add some test cases or adjust your filters.
              </p>
              <button className="testcase-empty-button" onClick={handleCreateTestcase}>
                <FontAwesomeIcon icon={faPlus} />
                Add First Test Case
              </button>
            </div>
          ) : (
            <table className="testcase-table">
              <thead>
                <tr>
                  <th>Test Case ID</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Test Completion Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTestCases.map((test) => (
                  <tr key={test.testcase_id}>
                    <td className="testcase-id-cell"
                      onClick={() =>
                        navigate(`/TestcaseDetail?testcase_id=${test.testcase_id}&project_id=${projectId}`, {
                          state: { testcase: test },
                        })
                      }
                    >
                      TC-{test.testcase_id.toString().padStart(3, '0')}
                    </td>

                    <td className="testcase-name-cell">{test.testcase_name}</td>


                    <td className="testcase-priority-cell">
                      <span className={`testcase-priority-badge priority-${test.testcase_priority?.toLowerCase()}`}>
                        {test.testcase_priority || "Not set"}
                      </span>
                    </td>

                    <td className="testcase-date-cell">{formatDate(test.testcase_at)}</td>

                    <td className="testcase-status-cell">
                      <span
                        className={`status-button 
                          ${test.testcase_status === 'VERIFIED' ? 'status-verified' : ''}
                          ${test.testcase_status === 'VALIDATED' ? 'status-validated' : ''} 
                          ${test.testcase_status === 'WORKING' ? 'status-working' : ''} 
                          ${test.testcase_status === 'WAITING FOR VERIFICATION' ? 'status-waiting-ver' : ''}
                          ${test.testcase_status === 'WAITING FOR VALIDATION' ? 'status-val-inprogress' : ''}
                          ${test.testcase_status === 'BASELINE' ? 'status-baseline' : ''}
                        `}
                      >
                        <span className="status-dot"></span>
                        {test.testcase_status || "Not set"}
                      </span>
                    </td>

                    <td className="testcase-actions-cell">
                      <div className="testcase-actions">
                        <button
                          className="testcase-view"
                          onClick={() =>
                            navigate(`/TestcaseDetail?testcase_id=${test.testcase_id}&project_id=${projectId}`, {
                              state: { testcase: test },
                            })
                          }
                          title="View"
                        >
                          <FontAwesomeIcon icon={faEye} className="testcase-icon" />
                        </button>

                        <button
                          className="testcase-edit"
                          onClick={() =>
                            navigate(`/UpdateTestcase?testcase_id=${test.testcase_id}&project_id=${projectId}`)
                          }
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faPen} className="testcase-icon" />
                        </button>

                        <button
                          className="testcase-delete"
                          // --- เรียก handleDeleteTestcase แทน Swal ---
                          onClick={() => handleDeleteTestcase(test.testcase_id)}
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} className="testcase-icon" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmDeletion}
        title="Confirm Deletion?"
        message="This Test Case will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default TestcasePage;