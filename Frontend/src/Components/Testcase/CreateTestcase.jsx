import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./testcase_css/CreateTestcase.css"; // Make sure this path is correct
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimes,
  faExclamationTriangle,
  faSpinner,
  faVial,
  faCalendarAlt,
  faTag,
  faFileAlt,
  faLevelUpAlt
} from '@fortawesome/free-solid-svg-icons';

const CreateTestcase = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get("project_id");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [testType, setTestType] = useState("");
  const [priority, setPriority] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [loggedInUser, setLoggedInUser] = useState("");
  const [implementFiles, setImplementFiles] = useState([]);
  const [selectedImplement, setSelectedImplement] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");



  // Fetch username
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setLoggedInUser(storedUsername);
    }
  }, []);

  // Fetch implement files
  useEffect(() => {
    const fetchImplementFiles = async () => {
      // 1. Check if projectId is available before fetching
      if (!projectId) {
        console.log("No Project ID found, cannot fetch implementation files.");
        setImplementFiles([]); // Ensure list is empty if no project ID
        return; // Stop execution if no project ID
      }

      try {
        console.log(`Workspaceing implements for project_id: ${projectId}`); // Log which project is being fetched
        // 2. Add 'params' to the axios request to filter by project_id
        const response = await axios.get("http://localhost:3001/implementrelation", {
          params: {
            project_id: projectId // Pass projectId to the backend
          }
        });
        // 3. Set the state with the potentially filtered data
        setImplementFiles(response.data.data || []);
        if (!response.data.data || response.data.data.length === 0) {
          console.log("No implementation files found for this project.");
          // Optionally inform the user, though the empty Select handles it
        }
      } catch (error) {
        console.error("Error fetching implementation files:", error);
        showAlertMessage("error", "Failed to load implementation files. Please try again.");
        setImplementFiles([]); // Clear list on error
      }
    };

    fetchImplementFiles();
  }, [projectId]); // 4. Add projectId to the dependency array

  // Alert function
  const showAlertMessage = (type, message) => {
    setAlertType(type);
    setAlertMessage(message);
    setShowAlert(true);

    // Hide alert after 5 seconds
    setTimeout(() => {
      setShowAlert(false);

      // If success alert, redirect after showing message
      if (type === "success") {
        navigate(`/Dashboard?project_id=${projectId}`, {
          state: { selectedSection: "Testcase" },
        });
      }
    }, 3000);
  };

  // Make sure toast is imported:
  // import { toast } from 'react-toastify';

  const handleCreateTestCase = async () => {
    // --- 1. การตรวจสอบฟิลด์พื้นฐาน ---
    // ใช้ .trim() เพื่อตรวจสอบว่าไม่ได้กรอกแค่ช่องว่าง
    if (!title.trim() || !description.trim() || !testType || !priority || !completionDate) {
      toast.warning("Please fill in all required fields.");
      return;
    }

    // --- (ลบการตรวจสอบฟิลด์ "Other" Test Type ออก) ---
    // ไม่จำเป็นต้องเช็ค customTestType อีกต่อไป

    // --- 2. การตรวจสอบ Implement ---
    if (!selectedImplement || selectedImplement.length === 0) {
      toast.warning("Please select at least one implement.");
      return;
    }

    // --- 3. เตรียมข้อมูล ---
    const selectedIds = selectedImplement.map(option => option.value);
    const implementIdJsonString = JSON.stringify(selectedIds);

    // สร้าง Object ข้อมูล Test Case
    // ใช้ค่าจาก testType state โดยตรง ไม่ว่าจะเป็นค่าอะไรก็ตาม (รวมถึง "Other")
    const testCaseData = {
      testcase_name: title.trim(),
      testcase_des: description.trim(),
      testcase_type: testType, // <--- ใช้ testType โดยตรง
      testcase_priority: priority,
      testcase_by: loggedInUser, // ควรเช็คว่ามีค่า
      testcase_at: completionDate,
      testcase_status: "WORKING",
      project_id: projectId,
      implement_id: implementIdJsonString,
    };

    setIsSubmitting(true);

    // --- 4. ส่งข้อมูลไป Backend ---
    try {
      console.log("Sending Test Case Data:", testCaseData);
      const response = await axios.post("http://localhost:3001/testcases", testCaseData);

      if (response.status === 201) {
        const { testcase_id } = response.data;
        console.log(`✅ Testcase ID Created: ${testcase_id}`);

        // (Optional: เพิ่ม History ถ้า Backend ไม่ได้ทำ)
        // await axios.post("http://localhost:3001/addHistoryTestcase", { ... });

        // Reset ฟอร์ม
        setTitle("");
        setDescription("");
        setTestType("");
        // setCustomTestType(""); // --- ลบการ Reset นี้ออก ---
        setPriority("");
        setCompletionDate("");
        setSelectedImplement([]);

        toast.success("Test Case created successfully!", {
          // ... (toast options)
          onClose: () => {
            navigate(`/Dashboard?project_id=${projectId}`, {
              state: { selectedSection: "Testcase" },
            });
          }
        });

      } else {
        console.warn("Test case creation responded with status:", response.status);
        toast.warning(`Test case created, but received unexpected status: ${response.status}`);
        // Redirect หรือไม่ ขึ้นอยู่กับ logic
        navigate(`/Dashboard?project_id=${projectId}`, {
          state: { selectedSection: "Testcase" },
        });
      }
    } catch (error) {
      console.error("Error creating test case:", error.response || error);
      const errMsg = error.response?.data?.message || "Failed to create test case. Please try again.";
      toast.error(`Failed to create test case: ${errMsg}`, {
        // ... (toast error options)
        toastId: "create-error-toast"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Select component
  const handleSelectChange = (selectedOptions) => {
    setSelectedImplement(selectedOptions || []);
  };

  return (
    <div className="tc-create-container">
      <h2 className="tc-create-header">
        <FontAwesomeIcon icon={faVial} className="tc-create-header-icon" />
        Create Test Case
      </h2>

      {error && <div className="tc-create-error">{error}</div>}

      <div className="tc-create-form-group">
        <label className="tc-create-label">
          <FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" />
          Title
        </label>
        <input
          type="text"
          className="tc-create-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter test case title"
        />
      </div>

      <div className="tc-create-form-group">
        <label className="tc-create-label">
          <FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" />
          Description
        </label>
        <textarea
          className="tc-create-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter detailed test case description"
          rows="4"
        />
      </div>

      <div className="tc-create-form-group">
        <label className="tc-create-label">
          <FontAwesomeIcon icon={faTag} className="tc-create-label-icon" />
          Test Type
        </label>
        <select
          className="tc-create-select"
          value={testType}
          onChange={(e) => setTestType(e.target.value)}
        >
          <option value="">Select Test Type</option>
          <option value="Unit Test">Unit Test</option>
          <option value="Integration Test">Integration Test</option>
          <option value="System Test">System Test</option>
          <option value="Acceptance Test">Acceptance Test</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="tc-create-form-group">
        <label className="tc-create-label">
          <FontAwesomeIcon icon={faLevelUpAlt} className="tc-create-label-icon" />
          Priority
        </label>
        <select
          className="tc-create-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">Select Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="tc-create-form-group">
        <label className="tc-create-label">
          <FontAwesomeIcon icon={faCalendarAlt} className="tc-create-label-icon" />
          Test Completion Date
        </label>
        <input
          type="date"
          className="tc-create-input"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
        />
      </div>

      <div className="tc-create-form-group">
        <label className="tc-create-label">
          <FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" />
          Select Implement (Multiple)
        </label>
        <Select
          className="tc-create-select-multi"
          classNamePrefix="tc-select"
          isMulti
          options={implementFiles.map(item => ({
            value: item.implement_id,
            label: `${item.implement_filename} (ID: ${item.implement_id})`
          }))}
          value={selectedImplement}
          onChange={handleSelectChange}
          placeholder="Select one or more implements..."
          closeMenuOnSelect={false}
        />
      </div>

      <div className="tc-create-button-group">
        <button
          onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } })}
          className="tc-create-button tc-create-button-cancel"
        >
          Back to Test Case
        </button>
        <button
          onClick={handleCreateTestCase}
          className="tc-create-button tc-create-button-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="tc-create-spinner" /> Creating...
            </>
          ) : (
            "Create"
          )}
        </button>
      </div>

    </div>
  );
};

export default CreateTestcase;