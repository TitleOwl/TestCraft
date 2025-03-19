import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faFileAlt, faPaperclip } from "@fortawesome/free-solid-svg-icons";
import TestProcedures from "./TestProcedures";
import "./testcase_css/TestcaseDetail.css";

const TestcaseDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const testcase = location.state?.testcase || {};

  // ✅ ดึง project_id จาก state, testcase หรือ URL query parameter
  const queryParams = new URLSearchParams(location.search);
  let projectId = location.state?.projectId || testcase?.project_id || queryParams.get("project_id") || "";

  console.log("projectId:", projectId); // Debug ค่า projectId

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="testcase-detail-container">
      {/* Back Button */}
      <button
        onClick={() => navigate(`/Dashboard${projectId ? `?project_id=${encodeURIComponent(projectId)}` : ""}`)}
        className="backreq-button"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="faArrowLeft" />
      </button>

      {/* Header Section */}
      <div className="testcase-detail-header">
        <h2>Test Case Detail</h2>
      </div>

      {/* Test Case Information */}
      <div className="testcase-detail-section">
        <p>
          <strong>Test Case:</strong> TC-00{testcase.testcase_id} - {testcase.testcase_name || "Untitled"}
        </p>
        <div className="testcase-detail-info-grid">
          {[
            { label: "Test Case ID", value: `TC-00${testcase.testcase_id}` },
            { label: "Title", value: testcase.testcase_name || "N/A" },
            { label: "Description", value: testcase.testcase_des || "No description available" },
            { label: "Test Type", value: testcase.testcase_type || "N/A" },
            { label: "Priority", value: testcase.testcase_priority || "N/A" },
            { label: "Created By", value: testcase.testcase_by || "Unknown" },
            { label: "Test Completion Date", value: formatDate(testcase.testcase_at) },
          ].map(({ label, value }) => (
            <div key={label}>
              <strong>{label}:</strong> {value}
            </div>
          ))}
          <div>
            <strong>Status:</strong>
            <span
              className={`testcase-detail-status testcase-detail-status-${testcase.test_execution_status?.toLowerCase().replace(/\s/g, "-") || "unknown"
                }`}
            >
              {testcase.test_execution_status || "Unknown"}
            </span>
          </div>
        </div>
      </div>

      {/* Attachments Section
      <div className="testcase-detail-section">
        <h3>
          <FontAwesomeIcon icon={faPaperclip} /> Attachments
        </h3>
        {testcase.testcase_attach ? (
          <ul className="testcase-detail-attachments">
            <li>
              <FontAwesomeIcon icon={faFileAlt} /> REQ-00{testcase.testcase_attach}
            </li>
          </ul>
        ) : (
          <p>No attachments available</p>
        )}
      </div> */}

      {/* Test Procedures Section */}
      <div className="test-procedures-wrapper">
        <TestProcedures testcaseId={testcase.testcase_id} />
      </div>
    </div>
  );
};

export default TestcaseDetail;