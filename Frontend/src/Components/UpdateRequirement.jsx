import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "react-select"; // ✅ เพิ่มการ import
import "./CSS/CreateRequirement.css";
import { toast } from 'react-toastify';
import Swal from "sweetalert2";
import 'react-toastify/dist/ReactToastify.css';

const UpdateRequirement = () => {
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

  // --- การตรวจสอบข้อมูล (เหมือนเดิม) ---
  const isDataFilled = requirementStatement && requirementType && description && selectedFileIds.length > 0;
  const isDataUnchanged =
      requirementStatement === initialRequirementStatement &&
      requirementType === initialRequirementType &&
      description === initialDescription &&
      JSON.stringify(selectedFileIds.sort()) === JSON.stringify(initialSelectedFileIds.sort()); // Sort ก่อนเทียบ Array

  if (!isDataFilled) {
      Swal.fire({
          title: "ข้อมูลไม่ครบถ้วน",
          text: "กรุณากรอกข้อมูลทุกช่อง และเลือกไฟล์ Requirement Specification อย่างน้อย 1 ไฟล์",
          icon: "warning",
          confirmButtonText: "ตกลง",
      });
      return;
  }

  if (isDataUnchanged) {
      Swal.fire({
          text: "ไม่มีการแก้ไขข้อมูล",
          icon: "info",
          timer: 1500,
          showConfirmButton: false,
      });
      return;
  }

  // --- กำหนดข้อความยืนยัน และสถานะใหม่ ---
  let confirmText = "ยืนยันการเปลี่ยนแปลงข้อมูล Requirement?";
  let newStatus = requirementStatus; // สถานะเริ่มต้นคือสถานะปัจจุบัน
  let needsStatusUpdate = false;

  // *** จุดสำคัญ: กำหนดเงื่อนไขการเปลี่ยนสถานะ ***
  if (requirementStatus === "BASELINE") {
      confirmText = "Requirement นี้เป็น Baseline หากยืนยันการแก้ไข สถานะจะเปลี่ยนกลับเป็น 'WORKING' คุณต้องการดำเนินการต่อหรือไม่?";
      newStatus = "WORKING"; // กำหนดสถานะใหม่
      needsStatusUpdate = true;
  } else if (requirementStatus !== "WORKING") {
       // สมมติว่าถ้าสถานะอื่นที่ไม่ใช่ WORKING เมื่อแก้ไข ก็ให้กลับเป็น WORKING (อาจปรับตามกฎ)
       confirmText = `ยืนยันการแก้ไข Requirement? (สถานะปัจจุบัน: ${requirementStatus} จะเปลี่ยนเป็น 'WORKING')`;
       newStatus = "WORKING";
       needsStatusUpdate = true;
  }
   // ถ้าเป็น WORKING อยู่แล้ว แก้ไขก็ยังเป็น WORKING (newStatus ไม่เปลี่ยน)

  // --- แสดง Popup ยืนยัน (เหมือนเดิม) ---
  const result = await Swal.fire({
      title: needsStatusUpdate ? "คำเตือนเรื่องสถานะ!" : "ยืนยันการแก้ไข",
      text: confirmText,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ตกลง",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
  });

  if (!result.isConfirmed) {
      console.log("Edit cancelled by user.");
      return; // ผู้ใช้กดยกเลิก
  }

  // --- เตรียมข้อมูลที่จะส่งไปอัปเดต ---
  const updatedRequirement = {
      requirement_name: requirementStatement,
      requirement_type: requirementType,
      requirement_description: description,
      project_id: projectId,
      filereq_ids: selectedFileIds,
      // *** เพิ่มสถานะใหม่เข้าไปใน payload ถ้ามีการเปลี่ยนแปลง ***
      ...(needsStatusUpdate && { requirement_status: newStatus })
      // บรรทัดบนหมายถึง: ถ้า needsStatusUpdate เป็น true ให้เพิ่ม { requirement_status: newStatus } เข้าไปใน object
      // ถ้า backend ของคุณแยก API อัปเดตสถานะ คุณต้องเรียก API นั้นต่างหาก
  };

  console.log("Submitting updated requirement:", updatedRequirement);

  try {
      // --- เรียก API เพื่ออัปเดต Requirement หลัก (PUT /requirement/:id) ---
      const response = await axios.put(
          `http://localhost:3001/requirement/${requirementId}`,
          updatedRequirement
      );

      // --- ถ้าอัปเดต Requirement หลักสำเร็จ ---
      if (response.status === 200) {
          console.log("Requirement updated successfully:", response.data);

          // --- *** จุดที่แก้ไข: สร้างและส่ง History *** ---
          // 1. สร้าง historyReqData (ใช้ข้อมูลล่าสุดที่เพิ่งอัปเดตไป)
          const historyReqData = {
              requirement_id: requirementId, // ID ของ Requirement ที่แก้ไข
              requirement_name: updatedRequirement.requirement_name,
              requirement_description: updatedRequirement.requirement_description,
              requirement_type: updatedRequirement.requirement_type,
              requirement_status: newStatus, // ใช้สถานะใหม่ที่กำหนดไว้ (เช่น WORKING)
          };

          console.log("Sending history data:", historyReqData);

          try {
               // 2. ส่งข้อมูลไปที่ historyReqWorking
              const historyResponse = await axios.post(
                  "http://localhost:3001/historyReqWorking",
                  historyReqData
              );

              if (historyResponse.status !== 200) {
                  console.error(`Failed to add history after edit for requirement ID: ${requirementId}. Status: ${historyResponse.status}`, historyResponse.data);
                  // แจ้งเตือนเบาๆ ว่า history อาจจะไม่ถูกบันทึก แต่การแก้ไขหลักสำเร็จแล้ว
                  toast.warn(`Requirement updated, but failed to record history (REQ-${requirementId}).`);
              } else {
                   console.log(`History added successfully after edit for Req ID ${requirementId}`);
              }
          } catch (historyError) {
              console.error(`Error sending history after edit for requirement ID: ${requirementId}`, historyError.response?.data || historyError.message);
              toast.error(`Requirement updated, but error recording history (REQ-${requirementId}). Check console.`);
          }
          // --- จบส่วน History ---


          // --- แสดงข้อความสำเร็จ และ Navigate (เหมือนเดิม) ---
          await Swal.fire({
              title: "อัปเดตสำเร็จ!",
              text: "Requirement ถูกอัปเดตเรียบร้อยแล้ว" + (needsStatusUpdate ? ` และสถานะเปลี่ยนเป็น ${newStatus}` : ""),
              icon: "success",
              timer: 2000, // แสดงผล 2 วินาที
              showConfirmButton: false,
          });

          // กลับไปหน้า Dashboard หรือหน้าที่เหมาะสม
          navigate(`/Dashboard?project_id=${projectId}`, {
              state: { selectedSection: "Requirement" }, // ส่ง state ไปด้วยถ้าต้องการ
          });

      } else {
          // กรณี status ไม่ใช่ 200 (อาจไม่ค่อยเกิดกับ PUT ที่สำเร็จ)
           throw new Error(response.data.message || `Unexpected status code: ${response.status}`);
      }
  } catch (error) {
      // --- จัดการ Error ตอนเรียก API หลัก (PUT) --- (เหมือนเดิม)
      console.error("Error updating requirement:", error.response || error.message);
      const errorMessage = error.response?.data?.message || "เกิดข้อผิดพลาดในการอัปเดต Requirement";
      Swal.fire({
          title: "เกิดข้อผิดพลาด!",
          text: errorMessage,
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
                state: { selectedSection: "Requirement" },
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

export default UpdateRequirement;