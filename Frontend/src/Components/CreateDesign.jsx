import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import "./CSS/CreateDesign.css"; // <<< ตรวจสอบไฟล์นี้ให้ดีเรื่องการซ่อน Input
import CreateDiagram from "./CreateDiagram";

const CreateDesign = () => {
  // --- state ---
  const [baselineRequirements, setbaselineRequirements] = useState([]);
  const [designStatement, setDesignStatement] = useState("");
  const [designType, setDesignType] = useState("");
  const [diagramType, setDiagramType] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRequirementsId, setRequirementsId] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]); // ไฟล์ที่เลือก รอ Upload
  const [uploadedFiles, setUploadedFiles] = useState([]); // ใช้แสดง Preview ชื่อไฟล์ที่เลือก

  const diagramRef = useRef(null);
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");

  // --- fetchRequirements ---
  const fetchRequirements = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`http://localhost:3001/project/${projectId}/requirement`, { params: { status: "BASELINE" } });
      const baseline = response.data.filter((req) => req.requirement_status === "BASELINE");
      setbaselineRequirements(baseline);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      setError("Failed to load requirements.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  // --- uploadFiles (จะถูกเรียกตอน Submit) ---
  const uploadFiles = async (design_id) => {
    if (selectedFiles.length === 0) return [];

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file, file.name); // ส่งเป็น Array ชื่อ 'files'
    });
    formData.append("project_id", projectId);
    formData.append("design_id", design_id);

    try {
      const response = await axios.post("http://localhost:3001/uploadDesignFiles", formData, { // Endpoint สำหรับ Upload หลายไฟล์
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        console.log("Files uploaded successfully:", response.data.files);
        return response.data.files;
      } else {
        throw new Error(response.data?.message || 'File upload failed with status ' + response.status);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      throw new Error(error.response?.data?.message || error.message || "Error uploading files.");
    }
  };

  // --- handleFileChange (สำหรับ Input เดิม) ---
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    // เก็บ File object จริงๆ ไว้เพื่อรอ Upload
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
    // สร้างข้อมูลสำหรับ Preview ชื่อไฟล์
    const filePreviews = files.map((file) => ({ name: file.name, type: file.type }));
    setUploadedFiles((prevPreviews) => [...prevPreviews, ...filePreviews]); // ใช้ชื่อ uploadedFiles แต่เก็บแค่ Preview
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- การตรวจสอบ Input (เหมือนเดิม) ---
    if (!designStatement || !designType || !diagramType || !description || selectedRequirementsId.length === 0) {
        setError("Please fill in all required fields and select at least one requirement.");
        // อาจจะใช้ Swal.fire แทนถ้าต้องการ
        Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูล Design ให้ครบถ้วน และเลือก Requirement อย่างน้อย 1 รายการ', 'warning');
        return;
    }

    setLoading(true);
    setError("");
    let createdDesignId = null; // เก็บ ID ของ Design ที่สร้าง

    try {
        // 1. สร้าง Design Metadata (เหมือนเดิม)
        const newDesign = {
            diagram_name: designStatement,
            design_type: designType,
            diagram_type: diagramType,
            design_description: description,
            project_id: projectId,
            design_status: "WORKING", // สถานะเริ่มต้น
            requirement_id: selectedRequirementsId, // ส่งเป็น Array ไปยัง /design
        };
        console.log("Sending design metadata:", newDesign);
        const designResponse = await axios.post("http://localhost:3001/design", newDesign);
        if (designResponse.status !== 201) { // ตรวจสอบ 201 Created
            throw new Error(designResponse.data?.message || "Failed to create design metadata.");
        }
        createdDesignId = designResponse.data.design_id; // รับ ID กลับมา
        if (!createdDesignId) {
             throw new Error("Design ID was not returned from the server after creation.");
        }
        console.log("✅ Design metadata created successfully:", createdDesignId);


        // 2. สั่งบันทึก Diagram ผ่าน ref (เหมือนเดิม)
        if (diagramRef.current && typeof diagramRef.current.saveDiagram === 'function') {
            console.log(`Triggering diagram save for design ID: ${createdDesignId}`);
            const diagramSaveSuccess = await diagramRef.current.saveDiagram(createdDesignId);
            if (!diagramSaveSuccess) {
                // ไม่ควรหยุด process ทั้งหมด แต่ควร log error ไว้
                 console.error("⚠️ Created design metadata, but failed to save the diagram data automatically.");
                 // อาจจะโยน Error ถ้าการบันทึก diagram สำคัญมาก หรือแค่ log ไว้
                 // throw new Error("Failed to save diagram data.");
            } else {
                console.log("✅ Diagram data presumed saved successfully via ref.");
            }
        } else {
            console.warn("⚠️ Diagram component reference or saveDiagram method not available.");
        }


        // --- *** จุดที่แก้ไข: บันทึก History (Loop ตาม Requirement ID) *** ---
        // 3. บันทึก History (สำหรับ Design ที่สร้าง และ Requirement แต่ละตัวที่เชื่อมโยง)
        console.log("Starting history creation loop for design...");
        for (const reqId of selectedRequirementsId) {
            // 3.1 สร้างข้อมูลสำหรับ History แต่ละรายการ
             const historyData = {
                design_id: createdDesignId,         // ID ของ Design ที่เพิ่งสร้าง
                requirement_id: reqId,              // ID ของ Requirement ปัจจุบันใน Loop
                design_type: newDesign.design_type, // ดึงจาก newDesign
                diagram_name: newDesign.diagram_name,// ดึงจาก newDesign
                diagram_type: newDesign.diagram_type,// ดึงจาก newDesign
                design_description: newDesign.design_description, // ดึงจาก newDesign
                design_status: "WORKING"            // สถานะเริ่มต้น
            };

            console.log(`📜 Sending history data for Design ID ${createdDesignId} / Req ID ${reqId}:`, historyData);

            try {
                 // 3.2 ส่งข้อมูลไปยัง /addHistoryDesign
                const historyResponse = await axios.post("http://localhost:3001/addHistoryDesign", historyData);

                if (historyResponse.status !== 201) { // ตรวจสอบ 201 Created
                    console.error(`⚠️ Failed to add history for Design ID ${createdDesignId} / Req ID ${reqId}. Status: ${historyResponse.status}`, historyResponse.data);
                    // ไม่ควรหยุด process อาจจะแค่ log หรือแจ้งเตือนเบาๆ
                } else {
                     console.log(`✅ History added successfully for Design ID ${createdDesignId} / Req ID ${reqId}`);
                }
            } catch (historyError) {
                console.error(`❌ Error sending history for Design ID ${createdDesignId} / Req ID ${reqId}`, historyError.response?.data || historyError.message);
                // จัดการ error ของ history item นี้
            }
        } // --- จบ Loop ---
        console.log("Finished history creation loop.");


        // 4. อัปโหลดไฟล์ (เหมือนเดิม)
        if (selectedFiles.length > 0) {
            console.log("Starting file upload...");
            await uploadFiles(createdDesignId); // <<<< เรียก Upload ตรงนี้
            console.log("✅ File upload process finished.");
        }


        // 5. แสดงผลสำเร็จ และ นำทางกลับ (เหมือนเดิม)
        Swal.fire({
            icon: "success",
            title: "Design Created!",
            text: "Design, diagram, and related information saved successfully.",
            showConfirmButton: false,
            timer: 2000, // เพิ่มเวลาเล็กน้อย
        }).then(() => {
            navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } });
        });

    } catch (error) {
        // --- จัดการ Error หลัก --- (เหมือนเดิม)
        console.error("❌ Error during design creation process:", error);
        // แสดง Error ให้ผู้ใช้ทราบ
         Swal.fire({
             icon: 'error',
             title: 'Creation Failed',
             text: error.message || 'An unexpected error occurred. Please try again.',
         });
        setError(error.message || "Something went wrong during the creation process.")

    } finally {
        setLoading(false); // หยุด Loading เสมอ
    }
};

  // --- ส่วน JSX ---
  return (
    <div className="create-design-container">
      <h1 className="create-design-header">Create Software Design</h1>
      {loading && <p className="loading-message">Loading...</p>}
      {error && <p className="create-design-error">{error}</p>}

      <form className="create-design-form" onSubmit={handleSubmit}>
        {/* --- Form Inputs (เหมือนเดิม) --- */}
        <div className="create-design-form-group">
          <label htmlFor="designStatement">Diagram Name:</label>
          <input type="text" id="designStatement" value={designStatement} onChange={(e) => setDesignStatement(e.target.value)} placeholder="Enter Diagram Name" required className="create-design-input" />
        </div>
        <div className="create-design-form-group">
          <label htmlFor="designType">Design Type:</label>
          <select id="designType" value={designType} onChange={(e) => setDesignType(e.target.value)} required className="create-design-select">
            <option value="" disabled>Select Design Type</option>
            <option value="High-Level Design">High-Level Design</option>
            <option value="Low-Level Design">Low-Level Design</option>
          </select>
        </div>
        <div className="create-design-form-group">
          <label htmlFor="diagramType">Diagram Type:</label>
          <select id="diagramType" value={diagramType} onChange={(e) => setDiagramType(e.target.value)} required className="create-design-select">
            <option value="" disabled>Select Diagram Type</option>
            <option value="Prototype">Prototype</option>
            <option value="Flow Chart">Flow Chart</option>
            <option value="ER Diagram">ER Diagram</option>
            <option value="Pseudo Code">Pseudo Code</option>
          </select>
        </div>
        <div className="create-design-form-group">
          <label htmlFor="requirementId">Requirement ID:</label>
          <Select
            isMulti
            options={baselineRequirements.map((req) => ({ value: req.requirement_id, label: `REQ-00${req.requirement_id}: ${req.requirement_name}` }))}
            onChange={(selectedOptions) => setRequirementsId(selectedOptions ? selectedOptions.map((option) => option.value) : [])}
            className="create-design-react-select"
            classNamePrefix="react-select"
          />
        </div>

        {/* --- File Upload Section (โครงสร้างเดิม) --- */}
        <div className="uploaded-files-container create-design-form-group">
          <h3>Attach Files</h3>
          {/* Input ที่ควรจะแสดง */}
          <input
            type="file"
            multiple // อนุญาตเลือกหลายไฟล์
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            className="create-design-file-input" // <<< CSS อาจจะซ่อน Class นี้อยู่
          />
          {/* ส่วนแสดงชื่อไฟล์ที่เลือกแล้ว (เป็น Preview) */}
          {uploadedFiles.length > 0 && (
            <div className="file-preview-list">
              {uploadedFiles.map((file, index) => (
                <p key={index} className="file-preview-item">
                  {file.name} ({file.type})
                </p>
              ))}
            </div>
          )}
        </div>

        {/* --- Description (เหมือนเดิม) --- */}
        <div className="create-design-form-group">
          <label htmlFor="description">Description:</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" rows="4" required className="create-design-textarea"></textarea>
        </div>

        {/* --- Buttons (เหมือนเดิม) --- */}
        <div className="create-design-buttons">
          <button type="button" className="create-design-btn-cancel" onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } })}>Cancel</button>
          <button type="submit" className="create-design-btn-next" disabled={loading}> {loading ? 'Creating...' : 'Create'} </button>
        </div>
      </form>

      {/* --- ส่วนแสดง Excalidraw --- */}
      <div className="diagram-editor-section">
        <h2>Diagram Editor</h2>
        <CreateDiagram ref={diagramRef} />
      </div>
    </div>
  );
};

export default CreateDesign;