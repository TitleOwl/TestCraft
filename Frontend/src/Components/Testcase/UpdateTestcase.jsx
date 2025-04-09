import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Select from "react-select"; // Make sure Select is imported
// import Swal from "sweetalert2"; // --- ลบออก ---
import { toast } from "react-toastify"; // --- เพิ่ม หรือ ตรวจสอบว่ามีแล้ว ---
import "./testcase_css/CreateTestcase.css"; // Reuse the CSS if applicable

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

  // State for initial testcase data (crucial for checking initial status)
  const [initialTestcase, setInitialTestcase] = useState({});
  const [implementFiles, setImplementFiles] = useState([]);
  const [selectedImplement, setSelectedImplement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Fetch Test Case Data AND Implement Files (เหมือนเดิม) ---
  useEffect(() => {
    const fetchData = async () => {
      if (!testcaseId) {
        setError("Test Case ID is missing.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const [testcaseResponse, implementResponse] = await Promise.all([
          axios.get(`http://localhost:3001/testcaseedit/${testcaseId}`),
          axios.get("http://localhost:3001/implementrelation")
        ]);

        // --- Process Test Case Data ---
        const fetchedTestcase = testcaseResponse.data;
        console.log("✅ Test Case Data Fetched:", fetchedTestcase);
        const formattedDate = fetchedTestcase.testcase_at ? new Date(fetchedTestcase.testcase_at).toISOString().split("T")[0] : "";

        // --- Process Implement ID ---
        let implementIdValue = fetchedTestcase.implement_id;
        let implementIdForState = "[]";
        let initialImplementIds = [];
        // (Logic การตรวจสอบ Type และ Parse implement_id เหมือนเดิม)
        if (Array.isArray(implementIdValue)) {
            console.log("✅ implement_id received as ARRAY:", implementIdValue);
            initialImplementIds = implementIdValue.map(id => Number(id));
            try { implementIdForState = JSON.stringify(implementIdValue); } catch (e) { console.error("Error stringifying pre-parsed array:", e); implementIdForState = "[]"; }
        } else if (typeof implementIdValue === 'string' && implementIdValue.trim() !== "") {
            const trimmedString = implementIdValue.trim();
            console.log("✅ implement_id received as STRING:", trimmedString);
            if (trimmedString.startsWith('[') && trimmedString.endsWith(']')) {
                implementIdForState = trimmedString;
                try {
                    initialImplementIds = JSON.parse(trimmedString);
                    if (!Array.isArray(initialImplementIds)) { initialImplementIds = []; }
                    initialImplementIds = initialImplementIds.map(id => Number(id));
                } catch (parseError) {
                    console.error("❌ Error parsing implement_id JSON string:", parseError, "String was:", trimmedString);
                    initialImplementIds = [];
                }
            } else if (!isNaN(Number(trimmedString))) {
                console.log("✅ implement_id string looks like a single ID.");
                const singleId = Number(trimmedString);
                initialImplementIds = [singleId];
                implementIdForState = JSON.stringify([singleId]);
            } else {
                console.warn("Implement ID string format not recognized:", trimmedString);
                initialImplementIds = []; implementIdForState = "[]";
            }
        } else if (typeof implementIdValue === 'number') {
             console.log("✅ implement_id received as NUMBER:", implementIdValue);
             initialImplementIds = [implementIdValue];
             implementIdForState = JSON.stringify([implementIdValue]);
        } else {
             console.log("✅ implement_id is null, undefined, or other type.");
             initialImplementIds = []; implementIdForState = "[]";
        }
        console.log("✅ Parsed Initial Implement IDs for filtering:", initialImplementIds);

        // Set states
        const currentTestcaseData = { ...fetchedTestcase, testcase_at: formattedDate, implement_id: implementIdForState };
        setTestcase(currentTestcaseData);
        // *** Store initial data, including the original status ***
        setInitialTestcase({ ...currentTestcaseData });
        console.log("✅ Initial Testcase State Set:", currentTestcaseData);

        // Process Implement Files
        const fetchedImplementFiles = implementResponse.data.data || [];
        setImplementFiles(fetchedImplementFiles);

        // Set Initial Selected Implement Options
        if (fetchedImplementFiles.length > 0 && initialImplementIds.length > 0) {
            const initialSelectedOptions = fetchedImplementFiles
              .filter(item => initialImplementIds.includes(item.implement_id))
              .map(item => ({ value: item.implement_id, label: `${item.implement_filename} (ID: ${item.implement_id})` }));
            setSelectedImplement(initialSelectedOptions);
        } else { setSelectedImplement([]); }

      } catch (err) {
        console.error("❌ Error fetching data:", err);
        toast.error("Failed to load test case data. Please try again.");
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [testcaseId]);

  // --- Handlers (เหมือนเดิม) ---
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

  // --- *** แก้ไขฟังก์ชันนี้: ปรับปรุง Confirmation Message *** ---
  const handleUpdateTestCase = async () => {
    const payloadToUpdate = { ...testcase, testcase_status: "WORKING" };

    // Check for changes comparing relevant fields before forcing status change
    const fieldsToCheck = ['testcase_name', 'testcase_des', 'testcase_type', 'testcase_priority', 'testcase_at', 'implement_id'];
    let hasChanges = false;
    for (const field of fieldsToCheck) {
        if (JSON.stringify(testcase[field]) !== JSON.stringify(initialTestcase[field])) {
            hasChanges = true;
            break;
        }
    }

    // Also consider a change if the status *wasn't* already WORKING, because we are forcing it
    if (!hasChanges && initialTestcase.testcase_status !== "WORKING") {
        hasChanges = true; // Force update if only status needs to change to WORKING
    }


    if (!hasChanges) {
      toast.info("No changes were detected.", { autoClose: 2000 }); // English
      return;
    }

    // --- Determine Confirmation Message based on INITIAL status ---
    let confirmationMessage = "";
    // Use the status from the initially fetched data
    if (initialTestcase.testcase_status === "WORKING") {
      confirmationMessage = "Do you want to update this test case?"; // Simple confirmation
    } else {
      // More explicit confirmation if status will change
      confirmationMessage = `Updating this test case will also set its status to 'WORKING'.\n\nDo you want to proceed?`;
    }
    // --- End Message Determination ---

    // Use window.confirm with the determined message
    const confirmUpdate = window.confirm(confirmationMessage);

    if (!confirmUpdate) return; // If Cancel is pressed

    console.log("⬆️ Updating Test Case with data (Status forced to WORKING):", payloadToUpdate);
    try {
      // Send payload with status forced to WORKING
      await axios.put(`http://localhost:3001/testcaseedit/${testcaseId}`, payloadToUpdate);

      // --- Save History ---
      try {
        console.log("📜 Saving history for status change to WORKING...");
        await axios.post('http://localhost:3001/addHistoryTestcase', {
          testcase_id: parseInt(testcaseId),
          testcase_status: 'WORKING' // Save 'WORKING' status history
        });
        console.log("✅ History saved successfully.");
      } catch (historyError) {
        console.error("❌ Error saving history after update:", historyError);
        toast.warn("Test case updated, but failed to save history record.");
      }
      // --- End Save History ---

      // Success Toast (English)
      toast.success("Test case updated successfully.", {
        onClose: () => navigate(`/Dashboard?project_id=${payloadToUpdate.project_id}`, { state: { selectedSection: "Testcase" } }),
      });

    } catch (err) { // Main PUT error
      console.error("❌ Error updating test case:", err);
      // Error Toast (English)
      toast.error(`Update Failed: ${err.response?.data?.message || err.message}`);
    }
  };
  // --- *** จบการแก้ไขฟังก์ชัน *** ---

  // --- Render Logic (เหมือนเดิม) ---
  if (loading) return <div className="loading-container">Loading Test Case Data...</div>;
  if (error && !loading) return <div className="error-container">Error: {error}</div>;

  return (
    // JSX ส่วน Render เหมือนเดิม
    <div className="create-testcase">
      <h2>Edit Test Case (ID: {testcaseId})</h2>

      {/* Input fields */}
      {[
        { label: "Title", name: "testcase_name", value: testcase.testcase_name },
        { label: "Description", name: "testcase_des", value: testcase.testcase_des }
      ].map(({ label, name, value }) => (
        <div key={name} className="create-testcase-form-group">
          <label>{label}:</label>
          <input type="text" name={name} value={value || ''} onChange={handleChange} />
        </div>
      ))}

      {/* Test Type Dropdown */}
      <div className="create-testcase-form-group">
        <label>Test Type:</label>
        <select name="testcase_type" value={testcase.testcase_type} onChange={handleChange}>
          <option value="">Select Test Type</option>
          <option value="Unit Test">Unit Test</option>
          <option value="Integration Test">Integration Test</option>
          <option value="System Test">System Test</option>
          <option value="Acceptance Test">Acceptance Test</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Priority Dropdown */}
      <div className="create-testcase-form-group">
        <label>Priority:</label>
        <select name="testcase_priority" value={testcase.testcase_priority || ''} onChange={handleChange}>
          <option value="">Select Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Date Input */}
      <div className="create-testcase-form-group">
        <label>Test Completion Date:</label>
        <input type="date" name="testcase_at" value={testcase.testcase_at || ''} onChange={handleChange} />
      </div>

      {/* Implement Select Dropdown */}
      <div className="create-testcase-form-group">
        <label htmlFor="implementSelect">Select Implement (Multiple):</label>
        <Select
          id="implementSelect"
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

      {/* Buttons */}
      <div className="create-testcase-button-group">
        <button onClick={() => navigate(`/Dashboard?project_id=${testcase.project_id}`, { state: { selectedSection: "Testcase" } })} className="create-testcase-cancel-button" type="button"> Cancel </button>
        <button onClick={handleUpdateTestCase} className="create-testcase-save-button" type="button"> Update Test Case </button>
      </div>
    </div>
  );
};

export default UpdateTestcase;