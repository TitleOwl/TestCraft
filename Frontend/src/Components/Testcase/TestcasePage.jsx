import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash, faEye } from "@fortawesome/free-solid-svg-icons";
import "./testcase_css/TestcasePage.css";

const TestcasePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTestCases();
  }, []);

  const fetchTestCases = async () => {
    if (!projectId) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`http://localhost:3001/testcases?project_id=${projectId}`);
      setTestCases(response.data);
    } catch (error) {
      setError("Failed to load test cases.");
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return "N/A"; // ตรวจสอบค่าว่าง
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }); // รูปแบบ: "14 Feb 2025"
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

  const handleDeleteTestcase = async (id) => {
    Swal.fire({
      title: "คุณต้องการยืนยันที่จะลบ?",
      text: "",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await axios.delete(`http://localhost:3001/testcases/${id}`);
          console.log("Deleted successfully:", response.data);
  
          // อัปเดตหน้าจอหลังจากลบสำเร็จ
          setTestCases((prevTestCases) =>
            prevTestCases.filter((test) => test.testcase_id !== id)
          );
  
          Swal.fire("Deleted!", "Test case has been deleted.", "success");
        } catch (error) {
          console.error("Delete error:", error);
          Swal.fire("Error!", "Failed to delete test case.", "error");
        }
      }
    });
  };
  

  return (
    <div className="testcase-container">
      <div className="testcase-header">
        <div className="testcase-title-group">
          <h2 className="testcase-title">Test Case Management</h2>
          <div className="testcase-main-buttons">
            <button className="testcase-create-button" onClick={handleCreateTestcase}>
              Create TestCase
            </button>
            <button className="testcase-execution-button" onClick={handleTestExecution} >
              Test Execution
            </button>
          </div>
        </div>
        <div className="testcase-other-buttons">
          <button className="testcase-create-verification-button" onClick={handleCreateVeri}>
            Create Verification
          </button>
          <button className="testcase-view-verification-button" onClick={handleVerilist}>
            View Verification
          </button>
          <button className="testcase-baseline-button" onClick={handleBaselineTest}>
            Baselined
          </button>
        </div>
      </div>
      {loading ? <p>Loading test cases...</p> : error ? <p className="error-message">{error}</p> : (
        <table className="testcase-table">
          <thead>
            <tr>
              <th>Test Case ID</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Test Completion Date</th>
              <th>Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {testCases.length > 0 ? testCases.map((test) => (
              <tr key={test.testcase_id}>
                <td
                  onClick={() =>
                    navigate(`/TestcaseDetail?testcase_id=${test.testcase_id}`, {
                      state: { testcase: test },
                    })
                  }
                >
                  TC-00{test.testcase_id}
                </td>

                <td>{test.testcase_name}</td>
                <td>{test.testcase_priority}</td>
                <td>{formatDate(test.testcase_at)}</td>

                <td className="testcase-actions">
                  <button
                    className="testcase-view"
                    onClick={() =>
                      navigate(`/TestcaseDetail?testcase_id=${test.testcase_id}`, {
                        state: { testcase: test },
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faEye} className="testcase-icon" />
                  </button>

                  <button
                    className="testcase-edit"
                    onClick={() =>
                      navigate(`/UpdateTestcase?testcase_id=${test.testcase_id}&project_id=${projectId}`)
                    }
                  >
                    <FontAwesomeIcon icon={faPen} className="testcase-icon" />
                  </button>
                  <button className="testcase-delete" onClick={() => handleDeleteTestcase(test.testcase_id)}>
                    <FontAwesomeIcon icon={faTrash} className="testcase-icon" />
                  </button>

                </td>
                <td>
                  <button
                    className={`status-button 
              ${test.testcase_status === 'VERIFIED' ? 'status-verified' : ''}
              ${test.testcase_status === 'VALIDATED' ? 'status-validated' : ''} 
              ${test.testcase_status === 'WORKING' ? 'status-working' : ''} 
              ${test.testcase_status === 'WAITING FOR VERIFICATION' ? 'status-waiting-ver' : ''}
              ${test.testcase_status === 'WAITING FOR VALIDATION' ? 'status-val-inprogress' : ''}
              ${test.testcase_status === 'BASELINE' ? 'status-baseline' : ''}
            `}
                  >
                    {test.testcase_status}
                  </button>
                </td>
              </tr>
            )) : <tr><td colSpan="7" className="no-data-message">No test cases found.</td></tr>}
          </tbody>
        </table>


      )}
    </div>
  );
};

export default TestcasePage;
