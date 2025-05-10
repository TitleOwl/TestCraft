import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// import Swal from "sweetalert2"; // <--- ลบออก
import { toast, ToastContainer } from 'react-toastify'; // <--- เพิ่ม import toast และ ToastContainer
import 'react-toastify/dist/ReactToastify.css';   // <--- เพิ่ม import CSS ของ toastify
import Select from "react-select";

// Import CSS
import "./CSS/CreateDesign.css"; // <-- ตรวจสอบว่า import CSS ถูกต้อง

// Import icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheckCircle,
    faTimes,
    faExclamationTriangle,
    faSpinner,
    faPaperclip,
    faPencilRuler
} from '@fortawesome/free-solid-svg-icons';

import CreateDiagram from "./CreateDiagram";

const CreateDesign = () => {
    // --- state (เหมือนเดิม) ---
    const [baselineRequirements, setbaselineRequirements] = useState([]);
    const [designStatement, setDesignStatement] = useState("");
    const [designType, setDesignType] = useState("");
    const [diagramType, setDiagramType] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedRequirementsId, setRequirementsId] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [showAlert, setShowAlert] = useState(false);       // <-- Custom alert state (คงไว้)
    const [alertType, setAlertType] = useState("success");   // <-- Custom alert state (คงไว้)
    const [alertMessage, setAlertMessage] = useState("");    // <-- Custom alert state (คงไว้)
    const [showDiagram, setShowDiagram] = useState(false);

    const diagramRef = useRef(null);
    const diagramSectionRef = useRef(null);
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(window.location.search);
    const projectId = queryParams.get("project_id");

    // --- functions (เหมือนเดิม ยกเว้น handleSubmit) ---

    // --- fetchRequirements ---
    const fetchRequirements = useCallback(async () => {
        if (!projectId) return;
        setError("");
        try {
            const response = await axios.get(`http://localhost:3001/project/${projectId}/requirement`, { params: { status: "BASELINE" } });
            const baseline = response.data.filter((req) => req.requirement_status === "BASELINE");
            setbaselineRequirements(baseline);
        } catch (error) {
            console.error("Error fetching requirements:", error);
            setError("Failed to load requirements.");
        }
    }, [projectId]);

    useEffect(() => {
        fetchRequirements();
    }, [fetchRequirements]);

    // --- uploadFiles ---
    const uploadFiles = async (design_id) => {
        if (selectedFiles.length === 0) return [];
        const formData = new FormData();
        selectedFiles.forEach((file) => { formData.append("files", file, file.name); });
        formData.append("project_id", projectId);
        formData.append("design_id", design_id);
        try {
            const response = await axios.post("http://localhost:3001/uploadDesignFiles", formData, { headers: { "Content-Type": "multipart/form-data" }, });
            if (response.status === 200) { return response.data.files; }
            else { throw new Error(response.data?.message || 'File upload failed'); }
        } catch (error) {
            console.error("Error uploading files:", error);
            throw new Error(error.response?.data?.message || error.message || "Error uploading files.");
        }
    };

    // --- handleFileChange ---
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
        const filePreviews = files.map((file) => ({ name: file.name, type: file.type }));
        setUploadedFiles((prevPreviews) => [...prevPreviews, ...filePreviews]);
    };

    // --- Function to toggle Diagram visibility ---
    const handleToggleDiagram = () => {
        setShowDiagram(!showDiagram);
    };

    // --- handleSubmit ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!designStatement || !designType || !diagramType || !description || selectedRequirementsId.length === 0) {
            const errorMessage = "Please fill in all required fields and select at least one requirement.";
            setError(errorMessage);
            toast.warn('กรุณากรอกข้อมูล Design ให้ครบถ้วน และเลือก Requirement อย่างน้อย 1 รายการ');
            return;
        }
        setLoading(true);
        setError("");
        let createdDesignId = null;
        try {
            // 1. Create Design Metadata
            const newDesign = {
                diagram_name: designStatement, design_type: designType, diagram_type: diagramType,
                design_description: description, project_id: projectId, design_status: "WORKING",
                requirement_id: selectedRequirementsId,
            };
            const designResponse = await axios.post("http://localhost:3001/design", newDesign);
            if (designResponse.status !== 201) throw new Error(designResponse.data?.message || "Failed to create design metadata.");
            createdDesignId = designResponse.data.design_id;
            if (!createdDesignId) throw new Error("Design ID not returned.");

            // 2. Save Diagram via ref (if shown)
            let diagramSaveSuccess = true;
            if (showDiagram && diagramRef.current && typeof diagramRef.current.saveDiagram === 'function') {
                diagramSaveSuccess = await diagramRef.current.saveDiagram(createdDesignId);
                if (!diagramSaveSuccess) console.error("⚠️ Metadata created, but failed auto-save diagram.");
            } else if (showDiagram) {
                console.warn("⚠️ Diagram component ref/method not available, but diagram was shown.");
            }

            // 3. Save History
            for (const reqId of selectedRequirementsId) {
                const historyData = {
                    design_id: createdDesignId, requirement_id: reqId, design_type: newDesign.design_type,
                    diagram_name: newDesign.diagram_name, diagram_type: newDesign.diagram_type,
                    design_description: newDesign.design_description, design_status: "WORKING"
                };
                try {
                    const historyResponse = await axios.post("http://localhost:3001/addHistoryDesign", historyData);
                    if (historyResponse.status !== 201) console.error(`⚠️ History failed for Req ${reqId}. Status: ${historyResponse.status}`, historyResponse.data);
                } catch (historyError) { console.error(`❌ History error for Req ${reqId}`, historyError.response?.data || historyError.message); }
            }

            // 4. Upload Files
            if (selectedFiles.length > 0) { await uploadFiles(createdDesignId); }

            // 5. Success Notification and Redirect based on diagram save status
            if (diagramSaveSuccess) {
                toast.success("Design created successfully.");
                // Reset form fields here
                setDesignStatement('');
                setDesignType('');
                setDiagramType('');
                setDescription('');
                setRequirementsId([]); // Reset the selected requirements
                setSelectedFiles([]);     // Reset the selected files
                setUploadedFiles([]);   // Reset the displayed uploaded files
                setError('');         // Clear any previous errors
                setShowDiagram(false); // Optionally hide the diagram editor
            } else {
                const partialSuccessMsg = 'Design metadata created, but failed to save the diagram. Please try editing the design to save the diagram again.';
                toast.warn(partialSuccessMsg, {

                     // สามารถกำหนด autoClose เพิ่มเติมได้ถ้าต้องการ
                });
                setError("Failed to save diagram content.");
                // --- ลบ navigate เดิมออกจากตรงนี้ ---
                // navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } });
            }

        } catch (error) {
            console.error("❌ Error during design creation:", error);
            const creationErrorMsg = `Creation Failed: ${error.message || 'An unexpected error occurred.'}`;
            toast.error(creationErrorMsg); // Error toast ปกติไม่ต้อง navigate ต่อ
            setError(error.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };


    // --- JSX Rendering ---
    return (
        <div className="create-design-container">
             {/* ควรมี ToastContainer เพียงที่เดียวใน App */}
             {/* <ToastContainer /> */}
            <h1 className="create-design-header">Create Software Design</h1>
            {error && <p className="create-design-error"><FontAwesomeIcon icon={faExclamationTriangle}/> {error}</p>}


            <div className="create-design-layout">
                <div className="create-design-form-container">
                    <form className="create-design-form" onSubmit={handleSubmit}>
                        {/* Diagram Name */}
                        <div className="create-design-form-group">
                            <label htmlFor="designStatement">
                                Diagram Name <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input type="text" id="designStatement" value={designStatement} onChange={(e) => setDesignStatement(e.target.value)} placeholder="Enter Diagram Name" required className="create-design-input"/>
                        </div>

                        {/* Requirement ID Selection */}
                        <div className="create-design-form-groups">
                            <label htmlFor="requirementId">
                                Select Requirement Specification <span style={{ color: 'red' }}>*</span>
                            </label>
                            <Select
                                isMulti
                                options={baselineRequirements.map((req) => ({ value: req.requirement_id, label: `REQ-${String(req.requirement_id).padStart(3, '0')}: ${req.requirement_name}` }))}
                                value={baselineRequirements.filter(req => selectedRequirementsId.includes(req.requirement_id)).map(req => ({ value: req.requirement_id, label: `REQ-${String(req.requirement_id).padStart(3, '0')}: ${req.requirement_name}` }))}
                                onChange={(selectedOptions) => setRequirementsId(selectedOptions ? selectedOptions.map((option) => option.value) : [])}
                                placeholder="Select Related Baseline Requirement Specification..."
                                className="create-design-select-files"
                                classNamePrefix="react-select"
                                isLoading={loading && baselineRequirements.length === 0}
                                isDisabled={loading}
                            />
                        </div>
                        {/* Design Type */}
                        <div className="create-design-form-group">
                            <label htmlFor="designType">
                                Design Type <span style={{ color: 'red' }}>*</span>
                            </label>
                            <select id="designType" value={designType} onChange={(e) => setDesignType(e.target.value)} required className="create-design-select">
                                <option value="" disabled>Select Design Type</option>
                                <option value="High-Level Design">High-Level Design</option>
                                <option value="Low-Level Design">Low-Level Design</option>
                            </select>
                        </div>

                        {/* Diagram Type */}
                        <div className="create-design-form-group">
                            <label htmlFor="diagramType">
                                Diagram Type <span style={{ color: 'red' }}>*</span>
                            </label>
                            <select id="diagramType" value={diagramType} onChange={(e) => setDiagramType(e.target.value)} required className="create-design-select">
                                <option value="" disabled>Select Diagram Type</option>
                                <option value="Prototype">Prototype</option>
                                <option value="Flow Chart">Flow Chart</option>
                                <option value="ER Diagram">ER Diagram</option>
                                <option value="Pseudo Code">Pseudo Code</option>
                            </select>
                        </div>


                        {/* Add or Draw Diagram Section */}
                        <div className="create-design-form-group">
                            {/* Add or Draw Diagram is not strictly required if one of the methods is used, so no asterisk */}
                            <label>Add or Draw Diagram</label>
                            <input
                                type="file"
                                id="designFiles"
                                multiple
                                accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                                onChange={handleFileChange}
                                className="create-design-file-input"
                                disabled={loading || showDiagram}
                                style={{ display: 'none' }}
                                aria-hidden="true"
                            />
                            <div className="create-design-action-buttons-inline">
                                <label htmlFor="designFiles" className={`create-design-btn-attach ${showDiagram || loading ? 'disabled' : ''}`}>
                                    <FontAwesomeIcon icon={faPaperclip} /> Choose Files...
                                </label>
                                <button
                                    type="button"
                                    className="create-design-btn-draw"
                                    onClick={handleToggleDiagram}
                                    disabled={loading}
                                >
                                    <FontAwesomeIcon icon={faPencilRuler} /> {showDiagram ? "Hide Diagram" : "Draw Diagram"}
                                </button>
                            </div>
                            {uploadedFiles.length > 0 && !showDiagram && (
                                <div className="file-preview-list">
                                    {uploadedFiles.map((file, index) => (
                                        <p key={index} className="file-preview-item">
                                            <FontAwesomeIcon icon={faPaperclip} className="file-preview-icon" />
                                            {file.name}
                                            <span className="file-preview-type"> ({file.type || 'unknown'})</span>
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="create-design-form-group">
                            <label htmlFor="description">
                                Description <span style={{ color: 'red' }}>*</span>
                            </label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" rows="4" required className="create-design-textarea"></textarea>
                        </div>

                        {/* Buttons */}
                        <div className="create-design-form-buttons">
                            <button type="button" className="create-design-btn-back" onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } })} disabled={loading}>
                                Back to Designs
                            </button>
                            <button type="submit" className="create-design-btn-primary" disabled={loading}>
                                {loading ? (<><FontAwesomeIcon icon={faSpinner} spin /> Creating...</>) : ("Create Design")}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Diagram Editor Container */}
                {showDiagram && (
                    <div className="create-design-diagram-container" ref={diagramSectionRef}>
                         {/* Section title, not a required input label */}
                         <h2>Diagram Editor</h2>
                         <div className="diagram-editor-content">
                             <CreateDiagram
                                 ref={diagramRef}
                                 isDisabled={loading}
                             />
                         </div>
                     </div>
                )}

            </div>

            {/* Custom Alert Notification */}
            <div className={`create-design-alert ${showAlert ? 'show' : ''}`}>
                <div className={`create-design-alert-${alertType}`}>
                    <div className="create-design-alert-content">
                        <div className="create-design-alert-icon">
                            {alertType === 'success' && <FontAwesomeIcon icon={faCheckCircle} />}
                            {alertType === 'error' && <FontAwesomeIcon icon={faTimes} />}
                            {alertType === 'warning' && <FontAwesomeIcon icon={faExclamationTriangle} />}
                        </div>
                        <div className="create-design-alert-message"> {alertMessage} </div>
                    </div>
                    <button className="create-design-alert-close" onClick={() => setShowAlert(false)}> <FontAwesomeIcon icon={faTimes} /> </button>
                </div>
                <div className="create-design-alert-progress"></div>
            </div>

        </div>
    );
};

export default CreateDesign;