import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
// *** แก้ไข: Import Modal ที่คุณใช้จริง (อาจจะเป็น ModalVeriTestcase หรือชื่ออื่น) ***
import ModalVeriTestcase from './ModalVeriTestcase'; // <<< ตรวจสอบ Path และชื่อ Component ให้ถูกต้อง
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheckSquare, // Icon สำหรับ Title
  faListAlt,     // Icon สำหรับ Card Header
  faSearch,      // Icon สำหรับ Search Input
  faSyncAlt,     // Icon สำหรับ Refresh Button
  faUser,        // Icon สำหรับ Created By
  faCalendarAlt, // Icon สำหรับ Date Assigned
  faEye,         // Icon สำหรับ View Reviewers Button
  faCheck,       // Icon สำหรับ Verify Button
  faQuestionCircle // Icon สำหรับ Help (ตัวอย่าง)
} from '@fortawesome/free-solid-svg-icons';

// Import CSS หลักสำหรับหน้านี้
import "./testcase_css/VeriTestcase.css"; // <<< ตรวจสอบ Path ให้ถูกต้อง

const VeriTestcase = () => {
  const [testcases, setTestcases] = useState([]);
  const [selectedTestcaseDetails, setSelectedTestcaseDetails] = useState({});
  const [assignedReviewersForModal, setAssignedReviewersForModal] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  // Optional Loading/Error states
  // const [isLoading, setIsLoading] = useState(true);
  // const [fetchError, setFetchError] = useState(null);

  const fetchTestcases = useCallback(() => {
    // setIsLoading(true);
    // setFetchError(null);
    axios
      .get(`http://localhost:3001/verilisttestcase?project_id=${projectId}`)
      .then((response) => {
        console.log("Fetched Testcases:", response.data);
        // --- Data Grouping Logic ---
        const groupedTestcase = response.data.reduce((acc, tc) => {
            const round = tc.veritestcase_round;
            if (!acc[round]) {
              acc[round] = {
                ...tc,
                testcase_id: Array.isArray(tc.testcase_id) ? tc.testcase_id : [tc.testcase_id],
                veritestcase_by: typeof tc.veritestcase_by === "object" && tc.veritestcase_by !== null
                  ? Object.entries(tc.veritestcase_by).map(([name, value]) => ({ name, value: value === true }))
                  : [], // Handle null or non-object case
              };
            } else {
              // Ensure testcase_id is always treated as an array
              if (!Array.isArray(acc[round].testcase_id)) {
                  acc[round].testcase_id = [acc[round].testcase_id];
              }
              acc[round].testcase_id.push(tc.testcase_id);

              // Merge reviewers carefully
              if (typeof tc.veritestcase_by === "object" && tc.veritestcase_by !== null) {
                 const newVeri = Object.entries(tc.veritestcase_by).map(([name, value]) => ({ name, value: value === true }));
                 // Ensure existing veritestcase_by is an array
                 if (!Array.isArray(acc[round].veritestcase_by)) {
                     acc[round].veritestcase_by = [];
                 }
                 const existingReviewerMap = new Map(acc[round].veritestcase_by.map(r => [r.name, r]));
                 newVeri.forEach(nr => {
                     if (!existingReviewerMap.has(nr.name)) {
                         existingReviewerMap.set(nr.name, nr);
                     }
                 });
                 acc[round].veritestcase_by = Array.from(existingReviewerMap.values());
              }
            }
            return acc;
          }, {});
        // --- End Data Grouping ---

        const processedTestcases = Object.values(groupedTestcase)
          .filter((tc) => tc.testcase_status === "WAITING FOR VERIFICATION");

        console.log("Processed Testcases:", processedTestcases);
        setTestcases(processedTestcases);
      })
      .catch((err) => {
        console.error("Error fetching testcases:", err);
        toast.error("Error fetching test cases.");
        // setFetchError("Failed to fetch data.");
      })
      // .finally(() => { setIsLoading(false); });
  }, [projectId]);

  useEffect(() => {
    fetchTestcases();
  }, [fetchTestcases]);

  const handleSearchClick = (details, veritestcaseBy) => {
    setSelectedTestcaseDetails(details || {});
    setAssignedReviewersForModal(veritestcaseBy || []);
    setShowModal(true);
  };

  const handleVerifyClick = (tc) => {
    if (!projectId || !tc?.testcase_id || !tc?.veritestcase_id) {
      toast.error("Invalid project ID or test case data.");
      return;
    }
    const testcaseIds = Array.isArray(tc.testcase_id) ? tc.testcase_id : [tc.testcase_id];
    const testcaseIdString = testcaseIds.join(","); // Use comma or semicolon as needed by API

    if (!testcaseIdString) {
      toast.error("Test Case ID not found.");
      return;
    }
    const veritestcaseId = tc.veritestcase_id;
    navigate(`/TestcaseVerifed?project_id=${projectId}&testcase_id=${testcaseIdString}&veritestcase_id=${veritestcaseId}`, {
      state: { selectedTestcaseIds: testcaseIds }
    });
  };

  // --- Render Logic ---
  // if (isLoading) return <div className="container-veritestcase"><p>Loading...</p></div>;
  // if (fetchError) return <div className="container-veritestcase"><p className="error-message">{fetchError}</p></div>;

  return (
    <div className="container-veritestcase">
      <button
        className="back-button-veritestcase"
        onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } })}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Back
      </button>

      <div className="page-title-container-veritestcase">
        <h1 className="page-title-veritestcase">
          <FontAwesomeIcon icon={faCheckSquare} className="title-icon-veritestcase" />
          Verification List
        </h1>
        {/* Optional Help Icon */}
        {/* <button className="help-icon-button-veritestcase" title="Help">
             <FontAwesomeIcon icon={faQuestionCircle} />
           </button> */}
      </div>

      <div className="content-card-veritestcase">
        <div className="card-header-veritestcase">
          <h2 className="card-title-veritestcase">
            <FontAwesomeIcon icon={faListAlt} />
            Verification Requests
          </h2>
          <span className="request-count-badge-veritestcase">{testcases.length}</span>
        </div>

        <div className="toolbar-veritestcase">
          <div className="search-input-container-veritestcase">
            <FontAwesomeIcon icon={faSearch} className="search-input-icon-veritestcase" />
            <input type="text" className="search-input-veritestcase" placeholder="Search by ID or creator..." />
          </div>
          <button className="refresh-button-veritestcase" onClick={fetchTestcases}>
            <FontAwesomeIcon icon={faSyncAlt} />
            Refresh
          </button>
        </div>

        <div className="testcase-table-container-veritestcase">
          {testcases.length === 0 ? (
            <p className="no-testcase-message-veritestcase">No test cases waiting for verification.</p>
          ) : (
            <table className="testcase-table-veritestcase">
              <thead>
                <tr>
                  <th className="text-center-veritestcase">VERIF. ROUND</th>
                  <th>CREATED BY</th>
                  <th>DATE ASSIGNED</th>
                  <th>STATUS</th>
                  <th className="text-center-veritestcase">REVIEWER</th>
                  <th className="text-center-veritestcase">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {testcases.map((tc) => (
                  <tr key={tc.veritestcase_round}>
                    <td className="text-center-veritestcase">{`VERIF-${tc.veritestcase_round}`}</td>
                    <td>
                      <span className="created-by-veritestcase">
                        <FontAwesomeIcon icon={faUser} className="icon-veritestcase" />
                        {tc.create_by || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className="date-assigned-veritestcase">
                        <FontAwesomeIcon icon={faCalendarAlt} className="icon-veritestcase" />
                        {tc.veritestcase_at ? new Date(tc.veritestcase_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"} {/* More specific date format */}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge-veritestcase">
                        {tc.testcase_status?.replace(/_/g, ' ') || "N/A"} {/* Format status */}
                      </span>
                    </td>
                    <td className="text-center-veritestcase">
                      <button
                        className="search-icon-button-veritestcase"
                        title="View Reviewers"
                        onClick={() =>
                          handleSearchClick(
                            { // Pass necessary details for modal display
                              testcase_id: tc.testcase_id,
                              created_by: tc.create_by, // Pass creator if needed in modal
                            },
                            tc.veritestcase_by // Pass processed reviewer array
                          )
                        }
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    </td>
                    <td className="text-center-veritestcase">
                      <button className='verify-button-veritestcase' onClick={() => handleVerifyClick(tc)}>
                        <FontAwesomeIcon icon={faCheck} />
                        Verify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div> {/* End table container */}
      </div> {/* End content card */}

      {/* Render Modal */}
      <ModalVeriTestcase
        show={showModal}
        onClose={() => setShowModal(false)}
        details={selectedTestcaseDetails}
        veritestcaseBy={assignedReviewersForModal}
      />
    </div> // End container
  );
};

export default VeriTestcase;