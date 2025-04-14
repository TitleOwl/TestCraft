import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./testcase_css/TestExecution.css"; // ตรวจสอบว่า import CSS ถูกต้อง
import { useNavigate } from "react-router-dom";

const TestExecution = () => {
  const { testcaseId } = useParams();
  const [testProcedures, setTestProcedures] = useState([]); // อาจจะไม่จำเป็นต้องใช้ ถ้า testSteps พอ
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testSteps, setTestSteps] = useState([]); // State หลักสำหรับข้อมูล steps
  const [testCase, setTestCase] = useState({}); // State สำหรับข้อมูล Test Case ทั่วไป
  const [testFiles, setTestFiles] = useState({}); // State สำหรับเก็บไฟล์ของแต่ละ step (key: test_procedures_id)
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null); // State สำหรับ step ที่ถูกเลือกเพื่อเปิด modal
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");
  const statusOptions = ["Passed", "Failed", "In Progress"];

  // useEffect สำหรับดึงข้อมูลเมื่อ component โหลด หรือ testcaseId เปลี่ยน
  useEffect(() => {
    const fetchTestProceduresAndFiles = async () => {
      if (!testcaseId) return; // ถ้าไม่มี testcaseId ไม่ต้องทำอะไร

      setLoading(true); // เริ่มโหลด
      try {
        // 1. ดึงข้อมูล Test Procedures (หรือ Test Steps)
        const response = await axios.get(`http://localhost:3001/api/test_procedures/${testcaseId}`);
        console.log("Fetched test steps data:", response.data);

        if (response.data && response.data.length > 0) {
          // ตั้งค่า state testSteps และ testCase
          setTestSteps(response.data);
          setTestCase({
            testcase_id: response.data[0].testcase_id,
            testcase_at: response.data[0].testcase_at,
            testcase_name: response.data[0].testcase_name || "No Name",
          });

          // 2. ดึงข้อมูลไฟล์ของแต่ละ Test Step ที่ได้มา
          const filesMap = {}; // สร้าง object ว่างเพื่อเก็บไฟล์
          await Promise.all( // รอให้การดึงไฟล์ทั้งหมดเสร็จสิ้น
            response.data.map(async (step) => {
              try {
                // เรียก API เพื่อดึงไฟล์ของ step ปัจจุบัน
                const fileResponse = await axios.get(
                  `http://localhost:3001/api/get_test_files/${step.test_procedures_id}`
                );
                // เก็บข้อมูลไฟล์ไว้ใน filesMap โดยใช้ test_procedures_id เป็น key
                filesMap[step.test_procedures_id] = fileResponse.data || []; // ถ้าไม่มีข้อมูลไฟล์ ให้เป็น array ว่าง
              } catch (fileError) {
                // ถ้า API คืนค่า error (เช่น 404 Not Found)
                console.warn(`No files found or error fetching files for step ${step.test_procedures_id}. Setting empty array.`);
                filesMap[step.test_procedures_id] = []; // กำหนดเป็น array ว่าง
              }
            })
          );
          // ตั้งค่า state testFiles ด้วยข้อมูลไฟล์ที่ดึงมาได้ทั้งหมด
          setTestFiles(filesMap);
          console.log("Fetched files map:", filesMap);

        } else {
          // กรณีไม่พบข้อมูล test steps
          setTestSteps([]);
          setTestFiles({});
          console.warn("No test procedures found for testcaseId:", testcaseId);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load test data. Please try again."); // แสดงข้อความผิดพลาดที่ชัดเจนขึ้น
      } finally {
        setLoading(false); // สิ้นสุดการโหลด ไม่ว่าจะสำเร็จหรือล้มเหลว
      }
    };

    fetchTestProceduresAndFiles(); // เรียกฟังก์ชันดึงข้อมูล
  }, [testcaseId]); // Dependency array: ให้ re-run effect นี้เมื่อ testcaseId เปลี่ยน

  // แสดงสถานะ Loading หรือ Error
  if (loading) return <p>Loading test procedures...</p>;
  if (error) return <p>{error}</p>;

  // --- Handler Functions ---

  // อัปเดตสถานะ Test Status ของ step
  const handleStatusChange = (index, event) => {
    const newStatus = event.target.value;
    setTestSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index ? { ...step, test_status: newStatus } : step
      )
    );
  };

  // อัปเดต Actual Result ของ step
  const handleActualResultChange = (index, event) => {
    const newActualResult = event.target.value;
    setTestSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index ? { ...step, actual_result: newActualResult } : step
      )
    );
  };

  // บันทึกข้อมูล Test Execution ทั้งหมด (สถานะ, ผลลัพธ์)
  const handleSave = async () => {
    try {
      // ส่งเฉพาะข้อมูลที่จำเป็น หรือส่ง testSteps ทั้งหมดก็ได้ ขึ้นอยู่กับ backend API
      await axios.post("http://localhost:3001/api/update_test_execution", { testSteps });
      alert("Test Execution saved successfully!");
    } catch (error) {
      console.error("Error saving test execution:", error);
      alert("Failed to save test execution."); // แสดงข้อความเมื่อบันทึกไม่สำเร็จ
    }
  };

  // จัดการเมื่อมีการเลือกไฟล์ใน Modal
  const handleFileChange = async (index, event) => { // index อาจจะไม่จำเป็นแล้วถ้าใช้ selectedStep
    const file = event.target.files[0];
    if (!file || !selectedStep) {
      console.warn("No file selected or no step selected.");
      return; // ไม่มีไฟล์ หรือ ไม่มี selectedStep
    }

    const currentProcedureId = selectedStep.test_procedures_id; // ใช้ ID จาก selectedStep โดยตรง

    const formData = new FormData();
    formData.append("file", file);
    formData.append("test_procedures_id", currentProcedureId);
    formData.append("testcase_id", testCase.testcase_id);

    console.log("Uploading file for procedure:", currentProcedureId);

    try {
      const response = await axios.post(
        "http://localhost:3001/api/upload_test_file",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      console.log("File upload response:", response.data);

      // สมมติว่า response.data คือ object ข้อมูลไฟล์ใหม่ที่ถูกต้อง
      const newFileInfo = response.data;

      // --- อัปเดต State testFiles เพื่อให้ UI อัปเดตทันที ---
      setTestFiles((prevFiles) => {
        const currentFiles = prevFiles[currentProcedureId] || [];
        const updatedFileList = [...currentFiles, newFileInfo];
        return {
          ...prevFiles,
          [currentProcedureId]: updatedFileList,
        };
      });
      // ---------------------------------------------------

      alert("File uploaded successfully!");
      event.target.value = null; // เคลียร์ค่า input file

      // ไม่ต้องปิด Modal เพื่อให้เห็นการเปลี่ยนแปลง
      // closeModal();

    } catch (error) {
      console.error("Error uploading file:", error.response?.data || error.message);
      alert(`File upload failed: ${error.response?.data?.message || error.message}`);
    }
  };

  // จัดการการลบไฟล์
  const handleDeleteFile = async (test_procedures_id, fileIndex) => {
    // ตรวจสอบว่ามีข้อมูลไฟล์ใน state ก่อนดำเนินการ
    if (!testFiles[test_procedures_id] || !testFiles[test_procedures_id][fileIndex]) {
      console.error("File data not found for deletion.");
      return;
    }

    const fileName = testFiles[test_procedures_id][fileIndex].file_testcase_name;
    const encodedFileName = encodeURIComponent(fileName);

    if (!window.confirm(`Are you sure you want to delete ${fileName}?`)) return;

    console.log(`Attempting to delete file: ${fileName} for procedure: ${test_procedures_id}`);

    try {
      // ใช้ Axios หรือ Fetch ก็ได้ (ตัวอย่างก่อนหน้าใช้ Fetch)
      const response = await axios.delete(`/api/delete_test_file/${test_procedures_id}/${encodedFileName}`);

      console.log("File delete response:", response.data);

      // --- อัปเดต State testFiles หลังลบสำเร็จ ---
      setTestFiles((prevFiles) => {
        const updatedFiles = { ...prevFiles };
        // Filter เอาไฟล์ที่ถูกลบออก (เทียบ index)
        updatedFiles[test_procedures_id] = updatedFiles[test_procedures_id].filter((_, i) => i !== fileIndex);
        return updatedFiles;
      });
      // ---------------------------------------

      alert("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error.response?.data || error.message);
      alert(`An error occurred while deleting the file: ${error.response?.data?.message || error.message}`);
    }
  };

  // เปิด Modal และตั้งค่า step ที่ถูกเลือก
  const openModal = (step) => {
    console.log("Opening modal for step:", step);
    setSelectedStep(step); // เก็บ object step ทั้งหมดไว้
    setModalOpen(true);
  };

  // ปิด Modal และล้างค่า step ที่ถูกเลือก
  const closeModal = () => {
    setModalOpen(false);
    setSelectedStep(null);
  };
  const handleBackClick = () => {
    navigate(`/ExecutionList?project_id=${projectId}`);
  };

  return (
    <div className="TestExecution">
      <button className="back-test-execution" onClick={handleBackClick}>
        ← Back
      </button>
      <button className="save-button-testexec" onClick={handleSave}>Save</button>
      <h3 className="test-exec">
        Test Execution : TC-0{testCase?.testcase_id || "-"} {testCase?.testcase_name || "Unknown"}
      </h3>
      <p className="completion-exec">
        <strong>Completion Date:</strong> {testCase?.testcase_at ? new Date(testCase.testcase_at).toLocaleDateString("th-TH") : "-"}
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
              <tr key={step.test_procedures_id} data-status={step.test_status || "default"}>
                <td>{index + 1}</td>
                {/* --- การเปลี่ยนแปลงเริ่มต้นที่นี่ --- */}
                {/* ใช้ dangerouslySetInnerHTML สำหรับ Required Action */}
                <td>
                  <div dangerouslySetInnerHTML={{ __html: step.required_action || '' }} />
                </td>
                {/* ใช้ dangerouslySetInnerHTML สำหรับ Expected Result */}
                <td>
                  <div dangerouslySetInnerHTML={{ __html: step.expected_result || '' }} />
                </td>
                {/* ใช้ dangerouslySetInnerHTML สำหรับ Prerequisite */}
                <td>
                  {/* แสดง '-' ถ้าไม่มีข้อมูล, หรือ render HTML ถ้ามี */}
                  {step.prerequisite ? (
                    <div dangerouslySetInnerHTML={{ __html: step.prerequisite }} />
                  ) : (
                    '-'
                  )}
                  {/* หรือถ้าต้องการให้ช่องว่างเมื่อไม่มี prerequisite: */}
                  {/* <div dangerouslySetInnerHTML={{ __html: step.prerequisite || '' }} /> */}
                </td>
                {/* --- การเปลี่ยนแปลงสิ้นสุดที่นี่ --- */}

                {/* คอลัมน์ที่เหลือเหมือนเดิม */}
                <td className={`status-cell ${step.test_status?.toLowerCase().replace(/\s+/g, "-") || ""}`}>
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

      {/* --- Modal Rendering Logic --- */}
      {modalOpen && selectedStep && (
        <div className="modal-overlay">
          <div className="modal-content">

            <h3>File Details</h3>
            {/* แสดง Step No. */}
            <p><strong>Step No:</strong> {testSteps.indexOf(selectedStep) !== -1 ? testSteps.indexOf(selectedStep) + 1 : '-'}</p>

            {/* Input สำหรับเลือกไฟล์ */}
            <input
              className="inputfile-testexec"
              type="file"
              // ส่ง index ไป handleFileChange (อาจจะไม่จำเป็นแล้วถ้าใช้ selectedStep)
              onChange={(event) => handleFileChange(testSteps.indexOf(selectedStep), event)}
              style={{ marginBottom: '15px' }} // เพิ่มระยะห่างด้านล่างเล็กน้อย
            />

            {/* ส่วนแสดงรายการไฟล์ */}
            {/* ใช้ optional chaining (?.) เพื่อป้องกัน error ถ้า selectedStep.test_procedures_id ไม่มีใน testFiles */}
            {testFiles[selectedStep.test_procedures_id]?.length > 0 ? (
              <div className="file-list">
                {testFiles[selectedStep.test_procedures_id].map((file, fileIndex) => (
                  <div key={fileIndex} className="file-item">
                    <p><strong>File:</strong> {file.file_testcase_name}</p>
                    {/* แสดงรูปภาพ */}
                    {file.file_url && /\.(jpg|jpeg|png|gif)$/i.test(file.file_testcase_name) ? ( // เพิ่ม .gif
                      <div className="image-container">
                        <img
                          src={file.file_url}
                          alt={file.file_testcase_name}
                          className="preview-image"
                        />
                      </div>
                    ) : (
                      <p>📄 {file.file_testcase_name}</p> // แสดงไอคอนเอกสารสำหรับไฟล์อื่น
                    )}
                    {/* ปุ่มดาวน์โหลดและลบ */}
                    <div className="file-actions">
                      <a href={file.file_url} download={file.file_testcase_name} target="_blank" rel="noopener noreferrer">
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
              <p>No file uploaded.</p> // แสดงเมื่อไม่มีไฟล์
            )}

            <button className="close-btn" onClick={closeModal}>Close</button>

          </div>
        </div>
      )}

    </div> // ปิด .TestExecution
  );
};

export default TestExecution;