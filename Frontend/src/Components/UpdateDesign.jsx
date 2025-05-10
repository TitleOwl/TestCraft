import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import "./CSS/UpdateDesign.css"; // Make sure this CSS file exists and is styled appropriately
import Swal from "sweetalert2";
import UpdateDiagram from "./UpdateDiagram";



const UpdateDesign = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const designId = queryParams.get("design_id");

    // --- States ---
    const [designData, setDesignData] = useState({
        diagram_name: "",
        design_type: "",
        diagram_type: "",
        design_description: "",
        requirement_id: [], // Array of numbers
        design_status: "WORKING",
    });
    const [baselineRequirements, setBaselineRequirements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);
    const [existingFiles, setExistingFiles] = useState([]);
    const [initialDesignData, setInitialDesignData] = useState(null);
    const [diagramElements, setDiagramElements] = useState(null);
    const [initialExistingFiles, setInitialExistingFiles] = useState([]);

    const diagramRef = useRef(null); // Ref for CreateDiagram component

    // --- Effect for Initial Data Fetching ---
    useEffect(() => {
        setLoading(true);
        // Reset state...
        setDesignData({ diagram_name: "", design_type: "", diagram_type: "", design_description: "", requirement_id: [], design_status: "WORKING" });
        setInitialDesignData(null);
        setBaselineRequirements([]);
        setExistingFiles([]);
        setSelectedFiles([]);
        setFilePreviews([]);
        setDiagramElements(null);

        if (!designId || !projectId) {
            console.error("Missing designId or projectId in URL");
            Swal.fire("Error", "ไม่พบ Design ID หรือ Project ID ใน URL", "error");
            setLoading(false);
            navigate("/"); // Or appropriate error/dashboard page
            return;
        }
        console.log(`Initial Fetch - Project ID: ${projectId}, Design ID: ${designId}`);


        // --- Fetch Functions ---
        const fetchDesign = async () => {
            // Guard clause already checked projectId and designId
            const apiUrl = `http://localhost:3001/designedit`;
            const params = { project_id: projectId, design_id: designId };
            console.log(`[fetchDesign] Fetching from ${apiUrl} with params:`, params);
            try {
                const response = await axios.get(apiUrl, { params });
                console.log("[fetchDesign] Raw response:", response.data);
                if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                    const firstRow = response.data[0];
                    const fetchedReqIdString = firstRow.requirement_id;
                    let parsedReqIds = [];
                    if (fetchedReqIdString) {
                        try {
                            const parsed = JSON.parse(fetchedReqIdString);
                            if (Array.isArray(parsed)) {
                                parsedReqIds = parsed.map(id => Number(id)).filter(id => !isNaN(id));
                            } else { console.warn("requirement_id from DB not JSON array:", fetchedReqIdString); }
                        } catch (e) { console.error("Error parsing requirement_id JSON:", e); }
                    }

                    const currentData = {
                        diagram_name: firstRow.diagram_name || "",
                        design_type: firstRow.design_type || "",
                        diagram_type: firstRow.diagram_type || "",
                        design_description: firstRow.design_description || "",
                        requirement_id: parsedReqIds,
                        design_status: firstRow.design_status || "WORKING",
                    };
                    console.log("[fetchDesign] Setting designData:", currentData);
                    setDesignData(currentData);
                    setInitialDesignData(JSON.parse(JSON.stringify(currentData))); // Deep copy

                    // --- Process Files ---
                    // Use a Map to collect unique files, as each row might duplicate design info but have different file info
                    const filesMap = new Map();
                    response.data.forEach(row => {
                        // Check if file data exists in the current row (it might be null due to LEFT JOIN)
                        if (row.file_design_id !== null && row.file_design_id !== undefined) {
                            // Add file to map only if it's not already there
                            if (!filesMap.has(row.file_design_id)) {
                                filesMap.set(row.file_design_id, {
                                    // Map backend fields to frontend state fields if names differ
                                    file_design_id: row.file_design_id,
                                    file_design_data: row.file_design_data, // This might be buffer data - handle appropriately for display (e.g., create URLs or use metadata)
                                    file_design_name: row.file_design_name || `File_${row.file_design_id}`, // Attempt to get name or generate one
                                    create_at: row.file_created_at, // Match backend alias
                                    update_at: row.file_updated_at, // Match backend alias
                                    // uploaded_at: row.uploaded_at // Include if needed
                                });
                            }
                        }
                    });
                    // Convert the map values back to an array for the state
                    const fetchedFiles = Array.from(filesMap.values());
                    console.log("[fetchDesign] Setting existingFiles state with fetched files:", fetchedFiles);
                    setExistingFiles(fetchedFiles);

                    return true; // Indicate success
                } else {
                    console.warn("No design data found for ID:", designId);
                    Swal.fire("ไม่พบข้อมูล", `ไม่พบข้อมูล Design สำหรับ ID: ${designId}`, "warning");
                    navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } });
                    return false;
                }
            } catch (error) {
                console.error("[fetchDesign] Error fetching:", error.response?.data || error.message);
                Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูล Design ได้", "error");
                return false;
            }
        };

        const fetchRequirements = async () => {
            if (!projectId) return;
            try {
                const response = await axios.get(`http://localhost:3001/project/${projectId}/requirement`);
                const baselineReqs = response.data.filter(req => req.requirement_status === 'BASELINE');
                setBaselineRequirements(baselineReqs);
                console.log("[fetchRequirements] Baseline requirements loaded:", baselineReqs.length);
            } catch (error) {
                console.error("Error fetching requirements:", error);
            }
        };
        const fetchFiles = async () => {
            if (!designId) return; // Guard clause
            try {
                const response = await axios.get(`http://localhost:3001/design/${designId}/files`);
                setExistingFiles(response.data);
            } catch (error) {
                console.error("Error fetching files:", error);
                // Maybe show a warning that files couldn't be loaded
            }
        };
        const fetchDiagramData = async () => {
            if (!designId) return;
            try {
                console.log(`Workspaceing diagram data for design ID: ${designId}`);
                // Adjust API endpoint if needed
                const response = await axios.get(`http://localhost:3001/api/diagrams/design/${designId}`);
                // --- เพิ่ม LOGS ---
                console.log(">>> Diagram data RAW response:", response);
                console.log(">>> Diagram data response.data:", response.data);
                // --- สิ้นสุด LOGS ---

                let elementsData = null;
                // Adjust based on the actual structure of your response data
                if (response.data && Array.isArray(response.data.elements)) { // ถ้า backend ส่ง { elements: [...] }
                    elementsData = response.data.elements;
                    console.log(">>> Extracted elements (from response.data.elements):", elementsData);
                } else if (response.data && Array.isArray(response.data)) { // ถ้า backend ส่ง [...] โดยตรง
                    elementsData = response.data;
                    console.log(">>> Extracted elements (from response.data directly):", elementsData);
                } else {
                    console.warn("Diagram data received but not in expected array format:", response.data);
                    elementsData = []; // Default to empty array if format is wrong
                }

                if (elementsData && elementsData.length > 0) {
                    console.log(">>> Setting diagramElements state with fetched data.");
                } else {
                    console.log(">>> Setting diagramElements state to empty array (no elements returned or format issue).");
                }
                // Ensure state is always an array, default to empty if null/undefined
                setDiagramElements(elementsData || []);

            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.log(`No diagram found for design ID: ${designId}. Setting empty array.`);
                    setDiagramElements([]); // Important: Set empty array on 404
                } else {
                    console.error("Error fetching diagram data:", error.response || error);
                    Swal.fire("Warning", "ไม่สามารถโหลดข้อมูล Diagram ได้", "warning");
                    setDiagramElements('error'); // Indicate error state
                }
            }
        };

        const fetchAllData = async () => {
            setLoading(true);
            try {
                const designFetched = await fetchDesign();
                if (designFetched) {
                    await Promise.all([fetchRequirements(), fetchFiles(), fetchDiagramData()]);
                } else {
                    console.log("Skipping related data fetch because design fetch failed.");
                }
            } catch (error) {
                console.error("Error during initial data fetching:", error);
                Swal.fire("Error", "เกิดข้อผิดพลาดในการโหลดข้อมูลเริ่มต้น", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();

    }, [designId, projectId, navigate]); // Dependencies

    // --- Check if Data is Unchanged ---
    const isMetadataUnchanged = !initialDesignData || (
        designData.diagram_name === initialDesignData.diagram_name &&
        designData.design_type === initialDesignData.design_type &&
        designData.diagram_type === initialDesignData.diagram_type &&
        designData.design_description === initialDesignData.design_description &&
        JSON.stringify([...(designData.requirement_id || [])].sort()) === JSON.stringify([...(initialDesignData.requirement_id || [])].sort())
    );

    const handleUpdate = async (e) => {
        e.preventDefault();

        // 0. เช็คว่าข้อมูลเริ่มต้นโหลดครบหรือยัง
        if (!initialDesignData || !initialExistingFiles) {
            Swal.fire("Error", "ข้อมูลเริ่มต้นยังไม่ถูกโหลดสมบูรณ์", "error");
            return;
        }

        // --- 1. ตรวจสอบการเปลี่ยนแปลง *ทั้งหมด* ก่อน ---
        let diagramHasChanged = false;
        try {
            // ตรวจสอบการเปลี่ยนแปลง Diagram (ต้องทำก่อนรวมผล)
            if (diagramRef.current && typeof diagramRef.current.hasUnsavedChanges === 'function') {
                diagramHasChanged = diagramRef.current.hasUnsavedChanges();
                console.log("UpdateDesign: Diagram has changes =", diagramHasChanged);
            } else {
                console.warn("UpdateDesign: Cannot check diagram changes via ref.");
                // อาจจะถือว่าไม่มีการเปลี่ยนแปลงถ้า ref ไม่มี หรือแจ้งเตือน/log เพิ่มเติม
            }
        } catch (err) {
            console.error("UpdateDesign: Error calling hasUnsavedChanges:", err);
            // หากการเช็ค diagram error อาจจะหยุดการทำงานไปเลย หรือแจ้งเตือน
            Swal.fire("Error", "เกิดข้อผิดพลาดในการตรวจสอบสถานะ Diagram", "error");
            return; // หยุดการทำงานถ้าเช็ค Diagram ไม่ได้
        }

        // ตรวจสอบการเปลี่ยนแปลง Metadata และ Status
        const metadataOrStatusChanged = !(
            initialDesignData && // เช็คให้แน่ใจว่า initialDesignData ไม่ใช่ null
            designData.diagram_name === initialDesignData.diagram_name &&
            designData.design_type === initialDesignData.design_type &&
            designData.diagram_type === initialDesignData.diagram_type &&
            designData.design_description === initialDesignData.design_description &&
            JSON.stringify([...(designData.requirement_id || [])].sort()) === JSON.stringify([...(initialDesignData.requirement_id || [])].sort()) &&
            designData.design_status === initialDesignData.design_status
        );

        // ตรวจสอบว่ามีไฟล์ใหม่เพิ่มหรือไม่
        const hasNewFiles = selectedFiles.length > 0;

        // ตรวจสอบว่ามีการลบไฟล์เดิมหรือไม่
        const filesDeleted = initialExistingFiles.length !== existingFiles.length ||
            !initialExistingFiles.every(initialFile =>
                existingFiles.some(currentFile => currentFile.file_design_id === initialFile.file_design_id)
            );

        // --- รวมผลการตรวจสอบทั้งหมด ---
        const hasAnyChange = metadataOrStatusChanged || diagramHasChanged || hasNewFiles || filesDeleted;

        // Log ผลการตรวจสอบ (เพื่อ Debug)
        console.log(`[Change Detection Summary] Metadata/Status: ${metadataOrStatusChanged}, Diagram: ${diagramHasChanged}, New Files: ${hasNewFiles}, Files Deleted: ${filesDeleted} => Any Change: ${hasAnyChange}`);

        // --- *** จุดตรวจสอบหลัก: ถ้าไม่มีการเปลี่ยนแปลงใดๆ เลย *** ---
        if (!hasAnyChange) {
            Swal.fire({
                title: "ไม่มีการเปลี่ยนแปลง", // หรือใช้ text แทน title ก็ได้
                text: "ไม่พบการแก้ไขข้อมูลใดๆ ใน Design, Diagram หรือ Files",
                icon: "info",
                timer: 2000, // แสดงสัก 2 วินาที
                showConfirmButton: false // ไม่ต้องมีปุ่ม OK
            });
            return; // *** ออกจากฟังก์ชันทันที ***
        }

        // --- ถ้ามีการเปลี่ยนแปลง ให้ดำเนินการต่อ ---

        // 2. ตรวจสอบว่ากรอกข้อมูล Metadata ครบถ้วนหรือไม่ (เฉพาะเมื่อมีการเปลี่ยนแปลง)
        const isDataFilled = designData.diagram_name.trim() &&
            designData.design_type &&
            designData.diagram_type &&
            designData.design_description.trim() &&
            (designData.requirement_id === null || (Array.isArray(designData.requirement_id) && designData.requirement_id.length >= 0)); // Requirement อาจจะเป็น [] ได้

        if (!isDataFilled) {
            Swal.fire("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบ", "warning");
            return;
        }


        // 3. กำหนด Status ใหม่
        let newStatus = designData.design_status; // เริ่มต้นด้วยค่า status ปัจจุบันที่ผู้ใช้อาจเลือก

        if (hasAnyChange && initialDesignData.design_status !== "WORKING") {

            newStatus = "WORKING";
            console.log(`Status forced to WORKING because changes were made to a design with initial status '${initialDesignData.design_status}'.`);
        }

        else if (hasAnyChange && initialDesignData.design_status === "WORKING") {
            console.log(`Status remains '${newStatus}' (initial was WORKING, user might have changed it, but not forced).`);

        }

        // 4. ยืนยันการบันทึก (แสดงเฉพาะเมื่อมีการเปลี่ยนแปลงและข้อมูลครบ)
        const confirmResult = await Swal.fire({
            title: "ยืนยันการอัปเดต",
            text: "ต้องการบันทึกการเปลี่ยนแปลงทั้งหมด Status จะถูกเปลี่ยนเป็น WORKING ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "บันทึกทั้งหมด",
            cancelButtonText: "ยกเลิก",
        });
        if (!confirmResult.isConfirmed) return;

        // 5. เริ่มกระบวนการบันทึก
        setIsSubmitting(true);
        Swal.fire({ title: 'กำลังบันทึกข้อมูล...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            // --- STEP 1: Save Diagram (if changed) ---
            if (diagramHasChanged) {
                console.log("UpdateDesign: Attempting to save diagram via ref...");
                if (diagramRef.current && typeof diagramRef.current.saveDiagram === 'function') {
                    await diagramRef.current.saveDiagram(); // await สำคัญมาก
                    console.log("UpdateDesign: Diagram save call completed.");
                } else { throw new Error("เกิดข้อผิดพลาด: ไม่สามารถเรียกฟังก์ชันบันทึก Diagram ได้"); }
            } else { console.log("UpdateDesign: Skipping diagram save (no changes)."); }

            // --- STEP 2: Update Metadata (if changed or status forced changed) ---
            const needsMetadataUpdate = metadataOrStatusChanged || (newStatus !== designData.design_status); // ใช้ค่าที่คำนวณไว้แล้ว + เช็ค status ที่อาจถูกบังคับเปลี่ยน
            if (needsMetadataUpdate) {
                console.log("UpdateDesign: Attempting to update metadata...");
                const metadataPayload = {
                    project_id: projectId,
                    diagram_name: designData.diagram_name,
                    design_type: designData.design_type,
                    diagram_type: designData.diagram_type,
                    design_description: designData.design_description,
                    requirement_id: designData.requirement_id && designData.requirement_id.length > 0 ? designData.requirement_id : null, // ส่ง null ถ้า array ว่าง
                    design_status: newStatus // ใช้ status ใหม่ที่อาจถูกเปลี่ยน
                };
                if (!designId) throw new Error("Design ID invalid for metadata update.");
                await axios.put(`http://localhost:3001/design/${designId}`, metadataPayload);
                console.log("UpdateDesign: Metadata updated.");
                // อัปเดต baseline state หลังจากบันทึกสำเร็จ
                setInitialDesignData(JSON.parse(JSON.stringify({ ...designData, design_status: newStatus })));
            } else { console.log("UpdateDesign: Skipping metadata update."); }

            // --- STEP 3: Upload New Files (if any were added) ---
            if (hasNewFiles) {
                console.log("UpdateDesign: Attempting to upload new files...");
                if (!designId || !projectId) throw new Error("Missing ID(s) for file upload.");

                const formData = new FormData();
                selectedFiles.forEach(file => formData.append("files", file));
                formData.append("design_id", designId);
                formData.append("project_id", projectId);

                try {
                    await axios.post("http://localhost:3001/uploadDesignFiles", formData, {
                        headers: { "Content-Type": "multipart/form-data" }
                    });
                    console.log("UpdateDesign: New files uploaded successfully.");

                    // Clear the selected files state AFTER successful upload
                    setSelectedFiles([]);
                    setFilePreviews([]);

                    console.log("Refreshing file list after upload...");
                    const response = await axios.get(`http://localhost:3001/designFiles/design/${designId}`);
                    // *** สำคัญ: ปรับแก้การประมวลผล response.data ให้ตรงกับโครงสร้างที่ Backend ส่งมา ***

                    const updatedFiles = response.data.map(file => ({
                        ...file,
                        // สร้าง file_url อีกครั้งเผื่อ Backend ไม่ได้ส่งมาให้ใน API นี้
                        file_url: file.file_url || `http://localhost:3001/files/design/${file.file_design_id}`
                    }));

                    setExistingFiles(updatedFiles); // Update displayed files
                    setInitialExistingFiles(JSON.parse(JSON.stringify(updatedFiles))); // อัปเดต Baseline สำหรับเช็คครั้งถัดไป
                    console.log("Manually updated existingFiles and initialExistingFiles after upload.");
                    // filesWereUploaded = true; // อาจจะไม่จำเป็นต้องใช้ตัวแปรนี้แล้ว ถ้า refresh ตรงนี้เลย

                } catch (uploadError) { // บรรทัด ~379 (หรือใกล้เคียง)
                    // Error Log แรกจะมาจากตรงนี้ เพราะ uploadError คือ ReferenceError
                    console.error("❌ File upload error:", uploadError.response?.data || uploadError.message); // <= Log แรก
                    // บรรทัดถัดไป throw Error ใหม่ ทำให้เกิด Log ที่สอง
                    throw new Error(uploadError.response?.data?.message || "File upload failed."); // <= ทำให้เกิด Log ที่สอง
                }
            } else {
                console.log("UpdateDesign: Skipping new file upload (no new files selected).");
            }

            // --- STEP 4: Sync Deleted Files State (ถ้ามีการลบแต่ไม่มีการอัพโหลด) ---
            if (filesDeleted && !hasNewFiles) {
                // การเรียก fetchDesign() ใน Step 3 ถ้ามี upload จะจัดการเรื่องนี้แล้ว
                // ถ้าไม่มี upload การ fetch ตอนท้าย หรือการ navigate จะทำให้ state ถูกต้องในครั้งถัดไป
                // หรือจะ update initialExistingFiles ตรงนี้ก็ได้ถ้าต้องการความแม่นยำทันทีหลังกด save
                console.log("UpdateDesign: File deletion detected without upload, state will sync on next load/navigation.");
                // Optional: Explicitly sync initialExistingFiles if needed immediately without fetchDesign
                // setInitialExistingFiles(JSON.parse(JSON.stringify(existingFiles)));
            }
 // --- *** STEP 5: Add Design History *** ---
if (hasAnyChange && newStatus === "WORKING") {
    console.log("UpdateDesign: Attempting to add design history (status is WORKING)...");
    try {
        // --- vvv ส่วนที่แก้ไข vvv ---

        // 1. หา Requirement ID ตัวเดียวที่จะส่งไป Backend
        let reqIdToSendForHistory = null; // เริ่มต้นเป็น null

        if (designData.requirement_id && Array.isArray(designData.requirement_id) && designData.requirement_id.length > 0) {
            // ถ้ามี Array และมีข้อมูล ให้เอาตัวแรก
            const firstId = Number(designData.requirement_id[0]); // แปลงเป็นตัวเลข
            if (!isNaN(firstId)) { // เช็คว่าแปลงเป็นตัวเลขได้
                reqIdToSendForHistory = firstId;
            } else {
                console.warn("History: ไม่สามารถแปลง Requirement ID ตัวแรกเป็นตัวเลขได้:", designData.requirement_id[0]);
                // ถ้าแปลงไม่ได้ จะใช้ค่า Default ข้างล่าง
            }
        }

        // 2. จัดการกรณีที่ไม่มี ID หรือแปลงไม่ได้ (เพื่อให้สอดคล้องกับ DB ที่เป็น NOT NULL)
        if (reqIdToSendForHistory === null) {
            // ถ้ายังเป็น null (ไม่ได้เลือก หรือแปลง ID แรกไม่ได้) ให้กำหนดค่า Default
            // *** คุณต้องตัดสินใจว่าค่า Default ควรเป็นอะไร ***
            // เช่น 0 อาจหมายถึง ไม่ได้ระบุ หรือ มีหลายตัว (ต้องตกลงกันในทีม)
            reqIdToSendForHistory = 0; // <<--- กำหนดค่า Default เป็น 0 (หรือ -1 หรือค่าอื่นที่เหมาะสม)
            console.warn(`History: ไม่พบ Requirement ID ที่ถูกต้อง, กำหนดค่า Default เป็น ${reqIdToSendForHistory} เนื่องจากข้อจำกัด Database (int NOT NULL)`);
        }

        // --- ^^^ สิ้นสุดส่วนที่แก้ไข ^^^ ---


        // 3. สร้าง Payload โดยใช้ ID ตัวเลขตัวเดียว
        const historyPayload = {
            design_id: designId,
            requirement_id: reqIdToSendForHistory, // <--- ใช้ ID ตัวเลขตัวเดียว (หรือ Default)
            design_type: designData.design_type,
            diagram_name: designData.diagram_name,
            diagram_type: designData.diagram_type,
            design_description: designData.design_description,
            design_status: newStatus // ใช้ newStatus ที่เป็น 'WORKING'
        };

        console.log(">>> กำลังส่ง history payload:", historyPayload); // Log ดูค่าที่จะส่ง

        if (!designId) {
            console.error("❌ Cannot save history: Design ID is missing.");
        } else {
            // 4. ส่งข้อมูลไป Backend (โค้ดส่วนนี้เหมือนเดิม)
            await axios.post("http://localhost:3001/addHistoryDesign", historyPayload);
            console.log("📜 Design History added successfully for Design ID:", designId);
        }
    } catch (historyError) {
        console.error("❌ Failed to add design history:", historyError.response?.data || historyError.message);
        // Log payload ที่ทำให้เกิด Error ด้วยเผื่อ Debug
        console.error(">>> Payload ที่ทำให้เกิด Error:", historyPayload);
    }
} else {
                if (!hasAnyChange) {
                    console.log("UpdateDesign: Skipping design history add (no changes detected).");
                } else { // hasAnyChange is true but newStatus is not 'WORKING'
                    console.log(`UpdateDesign: Skipping design history add (final status is ${newStatus}, not WORKING).`);
                }
            }
            // --- Final Success ---
            Swal.close(); // ปิด loading dialog
            Swal.fire({ title: "บันทึกสำเร็จ!", text: "ข้อมูลทั้งหมดถูกบันทึกเรียบร้อยแล้ว", icon: "success", timer: 2000, showConfirmButton: false })
                .then(() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } }));

        } catch (error) { // Catch errors from ANY step
            Swal.close(); // ปิด loading dialog ถ้ามี error
            console.error("❌ UpdateDesign Error in handleUpdate:", error);
            Swal.fire("บันทึกล้มเหลว", error.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ", "error");
        } finally {
            setIsSubmitting(false); // สิ้นสุดสถานะ กำลัง submit ไม่ว่าจะสำเร็จหรือล้มเหลว
        }
    }; // End handleUpdate

    // --- Form Input Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setDesignData(prev => ({ ...prev, [name]: value }));
    };

    const handleRequirementChange = (selectedOptions) => {
        setDesignData(prev => ({
            ...prev,
            requirement_id: selectedOptions ? selectedOptions.map(option => option.value) : [], // Store array of numbers
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        const currentFileNames = new Set([...selectedFiles.map(f => f.name), ...existingFiles.map(f => f.file_design_name)]);
        const validFiles = [];
        const oversizedFiles = [];
        const duplicateFiles = [];

        files.forEach(file => {
            if (currentFileNames.has(file.name)) {
                duplicateFiles.push(file.name);
            } else if (file.size > MAX_SIZE) {
                oversizedFiles.push(file.name);
            } else {
                validFiles.push(file);
                currentFileNames.add(file.name); // Add to set for checks within same selection
            }
        });

        if (oversizedFiles.length > 0) {
            Swal.fire("Warning", `ไฟล์ต่อไปนี้มีขนาดใหญ่เกิน 5MB และจะไม่ถูกเพิ่ม: ${oversizedFiles.join(', ')}`, "warning");
        }
        if (duplicateFiles.length > 0) {
            Swal.fire("Warning", `ไฟล์ต่อไปนี้มีชื่อซ้ำกับไฟล์ที่มีอยู่หรือไฟล์ที่เลือกแล้ว และจะไม่ถูกเพิ่ม: ${duplicateFiles.join(', ')}`, "warning");
        }


        setSelectedFiles(prev => [...prev, ...validFiles]);

        const newPreviews = validFiles.map(file => {
            const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
            return { url: previewUrl, type: file.type.startsWith('image/') ? 'image' : 'other', name: file.name, size: file.size };
        });
        setFilePreviews(prev => [...prev, ...newPreviews]);

        e.target.value = null; // Allow re-selecting the same file if removed
    };

    const handleRemoveSelectedFile = (indexToRemove) => {
        const previewToRemove = filePreviews[indexToRemove];
        if (previewToRemove?.type === 'image' && previewToRemove.url) {
            URL.revokeObjectURL(previewToRemove.url);
        }
        setSelectedFiles(prev => prev.filter((_, i) => i !== indexToRemove));
        setFilePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    const handleDeleteFile = async (fileIdToDelete) => {
        if (!fileIdToDelete) return;

        const fileToDelete = existingFiles.find(f => f.file_design_id === fileIdToDelete);
        const fileName = fileToDelete ? fileToDelete.file_design_name : `File ID ${fileIdToDelete}`;

        const confirmResult = await Swal.fire({
            title: `ต้องการลบไฟล์ "${fileName}"?`,
            text: "การดำเนินการนี้ไม่สามารถย้อนกลับได้!",
            icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก'
        });
        if (!confirmResult.isConfirmed) return;

        Swal.fire({ title: 'กำลังลบไฟล์...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            // ADJUST DELETE API ENDPOINT AS NEEDED
            await axios.delete(`http://localhost:3001/design/file/${fileIdToDelete}`);
            setExistingFiles(prev => prev.filter(file => file.file_design_id !== fileIdToDelete));
            Swal.fire({ icon: "success", title: "ลบไฟล์สำเร็จ", timer: 1500, showConfirmButton: false });
        } catch (error) {
            console.error("Error deleting file:", error.response?.data || error.message);
            Swal.fire("Error", `เกิดข้อผิดพลาดในการลบไฟล์: ${error.response?.data?.message || error.message}`, "error");
        }
    };

    // --- Prepare data for React-Select ---
    const requirementOptions = baselineRequirements.map(req => ({
        value: req.requirement_id,
        label: `REQ-${String(req.requirement_id).padStart(3, '0')}: ${req.requirement_name}`,
    }));

    const selectedRequirementValues = requirementOptions.filter(option =>
        Array.isArray(designData.requirement_id) && designData.requirement_id.includes(option.value)
    );


    // --- Render ---
    return (
        <div className="UpdateDesign-container"> {/* Prefixed */}
            <h1 className="UpdateDesign-title">Update Design (ID: {designId || 'N/A'})</h1> {/* Prefixed */}

            {loading ? (
                <div className="UpdateDesign-loadingIndicator">Loading...</div> /* Prefixed */
            ) : !initialDesignData ? (
                <div className="UpdateDesign-errorContainer"> {/* Prefixed */}
                    <p>ไม่สามารถโหลดข้อมูล Design ได้ หรือ Design ID ไม่ถูกต้อง</p>
                    <button onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } })}>
                        กลับหน้า Dashboard
                    </button>
                </div>
            ) : (
                // Main content wrapper
                <div>
                    <form className="UpdateDesign-form" onSubmit={handleUpdate} noValidate> {/* Prefixed */}
                        {/* ----- Metadata Fields ----- */}
                        <fieldset disabled={isSubmitting}>
                            <legend>Design Details</legend>
                            <label className="UpdateDesign-label"> {/* Prefixed */}
                                Diagram Name: <span className="UpdateDesign-requiredStar">*</span> {/* Prefixed */}
                                <span><input className="UpdateDesign-input" type="text" name="diagram_name" value={designData.diagram_name} onChange={handleChange} required /></span> {/* Prefixed */}
                            </label>
                            <label className="UpdateDesign-label"> {/* Prefixed */}
                                Design Type: <span className="UpdateDesign-requiredStar">*</span> {/* Prefixed */}
                                <span>
                                    <select className="UpdateDesign-select" name="design_type" value={designData.design_type} onChange={handleChange} required> {/* Prefixed */}
                                        <option value="" disabled>Select...</option>
                                        <option value="High-Level Design">High-Level Design</option>
                                        <option value="Low-Level Design">Low-Level Design</option>
                                    </select>
                                </span>
                            </label>
                            <label className="UpdateDesign-label"> {/* Prefixed */}
                                Diagram Type: <span className="UpdateDesign-requiredStar">*</span> {/* Prefixed */}
                                <span>
                                    <select className="UpdateDesign-select" name="diagram_type" value={designData.diagram_type} onChange={handleChange} required > {/* Prefixed */}
                                        <option value="" disabled>Select...</option>
                                        <option value="Prototype">Prototype</option>
                                        <option value="Flow Chart">Flow Chart</option>
                                        <option value="ER Diagram">ER Diagram</option>
                                        <option value="Pseudo Code">Pseudo Code</option>
                                    </select>
                                </span>
                            </label>
                            <label className="UpdateDesign-label"> {/* Prefixed */}
                                Requirements: <span className="UpdateDesign-requiredStar">*</span> {/* Prefixed */}
                                <span>
                                    <Select
                                        isMulti
                                        options={requirementOptions}
                                        value={selectedRequirementValues}
                                        onChange={handleRequirementChange}
                                        className="UpdateDesign-selectContainer" /* Prefixed Wrapper */
                                        classNamePrefix="UpdateDesign-select"   /* Prefixed for internal elements */
                                        placeholder="Select linked requirements..."
                                        noOptionsMessage={() => 'No baseline requirements found'}
                                    />
                                </span>
                            </label>
                            <label className="UpdateDesign-label"> {/* Prefixed */}
                                Design Description: <span className="UpdateDesign-requiredStar">*</span> {/* Prefixed */}
                                <span><textarea className="UpdateDesign-textarea" name="design_description" value={designData.design_description} onChange={handleChange} required rows={5} /></span> {/* Prefixed */}
                            </label>
                        </fieldset>

                        {/* ----- File Management Section ----- */}
                        <fieldset disabled={isSubmitting}>
                            <legend>Attached Files</legend>
                            {/* Existing Files */}
                            <div className="UpdateDesign-existingFilesSection">
                                <h3>Existing Files:</h3>
                                {existingFiles.length > 0 ? (
                                    <ul className="UpdateDesign-fileList UpdateDesign-existingFilesList">
                                        {existingFiles.map((file) => (
                                            <li key={file.file_design_id} className="UpdateDesign-fileItem">
                                                <img src={file.file_design_data} alt={file.file_design_name || `File ${file.file_design_id}`} className="UpdateDesign-fileThumbnail" onError={(e) => e.target.style.display = 'none'} /* Hide broken img */ />
                                                <span className="UpdateDesign-fileName">{file.file_design_name || `File ID: ${file.file_design_id}`}</span>
                                                <button type="button" className="UpdateDesign-deleteFileBtn" onClick={() => handleDeleteFile(file.file_design_id)} title="Delete this file">❌</button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p>No existing files.</p>}
                            </div>
                            {/* Upload New Files Label & Input */}
                            <label className="UpdateDesign-label UpdateDesign-labelFile"> {/* Prefixed */}
                                Add New Files (Click or Drop)
                                <input className="UpdateDesign-inputFile" type="file" multiple onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" /> {/* Prefixed */}
                            </label>
                            {/* Preview New Files */}
                            {selectedFiles.length > 0 && (
                                <div className="UpdateDesign-selectedFilesSection"> {/* Prefixed */}
                                    <h4>Files Queued for Upload:</h4>
                                    <ul className="UpdateDesign-fileList UpdateDesign-selectedFilesList"> {/* Prefixed */}
                                        {filePreviews.map((preview, index) => (
                                            <li key={index} className="UpdateDesign-fileItem"> {/* Prefixed */}
                                                {preview.type === 'image' && preview.url ?
                                                    <img src={preview.url} alt={`Preview ${preview.name}`} className="UpdateDesign-fileThumbnail" /> /* Prefixed */
                                                    : <span className="UpdateDesign-fileIcon">📄</span> /* Prefixed */}
                                                <span className="UpdateDesign-fileName">{preview.name} ({(preview.size / 1024).toFixed(1)} KB)</span> {/* Prefixed */}
                                                <button type="button" className="UpdateDesign-removeSelectedBtn" onClick={() => handleRemoveSelectedFile(index)} title="Remove from upload queue">❌</button> {/* Prefixed */}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </fieldset>

                        {/* ----- Action Buttons (Inside Form) ----- */}
                        <div className="UpdateDesign-buttons"> {/* Prefixed */}
                            <button
                                type="button"
                                className="UpdateDesign-btnCancel"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="UpdateDesign-btn" disabled={isSubmitting || loading}> {/* Prefixed */}
                                {isSubmitting ? 'กำลังบันทึก...' : 'Save'}
                            </button>
                        </div>

                    </form> {/* <--- End Form --- */}

                    {/* ----- Diagram Editor Section (Outside Form) ----- */}
                    <fieldset className="UpdateDesign-diagramFieldset" disabled={isSubmitting}> {/* Prefixed */}
                        <legend>Diagram Editor</legend>
                        <UpdateDiagram
                            ref={diagramRef}
                            designId={parseInt(designId, 10)}
                            // Pass initialDiagramElements fetched in this component
                            initialDiagramElements={diagramElements}
                        // Add onSave prop if UpdateDiagram needs to notify parent on internal save completion (though integrated save handles it now)
                        // onSave={() => console.log("Diagram saved internally")}
                        />
                    </fieldset>

                </div> // End main content wrapper div
            )}
        </div>
    );
};

export default UpdateDesign;