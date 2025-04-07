import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/CreateBaseline.css";

const CreateBaseline = () => {
  const [validatedRequirements, setValidatedRequirements] = useState([]);
  const [selectedRequirements, setSelectedRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

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
      } catch {
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
    <div className="baseline-container">
      <h1 className="baseline-title">Set Baseline</h1>
      <div className="baseline-content">
        <div className="baseline-left-panel">
          <h2 className="baseline-section-title">Requirements</h2>
          {loading ? (
            <p className="baseline-loading-message">Loading requirements...</p>
          ) : error ? (
            <p className="baseline-error-message">{error}</p>
          ) : validatedRequirements.length === 0 ? (
            <p className="baseline-no-data">No validated requirements found.</p>
          ) : (
            <table className="baseline-requirements-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {validatedRequirements.map((req) => (
                  <tr key={req.requirement_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedRequirements.includes(req.requirement_id)}
                        onChange={() => handleSelect(req.requirement_id)}
                      />
                    </td>
                    <td>REQ-{req.requirement_id}</td>
                    <td>{req.requirement_name}</td>
                    <td>{req.requirement_type}</td>
                    <td>{req.requirement_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="baseline-action-buttons">
        <button
          className="baseline-create-button"
          onClick={handleCreateBaseline}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Set Baseline"}
        </button>
        <button className="baseline-btn-cancel" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CreateBaseline;
