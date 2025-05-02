import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./testcase_css/CreateTestcase.css"; // Use the same CSS file
import ConfirmUpdateTestcase from './ConfirmUpdateTestcase';
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

  // State for the currently edited test case data
  const [testcase, setTestcase] = useState({
    testcase_name: "",
    testcase_des: "",
    testcase_type: "",
    testcase_priority: "",
    testcase_by: "",
    testcase_at: "",
    testcase_status: "WORKING",
    project_id: projectId || "",
    // implement_id will be populated from initialTestcase, but we won't directly modify it on select change anymore
  });

  // State to store the initial data for comparison
  const [initialTestcase, setInitialTestcase] = useState({});
  // State to store all available implement files fetched from API
  const [implementFiles, setImplementFiles] = useState([]);
  // State to store the currently selected options in the react-select component
  // This holds objects like { value: id, label: '📄 filename (ID: id)' }
  const [selectedImplement, setSelectedImplement] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

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

        // --- Implement ID Parsing Logic (Revised for Clarity) ---
        let initialSelectedImplementData = []; // Array for [{id: ..., filename: ...}]
        try {
          // Assume implement_id from DB is the correct format: '[{"id":1,"filename":"..."},...]'
          if (typeof fetchedTestcase.implement_id === 'string' && fetchedTestcase.implement_id.startsWith('[')) {
            initialSelectedImplementData = JSON.parse(fetchedTestcase.implement_id);
            if (!Array.isArray(initialSelectedImplementData)) {
              initialSelectedImplementData = []; // Fallback if parsing fails
            }
          } else if (Array.isArray(fetchedTestcase.implement_id)) {
            // Handle if DB driver already parsed it (less likely if stored as JSON string)
            initialSelectedImplementData = fetchedTestcase.implement_id;
          }
          // Add more specific parsing if needed based on actual DB values
        } catch (parseError) {
          console.error("Error parsing initial implement_id JSON string:", parseError, "Value was:", fetchedTestcase.implement_id);
          initialSelectedImplementData = []; // Fallback on error
        }
        // --- End Parsing ---

        // Prepare data for the main state and initial state comparison
        const currentTestcaseData = {
          ...fetchedTestcase,
          testcase_at: formattedDate,
          // Store the original *parsed* data (or default) for comparison later
          implement_id: initialSelectedImplementData,
          project_id: fetchedTestcase.project_id || projectId || ""
        };

        setTestcase(currentTestcaseData);
        // Deep copy for initial state comparison might be safer if implement_id is complex
        setInitialTestcase(JSON.parse(JSON.stringify(currentTestcaseData)));

        // Fetch all available implement files for the dropdown
        const fetchedImplementFiles = implementResponse.data.data || [];
        setImplementFiles(fetchedImplementFiles);

        // Set the initial selected options for react-select based on parsed data
        if (fetchedImplementFiles.length > 0 && initialSelectedImplementData.length > 0) {
          const initialSelectedOptions = initialSelectedImplementData
            .map(savedItem => {
              // Find the full details from the fetched list
              const fullImplementFile = fetchedImplementFiles.find(f => f.implement_id === savedItem.id);
              if (fullImplementFile) {
                return {
                  value: savedItem.id,
                  // Construct label with emoji (for display consistency)
                  label: `📄 ${fullImplementFile.implement_filename} (ID: ${savedItem.id})`
                };
              }
              return null; // Handle case where saved ID doesn't exist in fetched list
            })
            .filter(Boolean); // Remove nulls if any ID wasn't found

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
  }, [testcaseId, projectId]); // Rerun if IDs change

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Update regular form fields directly
    setTestcase((prev) => ({ ...prev, [name]: value }));
  };

  // Update only the state for react-select's display
  const handleSelectChange = (selectedOptions) => {
    setSelectedImplement(selectedOptions || []);
    // *** Removed the direct update to testcase.implement_id here ***
  };

  // --- Function to perform the actual update ---
  const proceedWithUpdate = async () => {
    setIsUpdating(true);
    setError(null);

    // --- ⬇️ Construct the correct implement_id payload HERE ⬇️ ---
    const implementDataForStorage = selectedImplement.map(option => {
      const selectedId = option.value;
      // Find the original filename from the initially fetched list
      const originalFile = implementFiles.find(file => file.implement_id === selectedId);
      let cleanFilename = originalFile ? originalFile.implement_filename : 'Unknown Filename';
      // Clean the filename (remove potential leading emoji and trim)
      if (typeof cleanFilename === 'string') {
        cleanFilename = cleanFilename.replace(/^📄\s*/, '').trim(); // Remove emoji + potential space, then trim
      }
      return {
        id: selectedId,
        filename: cleanFilename // Store clean filename
      };
    });
    // Stringify the correct structure for the database
    const implementIdJsonString = JSON.stringify(implementDataForStorage);
    // --- ⬆️ End implement_id construction ⬆️ ---


    // Create the final payload, ensuring implement_id has the correct format
    const payloadToUpdate = {
      ...testcase, // Spread the rest of the testcase state
      implement_id: implementIdJsonString, // <<< Use the correctly formatted JSON string
      testcase_status: "WORKING" // Always set status on update (as per original logic)
    };


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
        // Navigate using the project_id from the final payload
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
  const handleUpdateTestCase = async () => {
    // Basic Validation
    if (!testcase.testcase_name.trim() || !testcase.testcase_des.trim() || !testcase.testcase_type || !testcase.testcase_priority || !testcase.testcase_at) {
      toast.warning("Please fill in all required fields."); return;
    }
    // ** Validate based on selectedImplement state, not testcase.implement_id **
    if (!selectedImplement || selectedImplement.length === 0) {
      toast.warning("Please select at least one implement."); return;
    }

    // --- Check for changes (Compare against initialTestcase) ---
    let hasFieldChanges = false;
    // Compare regular fields
    const fieldsToCheck = ['testcase_name', 'testcase_des', 'testcase_type', 'testcase_priority', 'testcase_at'];
    for (const field of fieldsToCheck) {
      // Trim string fields before comparison
      const currentValue = typeof testcase[field] === 'string' ? testcase[field].trim() : testcase[field];
      const initialValue = typeof initialTestcase[field] === 'string' ? initialTestcase[field].trim() : initialTestcase[field];
      if (currentValue !== initialValue) {
        hasFieldChanges = true;
        console.log(`Change detected in field: ${field}`);
        break;
      }
    }

    // Compare implement selection separately using selectedImplement state
    if (!hasFieldChanges) {
      // Construct the current selection in the format {id, filename} for comparison
      const currentImplementData = selectedImplement.map(option => {
        const originalFile = implementFiles.find(file => file.implement_id === option.value);
        let cleanFilename = originalFile ? originalFile.implement_filename : 'Unknown Filename';
        if (typeof cleanFilename === 'string') { cleanFilename = cleanFilename.replace(/^📄\s*/, '').trim(); }
        return { id: option.value, filename: cleanFilename };
      }).sort((a, b) => a.id - b.id); // Sort by ID for consistent comparison

      // Get the initial implement data (already stored in initialTestcase.implement_id)
      // Ensure it's sorted too
      const initialImplementData = [...(initialTestcase.implement_id || [])].sort((a, b) => a.id - b.id);

      // Compare the stringified versions
      if (JSON.stringify(currentImplementData) !== JSON.stringify(initialImplementData)) {
        hasFieldChanges = true;
        console.log(`Change detected in implement selection.`);
      }
    }
    // --- End Change Detection ---


    if (!hasFieldChanges) {
      toast.info("No changes were detected."); return;
    }

    // Open the confirmation modal
    setIsConfirmModalOpen(true);
  };

  // --- Function called when Confirm button in Modal is clicked ---
  const handleConfirmUpdate = () => {
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
        <input type="text" name="testcase_name" className="tc-create-input" value={testcase.testcase_name || ''} onChange={handleChange} placeholder="Enter test case title" required />
      </div>
      {/* Description */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Description</label>
        <textarea name="testcase_des" className="tc-create-textarea" value={testcase.testcase_des || ''} onChange={handleChange} placeholder="Enter detailed test case description" rows="4" required />
      </div>
      {/* Test Type */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faTag} className="tc-create-label-icon" /> Test Type</label>
        <select name="testcase_type" className="tc-create-select" value={testcase.testcase_type || ''} onChange={handleChange} required>
          <option value="">Select Test Type</option><option value="Unit Test">Unit Test</option><option value="Integration Test">Integration Test</option><option value="System Test">System Test</option><option value="Acceptance Test">Acceptance Test</option><option value="Other">Other</option>
        </select>
      </div>
      {/* Priority */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faLevelUpAlt} className="tc-create-label-icon" /> Priority</label>
        <select name="testcase_priority" className="tc-create-select" value={testcase.testcase_priority || ''} onChange={handleChange} required>
          <option value="">Select Priority</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
        </select>
      </div>
      {/* Completion Date */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faCalendarAlt} className="tc-create-label-icon" /> Test Completion Date</label>
        <input type="date" name="testcase_at" className="tc-create-input" value={testcase.testcase_at || ''} onChange={handleChange} required />
      </div>
      {/* Implement Select */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Select Implement (Multiple)</label>
        <Select
          className="tc-create-select-multi"
          classNamePrefix="tc-select"
          isMulti
          options={implementFiles.map(item => ({
            value: item.implement_id,
            // Ensure emoji is here for dropdown consistency
            label: `📄 ${item.implement_filename} (ID: ${item.implement_id})`
          }))}
          value={selectedImplement} // Directly use the state controlling the select
          onChange={handleSelectChange}
          placeholder="Select one or more implements..."
          closeMenuOnSelect={false}
        />
      </div>

      {/* --- Buttons --- */}
      <div className="tc-create-button-group">
        <button
          onClick={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate(`/Dashboard?project_id=${testcase.project_id}`, {
                state: { selectedSection: "Testcase" },
              });
            }
          }}
          className="tc-create-button tc-create-button-cancel"
          type="button"
          disabled={isUpdating}
        >
          Cancel
        </button>
        <button onClick={handleUpdateTestCase} className="tc-create-button tc-create-button-submit" type="button" disabled={isUpdating}>
          {isUpdating ? (<><FontAwesomeIcon icon={faSpinner} className="tc-create-spinner" /> Updating...</>) : ("Update Test Case")}
        </button>
      </div>

      {/* --- Render Custom Modal --- */}
      <ConfirmUpdateTestcase
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmUpdate}
        title="Confirm Update"
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