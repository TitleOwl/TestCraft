import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "react-select"; // ✅ เพิ่มการ import
import "../CSS/CreateRequirement.css";
import { toast } from 'react-toastify';
import Swal from "sweetalert2";
import 'react-toastify/dist/ReactToastify.css';

const editReqTrace = () => {
  const [requirementStatement, setRequirementStatement] = useState("");
  const [requirementType, setRequirementType] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]); // ✅ แก้ไขให้มี useState
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");
  const requirementId = queryParams.get("requirement_id");
  const [requirementStatus, setRequirementStatus] = useState("");
  const [initialRequirementStatement, setInitialRequirementStatement] = useState("");
  const [initialRequirementType, setInitialRequirementType] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [initialSelectedFileIds, setInitialSelectedFileIds] = useState([]);


  useEffect(() => {
    if (projectId) {
      fetchData(fetchUploadedFiles);
      fetchData(fetchCreatedRequirements);
    }
    if (requirementId) {
      fetchRequirementData();
    }
  }, [projectId, requirementId]);




  const fetchData = async (callback) => {
    setIsLoading(true);
    try {
      await callback();
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUploadedFiles = async () => {
    const res = await axios.get(`http://localhost:3001/files?project_id=${projectId}`);
    setUploadedFiles(res.data);
  };

  const fetchCreatedRequirements = async () => {
    await axios.get(`http://localhost:3001/requirements?project_id=${projectId}`);
  };

  const fetchRequirementData = async () => {
    try {
        const res = await axios.get(`http://localhost:3001/requirement/${requirementId}`);
        const { requirement_name, requirement_type, requirement_description, filereq_ids, requirement_status } = res.data;

        setRequirementStatement(requirement_name);
        setRequirementType(requirement_type);
        setDescription(requirement_description);
        setSelectedFileIds(filereq_ids || []);
        setRequirementStatus(requirement_status);

        // กำหนดค่าเริ่มต้น
        setInitialRequirementStatement(requirement_name);
        setInitialRequirementType(requirement_type);
        setInitialDescription(requirement_description);
        setInitialSelectedFileIds(filereq_ids || []);
    } catch (error) {
        console.error("Error fetching requirement data:", error);
    }
};

  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // ตรวจสอบว่ามีการกรอกข้อมูลครบถ้วนหรือไม่
    const isDataFilled = requirementStatement && requirementType && description && selectedFileIds.length > 0;
    const isDataUnchanged = 
      requirementStatement === initialRequirementStatement &&
      requirementType === initialRequirementType &&
      description === initialDescription &&
      JSON.stringify(selectedFileIds) === JSON.stringify(initialSelectedFileIds);
  
    if (!isDataFilled) {
      Swal.fire({
        title: "กรุณากรอกข้อมูลเพื่อทำการยืนยัน",
        text: "ทุกช่องต้องถูกกรอกก่อนดำเนินการ",
        icon: "error",
        confirmButtonText: "ตกลง",
      });
      return;
    }
  
    if (isDataUnchanged) {
      Swal.fire({
        text: "ไม่มีการแก้ไขข้อมูล",
        icon: "info",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }
  
    let confirmText = "ยืนยันการเปลี่ยนแปลง";
  
    if (requirementStatus === "BASELINE") {
      confirmText = "หากยืนยันแล้ว Requirement Status จะเปลี่ยนเป็น WORKING และความสัมพันธ์ทั้งหมดจะหายไป กรุณาตรวจสอบก่อนดำเนินการ";
      
    } else if (requirementStatus === "WORKING") {
      confirmText = "ยืนยันการเปลี่ยนแปลง";
    } else {
      confirmText = "ยืนยันการเปลี่ยนแปลง สถานะจะเปลี่ยนเป็น WORKING";
    }
  
// แสดง Popup ยืนยัน
const result = await Swal.fire({
  title: requirementStatus === "BASELINE" ? "คำเตือน!" : "",
  text: confirmText,
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "ตกลง",
  cancelButtonText: "ยกเลิก",
});

  
    if (!result.isConfirmed) return;
  
    const updatedRequirement = {
      requirement_name: requirementStatement,
      requirement_type: requirementType,
      requirement_description: description,
      project_id: projectId,
      filereq_ids: selectedFileIds,
    };
  
    try {
      const response = await axios.put(
        `http://localhost:3001/requirement/${requirementId}`,
        updatedRequirement
      );
  
      if (response.status === 200) {
        await Swal.fire({
          title: "อัปเดตสำเร็จ!",
          text: "Requirement ถูกอัปเดตเรียบร้อยแล้ว",
          icon: "success",
          confirmButtonText: "ตกลง",
          timer: 1500,
          showConfirmButton: false,
        });
  
        navigate(`/Dashboard?project_id=${projectId}`, {
          state: { selectedSection: "Traceability" },
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย กรุณาลองใหม่อีกครั้ง";
      Swal.fire({
        title: "❌ Error!",
        text: `Error updating requirement: ${errorMessage}`,
        icon: "error",
        confirmButtonText: "ตกลง",
      });
    }
  };


  return (
    <div className="create-requirement-container">
      <h1 className="create-requirement-header">Update Requirement</h1>
      {isLoading && <p className="loading-message">Loading...</p>}
      {error && (
        <div className="error-container">
          <p className="create-requirement-error">{error}</p>
          <button onClick={() => setError("")} className="clear-error-btn">Clear</button>
        </div>
      )}
      <form className="create-requirement-form" onSubmit={handleSubmit}>
        <div className="create-requirement-form-group">
          <label htmlFor="requirementStatement">Requirement Statement</label>
          <input
            type="text"
            id="requirementStatement"
            value={requirementStatement}
            onChange={(e) => setRequirementStatement(e.target.value)}
            placeholder="Enter requirement statement"
            required
            className="create-requirement-input"
          />
        </div>
        <div className="create-requirement-form-group">
          <label htmlFor="requirementType">Type</label>
          <select
            id="requirementType"
            value={requirementType}
            onChange={(e) => setRequirementType(e.target.value)}
            required
            className="create-requirement-select"
          >
            <option value="" disabled>Select Type</option>
            <option value="Functional">Functionality</option>
            <option value="User interface">User interface</option>
            <option value="External interfaces">External interfaces</option>
            <option value="Reliability">Reliability</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Portability">Portability</option>
            <option value="Limitations Design and construction">Limitations Design and construction</option>
            <option value="Interoperability">Interoperability</option>
            <option value="Reusability">Reusability</option>
            <option value="Legal and regulative">Legal and regulative</option>
          </select>
        </div>
        <div className="create-requirement-form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter requirement description"
            rows="4"
            required
            className="create-requirement-textarea"
          ></textarea>
        </div>
        <div className="create-requirement-form-group">
          <label htmlFor="fileSelect">Attach File</label>
          <Select
            isMulti
            options={uploadedFiles.map((file) => ({
              value: file.filereq_id,
              label: `${file.filereq_id} - ${file.filereq_name}`,
            }))}
            value={uploadedFiles
              .filter((file) => selectedFileIds.includes(file.filereq_id)) // แสดงเฉพาะไฟล์ที่มีอยู่ใน selectedFileIds
              .map((file) => ({
                value: file.filereq_id,
                label: `${file.filereq_id} - ${file.filereq_name}`,
              }))}
            onChange={(selectedOptions) =>
              setSelectedFileIds(selectedOptions.map((option) => option.value)) // อัพเดท selectedFileIds ตามที่เลือก
            }
            placeholder="Select files"
            className="select-files"
          />

        </div>
        <div className="create-requirement-form-buttons">
          <button
            type="button"
            className="create-requirement-btn-back"
            onClick={() =>
              navigate(`/Dashboard?project_id=${projectId}`, {
                state: { selectedSection: "Traceability" },
              })
            }
          >
            Back to Requirements
          </button>
          <button type="submit" className="create-requirement-btn-primary">
            Update
          </button>
        </div>
      </form>
    </div>
  );
};

export default editReqTrace;
