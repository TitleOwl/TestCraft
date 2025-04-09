import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Select from "react-select"; // นำเข้า react-select
import "./testcase_css/CreateTestcase.css";

const CreateTestcase = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get("project_id");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [testType, setTestType] = useState("");
  const [customTestType, setCustomTestType] = useState("");
  const [priority, setPriority] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loggedInUser, setLoggedInUser] = useState("");
  const [implementFiles, setImplementFiles] = useState([]);
  const [selectedImplement, setSelectedImplement] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) setLoggedInUser(user.username);
  }, []);


  useEffect(() => {
    // Fetch implement files
    const fetchImplementFiles = async () => {
      try {
        const response = await axios.get('http://localhost:3001/implementrelation');
        setImplementFiles(response.data.data || []);
      } catch (error) {
        console.error('Error fetching implementation files:', error);
      }
    };
    fetchImplementFiles();
  }, []);


  const handleCreateTestCase = async () => {
    // --- ส่วน Validation เหมือนเดิม ---
    if (!title || !description || !testType || !priority || !completionDate) {
      alert("Please fill in all required fields.");
      return;
    }

    if (selectedImplement.length === 0) {
      alert("Please select at least one implement.");
      return;
    }
    // --- จบส่วน Validation ---

    // กำหนดค่า status เริ่มต้น
    const initialStatus = "WORKING";

    // เก็บข้อมูล Test Case ที่จะส่งไปสร้าง
    const testCaseData = {
      testcase_name: title,
      testcase_des: description,
      testcase_type: testType === "Other" ? customTestType : testType,
      testcase_priority: priority,
      testcase_by: loggedInUser, // ตรวจสอบว่า loggedInUser มีค่าถูกต้อง
      testcase_at: completionDate,
      testcase_status: initialStatus, // ใช้ status เริ่มต้น
      project_id: projectId, // ตรวจสอบว่า projectId มีค่าถูกต้อง
      implement_id: selectedImplement.length > 0 ? selectedImplement[0].value : null,
    };

    try {
      // 1. สร้าง Test Case
      const response = await axios.post("http://localhost:3001/testcases", testCaseData);

      if (response.status === 201) {
        const { testcase_id, test_execution_id } = response.data;
        console.log(`✅ Testcase ID: ${testcase_id}, Execution ID: ${test_execution_id}`);

        // 2. เพิ่ม History หลังจากสร้าง Test Case สำเร็จ
        try {
          // ***** แก้ไขตรงนี้: สร้าง historyData ให้มีข้อมูลครบตาม Backend ใหม่ *****
          const historyData = {
            testcase_id: testcase_id,              // ID ที่ได้จาก response
            testcase_name: testCaseData.testcase_name, // ดึงจาก testCaseData
            testcase_des: testCaseData.testcase_des,   // ดึงจาก testCaseData
            testcase_type: testCaseData.testcase_type,  // ดึงจาก testCaseData
            testcase_priority: testCaseData.testcase_priority, // ดึงจาก testCaseData
            testcase_by: testCaseData.testcase_by,      // ดึงจาก testCaseData
            testcase_status: initialStatus,         // Status เริ่มต้น
            project_id: testCaseData.project_id,      // ดึงจาก testCaseData
            implement_id: testCaseData.implement_id   // ดึงจาก testCaseData (อาจเป็น null)
          };
          // ***** สิ้นสุดการแก้ไข *****

          const historyResponse = await axios.post("http://localhost:3001/addHistoryTestcase", historyData); // ส่ง historyData ที่มีข้อมูลครบ

          if (historyResponse.status === 201) {
            console.log(`📜 History added successfully for testcase ID: ${testcase_id}`);
            alert("Test Case, Execution, and History created successfully!"); // แจ้งเตือนสำเร็จทั้งหมด
            navigate(`/Dashboard?project_id=${projectId}`); // นำทางหลังจากทุกอย่างสำเร็จ
          } else {
            // กรณี History เพิ่มไม่สำเร็จ (แต่ Test Case สร้างสำเร็จแล้ว)
            console.warn(`⚠️ Test Case created (ID: ${testcase_id}), but failed to add history. Status: ${historyResponse.status}`);
            alert(`Test Case and Execution created, but failed to record history (Status: ${historyResponse.status}).`);
            navigate(`/Dashboard?project_id=${projectId}`); // ยังคงนำทางไปหน้า Dashboard
          }
        } catch (historyError) {
          // กรณีเกิด Error ตอนเรียก API เพิ่ม History
          console.error("Error adding test case history:", historyError);
          let historyErrorMessage = historyError.message;
          if (historyError.response) {
              // ถ้ามี response จาก server ให้ใช้ message จาก server ถ้ามี
              historyErrorMessage = `Server responded with status ${historyError.response.status}: ${historyError.response.data?.message || historyErrorMessage}`;
          }
          alert(`Test Case and Execution created, but failed to record history. Error: ${historyErrorMessage}`);
          navigate(`/Dashboard?project_id=${projectId}`); // ยังคงนำทางไปหน้า Dashboard
        }

      } else {
         // กรณีสร้าง Test Case ไม่สำเร็จตั้งแต่แรก (response.status ไม่ใช่ 201)
         // axios ปกติจะ throw error สำหรับ status ที่ไม่ใช่ 2xx
         console.error("Failed to create test case, status:", response.status);
         alert(`Failed to create test case. Status: ${response.status}`);
      }
    } catch (error) {
      // กรณีเกิด Error ตอนเรียก API สร้าง Test Case
      console.error("Error creating test case:", error);
      // ตรวจสอบว่าเป็น error จาก axios response หรือไม่ เพื่อแสดงข้อมูลที่เป็นประโยชน์มากขึ้น
      if (error.response) {
         alert(`Failed to create test case. Server responded with status ${error.response.status}: ${error.response.data?.message || 'No details'}`);
      } else if (error.request) {
         alert("Failed to create test case. No response received from server. Please check network or server status.");
      } else {
         alert(`Failed to create test case. Error: ${error.message}`);
      }
    }
  };
  

  const handleSelectChange = (selectedOptions) => {
    setSelectedImplement(selectedOptions);
  };

  return (
    <div className="create-testcase">
      <h2>Create Test Case</h2>

      {[{ label: "Title", value: title, setter: setTitle },
      { label: "Description", value: description, setter: setDescription }].map(({ label, value, setter }) => (
        <div key={label} className="create-testcase-form-group">
          <label>{label}:</label>
          <input type="text" value={value} onChange={(e) => setter(e.target.value)} />
        </div>
      ))}

      <div className="create-testcase-form-group">
        <label>Test Type:</label>
        <select value={testType} onChange={(e) => setTestType(e.target.value)}>
          <option value="">Select Test Type</option>
          <option value="Functional Testing">Unit Test</option>
          <option value="Non-Functional Testing">Integration Test</option>
          <option value="Regression Testing">System Test</option>
          <option value="Performance Testing">Acceptance Test</option>
          <option value="Other">Other</option>
        </select>
        {testType === "Other" && <input type="text" placeholder="Specify other test type" value={customTestType} onChange={(e) => setCustomTestType(e.target.value)} />}
      </div>

      <div className="create-testcase-form-group">
        <label>Priority:</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Select Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="create-testcase-form-group">
        <label>Test Completion Date:</label>
        <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
      </div>

      <div className="create-testcase-form-group">
        <label htmlFor="implementSelect">Select Implement (Multiple):</label>
        <Select
          id="implementSelect"
          isMulti // ใช้ isMulti เพื่อให้เลือกหลายค่าได้
          options={implementFiles.map(item => ({
            value: item.implement_id,
            label: `${item.implement_filename} (ID: ${item.implement_id})`
          }))}
          value={selectedImplement} // แสดงค่าที่เลือก
          onChange={handleSelectChange} // จัดการเมื่อมีการเปลี่ยนแปลง
        />
      </div>

      <div className="create-testcase-button-group">
        <button onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } })} className="create-testcase-cancel-button">Cancel</button>
        <button onClick={handleCreateTestCase} className="create-testcase-save-button">Create</button>
      </div>
    </div>
  );
};

export default CreateTestcase;
