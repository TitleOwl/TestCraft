import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
// Import the specific CSS for CreateTestcasebaseline
import "./testcase_css/CreateTestcasebaseline.css";

// --- Icons (Reused - No changes needed) ---
const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CancelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// Changed Icon for Testcase Baseline context
const TestcaseBaselineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <path d="m10.4 12.6 1.6 1.4 2.8-2.8"></path> {/* Checkmark for verified idea */}
  </svg>
);


const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

// --- Custom Status Badge Component (Adapted for Test Cases) ---
const StatusBadge = ({ status }) => {
  let statusClass = "";

  // Adjust cases based on possible testcase statuses
  switch (status?.toUpperCase()) { // Use optional chaining and uppercase for safety
    case "VERIFIED":
      statusClass = "verified"; // Assuming a 'verified' class exists in the CSS
      break;
    case "BASELINE":
      statusClass = "baseline";
      break;
    // Add more cases if needed (e.g., 'DRAFT', 'REVIEW')
    default:
      statusClass = "default";
  }

  // Use create-testcasebaseline prefix for CSS class
  return <span className={`create-testcasebaseline-status-badge ${statusClass}`}>{status || 'N/A'}</span>;
};

// --- Loading Component (Adapted) ---
const LoadingState = () => (
  // Use create-testcasebaseline prefix for CSS classes
  <div className="create-testcasebaseline-loading-state">
    <div className="create-testcasebaseline-loading-spinner"></div>
    {/* Update text */}
    <p>Loading test cases...</p>
  </div>
);

// --- Error Component (Adapted) ---
const ErrorState = ({ message }) => (
  // Use create-testcasebaseline prefix for CSS classes
  <div className="create-testcasebaseline-error-state">
    <div className="create-testcasebaseline-error-icon">⚠️</div>
    <h3>Error</h3>
    <p>{message}</p>
  </div>
);

// --- Empty State Component (Adapted) ---
const EmptyState = () => (
  // Use create-testcasebaseline prefix for CSS classes
  <div className="create-testcasebaseline-empty-state">
    <div className="create-testcasebaseline-empty-icon">🧪</div> {/* Test tube icon */}
    {/* Update text */}
    <h3>No Verified Test Cases</h3>
    <p>There are no verified test cases available to set as baseline.</p>
  </div>
);

