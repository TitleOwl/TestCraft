import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import "./testcase_css/TestcaseBaseline.css";

const TestcaseBaseline = () => {
  const [testcaseBaselines, setTestCaseBaselines] = useState([]);
  const [groupedBaselines, setGroupedBaselines] = useState(new Map());
  const [selectedTestCase, setSelectedTestCase] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  // ดึงข้อมูล Baselines
  const fetchBaselines = useCallback(() => {
    axios
      .get(`http://localhost:3001/testcasebaseline?project_id=${projectId}`)
      .then((response) => {
        setTestCaseBaselines(response.data);
      })
      .catch((err) => {
        console.error("Error fetching testcase baseline:", err);
        toast.error("Error fetching testcase baseline.");
      });
  }, [projectId]);

  useEffect(() => {
    fetchBaselines();
  }, [fetchBaselines]);

  // จัดกลุ่ม Baseline ตาม baselinetestcase_round
  useEffect(() => {
    const grouped = new Map();

    testcaseBaselines.forEach((baseline) => {
      const key = baseline.baselinetestcase_round;
      if (!grouped.has(key)) {
        grouped.set(key, {
          round: key,
          date: baseline.baselinetestcase_at,
          testcase: [],
        });
      }
      grouped.get(key).testcase.push(baseline.testcase_id);
    });

    setGroupedBaselines(grouped);
  }, [testcaseBaselines]);

  // ฟังก์ชันลิงก์ไปหน้า Create Baseline
  const handleSetBaselineClick = () => {
    navigate(`/CreateTestcasebaseline?project_id=${projectId}`);
  };

  const handleViewTestcase = (testcase) => {
    setSelectedTestCase(testcase);
    setIsModalOpen(true);
  };

  const handleBack = () => {
    navigate(`/Dashboard?project_id=${projectId}`);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTestCase([]);
  };

  return (
    <div className="baseline-container">
      <h1>List Baseline</h1>
      <div className="action-bar">
        <button className="btn-create-baseline" onClick={handleSetBaselineClick}>
          Set Baseline
        </button>
      </div>
      <div className="list-baseline">
        {groupedBaselines.size === 0 ? (
          <p>No baselines available.</p>
        ) : (
          <table className="baseline-table">
            <thead>
              <tr>
                <th>Baseline</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(groupedBaselines.values()).map((baseline) => (
                <tr key={baseline.round}>
                  <td>{`BL${baseline.round}`}</td>
                  <td>{new Date(baseline.date).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="view-details-button"
                      onClick={() => handleViewTestcase(baseline.testcase)}
                    >
                      View Testcase
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <button className="modal-close-button" onClick={handleBack}>
        Back
      </button>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Testcase in this Baseline</h2>
            {selectedTestCase.length === 0 ? (
              <p>No Testcase available.</p>
            ) : (
              <ul>
                {selectedTestCase.map((testcase, index) => (
                  <li key={index}>TC-{testcase}</li>
                ))}
              </ul>
            )}
            <button className="modal-close-button" onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestcaseBaseline;
