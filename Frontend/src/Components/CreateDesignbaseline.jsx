import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/CreateDesignbaseline.css";

const CreateDesignbaseline = () => {
  const [verifiedDesign, setVerifiedDesign] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDesign = async () => {
      if (!projectId) return;
  
      setLoading(true);
      setError(null);
  
      try {
        const response = await axios.get(
          `http://localhost:3001/designverified/${projectId}`
        );

        setVerifiedDesign(response.data);
      } catch {
        setError("Failed to load designs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDesign();
  }, [projectId]);  


  const handleSelect = (id) => {
    setSelectedDesign((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  };

  const handleCreateBaseline = async () => {
    // --- ส่วน Validation เหมือนเดิม ---
    if (!projectId) {
        Swal.fire({
            icon: "error",
            title: "Invalid project ID.",
        });
        return;
    }

    if (selectedDesign.length === 0) {
        Swal.fire({
            icon: "warning",
            title: "Please select at least one design.",
        });
        return;
    }

    if (isSubmitting) {
        Swal.fire({
            icon: "warning",
            title: "Submitting in progress. Please wait.",
        });
        return;
    }
    // --- จบส่วน Validation ---

    setIsSubmitting(true);

    const payloadCreateBaseline = { design_id: selectedDesign }; // Payload สำหรับสร้าง Baseline หลัก

    try {
        // 1. เรียก API เพื่อสร้าง/อัปเดต Baseline หลักก่อน
        const responseCreateBaseline = await axios.post("http://localhost:3001/createdesignbaseline", payloadCreateBaseline);

        if (responseCreateBaseline.status === 201) {
            Swal.fire({
                icon: "success",
                title: "Baseline set successfully!",
                timer: 1500, // ลดเวลาลงเล็กน้อย
                showConfirmButton: false,
            });

            // 2. อัปเดต State ใน Frontend (เหมือนเดิม)
            setVerifiedDesign((prev) =>
                prev.map((design) =>
                    selectedDesign.includes(design.design_id)
                        ? { ...design, design_status: "BASELINE" }
                        : design
                )
            );

// 3. เตรียมข้อมูลและเรียก API เพื่อเพิ่ม History (ส่วนที่แก้ไข)
const historyPromises = selectedDesign.map((designId) => {
  const fullDesignData = verifiedDesign.find(design => design.design_id === designId);

  if (!fullDesignData) {
      const errorMessage = `❌ Could not find full data for design_id: ${designId}.`;
      console.error(errorMessage);
      return Promise.reject(errorMessage);
  }

  let { design_id, requirement_id, design_type, diagram_name, diagram_type, design_description } = fullDesignData;

  // ✅ แก้ไข: design_status = "BASELINE" เสมอ
  const design_status = "BASELINE";

  // ✅ ตรวจสอบ requirement_id และแปลงเป็น JSON ถ้าจำเป็น
  try {
      if (typeof requirement_id === "string") {
          requirement_id = JSON.parse(requirement_id);
      }
  } catch (error) {
      console.error(`❌ Error parsing requirement_id for designId: ${designId}:`, error);
      requirement_id = null;
  }

  console.log(`[History] Parsed requirement_id for designId: ${designId}:`, requirement_id);

  const promises = [];

  if (Array.isArray(requirement_id)) {
      requirement_id.forEach(reqId => {
          const parsedReqId = parseInt(reqId, 10);

          if (!isNaN(parsedReqId)) { 
              const historyPayload = {
                  design_id: design_id?.toString() || '',
                  requirement_id: parsedReqId,
                  design_type: design_type || '',
                  diagram_name: diagram_name || '',
                  diagram_type: diagram_type || '',
                  design_description: design_description || '',
                  design_status // ✅ ตั้งเป็น BASELINE เสมอ
              };

              console.log(`[History] Sending payload for designId: ${designId}, requirement_id: ${parsedReqId}:`, historyPayload);

              promises.push(
                  axios.post("http://localhost:3001/addHistoryDesign", historyPayload)
                      .then(response => {
                          console.log(`[History] Successfully added history for designId: ${designId}, requirement_id: ${parsedReqId}`, response);
                          return { status: 'fulfilled', designId, reqId: parsedReqId, response };
                      })
                      .catch(error => {
                          const errorMessage = `[History] Error adding history for designId: ${designId}, requirement_id: ${parsedReqId}: ${error.response?.data?.message || error.message}`;
                          console.error(errorMessage, error.response || error);
                          return { status: 'rejected', designId, reqId: parsedReqId, error: errorMessage };
                      })
              );
          } else {
              console.warn(`[History] Skipping invalid requirement_id: ${reqId} for designId: ${designId}`);
          }
      });
  } 
  else if (requirement_id && typeof requirement_id === "object") {
      Object.values(requirement_id).forEach(reqId => {
          const parsedReqId = parseInt(reqId, 10);
          if (!isNaN(parsedReqId)) {
              const historyPayload = {
                  design_id: design_id?.toString() || '',
                  requirement_id: parsedReqId,
                  design_type: design_type || '',
                  diagram_name: diagram_name || '',
                  diagram_type: diagram_type || '',
                  design_description: design_description || '',
                  design_status // ✅ ตั้งเป็น BASELINE เสมอ
              };

              console.log(`[History] Sending payload for designId: ${designId}, requirement_id: ${parsedReqId}:`, historyPayload);

              promises.push(
                  axios.post("http://localhost:3001/addHistoryDesign", historyPayload)
                      .then(response => {
                          console.log(`[History] Successfully added history for designId: ${designId}, requirement_id: ${parsedReqId}`, response);
                          return { status: 'fulfilled', designId, reqId: parsedReqId, response };
                      })
                      .catch(error => {
                          const errorMessage = `[History] Error adding history for designId: ${designId}, requirement_id: ${parsedReqId}: ${error.response?.data?.message || error.message}`;
                          console.error(errorMessage, error.response || error);
                          return { status: 'rejected', designId, reqId: parsedReqId, error: errorMessage };
                      })
              );
          } else {
              console.warn(`[History] Skipping invalid requirement_id: ${reqId} for designId: ${designId}`);
          }
      });
  } 
  else if (requirement_id != null) {
      const parsedReqId = parseInt(requirement_id, 10);
      if (!isNaN(parsedReqId)) {
          const historyPayload = {
              design_id: design_id?.toString() || '',
              requirement_id: parsedReqId,
              design_type: design_type || '',
              diagram_name: diagram_name || '',
              diagram_type: diagram_type || '',
              design_description: design_description || '',
              design_status // ✅ ตั้งเป็น BASELINE เสมอ
          };

          console.log(`[History] Sending payload for designId: ${designId}, requirement_id: ${parsedReqId}:`, historyPayload);

          promises.push(
              axios.post("http://localhost:3001/addHistoryDesign", historyPayload)
                  .then(response => {
                      console.log(`[History] Successfully added history for designId: ${designId}, requirement_id: ${parsedReqId}`, response);
                      return { status: 'fulfilled', designId, reqId: parsedReqId, response };
                  })
                  .catch(error => {
                      const errorMessage = `[History] Error adding history for designId: ${designId}, requirement_id: ${parsedReqId}: ${error.response?.data?.message || error.message}`;
                      console.error(errorMessage, error.response || error);
                      return { status: 'rejected', designId, reqId: parsedReqId, error: errorMessage };
                  })
          );
      } else {
          console.warn(`[History] Skipping invalid requirement_id: ${requirement_id} for designId: ${designId}`);
      }
  } else {
      console.warn(`[History] No valid requirement_id for designId: ${designId}`);
  }

  return Promise.allSettled(promises);
});

await Promise.all(historyPromises);

console.log("✅ All design history additions attempted.");

            // 4. เคลียร์รายการที่เลือก (เหมือนเดิม)
            setSelectedDesign([]);

            // 5. แสดงข้อความสำเร็จ (อาจจะรวมกับข้อความแรก หรือแยกตามเดิม)
            Swal.fire({
                icon: "success",
                title: "Design history updated!",
                timer: 2000,
                showConfirmButton: false,
            });

            // 6. Navigate ไปยังหน้า Baseline (เหมือนเดิม)
            navigate(`/DesignBaseline?project_id=${projectId}`);

        } else {
            // กรณี responseCreateBaseline ไม่ใช่ 201
            throw new Error(responseCreateBaseline.data.message || "Failed to set baseline.");
        }
    } catch (error) {
        console.error("❌ Error creating baseline or adding history:", error.response?.data || error.message);
        Swal.fire({
            icon: "error",
            title: "An Error Occurred",
            text: error.response?.data?.message || "Could not complete the baseline process. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
    navigate(`/DesignBaseline?project_id=${projectId}`);
};

  const handleCancel = () => {
    navigate(`/DesignBaseline?project_id=${projectId}`);
  };

  return (
    <div className="create-baseline-container">
      <h1 className="create-baseline-title">Set Baseline</h1>
      <div className="create-baseline-content">
        <div className="create-baseline-left-panel">
          <h2 className="create-baseline-section-title">Designs</h2>
          {loading ? (
            <p className="create-baseline-loading-message">Loading designs...</p>
          ) : error ? (
            <p className="create-baseline-error-message">{error}</p>
          ) : verifiedDesign?.length === 0 ? (
            <p className="create-baseline-no-data">No verified designs found.</p>
          ) : (
            <table className="create-baseline-designs-table">
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
                {verifiedDesign.map((design) => (
                  <tr key={design.design_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedDesign.includes(design.design_id)}
                        onChange={() => handleSelect(design.design_id)}
                      />
                    </td>
                    <td>SD-0{design.design_id}</td>
                    <td>{design.diagram_name}</td>
                    <td>{design.design_type}</td>
                    <td>{design.design_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
  
      <div className="create-baseline-action-buttons">
        <button
          className="create-baseline-create-button"
          onClick={handleCreateBaseline}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Set Baseline"}
        </button>
  
        <button className="create-baseline-btn-cancel" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );  
};

export default CreateDesignbaseline;