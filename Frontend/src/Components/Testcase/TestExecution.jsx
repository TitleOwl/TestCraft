import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./testcase_css/TestExecution.css";
import Swal from "sweetalert2";

const TestExecution = () => {
  const { testcaseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testSteps, setTestSteps] = useState([]);
  const [testCase, setTestCase] = useState({});
  const [testFiles, setTestFiles] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const statusOptions = ["PASSED", "FAILED", "IN PROGRESS"];

  useEffect(() => {
    const fetchTestProceduresAndFiles = async () => {
      if (!testcaseId) return;
      setLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:3001/api/test_procedures/${testcaseId}`
        );
        console.log("Fetched test steps data:", response.data);

        if (response.data && response.data.length > 0) {
          const initializedTestSteps = response.data.map(step => ({
            ...step,
            test_status: step.test_status || "",
            actual_result: step.actual_result || ""
          }));

          setTestSteps(initializedTestSteps);
          setTestCase({
            testcase_id: response.data[0].testcase_id,
            testcase_at: response.data[0].testcase_at,
            testcase_name: response.data[0].testcase_name || "No Name",
          });

          const filesMap = {};
          await Promise.all(
            response.data.map(async (step) => {
              try {
                const fileResponse = await axios.get(
                  `http://localhost:3001/api/get_test_files/${step.test_procedures_id}`
                );
                filesMap[step.test_procedures_id] = fileResponse.data || [];
              } catch (fileError) {
                console.warn(
                  `No files found or error fetching files for step ${step.test_procedures_id}. Setting empty array.`
                );
                filesMap[step.test_procedures_id] = [];
              }
            })
          );
          setTestFiles(filesMap);
          console.log("Fetched files map:", filesMap);
        } else {
          setTestSteps([]);
          setTestFiles({});
          console.warn("No test procedures found for testcaseId:", testcaseId);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load test data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTestProceduresAndFiles();
  }, [testcaseId]);

  const handleStatusChange = (index, event) => {
    const newStatus = event.target.value;
    setTestSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index ? { ...step, test_status: newStatus } : step
      )
    );
  };

  const handleActualResultChange = (index, event) => {
    const newActualResult = event.target.value;
    setTestSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index ? { ...step, actual_result: newActualResult } : step
      )
    );
  };

  // --- Function to get the logged-in username ---
  const getExecutorName = () => {
    const nameFromState = location.state?.executorName;
    if (nameFromState && nameFromState !== "Unknown User") {
      console.log("Executor name from location state:", nameFromState);
      return nameFromState;
    }

    // --- เปลี่ยน key จาก "loggedInUsername" เป็น "username" ---
    const storedUsername = localStorage.getItem("username");
    // --- สิ้นสุดการเปลี่ยนแปลง ---

    if (storedUsername) {
      console.log("Executor name from localStorage (key 'username'):", storedUsername);
      return storedUsername;
    }

    console.warn(
      "Executor name not found in location state or localStorage (key 'username'). Using 'Unknown User'."
    );
    return "Unknown User";
  };
  // --- End of function to get username ---

  const handleSave = async () => {
    if (!testCase?.testcase_id) {
      console.error("Test Case ID is missing. Cannot save.");
      Swal.fire({
        icon: "error",
        title: "Save Error",
        text: "Cannot save execution data: Test Case ID is missing.",
      });
      return;
    }

    const executorName = getExecutorName();

    if (executorName === "Unknown User") {
      const confirmSave = await Swal.fire({
        title: 'Confirm Save',
        text: "Executor name could not be determined (localStorage key 'username' not found or empty). Save as 'Unknown User' or cancel?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Save as Unknown',
        cancelButtonText: 'Cancel'
      });
      if (!confirmSave.isConfirmed) {
        return;
      }
    }

    const formattedTestSteps = testSteps.map(step => ({
      test_procedures_id: step.test_procedures_id,
      test_status: step.test_status || "READY TO TEST",
      actual_result: step.actual_result || ""
    }));

    try {
      const payload = {
        testSteps: formattedTestSteps,
        testcase_id: testCase.testcase_id,
        execute_by: executorName,
      };
      console.log("Saving test execution data:", payload);

      const response = await axios.post(
        "http://localhost:3001/api/update_test_execution",
        payload
      );

      Swal.fire({
        icon: "success",
        title: "Saved!",
        text: `Test Execution saved successfully by ${executorName}. Final status: ${response.data.finalStatus}`,
      });
    } catch (error) {
      console.error(
        "Error saving test execution:",
        error.response?.data || error.message
      );
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: `Failed to save test execution: ${
          error.response?.data?.error || error.message
        }`,
      });
    }
  };

  const handleFileChange = async (index, event) => {
    const file = event.target.files[0];
    if (!file || !selectedStep) return;
    const currentProcedureId = selectedStep.test_procedures_id;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("test_procedures_id", currentProcedureId);
    formData.append("testcase_id", testCase.testcase_id);

    try {
      const response = await axios.post(
        "http://localhost:3001/api/upload_test_file",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const newFileInfo = response.data;
      setTestFiles((prevFiles) => {
        const currentFiles = prevFiles[currentProcedureId] || [];
        const updatedFileList = [...currentFiles, newFileInfo];
        return { ...prevFiles, [currentProcedureId]: updatedFileList };
      });
      Swal.fire("Success", "File uploaded successfully!", "success");
      event.target.value = null;
    } catch (error) {
      Swal.fire(
        "Upload Failed",
        `File upload failed: ${error.response?.data?.message || error.message}`,
        "error"
      );
    }
  };

  const handleDeleteFile = async (test_procedures_id, fileIndex) => {
    if (!testFiles[test_procedures_id]?.[fileIndex]) return;
    const fileName = testFiles[test_procedures_id][fileIndex].file_testcase_name;
    const encodedFileName = encodeURIComponent(fileName);

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete ${fileName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(
        `/api/delete_test_file/${test_procedures_id}/${encodedFileName}`
      );
      setTestFiles((prevFiles) => {
        const updatedFiles = { ...prevFiles };
        updatedFiles[test_procedures_id] = updatedFiles[test_procedures_id].filter((_, i) => i !== fileIndex);
        return updatedFiles;
      });
      Swal.fire("Deleted!", "File has been deleted.", "success");
    } catch (error) {
      Swal.fire(
        "Delete Failed",
        `An error occurred while deleting the file: ${error.response?.data?.message || error.message}`,
        "error"
      );
    }
  };

  const openModal = (step) => {
    setSelectedStep(step);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedStep(null);
  };

  const handleBackClick = () => {
    navigate(`/ExecutionList?project_id=${projectId}`);
  };

  if (loading) return <div className="loading-spinner-container"><div className="loading-spinner"></div><p>Loading Test Execution Details...</p></div>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="TestExecution">
      <button className="back-test-execution" onClick={handleBackClick}>
        ← Back
      </button>
      <button className="save-button-testexec" onClick={handleSave}>
        Save Execution
      </button>
      <h3 className="test-exec">
        Test Execution : TC-
        {(testCase?.testcase_id || "-").toString().padStart(2, "0")}{" "}
        {testCase?.testcase_name || "Unknown"}
      </h3>
      <p className="completion-exec">
        <strong>Original Creation Date:</strong>{" "}
        {testCase?.testcase_at
          ? new Date(testCase.testcase_at).toLocaleDateString("en-GB")
          : "-"}
      </p>

      <table className="test-execution-table">
        <thead>
          <tr>
            <th>Step No</th>
            <th>Required Action</th>
            <th>Expected Result</th>
            <th>Prerequisite</th>
            <th>Test Status</th>
            <th>Actual Result</th>
            <th>Attachments</th>
          </tr>
        </thead>
        <tbody>
          {testSteps.length > 0 ? (
            testSteps.map((step, index) => (
              <tr
                key={step.test_procedures_id}
                data-status={step.test_status || "default"}
              >
                <td>{index + 1}</td>
                <td>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: step.required_action || "",
                    }}
                  />
                </td>
                <td>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: step.expected_result || "",
                    }}
                  />
                </td>
                <td>
                  {step.prerequisite ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: step.prerequisite }}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td
                  className={`status-cell ${
                    step.test_status?.toLowerCase().replace(/\s+/g, "-") || ""
                  }`}
                >
                  <select
                    value={step.test_status || ""}
                    onChange={(event) => handleStatusChange(index, event)}
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map((status, idx) => (
                      <option key={idx} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    className="actual-result-input"
                    value={step.actual_result || ""}
                    onChange={(event) =>
                      handleActualResultChange(index, event)
                    }
                    placeholder="Enter actual result"
                  />
                </td>
                <td>
                  <button className="view-files-btn" onClick={() => openModal(step)}>View/Add Files</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="no-data">
                No Test Procedures Found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {modalOpen && selectedStep && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>
              Files for Step:{" "}
              {testSteps.indexOf(selectedStep) !== -1
                ? testSteps.indexOf(selectedStep) + 1
                : "-"}
            </h3>
            <input
              className="inputfile-testexec"
              type="file"
              onChange={(event) =>
                handleFileChange(testSteps.indexOf(selectedStep), event)
              }
              style={{ marginBottom: "15px" }}
            />
            {testFiles[selectedStep.test_procedures_id]?.length > 0 ? (
              <div className="file-list">
                {testFiles[selectedStep.test_procedures_id].map(
                  (file, fileIndex) => (
                    <div key={fileIndex} className="file-item">
                      {file.file_url &&
                      /\.(jpg|jpeg|png|gif)$/i.test(
                        file.file_testcase_name
                      ) ? (
                        <div className="image-container">
                          <img
                            src={file.file_url}
                            alt={file.file_testcase_name}
                            className="preview-image"
                          />
                        </div>
                      ) : (
                        <p>📄 {file.file_testcase_name}</p>
                      )}
                      <div className="file-actions">
                        <a
                          href={file.file_url}
                          download={file.file_testcase_name}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <button className="download-btn">⬇ Download</button>
                        </a>
                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDeleteFile(
                              selectedStep.test_procedures_id,
                              fileIndex
                            )
                          }
                        >
                          ❌ Delete
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p>No files uploaded for this step.</p>
            )}
            <button className="close-btn" onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestExecution;