import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2"; // Import SweetAlert2
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/CreateVeriDesign.css"; // ตรวจสอบว่า path CSS ถูกต้อง

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

    // --- Hooks ---
    const location = useLocation();
    const navigate = useNavigate(); // เรียกใช้ useNavigate ที่ Top Level ถูกต้องแล้ว
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Data Fetching Effects ---
    // Fetch working designs
    useEffect(() => {
        if (projectId) {
            setLoading(true);
            axios
                .get(`http://localhost:3001/veridesign?project_id=${projectId}`)
                .then((res) => {
                    // เพิ่ม console.log เพื่อดูข้อมูลที่ได้รับ
                    console.log("Fetched Designs Data:", res.data);
                    // ควรตรวจสอบโครงสร้างข้อมูลที่ได้รับก่อน set state
                    if(Array.isArray(res.data)) {
                        setWorkingDesigns(res.data); // Set designs directly
                        setDesignsError(null);
                    } else {
                        console.error("Invalid data structure for designs:", res.data);
                        setDesignsError("Received invalid data format for designs.");
                        setWorkingDesigns([]); // เคลียร์ข้อมูลเก่าถ้า format ผิด
                    }
                })
                .catch((err) => {
                    console.error("Failed to load designs:", err);
                    setDesignsError("Failed to load designs. Please check the connection or API endpoint.");
                    setWorkingDesigns([]); // เคลียร์ข้อมูลเมื่อเกิดข้อผิดพลาด
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setDesignsError("Project ID is missing.");
            setLoading(false);
        }
    }, [projectId]);

    // Fetch project members
    useEffect(() => {
        if (projectId) {
            setIsLoadingMembers(true);
            axios
                .get(`http://localhost:3001/projectname?project_id=${projectId}`)
                .then((res) => {
                    console.log("Fetched Members Data:", res.data);
                    if (Array.isArray(res.data)) {
                        setMembers(res.data);
                        setMembersError(null);
                    } else {
                        console.error("Invalid data structure for members:", res.data);
                        setMembersError("Received invalid data format for project members.");
                        setMembers([]);
                    }
                })
                .catch((err) => {
                    console.error("Failed to load members:", err);
                    setMembersError("Failed to load project members.");
                    setMembers([]);
                })
                .finally(() => {
                    setIsLoadingMembers(false);
                });
        } else {
             setMembersError("Project ID is missing.");
             setIsLoadingMembers(false);
        }
    }, [projectId]);

    // --- Event Handlers ---

    // Handle select for designs
    const handleSelect = (id, setter) => {
        setter((prev) =>
            prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
        );
    };

    // Handle checkbox for reviewers
    const handleCheckboxReviewer = (memberName) => {
        setSelectedReviewers((prevState) => ({
            ...prevState,
            [memberName]: !prevState[memberName],
        }));
    };

    // Handle cancel
    const handleCancel = () => {
        navigate(`/Dashboard?project_id=${projectId}`); // ตรวจสอบ path ว่าถูกต้องหรือไม่
    };

    // ******** START: REPLACE handleCreateVerification Function ********
    const handleCreateVerification = async () => {
        const storedUsername = localStorage.getItem("username") || "DefaultUser"; // ใส่ default ถ้าไม่มี
        const timestamp = new Date().toISOString();

        const selectedReviewerNames = Object.keys(selectedReviewers).filter(
            (name) => selectedReviewers[name]
        );

        // --- 1. Initial Input Validation ---
        if (!projectId) {
            Swal.fire({ icon: "error", title: "Error", text: "Invalid project ID." });
            return;
        }
        if (selectedDesigns.length === 0) {
            Swal.fire({ icon: "warning", title: "Warning", text: "Please select at least one design." });
            return;
        }
        if (selectedReviewerNames.length === 0) {
            Swal.fire({ icon: "warning", title: "Warning", text: "Please select at least one reviewer." });
            return;
        }
        if (!storedUsername) {
            Swal.fire({ icon: "error", title: "Error", text: "No user found. Please login again." });
            return;
        }

        // --- 2. Pre-validation of Selected Designs Data ---
        console.log("Starting pre-validation for selected designs:", selectedDesigns);
        const designsToProcess = [];
        const validationErrors = [];

        for (const designId of selectedDesigns) {
            // *** ใช้ข้อมูลจาก state 'workingDesigns' ที่ fetch มา ***
            const designDetail = workingDesigns.find(d => d.design_id === designId);
            let hasError = false; // Flag สำหรับ design ปัจจุบัน

            if (!designDetail) {
                console.error(`[Validation] Could not find details for design ID: ${designId}.`);
                validationErrors.push(`Design ID ${designId}: Details not found in fetched data.`);
                continue; // ข้ามไปเช็ค design ถัดไป
            }
             console.log(`[Validation] Checking Design ID: ${designId}`, designDetail);


            // --- Check Required Fields (ยกเว้น requirement_id ที่จะเช็คต่างหาก) ---
            // *** ปรับ Field ที่ต้องการตาม Schema ของคุณ ***
            const requiredFields = ['design_type', 'diagram_name', 'diagram_type', 'design_description'];
            for (const field of requiredFields) {
                // อนุโลมให้ description เป็นค่าว่างได้ ถ้า business logic อนุญาต
                // if (field === 'design_description' && (designDetail[field] === '' || designDetail[field] === null || designDetail[field] === undefined)) continue;

                if (designDetail[field] === undefined || designDetail[field] === null || designDetail[field] === '') {
                    console.error(`[Validation] Missing or empty required field '${field}' for design ID: ${designId}. Value:`, designDetail[field]);
                    validationErrors.push(`Design ID ${designId}: Missing required field '${field}'.`);
                    hasError = true;
                }
            }

            // --- Validate requirement_id (ต้องเป็น Array ที่สมาชิกข้างในเป็นตัวเลข) ---
            let validRequirementIdArray = []; // เก็บเฉพาะ ID ที่เป็นตัวเลข
            if (Array.isArray(designDetail.requirement_id)) {
                 if (designDetail.requirement_id.length === 0) {
                     console.log(`[Validation] Design ID ${designId}: requirement_id is an empty array.`);
                     // ถือว่าผ่าน validation แต่จะไม่มี requirement history ให้ log
                 } else {
                    let invalidElementFound = false;
                    designDetail.requirement_id.forEach(reqId => {
                        const parsedReqId = parseInt(reqId, 10);
                        if (isNaN(parsedReqId)) {
                            invalidElementFound = true;
                            console.error(`[Validation] Invalid element '${reqId}' in requirement_id array for design ID: ${designId}.`);
                        } else {
                            validRequirementIdArray.push(parsedReqId); // เก็บเฉพาะตัวเลขที่ถูกต้อง
                        }
                    });
                    if (invalidElementFound) {
                        validationErrors.push(`Design ID ${designId}: Contains invalid (non-numeric) elements in requirement_id array.`);
                        hasError = true;
                    }
                    // เพิ่ม check กรณีใน array มีแต่ค่าผิดพลาดทำให้ validRequirementIdArray ว่าง
                     if (validRequirementIdArray.length === 0 && designDetail.requirement_id.length > 0) {
                         console.error(`[Validation] No valid numeric requirement IDs found for design ID: ${designId} although array was not empty.`);
                         // ถือว่าเป็น Error ถ้า Array ไม่ว่าง แต่ไม่มีเลขที่ถูกต้องเลย
                         validationErrors.push(`Design ID ${designId}: No valid numeric requirement IDs found in array.`);
                         hasError = true;
                     }
                 }
            } else {
                 // ไม่ใช่ Array (อาจจะเป็น null, undefined, หรือค่าอื่นๆ)
                 console.error(`[Validation] requirement_id is not an array for design ID: ${designId}. Value:`, designDetail.requirement_id);
                 validationErrors.push(`Design ID ${designId}: Invalid requirement_id (must be an array).`);
                 hasError = true;
            }


            if (!hasError) {
                // ถ้าผ่าน validation ทั้งหมด ให้เก็บข้อมูลที่จำเป็นไว้
                // เก็บ requirement ID array ที่กรองแล้ว (validRequirementIdArray) เพื่อใช้ตอนสร้าง history
                designsToProcess.push({
                    // --- ข้อมูลหลัก ---
                    design_id: designId,
                    project_id: projectId, // ใช้ projectId จาก queryParams
                    create_by: storedUsername,
                    veridesign_at: timestamp,
                    veridesign_status: "WAITING FOR VERIFICATION",
                    veridesign_by: selectedReviewerNames.reduce((acc, reviewerName) => {
                        acc[reviewerName] = false;
                        return acc;
                    }, {}),
                    // --- ข้อมูลสำหรับ History (ใช้ Array ที่กรองแล้ว) ---
                    requirement_id_array: validRequirementIdArray, // <--- เก็บ Array ที่ถูกต้องไว้
                    design_type: designDetail.design_type,
                    diagram_name: designDetail.diagram_name,
                    diagram_type: designDetail.diagram_type,
                    design_description: designDetail.design_description,
                });
            }
        } // จบ loop for validation

        // --- 3. Handle Validation Results ---
        if (validationErrors.length > 0) {
            console.error("Validation failed for some designs:", validationErrors);
            Swal.fire({
                icon: "error",
                title: "Data Validation Failed",
                html: `
                    <div style="text-align: left; max-height: 200px; overflow-y: auto; margin-top: 10px;">
                        Cannot proceed. Please fix the data for the following designs:
                        <ul style="margin-left: 20px; margin-top: 5px;">
                            ${validationErrors.map(err => `<li>${err}</li>`).join('')}
                        </ul>
                    </div>
                `,
            });
            return; // หยุดการทำงาน
        }

        // ถ้า validation ผ่านทั้งหมด
        console.log("Pre-validation successful. Designs ready for processing:", designsToProcess);

        // --- 4. Proceed with API Calls ---
        try {
            setIsSubmitting(true); // Disable submit button ขณะทำงาน

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
            // Log ผลการ update status
            updateResults.forEach((result, index) => {
                const designId = designsToProcess[index].design_id;
                if (result.status === 'fulfilled') {
                     console.log(`[Status Update] Successfully updated status for design ID: ${designId}`);
                } else {
                    console.error(`[Status Update] Failed for design ID: ${designId}`, result.reason?.response?.data || result.reason?.message || result.reason);
                    // พิจารณาว่าจะแจ้งเตือนผู้ใช้หรือไม่ ถ้าการ update status ล้มเหลว
                    // Swal.fire('Warning', `Failed to update status for Design ID ${designId}. Process continued.`, 'warning');
                }
            });
            console.log("Finished updating design statuses phase.");

            // 4.2 Create Veridesign Records
            const veridesignPayload = designsToProcess.map(d => ({
                veridesign_id: null, // Auto-increment
                project_id: d.project_id,
                create_by: d.create_by,
                design_id: d.design_id,
                veridesign_at: d.veridesign_at,
                veridesign_status: d.veridesign_status,
                veridesign_by: d.veridesign_by,
            }));
            console.log("Creating veridesign records...", veridesignPayload);
            const veridesignResponse = await axios.post("http://localhost:3001/createveridesign", veridesignPayload);

            // 4.3 Create History Records (ถ้า Veridesign สำเร็จ)
            if (veridesignResponse.status === 201) {
                console.log("Veridesign records created successfully. Now creating history records (one per requirement)...");
                const historyPromises = []; // รายการ Promises ทั้งหมดที่จะส่ง

                designsToProcess.forEach(d => { // วน loop design ที่ผ่าน validation
                    const requirementIdsToLog = d.requirement_id_array; // ใช้ Array ที่กรองแล้ว

                    if (requirementIdsToLog && requirementIdsToLog.length > 0) {
                        // มี Requirement IDs ที่ถูกต้อง ให้สร้าง history แยกแต่ละ ID
                        requirementIdsToLog.forEach(singleReqId => {
                            const historyData = {
                                design_id: d.design_id,
                                requirement_id: singleReqId, // <--- ใส่ ID ตัวเดียว
                                design_type: d.design_type,
                                diagram_name: d.diagram_name,
                                diagram_type: d.diagram_type,
                                design_description: d.design_description,
                                design_status: "WAITING FOR VERIFICATION" // สถานะ ณ เวลาที่สร้าง history
                            };
                            console.log(`📜 [History] Preparing post for Design ${d.design_id} / Req ${singleReqId}`);
                            historyPromises.push(
                                axios.post("http://localhost:3001/addHistoryDesign", historyData)
                                    .then(historyResponse => {
                                        if (historyResponse.status === 201) {
                                            console.log(`[History] ✅ Added for Design ${d.design_id} / Req ${singleReqId}`);
                                        } else {
                                            console.warn(`[History] Non-201 status for Design ${d.design_id} / Req ${singleReqId}. Status: ${historyResponse.status}`);
                                        }
                                        return { status: 'fulfilled', designId: d.design_id, reqId: singleReqId };
                                    })
                                    .catch(historyError => {
                                        console.error(`[History] ❌ Error for Design ${d.design_id} / Req ${singleReqId}:`, historyError.response?.data || historyError.message);
                                        return { status: 'rejected', designId: d.design_id, reqId: singleReqId, reason: historyError.response?.data?.message || historyError.message || 'Unknown history save error' };
                                    })
                            );
                        }); // จบ loop requirementIdsToLog
                    } else {
                        // ไม่มี requirement IDs ที่ถูกต้อง หรือ Array ว่าง
                        console.log(`[History] No valid requirement IDs to log for Design ${d.design_id}.`);
                        // ถ้าต้องการ log แม้ไม่มี requirement ID ให้เปิดใช้งานส่วนนี้ (ต้องแน่ใจว่า DB อนุญาต null)
                        // const historyData = { design_id: d.design_id, requirement_id: null, ... };
                        // historyPromises.push(axios.post(...));
                    }
                }); // จบ loop designsToProcess

                // รอให้ Promises ทั้งหมดเสร็จ
                if (historyPromises.length > 0) {
                    console.log(`Waiting for ${historyPromises.length} history records to be created...`);
                    const historyResults = await Promise.all(historyPromises);
                    const failedHistory = historyResults.filter(r => r.status === 'rejected');

                    if (failedHistory.length > 0) {
                        console.error("Some history records failed to save:", failedHistory);
                        const errorDetails = failedHistory.map(f => `<li>Design ${f.designId} / Req ${f.reqId}: ${f.reason}</li>`).join('');
                        Swal.fire({
                            icon: 'warning',
                            title: 'History Warning',
                            html: `Could not record history for ${failedHistory.length} item(s). Please check system logs.<br><ul style="text-align:left; margin-left: 20px; max-height: 150px; overflow-y: auto; margin-top: 5px;">${errorDetails}</ul>`
                         });
                        // พิจารณา: ถ้า History ล้มเหลว จะถือว่า Process ทั้งหมดล้มเหลวหรือไม่?
                        // ถ้าต้องการให้ล้มเหลว อาจจะ throw error หรือ return ตรงนี้
                        // throw new Error("Failed to save some history records.");
                    } else {
                        console.log("All required history records created successfully.");
                    }
                } else {
                    console.log("No history records needed to be created based on requirements.");
                }

                // --- 5. Update UI and Navigate (ทำเมื่อทุกอย่างสำเร็จ หรือตามนโยบาย) ---
                // *** ใช้ Setter Function ที่ถูกต้อง ***
                setWorkingDesigns((prev) =>
                    prev.filter((design) => !selectedDesigns.includes(design.design_id))
                );
                setSelectedDesigns([]); // ใช้ Setter Function
                setSelectedReviewers({}); // ใช้ Setter Function

                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: "Design verification process initiated successfully!",
                    timer: 1500,
                    showConfirmButton: false,
                }).then(() => {
                    navigate(`/VeriDesign?project_id=${projectId}`); // ตรวจสอบ path ว่าถูกต้องหรือไม่
                });

            } else {
                // กรณี /createveridesign ไม่สำเร็จ
                Swal.fire({ icon: "error", title: "Veridesign Error", text: veridesignResponse.data?.message || "Failed to create verification records." });
                // *** ควรพิจารณา Rollback ***
                // การ Rollback การ update status อาจซับซ้อน อาจจะต้องเรียก API เพื่อเปลี่ยน status กลับ
                console.warn("Veridesign creation failed. Status updates might need manual rollback.");
            }

        } catch (error) {
            // --- General Error Handling ---
            console.error("Error during create verification process:", error);
            Swal.fire({
                icon: "error",
                title: "Process Error",
                text: error.response?.data?.message || error.message || "An error occurred during the process. Please try again.",
            });
             // *** ควรพิจารณา Rollback ***
             console.warn("An error occurred. Status updates might need manual rollback.");
        } finally {
            setIsSubmitting(false); // Re-enable submit button ไม่ว่าจะสำเร็จหรือล้มเหลว
        }
    };
    // ******** END: REPLACE handleCreateVerification Function ********


    // --- JSX Rendering ---
    return (
        <div className="createveridesign-container">
            <h1>Create Design Verification</h1>
            <div className="createveridesign-content">
                {/* Left Panel (Designs Section) */}
                <div className="createveridesign-left-panel">
                    <h2>Designs</h2>
                    {loading ? (
                        <p>Loading designs...</p>
                    ) : designsError ? (
                        <p className="createveridesign-error-message">{designsError}</p>
                    ) : workingDesigns.length === 0 ? (
                        <p>No designs found in 'WORKING' status or matching criteria.</p> // ปรับข้อความ
                    ) : (
                        <table className="createveridesign-designs-table">
                            <thead>
                                <tr>
                                    <th>Select</th>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workingDesigns.map((design) => (
                                    <tr key={design.design_id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedDesigns.includes(design.design_id)}
                                                // *** ใช้ Setter ที่ถูกต้อง ***
                                                onChange={() => handleSelect(design.design_id, setSelectedDesigns)}
                                            />
                                        </td>
                                        {/* แสดง ID ให้สอดคล้องกับข้อมูล */}
                                        <td>SD-{String(design.design_id).padStart(2, '0')}</td>
                                        <td>{design.diagram_name}</td>
                                        <td>{design.diagram_type}</td>
                                        <td>{design.design_status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Right Panel (Reviewers Section) */}
                <div className="createveridesign-right-panel">
                    <h2>Reviewers</h2>
                    {isLoadingMembers ? (
                        <p>Loading reviewers...</p>
                    ) : membersError ? (
                        <p className="createveridesign-error-message">{membersError}</p>
                    ) : members.length === 0 ? (
                        <p>No project members found.</p> // ปรับข้อความ
                    ) : (
                        members.map((member, index) => {
                            let memberInfoList = [];
                            // เพิ่ม try-catch และการตรวจสอบที่เข้มงวดขึ้น
                            if (member && member.project_member && typeof member.project_member === 'string') {
                                try {
                                    const parsedMembers = JSON.parse(member.project_member);
                                    // ตรวจสอบว่าเป็น Array ก่อนใช้งาน
                                    if (Array.isArray(parsedMembers)) {
                                         memberInfoList = parsedMembers;
                                    } else {
                                        console.warn(`Parsed project_member for member index ${index} is not an array:`, parsedMembers);
                                        // อาจจะตั้งค่าเป็น Array ว่าง หรือแสดงข้อความผิดพลาดเฉพาะส่วนนี้
                                    }
                                } catch (e) {
                                    console.error(`Invalid JSON in project_member for member index ${index}:`, member.project_member, e);
                                    // ไม่ควร set MembersError ทั้งหมด อาจจะแค่ข้าม member นี้ไป หรือแสดงข้อความผิดพลาดเฉพาะส่วน
                                    return <p key={`error-${index}`} className="createveridesign-error-message">Error parsing data for a member.</p>;
                                }
                            } else {
                                 console.warn(`Missing or invalid project_member for member index ${index}:`, member);
                                 // ข้าม Member นี้ไป หรือแสดงข้อความ
                            }

                            // แสดงผลเฉพาะเมื่อมีข้อมูลที่ถูกต้อง
                            if (memberInfoList.length === 0) {
                                return null; // หรือแสดงข้อความว่าไม่มีข้อมูล reviewer สำหรับ member นี้
                            }

                            return (
                                <div key={`member-${index}`} className="createveridesign-reviewer-group">
                                    {memberInfoList.map((info, roleIndex) => (
                                        // ตรวจสอบว่า info.name มีค่าก่อน render
                                        info && info.name ? (
                                            <div key={`${index}-${roleIndex}`} className="createveridesign-reviewer-item">
                                                <input
                                                    type="checkbox"
                                                    id={`reviewer-${info.name}-${index}`} // ทำให้ ID ไม่ซ้ำกัน
                                                    checked={selectedReviewers[info.name] || false}
                                                    onChange={() => handleCheckboxReviewer(info.name)}
                                                />
                                                <label htmlFor={`reviewer-${info.name}-${index}`}>
                                                    <strong>{info.name}</strong>
                                                    {info.roles && <span> ({info.roles})</span>}
                                                </label>
                                            </div>
                                        ) : null // ไม่ render ถ้า info หรือ info.name ไม่มีค่า
                                    ))}
                                </div>
                            );
                        })
                    )}
                    {/* แสดงข้อความนี้เฉพาะเมื่อ fetch สำเร็จ แต่ไม่มี members */}
                    {!isLoadingMembers && !membersError && members.length === 0 && (
                        <p>No reviewers are available for this project.</p>
                    )}
                </div>
            </div>

            {/* Footer Section */}
            <div className="createveridesign-footer">
                <button
                    className="createveridesign-button cancel-button"
                    onClick={handleCancel}
                    disabled={isSubmitting} // Disable ขณะกำลัง submit
                >
                    Cancel
                </button>
                <button
                    className="createveridesign-button create-button"
                    onClick={handleCreateVerification}
                    disabled={isSubmitting || loading || isLoadingMembers || selectedDesigns.length === 0 || Object.keys(selectedReviewers).filter(k => selectedReviewers[k]).length === 0} // Disable ถ้ากำลังโหลด, submit, หรือยังไม่ได้เลือก
                >
                    {isSubmitting ? "Creating..." : "Create Verification"}
                </button>
            </div>
        </div>
    );
};

export default CreateVeriDesign;