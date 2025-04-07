import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./CSS/VersionDesign.css"; // ตรวจสอบว่า import ไฟล์ CSS ที่ถูกต้อง
import backtoreq from "../image/arrow_left.png"; // ตรวจสอบ path รูปภาพ

const VersionDesign = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // รับ designList จาก location.state (จาก DesignPage)
  const { designList } = location.state || { designList: [] }; 

  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");

  // State สำหรับควบคุม Modal และข้อมูล
  const [showModal, setShowModal] = useState(false); // ควบคุมการแสดง/ซ่อน modal (ใช้ toggle class 'active')
  const [selectedDesign, setSelectedDesign] = useState(null); // ข้อมูล Design ที่ถูกเลือก
  const [historyData, setHistoryData] = useState([]); // ข้อมูลประวัติ
  const [loadingHistory, setLoadingHistory] = useState(true); // สถานะการโหลดประวัติ
  const [error, setError] = useState(null); // ข้อผิดพลาด

  // Log เตือนหาก designList ไม่ถูกส่งมา
  useEffect(() => {
    if (!designList || designList.length === 0) {
      console.warn("Design list is empty or not provided via location state.");
      // อาจจะ fetch ใหม่ที่นี่ หรือแสดงข้อความที่ชัดเจนกว่าเดิม
    }
  }, [designList]); 

  // Function Format วันที่เวลา
  const formatDate = (dateString) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' }; 
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) { 
             console.error("Invalid date string:", dateString);
             return { date: 'Invalid Date', time: '' };
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); 
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const formattedDate = `${day}/${month}/${year}`;
        const formattedTime = `${hours}:${minutes}:${seconds}`;
        return { date: formattedDate, time: formattedTime };
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return { date: 'Error', time: '' };
    }
  };

  // Function Fetch ประวัติ
  const fetchHistory = async (designId) => {
    setLoadingHistory(true);
    setError(null);
    try {
      const response = await axios.get("http://localhost:3001/getHistoryByDesignId", {
        params: { design_id: designId }, 
      });
      
      if (response.data && Array.isArray(response.data.data)) {
          setHistoryData(response.data.data);
          console.log("Fetched History Data:", response.data.data); 
      } else {
          console.error("Invalid history data received:", response.data);
          setHistoryData([]); 
          setError("Received invalid history data format.");
      }

    } catch (error) {
      setError("Error fetching design history. Please try again.");
      console.error("Error fetching design history:", error.response || error.message || error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Function เมื่อกดปุ่ม View
  const handleViewClick = (design) => {
    if (design && design.design_id != null) {
        setSelectedDesign(design); 
        setShowModal(true); // ตั้งค่าให้แสดง Modal (จะไปเพิ่ม class 'active')
        fetchHistory(design.design_id); 
    } else {
        console.error("Invalid design object passed to handleViewClick:", design);
        setError("Cannot view details for invalid design data.");
    }
  };

  // Function ปิด Modal
  const handleCloseModal = () => {
      setShowModal(false);
      // อาจจะ reset selectedDesign และ historyData ด้วยก็ได้ ถ้าต้องการให้โหลดใหม่ทุกครั้ง
      // setSelectedDesign(null);
      // setHistoryData([]);
  };

  // ตรวจสอบ designList ก่อน Render
  if (!Array.isArray(designList)) {
     console.error("designList received is not an array:", designList);
     return <div className="design-version-control-container error-message">Error: Invalid design data received. Please check the source page navigation.</div>;
  }

  return (
    // --- Main Container ---
    <div className="design-version-control-container"> 
      
      {/* --- Header --- */}
      <div className="design-version-control-header">
        <button
          className="design-version-control-backbutton"
          onClick={() =>
            navigate(`/Dashboard?project_id=${projectId}`, { // หรือกลับไปหน้า DesignPage? `/DesignPage?project_id=${projectId}`
              state: { selectedSection: "Design" }, 
            })
          }
        >
          <img
            src={backtoreq}
            alt="Back" // Alt text สั้นๆ
            className="backfromvercontrol" 
          />
          Back
        </button>
        <h1 className="design-version-control-title">Design Version Control</h1>
      </div>

      {/* --- Main Design List Table --- */}
      <div className="table-responsive"> {/* Optional: Wrapper for horizontal scroll if needed */}
        <table className="design-version-control-main-table">
          <thead>
            <tr>
              <th>Design ID</th>
              <th>Design Name</th> 
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {designList.length > 0 ? (
               designList.map((design) => (
                 (design && design.design_id != null) ? (
                     <tr key={design.design_id}>
                         <td>DES-{design.design_id}</td>
                         {/* ควรใช้ field เดียวกันกับที่ DesignPage ส่งมา */}
                         <td>{design.diagram_name || design.design_name || 'N/A'}</td> 
                         <td>
                         <button
                             className="design-version-control-button"
                             onClick={() => handleViewClick(design)}
                         >
                             View History
                         </button>
                         </td>
                     </tr>
                  ) : (
                     <tr key={`invalid-${Math.random()}`}>
                         <td colSpan="3" style={{ color: 'red' }}>Invalid design data entry</td>
                     </tr>
                  )
               ))
            ) : (
              <tr>
                 <td colSpan="3" style={{ textAlign: 'center', color: '#666' }}>No designs have been added to this project yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Modal (ควบคุมด้วย class 'active') --- */}
      {/* Modal จะอยู่ใน DOM เสมอ แต่จะแสดง/ซ่อนด้วย CSS ผ่าน class 'active' */}
      <div className={`design-version-control-modal ${showModal ? 'active' : ''}`}> 
        <div className="design-version-control-modal-content">
          
          {/* Render content เฉพาะเมื่อมี selectedDesign */}
          {selectedDesign && (
            <> 
              <h2>Design Details</h2>
              <p>
                <strong>Design ID:</strong> DES-{selectedDesign.design_id}
              </p>
              <p>
                <strong>Design Name:</strong> {selectedDesign.diagram_name || selectedDesign.design_name || 'N/A'}
              </p>
              
              <h2>Version History</h2>
              {error && <p className="error-message">{error}</p>}

              {/* --- History Table --- */}
              <div className="table-responsive"> {/* Optional: Wrapper for scroll */}
                <table className="design-version-control-history-table">
                  <thead>
                    <tr>
                      <th>Design ID</th> 
                      <th>Status</th> {/* สั้นลง */}
                      <th>Date</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingHistory ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#666' }}>Loading history...</td> 
                      </tr>
                    ) : historyData.length > 0 ? (
                      historyData.map((history) => { 
                        const historyKey = history.history_id; // ใช้ ID จาก DB เป็น Key
                        const { date, time } = formatDate(history.design_at); 
                        return (
                          <tr key={historyKey}>
                            <td style={{ color: '#666' }}>DES-{history.design_id}</td> 
                            <td>{history.design_status || 'N/A'}</td>
                            <td>{date}</td>
                            <td>{time}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#666' }}>No history available for this design.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* --- End History Table --- */}
              
              {/* --- Close Button --- */}
              <button className="close-button" onClick={handleCloseModal}> 
                Close
              </button>
            </>
          )} 
          {/* End Conditional Rendering of Modal Content */}

        </div>
      </div>
      {/* --- End Modal --- */}

    </div> 
    // --- End Main Container ---
  );
};

export default VersionDesign;