import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import "./CSS/UpdateDesign.css"; // Make sure this CSS file exists and is styled appropriately
import Swal from "sweetalert2";
import CreateDiagram from "./CreateDiagram"; // Assume CreateDiagram can accept initial data and has necessary methods like saveDiagram and hasUnsavedChanges
import UpdateDiagram from "./UpdateDiagram";

// Helper function to format file size (Optional, but good practice)
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to check if a filename likely represents an image (Optional)
const isImageFile = (filename) => {
    if (!filename) return false;
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const lowerCaseFilename = filename.toLowerCase();
    return imageExtensions.some(ext => lowerCaseFilename.endsWith(ext));
};


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

                    // Process Files - Construct displayUrl assuming backend route exists
                    const filesMap = new Map();
                    response.data.forEach(row => {
                        if (row.file_design_id != null) {
                            if (!filesMap.has(row.file_design_id)) {
                                const fileUrl = `http://localhost:3001/files/design/${row.file_design_id}`; // ADJUST ROUTE IF NEEDED
                                filesMap.set(row.file_design_id, {
                                    file_design_id: row.file_design_id,
                                    file_url: fileUrl,
                                    file_design_name: row.file_design_name || `File_${row.file_design_id}`,
                                    create_at: row.file_created_at,
                                    update_at: row.file_updated_at,
                                });
                            }
                        }
                    });
                    const fetchedFiles = Array.from(filesMap.values());
                    console.log("[fetchDesign] Setting existingFiles:", fetchedFiles);
                    setExistingFiles(fetchedFiles);
                    return true;
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
                    await Promise.all([fetchRequirements(), fetchDiagramData()]);
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

    // --- Update Handler ---
    const handleUpdate = async (e) => {
        e.preventDefault();

        if (!initialDesignData) { Swal.fire("Error", "ข้อมูลเริ่มต้นยังไม่ถูกโหลด", "error"); return; }

        // Validate metadata fields...
        const isDataFilled = designData.diagram_name.trim() && designData.design_type && designData.diagram_type && designData.design_description.trim() && (designData.requirement_id === null || (Array.isArray(designData.requirement_id) && designData.requirement_id.length >= 0));
        if (!isDataFilled) { Swal.fire("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบ", "warning"); return; }

        // --- 1. Check for Diagram Changes ---
        let diagramHasChanged = false;
        try {
            if (diagramRef.current && typeof diagramRef.current.hasUnsavedChanges === 'function') {
                diagramHasChanged = diagramRef.current.hasUnsavedChanges();
                console.log("UpdateDesign: Diagram has changes =", diagramHasChanged);
            } else { console.warn("UpdateDesign: Cannot check diagram changes via ref."); }
        } catch (err) { console.error("UpdateDesign: Error calling hasUnsavedChanges:", err); Swal.fire("Error", "เกิดข้อผิดพลาดในการตรวจสอบสถานะ Diagram", "error"); return; }

        // Check for new files
        const hasNewFiles = selectedFiles.length > 0;
        // Check for status change
        const statusChanged = initialDesignData && designData.design_status !== initialDesignData.design_status;

        // --- 2. Check if *anything* changed ---
        if (isMetadataUnchanged && !diagramHasChanged && !hasNewFiles && !statusChanged) {
            Swal.fire({ text: "ไม่มีการแก้ไขข้อมูลใดๆ", icon: "info", timer: 1500, showConfirmButton: false });
            return;
        }

        // Determine new status
        let newStatus = designData.design_status;
        if (initialDesignData.design_status === "BASELINE" && (!isMetadataUnchanged || diagramHasChanged || hasNewFiles || statusChanged)) {
            if (designData.design_status === "BASELINE") { newStatus = "WORKING"; console.log("Status forced to WORKING due to modifications."); }
        }

        // --- 3. Confirmation ---
        const confirmResult = await Swal.fire({
            title: "ยืนยันการอัปเดต",
            text: "ต้องการบันทึกการเปลี่ยนแปลงทั้งหมด (รวมถึง Diagram ถ้ามีการแก้ไข)?",
            icon: "warning", showCancelButton: true, confirmButtonText: "บันทึกทั้งหมด", cancelButtonText: "ยกเลิก",
        });
        if (!confirmResult.isConfirmed) return;

        // --- 4. Start Saving Process ---
        setIsSubmitting(true); // <--- เริ่มสถานะ กำลัง submit
        Swal.fire({ title: 'กำลังบันทึกข้อมูล...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            // --- STEP 1: Save Diagram (if changed) ---
            if (diagramHasChanged) {
                console.log("UpdateDesign: Attempting to save diagram via ref...");
                if (diagramRef.current && typeof diagramRef.current.saveDiagram === 'function') {
                    // รอผลลัพธ์จากการบันทึก Diagram
                    await diagramRef.current.saveDiagram(); // await สำคัญมาก
                    console.log("UpdateDesign: Diagram save call completed.");
                    // ไม่ต้องเช็ค success/failure ที่นี่ เพราะถ้าล้มเหลว มันจะ throw error มาแล้ว
                } else { throw new Error("เกิดข้อผิดพลาด: ไม่สามารถเรียกฟังก์ชันบันทึก Diagram ได้"); }
            } else { console.log("UpdateDesign: Skipping diagram save (no changes)."); }

            // --- STEP 2: Update Metadata (if changed) ---
            const metadataChanged = !isMetadataUnchanged || statusChanged;
            if (metadataChanged) {
                console.log("UpdateDesign: Attempting to update metadata...");
                const metadataPayload = { project_id: projectId, diagram_name: designData.diagram_name, design_type: designData.design_type, diagram_type: designData.diagram_type, design_description: designData.design_description, requirement_id: designData.requirement_id && designData.requirement_id.length > 0 ? designData.requirement_id : null, design_status: newStatus };
                if (!designId) throw new Error("Design ID invalid for metadata update.");
                await axios.put(`http://localhost:3001/design/${designId}`, metadataPayload);
                console.log("UpdateDesign: Metadata updated.");
                setInitialDesignData(JSON.parse(JSON.stringify({ ...designData, design_status: newStatus }))); // Update baseline
            } else { console.log("UpdateDesign: Skipping metadata update."); }

            // --- STEP 3: Upload Files (if changed) ---
            if (hasNewFiles) {
                console.log("UpdateDesign: Attempting to upload files...");
                if (!designId || !projectId) throw new Error("Missing ID for file upload.");
                const formData = new FormData();
                selectedFiles.forEach(file => formData.append("files", file));
                formData.append("design_id", designId); formData.append("project_id", projectId);
                try {
                    await axios.post("http://localhost:3001/uploadDesignFiles", formData, { headers: { "Content-Type": "multipart/form-data" } });
                    console.log("UpdateDesign: Files uploaded.");
                    setSelectedFiles([]); setFilePreviews([]);
                    await fetchDesign(); // Refresh file list
                } catch (uploadError) { console.error("❌ File upload error:", uploadError); throw new Error(uploadError.response?.data?.message || "File upload failed."); }
            } else { console.log("UpdateDesign: Skipping file upload."); }

            // --- Final Success ---
            Swal.close();
            Swal.fire({ title: "บันทึกสำเร็จ!", text: "ข้อมูลทั้งหมดถูกบันทึกเรียบร้อยแล้ว", icon: "success", timer: 2000, showConfirmButton: false })
                .then(() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } }));

        } catch (error) { // Catch errors from ANY step
            Swal.close();
            console.error("❌ UpdateDesign Error in handleUpdate:", error);
            // แสดง error message ที่ throw มาจากขั้นตอนต่างๆ
            Swal.fire("บันทึกล้มเหลว", error.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ", "error");
        } finally {
            setIsSubmitting(false); // <--- สิ้นสุดสถานะ กำลัง submit
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


    return (
        <div className="update-design-container">
            <h1 className="update-design-title">Update Design (ID: {designId || 'N/A'})</h1>

            {loading ? (
                <div className="loading-indicator">Loading...</div>
            ) : !initialDesignData ? (
                <div className="error-container">
                    <p>ไม่สามารถโหลดข้อมูล Design ได้ หรือ Design ID ไม่ถูกต้อง</p>
                    <button onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } })}>
                        กลับหน้า Dashboard
                    </button>
                </div>
            ) : (
                // ใช้ div ครอบ form และ fieldset ของ diagram เพื่อจัด layout (ถ้าต้องการ)
                <div>
                    <form className="update-design-form" onSubmit={handleUpdate} noValidate>
                        {/* ----- Metadata Fields ----- */}
                        <fieldset disabled={isSubmitting}> {/* <-- ใช้ isSubmitting ที่ประกาศแล้ว */}
                            <legend>Design Details</legend>
                            {/* ... Input, Select, Textarea ... */}
                            <label className="update-design-label"> Diagram Name: <span className="required-star">*</span> <input className="update-design-input" type="text" name="diagram_name" value={designData.diagram_name} onChange={handleChange} required /></label>
                            <label className="update-design-label"> Design Type: <span className="required-star">*</span> <select className="update-design-select" name="design_type" value={designData.design_type} onChange={handleChange} required><option value="" disabled>Select...</option><option value="High-Level Design">High-Level Design</option><option value="Low-Level Design">Low-Level Design</option></select></label>
                            <label className="update-design-label"> Diagram Type: <span className="required-star">*</span> <select className="update-design-select" name="diagram_type" value={designData.diagram_type} onChange={handleChange} required ><option value="" disabled>Select...</option><option value="Prototype">Prototype</option><option value="Flow Chart">Flow Chart</option><option value="ER Diagram">ER Diagram</option><option value="Pseudo Code">Pseudo Code</option><option value="Use Case Diagram">Use Case Diagram</option><option value="Sequence Diagram">Sequence Diagram</option><option value="Other">Other</option></select></label>
                            <label className="update-design-label"> Requirements: <span className="required-star">*</span> <Select isMulti options={requirementOptions} value={selectedRequirementValues} onChange={handleRequirementChange} className="react-select-container" classNamePrefix="react-select" placeholder="Select linked requirements..." noOptionsMessage={() => 'No baseline requirements found'} /></label>
                            <label className="update-design-label"> Design Description: <span className="required-star">*</span> <textarea className="update-design-textarea" name="design_description" value={designData.design_description} onChange={handleChange} required rows={5} /> </label>
                        </fieldset>

                        {/* ----- File Management Section ----- */}
                        <fieldset disabled={isSubmitting}> {/* <-- ใช้ isSubmitting ที่ประกาศแล้ว */}
                            <legend>Attached Files</legend>
                            {/* ... Existing files list ... */}
                            {/* ... Upload new files input ... */}
                            {/* ... Preview new files ... */}
                            <div className="existing-files-section"><h3>Existing Files:</h3>{existingFiles.length > 0 ? (<ul className="file-list existing-files-list">{existingFiles.map((file) => { const isImage = isImageFile(file.file_design_name); const fileUrl = file.file_url; return (<li key={file.file_design_id} className="file-item existing-file-item">{isImage ? (<img src={fileUrl} alt={file.file_design_name} className="file-thumbnail" onError={(e) => { e.target.style.display = 'none'; }} />) : (<span className="file-icon" title={file.file_design_name}>📄</span>)} <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="file-name-link" title={`View/Download ${file.file_design_name}`}><span className="file-name">{file.file_design_name || `File ID: ${file.file_design_id}`}</span></a><button type="button" className="delete-file-btn" onClick={() => handleDeleteFile(file.file_design_id)} title="Delete this file">❌</button></li>); })}</ul>) : <p>No existing files attached.</p>}</div>
                            <label className="update-design-label update-design-label-file"> Add New Files:<input className="update-design-input-file" type="file" multiple onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.ppt,.pptx,.zip,.rar" /></label>
                            {selectedFiles.length > 0 && (<div className="selected-files-section"><h4>Files Queued for Upload:</h4><ul className="file-list selected-files-list">{filePreviews.map((preview, index) => (<li key={index} className="file-item">{preview.type === 'image' && preview.url ? <img src={preview.url} alt={`Preview ${preview.name}`} className="file-thumbnail" /> : <span className="file-icon" title={preview.name}>📄</span>} <span className="file-name">{preview.name} ({formatFileSize(preview.size)})</span><button type="button" className="remove-selected-btn" onClick={() => handleRemoveSelectedFile(index)} title="Remove from upload queue">❌</button></li>))}</ul></div>)}
                        </fieldset>

                        {/* ----- Action Buttons (อยู่ภายใน Form) ----- */}
                        <div className="update-design-buttons">
                            <button type="button" className="update-design-btn-cancel" onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } })} disabled={isSubmitting}> Cancel </button>
                            <button type="submit" className="update-design-btn" disabled={isSubmitting || loading}>
                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลงทั้งหมด'}
                            </button>
                        </div>

                    </form> {/* <--- **** ปิด Form ตรงนี้ **** --- */}

                    {/* ----- Diagram Editor Section (ย้ายมาอยู่นอก Form) ----- */}
                    <fieldset className="diagram-fieldset" disabled={isSubmitting}> {/* <-- ใช้ isSubmitting ที่ประกาศแล้ว */}
                        <legend>Diagram Editor</legend>
                        <UpdateDiagram
                            ref={diagramRef} // ส่ง ref สำหรับ Integrated Saving
                            designId={parseInt(designId, 10)}
                        // ไม่ต้องส่ง props อื่นๆ ถ้า UpdateDiagram จัดการเอง
                        />
                    </fieldset>

                </div> // ปิด div ครอบ
            )}
        </div>
    );
};

export default UpdateDesign;