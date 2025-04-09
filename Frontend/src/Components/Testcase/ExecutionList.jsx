import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2"; // เพิ่มตรงนี้
import "./testcase_css/ExecutionList.css";

const ExecutionList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const project_id = queryParams.get("project_id");
  const [testExecutions, setTestExecutions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (project_id) {
      axios
        .get(`http://localhost:3001/api/testcase_executions?project_id=${project_id}`)
        .then((response) => setTestExecutions(response.data))
        .catch((error) => console.error("Error fetching test executions:", error));
    }
  }, [project_id]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const options = { day: "2-digit", month: "long", year: "numeric" };
    return new Date(dateString).toLocaleDateString("th-TH", options);
  };

  const filteredExecutions = testExecutions.filter((execution) =>
    execution.testcase_id.toString().includes(searchTerm)
  );


  const handleNavigate = (execution) => {
    if (execution.testcase_status !== "BASELINE") {
      Swal.fire({
        icon: "warning",
        title: "ไม่สามารถ Execute ได้",
        text: "Test Case นี้ยังไม่อยู่ในสถานะ BASELINE",
        confirmButtonText: "ตกลง",
      });
    } else {
      navigate(`/TestExecution/${execution.testcase_id}`);
    }
  };

  return (
    <div className="execution-list">
      <button onClick={() => navigate(`/Dashboard?project_id=${project_id}`, { state: { selectedSection: "Testcase" } })}>
        Back
      </button>
      <h2>Test Execution</h2>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by Test Case ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <table>
        <thead>
          <tr>
            <th>Test Case ID</th>
            <th>Test Title</th>
            <th>Test Status</th>
            <th>Completion Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredExecutions.length > 0 ? (
            filteredExecutions.map((execution) => (
              <tr key={execution.test_execution_id}>
                <td>TC-{execution.testcase_id.toString().padStart(3, "0")}</td>
                <td>{execution.testcase_name || "N/A"}</td>
                <td>{execution.test_execution_status}</td>
                <td>{formatDate(execution.testcase_at)}</td>
                <td>
                  <button
                    className="execute-btn"
                    onClick={() => handleNavigate(execution)}
                  >
                    Execute
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="no-data">No test executions found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ExecutionList;
