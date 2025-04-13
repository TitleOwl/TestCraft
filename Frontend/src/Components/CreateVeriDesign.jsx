import React, { useState, useEffect } from "react";
import axios from "axios";
// import Swal from "sweetalert2"; // <--- ลบออก
import { toast, ToastContainer } from 'react-toastify'; // <--- เพิ่ม import toast และ ToastContainer
import 'react-toastify/dist/ReactToastify.css';   // <--- เพิ่ม import CSS ของ toastify
import { useLocation, useNavigate } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride';

// Import CSS
import "./CSS/CreateVeriDesign.css";

// Import icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faClipboardCheck,
    faUsers,
    faCheckCircle,
    faTimes,
    faArrowLeft,
    faSearch,
    faFilter,
    faSpinner,
    faExclamationTriangle,
    faQuestionCircle,
    faDraftingCompass // ไม่ได้ถูกใช้ แต่เก็บไว้ก่อน
} from '@fortawesome/free-solid-svg-icons';

const CreateVeriDesign = () => {
    // --- State Variables ---
    const [workingDesigns, setWorkingDesigns] = useState([]);
    const [members, setMembers] = useState([]);
    const [selectedDesigns, setSelectedDesigns] = useState([]);
    const [selectedReviewers, setSelectedReviewers] = useState({});
    const [loading, setLoading] = useState(true);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [designsError, setDesignsError] = useState(null);
    const [membersError, setMembersError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("");

    // Tutorial State
    const [runCreateVeriDesignTutorial, setRunCreateVeriDesignTutorial] = useState(false);
    const [createVeriDesignTutorialSteps, setCreateVeriDesignTutorialSteps] = useState([
     {
       target: '.createveri-design-left-panel', // Updated class
       content: 'First, select the Designs you want to send for verification from the list on the left (only status WORKING).',
       placement: 'right',
       disableBeacon: true,
     },
     {
       target: '.createveri-design-right-panel', // Updated class
       content: 'Next, select the Reviewers from the list on the right who will verify the designs you selected.',
       placement: 'left',
     },
     {
       target: '.createveri-design-reviewer-item:first-child input[type="checkbox"]', // Updated class
       content: "Click the checkbox next to the reviewer's name or press 'Select All Reviewers' to select.",
       placement: 'bottom',
     },
     {
       target: '.createveri-design-btn-create', // Updated class
       content: 'Once you have selected the Designs and Reviewers, click this button to create the Verification task.',
       placement: 'top',
     }
    ]);

    // --- Hooks ---
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Tutorial Effect ---
     useEffect(() => {
       const tutorialShown = localStorage.getItem('createVeriDesignTutorialShown');
       if (!tutorialShown) {
         const timer = setTimeout(() => {
           setRunCreateVeriDesignTutorial(true);
         }, 500);
         return () => clearTimeout(timer);
       }
     }, []);

     const handleRestartCreateVeriDesignTutorial = () => {
       setRunCreateVeriDesignTutorial(true);
     };

    // --- Data Fetching Effects ---
    // (Fetching logic remains the same)
    useEffect(() => {
        if (projectId) {
            setLoading(true);
            setDesignsError(null);
            axios
                .get(`http://localhost:3001/veridesign?project_id=${projectId}`)
                .then((res) => {
                    if (Array.isArray(res.data)) {
                         const working = res.data.filter(design => design.design_status === "WORKING");
                         setWorkingDesigns(working);
                    } else {
                        setDesignsError("Received invalid data format for designs.");
                        setWorkingDesigns([]);
                    }
                })
                .catch((err) => {
                    setDesignsError("Failed to load designs. Please check connection or API.");
                    setWorkingDesigns([]);
                })
                .finally(() => { setLoading(false); });
        } else {
            setDesignsError("Project ID is missing.");
            setLoading(false);
            setWorkingDesigns([]);
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId) {
            setIsLoadingMembers(true);
            setMembersError(null);
            axios
                .get(`http://localhost:3001/projectname?project_id=${projectId}`)
                .then((res) => {
                    if (Array.isArray(res.data)) {
                        setMembers(res.data);
                    } else {
                        setMembersError("Received invalid data format for project members.");
                        setMembers([]);
                    }
                })
                .catch((err) => {
                    setMembersError("Failed to load project members.");
                    setMembers([]);
                })
                .finally(() => { setIsLoadingMembers(false); });
        } else {
             setMembersError("Project ID is missing.");
             setIsLoadingMembers(false);
             setMembers([]);
        }
    }, [projectId]);

    // --- Event Handlers ---
    // (Event handler logic remains the same)
    const handleSelect = (id, setter) => {
        setter((prev) =>
            prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
        );
    };

     const handleSelectAllDesigns = () => {
        if (selectedDesigns.length === filteredDesigns.length) {
             setSelectedDesigns([]);
        } else {
             setSelectedDesigns(filteredDesigns.map(design => design.design_id));
        }
     };

    const handleCheckboxReviewer = (memberName) => {
        setSelectedReviewers((prevState) => ({
            ...prevState,
            [memberName]: !prevState[memberName],
        }));
    };

    const handleSelectAllReviewers = () => {
        const allReviewerNames = [];
        members.forEach(member => {
             try {
               const memberInfo = member.project_member ? JSON.parse(member.project_member) : [];
               memberInfo.forEach(info => { if (info.name) allReviewerNames.push(info.name); });
             } catch (e) { console.error("JSON parse error in select all reviewers:", e); }
        });
        const uniqueReviewerNames = [...new Set(allReviewerNames)];
        const allSelected = uniqueReviewerNames.length > 0 && uniqueReviewerNames.every(name => selectedReviewers[name]);
        if (allSelected) { setSelectedReviewers({}); }
        else {
             const newSelected = {};
             uniqueReviewerNames.forEach(name => { newSelected[name] = true; });
             setSelectedReviewers(newSelected);
        }
    };

    const handleCancel = () => {
        navigate(`/Dashboard?project_id=${projectId}`);
    };

    // Filter Designs Logic (remains the same)
    const filteredDesigns = workingDesigns.filter(design => {
         const matchesSearch =
              design.diagram_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              `SD-${String(design.design_id).padStart(2, '0')}`.toLowerCase().includes(searchQuery.toLowerCase());
         const matchesType = filterType ? design.diagram_type === filterType : true;
         return matchesSearch && matchesType;
     });
     const designTypes = [...new Set(workingDesigns.map(design => design.diagram_type).filter(Boolean))];

    // Handle Create Verification (Logic remains the same, using toast)
    const handleCreateVerification = async () => {
        // ... (Keep the existing complex logic using toast) ...
        const storedUsername = localStorage.getItem("username") || "DefaultUser"; // ใส่ default ถ้าไม่มี
        const timestamp = new Date().toISOString();

        const selectedReviewerNames = Object.keys(selectedReviewers).filter(
            (name) => selectedReviewers[name]
        );

        // --- 1. Initial Input Validation ---
        if (!projectId) {
            // Swal.fire({ icon: "error", title: "Error", text: "Invalid project ID." });
            toast.error("Invalid project ID."); // <--- เปลี่ยนแล้ว
            return;
        }
        if (selectedDesigns.length === 0) {
            // Swal.fire({ icon: "warning", title: "Warning", text: "Please select at least one design." });
            toast.warn("Please select at least one design."); // <--- เปลี่ยนแล้ว
            return;
        }
        if (selectedReviewerNames.length === 0) {
            // Swal.fire({ icon: "warning", title: "Warning", text: "Please select at least one reviewer." });
            toast.warn("Please select at least one reviewer."); // <--- เปลี่ยนแล้ว
            return;
        }
        if (!storedUsername) {
            // Swal.fire({ icon: "error", title: "Error", text: "No user found. Please login again." });
            toast.error("No user found. Please login again."); // <--- เปลี่ยนแล้ว
            return;
        }

        // --- 2. Pre-validation of Selected Designs Data ---
        console.log("Starting pre-validation for selected designs:", selectedDesigns);
        const designsToProcess = [];
        const validationErrors = [];

        for (const designId of selectedDesigns) {
            const designDetail = workingDesigns.find(d => d.design_id === designId);
            let hasError = false;

            if (!designDetail) {
                console.error(`[Validation] Could not find details for design ID: ${designId}.`);
                validationErrors.push(`Design ID ${designId}: Details not found in fetched data.`);
                continue;
            }
             console.log(`[Validation] Checking Design ID: ${designId}`, designDetail);

            const requiredFields = ['design_type', 'diagram_name', 'diagram_type', 'design_description'];
            for (const field of requiredFields) {
                if (designDetail[field] === undefined || designDetail[field] === null || designDetail[field] === '') {
                    console.error(`[Validation] Missing or empty required field '${field}' for design ID: ${designId}. Value:`, designDetail[field]);
                    validationErrors.push(`Design ID ${designId}: Missing required field '${field}'.`);
                    hasError = true;
                }
            }

            let validRequirementIdArray = [];
             if (designDetail.requirement_id != null && Array.isArray(designDetail.requirement_id)) {
                 if (designDetail.requirement_id.length === 0) {
                     console.log(`[Validation] Design ID ${designId}: requirement_id is an empty array.`);
                 } else {
                     let invalidElementFound = false;
                     designDetail.requirement_id.forEach(reqId => {
                         const parsedReqId = parseInt(reqId, 10);
                         if (isNaN(parsedReqId)) {
                             invalidElementFound = true;
                             console.error(`[Validation] Invalid element '${reqId}' in requirement_id array for design ID: ${designId}.`);
                         } else {
                             validRequirementIdArray.push(parsedReqId);
                         }
                     });
                     if (invalidElementFound) {
                         validationErrors.push(`Design ID ${designId}: Contains invalid (non-numeric) elements in requirement_id array.`);
                         hasError = true;
                     }
                      if (validRequirementIdArray.length === 0 && designDetail.requirement_id.length > 0) {
                          console.error(`[Validation] No valid numeric requirement IDs found for design ID: ${designId} although array was not empty.`);
                          validationErrors.push(`Design ID ${designId}: No valid numeric requirement IDs found in array.`);
                          hasError = true;
                      }
                 }
             } else {
                  console.warn(`[Validation] requirement_id is missing or not an array for design ID: ${designId}. Value:`, designDetail.requirement_id);
                  validRequirementIdArray = [];
             }


            if (!hasError) {
                designsToProcess.push({
                    design_id: designId,
                    project_id: projectId,
                    create_by: storedUsername,
                    veridesign_at: timestamp,
                    veridesign_status: "WAITING FOR VERIFICATION",
                    veridesign_by: selectedReviewerNames.reduce((acc, reviewerName) => {
                        acc[reviewerName] = false;
                        return acc;
                    }, {}),
                    requirement_id_array: validRequirementIdArray,
                    design_type: designDetail.design_type,
                    diagram_name: designDetail.diagram_name,
                    diagram_type: designDetail.diagram_type,
                    design_description: designDetail.design_description,
                });
            }
        }

        // --- 3. Handle Validation Results ---
        if (validationErrors.length > 0) {
            console.error("Validation failed for some designs:", validationErrors);
            // Swal.fire({
            //     icon: "error",
            //     title: "Data Validation Failed",
            //     html: `<div style="text-align: left; max-height: 200px; overflow-y: auto; margin-top: 10px;">Cannot proceed. Please fix the data for the following designs:<ul style="margin-left: 20px; margin-top: 5px;">${validationErrors.map(err => `<li>${err}</li>`).join('')}</ul></div>`,
            // });
            // --- แสดงผล list ใน toast (อาจจะต้องปรับ style หรือพิจารณา UX อื่น) ---
            const errorContent = (
                <div style={{ textAlign: 'left' }}>
                    Data Validation Failed. Cannot proceed. Please fix:
                    <ul style={{ marginLeft: '15px', marginTop: '5px', maxHeight: '100px', overflowY: 'auto', fontSize: '0.9em' }}>
                        {validationErrors.map((err, index) => <li key={index}>{err}</li>)}
                    </ul>
                </div>
            );
            toast.error(errorContent, { autoClose: false }); // <--- เปลี่ยนแล้ว
            return;
        }

        console.log("Pre-validation successful. Designs ready for processing:", designsToProcess);

        // --- 4. Proceed with API Calls ---
        try {
            setIsSubmitting(true);

            // 4.1 Update Design Status
            console.log("Updating design statuses...");
            const updateResults = await Promise.allSettled(
                designsToProcess.map(d =>
                    axios.put(
                        `http://localhost:3001/update-design-status-waitingfor-ver/${d.design_id}`,
                        { design_status: "WAITING FOR VERIFICATION" }
                    )
                )
            );
            updateResults.forEach((result, index) => {
                const designId = designsToProcess[index].design_id;
                if (result.status === 'fulfilled') { console.log(`[Status Update] Successfully updated status for design ID: ${designId}`); }
                else { console.error(`[Status Update] Failed for design ID: ${designId}`, result.reason?.response?.data || result.reason?.message || result.reason); }
            });
            console.log("Finished updating design statuses phase.");

            // 4.2 Create Veridesign Records
            const veridesignPayload = designsToProcess.map(d => ({
                veridesign_id: null, project_id: d.project_id, create_by: d.create_by,
                design_id: d.design_id, veridesign_at: d.veridesign_at,
                veridesign_status: d.veridesign_status, veridesign_by: d.veridesign_by,
            }));
            console.log("Creating veridesign records...", veridesignPayload);
            const veridesignResponse = await axios.post("http://localhost:3001/createveridesign", veridesignPayload);

            // 4.3 Create History Records
            if (veridesignResponse.status === 201) {
                 console.log("Veridesign records created successfully. Now creating history records...");
                 const historyPromises = [];
                 designsToProcess.forEach(d => {
                     const requirementIdsToLog = d.requirement_id_array;
                     if (requirementIdsToLog && requirementIdsToLog.length > 0) {
                         requirementIdsToLog.forEach(singleReqId => {
                             const historyData = {
                                 design_id: d.design_id, requirement_id: singleReqId, design_type: d.design_type,
                                 diagram_name: d.diagram_name, diagram_type: d.diagram_type,
                                 design_description: d.design_description, design_status: "WAITING FOR VERIFICATION"
                             };
                             console.log(`📜 [History] Preparing post for Design ${d.design_id} / Req ${singleReqId}`);
                             historyPromises.push(
                                 axios.post("http://localhost:3001/addHistoryDesign", historyData)
                                     .then(res => { if (res.status === 201) { console.log(`[History] ✅ Added for Design ${d.design_id} / Req ${singleReqId}`); } else { console.warn(`[History] Non-201 status for Design ${d.design_id} / Req ${singleReqId}. Status: ${res.status}`); } return { status: 'fulfilled', designId: d.design_id, reqId: singleReqId }; })
                                     .catch(err => { console.error(`[History] ❌ Error for Design ${d.design_id} / Req ${singleReqId}:`, err.response?.data || err.message); return { status: 'rejected', designId: d.design_id, reqId: singleReqId, reason: err.response?.data?.message || err.message || 'Unknown history save error' }; })
                             );
                         });
                     } else { console.log(`[History] No valid requirement IDs to log for Design ${d.design_id}.`); }
                 });


                if (historyPromises.length > 0) {
                     console.log(`Waiting for ${historyPromises.length} history records...`);
                     const historyResults = await Promise.allSettled(historyPromises);
                     const failedHistory = historyResults.filter(r => r.status === 'rejected');
                     if (failedHistory.length > 0) {
                         console.error("Some history records failed:", failedHistory);
                         // const errorDetails = failedHistory.map(f => `<li>Design ${f.reason.designId} / Req ${f.reason.reqId}: ${f.reason.reason}</li>`).join(''); // Adjusted path
                         // Swal.fire({ icon: 'warning', title: 'History Warning', html: `Could not record history for ${failedHistory.length} item(s).<br><ul style="text-align:left; margin-left: 20px; max-height: 150px; overflow-y: auto; margin-top: 5px;">${errorDetails}</ul>` });

                        // --- แสดง list error ใน toast (อาจจะต้องปรับ style หรือพิจารณา UX อื่น) ---
                         const historyErrorContent = (
                             <div style={{ textAlign: 'left' }}>
                                 History Warning: Could not record history for {failedHistory.length} item(s).
                                 <ul style={{ marginLeft: '15px', marginTop: '5px', maxHeight: '100px', overflowY: 'auto', fontSize: '0.9em' }}>
                                     {failedHistory.map((f, index) => (
                                         <li key={index}>
                                             {/* ใช้ f.value แทน f.reason หากต้องการเข้าถึงข้อมูลที่ส่งกลับมาตอน fulfilled/rejected */}
                                             Design {f.value?.designId ?? f.reason?.designId ?? 'N/A'} / Req {f.value?.reqId ?? f.reason?.reqId ?? 'N/A'}: {f.reason?.reason ?? 'Unknown error'}
                                         </li>
                                     ))}
                                 </ul>
                             </div>
                         );
                         toast.warn(historyErrorContent, { autoClose: 8000 }); // <--- เปลี่ยนแล้ว

                     } else { console.log("All required history records created."); }
                 } else { console.log("No history records needed."); }

                 // --- 5. Update UI, Show Toast, and Navigate ---
                 setWorkingDesigns((prev) => prev.filter((design) => !selectedDesigns.includes(design.design_id)));
                 setSelectedDesigns([]);
                 setSelectedReviewers({});

                 toast.success("Verification Created!"); // <--- เปลี่ยนแล้ว
            } else {
                // Swal.fire({ icon: "error", title: "Veridesign Error", text: veridesignResponse.data?.message || "Failed to create verification records." });
                toast.error(veridesignResponse.data?.message || "Failed to create verification records."); // <--- เปลี่ยนแล้ว
                console.warn("Veridesign creation failed. Rollback needed?");
            }
        } catch (error) {
            console.error("Error during create verification process:", error);
            // Swal.fire({ icon: "error", title: "Process Error", text: error.response?.data?.message || error.message || "An error occurred." });
            toast.error(error.response?.data?.message || error.message || "An error occurred during the process."); // <--- เปลี่ยนแล้ว
            console.warn("Error occurred. Rollback needed?");
        } finally {
            setIsSubmitting(false);
            // ถ้าต้องการเคลียร์ selection เสมอไม่ว่าจะสำเร็จหรือล้มเหลว ก็อาจจะใส่ setSelected... ไว้ตรงนี้
        }
    };


    // --- JSX Rendering ---
    return (
        // Use NEW class names with createveri-design- prefix
        <div className="createveri-design-container">
            {/* --- เพิ่ม ToastContainer ที่นี่ หรือใน Component หลัก เช่น App.js --- */}
            {/* หากใส่ใน App.js แล้ว ไม่ต้องใส่ซ้ำที่นี่ */}
            {/* <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            /> */}
            <Joyride
              steps={createVeriDesignTutorialSteps}
              run={runCreateVeriDesignTutorial}
              continuous showProgress showSkipButton
              styles={{ options: { zIndex: 10000 } }}
              callback={(data) => {
                const { status } = data;
                if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
                  setRunCreateVeriDesignTutorial(false);
                  localStorage.setItem('createVeriDesignTutorialShown', 'true');
                }
              }}
            />
            <div className="createveri-design-header">
                <button className="createveri-design-back-btn" onClick={handleCancel} disabled={isSubmitting}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1>
                    <FontAwesomeIcon icon={faClipboardCheck} className="createveri-design-title-icon" />
                     Create Design Verification
                </h1>
                <button
                     onClick={handleRestartCreateVeriDesignTutorial}
                     className="tutorial-help-button tutorial-help-button-corner"
                     title="Show Tutorial"
                     style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '1.6rem', background: 'none', border: 'none', color: 'gray', cursor: 'pointer' }}
                   >
                    <FontAwesomeIcon icon={faQuestionCircle} />
                 </button>
            </div>

            <div className="createveri-design-content">
                {/* Left Panel */}
                <div className="createveri-design-left-panel">
                    <div className="createveri-design-panel-header">
                        <h2>
                            <FontAwesomeIcon icon={faClipboardCheck} /> Designs
                            {!loading && !designsError && (
                                <span className="createveri-design-count-badge">
                                    {workingDesigns.length}
                                </span>
                            )}
                        </h2>
                        <div className="createveri-design-tools">
                            <div className="createveri-design-search">
                                <FontAwesomeIcon icon={faSearch} className="createveri-design-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search designs by ID or Name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="createveri-design-search-input"
                                />
                                {searchQuery && (
                                    <button className="createveri-design-clear-search" onClick={() => setSearchQuery("")}>
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                )}
                            </div>
                            <div className="createveri-design-filter">
                                <FontAwesomeIcon icon={faFilter} className="createveri-design-filter-icon" />
                                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="createveri-design-filter-select">
                                    <option value="">All Diagram Types</option>
                                    {designTypes.map(type => (<option key={type} value={type}>{type}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="createveri-design-loading"><FontAwesomeIcon icon={faSpinner} spin /> <p>Loading designs...</p></div>
                    ) : designsError ? (
                        <div className="createveri-design-error-message"><FontAwesomeIcon icon={faExclamationTriangle} /> <p>{designsError}</p></div> // Changed icon for error
                    ) : workingDesigns.length === 0 && !searchQuery && !filterType ? (
                        <div className="createveri-design-empty-state"><p>No designs found in 'WORKING' status.</p></div>
                    ) : (
                        <>
                         <div className="createveri-design-select-all">
                           <input
                             type="checkbox"
                             className="checkbox-design" // <<< เพิ่ม class ตรงนี้
                             id="select-all-designs"
                             checked={selectedDesigns.length === filteredDesigns.length && filteredDesigns.length > 0}
                             onChange={handleSelectAllDesigns}
                             disabled={filteredDesigns.length === 0}
                           />
                            <label htmlFor="select-all-designs">Select All</label>
                             <span className="createveri-design-selected-count">
                               {selectedDesigns.length} of {filteredDesigns.length} selected
                             </span>
                         </div>
                            <div className="createveri-design-table-container">
                                <table className="createveri-design-requirements-table">
                                    <thead>
                                        <tr>
                                            <th className="createveri-design-checkbox-column">Select</th>
                                            <th>ID</th><th>Name</th><th>Diagram Type</th><th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDesigns.length === 0 ? (
                                             <tr><td colSpan="5" className="createveri-design-no-results">No designs match your filters.</td></tr>
                                        ) : (
                                            filteredDesigns.map((design) => (
                                                <tr key={design.design_id} className={selectedDesigns.includes(design.design_id) ? "selected-row" : ""}>
                                                    <td> <input
                                                     type="checkbox"
                                                     className="checkbox-design" // <<< เพิ่ม class ตรงนี้
                                                     checked={selectedDesigns.includes(design.design_id)}
                                                     onChange={() => handleSelect(design.design_id, setSelectedDesigns)}
                                                 /></td>
                                                    <td className="req-id">SD-{String(design.design_id).padStart(2, '0')}</td>
                                                    <td>{design.diagram_name || 'N/A'}</td>
                                                    <td>{design.diagram_type || 'N/A'}</td>
                                                    <td><span className="req-status status-working">{design.design_status}</span></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Right Panel */}
                <div className="createveri-design-right-panel">
                    <div className="createveri-design-panel-header">
                        <h2><FontAwesomeIcon icon={faUsers} /> Reviewers</h2>
                    </div>

                    {isLoadingMembers ? (
                        <div className="createveri-design-loading"><FontAwesomeIcon icon={faSpinner} spin /><p>Loading reviewers...</p></div>
                    ) : membersError ? (
                        <div className="createveri-design-error-message"><FontAwesomeIcon icon={faExclamationTriangle} /><p>{membersError}</p></div> // Changed icon for error
                    ) : members.length === 0 ? (
                        <div className="createveri-design-empty-state"><p>No reviewers found for this project.</p></div>
                    ) : (
                        <div className="createveri-design-reviewers-container">
                            <div className="createveri-design-select-all">
                            <input
                                type="checkbox"
                                id="select-all-reviewers"
                                className="checkbox-design" // <<< เพิ่ม class ตรงนี้
                                onChange={handleSelectAllReviewers}
                                checked={(() => {
                                 const allReviewerNames = [];
                                 members.forEach(member => {
                                   try {
                                     // Ensure member.project_member exists and is a string before parsing
                                     const memberInfo = (member && member.project_member && typeof member.project_member === 'string')
                                                        ? JSON.parse(member.project_member)
                                                        : [];
                                     // Ensure memberInfo is an array before iterating
                                     if (Array.isArray(memberInfo)) {
                                        memberInfo.forEach(info => { if (info && info.name) allReviewerNames.push(info.name); });
                                     }
                                   } catch (e) {
                                      console.error("Error parsing project_member in checked logic:", e, member?.project_member);
                                   }
                                 });
                                 const uniqueReviewerNames = [...new Set(allReviewerNames)];
                                 // Check if uniqueReviewerNames is not empty before calling .every
                                 return uniqueReviewerNames.length > 0 && uniqueReviewerNames.every(name => selectedReviewers[name]);
                                })()}
                             />
                                <label htmlFor="select-all-reviewers">Select All Reviewers</label>
                            </div>
                            <div className="createveri-design-reviewers-list">
                                {members.map((member, index) => {
                                    let memberInfoList = [];
                                    if (member && member.project_member && typeof member.project_member === 'string') { try { const parsedMembers = JSON.parse(member.project_member); if (Array.isArray(parsedMembers)) { memberInfoList = parsedMembers; } else { console.warn(`Parsed project_member index ${index} not array:`, parsedMembers); }} catch (e) { console.error(`JSON error index ${index}:`, member.project_member, e); return <p key={`error-${index}`} className="createveri-design-error-message small">Error parsing member.</p>; }} else { console.warn(`Invalid project_member index ${index}:`, member); }
                                    if (memberInfoList.length === 0) return null;
                                    return (
                                        <div key={`member-${index}`} className="createveri-design-members-group">
                                            {memberInfoList.map((info, roleIndex) => ( info && info.name ? ( <div key={`${index}-${roleIndex}`} className="createveri-design-reviewer-item"><input type="checkbox" className="checkbox-design" id={`reviewer-${info.name}-${index}`} checked={selectedReviewers[info.name] || false} onChange={() => handleCheckboxReviewer(info.name)} /><label htmlFor={`reviewer-${info.name}-${index}`} className="createveri-design-reviewer-label"><div className="createveri-design-reviewer-name">{info.name}</div><div className="createveri-design-reviewer-role">{info.roles}</div></label></div>) : null ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div className="createveri-design-summary">
                           <h3>Selection Summary</h3>
                           <div className="createveri-design-summary-item"><span>Designs:</span><span className="createveri-design-summary-count">{selectedDesigns.length}</span></div>
                           <div className="createveri-design-summary-item"><span>Reviewers:</span><span className="createveri-design-summary-count">{Object.values(selectedReviewers).filter(Boolean).length}</span></div>
                     </div>
                </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="createveri-design-action-buttons">
                <button className="createveri-design-btn-cancel" onClick={handleCancel} disabled={isSubmitting}>
                    <FontAwesomeIcon icon={faTimes} /> Cancel
                </button>
                <button className="createveri-design-btn-create" onClick={handleCreateVerification}
                    disabled={ isSubmitting || loading || isLoadingMembers || selectedDesigns.length === 0 || Object.values(selectedReviewers).filter(Boolean).length === 0 }>
                    {isSubmitting ? (<><FontAwesomeIcon icon={faSpinner} spin /> Creating...</>) : (<><FontAwesomeIcon icon={faCheckCircle} /> Create Verification</>)}
                </button>
            </div>

        </div> // End createveri-design-container
    );
};

export default CreateVeriDesign;