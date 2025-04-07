import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import "./CSS/DesignVerifed.css"; // ตรวจสอบ Path CSS
import trash_comment from "../image/trash_comment.png"; // ตรวจสอบ Path รูปภาพ

const DesignVerifed = () => {
    // --- State Variables ---
    const [designcriList, setDesigncriList] = useState([]);
    const [designDetails, setDesignDetails] = useState([]); // State ที่เก็บข้อมูล Design
    const [loading, setLoading] = useState(true); // Loading สำหรับ Criteria
    const [loadingDetails, setLoadingDetails] = useState(true); // Loading แยกสำหรับ Design Details
    const [checkboxState, setCheckboxState] = useState({});
    const [veridesignBy, setVeridesignBy] = useState({});
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [error, setError] = useState(null); // Error ทั่วไป หรือสำหรับ comments/details
    const [isSubmitting, setIsSubmitting] = useState(false); // State สำหรับปุ่ม Save

    // --- Hooks and Params ---
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const veridesignId = queryParams.get("veridesign_id");
    const designId = queryParams.get("design_id"); // นี่คือ string ที่คั่นด้วย comma เช่น "6,7"
    const storedUsername = localStorage.getItem("username");

    // --- useEffect Hooks ---
    useEffect(() => {
        if (!projectId || !veridesignId || !designId) {
            console.error("Error: Missing required URL parameters (projectId, veridesignId, or designId). Navigating back.");
            Swal.fire('Error', 'Missing required information to load this page.', 'error')
               .then(() => navigate("/VeriDesign"));
            return;
        }
        console.log("Initial Fetch Params:", { projectId, veridesignId, designId });
        setLoading(true); setLoadingDetails(true); setError(null);
        Promise.allSettled([ fetchCriteria(), fetchDesignDetails(), fetchVeridesignBy(), fetchComments() ])
            .then(results => {
                console.log("Initial data fetching settled.");
                results.forEach((result, index) => {
                    if (result.status === 'rejected') console.error(`Initial fetch failed for index ${index}:`, result.reason);
                });
            });
    }, [projectId, veridesignId, designId]); // Removed navigate dependency


    // --- Fetch Functions ---
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
                const veridesign = response.data.find(item => (item.id === numericVeridesignId || item.veridesign_id === numericVeridesignId));
                if (veridesign && veridesign.veridesign_by) {
                    let parsedBy = {};
                    if(typeof veridesign.veridesign_by === 'string') {
                        try { parsedBy = JSON.parse(veridesign.veridesign_by); } catch(e) { console.error("Err parse veridesign_by", e); parsedBy = {}; }
                    } else if (typeof veridesign.veridesign_by === 'object' && veridesign.veridesign_by !== null) {
                        parsedBy = veridesign.veridesign_by;
                    }
                    if (typeof parsedBy !== 'object' || parsedBy === null) { parsedBy = {}; }
                    console.log("[fetchVeridesignBy] Setting veridesignBy:", parsedBy);
                    setVeridesignBy(parsedBy);
                } else { setVeridesignBy({}); }
            } else { setVeridesignBy({}); }
        } catch (error) {
            if (error.response && error.response.status === 404) console.warn("[fetchVeridesignBy] 404");
            else { console.error("Error fetch veridesign_by:", error); setError(prev => prev || "Failed load reviewer status."); }
            setVeridesignBy({});
        }
    };

    const fetchCriteria = async () => {
        if (!projectId) return;
        console.log("[fetchCriteria] Fetching...");
        setLoading(true); setError(null);
        try {
            const response = await axios.get(`http://localhost:3001/designcriteria/${projectId}`);
            const criteriaData = response.data;
            console.log("[fetchCriteria] Raw Response:", criteriaData);
            if (Array.isArray(criteriaData)) {
                const initialCheckboxState = criteriaData.reduce((acc, criteria) => { if (criteria && criteria.design_cri_id) { acc[criteria.design_cri_id] = false; } return acc; }, {});
                setDesigncriList(criteriaData);
                if (storedUsername && projectId && veridesignId) {
                    const storageKey = `checkboxState_${storedUsername}_${projectId}_${veridesignId}`;
                    const storedCheckboxState = localStorage.getItem(storageKey);
                    try {
                        const parsedState = storedCheckboxState ? JSON.parse(storedCheckboxState) : null;
                        const validStoredState = {};
                        if (parsedState) { criteriaData.forEach(criteria => { if (criteria && criteria.design_cri_id) { validStoredState[criteria.design_cri_id] = parsedState[criteria.design_cri_id] || false; } }); }
                        console.log("[fetchCriteria] Setting Checkbox State:", parsedState ? 'From Storage' : 'Initial');
                        setCheckboxState(parsedState ? validStoredState : initialCheckboxState);
                    } catch (e) { console.error("Err parse checkbox state", e); setCheckboxState(initialCheckboxState); }
                } else { setCheckboxState(initialCheckboxState); }
            } else { setError(prev => prev || "Invalid criteria format."); setDesigncriList([]); setCheckboxState({}); }
        } catch (error) { console.error("Error fetch criteria:", error); setError(prev => prev || "Failed load criteria."); setDesigncriList([]); setCheckboxState({});
        } finally { setLoading(false); console.log("[fetchCriteria] Complete."); }
    };

    // ******** START: CORRECTED fetchDesignDetails Function ********
    // ฟังก์ชันนี้ถูกแก้ไขให้ Parse requirement_id ก่อน set State
    const fetchDesignDetails = async () => {
        // ไม่ต้องรับ selectedDesign เป็น argument แล้ว เพราะใช้ designId จาก URL
        if (!designId) {
             console.error("[fetchDesignDetails] Missing designId parameter.");
             setError("Design ID is missing.");
             setLoadingDetails(false);
             return;
        };
        console.log("[fetchDesignDetails] Fetching...");
        setLoadingDetails(true);
        setError(null); // เคลียร์ error เก่าที่เกี่ยวกับ details
        try {
            console.log("[fetchDesignDetails] Fetching details for design IDs string:", designId);
            const response = await axios.get("http://localhost:3001/verifydesign", { // <<< ใช้ endpoint /verifydesign
                params: { design_id: designId },
            });
            console.log("[fetchDesignDetails] Received raw data:", response.data);

            let processedData = [];
            if (Array.isArray(response.data)) {
                // --- ทำการ Parse requirement_id ---
                processedData = response.data.map(design => {
                    let parsedRequirementId = []; // Default เป็น Array ว่าง
                    if (design.requirement_id && typeof design.requirement_id === 'string') {
                        try {
                            const parsed = JSON.parse(design.requirement_id);
                            if (Array.isArray(parsed)) {
                                parsedRequirementId = parsed;
                            } else {
                                console.warn(`[fetchDesignDetails] Parsed req_id for design ${design.design_id} is not array. Original: "${design.requirement_id}"`);
                            }
                        } catch (e) {
                            console.error(`[fetchDesignDetails] Failed parse req_id for design ${design.design_id}. Original: "${design.requirement_id}"`, e);
                        }
                    } else if (Array.isArray(design.requirement_id)) {
                        parsedRequirementId = design.requirement_id; // เป็น Array อยู่แล้ว
                    } else if (design.requirement_id != null) {
                         console.warn(`[fetchDesignDetails] Unexpected req_id type for design ${design.design_id}.`);
                    }
                    // Else: null or undefined, ใช้ default []
                    return { ...design, requirement_id: parsedRequirementId }; // <<< ใช้ค่าที่ Parse แล้ว
                });
                // ---------------------------------
            } else {
                 console.error("[fetchDesignDetails] Error: Expected array from /verifydesign", response.data);
                 setError(prev => prev || "Received invalid data format for design details.");
            }

            console.log("[fetchDesignDetails] Processed data being set to state:", processedData);
            setDesignDetails(processedData); // <<< ตั้ง State ด้วยข้อมูลที่ Process แล้ว

        } catch (error) {
             if (error.response && error.response.status === 404) {
                  console.warn("[fetchDesignDetails] Design details not found (404).");
                  setError(prev => prev || "Design details could not be found.");
             } else {
                console.error("Error fetching design details:", error);
                setError(prev => prev || "Failed to load design details.");
             }
            setDesignDetails([]);
        } finally {
             setLoadingDetails(false);
             console.log("[fetchDesignDetails] Fetch complete.");
         }
    };
    // ******** END: CORRECTED fetchDesignDetails Function ********


    const fetchComments = async () => {
        if (!veridesignId) return;
        console.log("[fetchComments] Fetching...");
        try {
            const response = await axios.get("http://localhost:3001/get-commentveridesign", { params: { veridesign_id: veridesignId } });
             if(Array.isArray(response.data)){ setComments(response.data); }
             else { console.warn("Non-array comments:", response.data); setComments([]); }
        } catch (error) {
            if (error.response && error.response.status === 404) { console.log("[fetchComments] No comments (404)."); setComments([]); }
            else { console.error("Error fetch comments:", error); setError(prev => prev || "Failed load comments."); setComments([]); }
        } finally { console.log("[fetchComments] Complete."); }
    };

    const handleCheckboxChange = (id) => {
        setCheckboxState((prevState) => {
            const updatedState = { ...prevState, [id]: !prevState[id] };
             if (storedUsername && projectId && veridesignId) { localStorage.setItem(`checkboxState_${storedUsername}_${projectId}_${veridesignId}`, JSON.stringify(updatedState)); }
            return updatedState;
        });
    };


        // ***** START: handleSave Function *****
        const handleSave = async () => {
            // --- Debugging & Initial Checks ---
            console.log("Attempting to save verification for veridesignId:", veridesignId);
            console.log("Raw designId string (from URL/props):", designId);
            console.log("State designDetails at start of handleSave:", JSON.stringify(designDetails, null, 2));
    
            // ***** ADD THIS LINE to check the structure *****
            console.log("[VeriCri] Checking structure of designcriList:", JSON.stringify(designcriList, null, 2));
            // ************************************************
    
    
            if (!storedUsername) { Swal.fire('Error', 'User not identified.', 'error'); return; }
            if (!veridesignId) { Swal.fire('Error', 'Verification task ID missing.', 'error'); return; }
            if (!designId || typeof designId !== 'string' || designId.trim() === '') { Swal.fire('Error', 'Associated design IDs missing.', 'error'); return; }
    
            // Check criteria completion
            const allChecked = Array.isArray(designcriList) && designcriList.length > 0 && designcriList.every((criteria) => !!checkboxState[criteria?.design_cri_id]);
             // User's updated logic for incomplete criteria: Show message and navigate away
             if (!allChecked && Array.isArray(designcriList) && designcriList.length > 0) {
                 Swal.fire({ icon: 'warning', title: 'Incomplete Criteria', text: 'Criteria selections saved (if applicable), returning to list.' }); // Adjusted text
                 // Decide if you want to save intermediate state here before navigating
                 // Maybe call update-veridesign-by only? Depends on requirements.
                 // For now, just navigates as per user's code:
                 navigate(`/VeriDesign?project_id=${projectId}`); // Navigate to VeriDesign list page?
                 return;
             } else if (!Array.isArray(designcriList) || designcriList.length === 0) {
                  console.warn("No design criteria found to check. Proceeding without criteria check.");
             }
    
            // --- Prepare Data for First API Call ---
            // Ensure veridesignBy state is correctly updated/fetched before this point
            const updatedVeridesignBy = { ...veridesignBy, [storedUsername]: true };
            const numericVeridesignId = parseInt(veridesignId, 10);
            if (isNaN(numericVeridesignId)) { Swal.fire('Error', 'Invalid internal ID format.', 'error'); return; }
            const updateReviewerPayload = { veridesign_id: numericVeridesignId, veridesign_by: updatedVeridesignBy };
            console.log("Sending payload to /update-veridesign-by:", JSON.stringify(updateReviewerPayload, null, 2));
    
            setIsSubmitting(true); // <<< Disable ปุ่ม
    
            // --- Main Save Process ---
            try {
                // 1. Update reviewer status
                const response = await axios.put("http://localhost:3001/update-veridesign-by", updateReviewerPayload);
                if (response.data.message === "ไม่พบข้อมูล veridesign นี้ในฐานข้อมูล") { Swal.fire('Not Found', 'Verification data not found.', 'error'); setIsSubmitting(false); return; }
                console.log("Reviewer status update response:", response.data);
    
                // 2. Refetch verification details (Crucial after updating reviewer)
                console.log("Refetching verification details...");
                if (!projectId) { throw new Error("Missing project ID for refetch."); }
                const updatedResponse = await axios.get("http://localhost:3001/designveri", { params: { project_id: projectId, veridesign_id: numericVeridesignId, design_id: designId } });
                 if (!updatedResponse.data || (Array.isArray(updatedResponse.data) && updatedResponse.data.length === 0)) { throw new Error("Could not refetch details (empty or non-array)."); }
    
                 // Find the specific verification task data from the potentially filtered response
                 let currentVeriData = null;
                 if(Array.isArray(updatedResponse.data)) {
                     currentVeriData = updatedResponse.data.find(d => d.id === numericVeridesignId); // Assuming 'id' is the veridesign_id in the response
                 }
                 // Handle case where response might be a single object if only one result matches
                 else if (typeof updatedResponse.data === 'object' && updatedResponse.data !== null && updatedResponse.data.id === numericVeridesignId) {
                    currentVeriData = updatedResponse.data;
                 }
    
                if (!currentVeriData) { console.error("Refetch Error: Could not find matching veri data ID:", numericVeridesignId, "in", updatedResponse.data); throw new Error("Could not find current veri data in refetch."); }
                console.log("Refetched currentVeriData:", currentVeriData);
    
                // 3. Check if all reviewed using the REFETCHED data
                let parsedVeridesignBy = currentVeriData.veridesign_by; // Use the freshly fetched data
                if (typeof parsedVeridesignBy !== 'object' || parsedVeridesignBy === null) {
                     console.warn("Refetched veridesign_by is not a valid object:", parsedVeridesignBy);
                     parsedVeridesignBy = {}; // Fallback
                 }
                // Ensure all values in the veridesign_by object are true
                const allReviewed = Object.keys(parsedVeridesignBy).length > 0 && Object.values(parsedVeridesignBy).every((status) => status === true);
                console.log("Checking allReviewed:", allReviewed, "using refetched data:", parsedVeridesignBy);
    
                if (allReviewed) {
                    console.log("All reviewers have verified. Proceeding to update status, vericri, and history...");
                    // 4. Prepare Design IDs
                    const designIdsArray = designId.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
                    if (designIdsArray.length === 0) { Swal.fire('Error', 'No valid design IDs to process.', 'error'); setIsSubmitting(false); return; }
                    console.log("Design IDs to update:", designIdsArray);
    
                    // Nested try-catch for the sequence: status update -> vericri save -> history save
                    try {
                        // 5. Update design status to VERIFIED
                        console.log("Updating design statuses to VERIFIED...");
                        const updateStatusResponse = await axios.put(`http://localhost:3001/update-design-status-verified`, { design_ids: designIdsArray, design_status: "VERIFIED" });
                        console.log("Update status response:", updateStatusResponse.data);
    
                        // Proceed only if status update was successful
                        if (updateStatusResponse.status === 200 && updateStatusResponse.data.message === "Design status updated to VERIFIED successfully.") {
                            console.log("Status update successful. Starting VeriCri Design and history creation...");
    
                            // ******** START: Save Verification Criteria Details (vericri_design) ********
                            const vericriDesignPromises = [];
                            const numericProjectId = parseInt(projectId, 10);
                            let vericriWarnings = [];
    
                            // Ensure necessary data is available
                            if (Array.isArray(designcriList) && designcriList.length > 0 && typeof checkboxState === 'object' && checkboxState !== null && Array.isArray(designDetails)) {
                                for (const currentDesignId of designIdsArray) {
                                    console.log(`[VeriCri] Processing design ID: ${currentDesignId}`);
                                    const designDetail = designDetails.find(d => d.design_id === currentDesignId);
    
                                    if (!designDetail) {
                                        console.warn(`[VeriCri] Details not found for Design ID: ${currentDesignId}. Skipping vericri_design entries.`);
                                        vericriWarnings.push(`<li>VeriCri (Design ${currentDesignId}): Details not found.</li>`);
                                        continue;
                                    }
    
                                    // Iterate through criteria list
                                    for (const criteria of designcriList) {
                                        // Check if this criterion was checked
                                        if (checkboxState[criteria.design_cri_id]) {

                                            // --- แก้ไข: ใช้ Property Name ที่ตรงกับส่วนแสดงผล JSX ---
                                            const criteriaName = criteria.design_cri_name ?? 'N/A'; // <<< --- แก้ไขเป็น design_cri_name และใส่ ?? 'N/A' กลับมา

                                            // เพิ่ม console.warn เพื่อช่วยตรวจสอบ ถ้าค่าเป็น N/A ทั้งที่ property น่าจะถูกแล้ว
                                            if (criteriaName === 'N/A' && criteria.design_cri_name !== null && criteria.design_cri_name !== undefined) {
                                                 console.warn(`[VeriCri] Property 'design_cri_name' ถูกต้อง แต่ค่าเป็น N/A สำหรับ ID ${criteria.design_cri_id}.`);
                                            } else if (criteriaName === 'N/A') {
                                                 console.warn(`[VeriCri] ไม่พบค่าใน Property 'design_cri_name' สำหรับ ID ${criteria.design_cri_id}. บันทึกเป็น 'N/A'.`);
                                            }


                                            const vericriData = {
                                                project_id: isNaN(numericProjectId) ? null : numericProjectId,
                                                designcri_name: criteriaName, // ใช้ชื่อที่แก้ไขแล้ว
                                                design_id: currentDesignId,
                                                // ใช้ ?? 'N/A' กับ field อื่นๆ ด้วยเพื่อความปลอดภัย
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
                                console.warn("[VeriCri] Skipping vericri_design saving: Missing required data (designcriList, checkboxState, or designDetails).");
                                if (!Array.isArray(designcriList) || designcriList.length === 0) vericriWarnings.push("<li>VeriCri: No criteria were available to save.</li>");
                                if (typeof checkboxState !== 'object' || checkboxState === null) vericriWarnings.push("<li>VeriCri: Checkbox state not available.</li>");
                                if (!Array.isArray(designDetails)) vericriWarnings.push("<li>VeriCri: Design details not loaded.</li>");
                            }
    
                            // Wait for vericri_design saves
                            if (vericriDesignPromises.length > 0) {
                                console.log(`[VeriCri] Waiting for ${vericriDesignPromises.length} vericri_design records...`);
                                const vericriResults = await Promise.allSettled(vericriDesignPromises);
                                console.log("[VeriCri] Saving process settled.");
                                vericriResults.forEach(result => {
                                    if (result.status === 'rejected') {
                                        console.error(`[VeriCri] ❌ Failed Design <span class="math-inline">\{result\.reason\.designId\} / Criteria '</span>{result.reason.criName}':`, result.reason.reason);
                                        vericriWarnings.push(`<li>VeriCri (Design <span class="math-inline">\{result\.reason\.designId\} / Criteria '</span>{result.reason.criName}'): ${result.reason.reason}</li>`);
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
                                 console.log(`[History] Found designDetail for ${currentDesignId}:`, designDetail ? 'Found' : 'Not Found');
    
                                if (!designDetail) {
                                    console.error(`[History] Details not found for Design ID: ${currentDesignId}. Skipping history.`);
                                    historyWarnings.push(`<li>History (Design ${currentDesignId}): Details not found.</li>`);
                                    continue;
                                }
    
                                // Use requirement_id which should be an array now
                                const requirementIdsToLog = designDetail.requirement_id;
                                console.log(`[History] requirement_id for ${currentDesignId}:`, requirementIdsToLog, `(Is Array: ${Array.isArray(requirementIdsToLog)})`);
    
                                if (Array.isArray(requirementIdsToLog) && requirementIdsToLog.length > 0) {
                                    requirementIdsToLog.forEach(reqId => {
                                        const singleReqId = parseInt(reqId, 10);
                                        if (isNaN(singleReqId)) { console.warn(`[History] Skipping non-numeric reqId '${reqId}' for Design ${currentDesignId}`); return; }
    
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
                                } else {
                                    console.log(`[History] No valid requirement IDs array for Design ${currentDesignId}. Skipping requirement history.`);
                                    // Optionally create history with null req_id if desired/allowed by DB
                                }
                            } // End history loop
    
                            // Wait for history saves
                            if (historyPromises.length > 0) {
                                 console.log(`[History] Waiting for ${historyPromises.length} history records...`);
                                 const historyResults = await Promise.allSettled(historyPromises);
                                 console.log("[History] Saving process settled.");
                                  historyResults.forEach(result => {
                                     if (result.status === 'rejected') {
                                         console.error(`[History] ❌ Failed Design ${result.reason.designId} / Req ${result.reason.reqId}:`, result.reason.reason);
                                         historyWarnings.push(`<li>History (Design ${result.reason.designId} / Req ${result.reason.reqId}): ${result.reason.reason}</li>`);
                                     }
                                  });
                             } else if(historyWarnings.length === 0) {
                                  console.log("[History] No history records needed to be created.");
                             }
                             // ******** END: History Recording Section ********
    
    
                             // 7. Final Success/Warning & Navigation
                             const allWarnings = [...vericriWarnings, ...historyWarnings];
    
                             if (allWarnings.length > 0) {
                                 Swal.fire({
                                     icon: 'warning',
                                     title: 'Process Completed with Issues',
                                     html: `Design status updated, but some records failed to save:<ul style="text-align:left; margin-left: 20px;">${allWarnings.join('')}</ul>`,
                                     showConfirmButton: true,
                                     confirmButtonText: 'Go to Dashboard'
                                 }).then((result) => {
                                    // Navigate regardless of confirmation, as status is already VERIFIED
                                    navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } });
                                 });
                             } else {
                                 Swal.fire({ icon: "success", title: "All Verified!", text: "Design status, criteria details, and history updated successfully.", timer: 2000, showConfirmButton: false })
                                    .then(() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } }));
                             }
    
                        } else { // Status update call failed (e.g., 4xx, 5xx response)
                            console.error("Status Update Failed:", updateStatusResponse.data);
                            // Use message from response if available, otherwise a generic message
                            Swal.fire({ icon: "error", title: "Status Update Failed", text: updateStatusResponse.data?.message || "Could not update design status. Check server logs." });
                             // No need to proceed further if status update fails
                        }
                    } catch (processError) { // Catch errors during the VERIFIED sequence (status update, vericri, history)
                        console.error("Error in VERIFIED process (status/vericri/history):", processError);
                        // Try to get a meaningful error message
                        const errMsg = processError.response?.data?.message || processError.response?.data?.error || processError.message || "An unexpected error occurred.";
                        Swal.fire({ icon: "error", title: "Process Error", text: errMsg });
                    }
    
                } else { // Not all reviewers have verified yet
                    console.log("Not all reviewers have verified yet. Current user's input saved.");
                    Swal.fire({ icon: "info", title: "Verification Input Saved", text: "Your input is saved. Waiting for other reviewers to complete verification." });
                    // Navigate back to the dashboard or list page, as the task isn't fully complete for this design yet
                     navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } });
                }
            } catch (error) { // Outer catch for initial update/refetch errors or unexpected issues
                console.error("Error in main save process (update/refetch):", error);
                 const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || "An unexpected error occurred during save.";
                Swal.fire({ icon: "error", title: "Save Error", text: errMsg });
            } finally {
                 setIsSubmitting(false); // <<< Re-enable ปุ่มเมื่อจบ Process เสมอ
             }
        };



    // --- Comment Handlers (Keep as is) ---
    const handleSubmit = async () => {
        if (!newComment.trim()) { setError("กรุณาใส่ข้อความก่อนโพสต์"); return; }
        setError(null);
        try {
            const response = await axios.post("http://localhost:3001/commentveridesign", { member_name: storedUsername, comverdesign_text: newComment, veridesign_id: veridesignId });
            if (response.status === 201) { setNewComment(""); fetchComments(); toast.success("Comment added.", { autoClose: 2000 }); }
            else { toast.warn("Comment might not have been added."); }
        } catch (error) { console.error("Err post comment:", error); const msg = error.response?.data?.message || "Error posting comment."; toast.error(msg); setError(msg); }
    };
    const handleDelete = async (comverdesign_id) => {
         Swal.fire({ title: 'Delete comment?', text: "This action cannot be undone.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, delete!' })
         .then(async (result) => {
             if (result.isConfirmed) {
                 try {
                     const response = await axios.delete(`http://localhost:3001/delete-commentveridesign/${comverdesign_id}`);
                     if (response.status === 200 || response.status === 204) {
                         toast.success("Comment deleted.", { autoClose: 2000 });
                         setComments(prev => prev.filter(c => c.comverdesign_id !== comverdesign_id));
                     } else { throw new Error(response.data?.message || `Status ${response.status}`); }
                 } catch (error) { console.error("Err delete comment:", error); toast.error("Error: " + (error.response?.data?.message || error.message)); }
             }
         });
    };


    // --- JSX Rendering ---
    return (
        <div className="designveri-container">
            <h1 className="title-designver">Verification Design</h1>
             {error && <p className="designveri-main-error" style={{color: 'red', marginBottom:'10px', border:'1px solid red', padding:'5px'}}>{error}</p>}

            {/* ... Rest of JSX remains the same ... */}
             <div className="design-verified-container">
                 {/* Checklist */}
                 <div className="checklistveri-design-box">
                     <h2 className="checklistveri-design-title">Verification Checklist</h2>
                      {loading ? <p>Loading Checklist...</p> : designcriList.length === 0 ? <p>No criteria found.</p> : (
                          <ul className="checklistveri-design-list">
                              {designcriList.map((criteria) => (
                                 <li key={criteria.design_cri_id} className="checklistveri-design-item">
                                     <label className="checklistveri-design-label">
                                         <input type="checkbox" className="checklistveri-design-checkbox" checked={checkboxState[criteria.design_cri_id] || false} onChange={() => handleCheckboxChange(criteria.design_cri_id)} disabled={!!veridesignBy[storedUsername]}/>
                                         {criteria.design_cri_name}
                                     </label>
                                 </li>
                             ))}
                          </ul>
                      )}
                 </div>
                  {/* Comments */}
                  <div className="commentveridesign-box">
                    <div className="commentveridesign-section">
                        <h2 className="commentveridesign-title">Comments ({comments.length})</h2>

                        <div className="commentveridesign-input-container">
                            <textarea
                                placeholder={`Add comment as ${storedUsername}...`}
                                className="commentveridesign-textarea"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                            />
                            <button className="commentveridesign-submit-button" onClick={handleSubmit}>
                                Submit
                            </button>
                        </div>

                        {error && <p className="commentveridesign-error-message">{error}</p>}

                        {comments.length === 0 ? (
                            <p className="commentveridesign-no-comments">No comments available at the moment.</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.comverdesign_id} className="commentveridesign-item">
                                    <div className="commentveridesign-header">
                                        <span className="commentveridesign-name">{comment.member_name}</span>
                                        <span className="commentveridesign-time">{new Date(comment.comverdesign_at).toLocaleString()}</span>
                                    </div>
                                    <p className="commentveridesign-text">{comment.comverdesign_text}</p>
                                    <div className="commentveridesign-footer">
                                        <button
                                            className="commentveridesign-delete-button"
                                            onClick={() => handleDelete(comment.comverdesign_id)}
                                        >
                                            <img src={trash_comment} alt="Delete" className="commentveridesign-trash" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
             </div>
              {/* Design Details */}
             <div className="boxrequirement-designveri">
                 <h1 className="title-softwaredesign">Software Design Details</h1>
                  {loadingDetails ? <p>Loading details...</p> : error && !error.includes("comments") && !error.includes("reviewer") && !error.includes("criteria") ? <p style={{color:'red'}}>{error}</p> : (
                      <table className="table-req-designveri">
                          <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Req. IDs</th></tr></thead>
                          <tbody>
                              {designDetails.length > 0 ? (
                                  designDetails.map((design) => (
                                      <tr key={design.design_id}>
                                          <td>SD-{String(design.design_id).padStart(2, '0')}</td>
                                          <td>{design.diagram_name || "N/A"}</td>
                                          <td>{design.design_type || "N/A"}</td>
                                          <td>{Array.isArray(design.requirement_id) ? (design.requirement_id.length > 0 ? design.requirement_id.join(', ') : '-') : 'N/A'}</td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr><td colSpan="4">No design details loaded.</td></tr>
                              )}
                          </tbody>
                      </table>
                  )}
             </div>
              {/* Buttons */}
             <div className="button-container">
                 <button onClick={handleSave} className="savedesignveri-button" disabled={loading || loadingDetails || isSubmitting || !!veridesignBy[storedUsername]} title={veridesignBy[storedUsername] ? "Already verified" : ""}>
                     {isSubmitting ? "Saving..." : (veridesignBy[storedUsername] ? "Verified" : "Save Verification")}
                 </button>
             </div>
        </div>
    );
};

export default DesignVerifed;