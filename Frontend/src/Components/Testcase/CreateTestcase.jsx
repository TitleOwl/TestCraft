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
  const [customTestType, setCustomTestType] = useState("");
  const [priority, setPriority] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [loggedInUser, setLoggedInUser] = useState("");
  const [implementFiles, setImplementFiles] = useState([]);
  const [selectedImplement, setSelectedImplement] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Alert state
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState("success");
  const [alertMessage, setAlertMessage] = useState("");

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
      try {
        const response = await axios.get("http://localhost:3001/implementrelation");
        setImplementFiles(response.data.data || []);
      } catch (error) { 
        console.error("Error fetching implementation files:", error);
        showAlertMessage("error", "Failed to load implementation files. Please try again.");
      }
    };
    fetchImplementFiles();
  }, []);

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
        navigate(`/CreateTestcase?project_id=${projectId}`);
      }
    }, 1500);
  };

  const handleCreateTestCase = async () => {
    // Form validation
    if (!title || !description || !testType || !priority) {
      setError("Please fill in all required fields.");
      showAlertMessage("warning", "Please fill in all required fields.");
      return;
    }

    // Implement validation
    if (!selectedImplement || selectedImplement.length === 0) {
      setError("Please select at least one implement.");
      showAlertMessage("warning", "Please select at least one implement.");
      return;
    }

    // Extract implement IDs from selected options
    const selectedIds = selectedImplement.map(option => option.value);
    const implementIdJsonString = JSON.stringify(selectedIds);

    // Prepare testcase data
    const testCaseData = {
      testcase_name: title,
      testcase_des: description,
      testcase_type: testType === "Other" ? customTestType : testType,
      testcase_priority: priority,
      testcase_by: loggedInUser,
      testcase_at: completionDate,
      testcase_status: "WORKING",
      project_id: projectId,
      implement_id: implementIdJsonString,
    };

    setIsSubmitting(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:3001/testcases", testCaseData);

      if (response.status === 201) {
        const { testcase_id } = response.data;
        
        // Add history record
        await axios.post("http://localhost:3001/addHistoryTestcase", {
          testcase_id,
          testcase_status: "WORKING",
        });

        // Reset form
        setTitle("");
        setDescription("");
        setTestType("");
        setCustomTestType("");
        setPriority("");
        setCompletionDate("");
        setSelectedImplement([]);

        // Show success message and redirect
        showAlertMessage("success", "Test Case created successfully!");
      } else {
        console.warn("Test case creation responded with status:", response.status);
        showAlertMessage("warning", `Test case created, but received unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error creating test case:", error);
      setError(error.response?.data?.message || "Failed to create test case. Please try again.");
      showAlertMessage("error", `Failed to create test case: ${error.response?.data?.message || error.message}`);
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
          <FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" />
          Select Code Component
        </label>
        <Select
          className="tc-create-select-multi"
          classNamePrefix="tc-select"
          isMulti
          options={implementFiles.map(item => ({
            value: item.implement_id,
            label: `📄 ${item.implement_filename} (ID: ${item.implement_id})`
          }))}
          value={selectedImplement}
          onChange={handleSelectChange}
          placeholder="Select one or more Code Component..."
          closeMenuOnSelect={false}
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
          <option value="Regression Test">Regression Test</option>
          <option value="Other">Other</option>
        </select>
        {testType === "Other" && (
          <input
            type="text"
            className="tc-create-input tc-create-other-input"
            placeholder="Specify other test type"
            value={customTestType}
            onChange={(e) => setCustomTestType(e.target.value)}
          />
        )}
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

      
      <div className="tc-create-button-group">
        <button 
          onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } })} 
          className="tc-create-button tc-create-button-cancel"
        >
          Cancel
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
      
      {/* Custom Alert Notification */}
      <div className={`tc-create-alert ${showAlert ? 'show' : ''}`}>
        <div className={`tc-create-alert-${alertType}`}>
          <div className="tc-create-alert-content">
            <div className="tc-create-alert-icon">
              {alertType === 'success' && <FontAwesomeIcon icon={faCheckCircle} />}
              {alertType === 'error' && <FontAwesomeIcon icon={faTimes} />}
              {alertType === 'warning' && <FontAwesomeIcon icon={faExclamationTriangle} />}
            </div>
            <div className="tc-create-alert-message">
              {alertMessage}
            </div>
          </div>
          <button className="tc-create-alert-close" onClick={() => setShowAlert(false)}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="tc-create-alert-progress"></div>
      </div>
    </div>
  );
};

export default CreateTestcase;