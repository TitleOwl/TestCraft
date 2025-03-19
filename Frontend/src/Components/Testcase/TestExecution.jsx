import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./testcase_css/TestExecution.css";

const TestExecution = () => {
  const { testcaseId } = useParams();
  const [testProcedures, setTestProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testSteps, setTestSteps] = useState([]);
  const [testCase, setTestCase] = useState({});
  const [testFiles, setTestFiles] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);

  const statusOptions = ["Passed", "Failed", "In Progress"];

  useEffect(() => {
    const fetchTestProceduresAndFiles = async () => {
        if (!testcaseId) return;

        setLoading(true);
        try {
            // ดึงข้อมูล Test Procedures
            const response = await axios.get(`http://localhost:3001/api/test_procedures/${testcaseId}`);
            console.log("Fetched data:", response.data); // Debugging

            if (response.data.length > 0) {
                setTestProcedures(response.data);
                setTestSteps(response.data);
                setTestCase({
                    testcase_id: response.data[0].testcase_id,
                    testcase_at: response.data[0].testcase_at,
                    testcase_name: response.data[0].testcase_name || "No Name",
                });

                // ดึงข้อมูลไฟล์ของแต่ละ Test Step
                const filesMap = {};
                await Promise.all(
                    response.data.map(async (step) => {
                        try {
                            const fileResponse = await axios.get(
                                `http://localhost:3001/api/get_test_files/${step.test_procedures_id}`
                            );
                            filesMap[step.test_procedures_id] = fileResponse.data;
                        } catch (error) {
                            console.warn(`No files found for step ${step.test_procedures_id}, setting empty array.`);
                            filesMap[step.test_procedures_id] = []; // ✅ แก้ให้เซ็ตเป็น array ว่าง
                        }
                    })
                );

                setTestFiles(filesMap);
            }
        } catch (error) {
            console.error("Error fetching test procedures:", error);
            setError("Failed to load test procedures");
        } finally {
            setLoading(false);
        }
    };

    fetchTestProceduresAndFiles();
}, [testcaseId]);

  if (loading) return <p>Loading test procedures...</p>;
  if (error) return <p>{error}</p>;

  const handleStatusChange = (index, event) => {
    setTestSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index ? { ...step, test_status: event.target.value } : step
      )
    );
  };

  const handleActualResultChange = (index, event) => {
    setTestSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index ? { ...step, actual_result: event.target.value } : step
      )
    );
  };

  const handleSave = async () => {
    try {
      await axios.post("http://localhost:3001/api/update_test_execution", { testSteps });
      alert("Test Execution saved successfully!");
    } catch (error) {
      console.error("Error saving test execution:", error);
    }
  };

  const handleFileChange = async (index, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("test_procedures_id", testSteps[index].test_procedures_id);
    formData.append("testcase_id", testCase.testcase_id);

    try {
      const response = await axios.post(
        "http://localhost:3001/api/upload_test_file",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert("File uploaded successfully!");

      setTestSteps((prevSteps) => {
        const updatedSteps = [...prevSteps];
        updatedSteps[index] = {
          ...updatedSteps[index],
          files: [...(updatedSteps[index].files || []), response.data],
        };
        return updatedSteps;
      });

      closeModal();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("File upload failed!");
    }
  };

  const handleDeleteFile = async (test_procedures_id, fileIndex) => {
    const fileName = testFiles[test_procedures_id][fileIndex].file_testcase_name;
    const encodedFileName = encodeURIComponent(fileName); // 🔹 แก้ปัญหาชื่อไฟล์ผิดพลาด

    if (!window.confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
        const response = await fetch(`/api/delete_test_file/${test_procedures_id}/${encodedFileName}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Server response:", text);
            throw new Error(`Failed to delete file: ${text}`);
        }

        setTestFiles((prevFiles) => {
            const updatedFiles = { ...prevFiles };
            updatedFiles[test_procedures_id] = updatedFiles[test_procedures_id].filter((_, i) => i !== fileIndex);
            return updatedFiles;
        });

        alert("File deleted successfully");
    } catch (error) {
        console.error("Error deleting file:", error);
        alert("An error occurred while deleting the file.");
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

  return (
    <div className="TestExecution">
      <button className="save-button" onClick={handleSave}>Save</button>
      <h3>Test Execution : TC-0{testCase?.testcase_id || "-" } {testCase?.testcase_name || "Unknown"}</h3>
<p><strong>Completion Date:</strong> {testCase?.testcase_at ? new Date(testCase.testcase_at).toLocaleDateString("th-TH") : "-"}</p>

      
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
              <tr key={step.test_procedures_id} data-status={step.test_status || "default"}>
                <td>{index + 1}</td>
                <td>{step.required_action}</td>
                <td>{step.expected_result}</td>
                <td>{step.prerequisite || "-"}</td>
                <td className={`status-cell ${step.test_status?.toLowerCase().replace(" ", "-") || ""}`}>
                  <select
                    value={step.test_status || ""}
                    onChange={(event) => handleStatusChange(index, event)}
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map((status, idx) => (
                      <option key={idx} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={step.actual_result || ""}
                    onChange={(event) => handleActualResultChange(index, event)}
                  />
                </td>
                <td>
                  <button onClick={() => openModal(step)}>View Files</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="no-data">No Test Procedures Found</td>
            </tr>
          )}
        </tbody>
      </table>

      {modalOpen && selectedStep && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>File Details</h3>
      <p><strong>Test Step:</strong> {selectedStep.required_action}</p>
      <input 
        type="file" 
        onChange={(event) => handleFileChange(testSteps.indexOf(selectedStep), event)} 
      />

      {testFiles[selectedStep.test_procedures_id]?.length > 0 ? (
        <div className="file-list">
          {testFiles[selectedStep.test_procedures_id].map((file, fileIndex) => (
            <div key={fileIndex} className="file-item">
              <p><strong>File:</strong> {file.file_testcase_name}</p>

              {/* แสดงรูปภาพ */}
              {file.file_url && /\.(jpg|jpeg|png)$/i.test(file.file_testcase_name) ? (
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

              {/* ปุ่มดาวน์โหลดและลบ */}
              <div className="file-actions">
                <a href={file.file_url} download={file.file_testcase_name}>
                  <button className="download-btn">⬇ Download</button>
                </a>
                <button className="delete-btn" onClick={() => handleDeleteFile(selectedStep.test_procedures_id, fileIndex)}>
                  ❌ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No file uploaded.</p>
      )}

      <button className="close-btn" onClick={closeModal}>Close</button>
    </div>
  </div>
)}


    </div>
  );
};

export default TestExecution;