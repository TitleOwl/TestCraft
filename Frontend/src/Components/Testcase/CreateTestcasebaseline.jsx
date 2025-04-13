import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
// Import the specific CSS for CreateTestcasebaseline
import "./testcase_css/CreateTestcasebaseline.css"; // Ensure this points to the updated CSS

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

// --- Custom Status Badge Component ---
const StatusBadge = ({ status }) => {
  let statusClass = "";
  switch (status?.toUpperCase()) {
    case "VERIFIED":
      statusClass = "verified";
      break;
    case "BASELINE":
      statusClass = "baseline";
      break;
    default:
      statusClass = "default";
  }
  // Use the base class with the prefix
  return <span className={`createtestcasebaseline-status-badge ${statusClass}`}>{status || 'N/A'}</span>;
};

// --- Loading Component ---
const LoadingState = () => (
  // Use the correct prefixed class names
  <div className="createtestcasebaseline-loading-state">
    <div className="createtestcasebaseline-loading-spinner"></div>
    <p>Loading test cases...</p>
  </div>
);

// --- Error Component ---
const ErrorState = ({ message }) => (
  // Use the correct prefixed class names
  <div className="createtestcasebaseline-error-state">
    <div className="createtestcasebaseline-error-icon">⚠️</div>
    <h3>Error</h3>
    <p>{message}</p>
  </div>
);

// --- Empty State Component ---
const EmptyState = () => (
  // Use the correct prefixed class names
  <div className="createtestcasebaseline-empty-state">
    <div className="createtestcasebaseline-empty-icon">🧪</div>
    <h3>No Verified Test Cases</h3>
    <p>There are no verified test cases available to set as baseline.</p>
  </div>
);

