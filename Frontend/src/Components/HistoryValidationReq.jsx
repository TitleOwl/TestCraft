import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import './CSS/HistoryValidationReq.css';

const HistoryValidationReq = () => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { requirementId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (requirementId) {
      setLoading(true);
      setError("");
      fetchHistoryData();
    } else {
      setError("Requirement ID not found in URL.");
      setLoading(false);
      setHistoryData([]);
    }
  }, [requirementId]);

  const fetchHistoryData = async () => {
    // ... (โค้ด fetchHistoryData เหมือนเดิม) ...
    try {
      const response = await fetch(`http://localhost:3001/api/requirements/${requirementId}/history`);
      if (!response.ok) {
        let errorText = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorText += ` - ${errorData.message || 'No specific message'}`;
        } catch (jsonError) {
          errorText += ` - ${response.statusText}`;
        }
        throw new Error(errorText);
      }
      const data = await response.json();
      console.log("Fetched Data:", data);
      setHistoryData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching validation history:", error);
      setError(`Failed to load history: ${error.message}`);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateBack = () => {
    navigate(-1);
  };

  const formatDateTime = (dateTimeString) => {
    // ... (โค้ด formatDateTime เหมือนเดิม) ...
    if (!dateTimeString) return "N/A";
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    } catch (e) {
      return dateTimeString;
    }
  };

 // ***** แก้ไข Helper สร้าง link download file *****
 const createDownloadLink = (base64Data, fileName, key) => {
     if (!base64Data) return null;
     // ----- เปลี่ยน MIME Type เป็น application/pdf -----
     const mimeType = "application/pdf";
     return (
         <a key={key} href={`data:${mimeType};base64,${base64Data}`} download={fileName}>
             {fileName} {/* แสดงชื่อไฟล์ */}
         </a>
     );
 }

  // --- กรองข้อมูลเฉพาะที่มีไฟล์ ---
  const fileEntries = historyData.filter(item => item.filereq_data);

  return (
    <div className="HistoryValidationReq">
      <div className="HistoryValidationReq__header">
         <button className="HistoryValidationReq__back-btn" onClick={navigateBack}>
           <FontAwesomeIcon icon={faArrowLeft} /> Back
         </button>
         <h1 className="HistoryValidationReq__title">
           Validation History {requirementId ? `for REQ-${requirementId}` : ''}
         </h1>
         <div></div> {/* Placeholder */}
      </div>

      {/* แสดง Loading หรือ Error */}
      {loading && <p className="HistoryValidationReq__loading">Loading history...</p>}
      {error && <p className="HistoryValidationReq__error">Error: {error}</p>}

      {/* --- ส่วนแสดงตารางหลัก (ไม่มีคอลัมน์ File) --- */}
      {!loading && !error && (
        <div className="HistoryValidationReq__table-container">
          {historyData.length > 0 ? (
            <table className="HistoryValidationReq__table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Comment</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                 {historyData.map((item, index) => (
                   <tr key={item.comment_var_id || `history-${index}`}>
                     <td>{item.member_name || "N/A"}</td>
                     <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                         {item.comment_var_text || "No comment"}
                     </td>
                     <td>{formatDateTime(item.comment_var_at)}</td>
                   </tr>
                 ))}
              </tbody>
            </table>
          ) : (
            <p className="HistoryValidationReq__no-data">No validation history found.</p>
          )}
        </div>
      )}

      {/* --- ส่วนแสดงไฟล์ที่เกี่ยวข้อง (เพิ่มเข้ามาใหม่) --- */}
      {!loading && !error && fileEntries.length > 0 && (
          <div className="HistoryValidationReq__files-container">
              <h2>ไฟล์ที่เกี่ยวข้อง</h2>
              <ul className="HistoryValidationReq__file-list">
                  {fileEntries.map((item, index) => {
                      // ***** แก้ไขการสร้างชื่อไฟล์ เปลี่ยนนามสกุลเป็น .pdf *****
                      const fileName = `REQ-${requirementId}-validation-${item.comment_var_id || index}.pdf`;
                      // สร้าง link โดยใช้ helper function
                      const downloadLink = createDownloadLink(item.filereq_data, fileName, item.file_validation_id || `file-${index}`);
                      return downloadLink ? (
                          <li key={item.file_validation_id || `file-item-${index}`}>
                              {downloadLink}
                          </li>
                      ) : null;
                  })}
              </ul>
          </div>
      )}

       {/* แสดงเมื่อไม่มี ID */}
       {!loading && !requirementId && (
           <p className="HistoryValidationReq__error">Cannot load history: Requirement ID not provided.</p>
       )}
    </div>
  );
};

export default HistoryValidationReq;