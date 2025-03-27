import React, { useState, useEffect, useCallback, useRef } from "react"; // --- เพิ่ม useRef ---
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import "./CSS/CreateDesign.css";
import CreateDiagram from "./CreateDiagram"; // Import component ลูก

const CreateDesign = () => {
  // --- state เดิมทั้งหมด ---
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

  // --- สร้าง ref สำหรับ CreateDiagram ---
  const diagramRef = useRef(null);

  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");

  // --- fetchRequirements, uploadFiles, handleFileChange (เหมือนเดิม) ---
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

  const uploadFiles = async (design_id) => {
    if (selectedFiles.length === 0) return []; // ไม่คืนค่าอะไรถ้าไม่มีไฟล์

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file, file.name);
    });
    formData.append("project_id", projectId);
    formData.append("design_id", design_id);

    try {
      const response = await axios.post("http://localhost:3001/uploadDesignFiles", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        console.log("Files uploaded successfully:", response.data.files);
        return response.data.files; // คืนข้อมูลไฟล์ที่อัปโหลดแล้ว
      } else {
        // ถ้า Backend ตอบ status อื่นที่ไม่ใช่ 200 อาจจะถือเป็น Error
        throw new Error(response.data?.message || 'File upload failed with status ' + response.status);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      // ส่งต่อ Error เพื่อให้ handleSubmit หยุดทำงานได้
      throw new Error(error.response?.data?.message || error.message || "Error uploading files.");
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
    const filePreviews = files.map((file) => ({ name: file.name, type: file.type }));
    setUploadedFiles((prevFiles) => [...prevFiles, ...filePreviews]);
  };

  // --- แก้ไข handleSubmit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!designStatement || !designType || !diagramType || !description || selectedRequirementsId.length === 0) {
      setError("Please fill in all required fields and select at least one requirement.");
      return;
    }
    setLoading(true);
    setError("");
    let createdDesignId = null;

    try {
      // 1. สร้าง Design Metadata
      const newDesign = {
        diagram_name: designStatement,
        design_type: designType,
        diagram_type: diagramType,
        design_description: description,
        project_id: projectId,
        design_status: "WORKING",
        // ตรวจสอบ Backend Endpoint /design ว่ารับ requirement_id เป็น Array หรือ JSON String
        // ถ้าเป็น JSON String ให้ใช้ JSON.stringify()
        requirement_id: JSON.stringify(selectedRequirementsId), // --- ส่งเป็น JSON String ตามโค้ด Backend ที่ให้มา ---
      };
      const designResponse = await axios.post("http://localhost:3001/design", newDesign);
      if (designResponse.status !== 201) {
        const errorMsg = designResponse.data?.message || "Failed to create design metadata.";
        throw new Error(errorMsg);
      }
      createdDesignId = designResponse.data.design_id;
      console.log("Design metadata created successfully:", createdDesignId);

      // 2. สั่งบันทึก Diagram ผ่าน ref
      if (diagramRef.current) {
        console.log("Triggering diagram save for design ID:", createdDesignId);
        // เรียกฟังก์ชันที่ expose ผ่าน ref และรอผลลัพธ์
        const diagramSaveSuccess = await diagramRef.current.triggerSave(createdDesignId);

        if (!diagramSaveSuccess) {
          // ถ้าบันทึก Diagram ไม่สำเร็จ ให้แจ้งเตือนและหยุดการทำงานส่วนที่เหลือ
          // อาจจะต้องพิจารณาว่าควรลบ Design ที่เพิ่งสร้างไปหรือไม่ (ซับซ้อน)
          throw new Error("Created design metadata, but failed to save the diagram data automatically. Please try editing the design later.");
        }
        console.log("Diagram data saved successfully for design ID:", createdDesignId);
      } else {
        console.warn("Diagram component reference not available to trigger save.");
        // อาจจะแจ้งเตือนว่า Diagram ไม่ได้บันทึก แต่ให้ดำเนินการต่อ
        // หรือจะ throw Error ก็ได้ ขึ้นอยู่กับว่าต้องการให้ Flow เป็นอย่างไร
        // throw new Error("Diagram component not ready. Design metadata created, but diagram not saved.");
      }

      // 3. บันทึก History (ถ้า Diagram บันทึกสำเร็จ หรือถ้าไม่สนใจผล Diagram)
      try {
        await axios.post("http://localhost:3001/addHistoryDesign", {
          design_id: createdDesignId,
          design_status: "WORKING",
        });
        console.log("Design history added successfully.");
      } catch (historyError) {
        console.error("Error adding design history:", historyError);
        // อาจจะแค่ Log ไว้
      }

      // 4. อัปโหลดไฟล์ (ถ้ามี และถ้า Diagram บันทึกสำเร็จ หรือถ้าไม่สนใจผล Diagram)
      if (selectedFiles.length > 0) {
        console.log("Starting file upload...");
        await uploadFiles(createdDesignId); // รอให้ Upload เสร็จ
        console.log("File upload process finished.");
      }

      // 5. แสดงผลสำเร็จ และ นำทางกลับ
      Swal.fire({
        icon: "success",
        title: "Design and Diagram created successfully!", // แก้ข้อความ
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } });
      });

    } catch (error) {
      // แสดง Error ที่เกิดขึ้นทั้งหมด
      console.error("Error during design creation process:", error);
      setError(error.message || "Something went wrong during the creation process.");
      // ไม่ต้องทำอะไรกับ createdDesignId ที่นี่ เว้นแต่จะมี Logic การ Rollback
    } finally {
      setLoading(false);
    }
  };

  // --- ส่วน JSX (เหมือนเดิม เพิ่ม ref) ---
  return (
    <div className="create-design-container">
      <h1 className="create-design-header">Create Software Design</h1>
      {/* ... loading, error messages ... */}
      {loading && <p className="loading-message">Loading...</p>}
      {error && <p className="create-design-error">{error}</p>}

      <form className="create-design-form" onSubmit={handleSubmit}>
        {/* ... ฟอร์ม Input ต่างๆ เหมือนเดิม ... */}
        <div className="create-design-form-group">
          <label htmlFor="designStatement">Diagram Name:</label>
          <input type="text" id="designStatement" value={designStatement} onChange={(e) => setDesignStatement(e.target.value)} placeholder="Enter Diagram Name" required className="create-design-input" />
        </div>
        {/* ... Design Type, Diagram Type ... */}
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

        {/* ... Requirement Select ... */}
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
        {/* ... File Upload ... */}
        <div className="uploaded-files-container create-design-form-group">
          <h3>Attach Files (Optional)</h3>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileChange} className="create-design-file-input" />
          {uploadedFiles.length > 0 && (<div className="file-preview-list"> {uploadedFiles.map((file, index) => <p key={index} className="file-preview-item">{file.name} ({file.type})</p>)} </div>)}
        </div>
        {/* ... Description ... */}
        <div className="create-design-form-group">
          <label htmlFor="description">Description:</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" rows="4" required className="create-design-textarea"></textarea>
        </div>

        {/* ... Buttons ... */}
        <div className="create-design-buttons">
          <button type="button" className="create-design-btn-cancel" onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } })}>Cancel</button>
          <button type="submit" className="create-design-btn-next" disabled={loading}> {loading ? 'Creating...' : 'Create'} </button>
        </div>
      </form>

      {/* --- ส่วนแสดง Excalidraw --- */}
      <div className="diagram-editor-section">
        <h2>Diagram Editor</h2>
        {/* --- ส่ง ref ให้ CreateDiagram --- */}
        <CreateDiagram ref={diagramRef} />
      </div>
    </div>
  );
};

export default CreateDesign;