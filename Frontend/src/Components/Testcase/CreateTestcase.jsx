import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import { toast } from "react-toastify";
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
  const [loggedInUser, setLoggedInUser] = useState("");
  const [implementFiles, setImplementFiles] = useState([]);
  // selectedImplement เก็บ Array ของ { value, label } objects ที่ถูกเลือก
  const [selectedImplement, setSelectedImplement] = useState([]);

  // ดึง username (เหมือนเดิม)
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) { setLoggedInUser(storedUsername); }
  }, []);

  // ดึง implement list (เหมือนเดิม)
  useEffect(() => {
    const fetchImplementFiles = async () => {
      try {
        const response = await axios.get("http://localhost:3001/implementrelation", {
          params: {
            project_id: projectId,
          }
        });
        setImplementFiles(response.data.data || []);
      } catch (error) {
        console.error("Error fetching implementation files:", error);
      }
    };
    if (projectId) {
      fetchImplementFiles();
    }
  }, [projectId]);


  // --- *** แก้ไขฟังก์ชันนี้ *** ---
  const handleCreateTestCase = async () => {
    if (!title || !description || !testType || !priority || !completionDate) {
      toast.warning("Please fill in all required fields.");
      return;
    }

    // Validation ยังคงเดิม: ต้องเลือกอย่างน้อย 1 implement
    if (!selectedImplement || selectedImplement.length === 0) {
      toast.warning("Please select at least one implement.");
      return;
    }

    // --- *** ส่วนแก้ไข การเตรียม implement_id *** ---
    // 1. ดึงเฉพาะ value (ID) จาก object ใน selectedImplement array
    const selectedIds = selectedImplement.map(option => option.value);

    // 2. แปลง array ของ ID เป็น JSON string
    const implementIdJsonString = JSON.stringify(selectedIds);
    // --- *** จบส่วนแก้ไข *** ---

    // เตรียมข้อมูลที่จะส่ง โดยใช้ JSON string ที่ได้
    const testCaseData = {
      testcase_name: title,
      testcase_des: description,
      testcase_type: testType === "Other" ? customTestType : testType,
      testcase_priority: priority,
      testcase_by: loggedInUser,
      testcase_at: completionDate,
      testcase_status: "WORKING",
      project_id: projectId,
      implement_id: implementIdJsonString, // <-- ใช้ JSON string ที่สร้างขึ้น
    };

    console.log("Creating Test Case with data:", testCaseData); // Log ข้อมูลก่อนส่ง

    try {
      const response = await axios.post("http://localhost:3001/testcases", testCaseData);

      if (response.status === 201) {
        const { testcase_id } = response.data;
        console.log(`✅ Testcase ID Created: ${testcase_id}`);

        // บันทึก history (เหมือนเดิม)
        await axios.post("http://localhost:3001/addHistoryTestcase", {
          testcase_id,
          testcase_status: "WORKING",
        });

        toast.success("Test Case created successfully!", { // ปรับข้อความเล็กน้อย
          autoClose: 1500, // ปรับเวลาตามต้องการ
          onClose: () => {
            navigate(`/Dashboard?project_id=${projectId}`, {
              state: { selectedSection: "Testcase" }
            });
          }
        });
      } else {
        // จัดการกรณีที่ status ไม่ใช่ 201 แต่ไม่ error (อาจจะไม่เกิดบ่อยกับ POST)
        console.warn("Test case creation responded with status:", response.status);
        toast.warning(`Test case created, but received status: ${response.status}`);
        navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } });
      }
    } catch (error) {
      console.error("❌ Error creating test case:", error);
      toast.error(`Failed to create test case: ${error.response?.data?.message || error.message}`, {
        toastId: "create-error-toast", // ใช้ ID ป้องกันการซ้ำซ้อน
      });
    }
  };
  // --- *** จบการแก้ไขฟังก์ชัน *** ---

  // Handler สำหรับ Select (เหมือนเดิม)
  const handleSelectChange = (selectedOptions) => {
    // selectedOptions คือ array ของ {value, label} ที่ถูกเลือก
    setSelectedImplement(selectedOptions || []); // ถ้าไม่มีอะไรเลือก ให้เป็น array ว่าง
  };

  // --- Render JSX (เหมือนเดิม) ---
  return (
    <div className="create-testcase">
      <h2>Create Test Case</h2>

      {/* Input fields */}
      {[{ label: "Title", value: title, setter: setTitle },
      { label: "Description", value: description, setter: setDescription }].map(({ label, value, setter }) => (
        <div key={label} className="create-testcase-form-group">
          <label>{label}:</label>
          <input type="text" value={value} onChange={(e) => setter(e.target.value)} />
        </div>
      ))}

      {/* Test Type */}
      <div className="create-testcase-form-group">
        <label>Test Type:</label>
        <select value={testType} onChange={(e) => setTestType(e.target.value)}>
          <option value="">Select Test Type</option>
          <option value="Unit Test">Unit Test</option>
          <option value="Integration Test">Integration Test</option>
          <option value="System Test">System Test</option>
          <option value="Acceptance Test">Acceptance Test</option>
          <option value="Other">Other</option>
        </select>
        {testType === "Other" && (
          <input
            type="text"
            placeholder="Specify other test type"
            value={customTestType}
            onChange={(e) => setCustomTestType(e.target.value)}
          />
        )}
      </div>

      {/* Priority */}
      <div className="create-testcase-form-group">
        <label>Priority:</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Select Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Completion Date */}
      <div className="create-testcase-form-group">
        <label>Test Completion Date:</label>
        <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
      </div>

      {/* Implement Select */}
      <div className="create-testcase-form-group">
        <label htmlFor="implementSelect">Select Implement (Multiple):</label>
        <Select
          id="implementSelect"
          isMulti // เปิดใช้งาน multi-select
          options={implementFiles.map(item => ({
            value: item.implement_id,
            label: `${item.implement_filename} (ID: ${item.implement_id})`
          }))}
          value={selectedImplement} // ผูกกับ state ที่เป็น array
          onChange={handleSelectChange} // ใช้ handler ที่รับ array
          placeholder="Select one or more implements..."
          closeMenuOnSelect={false} // ไม่ปิดเมนูเมื่อเลือกเสร็จ (เหมาะกับ multi-select)
        />
      </div>

      {/* Buttons */}
      <div className="create-testcase-button-group">
        <button onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } })} className="create-testcase-cancel-button">
          Cancel
        </button>
        <button onClick={handleCreateTestCase} className="create-testcase-save-button">
          Create
        </button>
      </div>
    </div>
  );
};

export default CreateTestcase;
