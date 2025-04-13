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
  // const [customTestType, setCustomTestType] = useState(""); // ลบออกถ้าไม่ได้ใช้แล้ว
  const [priority, setPriority] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [loggedInUser, setLoggedInUser] = useState("");
  const [implementFiles, setImplementFiles] = useState([]);
  const [selectedImplement, setSelectedImplement] = useState([]); // State นี้จะเก็บ array of selected option objects
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
      if (!projectId) {
        console.log("No Project ID found, cannot fetch implementation files.");
        setImplementFiles([]);
        return;
      }
      try {
        console.log(`Workspaceing implements for project_id: ${projectId}`);
        const response = await axios.get("http://localhost:3001/implementrelation", {
          params: { project_id: projectId }
        });
        setImplementFiles(response.data.data || []);
        if (!response.data.data || response.data.data.length === 0) {
          console.log("No implementation files found for this project.");
        }
      } catch (error) {
        console.error("Error fetching implementation files:", error);
        // *** แก้ไข: showAlertMessage อาจจะไม่มีอยู่จริง ใช้ toast แทน ***
        toast.error("Failed to load implementation files. Please try again.");
        setImplementFiles([]);
      }
    };
    fetchImplementFiles();
  }, [projectId]);


  const handleCreateTestCase = async () => {
    // --- Form validation ---
    if (!title.trim() || !description.trim() || !testType || !priority || !completionDate) {
      toast.warning("Please fill in all required fields.");
      return;
    }
    if (!selectedImplement || selectedImplement.length === 0) {
      toast.warning("Please select at least one implement.");
      return;
    }

    // --- *** แก้ไข: ดึงข้อมูล ID และ Filename จาก selectedImplement *** ---
    const selectedImplementData = selectedImplement.map(option => ({
      id: option.value,           // implement_id อยู่ใน value
      filename: option.filename   // implement_filename ที่เราเพิ่มเข้าไปใน option object
    }));
    const implementDataJsonString = JSON.stringify(selectedImplementData); // แปลง array of objects เป็น JSON string
    // --- *** สิ้นสุดการแก้ไข *** ---

    // --- Prepare testcase data ---
    const testCaseData = {
      testcase_name: title.trim(),
      testcase_des: description.trim(),
      testcase_type: testType,
      testcase_priority: priority,
      testcase_by: loggedInUser,
      testcase_at: completionDate,
      testcase_status: "WORKING",
      project_id: projectId,
      implement_id: implementDataJsonString, // <<< ส่ง JSON string ของ [{id, filename}, ...]
    };

    setIsSubmitting(true);
    setError(""); // Clear previous errors

    try {
      console.log("Sending Test Case Data:", testCaseData);
      const response = await axios.post("http://localhost:3001/testcases", testCaseData);

      if (response.status === 201) {
        const { testcase_id } = response.data;
        console.log(`✅ Testcase ID Created: ${testcase_id}`);

        // Add history record
        await axios.post("http://localhost:3001/addHistoryTestcase", {
          testcase_id,
          testcase_status: "WORKING",
        });

        // --- Reset form fields ---
        setTitle("");
        setDescription("");
        setTestType("");
        setPriority("");
        setCompletionDate("");
        setSelectedImplement([]); // Reset Select component

        // --- Show success toast ---
        toast.success("Test Case created successfully!", {
          position: "top-right",
          autoClose: 2000,
          onClose: () => {
            navigate(`/Dashboard?project_id=${projectId}`, {
              state: { selectedSection: "Testcase" },
            });
          }
        });
      } else {
        console.warn("Test case creation responded with status:", response.status);
        toast.warning(`Test case created, but received unexpected status: ${response.status}`);
        navigate(`/Dashboard?project_id=${projectId}`, {
          state: { selectedSection: "Testcase" },
        });
      }
    } catch (error) {
      console.error("Error creating test case:", error.response || error);
      const errMsg = error.response?.data?.error || // ใช้ error จาก backend ถ้ามี
                     error.response?.data?.message ||
                     "Failed to create test case. Please try again.";
      setError(errMsg); // แสดง error บน UI (ถ้าต้องการ)
      toast.error(`Failed to create test case: ${errMsg}`, {
         toastId: "create-error-toast"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Select component (รับค่า selectedOptions ซึ่งเป็น array of option objects)
  const handleSelectChange = (selectedOptions) => {
    setSelectedImplement(selectedOptions || []); // เก็บ array of selected option objects ลง state
  };

  return (
    <div className="tc-create-container">
      <h2 className="tc-create-header">
        <FontAwesomeIcon icon={faVial} className="tc-create-header-icon" />
        Create Test Case
      </h2>

      {error && <div className="tc-create-error">{error}</div>} {/* แสดง Error ถ้ามี */}

      {/* Form Group: Title */}
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
          required // เพิ่ม required เพื่อการ validate ของ browser เบื้องต้น
        />
      </div>

      {/* Form Group: Description */}
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
          required
        />
      </div>

      {/* Form Group: Test Type */}
      <div className="tc-create-form-group">
        <label className="tc-create-label">
          <FontAwesomeIcon icon={faTag} className="tc-create-label-icon" />
          Test Type
        </label>
        <select
          className="tc-create-select"
          value={testType}
          onChange={(e) => setTestType(e.target.value)}
          required
        >
          <option value="">Select Test Type</option>
          <option value="Unit Test">Unit Test</option>
          <option value="Integration Test">Integration Test</option>
          <option value="System Test">System Test</option>
          <option value="Acceptance Test">Acceptance Test</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Form Group: Priority */}
      <div className="tc-create-form-group">
        <label className="tc-create-label">
          <FontAwesomeIcon icon={faLevelUpAlt} className="tc-create-label-icon" />
          Priority
        </label>
        <select
          className="tc-create-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          required
        >
          <option value="">Select Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Form Group: Completion Date */}
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
          required
        />
      </div>

      {/* Form Group: Select Implement */}
      <div className="tc-create-form-group">
        <label className="tc-create-label">
          <FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" />
          Select Implement (Multiple)
        </label>
        <Select
          className="tc-create-select-multi"
          classNamePrefix="tc-select"
          isMulti
          // --- *** แก้ไข: สร้าง options ให้มี value, label, และ filename *** ---
          options={implementFiles.map(item => ({
            value: item.implement_id,                          // ID สำหรับ value
            label: `${item.implement_filename} (ID: ${item.implement_id})`, // ข้อความสำหรับแสดงผล
            filename: item.implement_filename                   // <<< เพิ่ม filename เข้าไปใน object ของ option
          }))}
          // --- *** สิ้นสุดการแก้ไข *** ---
          value={selectedImplement}
          onChange={handleSelectChange} // onChange จะได้ array of selected option objects
          placeholder="Select one or more implements..."
          closeMenuOnSelect={false}
          required // เพิ่ม required (แต่อาจต้อง validate ด้วย JS เพิ่มเติมสำหรับ react-select)
        />
      </div>

      {/* Button Group */}
      <div className="tc-create-button-group">
        <button
          type="button" // กำหนด type="button" สำหรับปุ่มที่ไม่ใช่ submit หลัก
          onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } })}
          className="tc-create-button tc-create-button-cancel"
        >
          Back to Test Case
        </button>
        <button
          type="button" // เปลี่ยนเป็น type="button" และเรียก handleCreateTestCase ผ่าน onClick
          onClick={handleCreateTestCase}
          className="tc-create-button tc-create-button-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin className="tc-create-spinner" /> Creating... {/* แก้ spin เล็กน้อย */}
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