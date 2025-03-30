import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import "./CSS/UpdateDesign.css";
import Swal from "sweetalert2";
import CreateDiagram from "./CreateDiagram"; // Assume CreateDiagram can accept initial data

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
        requirement_id: [],
        design_status: "WORKING", // Default status
    });
    const [baselineRequirements, setBaselineRequirements] = useState([]);
    const [loading, setLoading] = useState(true); // Combined loading state
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);
    const [existingFiles, setExistingFiles] = useState([]);
    const [initialDesignData, setInitialDesignData] = useState(null); // For comparison
    // --- State for Diagram Data ---
    const [diagramElements, setDiagramElements] = useState(null); // Initialize as null

    const diagramRef = useRef(null); // Ref for CreateDiagram

    // --- Effect for Initial Data Fetching ---
    useEffect(() => {
        // Reset states on ID change
        setLoading(true);
        setDesignData({ diagram_name: "", design_type: "", diagram_type: "", design_description: "", requirement_id: [], design_status: "WORKING"});
        setInitialDesignData(null);
        setBaselineRequirements([]);
        setExistingFiles([]);
        setSelectedFiles([]);
        setFilePreviews([]);
        setDiagramElements(null); // Reset diagram data

        if (!designId || !projectId) {
            console.error("Missing designId or projectId");
            Swal.fire("Error", "ไม่พบ Design ID หรือ Project ID ใน URL", "error");
            setLoading(false);
            navigate("/"); // Navigate to a safe page
            return;
        }

        // --- Fetch Functions ---
        const fetchDesign = async () => {
            // Ensure necessary IDs are present (usually checked in useEffect before calling)
            if (!projectId || !designId) {
                console.error("[fetchDesign] Error: Missing projectId or designId.");
                Swal.fire("Error", "ไม่พบ Project ID หรือ Design ID ที่จำเป็น", "error");
                // Optional: Navigate back if called directly and IDs are missing
                // navigate(`/Dashboard?project_id=${projectId || ''}`, { state: { selectedSection: "Design" } });
                return false; // Indicate failure
            }
    
            const apiUrl = `http://localhost:3001/designedit`;
            const params = { project_id: projectId, design_id: designId };
            console.log(`[fetchDesign] Fetching design data from ${apiUrl} with params:`, params);
    
            try {
                const response = await axios.get(apiUrl, { params });
                console.log("[fetchDesign] Raw response data:", response.data);
    
                // Check if data received is an array and has at least one row
                if (response.data && Array.isArray(response.data) && response.data.length > 0) {
    
                    // Since the JOIN might return multiple rows for the same design (one per file),
                    // we take the core design details from the first row.
                    const firstRow = response.data[0];
    
                    // --- Process Core Design Details ---
                    const fetchedRequirementId = firstRow.requirement_id; // Get the single integer ID
    
                    // Prepare the data for the state update
                    const currentData = {
                        diagram_name: firstRow.diagram_name || "",
                        design_type: firstRow.design_type || "",
                        diagram_type: firstRow.diagram_type || "",
                        design_description: firstRow.design_description || "",
                        // IMPORTANT: Adapt the single ID to an array for the state,
                        // because the Select component/handler seems set up for multi-select state.
                        requirement_id: (fetchedRequirementId !== null && fetchedRequirementId !== undefined) ? [fetchedRequirementId] : [],
                        design_status: firstRow.design_status || "WORKING",
                    };
                    console.log("[fetchDesign] Setting designData state:", currentData);
                    setDesignData(currentData);
    
                    // Create a deep copy for initial state comparison after setting state
                    const initialDataCopy = JSON.parse(JSON.stringify(currentData));
                     console.log("[fetchDesign] Setting initialDesignData state:", initialDataCopy);
                    setInitialDesignData(initialDataCopy);
    
    
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
                     // Handle case where no data is returned for the given IDs
                    console.warn(`[fetchDesign] No design data found for project_id: ${projectId}, design_id: ${designId}`);
                    Swal.fire("ไม่พบข้อมูล", `ไม่พบข้อมูล Design สำหรับ ID: ${designId}`, "warning");
                    navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } }); // Navigate back
                    return false; // Indicate failure
                }
            } catch (error) {
                 // Handle network or other errors during the fetch
                console.error("[fetchDesign] Error fetching design data:", error.response?.data || error.message || error);
                Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูล Design ได้ (ดู Console สำหรับรายละเอียด)", "error");
                 // It might be good practice to reset related states or navigate back on critical errors
                 // setInitialDesignData(null); // Prevent potential comparison issues
                 // setDesignData({...}); // Reset to default
                 // setExistingFiles([]);
                return false; // Indicate failure
            }
        };

        const fetchRequirements = async () => {
             if (!projectId) return; // Guard clause
            try {
                const response = await axios.get(`http://localhost:3001/project/${projectId}/requirement`);
                const baselineReqs = response.data.filter(req => req.requirement_status === 'BASELINE');
                setBaselineRequirements(baselineReqs);
            } catch (error) {
                console.error("Error fetching requirements:", error);
                // Potentially notify user, but maybe non-critical
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

        // --- Run all fetch operations ---
        const fetchAllData = async () => {
            setLoading(true);
            try {
                 // Fetch design first
                const designFetched = await fetchDesign();

                // Only fetch related data if design was found
                if (designFetched) {
                     await Promise.all([
                        fetchRequirements(),
                        fetchFiles(),
                        fetchDiagramData() // Fetch diagram data too
                    ]);
                } else {
                     // Handle the case where the design itself wasn't found (already navigated back)
                    console.log("Skipping related data fetch because design was not found.");
                }
            } catch (error) {
                console.error("Error during initial data fetching:", error);
                 // A general error might occur in Promise.all
                 Swal.fire("Error", "เกิดข้อผิดพลาดในการโหลดข้อมูลเริ่มต้น", "error");
            } finally {
                setLoading(false); // Ensure loading is always set to false
            }
        };

        fetchAllData();

    }, [designId, projectId, navigate]); // Dependencies for the effect

    // --- Check if Data is Unchanged ---
    const isDataUnchanged = !initialDesignData || (
        designData.diagram_name === initialDesignData.diagram_name &&
        designData.design_type === initialDesignData.design_type &&
        designData.diagram_type === initialDesignData.diagram_type &&
        designData.design_description === initialDesignData.description &&
        // Compare requirement arrays properly (sort and stringify)
        JSON.stringify([...(designData.requirement_id || [])].sort()) === JSON.stringify([...(initialDesignData.requirement_id || [])].sort()) &&
        selectedFiles.length === 0
        // Note: Diagram changes need separate handling via CreateDiagram's state/props/save logic
    );

    const fetchDiagramData = async () => {
        if (!designId) return;
        try {
            console.log(`Workspaceing diagram data for design ID: ${designId}`); // แก้ Typo "Workspaceing" ด้วยก็ดีครับ
            const response = await axios.get(`http://localhost:3001/api/diagrams/design/${designId}`);
            console.log("Diagram data response:", response.data);
            if (response.data && Array.isArray(response.data.elements)) {
                setDiagramElements(response.data.elements);
            } else {
                setDiagramElements([]);
            }
        } catch (error) {
            console.error("Error fetching diagram data:", error.response || error);
            Swal.fire("Warning", "ไม่สามารถโหลดข้อมูล Diagram ได้", "warning");
            setDiagramElements([]);
        }
    };
     // --- Update Handler ---
     const handleUpdate = async (e) => {
        e.preventDefault();
    
        if (!initialDesignData) {
            Swal.fire("Error", "ข้อมูลเริ่มต้นยังไม่ถูกโหลด กรุณารอสักครู่", "error");
            return;
        }
    
        // ตรวจสอบข้อมูลที่ต้องมี
        const isDataFilled =
            designData.diagram_name.trim() &&
            designData.design_type &&
            designData.diagram_type &&
            designData.design_description.trim() &&
            designData.requirement_id && designData.requirement_id.length > 0;
    
        if (!isDataFilled) {
            Swal.fire("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบ", "warning");
            return;
        }
    
        // เช็คการเปลี่ยนแปลง
        let diagramHasChanged = false;
        if (diagramRef.current && typeof diagramRef.current.hasUnsavedChanges === 'function') {
            diagramHasChanged = diagramRef.current.hasUnsavedChanges();
        }
    
        if (isDataUnchanged && !diagramHasChanged) {
            Swal.fire({ text: "ไม่มีการแก้ไขข้อมูล", icon: "info", timer: 1500, showConfirmButton: false });
            return;
        }
    
        // ถ้าสถานะเป็น BASELINE -> เปลี่ยนเป็น WORKING
        let newStatus = designData.design_status;
        if (initialDesignData.design_status === "BASELINE") {
            newStatus = "WORKING";
        }
    
        // ยืนยันการอัปเดต
        const confirmResult = await Swal.fire({
            title: "ยืนยันการอัปเดต",
            text: "ต้องการอัปเดตข้อมูลนี้หรือไม่?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ตกลง",
            cancelButtonText: "ยกเลิก",
        });
    
        if (!confirmResult.isConfirmed) return;
    
        Swal.fire({ title: 'กำลังอัปเดต...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
        try {
            // ถ้ามีการเปลี่ยนแปลง Diagram ให้บันทึกก่อน
            if (diagramRef.current && typeof diagramRef.current.saveDiagram === 'function') {
                await diagramRef.current.saveDiagram();
            }
    
            // 📌 ตรวจสอบค่า requirement_id ก่อนส่ง API
            const updatedData = { 
                ...designData, 
                requirement_id: designData.requirement_id ? Number(designData.requirement_id) : null, 
                design_status: newStatus 
            };
    
            // ตรวจสอบว่า designId ถูกต้องหรือไม่
            if (!designId) {
                Swal.fire("Error", "Design ID ไม่ถูกต้อง", "error");
                return;
            }
    
            console.log("📤 ส่งข้อมูลไป API:", updatedData);
    
            // อัปเดตข้อมูล
            await axios.put(`http://localhost:3001/design/${designId}`, updatedData);
    
            Swal.fire({ title: "อัปเดตสำเร็จ!", icon: "success", timer: 1500, showConfirmButton: false })
                .then(() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } }));
    
        } catch (error) {
            Swal.fire("Update Failed", error.response?.data?.message || "เกิดข้อผิดพลาดระหว่างการอัปเดต", "error");
            console.error("❌ Error during update:", error);
        }
    };
    
    // --- Helper: Update Design Metadata ---
    const updateDesignMetadata = async (statusToSend) => {
        if (!designId || !projectId) throw new Error("Missing ID for metadata update");
        try {
            await axios.put(`http://localhost:3001/design/${designId}`, {
                project_id: projectId, // Make sure backend expects/uses this
                diagram_name: designData.diagram_name,
                design_type: designData.design_type,
                diagram_type: designData.diagram_type,
                design_description: designData.design_description,
                // Send requirement_id as JSON string (adjust if backend expects array directly)
                 requirement_id: JSON.stringify(designData.requirement_id || []),
                design_status: statusToSend,
            });
             console.log("Design metadata updated successfully.");
             // Update initial data state to prevent "unsaved changes" warning after save
             setInitialDesignData(JSON.parse(JSON.stringify({...designData, design_status: statusToSend})));
        } catch (error) {
            console.error("Error updating design metadata:", error.response?.data || error.message);
            throw new Error("ไม่สามารถอัปเดตข้อมูลหลักของ Design ได้");
        }
    };

    // --- Helper: Upload New Files ---
    const uploadNewFiles = async () => {
         if (selectedFiles.length === 0 || !designId) return;
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append("files", file));
        formData.append("design_id", designId); // Ensure backend uses this ID

        try {
            await axios.post("http://localhost:3001/uploadDesignFiles", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            console.log("New files uploaded successfully.");
            setSelectedFiles([]); // Clear the selection
            setFilePreviews([]); // Clear previews
        } catch (error) {
            console.error("Error uploading new files:", error.response?.data || error.message);
            throw new Error("ไม่สามารถอัปโหลดไฟล์ใหม่ได้");
        }
    };

    // --- Form Input Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setDesignData(prevData => ({ ...prevData, [name]: value }));
    };

    const handleRequirementChange = (selectedOptions) => {
        setDesignData(prevData => ({
            ...prevData,
            requirement_id: selectedOptions ? selectedOptions.map(option => option.value) : [],
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        // Basic validation example (add more as needed)
        const validFiles = files.filter(file => file.size < 5 * 1024 * 1024); // Max 5MB example
        if (validFiles.length !== files.length) {
            Swal.fire("Warning", "มีบางไฟล์ขนาดใหญ่เกิน 5MB และจะไม่ถูกเพิ่ม", "warning");
        }

        setSelectedFiles(prev => [...prev, ...validFiles]);

        const newPreviews = validFiles.map(file => {
            if (file.type.startsWith('image/')) {
                return { url: URL.createObjectURL(file), type: 'image', name: file.name, size: file.size };
            }
            return { url: null, type: 'other', name: file.name, size: file.size }; // Placeholder for non-images
        });
        setFilePreviews(prev => [...prev, ...newPreviews]);
    };

    const handleRemoveSelectedFile = (indexToRemove) => {
        const previewToRemove = filePreviews[indexToRemove];
        if (previewToRemove?.type === 'image' && previewToRemove.url) {
            URL.revokeObjectURL(previewToRemove.url); // Free memory
        }
        setSelectedFiles(prev => prev.filter((_, i) => i !== indexToRemove));
        setFilePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    const handleDeleteFile = async (fileIdToDelete) => {
         if (!fileIdToDelete) {
             console.error("Attempted to delete file with undefined ID.");
             return;
         }
         const confirmResult = await Swal.fire({
            title: 'ต้องการลบไฟล์นี้?',
            text: "การดำเนินการนี้ไม่สามารถย้อนกลับได้!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก'
        });

        if (!confirmResult.isConfirmed) return;

        try {
            await axios.delete(`http://localhost:3001/design/file/${fileIdToDelete}`);
            setExistingFiles(prev => prev.filter(file => file.file_design_id !== fileIdToDelete));
            Swal.fire({ icon: "success", title: "ลบไฟล์สำเร็จ", timer: 1500, showConfirmButton: false });
        } catch (error) {
            console.error("Error deleting file:", error.response?.data || error.message);
            Swal.fire("Error", "เกิดข้อผิดพลาดในการลบไฟล์", "error");
        }
    };

    // --- Prepare data for React-Select ---
    const requirementOptions = baselineRequirements.map(req => ({
        value: req.requirement_id,
        label: `REQ-${String(req.requirement_id).padStart(3, '0')}: ${req.requirement_name}`, // Improved formatting
    }));
    const selectedRequirementValues = requirementOptions.filter(option =>
        Array.isArray(designData.requirement_id) && designData.requirement_id.includes(option.value)
    );

    // --- Render Logic ---
    return (
        <div className="update-design-container">
            <h1 className="update-design-title">Update Design (ID: {designId})</h1>

            {loading ? (
                <div className="loading-indicator">Loading...</div> // Simple loading text
            ) : !initialDesignData ? (
                 // Display when design fetch failed or ID was invalid leading to no data
                 <div className="error-container">
                    <p>ไม่สามารถโหลดข้อมูล Design ได้ หรือ Design ID ไม่ถูกต้อง</p>
                    <button onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } })}>
                        กลับหน้า Dashboard
                    </button>
                 </div>
            ) : (
                 // --- Main Form ---
                <form className="update-design-form" onSubmit={handleUpdate} noValidate>
                    {/* Metadata Fields */}
                     <fieldset>
                       <legend>Design Details</legend>
                        <label className="update-design-label">
                            Diagram Name: <span className="required-star">*</span>
                            <input /* ... props ... */ className="update-design-input" type="text" name="diagram_name" value={designData.diagram_name} onChange={handleChange} required />
                        </label>
                        <label className="update-design-label">
                            Design Type: <span className="required-star">*</span>
                            <select /* ... props ... */ className="update-design-select" name="design_type" value={designData.design_type} onChange={handleChange} required>
                                <option value="" disabled>Select...</option>
                                <option value="High-Level Design">High-Level Design</option>
                                <option value="Low-Level Design">Low-Level Design</option>
                            </select>
                        </label>
                         <label className="update-design-label">
                            Diagram Type: <span className="required-star">*</span>
                            <select /* ... props ... */ className="update-design-select" name="diagram_type" value={designData.diagram_type} onChange={handleChange} required >
                               <option value="" disabled>Select...</option>
                               <option value="Prototype">Prototype</option>
                               <option value="Flow Chart">Flow Chart</option>
                               <option value="ER Diagram">ER Diagram</option>
                               <option value="Pseudo Code">Pseudo Code</option>
                               <option value="Use Case Diagram">Use Case Diagram</option>
                               <option value="Sequence Diagram">Sequence Diagram</option>
                               <option value="Other">Other</option>
                           </select>
                       </label>
                       <label className="update-design-label">
                           Requirements: <span className="required-star">*</span>
                           <Select
                               isMulti options={requirementOptions} value={selectedRequirementValues}
                               onChange={handleRequirementChange} classNamePrefix="react-select"
                               placeholder="Select linked requirements..."
                               noOptionsMessage={() => 'No baseline requirements found'}
                           />
                       </label>
                       <label className="update-design-label">
                           Design Description: <span className="required-star">*</span>
                           <textarea /* ... props ... */ className="update-design-textarea" name="design_description" value={designData.design_description} onChange={handleChange} required rows={5}/>
                       </label>
                   </fieldset>


                    {/* File Management Section */}
                    <fieldset>
                        <legend>Attached Files</legend>
                        {/* Existing Files */}
                        <div className="existing-files-section">
                            <h3>Existing Files:</h3>
                            {existingFiles.length > 0 ? (
                                <ul className="file-list existing-files-list">
                                    {existingFiles.map((file) => (
                                        <li key={file.file_design_id} className="file-item">
                                            <img src={file.file_design_data} alt={file.file_design_name || `File ${file.file_design_id}`} className="file-thumbnail" onError={(e) => e.target.style.display='none'} /* Hide broken img */ />
                                            <span className="file-name">{file.file_design_name || `File ID: ${file.file_design_id}`}</span>
                                            <button type="button" className="delete-file-btn" onClick={() => handleDeleteFile(file.file_design_id)} title="Delete this file">❌</button>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>No existing files.</p>}
                        </div>
                         {/* Upload New Files */}
                         <label className="update-design-label update-design-label-file"> Add New Files:
                            <input className="update-design-input-file" type="file" multiple onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
                         </label>
                         {/* Preview New Files */}
                        {selectedFiles.length > 0 && (
                             <div className="selected-files-section">
                                <h4>Files Queued for Upload:</h4>
                                <ul className="file-list selected-files-list">
                                    {filePreviews.map((preview, index) => (
                                        <li key={index} className="file-item">
                                             {preview.type === 'image' && preview.url ? <img src={preview.url} alt={`Preview ${preview.name}`} className="file-thumbnail"/> : <span className="file-icon">📄</span>}
                                             <span className="file-name">{preview.name} ({(preview.size / 1024).toFixed(1)} KB)</span>
                                            <button type="button" className="remove-selected-btn" onClick={() => handleRemoveSelectedFile(index)} title="Remove from upload queue">❌</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </fieldset>

                    {/* Diagram Editor Section */}
                     <fieldset>
     <legend>Diagram Editor</legend>
     {diagramElements === null ? (
         <p>Loading diagram...</p>
     ) : diagramElements === 'error' ? (
         <p style={{color: 'red'}}>Could not load diagram data.</p>
     ) : (
        <CreateDiagram
        ref={diagramRef}
        designId={designId}
        initialElements={diagramElements} // ส่งข้อมูล Diagram ที่ดึงมา
    />
     )}
 </fieldset>

                    {/* Action Buttons */}
                    <div className="update-design-buttons">
                        <button type="button" className="update-design-btn-cancel" onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } })}>
                            Cancel
                        </button>
                        <button type="submit" className="update-design-btn" disabled={loading}>
                            {loading ? 'Saving...' : 'Update Design'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default UpdateDesign;