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

  const [testcase, setTestcase] = useState({
    testcase_name: "",
    testcase_des: "",
    testcase_type: "",
    testcase_priority: "",
    testcase_by: "",
    testcase_at: "",
    testcase_status: "WORKING",
    project_id: projectId || "",
    // implement_id will be populated from initialTestcase later
  });

  const [initialTestcase, setInitialTestcase] = useState({});
  const [implementFiles, setImplementFiles] = useState([]);
  const [selectedImplement, setSelectedImplement] = useState([]); // Holds { value: id, label: '...' }

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const formatTestcaseId = (id) => `TC-${String(id).padStart(3, '0')}`;
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

        // --- Parsing logic for implement_id (keep as is for reading existing data) ---
        let initialSelectedImplementData = []; // This will hold the [{id:..., filename:...}] format *read* from DB
        try {
          if (typeof fetchedTestcase.implement_id === 'string' && fetchedTestcase.implement_id.startsWith('[')) {
            initialSelectedImplementData = JSON.parse(fetchedTestcase.implement_id);
            if (!Array.isArray(initialSelectedImplementData)) {
              initialSelectedImplementData = [];
            }
          } else if (Array.isArray(fetchedTestcase.implement_id)) {
            initialSelectedImplementData = fetchedTestcase.implement_id;
          }
        } catch (parseError) {
          console.error("Error parsing initial implement_id JSON string:", parseError, "Value was:", fetchedTestcase.implement_id);
          initialSelectedImplementData = [];
        }
        // --- End Parsing ---

        // Prepare data for the main state and initial state comparison
        const currentTestcaseData = {
          ...fetchedTestcase,
          testcase_at: formattedDate,
          // Store the original *parsed* object format for comparison later
          implement_id: initialSelectedImplementData, // Store as [{id:..., filename:...}]
          project_id: fetchedTestcase.project_id || projectId || ""
        };

        setTestcase(currentTestcaseData);
        setInitialTestcase(JSON.parse(JSON.stringify(currentTestcaseData))); // Deep copy

        // Fetch all available implement files for the dropdown
        const fetchedImplementFiles = implementResponse.data.data || [];
        setImplementFiles(fetchedImplementFiles);

        // Set the initial selected options for react-select based on parsed data [{id:..., filename:...}]
        // Set the initial selected options for react-select
        if (fetchedImplementFiles.length > 0 && initialSelectedImplementData && initialSelectedImplementData.length > 0) {
          const initialSelectedOptions = initialSelectedImplementData
            .map(savedItemOrId => { // เปลี่ยนชื่อตัวแปรเพื่อความชัดเจน
              // --- ⬇️ เพิ่ม Logic ตรวจสอบชนิดข้อมูล ⬇️ ---
              // ตรวจสอบว่าข้อมูลที่อ่านมา (savedItemOrId) เป็น object หรือเป็นแค่ id (ตัวเลข)
              const idToFind = typeof savedItemOrId === 'object' && savedItemOrId !== null
                ? savedItemOrId.id // ถ้าเป็น object ให้ใช้ .id
                : savedItemOrId;   // ถ้าเป็นตัวเลข ให้ใช้ตัวเลขนั้นเลย
              // --- ⬆️ สิ้นสุด Logic ตรวจสอบ ⬆️ ---

              // ใช้ idToFind ที่ได้มาในการค้นหาข้อมูล implement เต็มๆ
              const fullImplementFile = fetchedImplementFiles.find(f => f.implement_id === idToFind);

              if (fullImplementFile) {
                return {
                  // ใช้ idToFind เป็น value
                  value: idToFind,
                  // สร้าง label เหมือนเดิม
                  label: `📄 ${fullImplementFile.implement_filename} (ID: ${idToFind})`
                };
              }
              // Log หาก ID ที่บันทึกไว้หาไม่เจอใน List ทั้งหมด (อาจช่วย Debug)
              console.warn(`Could not find implement details for saved ID: ${idToFind}`);
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
  }, [testcaseId, projectId]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTestcase((prev) => ({ ...prev, [name]: value }));
  };

  // Update only the state for react-select's display
  const handleSelectChange = (selectedOptions) => {
    setSelectedImplement(selectedOptions || []);
  };

  // --- Function to perform the actual update ---
  const proceedWithUpdate = async () => {
    setIsUpdating(true);
    setError(null);

    // --- ⬇️ Construct implement_id payload as an array of IDs ⬇️ ---
    // 1. Get only the IDs from the selected options in react-select state
    const implementIdsOnly = selectedImplement.map(option => option.value); // option.value holds the implement_id

    // 2. Stringify this array of IDs
    //    This will create a JSON string like "[1, 2]"
    const implementIdJsonString = JSON.stringify(implementIdsOnly);
    // --- ⬆️ End implement_id construction ⬆️ ---

    // Create the final payload for the API
    const payloadToUpdate = {
      ...testcase, // Spread other testcase fields (name, desc, etc.)
      // *** Use the new JSON string (array of IDs) for implement_id ***
      implement_id: implementIdJsonString,
      testcase_status: "WORKING" // Always set status on update
    };

    // --- ❗ Important Note ---
    // Make sure your backend API endpoint (PUT /testcaseedit/:testcaseId)
    // is updated to expect and correctly handle the implement_id field
    // being sent as a JSON string representing an array of numbers (e.g., "[1, 2]").
    // It needs to parse this string and store it appropriately.
    // ---

    console.log("⬆️ Updating Test Case with data:", payloadToUpdate); // Log the payload being sent
    try {
      await axios.put(`http://localhost:3001/testcaseedit/${testcaseId}`, payloadToUpdate);

      // Save History (Keep this logic)
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
  const handleUpdateTestCase = async () => {
    // Basic Validation (remains the same)
    if (!testcase.testcase_name.trim() || !testcase.testcase_des.trim() || !testcase.testcase_type || !testcase.testcase_priority || !testcase.testcase_at) {
      toast.warning("Please fill in all required fields."); return;
    }
    if (!selectedImplement || selectedImplement.length === 0) {
      toast.warning("Please select at least one implement."); return;
    }

    // --- Check for changes (Comparison logic should still work) ---
    let hasFieldChanges = false;
    const fieldsToCheck = ['testcase_name', 'testcase_des', 'testcase_type', 'testcase_priority', 'testcase_at'];
    for (const field of fieldsToCheck) {
      const currentValue = typeof testcase[field] === 'string' ? testcase[field].trim() : testcase[field];
      const initialValue = typeof initialTestcase[field] === 'string' ? initialTestcase[field].trim() : initialTestcase[field];
      if (currentValue !== initialValue) {
        hasFieldChanges = true;
        console.log(`Change detected in field: ${field}`);
        break;
      }
    }

    // Compare implement selection (This part compares the selected content, not the storage format)
    if (!hasFieldChanges) {
      // Reconstruct current selection as [{id, filename}] for comparison
      const currentImplementData = selectedImplement.map(option => {
        const originalFile = implementFiles.find(file => file.implement_id === option.value);
        let cleanFilename = originalFile ? originalFile.implement_filename : 'Unknown Filename';
        if (typeof cleanFilename === 'string') { cleanFilename = cleanFilename.replace(/^📄\s*/, '').trim(); }
        return { id: option.value, filename: cleanFilename };
      }).sort((a, b) => a.id - b.id);

      // Get the initial implement data (already stored in initialTestcase.implement_id as [{id, filename}])
      const initialImplementData = [...(initialTestcase.implement_id || [])].sort((a, b) => a.id - b.id);

      if (JSON.stringify(currentImplementData) !== JSON.stringify(initialImplementData)) {
        hasFieldChanges = true;
        console.log(`Change detected in implement selection.`);
      }
    }
    // --- End Change Detection ---

    if (!hasFieldChanges) {
      toast.info("No changes were detected."); return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmUpdate = () => {
    setIsConfirmModalOpen(false);
    proceedWithUpdate();
  };

  // --- Render Logic ---
  if (loading) return <div className="loading-container tc-create-container"> <FontAwesomeIcon icon={faSpinner} spin size="2x" /> Loading Test Case... </div>;

  return (
    <div className="tc-create-container">
      <h2 className="tc-create-header">
        <FontAwesomeIcon icon={faVial} className="tc-create-header-icon" />
        Edit Test Case (ID: {formatTestcaseId(testcaseId)})
      </h2>

      {error && <div className="tc-create-error">{error}</div>}

      {/* Title */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Test Case Name</label>
        <input type="text" name="testcase_name" className="tc-create-input" value={testcase.testcase_name || ''} onChange={handleChange} placeholder="Enter test case title" required />
      </div>
      {/* Description */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Description</label>
        <textarea name="testcase_des" className="tc-create-textarea" value={testcase.testcase_des || ''} onChange={handleChange} placeholder="Enter detailed test case description" rows="4" required />
      </div>

      {/* Implement Select */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faFileAlt} className="tc-create-label-icon" /> Select Code Component</label>
        <Select
          className="tc-create-select-multi"
          classNamePrefix="tc-select"
          isMulti
          options={implementFiles.map(item => ({
            value: item.implement_id,
            label: `📄 ${item.implement_filename} (ID: ${item.implement_id})`
          }))}
          value={selectedImplement} // Use state for react-select
          onChange={handleSelectChange}
          placeholder="Select one or more implements..."
          closeMenuOnSelect={false}
        />
      </div>
      {/* Test Type */}
      <div className="tc-create-form-group">
        <label className="tc-create-label"><FontAwesomeIcon icon={faTag} className="tc-create-label-icon" /> Test Type</label>
        <select name="testcase_type" className="tc-create-select" value={testcase.testcase_type || ''} onChange={handleChange} required>
          <option value="">Select Test Type</option><option value="Unit Test">Unit Test</option><option value="Integration Test">Integration Test</option><option value="System Test">System Test</option><option value="Acceptance Test">Acceptance Test</option><option value="Regression Test">Regression Test</option><option value="Other">Other</option>
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

      {/* Buttons */}
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

      {/* Render Custom Modal */}
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