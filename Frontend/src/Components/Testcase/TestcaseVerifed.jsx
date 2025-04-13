import React, { useState, useEffect, useCallback, useRef } from "react"; // Added useRef
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
// Import your CSS file or reuse ReqVerification's structural CSS
import "./testcase_css/TestcaseVerifed.css"; // Make sure this file exists and is styled
// OR uncomment below if reusing ReqVerification styles and adjust class names if needed
// import "./CSS/ReqVerification.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClipboardCheck, // Keep for consistency or change
  faListAlt,
  faCheck,
  faComment,
  faTimes, // For delete icon or potential alerts
  faVial, // Test tube icon for Test Cases
  faTasks, // Alternative: Tasks icon
} from "@fortawesome/free-solid-svg-icons";
import trash_comment from "../../image/trash_comment.png"; // Your existing image import

// Removed 'Data' import from 'emoji-mart' as it wasn't used

const TestcaseVerifed = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const veriTestcaseId = queryParams.get("veritestcase_id");
  const testcaseId = queryParams.get("testcase_id"); // Important: Used for fetching details and saving

  // State variables remain the same
  const [testcasecriList, setTestcasecriList] = useState([]);
  const [testcaseDetails, setTestcaseDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkboxState, setCheckboxState] = useState({});
  const [veritestcaseBy, setVeritestcaseBy] = useState({}); // Keep state for reviewers
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState(null); // Keep comment error state

  const storedUsername = localStorage.getItem("username");

  // --- Data Fetching Logic (useCallback hooks remain) ---
  const fetchVeriTestcaseBy = useCallback(async () => {
    if (!projectId || !veriTestcaseId || !testcaseId) return;
    try {
      const response = await axios.get("http://localhost:3001/testcaseveri", {
        params: {
          project_id: projectId,
          veritestcase_id: veriTestcaseId,
          // testcase_id: testcaseId, // Might not be needed just to get reviewer list for a specific verification ID
        },
      });
      // Find the specific verification entry
      const veritestcase = response.data.find(
        (item) => item.id === parseInt(veriTestcaseId)
      );
      setVeritestcaseBy(veritestcase?.veritestcase_by || {});
      console.log("Fetched reviewer status:", veritestcase?.veritestcase_by);
    } catch (error) {
      console.error("Error fetching veritestcase_by:", error);
      toast.error("Failed to load reviewer status.");
    }
  }, [projectId, veriTestcaseId]); // Removed testcaseId dependency if not needed for this specific fetch

  const fetchCriteria = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await axios.get(
        `http://localhost:3001/testcasecriteria/${projectId}`
      );
      const initialCheckboxState = response.data.reduce((acc, criteria) => {
        acc[criteria.testcasecri_id] = false;
        return acc;
      }, {});
      setTestcasecriList(response.data);

      // Load checkbox state from localStorage
      if (storedUsername && projectId && veriTestcaseId) {
        const storageKey = `checkboxState_${storedUsername}_${projectId}_${veriTestcaseId}`;
        console.log("Attempting to load testcase checkbox state from key:", storageKey);
        const storedCheckboxState = localStorage.getItem(storageKey);
        if (storedCheckboxState) {
          try {
            const parsedState = JSON.parse(storedCheckboxState);
            // Ensure loaded state aligns with fetched criteria
            const validState = response.data.reduce((acc, criteria) => {
              acc[criteria.testcasecri_id] = !!parsedState[criteria.testcasecri_id]; // Use boolean value from storage or default to false
              return acc;
            }, {});
            setCheckboxState(validState);
            console.log("Loaded and validated testcase checkbox state:", validState);
          } catch (parseError) {
            console.error("Error parsing stored testcase checkbox state:", parseError);
            setCheckboxState(initialCheckboxState); // Fallback to initial state
            localStorage.removeItem(storageKey); // Remove corrupted data
          }
        } else {
          console.log("No testcase checkbox state found for this key, using initial.");
          setCheckboxState(initialCheckboxState);
        }
      } else {
        console.log("Missing user/project/verification ID for testcase state; using initial.");
        setCheckboxState(initialCheckboxState);
      }

    } catch (error) {
      console.error("Error fetching testcase criteria:", error);
      toast.error("Failed to load criteria checklist.");
      setTestcasecriList([]); // Set to empty array on error
      setCheckboxState({});
    }
  }, [projectId, veriTestcaseId, storedUsername]);

  const fetchTestcaseDetails = useCallback(async () => {
    // 1. ตรวจสอบว่ามี testcaseId ใน URL หรือไม่ (เหมือนเดิม)
    if (!testcaseId) {
      console.warn("No testcase_id found in URL query params.");
      setTestcaseDetails([]); // ตั้งค่าเป็น array ว่าง ถ้าไม่มี ID
      return;
    }

    // 2. ส่ง testcaseId (ที่เป็น String จาก URL) ไปยัง API โดยตรง
    try {
      console.log("Fetching test case details using testcase_id string:", testcaseId); // Log ค่าที่ส่งไป
      const response = await axios.get("http://localhost:3001/verifytestcase", {
        // --- ส่ง String เดิม ไม่แปลงเป็น Array ---
        params: { testcase_id: testcaseId },
      });

      // 3. ตั้งค่า State โดยตรวจสอบให้แน่ใจว่าเป็น Array (เพิ่มความปลอดภัย)
      setTestcaseDetails(Array.isArray(response.data) ? response.data : []);
      console.log("Fetched test case details data:", response.data);

    } catch (error) {
      // 4. จัดการ Error (เหมือนเดิม)
      console.error("Error fetching testcase details:", error);
      toast.error("Failed to load test case details.");
      setTestcaseDetails([]); // ตั้งค่าเป็น array ว่าง เมื่อเกิด Error
    }
    // 5. Dependency ยังคงเป็น testcaseId (เหมือนเดิม)
  }, [testcaseId]);

  const fetchComments = useCallback(async () => {
    if (!veriTestcaseId) return;
    try {
      const response = await axios.get(
        "http://localhost:3001/get-commentveritestcase",
        {
          params: { veritestcase_id: veriTestcaseId },
        }
      );
      // Ensure response data is an array
      setComments(Array.isArray(response.data) ? response.data : []);
      console.log("Fetched comments:", response.data);
    } catch (error) {
      console.error("Error fetching comments:", error);
      if (error.response && error.response.status === 404) {
        console.warn("Comment endpoint not found (404). No comments loaded.");
      } else {
        toast.error("Failed to fetch comments.");
      }
      setComments([]); // Set to empty array on error or 404
    }
  }, [veriTestcaseId]);

  // --- useEffect for Initial Data Load ---
  useEffect(() => {
    if (!projectId || !veriTestcaseId || !testcaseId) {
      console.error(
        "Project ID, Verification ID, or Testcase ID is missing in URL."
      );
      toast.error(
        "Required information is missing. Please go back and try again.", { toastId: "missing-ids" }
      );
      setLoading(false);
      navigate(`/VeriTestcase?project_id=${projectId || ""}`); // Navigate back to list page or a safe fallback
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors

    // Fetch all data concurrently
    Promise.all([
      fetchCriteria(),
      fetchTestcaseDetails(),
      fetchVeriTestcaseBy(),
      fetchComments(), // Fetch comments on initial load
    ])
      .catch((err) => {
        console.error("Error during initial data fetch group:", err);
        // Maybe set a general error state for the page
        // setError("Failed to load initial page data.");
        toast.error("Failed to load page data.", { toastId: "initial-load-error" });
      })
      .finally(() => {
        setLoading(false); // Stop loading indicator regardless of success or failure
      });

    // Dependencies for the initial load effect
  }, [
    projectId,
    veriTestcaseId,
    testcaseId,
    navigate,
    fetchCriteria,
    fetchTestcaseDetails,
    fetchVeriTestcaseBy,
    fetchComments, // Include fetchComments
  ]);


  // --- Handler Functions ---

  // Checkbox Change Handler
  const handleCheckboxChange = (id) => {
    const updatedState = {
      ...checkboxState,
      [id]: !checkboxState[id],
    };
    setCheckboxState(updatedState);

    console.log("Testcase Checkbox state updated:", updatedState);

    // Save to localStorage
    if (storedUsername && projectId && veriTestcaseId) {
      const storageKey = `checkboxState_${storedUsername}_${projectId}_${veriTestcaseId}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedState));
        console.log("Saved testcase checkbox state to localStorage.");
      } catch (storageError) {
        console.error("Error saving checkbox state to localStorage:", storageError);
        toast.warn("Could not save checklist progress.");
      }
    } else {
      console.warn(
        "Could not save checkbox state to localStorage - missing required IDs or username."
      );
    }
  };

  // Save Handler (Core Verification Logic) - Kept mostly the same logic as before
  const handleSave = async () => {
    console.log("Current testcase checkbox state before save:", checkboxState);
    console.log("Testcase IDs from URL for verification:", testcaseId);

    if (!storedUsername) {
      toast.warning("Reviewer information missing. Please refresh.", { toastId: "save-no-user" });
      return;
    }

    // Check if all criteria list items are checked
    const allChecked = testcasecriList.length > 0 && testcasecriList.every(criteria => !!checkboxState[criteria.testcasecri_id]);

    // --- Action if NOT all checked: Just save progress and navigate back ---
    if (!allChecked) {
      toast.warning("Criteria checklist saved, but not all items are checked.", {
        toastId: "save-incomplete-testcase-criteria",
        autoClose: 1500, // Shorter duration
      });
      // Explicitly save state to localStorage here *could* be redundant if handleCheckboxChange works,
      // but ensures the latest state is saved before navigating.
      // localStorage.setItem(`checkboxState_${storedUsername}_${projectId}_${veriTestcaseId}`, JSON.stringify(checkboxState));

      setTimeout(() => {
        toast.dismiss("save-incomplete-testcase-criteria");
        navigate(`/VeriTestcase?project_id=${projectId}`); // Navigate back to the list
      }, 1500);
      return; // Stop the function here
    }

    // --- Action if ALL checked: Proceed with full verification ---
    try {
      // 1. Fetch current verification data (to get the latest reviewer list)
      const { data: currentData } = await axios.get("http://localhost:3001/testcaseveri", {
        params: { project_id: projectId, veritestcase_id: veriTestcaseId },
      });
      const veritestcaseData = currentData.find(item => item.id === parseInt(veriTestcaseId));

      if (!veritestcaseData) {
        toast.error(`Verification record ID ${veriTestcaseId} not found.`, { toastId: `veritestcase-notfound-${veriTestcaseId}` });
        return;
      }

      // 2. Update the reviewer status for the current user
      let currentVeritestcaseBy = veritestcaseData.veritestcase_by || {};
      // Ensure it's an object
      if (typeof currentVeritestcaseBy !== 'object' || currentVeritestcaseBy === null) {
        currentVeritestcaseBy = {};
      }
      const updatedVeritestcaseBy = { ...currentVeritestcaseBy, [storedUsername]: true };

      // 3. Send the updated reviewer list back to the server
      const updateReviewerResponse = await axios.put("http://localhost:3001/update-veritestcase-by", {
        veritestcaseid: parseInt(veriTestcaseId),
        veritestcaseby: updatedVeritestcaseBy,
      });

      if (updateReviewerResponse.status !== 200) {
        throw new Error(updateReviewerResponse.data.message || 'Failed to update reviewer status');
      }
      console.log("Reviewer status updated:", updateReviewerResponse.data);

      // 4. Check if *all* reviewers listed in the updated object have now marked 'true'
      // We use `updatedVeritestcaseBy` directly as the server confirmed the update
      const allReviewed = Object.keys(updatedVeritestcaseBy).length > 0 &&
        Object.values(updatedVeritestcaseBy).every(status => status === true);

      console.log("All Reviewed Status:", allReviewed, "Reviewers:", updatedVeritestcaseBy);

      // 5. Handle based on whether all reviewers are done
      if (!allReviewed) {
        toast.info("Your verification is saved. Waiting for other reviewers.", {
          toastId: "waiting-for-others-testcase",
          autoClose: 2000,
          onClose: () => { // Navigate after the toast closes
            navigate(`/Dashboard?project_id=${projectId}`, { // Or back to VeriTestcase list
              state: { selectedSection: "Testcase" }
            });
          }
        });
        return; // Stop here, wait for others
      }

      // --- All reviewers have verified ---
      console.log("All reviewers have verified. Proceeding to update test case status...");

      // Parse the testcase IDs from the URL parameter
      const testcaseIdsArray = testcaseId
        .split(",")
        .map(id => id.trim())
        .filter(id => id && !isNaN(id))
        .map(id => parseInt(id)); // Ensure they are numbers

      if (testcaseIdsArray.length === 0) {
        toast.error("No valid testcase IDs found to update.", { toastId: "no-valid-tc-ids" });
        return;
      }
      console.log("Testcase IDs to update to VERIFIED:", testcaseIdsArray);

      // Wrap final steps in a try/catch to handle errors during status update or saving details
      try {
        // 6. Update testcase status to VERIFIED
        const updateStatusResponse = await axios.put("http://localhost:3001/update-testcase-status-verified", {
          testcase_ids: testcaseIdsArray,
          testcase_status: "VERIFIED",
        });

        if (updateStatusResponse.status !== 200 || !updateStatusResponse.data.message?.includes("VERIFIED successfully")) {
          throw new Error(updateStatusResponse.data.message || "Failed to update test case status.");
        }
        console.log("Test case status updated to VERIFIED.");

        // 7. Save verification results and history (Loop through IDs)
        console.log("Saving verification results and history...");
        const criteriaNames = testcasecriList.map(c => c.testcasecri_name);
        const reviewerNames = Object.keys(updatedVeritestcaseBy); // Use the final list of reviewers who verified

        for (const tcId of testcaseIdsArray) {
          try {
            // Save Verification Result
            const verificationResultPayload = {
              testcase_id: tcId,
              verification_checklist: JSON.stringify(criteriaNames), // Checklist items used
              verify_by: JSON.stringify(reviewerNames), // Reviewers who verified
              project_id: parseInt(projectId),
              veritestcase_id: parseInt(veriTestcaseId) // Link back to the verification task
            };
            await axios.post('http://localhost:3001/save-testcase-verification-result', verificationResultPayload);
            console.log(`Saved verification result for TC ID: ${tcId}`);

            // Save History
            const historyPayload = {
              testcase_id: tcId,
              testcase_status: "VERIFIED" // The new status
            };
            await axios.post('http://localhost:3001/addHistoryTestcase', historyPayload);
            console.log(`Saved history for TC ID: ${tcId}`);

          } catch (loopError) {
            console.error(`Error saving details/history for TC ID ${tcId}:`, loopError);
            toast.warn(`Could not save details/history for Test Case ID: ${tcId}.`, { toastId: `save-error-tc-${tcId}` });
            // Continue loop for other IDs
          }
        } // End loop

        // 8. Clear localStorage state for this verification and notify success
        if (storedUsername && projectId && veriTestcaseId) {
          const storageKey = `checkboxState_${storedUsername}_${projectId}_${veriTestcaseId}`;
          localStorage.removeItem(storageKey);
          console.log("Cleared testcase checkbox state from localStorage:", storageKey);
        }

        toast.success("All verified! Test Case status updated to VERIFIED.", {
          toastId: "testcase-verification-complete",
          autoClose: 1500,
          onClose: () => { // Navigate after success toast
            navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } });
          }
        });

      } catch (finalStepError) {
        console.error("Error during final verification steps (status update/saving):", finalStepError);
        toast.error(`Failed to finalize verification: ${finalStepError.message || 'Check console.'}`, {
          toastId: "final-testcase-step-error"
        });
        // Optional: Navigate somewhere even on partial failure?
        // setTimeout(() => navigate(`/Dashboard?project_id=${projectId}`), 2000);
      }

    } catch (error) {
      console.error("Error during Test Case verification save process:", error);
      if (error.response) {
        console.error("Error Response Data:", error.response.data);
        toast.error(`Error: ${error.response.data.message || 'Failed to save.'}`, { toastId: "save-general-error-testcase" });
      } else {
        toast.error("An unexpected error occurred while saving.", { toastId: "save-network-error-testcase" });
      }
    }
  }; // --- End handleSave ---


  // Comment Submit Handler
  const handleCommentSubmit = async () => { // Renamed from handleSubmit to be more specific
    if (!newComment.trim()) {
      setError("Please enter a comment before submitting."); // Use state for inline error
      return;
    }
    setError(null); // Clear error message

    try {
      const response = await axios.post("http://localhost:3001/commentveritestcase", {
        member_name: storedUsername || "Unknown User", // Fallback username
        comvertestcase_text: newComment,
        veritestcase_id: veriTestcaseId
      });

      if (response.status === 201) {
        setNewComment(""); // Clear input field
        fetchComments(); // Refresh the comments list
        toast.success("Comment added successfully.", { autoClose: 2000 });
      } else {
        // If API returns 200 but not 201, or other success codes
        throw new Error(response.data.message || `Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error(`Error posting comment: ${error.message || 'Server error'}`);
      setError("Failed to post comment. Please try again."); // Show error near input
    }
  };

  // Comment Delete Handler
  const handleCommentDelete = async (comvertestcase_id) => { // Renamed from handleDelete
    // Confirmation dialog
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const response = await axios.delete(
        `http://localhost:3001/delete-commentveritestcase/${comvertestcase_id}`
      );

      // Check for successful deletion (status code 200 or 204 No Content are common)
      if (response.status !== 200 && response.status !== 204) {
        throw new Error(response.data.error || "Failed to delete comment");
      }

      toast.success("Comment deleted successfully");
      // Update comment list locally for immediate UI feedback
      setComments((prevComments) =>
        prevComments.filter((comment) => comment.comvertestcase_id !== comvertestcase_id)
      );
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error(`Error deleting comment: ${error.message}`);
    }
  };

  // --- Navigation Function ---
  const navigateBack = () => {
    // Navigate back to the verification list page for the current project
    navigate(`/VeriTestcase?project_id=${projectId}`);
  };

  // --- JSX Structure (Refactored) ---
  return (
    // Use unique prefix for container class
    <div className="testcaseveri-container">
      {/* Header Section */}
      <div className="testcaseveri-header">
        <button className="testcaseveri-back-btn" onClick={navigateBack}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1 className="testcaseveri-title">
          <FontAwesomeIcon icon={faTasks} className="testcaseveri-title-icon" /> {/* Tasks icon */}
          Test Case Verification
        </h1>
      </div>

      {/* Flex Container for Checklist and Comments */}
      <div className="testcaseveri-flex-container">
        {/* Checklist Box */}
        <div className="testcaseveri-box">
          <h2>
            <FontAwesomeIcon icon={faListAlt} className="testcaseveri-icon" />
            Checklist
          </h2>
          {loading ? (
            <div className="testcaseveri-loading">
              <div className="testcaseveri-spinner"></div>
              <span>Loading Checklist...</span>
            </div>
          ) : (
            <ul className="testcaseveri-checklist">
              {testcasecriList.length > 0 ? (
                testcasecriList.map((criteria) => (
                  <li key={criteria.testcasecri_id}>
                    <label>
                      <input
                        type="checkbox"
                        className="testcaseveri-checkbox"
                        checked={checkboxState[criteria.testcasecri_id] || false}
                        onChange={() => handleCheckboxChange(criteria.testcasecri_id)}
                      />
                      {criteria.testcasecri_name}
                    </label>
                  </li>
                ))
              ) : (
                // Display message if no criteria are loaded/available
                <li className="testcaseveri-no-items">No checklist criteria found for this project.</li>
              )}
            </ul>
          )}
        </div>

        {/* Comment Box */}
        <div className="testcaseveri-box">
          <h2>
            <FontAwesomeIcon icon={faComment} className="testcaseveri-icon" />
            Comments ({comments.length})
          </h2>
          {/* Container for comment input and list */}
          <div className="testcaseveri-comment-container">
            {/* Input area for new comments */}
            <div className="testcaseveri-comment-input-area">
              <textarea
                placeholder={`Add comment as ${storedUsername || 'User'}...`}
                className="testcaseveri-comment-textarea"
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  if (error) setError(null); // Clear error on typing
                }}
              />
              <button className="testcaseveri-comment-submit-btn" onClick={handleCommentSubmit}>
                Add Comment
              </button>
            </div>
            {/* Display error message related to comment submission */}
            {error && <p className="testcaseveri-comment-error">{error}</p>}

            {/* List of existing comments */}
            <div className="testcaseveri-comment-list">
              {/* Show loading only if comments haven't loaded yet */}
              {loading && comments.length === 0 ? (
                <p>Loading comments...</p>
              ) : !loading && comments.length === 0 ? (
                <p className="testcaseveri-no-comments">No comments yet.</p>
              ) : (
                // Map through comments and display them
                comments.map((comment) => (
                  <div key={comment.comvertestcase_id} className="testcaseveri-comment-item">
                    <div className="testcaseveri-comment-header">
                      <span className="testcaseveri-comment-author">{comment.member_name}</span>
                      <span className="testcaseveri-comment-date">
                        {/* Format timestamp */}
                        {new Date(comment.comvertestcase_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="testcaseveri-comment-text">{comment.comvertestcase_text}</p>
                    <div className="testcaseveri-comment-footer">
                      {/* Show delete button only if the logged-in user is the author */}
                      {comment.member_name === storedUsername && (
                        <button
                          className="testcaseveri-comment-delete-btn"
                          onClick={() => handleCommentDelete(comment.comvertestcase_id)}
                          title="Delete Comment" // Tooltip for accessibility
                        >
                          {/* Use your trash icon image */}
                          <img src={trash_comment} alt="Delete" className="testcaseveri-delete-icon" />
                          {/* Or use FontAwesome: <FontAwesomeIcon icon={faTimes} /> */}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div> {/* End Flex Container */}

      {/* Test Case Details Box */}
      {/* Added specific class 'testcaseveri-details' for potentially different styling */}
      <div className="testcaseveri-box testcaseveri-details">
        <h2>
          <FontAwesomeIcon icon={faVial} className="testcaseveri-icon" /> {/* Test tube icon */}
          Test Cases
        </h2>
        {/* Table for displaying test case details */}
        <table className="testcaseveri-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Test Case Name</th>
              <th>Type</th>
              {/* Add other relevant columns */}
            </tr>
          </thead>
          <tbody>
            {/* Show loading state */}
            {loading && testcaseDetails.length === 0 ? (
              <tr><td colSpan="3" style={{ textAlign: 'center' }}>Loading details...</td></tr>
            ) : testcaseDetails.length > 0 ? (
              // Map through details if available
              testcaseDetails.map((testcase, index) => (
                // Use unique key, preferably testcase_id if guaranteed unique
                <tr key={testcase.testcase_id || `tc-${index}`}>
                  {/* Format Test Case ID */}
                  <td>TC-{String(testcase.testcase_id).padStart(3, '0')}</td>
                  <td>{testcase.testcase_name || "N/A"}</td>
                  <td>{testcase.testcase_type || "N/A"}</td>
                </tr>
              ))
            ) : (
              // Show message if no details are found/loaded
              <tr>
                <td colSpan="3" style={{ textAlign: 'center' }}>No test case details found or associated with this verification.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Button Container at the bottom */}
      <div className="testcaseveri-button-container">
        <button className="testcaseveri-cancel-button" onClick={navigateBack}>
          Cancel
        </button>
        <button className="testcaseveri-save-button" onClick={handleSave}>
          <FontAwesomeIcon icon={faCheck} />
          {/* Change text based on whether all checked? Optional. */}
          Save Verification
        </button>
      </div>

      {/* react-toastify handles notifications, no custom alert component needed here */}
    </div> // End container
  );
};

export default TestcaseVerifed;