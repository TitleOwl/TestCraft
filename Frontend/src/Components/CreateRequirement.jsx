import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "react-select"; // นำเข้า react-select
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/CreateRequirement.css";

// Import icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimes,
  faExclamationTriangle,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const CreateRequirement = () => {
  const [requirementStatement, setRequirementStatement] = useState("");
  const [requirementType, setRequirementType] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]); // State สำหรับไฟล์ที่อัปโหลด
  const [selectedFileIds, setSelectedFileIds] = useState([]); // State สำหรับเก็บ filereq_id หลายๆ ตัว
  const [isSubmitting, setIsSubmitting] = useState(false); // State สำหรับปุ่ม Submit
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");


  // ใช้ useEffect เพื่อดึงข้อมูลไฟล์ที่อัปโหลด
  useEffect(() => {
    if (projectId) {
      axios
        .get(`http://localhost:3001/files?project_id=${projectId}`)
        .then((res) => {
          setUploadedFiles(res.data); // เก็บไฟล์ที่ดึงมาจาก API
        })
        .catch((err) => {
          console.error("Error fetching files:", err);
          showAlertMessage("error", "Failed to load files. Please try again.");
        });
    }
  }, [projectId]);


  // ฟังก์ชันสำหรับการส่งข้อมูล (อัปเดตแล้ว)
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Form Data:", requirementStatement, requirementType, description, selectedFileIds);

    if (!requirementStatement || !requirementType || !description) {
      setError("Please fill in all fields.");
      toast.warning("Please fill in all required fields.");
      return;
    }

    const newRequirement = {
      requirement_name: requirementStatement,
      requirement_type: requirementType,
      requirement_description: description,
      project_id: projectId,
      filereq_ids: selectedFileIds,
      requirement_status: "WORKING",
    };

    try {
      setIsSubmitting(true);
      setError("");

      const response = await axios.post("http://localhost:3001/requirement", newRequirement);

      if (response.status === 201 && response.data?.requirement_id) {
        console.log("Requirement created successfully:", response.data);
        const requirementId = response.data.requirement_id;

        const historyReqData = {
          requirement_id: requirementId,
          requirement_name: newRequirement.requirement_name,
          requirement_description: newRequirement.requirement_description,
          requirement_type: newRequirement.requirement_type,
          requirement_status: newRequirement.requirement_status,
        };

        console.log("Sending history data:", historyReqData);

        const historyResponse = await axios.post("http://localhost:3001/historyReqWorking", historyReqData);

        if (historyResponse.status === 200) {
          console.log("History added successfully:", historyResponse.data);

          // ✅ Toast พร้อม onClose -> Redirect หลัง toast ปิด
          toast.success("Requirement created successfully!");

          // ✅ เคลียร์ฟอร์มก่อน redirect
          setRequirementStatement("");
          setRequirementType("");
          setDescription("");
          setSelectedFileIds([]);
        } else {
          console.error("Failed to add history:", historyResponse);
          toast.warning(`Requirement created (ID: ${requirementId}), but failed to add initial history.`);
        }
      } else {
        console.error("Failed to create requirement:", response);
        const errorMessage = response.data?.message || "Failed to create requirement.";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error during submission process:", error);
      const errorMessage = error.response?.data?.message || error.message || "Something went wrong.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };



  // ฟังก์ชันสำหรับการจัดการการเปลี่ยนแปลงของ react-select
  const handleFileChange = (selectedOptions) => {
    // เลือกหลายไฟล์โดยเก็บ `filereq_id` ของไฟล์ที่เลือก
    const selectedFileIds = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setSelectedFileIds(selectedFileIds);
  };

  return (
    <div className="create-requirement-container">
      <h1 className="create-requirement-header">Create New Requirement</h1>
      {error && <p className="create-requirement-error">{error}</p>}
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
        <div className="create-requirement-form-groups">
          <label htmlFor="fileSelect">Related File</label>
          <Select
            isMulti
            options={uploadedFiles.map((file) => ({
              value: file.filereq_id,
              label: `${file.filereq_id} - ${file.filereq_name}`
            }))}
            value={uploadedFiles.filter((file) => selectedFileIds.includes(file.filereq_id)).map((file) => ({
              value: file.filereq_id,
              label: `${file.filereq_id} - ${file.filereq_name}`,
            }))}
            onChange={handleFileChange}
            placeholder="Select Related File"
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
          <button
            type="submit"
            className="create-requirement-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> Creating...
              </>
            ) : (
              "Create"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRequirement;