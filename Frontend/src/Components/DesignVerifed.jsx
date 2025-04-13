import React, { useState, useEffect, useRef } from "react"; // Added useRef
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./CSS/DesignVerifed.css"; // Keep DesignVerifed CSS
import trash_comment from "../image/trash_comment.png";
// --- Import FontAwesome ---
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClipboardCheck,
  faListAlt,
  faCheck,
  faComment,
  faTimes, // Keep if used by Swal implicitly or for potential future use
  faDraftingCompass, // Example alternative icon for Design
  // Add any other icons you might need
} from "@fortawesome/free-solid-svg-icons";

const DesignVerifed = () => {
  // --- State Variables (Keep existing) ---
  const [designcriList, setDesigncriList] = useState([]);
  const [designDetails, setDesignDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [checkboxState, setCheckboxState] = useState({});
  const [veridesignBy, setVeridesignBy] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Hooks and Params (Keep existing) ---
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const veridesignId = queryParams.get("veridesign_id");
  const designId = queryParams.get("design_id");
  const storedUsername = localStorage.getItem("username");

  // --- Add navigateBack function (similar to ReqVerification) ---
  const navigateBack = () => {
    // Navigate back to the design verification list, or adjust as needed
    navigate(`/VeriDesign?project_id=${projectId}`);
  };

  // --- useEffect Hooks (Keep existing) ---
  useEffect(() => {
    if (!projectId || !veridesignId || !designId) {
      console.error(
        "Error: Missing required URL parameters (projectId, veridesignId, or designId). Navigating back."
      );
      Swal.fire(
        "Error",
        "Missing required information to load this page.",
        "error"
      ).then(() => navigate("/VeriDesign")); // Adjust navigation target if needed
      return;
    }
    console.log("Initial Fetch Params:", { projectId, veridesignId, designId });
    setLoading(true);
    setLoadingDetails(true);
    setError(null);
    Promise.allSettled([
      fetchCriteria(),
      fetchDesignDetails(),
      fetchVeridesignBy(),
      fetchComments(),
    ]).then((results) => {
      console.log("Initial data fetching settled.");
      results.forEach((result, index) => {
        if (result.status === "rejected")
          console.error(
            `Initial fetch failed for index ${index}:`,
            result.reason
          );
      });
    });
  }, [projectId, veridesignId, designId]); // Removed navigate dependency

  // --- Fetch Functions (Keep existing) ---
  const fetchVeridesignBy = async () => {
    if (!projectId || !veridesignId || !designId) return;
    console.log("[fetchVeridesignBy] Fetching...");
    try {
      const response = await axios.get("http://localhost:3001/designveri", {
        params: { project_id: projectId, veridesign_id: veridesignId, design_id: designId },
      });
      console.log("[fetchVeridesignBy] Raw Response:", response.data);
      if (Array.isArray(response.data)) {
        const numericVeridesignId = parseInt(veridesignId, 10);
        // Find based on 'id' (assuming it's the primary key for the veridesign record)
        const veridesign = response.data.find(item => (item.id === numericVeridesignId));
        if (veridesign && veridesign.veridesign_by) {
          let parsedBy = {};
          // Check if it's a stringified JSON or already an object
          if (typeof veridesign.veridesign_by === 'string') {
            try {
              // Attempt to parse if it's a string "{ \"user\": true }"
              parsedBy = JSON.parse(veridesign.veridesign_by);
            } catch (e) {
              console.error("Error parsing veridesign_by string:", e, "Original:", veridesign.veridesign_by);
              // If parsing fails, treat it as an empty object or handle differently
              parsedBy = {};
            }
          } else if (typeof veridesign.veridesign_by === 'object' && veridesign.veridesign_by !== null) {
            // If it's already an object
            parsedBy = veridesign.veridesign_by;
          }
          // Final validation: ensure it's an object
          if (typeof parsedBy !== 'object' || parsedBy === null) {
            console.warn("Parsed/Original veridesign_by is not a valid object:", parsedBy);
            parsedBy = {};
          }
          console.log("[fetchVeridesignBy] Setting veridesignBy:", parsedBy);
          setVeridesignBy(parsedBy);
        } else {
          console.log("[fetchVeridesignBy] No veridesign record found or veridesign_by is missing/empty.");
          setVeridesignBy({});
        }
      } else {
        console.warn("[fetchVeridesignBy] Response data is not an array.");
        setVeridesignBy({});
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn("[fetchVeridesignBy] Verification record not found (404).");
      } else {
        console.error("Error fetching veridesign_by:", error);
        setError(prev => prev || "Failed to load reviewer status.");
      }
      setVeridesignBy({});
    }
  };

  const fetchCriteria = async () => {
    if (!projectId) return;
    console.log("[fetchCriteria] Fetching...");
    setLoading(true);
    // Don't clear general error here if it might be from another fetch
    try {
      const response = await axios.get(
        `http://localhost:3001/designcriteria/${projectId}`
      );
      const criteriaData = response.data;
      console.log("[fetchCriteria] Raw Response:", criteriaData);
      if (Array.isArray(criteriaData)) {
        const initialCheckboxState = criteriaData.reduce((acc, criteria) => {
          if (criteria && criteria.design_cri_id) {
            acc[criteria.design_cri_id] = false;
          }
          return acc;
        }, {});
        setDesigncriList(criteriaData);
        if (storedUsername && projectId && veridesignId) {
          const storageKey = `checkboxState_${storedUsername}_${projectId}_${veridesignId}`;
          const storedCheckboxState = localStorage.getItem(storageKey);
          try {
            const parsedState = storedCheckboxState
              ? JSON.parse(storedCheckboxState)
              : null;
            const validStoredState = {};
            if (parsedState) {
              criteriaData.forEach((criteria) => {
                if (criteria && criteria.design_cri_id) {
                  validStoredState[criteria.design_cri_id] =
                    parsedState[criteria.design_cri_id] || false;
                }
              });
            }
            console.log(
              "[fetchCriteria] Setting Checkbox State:",
              parsedState ? "From Storage" : "Initial"
            );
            setCheckboxState(parsedState ? validStoredState : initialCheckboxState);
          } catch (e) {
            console.error("Err parse checkbox state", e);
            setCheckboxState(initialCheckboxState);
          }
        } else {
          setCheckboxState(initialCheckboxState);
        }
      } else {
        setError((prev) => prev || "Invalid criteria format.");
        setDesigncriList([]);
        setCheckboxState({});
      }
    } catch (error) {
      console.error("Error fetch criteria:", error);
      setError((prev) => prev || "Failed load criteria.");
      setDesigncriList([]);
      setCheckboxState({});
    } finally {
      setLoading(false);
      console.log("[fetchCriteria] Complete.");
    }
  };

  const fetchDesignDetails = async () => {
    if (!designId) {
      console.error("[fetchDesignDetails] Missing designId parameter.");
      setError("Design ID is missing.");
      setLoadingDetails(false);
      return;
    }
    console.log("[fetchDesignDetails] Fetching...");
    setLoadingDetails(true);
    // Don't clear general error here
    try {
      console.log(
        "[fetchDesignDetails] Fetching details for design IDs string:",
        designId
      );
      const response = await axios.get("http://localhost:3001/verifydesign", {
        params: { design_id: designId },
      });
      console.log("[fetchDesignDetails] Received raw data:", response.data);

      let processedData = [];
      if (Array.isArray(response.data)) {
        processedData = response.data.map((design) => {
          let parsedRequirementId = [];
          if (
            design.requirement_id &&
            typeof design.requirement_id === "string"
          ) {
            try {
              const parsed = JSON.parse(design.requirement_id);
              if (Array.isArray(parsed)) {
                parsedRequirementId = parsed;
              } else {
                console.warn(
                  `[fetchDesignDetails] Parsed req_id for design ${design.design_id} is not array. Original: "${design.requirement_id}"`
                );
              }
            } catch (e) {
              console.error(
                `[fetchDesignDetails] Failed parse req_id for design ${design.design_id}. Original: "${design.requirement_id}"`,
                e
              );
            }
          } else if (Array.isArray(design.requirement_id)) {
            parsedRequirementId = design.requirement_id;
          } else if (design.requirement_id != null) {
            console.warn(
              `[fetchDesignDetails] Unexpected req_id type for design ${design.design_id}.`
            );
          }
          return { ...design, requirement_id: parsedRequirementId };
        });
      } else {
        console.error(
          "[fetchDesignDetails] Error: Expected array from /verifydesign",
          response.data
        );
        setError(
          (prev) => prev || "Received invalid data format for design details."
        );
      }
      console.log(
        "[fetchDesignDetails] Processed data being set to state:",
        processedData
      );
      setDesignDetails(processedData);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn("[fetchDesignDetails] Design details not found (404).");
        setError((prev) => prev || "Design details could not be found.");
      } else {
        console.error("Error fetching design details:", error);
        setError((prev) => prev || "Failed to load design details.");
      }
      setDesignDetails([]);
    } finally {
      setLoadingDetails(false);
      console.log("[fetchDesignDetails] Fetch complete.");
    }
  };

  const fetchComments = async () => {
    if (!veridesignId) return;
    console.log("[fetchComments] Fetching...");
    try {
      const response = await axios.get(
        "http://localhost:3001/get-commentveridesign",
        { params: { veridesign_id: veridesignId } }
      );
      if (Array.isArray(response.data)) {
        setComments(response.data);
      } else {
        console.warn("Non-array comments:", response.data);
        setComments([]);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log("[fetchComments] No comments (404).");
        setComments([]);
      } else {
        console.error("Error fetch comments:", error);
        setError((prev) => prev || "Failed load comments.");
        setComments([]);
      }
    } finally {
      console.log("[fetchComments] Complete.");
    }
  };

  // --- Handlers (Keep existing logic) ---
  const handleCheckboxChange = (id) => {
    setCheckboxState((prevState) => {
      const updatedState = { ...prevState, [id]: !prevState[id] };
      if (storedUsername && projectId && veridesignId) {
        localStorage.setItem(
          `checkboxState_${storedUsername}_${projectId}_${veridesignId}`,
          JSON.stringify(updatedState)
        );
      }
      return updatedState;
    });
  };

  const handleSave = async () => {
    // --- Debugging & Initial Checks ---
    console.log("Attempting to save verification for veridesignId:", veridesignId);
    console.log("Raw designId string (from URL/props):", designId);
    console.log("State designDetails at start of handleSave:", JSON.stringify(designDetails, null, 2));
    console.log("[VeriCri] Checking structure of designcriList:", JSON.stringify(designcriList, null, 2));


    if (!storedUsername) {
      toast.error('User not identified.');
      return;
    }
    if (!veridesignId) {
      toast.error('Verification task ID missing.');
      return;
    }
    // Corrected check for designId: Ensure it's a non-empty string before proceeding
    if (!designId || typeof designId !== 'string' || designId.trim() === '') {
      toast.error('Associated design ID(s) missing or invalid.');
      return;
    }


    // Check criteria completion
    // Ensure designcriList and checkboxState are valid before checking
    const allChecked = Array.isArray(designcriList) && designcriList.length > 0 && typeof checkboxState === 'object' && checkboxState !== null
      ? designcriList.every((criteria) => criteria && checkboxState[criteria.design_cri_id])
      : true; // If no criteria exist, consider it "all checked" for workflow purposes


    // User's logic: If criteria exist but are not all checked, show warning and navigate away
    // Only trigger this warning if there *are* criteria to check
    if (!allChecked && Array.isArray(designcriList) && designcriList.length > 0) {
      toast.warn('Criteria not fully checked. Selections saved (if applicable), returning to list.', {
        onClose: () => navigate(`/VeriDesign?project_id=${projectId}`)
      });
      return; // Return after showing toast
    } else if (!Array.isArray(designcriList) || designcriList.length === 0) {
      console.warn("No design criteria found to check. Proceeding without criteria check.");
    }

    // --- Prepare Data for First API Call ---
    // Ensure veridesignBy is an object before spreading
    const currentVeridesignBy = (typeof veridesignBy === 'object' && veridesignBy !== null) ? veridesignBy : {};
    const updatedVeridesignBy = { ...currentVeridesignBy, [storedUsername]: true };

    const numericVeridesignId = parseInt(veridesignId, 10);
    if (isNaN(numericVeridesignId)) {
      toast.error('Invalid internal ID format.');
      return;
    }

    const updateReviewerPayload = {
      veridesign_id: numericVeridesignId,
      veridesign_by: updatedVeridesignBy // Send the whole updated object
    };
    console.log("Sending payload to /update-veridesign-by:", JSON.stringify(updateReviewerPayload, null, 2));

    setIsSubmitting(true);

    // --- Main Save Process ---
    try {
      // 1. Update reviewer status FIRST
      const response = await axios.put("http://localhost:3001/update-veridesign-by", updateReviewerPayload);

      // Handle specific "not found" message from backend
      if (response.data.message === "ไม่พบข้อมูล veridesign นี้ในฐานข้อมูล") {
        toast.error('Verification data not found on the server.');
        setIsSubmitting(false);
        return;
      }
      // Check for other potential non-200 status codes if the backend doesn't throw an error for them
      if (response.status !== 200) {
        throw new Error(response.data.message || `Failed to update reviewer status. Status: ${response.status}`);
      }

      console.log("Reviewer status update response:", response.data);

      // 2. Refetch verification details to get the *actual* current state after update
      console.log("Refetching verification details after update...");
      if (!projectId) { throw new Error("Missing project ID for refetch."); }

      // Use the same endpoint used in useEffect for consistency
      const updatedResponse = await axios.get("http://localhost:3001/designveri", { params: { project_id: projectId, veridesign_id: numericVeridesignId /* Use numeric ID here */ } });

      if (!updatedResponse.data || (Array.isArray(updatedResponse.data) && updatedResponse.data.length === 0)) {
        console.error("Refetch Error: Could not refetch details, received:", updatedResponse.data);
        throw new Error("Could not refetch verification details after update.");
      }

      // Find the specific verification task data from the refetched response
      let currentVeriData = null;
      if (Array.isArray(updatedResponse.data)) {
        // Find the specific item by its unique ID (Assuming 'id' is the primary key field name from the API)
        currentVeriData = updatedResponse.data.find(d => d.id === numericVeridesignId);
        // If 'id' is not the correct field, adjust this (e.g., d.veridesign_id === numericVeridesignId)
        if (!currentVeriData) {
          // If the endpoint returns only the single item when filtered by veridesign_id, the array might contain just that one item
          if (updatedResponse.data.length === 1 && updatedResponse.data[0]?.id === numericVeridesignId) {
            currentVeriData = updatedResponse.data[0];
          }
        }
      } else if (typeof updatedResponse.data === 'object' && updatedResponse.data !== null && updatedResponse.data.id === numericVeridesignId) {
        // Handle case where API might return a single object if only one matches
        currentVeriData = updatedResponse.data;
      }

      if (!currentVeriData) {
        console.error("Refetch Error: Could not find matching veri data ID:", numericVeridesignId, "in refetched data:", updatedResponse.data);
        throw new Error("Could not find the updated verification data after refetch.");
      }
      console.log("Refetched currentVeriData:", currentVeriData);

      // 3. Check if all reviewed using the REFETCHED data's veridesign_by
      let refetchedVeridesignBy = currentVeriData.veridesign_by;

      // Ensure the refetched data is a usable object
      if (typeof refetchedVeridesignBy === 'string') {
        try { refetchedVeridesignBy = JSON.parse(refetchedVeridesignBy); } catch (e) { console.error("Error parsing refetched veridesign_by", e); refetchedVeridesignBy = {}; }
      }
      if (typeof refetchedVeridesignBy !== 'object' || refetchedVeridesignBy === null) {
        console.warn("Refetched veridesign_by is not a valid object after potential parsing:", refetchedVeridesignBy);
        refetchedVeridesignBy = {}; // Fallback
      }

      // Ensure all values in the refetched veridesign_by object are true
      const allReviewed = Object.keys(refetchedVeridesignBy).length > 0 && Object.values(refetchedVeridesignBy).every((status) => status === true);
      console.log("Checking allReviewed:", allReviewed, "using refetched data:", refetchedVeridesignBy);

      if (allReviewed) {
        console.log("All reviewers have verified. Proceeding to update status, vericri, and history...");
        // 4. Prepare Design IDs
        const designIdsArray = designId.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
        if (designIdsArray.length === 0) {
          toast.error('No valid design IDs to process.');
          setIsSubmitting(false);
          return;
        }
        console.log("Design IDs to update:", designIdsArray);

        // Nested try-catch for the sequence: status update -> vericri save -> history save
        try {
          // 5. Update design status to VERIFIED
          console.log("Updating design statuses to VERIFIED...");
          const updateStatusResponse = await axios.put(`http://localhost:3001/update-design-status-verified`, { design_ids: designIdsArray, design_status: "VERIFIED" });
          console.log("Update status response:", updateStatusResponse.data);

          // Proceed only if status update was successful (typically 200 OK)
          if (updateStatusResponse.status === 200) { // Check for explicit success status/message if needed
            console.log("Status update successful. Starting VeriCri Design and history creation...");

            // ******** START: Save Verification Criteria Details (vericri_design) ********
            const vericriDesignPromises = [];
            const numericProjectId = parseInt(projectId, 10);
            let vericriWarnings = [];

            if (isNaN(numericProjectId)) {
              console.error("Invalid Project ID for VeriCri:", projectId);
              vericriWarnings.push("<li>VeriCri: Invalid Project ID.</li>");
            }

            // Ensure necessary data is available
            if (!isNaN(numericProjectId) && Array.isArray(designcriList) && designcriList.length > 0 && typeof checkboxState === 'object' && checkboxState !== null && Array.isArray(designDetails)) {
              for (const currentDesignId of designIdsArray) {
                console.log(`[VeriCri] Processing design ID: ${currentDesignId}`);
                const designDetail = designDetails.find(d => d.design_id === currentDesignId);

                if (!designDetail) {
                  console.warn(`[VeriCri] Details not found for Design ID: ${currentDesignId}. Skipping vericri_design entries.`);
                  vericriWarnings.push(`<li>VeriCri (Design ${currentDesignId}): Details not found.</li>`);
                  continue;
                }

                // Iterate through criteria list to find CHECKED items
                for (const criteria of designcriList) {
                  // Check if this criterion was checked using its ID
                  if (criteria && checkboxState[criteria.design_cri_id]) { // Added check for criteria existence
                    // Use the correct property for the name
                    const criteriaName = criteria.design_cri_name ?? 'N/A'; // Use design_cri_name

                    if (criteriaName === 'N/A') {
                      console.warn(`[VeriCri] Criteria name missing for ID ${criteria.design_cri_id}. Saving as 'N/A'.`);
                    }

                    const vericriData = {
                      project_id: numericProjectId,
                      designcri_name: criteriaName, // Use the name
                      design_id: currentDesignId,
                      design_type: designDetail.design_type ?? 'N/A',
                      diagram_type: designDetail.diagram_type ?? 'N/A',
                      diagram_name: designDetail.diagram_name ?? 'N/A',
                      design_description: designDetail.design_description ?? ''
                    };
                    console.log(`[VeriCri] Preparing POST for Design ${currentDesignId} / Criteria '${vericriData.designcri_name}'`, vericriData);
                    vericriDesignPromises.push(
                      axios.post("http://localhost:3001/vericri_design", vericriData)
                        .then(res => ({ status: 'fulfilled', designId: currentDesignId, criName: vericriData.designcri_name, response: res }))
                        .catch(err => ({ status: 'rejected', designId: currentDesignId, criName: vericriData.designcri_name, reason: err.response?.data?.error || err.message }))
                    );
                  }
                } // End criteria loop
              } // End design ID loop
            } else {
              // Log why VeriCri is skipped
              console.warn("[VeriCri] Skipping vericri_design saving due to missing data:");
              if (isNaN(numericProjectId)) console.warn("  - Invalid Project ID");
              if (!Array.isArray(designcriList) || designcriList.length === 0) console.warn("  - Design criteria list empty or not loaded.");
              if (typeof checkboxState !== 'object' || checkboxState === null) console.warn("  - Checkbox state not available.");
              if (!Array.isArray(designDetails)) console.warn("  - Design details not loaded.");
              // Add generic warning if specific reason unknown
              if (vericriWarnings.length === 0) vericriWarnings.push("<li>VeriCri: Could not save criteria details (missing data).</li>");
            }

            // Wait for vericri_design saves
            if (vericriDesignPromises.length > 0) {
              console.log(`[VeriCri] Waiting for ${vericriDesignPromises.length} vericri_design records...`);
              const vericriResults = await Promise.allSettled(vericriDesignPromises);
              console.log("[VeriCri] Saving process settled.");
              vericriResults.forEach(result => {
                if (result.status === 'rejected') {
                  const reasonMsg = result.reason?.reason || 'Unknown error';
                  console.error(`[VeriCri] ❌ Failed Design ${result.reason?.designId} / Criteria '${result.reason?.criName}':`, reasonMsg);
                  vericriWarnings.push(`<li>VeriCri (Design ${result.reason?.designId} / Criteria '${result.reason?.criName}'): ${reasonMsg}</li>`);
                } else {
                  console.log(`[VeriCri] ✅ Success Design ${result.value?.designId} / Criteria '${result.value?.criName}'`);
                }
              });
            } else if (vericriWarnings.length === 0) {
              console.log("[VeriCri] No verification criteria records needed (or none checked).");
            }
            // ******** END: Save Verification Criteria Details ********


            // ******** START: History Recording Section ********
            const historyPromises = [];
            let historyWarnings = [];
            console.log('[History] Current designDetails state before history loop:', JSON.stringify(designDetails, null, 2));

            for (const currentDesignId of designIdsArray) {
              console.log(`[History] Processing design ID: ${currentDesignId}`);
              const designDetail = designDetails.find(d => d.design_id === currentDesignId);

              if (!designDetail) {
                console.error(`[History] Details not found for Design ID: ${currentDesignId}. Skipping history.`);
                historyWarnings.push(`<li>History (Design ${currentDesignId}): Details not found.</li>`);
                continue;
              }

              // Use requirement_id which should be an array now
              const requirementIdsToLog = designDetail.requirement_id;
              console.log(`[History] requirement_id for ${currentDesignId}:`, requirementIdsToLog, `(Is Array: ${Array.isArray(requirementIdsToLog)})`);

              // Handle if requirement_id is missing or not an array or empty
              if (!Array.isArray(requirementIdsToLog) || requirementIdsToLog.length === 0) {
                console.warn(`[History] requirement_id is not an array or empty for Design ${currentDesignId}. Creating history with null req_id.`);
                const historyData = {
                  design_id: currentDesignId,
                  requirement_id: null, // Explicitly null
                  design_type: designDetail.design_type ?? 'N/A',
                  diagram_name: designDetail.diagram_name ?? 'N/A',
                  diagram_type: designDetail.diagram_type ?? 'N/A',
                  design_description: designDetail.design_description ?? '',
                  design_status: "VERIFIED" // Status is VERIFIED now
                };
                console.log(`[History] Preparing POST for Design ${currentDesignId} (No specific Req ID)`, historyData);
                historyPromises.push(
                  axios.post("http://localhost:3001/addHistoryDesign", historyData)
                    .then(res => ({ status: 'fulfilled', designId: currentDesignId, reqId: null, response: res }))
                    .catch(err => ({ status: 'rejected', designId: currentDesignId, reqId: null, reason: err.response?.data?.message || err.message }))
                );

              } else {
                // Process each requirement ID in the array
                requirementIdsToLog.forEach(reqId => {
                  const singleReqId = parseInt(reqId, 10);
                  if (isNaN(singleReqId)) {
                    console.warn(`[History] Skipping non-numeric reqId '${reqId}' for Design ${currentDesignId}`);
                    return; // Skip this non-numeric reqId
                  }

                  const historyData = {
                    design_id: currentDesignId,
                    requirement_id: singleReqId, // Single numeric ID
                    design_type: designDetail.design_type ?? 'N/A',
                    diagram_name: designDetail.diagram_name ?? 'N/A',
                    diagram_type: designDetail.diagram_type ?? 'N/A',
                    design_description: designDetail.design_description ?? '',
                    design_status: "VERIFIED" // Status is VERIFIED now
                  };
                  console.log(`[History] Preparing POST for Design ${currentDesignId} / Req ${singleReqId}`, historyData);
                  historyPromises.push(
                    axios.post("http://localhost:3001/addHistoryDesign", historyData)
                      .then(res => ({ status: 'fulfilled', designId: currentDesignId, reqId: singleReqId, response: res }))
                      .catch(err => ({ status: 'rejected', designId: currentDesignId, reqId: singleReqId, reason: err.response?.data?.message || err.message }))
                  );
                });
              }
            } // End history loop

            // Wait for history saves
            if (historyPromises.length > 0) {
              console.log(`[History] Waiting for ${historyPromises.length} history records...`);
              const historyResults = await Promise.allSettled(historyPromises);
              console.log("[History] Saving process settled.");
              historyResults.forEach(result => {
                if (result.status === 'rejected') {
                  const reasonMsg = result.reason?.reason || 'Unknown error';
                  const reqIdText = result.reason?.reqId ?? 'N/A';
                  console.error(`[History] ❌ Failed Design ${result.reason?.designId} / Req ${reqIdText}:`, reasonMsg);
                  historyWarnings.push(`<li>History (Design ${result.reason?.designId} / Req ${reqIdText}): ${reasonMsg}</li>`);
                } else {
                  console.log(`[History] ✅ Success Design ${result.value?.designId} / Req ${result.value?.reqId ?? 'N/A'}`);
                }
              });
            } else if (historyWarnings.length === 0) {
              console.log("[History] No history records needed to be created.");
            }
            // ******** END: History Recording Section ********


            // 7. Final Success/Warning & Navigation
            const allWarnings = [...vericriWarnings, ...historyWarnings];

            if (allWarnings.length > 0) {
              // -- Use toast.warn with custom content and onClose --
              const WarningContent = ({ warnings }) => (
                <div style={{ textAlign: 'left' }}>
                  Process Completed with Issues:
                  <ul style={{ marginLeft: '15px', marginTop: '5px', maxHeight: '100px', overflowY: 'auto', fontSize: '0.9em' }}>
                    {warnings.map((warnHtml, index) => (
                      // Render HTML string safely (basic example)
                      <li key={index} dangerouslySetInnerHTML={{ __html: warnHtml.replace(/<li>|<\/li>/g, '') }} />
                    ))}
                  </ul>
                  Check console for details.
                </div>
              );
              toast.warn(<WarningContent warnings={allWarnings} />, {
                autoClose: false, // Keep open until user interaction
                closeOnClick: false, // Might be hard to click if list is long
                onClose: () => {
                  console.log("Warning(Issues) toast closed, navigating...");
                  navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } });
                }
              });

            } else {
              toast.success("All Verified! Design status, criteria details, and history updated successfully.", {
                onClose: () => {
                  console.log("All Verified toast closed, navigating...");
                  navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } });
                }
              });
            }

          } else { // Status update call itself failed (e.g., non-200 response not caught as error)
            console.error("Status Update Failed - Response indicates failure:", updateStatusResponse.data);
            toast.error(updateStatusResponse.data?.message || "Status Update Failed: Could not update design status. Check server logs.");
            // No need to proceed further
          }
        } catch (processError) { // Catch errors during the VERIFIED sequence (status update, vericri, history)
          console.error("Error in VERIFIED process (status/vericri/history):", processError);
          const errMsg = processError.response?.data?.message || processError.response?.data?.error || processError.message || "An unexpected error occurred during the final processing steps.";
          toast.error(`Process Error: ${errMsg}`);
        }

      } else { // Not all reviewers have verified yet (based on refetched data)
        console.log("Not all reviewers have verified yet. Current user's input saved.");
        toast.info("Verification Input Saved. Waiting for other reviewers.", {
          onClose: () => {
            console.log("Info toast closed, navigating...");
            // Navigate back to the list or dashboard - Choose the appropriate destination
            navigate(`/VeriDesign?project_id=${projectId}`); // Or /Dashboard?project_id=...
            // navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } }); // Alternative: Go to dashboard
          }
          // autoClose: 2500, // Optional: close automatically
        });
      }
    } catch (error) { // Outer catch for initial update/refetch errors or unexpected issues
      console.error("Error in main save process (update/refetch):", error);
      const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || "An unexpected error occurred during save.";
      toast.error(`Save Error: ${errMsg}`);
    } finally {
      setIsSubmitting(false); // Re-enable button when process ends
    }
  };

  // --- Comment Handlers (Keep existing) ---
  const handleSubmit = async () => {
    if (!newComment.trim()) {
      // Use toast for inline errors maybe? Or keep Swal? Let's use toast here.
      toast.warn("Please enter a comment before submitting.");
      // setError("กรุณาใส่ข้อความก่อนโพสต์"); // Keep state error if preferred
      return;
    }
    setError(null); // Clear previous comment errors
    try {
      const response = await axios.post(
        "http://localhost:3001/commentveridesign",
        {
          member_name: storedUsername,
          comverdesign_text: newComment,
          veridesign_id: veridesignId,
        }
      );
      if (response.status === 201) {
        setNewComment("");
        fetchComments(); // Refresh comments list
        toast.success("Comment added.", { autoClose: 2000 });
      } else {
        // Handle unexpected success status
        toast.warn("Comment submitted, but received an unexpected response.");
      }
    } catch (error) {
      console.error("Err post comment:", error);
      const msg =
        error.response?.data?.message || "Error posting comment.";
      toast.error(msg);
      // setError(msg); // Set state error if needed for display elsewhere
    }
  };

  const handleDelete = async (comverdesign_id) => {
    Swal.fire({
      title: "Delete comment?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6", // Optional: style cancel button
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await axios.delete(
            `http://localhost:3001/delete-commentveridesign/${comverdesign_id}`
          );
          // Check for 200 OK or 204 No Content
          if (response.status === 200 || response.status === 204) {
            toast.success("Comment deleted.", { autoClose: 2000 });
            setComments((prev) =>
              prev.filter((c) => c.comverdesign_id !== comverdesign_id)
            );
          } else {
            // Throw error for unexpected success statuses
            throw new Error(
              response.data?.message || `Unexpected status: ${response.status}`
            );
          }
        } catch (error) {
          console.error("Err delete comment:", error);
          toast.error(
            "Error deleting comment: " +
            (error.response?.data?.message || error.message)
          );
        }
      }
    });
  };

  // --- JSX Rendering (Adopt ReqVerification structure, use DesignVerifed CSS classes) ---
  return (
    // Use root class from DesignVerifed.css if it exists, otherwise adopt reqveri-container naming convention
    <div className="designveri-container"> {/* Or keep design-verified-container if that's the root */}

      {/* Header Section (Adopted from ReqVerification) */}
      <div className="designveri-header"> {/* Use designveri-header class */}
        <button className="designveri-back-btn" onClick={navigateBack}> {/* Use designveri-back-btn class */}
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1 className="designveri-title"> {/* Use designveri-title class */}
          <FontAwesomeIcon icon={faDraftingCompass} className="designveri-title-icon" /> {/* Use designveri-title-icon class */}
          Design Verification
        </h1>
        {/* Optional: Add project context if needed */}
      </div>

      {/* Display General Errors Below Header */}
      {error && <p className="designveri-main-error">{error}</p>}


      {/* Flex Container for Checklist and Comments (Adopted from ReqVerification) */}
      <div className="designveri-flex-container"> {/* Use designveri-flex-container class */}

        {/* Checklist Box */}
        {/* Use designveri-box class or specific checklistveri-design-box */}
        <div className="checklistveri-design-box">
          <h2>
            <FontAwesomeIcon icon={faListAlt} className="designveri-icon" /> {/* Use designveri-icon class */}
            Checklist
          </h2>
          {loading ? (
            <div className="designveri-loading"> {/* Optional: Add loading style */}
              <div className="designveri-spinner"></div> {/* Optional: Add spinner */}
              <span>Loading Checklist...</span>
            </div>
          ) : designcriList.length === 0 ? (
            <p className="designveri-no-items">No criteria found for this project.</p> /* Add class */
          ) : (
            <ul className="checklistveri-design-list"> {/* Keep original class */}
              {designcriList.map((criteria) => (
                <li key={criteria.design_cri_id} className="checklistveri-design-item"> {/* Keep original class */}
                  <label className="checklistveri-design-label"> {/* Keep original class */}
                    <input
                      type="checkbox"
                      className="checklistveri-design-checkbox" // Keep original class
                      checked={checkboxState[criteria.design_cri_id] || false}
                      onChange={() => handleCheckboxChange(criteria.design_cri_id)}
                      // Disable checkbox if user has already verified
                      disabled={!!veridesignBy[storedUsername] || isSubmitting}
                    />
                    {criteria.design_cri_name} {/* Ensure this is the correct property name */}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Comments Box */}
        {/* Use designveri-box class or specific commentveridesign-box */}
        <div className="commentveridesign-box">
          <h2>
            <FontAwesomeIcon icon={faComment} className="designveri-icon" /> {/* Use designveri-icon class */}
            Comments ({comments.length})
          </h2>
          {/* Use a container similar to reqveri, but with designveri class */}
          <div className="designveri-comment-container">
            {/* Keep the existing comment section structure from DesignVerifed */}
            <div className="commentveridesign-input-container">
              <textarea
                placeholder={`Add comment as ${storedUsername}...`}
                className="commentveridesign-textarea"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isSubmitting} // Disable while submitting comment maybe?
              />
              <button
                className="commentveridesign-submit-button"
                onClick={handleSubmit}
                disabled={!newComment.trim() || isSubmitting} // Disable if empty or submitting
              >
                Comment
              </button>
            </div>

            {/* Display comment-specific errors inline if needed */}
            {/* {error && error.includes("comment") && <p className="commentveridesign-error-message">{error}</p>} */}

            {/* Comment List */}
            <div className="commentveridesign-list-area"> {/* Optional wrapper for scrolling */}
              {comments.length === 0 ? (
                <p className="commentveridesign-no-comments">No comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.comverdesign_id} className="commentveridesign-item">
                    <div className="commentveridesign-header">
                      <span className="commentveridesign-name">{comment.member_name}</span>
                      <span className="commentveridesign-time">{new Date(comment.comverdesign_at).toLocaleString()}</span>
                    </div>
                    <p className="commentveridesign-text">{comment.comverdesign_text}</p>
                    <div className="commentveridesign-footer">
                      {/* Only show delete for the user's own comments, potentially */}
                      {comment.member_name === storedUsername && (
                        <button
                          className="commentveridesign-delete-button"
                          onClick={() => handleDelete(comment.comverdesign_id)}
                          title="Delete comment"
                        >
                          <img src={trash_comment} alt="Delete" className="commentveridesign-trash" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Design Details Table (Adopted from ReqVerification's requirements section) */}
      {/* Use classes like designveri-box designveri-details */}
      <div className="designveri-box designveri-details">
        <h2>
          <FontAwesomeIcon icon={faClipboardCheck} className="designveri-icon" /> {/* Use designveri-icon class */}
          Design Details Included in Verification
        </h2>
        {loadingDetails ? (
          <div className="designveri-loading"> {/* Optional: Add loading style */}
            <div className="designveri-spinner"></div> {/* Optional: Add spinner */}
            <span>Loading Details...</span>
          </div>
        ) : designDetails.length === 0 ? (
          <p className="designveri-no-items">No design details associated with this verification task.</p>
        ) : (
          <table className="designveri-table"> {/* Use designveri-table class */}
            <thead>
              <tr>
                <th>ID</th>
                <th>Diagram Name</th>
                <th>Design Type</th>
                <th>Related Req. IDs</th>
              </tr>
            </thead>
            <tbody>
              {designDetails.map((design) => (
                <tr key={design.design_id}>
                  <td>SD-{String(design.design_id).padStart(3, '0')}</td> {/* Adjusted padding */}
                  <td>{design.diagram_name || "N/A"}</td>
                  <td>{design.design_type || "N/A"}</td>
                  <td>
                    {/* Ensure requirement_id is treated as an array */}
                    {Array.isArray(design.requirement_id)
                      ? (design.requirement_id.length > 0
                        ? design.requirement_id.map(rid => `REQ-${String(rid).padStart(3, '0')}`).join(', ') // Format IDs
                        : '-')
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Button Container (Adopted from ReqVerification) */}
      <div className="designveri-button-container"> {/* Use designveri-button-container class */}
        <button className="designveri-cancel-button" onClick={navigateBack} disabled={isSubmitting}> {/* Use designveri-cancel-button */}
          Cancel
        </button>
        <button
          className="designveri-save-button" // Use designveri-save-button
          onClick={handleSave}
          // Disable if still loading, already submitted, or during submission process
          disabled={loading || loadingDetails || isSubmitting || !!veridesignBy[storedUsername]}
          title={veridesignBy[storedUsername] ? "You have already verified" : (isSubmitting ? "Saving..." : "Save your verification checklist")}
        >
          <FontAwesomeIcon icon={faCheck} />
          {isSubmitting ? "Saving..." : (veridesignBy[storedUsername] ? "Save" : "Save Verification")}
        </button>
      </div>

      {/* SweetAlert2 is triggered via functions, no specific JSX needed here unless you add custom modals */}

    </div> // End designveri-container
  );
};

export default DesignVerifed;