import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/CreateBaseline.css";

// Icons
const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CancelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const BaselineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15"></line>
    <circle cx="18" cy="6" r="3"></circle>
    <circle cx="6" cy="18" r="3"></circle>
    <path d="M18 9a9 9 0 0 1-9 9"></path>
  </svg>
);

const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

// Custom Status Badge Component
const StatusBadge = ({ status }) => {
  let statusClass = "";
  
  switch (status) {
    case "VALIDATED":
      statusClass = "validated";
      break;
    case "BASELINE":
      statusClass = "baseline";
      break;
    default:
      statusClass = "default";
  }
  
  return <span className={`create-baseline-status-badge ${statusClass}`}>{status}</span>;
};

// Loading Component
const LoadingState = () => (
  <div className="create-baseline-loading-state">
    <div className="create-baseline-loading-spinner"></div>
    <p>Loading requirements...</p>
  </div>
);

// Error Component
const ErrorState = ({ message }) => (
  <div className="create-baseline-error-state">
    <div className="create-baseline-error-icon">⚠️</div>
    <h3>Error</h3>
    <p>{message}</p>
  </div>
);

// Empty State Component
const EmptyState = () => (
  <div className="create-baseline-empty-state">
    <div className="create-baseline-empty-icon">📋</div>
    <h3>No Validated Requirements</h3>
    <p>There are no validated requirements available to set as baseline.</p>
  </div>
);

const CreateBaseline = () => {
  const [validatedRequirements, setValidatedRequirements] = useState([]);
  const [selectedRequirements, setSelectedRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  // Handle "Select All" checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRequirements([]);
    } else {
      const allIds = validatedRequirements.map(req => req.requirement_id);
      setSelectedRequirements(allIds);
    }
    setSelectAll(!selectAll);
  };

  // Check if all requirements are selected
  useEffect(() => {
    if (validatedRequirements.length > 0) {
      setSelectAll(
        selectedRequirements.length === validatedRequirements.length
      );
    }
  }, [selectedRequirements, validatedRequirements]);

  // Fetch validated requirements
  useEffect(() => {
    const fetchRequirements = async () => {
      if (!projectId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(
          `http://localhost:3001/project/${projectId}/requirement`,
          { params: { status: "VALIDATED" } }
        );

        const validated = response.data.filter(
          (req) => req.requirement_status === "VALIDATED"
        );

        setValidatedRequirements(validated);
      } catch (err) {
        console.error("Error fetching requirements:", err);
        setError("Failed to load requirements. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, [projectId]);

  const handleSelect = (id) => {
    setSelectedRequirements((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  };

  const handleCreateBaseline = async () => {
    // --- การตรวจสอบ Input (เหมือนเดิม) ---
    if (!projectId) {
        toast.error("Invalid project ID.");
        return;
    }

    if (selectedRequirements.length === 0) {
        toast.warning("Please select at least one requirement.");
        return;
    }

    if (isSubmitting) {
        toast.warning("Submitting in progress. Please wait.");
        return;
    }

    setIsSubmitting(true); // เริ่มการ Submit

    const baselineAt = new Date().toISOString(); // เวลาที่สร้าง Baseline

    // --- Payload สำหรับ /createbaseline (เหมือนเดิม) ---
    const payload = {
        requirement_id: selectedRequirements, // ส่งเป็น Array ของ ID
        baseline_at: baselineAt,
    };

    console.log("Creating baseline with payload:", payload);

    try {
        // --- เรียก API /createbaseline (เหมือนเดิม) ---
        const response = await axios.post(
            "http://localhost:3001/createbaseline",
            payload
        );

        // --- ถ้าสร้าง Baseline สำเร็จ ---
        if (response.status === 201) { // ปกติสร้างสำเร็จ trả về 201
            const result = response.data; // ข้อมูล Baseline ที่สร้าง (ถ้ามี)
            console.log("Baseline created successfully:", result);
            toast.success("Baseline set successfully!");

            // Step 1: อัปเดตสถานะ Requirement เป็น 'BASELINE' ใน Backend (เหมือนเดิม)
            const updatePayload = {
                requirement_id: selectedRequirements, // ส่งเป็น Array ของ ID
                requirement_status: `BASELINE`,      // สถานะใหม่
            };
            console.log("Updating requirement statuses to BASELINE:", updatePayload);
            await axios.post("http://localhost:3001/updaterequirements", updatePayload); // หรืออาจจะเป็น PUT ถ้า API เป็นแบบนั้น
            console.log("Requirement statuses updated.");


            // --- *** จุดที่แก้ไข: Loop เพื่อสร้าง History *** ---
            // Step 2: บันทึก History สำหรับแต่ละ Requirement
            console.log("Starting history creation loop for baseline...");
            for (const requirementId of selectedRequirements) {
                // 2.1 ค้นหาข้อมูล requirement เต็มจาก state `validatedRequirements`
                const reqDetail = validatedRequirements.find(
                    (req) => req.requirement_id === requirementId
                );

                if (!reqDetail) {
                    console.error(`Could not find details for requirement ID: ${requirementId} in validatedRequirements state. Skipping history creation.`);
                    toast.warn(`Could not find details for REQ-${requirementId}, history not recorded.`);
                    continue; // ข้ามไปทำ requirement ID ถัดไป
                }

                // 2.2 สร้าง historyReqData โดยใช้ข้อมูลที่พบ
                const historyReqData = {
                    requirement_id: requirementId,
                    requirement_name: reqDetail.requirement_name,         // <-- ดึงจาก details
                    requirement_description: reqDetail.requirement_description, // <-- ดึงจาก details
                    requirement_type: reqDetail.requirement_type,         // <-- ดึงจาก details
                    requirement_status: "BASELINE",                      // กำหนดสถานะ
                };

                console.log(`Sending history data for Req ID ${requirementId} (Baseline):`, historyReqData);

                try {
                    // 2.3 ส่งข้อมูลไปที่ historyReqWorking
                    const historyResponse = await axios.post(
                        "http://localhost:3001/historyReqWorking",
                        historyReqData
                    );

                    if (historyResponse.status !== 200) {
                        console.error(`Failed to add history for requirement ID: ${requirementId}. Status: ${historyResponse.status}`, historyResponse.data);
                        toast.warn(`Failed to record history for REQ-${requirementId}`);
                    } else {
                         console.log(`History added successfully for Req ID ${requirementId} (Baseline)`);
                    }
                } catch (historyError) {
                    console.error(`Error sending history for requirement ID: ${requirementId}`, historyError.response?.data || historyError.message);
                    toast.error(`Error recording history for REQ-${requirementId}. Check console.`);
                }
            } // --- จบ Loop ---
            console.log("Finished history creation loop for baseline.");


            // Step 3: อัปเดต State ฝั่ง Frontend (เหมือนเดิม)
            // นำรายการที่ถูก Baseline ออกจาก state `validatedRequirements`
            setValidatedRequirements((prev) =>
                prev.filter((req) => !selectedRequirements.includes(req.requirement_id))
            );
            setSelectedRequirements([]); // เคลียร์รายการที่เลือก

            console.log("Frontend state updated successfully.");

            // Navigate หลังจากทุกอย่างสำเร็จใน try block
            navigate(`/Baseline?project_id=${projectId}`);

        } else {
             // กรณี /createbaseline ไม่สำเร็จ แต่ status ไม่ใช่ error (อาจไม่ควรเกิด)
            throw new Error(response.data.message || "Failed to set baseline. Unexpected status.");
        }
    } catch (error) {
        // จัดการ Error ทั่วไป (ตอนเรียก API หรืออื่นๆ) (เหมือนเดิม)
        console.error("Error during baseline creation process:", error.response?.data || error.message);
        const errorMessage =
            error.response?.data?.message || "An error occurred during the baseline process.";
        toast.error(errorMessage);
    } finally {
        setIsSubmitting(false); // เสร็จสิ้นการ Submit (ไม่ว่าจะสำเร็จหรือล้มเหลว)
    }
};

  const handleCancel = () => {
    navigate(`/Baseline?project_id=${projectId}`);
  };

  return (
    <div className="create-baseline-dashboard">
      <div className="create-baseline-header">
        <div className="create-baseline-header-left">
          <button className="create-baseline-back-button" onClick={handleCancel}>
            <BackIcon />
            <span>Back</span>
          </button>
        </div>
        <div className="create-baseline-header-title">
          <BaselineIcon />
          <h1>Create New Baseline</h1>
        </div>
        <div className="create-baseline-header-right"></div>
      </div>

      <div className="create-baseline-content">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : validatedRequirements.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="create-baseline-card">
            <div className="create-baseline-card-header">
              <div className="create-baseline-title-section">
                <ListIcon />
                <h2>Validated Requirements</h2>
              </div>
              <div className="create-baseline-selection-info">
                <span>{selectedRequirements.length} of {validatedRequirements.length} selected</span>
              </div>
            </div>
            
            <div className="create-baseline-table-container">
              <table className="create-baseline-table">
                <thead>
                  <tr>
                    <th className="col-checkbox">
                      <div className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          id="select-all"
                          className="styled-checkbox"
                        />
                        <label htmlFor="select-all"></label>
                      </div>
                    </th>
                    <th className="col-id">ID</th>
                    <th className="col-name">Name</th>
                    <th className="col-type">Type</th>
                    <th className="col-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validatedRequirements.map((req) => (
                    <tr 
                      key={req.requirement_id} 
                      className={`create-baseline-row ${selectedRequirements.includes(req.requirement_id) ? 'selected' : ''}`}
                      onClick={() => handleSelect(req.requirement_id)}
                    >
                      <td className="col-checkbox">
                        <div className="checkbox-container">
                          <input
                            type="checkbox"
                            checked={selectedRequirements.includes(req.requirement_id)}
                            onChange={() => handleSelect(req.requirement_id)}
                            id={`req-${req.requirement_id}`}
                            className="styled-checkbox"
                          />
                          <label htmlFor={`req-${req.requirement_id}`}></label>
                        </div>
                      </td>
                      <td className="col-id">
                        <span className="req-id">REQ-{String(req.requirement_id).padStart(3, '0')}</span>
                      </td>
                      <td className="col-name">{req.requirement_name}</td>
                      <td className="col-type">{req.requirement_type || 'N/A'}</td>
                      <td className="col-status">
                        <StatusBadge status={req.requirement_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="create-baseline-actions">
              <button
                className="create-baseline-cancel-button"
                onClick={handleCancel}
              >
                <CancelIcon />
                <span>Cancel</span>
              </button>
              <button
                className="create-baseline-submit-button"
                onClick={handleCreateBaseline}
                disabled={isSubmitting || selectedRequirements.length === 0}
              >
                <CheckIcon />
                <span>{isSubmitting ? "Creating..." : "Set Baseline"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
};

export default CreateBaseline;