// --- Main CreateTestcasebaseline Component ---
const CreateTestcasebaseline = () => {
  // State names adapted for Test Cases
  const [verifiedTestcases, setVerifiedTestcases] = useState([]);
  const [selectedTestcases, setSelectedTestcases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Keep selectAll state for the new layout
  const [selectAll, setSelectAll] = useState(false);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  // --- Handle "Select All" checkbox (Adapted) ---
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTestcases([]); // Use adapted state setter
    } else {
      // Map over verifiedTestcases and get testcase_id
      const allIds = verifiedTestcases.map(tc => tc.testcase_id);
      setSelectedTestcases(allIds); // Use adapted state setter
    }
    setSelectAll(!selectAll);
  };

  // --- Check if all test cases are selected (Adapted) ---
  useEffect(() => {
    if (verifiedTestcases.length > 0) {
      setSelectAll(
        // Compare lengths using adapted state variables
        selectedTestcases.length === verifiedTestcases.length
      );
    } else {
      setSelectAll(false); // Ensure selectAll is false if there are no items
    }
  }, [selectedTestcases, verifiedTestcases]); // Use adapted state variables

  // --- Fetch verified test cases (Adapted from original CreateTestcasebaseline) ---
  useEffect(() => {
    const fetchTestcases = async () => { // Renamed function
      if (!projectId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(
          // Use the correct endpoint for verified test cases
          `http://localhost:3001/testcaseverified/${projectId}`
        );
        // Assuming the endpoint directly returns only verified test cases
        setVerifiedTestcases(response.data); // Use adapted state setter
      } catch (err) { // Catch error specifically
        console.error("Error fetching test cases:", err); // Log error
        setError("Failed to load test cases. Please try again later."); // Set error message
      } finally {
        setLoading(false);
      }
    };

    fetchTestcases();
  }, [projectId]);

  // --- Handle individual selection (Adapted) ---
  const handleSelect = (id) => {
    // Use adapted state setter
    setSelectedTestcases((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  };

  // --- Handle Create Test Case Baseline (Combined Logic) ---
  const handleCreateBaseline = async () => {
    // Input validation
    if (!projectId) {
      toast.error("Invalid project ID.");
      return;
    }
    if (selectedTestcases.length === 0) { // Use adapted state
      toast.warning("Please select at least one test case."); // Update text
      return;
    }
    if (isSubmitting) {
      toast.warning("Submitting in progress. Please wait.");
      return;
    }

    setIsSubmitting(true);

    // --- Payload for /createtestcasebaseline ---
    const payload = {
      testcase_id: selectedTestcases, // Use adapted state and key
      // Add baseline_at if your backend expects it, like in CreateBaseline
      // baseline_at: new Date().toISOString(),
    };
    console.log("Creating test case baseline with payload:", payload);

    try {
      // --- Call API /createtestcasebaseline ---
      const response = await axios.post(
        "http://localhost:3001/createtestcasebaseline",
        payload
      );

      if (response.status === 201) { // Check for successful creation
        console.log("Test case baseline created successfully:", response.data);
        toast.success("Testcase Baseline set successfully!");

        // --- Update status (optional - check if backend does this) ---
        // The original CreateTestcasebaseline didn't explicitly call an update status endpoint
        // It relied on the /createtestcasebaseline endpoint implicitly handling it OR updated frontend state only
        // If you need to explicitly update status like in CreateBaseline, add an API call here.
        // Example: await axios.post("http://localhost:3001/updatetestcasestatus", { testcase_id: selectedTestcases, testcase_status: 'BASELINE' });

        // --- Record History for each selected test case ---
        console.log("Starting history creation loop for test case baseline...");
        // Use Promise.all for potential parallel execution
        await Promise.all(
          selectedTestcases.map(async (testcaseId) => { // Make inner function async
            // Find full details (needed if history endpoint requires more than just ID/status)
            const tcDetail = verifiedTestcases.find(tc => tc.testcase_id === testcaseId);

            if (!tcDetail) {
              console.error(`Could not find details for testcase ID: ${testcaseId}. Skipping history creation.`);
              toast.warn(`Could not find details for TC-${testcaseId}, history not recorded.`);
              return; // Skip this iteration
            }

            const historyPayload = {
              testcase_id: testcaseId,
              testcase_status: "BASELINE",
              // Add other fields required by /addHistorytestcase if any, using tcDetail
              // e.g., testcase_name: tcDetail.testcase_name,
            };
            console.log(`Sending history data for TC ID ${testcaseId}:`, historyPayload);

            try {
              await axios.post("http://localhost:3001/addHistorytestcase", historyPayload);
              console.log(`History added successfully for TC ID ${testcaseId}`);
            } catch (historyError) {
              console.error(`Error sending history for testcase ID: ${testcaseId}`, historyError.response?.data || historyError.message);
              toast.error(`Error recording history for TC-${testcaseId}. Check console.`);
              // Decide if you want to throw error here to stop Promise.all or just warn
            }
          })
        );
        console.log("Finished history creation loop for test case baseline.");


        // --- Update Frontend State ---
        // Remove items that were baselined from the verified list
        setVerifiedTestcases((prev) =>
          prev.filter((tc) => !selectedTestcases.includes(tc.testcase_id))
        );
        setSelectedTestcases([]); // Clear selection
        console.log("Frontend state updated successfully.");


        // --- Navigate after all operations ---
        navigate(`/TestcaseBaseline?project_id=${projectId}`); // Navigate to TestcaseBaseline view

      } else {
        // Handle unexpected success status
        throw new Error(response.data.message || "Failed to set test case baseline. Unexpected status.");
      }
    } catch (error) {
      // Handle errors during API calls
      console.error("Error during test case baseline creation process:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || "An error occurred during the baseline process.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false); // End submitting state
    }
  };

  // --- Handle Cancel (Adapted) ---
  const handleCancel = () => {
    // Navigate back to the TestcaseBaseline view
    navigate(`/TestcaseBaseline?project_id=${projectId}`);
  };

  // --- JSX Structure based on CreateBaseline ---
  return (
    // Use create-testcasebaseline prefix for CSS classes
    <div className="create-testcasebaseline-dashboard">
      <div className="create-testcasebaseline-header">
        <div className="create-testcasebaseline-header-left">
          <button className="create-testcasebaseline-back-button" onClick={handleCancel}>
            <BackIcon />
            <span>Back</span>
          </button>
        </div>
        <div className="create-testcasebaseline-header-title">
          <TestcaseBaselineIcon /> {/* Use specific icon */}
          <h1>Create New Testcase Baseline</h1> {/* Update text */}
        </div>
        <div className="create-testcasebaseline-header-right"></div> {/* Keep for structure */}
      </div>

      <div className="create-testcasebaseline-content">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : verifiedTestcases.length === 0 ? ( // Check adapted state
          <EmptyState />
        ) : (
          // Card structure from CreateBaseline
          <div className="create-testcasebaseline-card">
            <div className="create-testcasebaseline-card-header">
              <div className="create-testcasebaseline-title-section">
                <ListIcon />
                <h2>Verified Test Cases</h2> {/* Update text */}
              </div>
              {/* Selection info */}
              <div className="create-testcasebaseline-selection-info">
                <span>{selectedTestcases.length} of {verifiedTestcases.length} selected</span>
              </div>
            </div>

            {/* Table container */}
            <div className="create-testcasebaseline-table-container">
              <table className="create-testcasebaseline-table">
                <thead>
                  <tr>
                    {/* Select All Checkbox Header */}
                    <th className="col-checkbox">
                      <div className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          id="select-all-tc" // Unique ID
                          className="styled-checkbox" // Assuming same styling class
                          disabled={verifiedTestcases.length === 0} // Disable if no items
                        />
                        <label htmlFor="select-all-tc"></label>
                      </div>
                    </th>
                    {/* Table Headers */}
                    <th className="col-id">ID</th>
                    <th className="col-name">Name</th>
                    <th className="col-type">Type</th>
                    <th className="col-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Map over verifiedTestcases */}
                  {verifiedTestcases.map((tc) => (
                    <tr
                      key={tc.testcase_id}
                      // Apply selected class and click handler
                      className={`create-testcasebaseline-row ${selectedTestcases.includes(tc.testcase_id) ? 'selected' : ''}`}
                      onClick={() => handleSelect(tc.testcase_id)}
                    >
                      <td className="col-checkbox">
                        <div className="checkbox-container">
                          <input
                            type="checkbox"
                            checked={selectedTestcases.includes(tc.testcase_id)}
                            onChange={() => handleSelect(tc.testcase_id)}
                            id={`tc-${tc.testcase_id}`} // Unique ID per row
                            className="styled-checkbox"
                          />
                          <label htmlFor={`tc-${tc.testcase_id}`}></label>
                        </div>
                      </td>
                      {/* Display Test Case Data */}
                      <td className="col-id">
                        {/* Adapt ID formatting if needed */}
                        <span className="tc-id">TC-{String(tc.testcase_id).padStart(3, '0')}</span>
                      </td>
                      <td className="col-name">{tc.testcase_name}</td>
                      <td className="col-type">{tc.testcase_type || 'N/A'}</td>
                      <td className="col-status">
                        {/* Use StatusBadge component */}
                        <StatusBadge status={tc.testcase_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons at the bottom of the card */}
            <div className="create-testcasebaseline-actions">
              <button
                className="create-testcasebaseline-cancel-button"
                onClick={handleCancel}
                disabled={isSubmitting} // Also disable cancel during submit? Optional.
              >
                <CancelIcon />
                <span>Back</span>
              </button>
              <button
                className="create-testcasebaseline-submit-button"
                onClick={handleCreateBaseline}
                // Disable if submitting or nothing selected
                disabled={isSubmitting || selectedTestcases.length === 0}
              >
                <CheckIcon />
                {/* Update button text */}
                <span>{isSubmitting ? "Creating..." : "Set Testcase Baseline"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateTestcasebaseline;