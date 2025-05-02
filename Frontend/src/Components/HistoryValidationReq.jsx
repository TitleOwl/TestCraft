import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import './CSS/HistoryValidationReq.css'; // ตรวจสอบว่า import CSS ถูกต้อง

const HistoryValidationReq = () => {
  // --- State สำหรับข้อมูลแยกส่วน ---
  const [comments, setComments] = useState([]);
  const [filesData, setFilesData] = useState([]);
  // --- State สำหรับ Loading และ Error แยกส่วน (หรือรวมถ้าต้องการ) ---
  const [loading, setLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const [filesError, setFilesError] = useState("");
  const { requirementId } = useParams();
  const navigate = useNavigate();

  // --- Function สำหรับ Fetch ข้อมูลทั้งหมด ---
  const fetchAllData = useCallback(async () => {
    if (!requirementId) {
      setCommentsError("Requirement ID not found in URL.");
      setFilesError("Requirement ID not found in URL.");
      setLoading(false);
      setComments([]);
      setFilesData([]);
      return;
    }

    setLoading(true);
    setCommentsError("");
    setFilesError("");
    setComments([]); // เคลียร์ข้อมูลเก่า
    setFilesData([]); // เคลียร์ข้อมูลเก่า

    try {
      // ใช้ Promise.allSettled เพื่อรอให้ทั้งสอง fetch ทำงานเสร็จ ไม่ว่าสำเร็จหรือล้มเหลว
      const results = await Promise.allSettled([
        fetch(`http://localhost:3001/api/requirements/${requirementId}/comments`),
        fetch(`http://localhost:3001/api/requirements/${requirementId}/files`)
      ]);

      const [commentsResult, filesResult] = results;

      // --- ประมวลผล Comments ---
      if (commentsResult.status === 'fulfilled') {
        const response = commentsResult.value;
        if (!response.ok) {
          let errorText = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorText += ` - ${errorData.message || 'No specific message'}`;
          } catch {
             const textResponse = await response.text();
             errorText += ` - Server Response: ${textResponse || response.statusText}`;
          }
          throw new Error(errorText); // โยน Error เพื่อให้ catch ด้านล่างจัดการ
        }
        const data = await response.json();
        console.log("Fetched Comments:", data);
        setComments(Array.isArray(data) ? data : []);
      } else {
        // กรณี fetch comments ล้มเหลว (network error etc.)
        console.error("Error fetching comments:", commentsResult.reason);
        setCommentsError(`Failed to load comments: ${commentsResult.reason?.message || 'Network error'}.`);
      }

      // --- ประมวลผล Files ---
      if (filesResult.status === 'fulfilled') {
        const response = filesResult.value;
        if (!response.ok) {
           let errorText = `HTTP error! status: ${response.status}`;
           try {
             const errorData = await response.json();
             errorText += ` - ${errorData.message || 'No specific message'}`;
           } catch {
              const textResponse = await response.text();
              errorText += ` - Server Response: ${textResponse || response.statusText}`;
           }
          throw new Error(errorText); // โยน Error เพื่อให้ catch ด้านล่างจัดการ
        }
        const data = await response.json();
        console.log("Fetched Files:", data);
        setFilesData(Array.isArray(data) ? data : []);
      } else {
         // กรณี fetch files ล้มเหลว
        console.error("Error fetching files:", filesResult.reason);
        setFilesError(`Failed to load files: ${filesResult.reason?.message || 'Network error'}.`);
      }

    } catch (error) {
      // Catch error ที่โยนมาจากข้างบน (เช่น HTTP error) หรือ error อื่นๆ
      console.error("Error during data fetching:", error);
      // อาจจะตั้ง error รวม หรือแยกตามที่ทำข้างบนแล้ว
      if (!commentsError && !filesError) { // ถ้ายังไม่มี error เฉพาะ ให้ตั้ง error รวม
         const generalError = `Failed to load data: ${error.message}.`;
         setCommentsError(generalError); // แสดง error ที่ส่วน comments หรือสร้าง state error รวม
         setFilesError(generalError); // แสดง error ที่ส่วน files ด้วย
      }
    } finally {
      setLoading(false); // สิ้นสุด loading หลังทุกอย่างเสร็จสิ้น
    }
  }, [requirementId]); // useCallback dependency

  // --- useEffect เรียก fetchAllData ---
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]); // เรียก fetchAllData เมื่อ function หรือ requirementId เปลี่ยน

  // --- Functions เดิม (navigateBack, formatDateTime, createDownloadLink) ---
  const navigateBack = () => {
    navigate(-1);
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "N/A";
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateTimeString;
    }
  };

  const createDownloadLink = (base64Data, fileName, key) => {
    if (!base64Data) return null;
    const mimeType = "application/pdf"; // หรือ根據實際檔案類型調整
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);

      // ใช้ key จาก file_validation_id ถ้ามี
      return (
        <a key={key || fileName} href={url} download={fileName} className="HistoryValidationReq__file-link">
          {fileName}
        </a>
      );
    } catch (error) {
      console.error("Error creating download link for:", fileName, error);
      return <span key={key || fileName} className="HistoryValidationReq__file-error">Error creating link for {fileName}</span>;
    }
  };


  // --- ส่วน Render ---
  return (
    <div className="HistoryValidationReq">
      {/* Header เหมือนเดิม */}
      <div className="HistoryValidationReq__header">
        <button className="HistoryValidationReq__back-btn" onClick={navigateBack} title="Go back">
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1 className="HistoryValidationReq__title">
          Validation History {requirementId ? `for REQ-${requirementId}` : ''}
        </h1>
        <div className="HistoryValidationReq__header-placeholder"></div>
      </div>

      {/* --- Loading Indicator --- */}
      {loading && <p className="HistoryValidationReq__loading">Loading history...</p>}

      {/* --- ส่วนแสดง Comments --- */}
      {!loading && (
        <div className="HistoryValidationReq__comments-section">
          <h2 className="HistoryValidationReq__section-title">Comments</h2>
          {commentsError && <p className="HistoryValidationReq__error">Error loading comments: {commentsError}</p>}
          {!commentsError && comments.length === 0 && (
             <p className="HistoryValidationReq__no-data">ไม่มีรายการ Comment</p>
          )}
          {!commentsError && comments.length > 0 && (
            <div className="HistoryValidationReq__table-container">
              <table className="HistoryValidationReq__table">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Comment</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map((item) => ( // ใช้ comment_var_id เป็น key
                    <tr key={item.comment_var_id}>
                      <td data-label="Member Name">{item.member_name || "N/A"}</td>
                      <td data-label="Comment" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {item.comment_var_text || <span className="HistoryValidationReq__no-comment">No comment</span>}
                      </td>
                      <td data-label="Timestamp">{formatDateTime(item.comment_var_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- ส่วนแสดง Files --- */}
      {!loading && (
          <div className="HistoryValidationReq__files-section">
            <h2 className="HistoryValidationReq__section-title">Related Files</h2>
            {filesError && <p className="HistoryValidationReq__error">Error loading files: {filesError}</p>}
            {!filesError && filesData.length === 0 && (
                 <p className="HistoryValidationReq__no-data">No related files found for this requirement.</p>
            )}
            {!filesError && filesData.length > 0 && (
                <div className="HistoryValidationReq__files-container">
                  <ul className="HistoryValidationReq__file-list">
                      {filesData.map((item, index) => {
                          // ใช้ file_validation_id สร้างชื่อไฟล์และเป็น key
                          const fileName = `REQ-${requirementId}-validation-${item.file_validation_id || `file${index}`}.pdf`;
                          const downloadLink = createDownloadLink(item.filereq_data, fileName, item.file_validation_id);
                          return downloadLink ? (
                              <li key={item.file_validation_id || `file-item-${index}`}>
                                  {downloadLink}
                              </li>
                          ) : null;
                      })}
                  </ul>
                </div>
            )}
          </div>
      )}

       {/* --- ข้อความแจ้งเตือนหากไม่มี ID --- */}
      {!loading && !requirementId && (
          <p className="HistoryValidationReq__error">Cannot load history: Requirement ID not provided in the URL.</p>
      )}
    </div>
  );
};

export default HistoryValidationReq;