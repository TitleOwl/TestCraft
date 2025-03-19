import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import "./CSS/CreateDesign.css";

const CreateDesign = () => {
  const [baselineRequirements, setbaselineRequirements] = useState([]);
  const [designStatement, setDesignStatement] = useState("");
  const [designType, setDesignType] = useState("");
  const [diagramType, setDiagramType] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRequirementsId, setRequirementsId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [draftFiles, setDraftFiles] = useState([]); // เก็บไฟล์ที่ถูกอัปโหลดแบบ Draft
  const [previewImages, setPreviewImages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");
  
  // Fetch Requirements
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
    if (selectedFiles.length === 0) return [];

    const formData = new FormData();
    selectedFiles.forEach((file) => {
        formData.append("files", file, file.name);
    });
    formData.append("project_id", projectId);
    formData.append("design_id", design_id); // ส่ง design_id ไปด้วย

    try {
        const response = await axios.post("http://localhost:3001/uploadDesignFiles", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.status === 200) {
            console.log("Files uploaded successfully:", response.data.files);
            return response.data.files;
        }
    } catch (error) {
        console.error("Error uploading files:", error);
        setError("Error uploading files.");
    }
    return [];
};
  
    // Handle File Change (แสดงแบบ Draft)
    const handleFileChange = (e) => {
      const files = Array.from(e.target.files);
      setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  
      const filePreviews = files.map((file) => ({
        name: file.name,
        type: file.type,
      }));
  
      setUploadedFiles((prevFiles) => [...prevFiles, ...filePreviews]);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
  
      if (!designStatement || !designType || !diagramType || !description || selectedRequirementsId.length === 0) {
          setError("Please fill in all fields.");
          return;
      }
  
      setLoading(true);
      setError("");
  
      try {
          // **1. สร้าง Design ก่อน**
          const newDesign = {
              diagram_name: designStatement,
              design_type: designType,
              diagram_type: diagramType,
              design_description: description,
              project_id: projectId,
              design_status: "WORKING",
              requirement_id: selectedRequirementsId,
          };
  
          const designResponse = await axios.post("http://localhost:3001/design", newDesign);
          if (designResponse.status !== 201) {
              throw new Error("Failed to create design.");
          }
  
          const design_id = designResponse.data.design_id; // ดึง design_id มาใช้
  
          // **2. บันทึกประวัติ Design**
          await axios.post("http://localhost:3001/addHistoryDesign", {
              design_id,
              design_status: "WORKING",
          });
  
          console.log("Design created successfully:", design_id);
  
          // **3. อัปโหลดไฟล์ และส่ง design_id ไปด้วย**
          const uploadedFileIds = await uploadFiles(design_id);
  
          console.log("Uploaded File IDs:", uploadedFileIds);
  
          alert("Design created successfully!");
          navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } });
      } catch (error) {
          console.error("Error:", error);
          setError("Something went wrong");
      } finally {
          setLoading(false);
      }
  };
  
    
  return (
    <div className="create-design-container">
      <h1 className="create-design-header">Create Software Design</h1>
      {loading && <p className="loading-message">Loading...</p>}
      {error && <p className="create-design-error">{error}</p>}
      <form className="create-design-form" onSubmit={handleSubmit}>
        <div className="create-design-form-group">
          <label htmlFor="designStatement">Diagram Name:</label>
          <input
            type="text"
            id="designStatement"
            value={designStatement}
            onChange={(e) => setDesignStatement(e.target.value)}
            placeholder="Enter Diagram Name"
            required
            className="create-design-input"
          />
        </div>

        <div className="create-design-form-group">
          <label htmlFor="designType">Design Type:</label>
          <select
            id="designType"
            value={designType}
            onChange={(e) => setDesignType(e.target.value)}
            required
            className="create-design-select"
          >
            <option value="" disabled>
              Select Design Type
            </option>
            <option value="High-Level Design">High-Level Design</option>
            <option value="Low-Level Design">Low-Level Design</option>
          </select>
        </div>

        <div className="create-design-form-group">
          <label htmlFor="diagramType">Diagram Type:</label>
          <select
            id="diagramType"
            value={diagramType}
            onChange={(e) => setDiagramType(e.target.value)}
            required
            className="create-design-select"
          >
            <option value="" disabled>
              Select Diagram Type
            </option>
            <option value="Prototype">Prototype</option>
            <option value="Flow Chart">Flow Chart</option>
            <option value="ER Diagram">ER Diagram</option>
            <option value="Pseudo Code">Pseudo Code</option>
          </select>
        </div>

        <label htmlFor="designStatement">Requirement ID:</label>
        <Select
          isMulti
          options={baselineRequirements.map((req) => ({
            value: req.requirement_id,
            label: `REQ-00${req.requirement_id}: ${req.requirement_name}`,
          }))}
          onChange={(selectedOptions) =>
            setRequirementsId(selectedOptions.map((option) => option.value))
          }
        />
        <div className="uploaded-files-container">
          <h3>Selected Files</h3>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} />
          {uploadedFiles.length > 0 &&
            uploadedFiles.map((file, index) => <p key={index}>{file.name} ({file.type})</p>)}
        </div>

        <div className="create-design-form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            rows="4"
            required
            className="create-design-textarea"
          ></textarea>
        </div>

        <div className="create-design-buttons">
          <button
            type="button"
            className="create-design-btn-cancel"
            onClick={() =>
              navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Design" } })
            }
          >
            Cancel
          </button>
          <button type="submit" className="create-design-btn-next">
            Create
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateDesign;
