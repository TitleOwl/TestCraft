import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Select from "react-select"; // Ensure react-select is installed
// import { toast } from "react-toastify"; // Not used in provided code?
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
  // const [implementFiles, setImplementFiles] = useState([]); // Store raw data if needed elsewhere
  const [groupedImplementOptions, setGroupedImplementOptions] = useState([]); // State for unique options
  const [selectedImplement, setSelectedImplement] = useState([]); // Stores selected options { label, value }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Alert state
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState("success");
  const [alertMessage, setAlertMessage] = useState("");

  // Fetch username
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) { setLoggedInUser(storedUsername); }
  }, []);

  // --- Fetch and Process implement files ---
  useEffect(() => {
    const fetchAndProcessImplementFiles = async () => {
      try {
        // Fetch raw data (assuming it returns array like [{ implement_id, implement_filename, ... }])
        const response = await axios.get("http://localhost:3001/implementrelation"); // Might need adjustment based on backend
        const rawImplementFiles = response.data.data || [];

        // Group by filename and collect IDs
        const grouped = rawImplementFiles.reduce((acc, item) => {
          const filename = item.implement_filename;
          const id = item.implement_id;
          if (!filename || id == null) return acc; // Skip invalid entries

          if (!acc[filename]) {
            acc[filename] = {
              filename: filename,
              ids: new Set() // Use Set to automatically handle duplicate IDs for the same file
            };
          }
          acc[filename].ids.add(id);
          return acc;
        }, {});

        // Convert grouped data into options for react-select
        const options = Object.values(grouped).map(group => ({
          value: JSON.stringify(Array.from(group.ids).sort((a, b) => a - b)), // Store all IDs as a sorted JSON string array
          label: `📄 ${group.filename}` // Display only the filename
        })).sort((a,b) => a.label.localeCompare(b.label)); // Sort options alphabetically by label

        setGroupedImplementOptions(options);

      } catch (error) {
        console.error("Error fetching/processing implementation files:", error);
        showAlertMessage("error", "Failed to load Code Components. Please try again.");
      }
    };
    fetchAndProcessImplementFiles();
  }, []); // Runs once on mount

  // Alert function
  const showAlertMessage = (type, message) => {
    setAlertType(type); setAlertMessage(message); setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
      if (type === "success" && projectId) { // Redirect only on success and if projectId exists
        // Reset form state immediately BEFORE navigate to avoid stale state on quick return
         setTitle(""); setDescription(""); setTestType(""); setCustomTestType("");
         setPriority(""); setCompletionDate(""); setSelectedImplement([]); setError("");
         // Navigate back or to list page? Navigating back to create page as per original code.
         // Consider navigating to a list page instead: navigate(`/TestcaseList?project_id=${projectId}`);
         navigate(`/CreateTestcase?project_id=${projectId}`); // Original redirect behavior
      }
    }, 1500); // Increased timeout slightly
  };

  const handleCreateTestCase = async () => {
    if (!title || !description || !testType || (testType === "Other" && !customTestType) || !priority) { // Added check for customTestType
      setError("Please fill in all required fields (Title, Description, Test Type, Priority).");
      showAlertMessage("warning", "Please fill in all required fields.");
      return;
    }
    // Changed validation message to be more specific
    if (!selectedImplement || selectedImplement.length === 0) {
      setError("Please select at least one Code Component.");
      showAlertMessage("warning", "Please select at least one Code Component.");
      return;
    }

    // --- Extract and flatten ALL implement_ids from selected options ---
    let allSelectedImplementIds = [];
    selectedImplement.forEach(option => {
        try {
            const ids = JSON.parse(option.value); // Parse the string '[id1, id2]'
            if (Array.isArray(ids)) {
                allSelectedImplementIds = allSelectedImplementIds.concat(ids);
            }
        } catch (e) {
            console.error("Error parsing implement IDs from selected option:", option.value, e);
            // Handle error - maybe skip this option or show an error
        }
    });
    // Remove duplicates if any (though grouping should prevent this)
    const uniqueImplementIds = [...new Set(allSelectedImplementIds)];
    const implementIdJsonString = JSON.stringify(uniqueImplementIds.sort((a,b) => a - b)); // Save unique, sorted IDs as JSON string
    // --- End ID extraction ---


    const testCaseData = {
      testcase_name: title,
      testcase_des: description,
      testcase_type: testType === "Other" ? customTestType : testType,
      testcase_priority: priority,
      testcase_by: loggedInUser,
      testcase_at: completionDate || null, // Send null if empty
      testcase_status: "WORKING", // Default status
      project_id: projectId,
      implement_id: implementIdJsonString, // Use the consolidated JSON string
    };

    setIsSubmitting(true); setError("");

    try {
      console.log("Submitting Test Case Data:", testCaseData); // Log data being sent
      const response = await axios.post("http://localhost:3001/testcases", testCaseData);

      if (response.status === 201) {
        const { testcase_id } = response.data;
        // Add history record (ensure endpoint exists and works)
        try {
             await axios.post("http://localhost:3001/addHistoryTestcase", { testcase_id, testcase_status: "WORKING" });
        } catch (historyError) {
             console.error("Failed to add history record:", historyError);
             // Decide if this failure should prevent success message - likely not critical path
        }
        showAlertMessage("success", `Test Case created successfully!`);
        // Form reset now happens inside showAlertMessage after timeout before navigation
      } else {
        console.warn("Test case creation responded with status:", response.status);
        showAlertMessage("warning", `Test case created, but received unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error creating test case:", error.response || error);
      setError(error.response?.data?.message || "Failed to create test case. Please check console.");
      showAlertMessage("error", `Failed to create test case: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for react-select changes
  const handleSelectChange = (selectedOptions) => {
    setSelectedImplement(selectedOptions || []); // Ensure it's always an array
  };

  // --- JSX Structure ---
  return (
    <div className="tc-create-container">
      <h2 className="tc-create-header">
        <FontAwesomeIcon icon={faVial} className="tc-create-header-icon" /> Create Test Case
      </h2>

      {/* Replaced general error display with alert */}
      {/* {error && <div className="tc-create-error">{error}</div>} */}

      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Test Case Name</label>
        <input type="text" className="tc-create-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter test case title" required />
      </div>

      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Description</label>
        <textarea className="tc-create-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter detailed test case description" rows="4" required />
      </div>

      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Select Code Component</label>
        {/* Use grouped options */}
        <Select
          className="tc-create-select-multi"
          classNamePrefix="tc-select"
          isMulti
          options={groupedImplementOptions} // Use the processed options
          value={selectedImplement}
          onChange={handleSelectChange}
          placeholder="Select one or more Code Components..."
          closeMenuOnSelect={false} // Keep menu open for multi-select
          required
        />
      </div>

      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faTag} className="tc-create-label-icon" /> Test Type</label>
        <select className="tc-create-select" value={testType} onChange={(e) => setTestType(e.target.value)} required>
          <option value="">Select Test Type</option>
          <option value="Unit Test">Unit Test</option>
          <option value="Integration Test">Integration Test</option>
          <option value="System Test">System Test</option>
          <option value="Acceptance Test">Acceptance Test</option>
          <option value="Regression Test">Regression Test</option>
          <option value="Other">Other</option>
        </select>
        {testType === "Other" && (
          <input type="text" className="tc-create-input tc-create-other-input" placeholder="Specify other test type" value={customTestType} onChange={(e) => setCustomTestType(e.target.value)} required />
        )}
      </div>

      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faLevelUpAlt} className="tc-create-label-icon" /> Priority</label>
        <select className="tc-create-select" value={priority} onChange={(e) => setPriority(e.target.value)} required>
          <option value="">Select Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faCalendarAlt} className="tc-create-label-icon" /> Test Completion Date</label>
        <input type="date" className="tc-create-input" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
      </div>

      {/* Submit/Cancel Buttons */}
      <div className="tc-create-button-group">
        <button onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } })} className="tc-create-button tc-create-button-cancel">Cancel</button>
        <button onClick={handleCreateTestCase} className="tc-create-button tc-create-button-submit" disabled={isSubmitting}>
          {isSubmitting ? (<><FontAwesomeIcon icon={faSpinner} spin /> Creating...</>) : ("Create")}
        </button>
      </div>

      {/* Custom Alert Notification */}
      {showAlert && (
         <div className={`tc-create-alert show tc-create-alert-${alertType}`}>
             <div className="tc-create-alert-content">
                 <div className="tc-create-alert-icon">
                     {alertType === 'success' && <FontAwesomeIcon icon={faCheckCircle} />}
                     {alertType === 'error' && <FontAwesomeIcon icon={faTimes} />}
                     {alertType === 'warning' && <FontAwesomeIcon icon={faExclamationTriangle} />}
                 </div>
                 <div className="tc-create-alert-message">{alertMessage}</div>
             </div>
             <button className="tc-create-alert-close" onClick={() => setShowAlert(false)}><FontAwesomeIcon icon={faTimes} /></button>
             <div className="tc-create-alert-progress"></div>
         </div>
      )}
    </div>
  );
};

export default CreateTestcase;