// --- Main CreateTestcasebaseline Component ---
const CreateTestcasebaseline = () => {
  const [verifiedTestcases, setVerifiedTestcases] = useState([]);
  const [selectedTestcases, setSelectedTestcases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  // --- Handle "Select All" checkbox ---
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTestcases([]);
    } else {
      const allIds = verifiedTestcases.map(tc => tc.testcase_id);
      setSelectedTestcases(allIds);
    }
    setSelectAll(!selectAll);
  };

  // --- Check if all test cases are selected ---
  useEffect(() => {
    if (verifiedTestcases.length > 0) {
      setSelectAll(selectedTestcases.length === verifiedTestcases.length);
    } else {
      setSelectAll(false);
    }
  }, [selectedTestcases, verifiedTestcases]);

  // --- Fetch verified test cases ---
  useEffect(() => {
    const fetchTestcases = async () => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `http://localhost:3001/testcaseverified/${projectId}`
        );
        setVerifiedTestcases(response.data);
      } catch (err) {
        console.error("Error fetching test cases:", err);
        setError("Failed to load test cases. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchTestcases();
  }, [projectId]);

  // --- Handle individual selection ---
  const handleSelect = (id) => {
    setSelectedTestcases((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  };

  // --- Handle Create Test Case Baseline ---
  const handleCreateBaseline = async () => {
    if (!projectId) {
      toast.error("Invalid project ID.");
      return;
    }
    if (selectedTestcases.length === 0) {
      toast.warning("Please select at least one test case.");
      return;
    }
    if (isSubmitting) {
      toast.warning("Submitting in progress. Please wait.");
      return;
    }
    setIsSubmitting(true);
    const payload = { testcase_id: selectedTestcases };
    console.log("Creating test case baseline with payload:", payload);

    try {
      const response = await axios.post(
        "http://localhost:3001/createtestcasebaseline",
        payload
      );

      if (response.status === 201) {
        console.log("Test case baseline created successfully:", response.data);
        console.log("Starting history creation loop for test case baseline...");
        await Promise.all(
          selectedTestcases.map(async (testcaseId) => {
            const tcDetail = verifiedTestcases.find(tc => tc.testcase_id === testcaseId);
            if (!tcDetail) {
              console.error(`Could not find details for testcase ID: ${testcaseId}. Skipping history creation.`);
              toast.warn(`Could not find details for TC-${testcaseId}, history not recorded.`);
              return;
            }
            const historyPayload = {
              testcase_id: testcaseId,
              testcase_status: "BASELINE",
            };
            console.log(`Sending history data for TC ID ${testcaseId}:`, historyPayload);
            try {
              await axios.post("http://localhost:3001/addHistorytestcase", historyPayload);
              console.log(`History added successfully for TC ID ${testcaseId}`);
            } catch (historyError) {
              console.error(`Error sending history for testcase ID: ${testcaseId}`, historyError.response?.data || historyError.message);
              toast.error(`Error recording history for TC-${testcaseId}. Check console.`);
            }
          })
        );
        console.log("Finished history creation loop for test case baseline.");
        setVerifiedTestcases((prev) =>
          prev.filter((tc) => !selectedTestcases.includes(tc.testcase_id))
        );
        setSelectedTestcases([]);
        console.log("Frontend state updated successfully.");
        toast.success("Testcase Baseline set successfully!", {
          onClose: () => {
            console.log("Toast closed, navigating now...");
            navigate(`/TestcaseBaseline?project_id=${projectId}`);
          }
        });
      } else {
        throw new Error(response.data.message || "Failed to set test case baseline. Unexpected status.");
      }
    } catch (error) {
      console.error("Error during test case baseline creation process:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || "An error occurred during the baseline process.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handle Cancel ---
  const handleCancel = () => {
    navigate(`/TestcaseBaseline?project_id=${projectId}`);
  };

  // --- JSX Structure with updated class names ---
  return (
    <div className="createtestcasebaseline-dashboard">
      <div className="createtestcasebaseline-header">
        <div className="createtestcasebaseline-header-left">
          <button className="createtestcasebaseline-back-button" onClick={handleCancel}>
            <BackIcon />
            <span>Back</span>
          </button>
        </div>
        <div className="createtestcasebaseline-header-title">
          <TestcaseBaselineIcon />
          <h1>Create New Testcase Baseline</h1>
        </div>
        <div className="createtestcasebaseline-header-right"></div>
      </div>

      <div className="createtestcasebaseline-content">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : verifiedTestcases.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="createtestcasebaseline-card">
            <div className="createtestcasebaseline-card-header">
              <div className="createtestcasebaseline-title-section">
                <ListIcon />
                <h2>Verified Test Cases</h2>
              </div>
              <div className="createtestcasebaseline-selection-info">
                <span>{selectedTestcases.length} of {verifiedTestcases.length} selected</span>
              </div>
            </div>

            <div className="createtestcasebaseline-table-container">
              <table className="createtestcasebaseline-table">
                <thead>
                  <tr>
                    {/* Use prefixed class names for columns */}
                    <th className="createtestcasebaseline-col-checkbox">
                      <div className="createtestcasebaseline-checkbox-container"> {/* Prefixed */}
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          id="select-all-tc"
                          className="createtestcasebaseline-styled-checkbox" // Prefixed
                          disabled={verifiedTestcases.length === 0}
                        />
                        <label htmlFor="select-all-tc"></label>
                      </div>
                    </th>
                    <th className="createtestcasebaseline-col-id">ID</th>
                    <th className="createtestcasebaseline-col-name">Name</th>
                    <th className="createtestcasebaseline-col-type">Type</th>
                    <th className="createtestcasebaseline-col-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {verifiedTestcases.map((tc) => (
                    <tr
                      key={tc.testcase_id}
                      className={`createtestcasebaseline-row ${selectedTestcases.includes(tc.testcase_id) ? 'selected' : ''}`}
                      onClick={() => handleSelect(tc.testcase_id)}
                    >
                      {/* Use prefixed class names for columns */}
                      <td className="createtestcasebaseline-col-checkbox">
                        <div className="createtestcasebaseline-checkbox-container"> {/* Prefixed */}
                          <input
                            type="checkbox"
                            checked={selectedTestcases.includes(tc.testcase_id)}
                            onChange={() => handleSelect(tc.testcase_id)}
                            id={`tc-${tc.testcase_id}`}
                            className="createtestcasebaseline-styled-checkbox" // Prefixed
                          />
                          <label htmlFor={`tc-${tc.testcase_id}`}></label>
                        </div>
                      </td>
                      <td className="createtestcasebaseline-col-id">
                        {/* Use prefixed class name for TC ID */}
                        <span className="createtestcasebaseline-tc-id">TC-{String(tc.testcase_id).padStart(3, '0')}</span>
                      </td>
                      <td className="createtestcasebaseline-col-name">{tc.testcase_name}</td>
                      <td className="createtestcasebaseline-col-type">{tc.testcase_type || 'N/A'}</td>
                      <td className="createtestcasebaseline-col-status">
                        <StatusBadge status={tc.testcase_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="createtestcasebaseline-actions">
              <button
                className="createtestcasebaseline-cancel-button"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <CancelIcon />
                <span>Back</span> {/* Changed from Cancel to Back */}
              </button>
              <button
                className="createtestcasebaseline-submit-button"
                onClick={handleCreateBaseline}
                disabled={isSubmitting || selectedTestcases.length === 0}
              >
                <CheckIcon />
                <span>{isSubmitting ? "Creating..." : "Set Testcase Baseline"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Container should be placed at the root level or high enough */}
      <ToastContainer
         position="top-right"
         autoClose={3000}
         hideProgressBar={false}
         newestOnTop={false}
         closeOnClick
         rtl={false}
         pauseOnFocusLoss
         draggable
         pauseOnHover
         theme="light" // Match toast theme if needed
      />
    </div>
  );
};

export default CreateTestcasebaseline;