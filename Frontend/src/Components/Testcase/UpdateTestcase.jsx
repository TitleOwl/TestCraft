import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./testcase_css/CreateTestcase.css"; // Use the same CSS file
import ConfirmUpdateTestcase from './ConfirmUpdateTestcase'; // <<< 1. Import custom modal
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVial,
  faFileAlt,
  faTag,
  faLevelUpAlt,
  faCalendarAlt,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

const UpdateTestcase = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testcaseId = searchParams.get("testcase_id");
  const projectId = searchParams.get("project_id");

  const [testcase, setTestcase] = useState({
    testcase_name: "",
    testcase_des: "",
    testcase_type: "",
    testcase_priority: "",
    testcase_by: "",
    testcase_at: "",
    testcase_status: "WORKING",
    project_id: projectId || "",
    implement_id: "[]",
  });

  const [initialTestcase, setInitialTestcase] = useState({});
  const [implementFiles, setImplementFiles] = useState([]);
  const [selectedImplement, setSelectedImplement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false); // <<< 2. State for modal

  // --- Fetch Test Case Data AND Implement Files ---
  useEffect(() => {
    const fetchData = async () => {
      if (!testcaseId) {
        setError("Test Case ID is missing.");
        toast.error("Test Case ID is missing.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const [testcaseResponse, implementResponse] = await Promise.all([
          axios.get(`http://localhost:3001/testcaseedit/${testcaseId}`),
          axios.get("http://localhost:3001/implementrelation", { params: { project_id: projectId } })
        ]);

        const fetchedTestcase = testcaseResponse.data;
        const formattedDate = fetchedTestcase.testcase_at ? new Date(fetchedTestcase.testcase_at).toISOString().split("T")[0] : "";

        let implementIdValue = fetchedTestcase.implement_id;
        let implementIdForState = "[]";
        let initialImplementIds = [];
        // --- Implement ID Parsing Logic ---
         if (Array.isArray(implementIdValue)) {
           initialImplementIds = implementIdValue.map(id => Number(id));
           try { implementIdForState = JSON.stringify(implementIdValue); } catch (e) { console.error("Error stringifying pre-parsed array:", e); implementIdForState = "[]"; }
         } else if (typeof implementIdValue === 'string' && implementIdValue.trim() !== "") {
           const trimmedString = implementIdValue.trim();
           if (trimmedString.startsWith('[') && trimmedString.endsWith(']')) {
             implementIdForState = trimmedString;
             try {
               initialImplementIds = JSON.parse(trimmedString);
               if (!Array.isArray(initialImplementIds)) { initialImplementIds = []; }
               initialImplementIds = initialImplementIds.map(id => Number(id));
             } catch (parseError) { initialImplementIds = []; console.error("Error parsing implement_id JSON string:", parseError); }
           } else if (!isNaN(Number(trimmedString))) {
             const singleId = Number(trimmedString); initialImplementIds = [singleId]; implementIdForState = JSON.stringify([singleId]);
           } else { initialImplementIds = []; implementIdForState = "[]"; console.warn("Implement ID string format not recognized:", trimmedString); }
         } else if (typeof implementIdValue === 'number') {
           initialImplementIds = [implementIdValue]; implementIdForState = JSON.stringify([implementIdValue]);
         } else { initialImplementIds = []; implementIdForState = "[]"; }
        // --- End Parsing ---

        const currentTestcaseData = {
          ...fetchedTestcase,
          testcase_at: formattedDate,
          implement_id: implementIdForState,
          project_id: fetchedTestcase.project_id || projectId || ""
        };
        setTestcase(currentTestcaseData);
        setInitialTestcase({ ...currentTestcaseData });

        const fetchedImplementFiles = implementResponse.data.data || [];
        setImplementFiles(fetchedImplementFiles);

        if (fetchedImplementFiles.length > 0 && initialImplementIds.length > 0) {
          const initialSelectedOptions = fetchedImplementFiles
            .filter(item => initialImplementIds.includes(item.implement_id))
            .map(item => ({ value: item.implement_id, label: `${item.implement_filename} (ID: ${item.implement_id})` }));
          setSelectedImplement(initialSelectedOptions);
        } else {
          setSelectedImplement([]);
        }
      } catch (err) {
        console.error("❌ Error fetching data:", err);
        toast.error("Failed to load test case data. Please try again.");
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [testcaseId, projectId]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTestcase((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (selectedOptions) => {
    const selectedArray = selectedOptions || [];
    setSelectedImplement(selectedArray);
    const selectedIds = selectedArray.map(option => option.value);
    const implementIdJsonString = JSON.stringify(selectedIds);
    setTestcase((prev) => ({ ...prev, implement_id: implementIdJsonString }));
  };

  // --- Function to perform the actual update ---
  const proceedWithUpdate = async () => { // Logic to run AFTER confirmation
    setIsUpdating(true);
    setError(null);
    const payloadToUpdate = { ...testcase, testcase_status: "WORKING" };

    console.log("⬆️ Updating Test Case with data:", payloadToUpdate);
    try {
      await axios.put(`http://localhost:3001/testcaseedit/${testcaseId}`, payloadToUpdate);
      // Save History
      try {
        await axios.post('http://localhost:3001/addHistoryTestcase', {
          testcase_id: parseInt(testcaseId),
          testcase_status: 'WORKING'
        });
        console.log("✅ History saved successfully.");
      } catch (historyError) {
        console.error("❌ Error saving history after update:", historyError);
        toast.warn("Test case updated, but failed to save history record.");
      }
      toast.success("Test case updated successfully.", {
         autoClose: 2000,
         onClose: () => navigate(`/Dashboard?project_id=${payloadToUpdate.project_id}`, { state: { selectedSection: "Testcase" } }),
      });
    } catch (err) {
      console.error("❌ Error updating test case:", err);
      const errMsg = err.response?.data?.message || err.message || "Update Failed";
      setError(errMsg);
      toast.error(`Update Failed: ${errMsg}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Handle Update Button Click ---
  const handleUpdateTestCase = async () => { // This now just opens the modal
    // Basic Validation
    if (!testcase.testcase_name.trim() || !testcase.testcase_des.trim() || !testcase.testcase_type || !testcase.testcase_priority || !testcase.testcase_at) {
      toast.warning("Please fill in all required fields."); return;
    }
    const currentImplementIds = JSON.parse(testcase.implement_id || "[]");
    if (currentImplementIds.length === 0) {
      toast.warning("Please select at least one implement."); return;
    }

    // Step 1: Check for field changes
    const fieldsToCheck = ['testcase_name', 'testcase_des', 'testcase_type', 'testcase_priority', 'testcase_at', 'implement_id'];
    let hasFieldChanges = false;
    for (const field of fieldsToCheck) {
      if (JSON.stringify(testcase[field]) !== JSON.stringify(initialTestcase[field])) {
        hasFieldChanges = true; break;
      }
    }

    // Step 2: Show toast and exit if no changes
    if (!hasFieldChanges) {
      toast.info("No changes were detected."); return;
    }

    // --- Step 3: Open the custom confirmation modal ---
    // Remove the confirmationMessage and window.confirm logic
    setIsConfirmModalOpen(true); // <<< 3. Open modal
  };

  // --- Function called when Confirm button in Modal is clicked ---
  const handleConfirmUpdate = () => { // <<< 4. Handler for modal confirmation
    setIsConfirmModalOpen(false); // Close modal
    proceedWithUpdate();        // Call update logic
  };

  // --- Render Logic ---
  if (loading) return <div className="loading-container tc-create-container"> <FontAwesomeIcon icon={faSpinner} spin size="2x" /> Loading Test Case... </div>;

  return (
    <div className="tc-create-container">
      <h2 className="tc-create-header">
        <FontAwesomeIcon icon={faVial} className="tc-create-header-icon" />
        Edit Test Case (ID: {testcaseId})
      </h2>

      {error && <div className="tc-create-error">{error}</div>}

      {/* --- Form Fields --- */}
      {/* Title */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Title</label>
        <input type="text" name="testcase_name" className="tc-create-input" value={testcase.testcase_name || ''} onChange={handleChange} placeholder="Enter test case title"/>
      </div>
      {/* Description */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Description</label>
        <textarea name="testcase_des" className="tc-create-textarea" value={testcase.testcase_des || ''} onChange={handleChange} placeholder="Enter detailed test case description" rows="4"/>
      </div>
      {/* Test Type */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faTag} className="tc-create-label-icon" /> Test Type</label>
        <select name="testcase_type" className="tc-create-select" value={testcase.testcase_type || ''} onChange={handleChange}>
          <option value="">Select Test Type</option><option value="Unit Test">Unit Test</option><option value="Integration Test">Integration Test</option><option value="System Test">System Test</option><option value="Acceptance Test">Acceptance Test</option><option value="Other">Other</option>
        </select>
      </div>
      {/* Priority */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faLevelUpAlt} className="tc-create-label-icon" /> Priority</label>
        <select name="testcase_priority" className="tc-create-select" value={testcase.testcase_priority || ''} onChange={handleChange}>
          <option value="">Select Priority</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
        </select>
      </div>
      {/* Completion Date */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faCalendarAlt} className="tc-create-label-icon" /> Test Completion Date</label>
        <input type="date" name="testcase_at" className="tc-create-input" value={testcase.testcase_at || ''} onChange={handleChange}/>
      </div>
      {/* Implement Select */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Select Implement (Multiple)</label>
        <Select className="tc-create-select-multi" classNamePrefix="tc-select" isMulti options={implementFiles.map(item => ({ value: item.implement_id, label: `${item.implement_filename} (ID: ${item.implement_id})` }))} value={selectedImplement} onChange={handleSelectChange} placeholder="Select one or more implements..." closeMenuOnSelect={false}/>
      </div>

      {/* --- Buttons --- */}
      <div className="tc-create-button-group">
        <button onClick={() => navigate(`/Dashboard?project_id=${testcase.project_id}`, { state: { selectedSection: "Testcase" } })} className="tc-create-button tc-create-button-cancel" type="button" disabled={isUpdating}>Cancel</button>
        <button onClick={handleUpdateTestCase} className="tc-create-button tc-create-button-submit" type="button" disabled={isUpdating}>
          {isUpdating ? (<><FontAwesomeIcon icon={faSpinner} className="tc-create-spinner" /> Updating...</>) : ("Update Test Case")}
        </button>
      </div>

      {/* --- Render Custom Modal --- */}
      <ConfirmUpdateTestcase // <<< 5. Render your modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmUpdate}
        title="Confirm Update"
        // Pass the message, potentially with HTML for line breaks
        message={
          initialTestcase.testcase_status !== "WORKING"
            ? `Updating this test case will also set its status to 'WORKING'.<br/><br/>Do you want to proceed?`
            : `Do you want to save the changes to this test case?`
        }
        confirmText="Update"
        cancelText="Cancel"
      />
    </div>
  );
};

export default UpdateTestcase;