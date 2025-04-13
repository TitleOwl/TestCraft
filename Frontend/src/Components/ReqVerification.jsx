import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Comment from "./Comment";
import "./CSS/ReqVerification.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClipboardCheck,
  faListAlt,
  faCheck,
  faComment,
  faTimes,
  faInfoCircle,
  faExclamationTriangle,
  faCheckCircle
} from "@fortawesome/free-solid-svg-icons";

const ReqVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const verificationId = queryParams.get("verification_id");
  const { selectedRequirements } = location.state || {};
  const [reqcriList, setReqcriList] = useState([]);
  const [requirementsDetails, setRequirementsDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkboxState, setCheckboxState] = useState({});
  
  // Alert state
  const [alertType, setAlertType] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const alertRef = useRef(null);
  const alertTimeoutRef = useRef(null);

  useEffect(() => {
    if (!projectId || !verificationId) {
      console.error("Project ID or Verification ID is missing.");
      navigate("/VerificationList");
      return;
    }
  
    fetchCriteria();
  
    if (selectedRequirements && selectedRequirements.length > 0) {
      fetchRequirementsDetails(selectedRequirements);
    }
    
    // Clean up alert timeout on unmount
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [projectId, verificationId, selectedRequirements, navigate]);
  
  const fetchCriteria = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3001/reqcriteria", {
        params: { project_id: projectId },
      });
  
      const initialCheckboxState = response.data.reduce((acc, criteria) => {
        acc[criteria.reqcri_id] = false;
        return acc;
      }, {});
  
      setReqcriList(response.data);
  
      const storedUsername = localStorage.getItem("username");
      if (storedUsername) {
        const storedCheckboxState = localStorage.getItem(
          `checkboxState_${storedUsername}_${projectId}`
        );
  
        if (storedCheckboxState) {
          setCheckboxState(JSON.parse(storedCheckboxState));
        } else {
          setCheckboxState(initialCheckboxState);
        }
      }
    } catch (error) {
      console.error("Error fetching criteria:", error);
      showCustomAlert("error", "Failed to load criteria. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRequirementsDetails = async (requirements) => {
    try {
      const response = await axios.get("http://localhost:3001/requirements", {
        params: { requirement_ids: requirements },
      });
      setRequirementsDetails(response.data);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      showCustomAlert("error", "Failed to load requirements. Please try again.");
    }
  };

  const handleCheckboxChange = (id) => {
    const updatedState = {
      ...checkboxState,
      [id]: !checkboxState[id],
    };
    setCheckboxState(updatedState);

    console.log("Checkbox state updated:", updatedState); // เพิ่ม log ที่นี่

    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      localStorage.setItem(
        `checkboxState_${storedUsername}_${projectId}_${verificationId}`,
        JSON.stringify(updatedState)
      );
    }
  };

  // Custom alert function
  const showCustomAlert = (type, message) => {
    setAlertType(type);
    setAlertMessage(message);
    setShowAlert(true);
    
    // Auto-hide after 5 seconds
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    
    alertTimeoutRef.current = setTimeout(() => {
      setShowAlert(false);
    }, 5000);
  };
  
  const handleCloseAlert = () => {
    setShowAlert(false);
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
  };
  
  const navigateBack = () => {
    navigate(`/VerificationList?project_id=${projectId}`);
  };


const handleSave = async () => {

  console.log("Current checkbox state before save:", checkboxState);

  const allChecked = Object.values(checkboxState).every((value) => value);

  // --- ไม่มีการตรวจสอบ allDesignChecked แล้ว ---
  // const allDesignChecked = Object.values(designCheckboxState).every((value) => value);

  // เงื่อนไข: ถ้า Requirement Criteria ยังติ๊กไม่ครบ
  if (!allChecked) { // เช็คแค่ requirement criteria
      // แสดง Alert เตือนว่าบันทึกแล้ว แต่ยังมี Requirement Criteria ที่ยังไม่ได้ติ๊ก
      showCustomAlert("warning", "Criteria checklist saved, but not all items are checked");

      // หน่วงเวลา 1.5 วินาที แล้วเปลี่ยนหน้าไปที่ VerificationList
      setTimeout(() => {
          navigate(`/VerificationList?project_id=${projectId}`);
      }, 1500);

      // หยุดการทำงานของฟังก์ชัน handleSave ทันที
      return;
  }

  // --- ส่วนนี้ทำงานเมื่อ Requirement Criteria ทุกข้อถูกติ๊กครบ ---
  // เริ่มบล็อก try...catch เพื่อดักจับข้อผิดพลาดที่อาจเกิดขึ้นระหว่างการบันทึก
  try {
      // ดึงชื่อผู้ใช้ที่ล็อกอินจาก localStorage
      const storedUsername = localStorage.getItem("username");

      // ตรวจสอบว่ามีชื่อผู้ใช้หรือไม่ ถ้าไม่มี ให้แจ้งเตือนและหยุดการทำงาน
      if (!storedUsername) {
          showCustomAlert("error", "Please log in first.");
          return;
      }

      // เรียก API เพื่อดึงข้อมูล Verification ของโปรเจกต์และ ID ที่ระบุ
      const response = await axios.get("http://localhost:3001/verifications", {
          params: { project_id: projectId, verification_id: verificationId },
      });

      // ค้นหาข้อมูล Verification ที่ตรงกับ verificationId ที่ได้รับมา
      // แปลง verificationId เป็น integer เพื่อเปรียบเทียบกับ v.id
      const verification = response.data.find((v) => v.id === parseInt(verificationId));

      // ตรวจสอบว่าพบข้อมูล Verification หรือไม่
      if (verification) {
          // อัปเดตสถานะใน Array 'verification_by'
          // วนลูปผ่านแต่ละ entry ใน verification.verification_by
          const updatedVerificationBy = verification.verification_by.map((entry) => {
              // แยกชื่อผู้ใช้และสถานะออกจากกัน (เช่น "user1: false")
              const [username, status] = entry.split(":").map((item) => item.trim());
              // ถ้าชื่อผู้ใช้ตรงกับผู้ใช้ปัจจุบัน ให้เปลี่ยนสถานะเป็น "true"
              // ถ้าไม่ตรง ให้ใช้ entry เดิม
              return username === storedUsername ? `${username}: true` : entry;
          });

          // เรียก API เพื่ออัปเดตข้อมูล verification_by ในฐานข้อมูล
          await axios.put("http://localhost:3001/update-verification-true", {
              project_id: projectId,
              verification_id: verificationId,
              verification_by: updatedVerificationBy, // ส่ง Array ที่อัปเดตแล้วกลับไป
          });

          // ตรวจสอบว่าผู้ใช้ทุกคนใน updatedVerificationBy มีสถานะเป็น "true" หรือไม่
          const allVerified = updatedVerificationBy.every((entry) => {
              // แยกสถานะออกมาจาก entry
              const [, status] = entry.split(":").map((item) => item.trim());
              // คืนค่า true ถ้าสถานะเป็น "true"
              return status === "true";
          });

          // เงื่อนไข: ถ้าผู้ใช้ทุกคนทำการ Verify แล้ว (allVerified เป็น true)
          if (allVerified) {
              // ดึง ID ของ Requirements ทั้งหมดที่เกี่ยวข้องกับการ Verify นี้
              const requirementIds = requirementsDetails.map((req) => req.requirement_id);

              // ตรวจสอบว่ามี Requirement ID หรือไม่ ถ้าไม่มี ให้แจ้งเตือนและหยุด
              if (!requirementIds.length) {
                  showCustomAlert("error", "No requirements found to update.");
                  return;
              }

              // เริ่ม try...catch สำหรับขั้นตอนสุดท้าย (อัปเดตสถานะ requirement, บันทึกประวัติ, บันทึก req criteria)
              try {
                  // 1. อัปเดตสถานะ Requirements ที่เกี่ยวข้องทั้งหมดเป็น "VERIFIED"
                  await axios.put("http://localhost:3001/update-requirements-status-verified", {
                      requirement_ids: requirementIds, // ส่ง Array ของ ID ไป
                      requirement_status: "VERIFIED",
                  });

                  // 2. วนลูปเพื่อบันทึกประวัติ (History) และข้อมูล Verification Criteria ของแต่ละ Requirement
                  for (const requirementId of requirementIds) {
                      // ค้นหารายละเอียดของ Requirement ปัจจุบันจาก requirementsDetails
                      const reqDetail = requirementsDetails.find((req) => req.requirement_id === requirementId);
                      // ถ้าไม่พบรายละเอียด (กรณีข้อมูลไม่สมบูรณ์) ให้ข้ามไป Requirement ถัดไป
                      if (!reqDetail) continue;

                      // 2.1 บันทึกประวัติ Requirement (historyReqWorking)
                      const historyReqData = {
                          requirement_id: requirementId,
                          requirement_name: reqDetail.requirement_name,
                          requirement_description: reqDetail.requirement_description,
                          requirement_type: reqDetail.requirement_type,
                          requirement_status: "VERIFIED", // ใช้สถานะที่เพิ่งอัปเดต
                      };
                      try {
                          // ส่งข้อมูลประวัติไปยัง API
                          await axios.post("http://localhost:3001/historyReqWorking", historyReqData);
                      } catch (historyError) {
                          // หากเกิดข้อผิดพลาดในการบันทึกประวัติ ให้ log error แต่ไม่หยุดการทำงานหลัก
                          console.error("Error sending history:", historyError.response?.data || historyError.message);
                          // อาจจะแจ้งเตือนผู้ใช้เพิ่มเติมถ้าจำเป็น
                      }

                      // 2.2 บันทึกข้อมูล Requirement Verifications Criteria
                      // กรอง reqcriList เพื่อเอาเฉพาะ Criteria ที่ถูกติ๊ก (มีใน checkboxState)
                      const checkedReqCriteriaNames = reqcriList
                          .filter((criteria) => checkboxState[criteria.reqcri_id])
                          .map((criteria) => criteria.reqcri_name); // ดึงเฉพาะชื่อออกมา

                      // เตรียมข้อมูลที่จะส่งไปบันทึก
                      const vericriReqData = {
                          project_id: projectId,
                          reqcri_name: checkedReqCriteriaNames.join(", "), // รวมชื่อ Criteria ที่ติ๊ก คั่นด้วย ", "
                          requirement_id: requirementId,
                          requirement_name: reqDetail.requirement_name,
                          requirement_description: reqDetail.requirement_description,
                          requirement_type: reqDetail.requirement_type,
                      };
                      try {
                          // ส่งข้อมูล vericri_req ไปยัง API
                          await axios.post("http://localhost:3001/vericri_req", vericriReqData);
                      } catch (vericriError) {
                          // หากเกิดข้อผิดพลาดในการบันทึก vericri_req ให้ log error และแจ้งเตือนผู้ใช้
                          console.error("Error sending vericri_req:", vericriError.response?.data || vericriError.message);
                          showCustomAlert("error", `Failed to save requirement criteria details for Req ID: ${requirementId}.`);
                          // พิจารณาว่าจะให้หยุดการทำงานหรือไม่ (ปัจจุบันปล่อยให้ทำงานต่อ)
                      }
                  } // <--- จบ Loop การทำงานกับแต่ละ Requirement

                  // 3. แสดง Alert ว่าทุกอย่างสำเร็จ และสถานะอัปเดตเป็น VERIFIED แล้ว
                  // (หมายเหตุ: ข้อความ Alert ยังเหมือนเดิม อาจจะปรับถ้าต้องการให้สื่อว่าเฉพาะ Requirement Verified)
                  showCustomAlert("success", "All criteria verified! Status updated to VERIFIED");
                  // หน่วงเวลา 1.5 วินาที แล้วเปลี่ยนหน้าไปที่ Dashboard (หรือหน้าอื่นตามต้องการ)
                  setTimeout(() => {
                      navigate(`/Dashboard?project_id=${projectId}`);
                  }, 1500);

              } catch (error) {
                  // หากเกิดข้อผิดพลาดในขั้นตอนสุดท้าย (อัปเดตสถานะ requirement, บันทึกประวัติ/req criteria)
                  console.error("Error during final verification steps:", error);
                  showCustomAlert("error", "Failed to update requirements status or save verification details.");
              }

          } else {
              // เงื่อนไข: ถ้ายังมีผู้ใช้บางคนยังไม่ได้ Verify
              // แสดง Alert เตือนว่าบันทึกส่วนของตัวเองแล้ว แต่ยังรอคนอื่น
              showCustomAlert("warning", "Your verification is saved, but not all users have verified yet.");
              // หน่วงเวลา 1.5 วินาที แล้วเปลี่ยนหน้าไปที่ VerificationList
              setTimeout(() => {
                  navigate(`/VerificationList?project_id=${projectId}`);
              }, 1500);
          }
      } else {
          // กรณี: ไม่พบข้อมูล Verification ที่ตรงกับ verificationId
          showCustomAlert("error", `Verification ID ${verificationId} not found.`);
      }
  } catch (error) {
      // กรณี: เกิดข้อผิดพลาดทั่วไปในระหว่างกระบวนการบันทึก (เช่น API ล่ม, ดึงข้อมูลไม่ได้)
      console.error("Error during verification save:", error);
      showCustomAlert("error", "Failed to save verification status.");
  }
}; // จบฟังก์ชัน handleSave

  return (
    <div className="reqveri-container">
      <div className="reqveri-header">
        <button className="reqveri-back-btn" onClick={navigateBack}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1 className="reqveri-title">
          <FontAwesomeIcon icon={faClipboardCheck} className="reqveri-title-icon" />
          Verification Requirement
        </h1>
      </div>

      <div className="reqveri-flex-container">
        <div className="reqveri-box">
          <h2>
            <FontAwesomeIcon icon={faListAlt} className="reqveri-icon" />
            Checklist
          </h2>
          {loading ? (
            <div className="reqveri-loading">
              <div className="reqveri-spinner"></div>
              <span>Loading...</span>
            </div>
          ) : (
            <ul className="reqveri-checklist">
              {reqcriList.map((criteria) => (
                <li key={criteria.reqcri_id}>
                  <label>
                    <input
                      type="checkbox"
                      className="reqveri-checkbox"
                      checked={checkboxState[criteria.reqcri_id] || false}
                      onChange={() => handleCheckboxChange(criteria.reqcri_id)}
                    />
                    {criteria.reqcri_name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="reqveri-box">
          <h2>
            <FontAwesomeIcon icon={faComment} className="reqveri-icon" />
            Comments
          </h2>
          <div className="reqveri-comment-container">
            <Comment verificationId={verificationId} />
          </div>
        </div>
      </div>

      <div className="reqveri-box reqveri-requirements">
        <h2>
          <FontAwesomeIcon icon={faClipboardCheck} className="reqveri-icon" />
          Requirements
        </h2>
        <table className="reqveri-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Requirements Statement</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {requirementsDetails.length > 0 ? (
              requirementsDetails.map((req, index) => (
                <tr key={index}>
                  <td>REQ-{req.requirement_id.toString().padStart(3, '0')}</td>
                  <td>{req.requirement_name}</td>
                  <td>{req.requirement_type}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center' }}>No requirements details found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="reqveri-button-container">
        <button className="reqveri-cancel-button" onClick={navigateBack}>
          Cancel
        </button>
        <button className="reqveri-save-button" onClick={handleSave}>
          <FontAwesomeIcon icon={faCheck} />
          Save
        </button>
      </div>
      
      {/* Custom Alert Component */}
      {showAlert && (
        <div className={`reqveri-alert show`} ref={alertRef}>
          <div className={`reqveri-alert-${alertType}`}>
            <div className="reqveri-alert-content">
              <div className="reqveri-alert-icon">
                {alertType === 'success' && <FontAwesomeIcon icon={faCheckCircle} />}
                {alertType === 'error' && <FontAwesomeIcon icon={faTimes} />}
                {alertType === 'warning' && <FontAwesomeIcon icon={faExclamationTriangle} />}
              </div>
              <span className="reqveri-alert-message">{alertMessage}</span>
            </div>
            <button className="reqveri-alert-close" onClick={handleCloseAlert}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <div className="reqveri-alert-progress"></div>
        </div>
      )}
    </div>
  );
};

export default ReqVerification;