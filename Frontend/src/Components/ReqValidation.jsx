import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./CSS/ReqValidation.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ReqValidation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const validationId = queryParams.get("validation_id");

  const { selectedRequirements } = location.state || {};
  const [requirementsDetails, setRequirementsDetails] = useState([]);
  const [attachedFile, setAttachedFile] = useState(null); // State สำหรับเก็บไฟล์ที่เลือก
  const [fileUploading, setFileUploading] = useState(false); // State เช็คว่ากำลังอัปโหลดหรือไม่
  const [uploadedFiles, setUploadedFiles] = useState([]); // State เก็บรายการไฟล์ที่อัปโหลดแล้ว

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const loggedInUser = localStorage.getItem("username");

  // Fetch requirements and validate query params
  useEffect(() => {
    if (!projectId || !validationId) {
      toast.error("Project ID or Validation ID is missing.");
      navigate("/ValidationList");
      return;
    }

    if (selectedRequirements && selectedRequirements.length > 0) {
      fetchRequirementsDetails(selectedRequirements);
      // Fetch uploaded files for the first requirement when component mounts or selection changes
      fetchUploadedFiles(selectedRequirements[0]); // << Pass the first requirement ID
    } else {
      toast.warn("No selected requirements found.");
      // Consider fetching files even if no requirements are selected,
      // if the file association is purely based on project/validation ID
    }

    fetchComments();
  }, [projectId, validationId, selectedRequirements, navigate]); // Dependencies

  const fetchRequirementsDetails = async (requirements) => {
    try {
      const response = await axios.get("http://localhost:3001/requirements", {
        params: { requirement_ids: requirements },
      });
      setRequirementsDetails(response.data);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      toast.error("Failed to fetch requirements details.");
    }
  };

  const handleSave = async () => {
    // --- การตรวจสอบ Input เบื้องต้น ---
    if (!projectId || !requirementsDetails || requirementsDetails.length === 0) {
        toast.warn("Project ID or requirements details are missing or empty.");
        return;
    }

    console.log("Saving validation for requirements:", requirementsDetails);

    try {
        // ดึง ID ทั้งหมดออกมา
        const requirementIds = requirementsDetails.map((req) => req.requirement_id);

        // Step 1: อัปเดตสถานะ Requirements เป็น "VALIDATED" ใน Backend (เหมือนเดิม)
        console.log(`Updating status to VALIDATED for IDs: ${requirementIds.join(', ')}`);
        await axios.put("http://localhost:3001/update-requirements-status-validated", {
            requirement_ids: requirementIds,
            requirement_status: "VALIDATED",
        });
        console.log("Status update successful.");

        // --- *** จุดที่แก้ไข: Loop เพื่อสร้าง History *** ---
        // Step 2: บันทึก History สำหรับแต่ละ Requirement
        console.log("Starting history creation loop for validation completion...");
        for (const requirementId of requirementIds) {
            // 2.1 ค้นหาข้อมูล requirement เต็มจาก state `requirementsDetails`
            const reqDetail = requirementsDetails.find(
                (req) => req.requirement_id === requirementId
            );

            if (!reqDetail) {
                console.error(`Could not find details for requirement ID: ${requirementId} in requirementsDetails. Skipping history creation.`);
                // อาจจะแจ้งเตือนเบาๆ หรือข้ามไปเลย
                // toast.warn(`Could not find details for REQ-${requirementId}, history not recorded.`);
                continue; // ข้ามไปทำ requirement ID ถัดไป
            }

            // 2.2 สร้าง historyReqData โดยใช้ข้อมูลที่พบ
            const historyReqData = {
                requirement_id: requirementId,
                requirement_name: reqDetail.requirement_name,         // <-- ดึงจาก details
                requirement_description: reqDetail.requirement_description, // <-- ดึงจาก details
                requirement_type: reqDetail.requirement_type,         // <-- ดึงจาก details
                requirement_status: "VALIDATED",                     // กำหนดสถานะ
            };

            console.log(`Sending history data for Req ID ${requirementId} (Validated):`, historyReqData);

            try {
                // 2.3 ส่งข้อมูลไปที่ historyReqWorking
                const historyResponse = await axios.post(
                    "http://localhost:3001/historyReqWorking",
                    historyReqData
                );

                if (historyResponse.status !== 200) {
                    console.error(`Failed to add history for requirement ID: ${requirementId}. Status: ${historyResponse.status}`, historyResponse.data);
                    toast.warn(`Failed to record history for REQ-${requirementId}`); // แจ้งเตือนเบาๆ
                } else {
                     console.log(`History added successfully for Req ID ${requirementId} (Validated)`);
                }
            } catch (historyError) {
                console.error(`Error sending history for requirement ID: ${requirementId}`, historyError.response?.data || historyError.message);
                toast.error(`Error recording history for REQ-${requirementId}. Check console.`);
                // อาจจะตัดสินใจว่าจะหยุด process หรือทำต่อ
            }
        } // --- จบ Loop ---
        console.log("Finished history creation loop for validation completion.");

        // Step 3: แจ้งเตือนสำเร็จ และ Navigate (เหมือนเดิม)
        toast.success("Status updated to VALIDATED successfully.");
        navigate(`/Dashboard?project_id=${projectId}`); // ไปยัง Dashboard หรือหน้าที่เหมาะสม

    } catch (error) {
        // จัดการ Error ตอนอัปเดต status หรือตอน loop สร้าง history (เหมือนเดิม)
        console.error("Error during validation save process:", error.response || error.message);
        // ตรวจสอบว่าเป็น error จาก axios หรือไม่
        const errorMessage = error.response?.data?.message || "Failed to update status or record history.";
        toast.error(errorMessage);
    }
};

  // Function เมื่อมีการเลือกไฟล์ใน input
  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
        setAttachedFile(event.target.files[0]);
    } else {
        setAttachedFile(null); // Clear if no file is selected
    }
  };

  // Function จัดการการอัปโหลดไฟล์
  const handleFileUpload = async () => {
    if (!attachedFile) {
        toast.warn("Please select a file to upload.");
        return;
    }
    // Ensure selectedRequirements exists and has at least one item
    if (!selectedRequirements || selectedRequirements.length === 0) {
      toast.error("Cannot upload file: No requirement selected.");
      return;
    }

    setFileUploading(true); // เริ่มการอัปโหลด, แสดง loading state

    const formData = new FormData();
    formData.append("file", attachedFile);
    // Ensure requirement_id and project_id are integers if the backend expects them
    formData.append("requirement_id", parseInt(selectedRequirements[0], 10));
    formData.append("project_id", parseInt(projectId, 10));
    // You might need validation_id as well, depending on your backend logic
    // formData.append("validation_id", parseInt(validationId, 10));

    try {
        await axios.post("http://localhost:3001/uploadfile-var", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("File uploaded successfully.");
        setAttachedFile(null); // เคลียร์ไฟล์ที่เลือกหลังจากอัปโหลดสำเร็จ
        document.getElementById('file-input').value = null; // Reset file input field
        fetchUploadedFiles(selectedRequirements[0]); // ดึงรายการไฟล์ใหม่หลังจากอัปโหลด
    } catch (error) {
        console.error("Error uploading file:", error.response || error.message);
        toast.error(`Failed to upload file: ${error.response?.data?.message || error.message}`); // แสดงข้อผิดพลาดจาก backend ถ้ามี
    } finally {
        setFileUploading(false); // สิ้นสุดการอัปโหลด
    }
};

// Function ดึงรายการไฟล์ที่อัปโหลดแล้วสำหรับ requirement ที่กำหนด
const fetchUploadedFiles = async (requirementId) => {
  try {
      const response = await axios.get(`http://localhost:3001/get-uploaded-files`, {
          params: { requirement_id: requirementId } // ใช้ requirementId ที่รับเข้ามา
      });
      console.log(response.data);
      setUploadedFiles(response.data); // เพิ่มการ setUploadedFiles
  } catch (error) {
      console.error("Error fetching uploaded files:", error);
      toast.error("Failed to fetch uploaded files.");
  }
};


// Fetch uploaded files effect - Removed the separate useEffect
// It's now called within the main useEffect and after successful upload

  // Function ดาวน์โหลดไฟล์
  const handleFileDownload = async (fileId, filename) => { // Added filename parameter
    try {
      const response = await axios.get(`http://localhost:3001/getfile/${fileId}`, {
        responseType: "blob", // สำคัญมาก: ต้องระบุ responseType เป็น blob
      });

      // สร้าง URL ชั่วคราวสำหรับ Blob object
      const fileURL = window.URL.createObjectURL(new Blob([response.data]));
      // สร้าง link element ชั่วคราว
      const link = document.createElement("a");
      link.href = fileURL;
      // ดึงชื่อไฟล์จาก header หรือใช้ชื่อที่ส่งมา (ถ้า backend ส่ง Content-Disposition header จะดีกว่า)
      const downloadFilename = filename || `Requirement_File_${fileId}`; // Fallback filename
      link.setAttribute("download", downloadFilename); // ตั้งชื่อไฟล์ตอนดาวน์โหลด
      // เพิ่ม link เข้าไปใน DOM และคลิกเพื่อเริ่มดาวน์โหลด
      document.body.appendChild(link);
      link.click();
      // ลบ link ออกจาก DOM และ revoke URL หลังจากดาวน์โหลด
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(fileURL);

    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file.");
    }
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3001/showvalicomment", {
        params: { validation_id: validationId },
      });
      setComments(response.data);
    } catch (error) {
      console.error("Failed to load comments:", error);
      // toast.error("Failed to load comments."); // Optional: Show error to user
    } finally {
      setLoading(false);
    }
  };
  const handleCommentSubmit = async () => {
    if (!newComment.trim()) {
      toast.warn("Please enter a comment!"); // ใช้ toast แทน alert
      return;
    }

    // --- START FIX ---
    // Check if requirements are selected before proceeding
    if (!selectedRequirements || selectedRequirements.length === 0) {
      toast.error("Cannot add comment: No requirement is associated with this validation session.");
      return;
    }

    // Assume the comment relates to the first selected requirement
    const requirementIdToSubmit = selectedRequirements[0];
    // --- END FIX ---

    try {
      const payload = {
        member_name: loggedInUser || "Anonymous", // Handle case where username might not be set
        comment_var_text: newComment,
        validation_id: validationId, // Should already be validated
        // --- FIX: Use the variable defined above ---
        requirement_id: requirementIdToSubmit,
      };

      // console.log("Submitting comment payload:", payload); // Optional: for debugging

      const response = await axios.post("http://localhost:3001/createvarcomment", payload);
      if (response.status === 201) { // Check for 201 Created status
        setNewComment(""); // เคลียร์ช่อง comment
        fetchComments(); // โหลด comment ใหม่
        toast.success("Comment posted.");
      } else {
        // Handle unexpected success status (e.g., 200 OK) if needed
        console.warn("Comment posted with status:", response.status);
        fetchComments();
      }
    } catch (error) {
      console.error("Error adding comment:", error.response || error.message);
      toast.error(`Failed to post comment: ${error.response?.data?.message || error.message}`);
    }
  };
  
  const handleCommentDelete = async (commentId) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        const response = await axios.delete(`http://localhost:3001/deletecomment/${commentId}`);
        if (response.status === 200) {
          toast.success("Comment deleted.");
          fetchComments(); // โหลดคอมเมนต์ใหม่
        } else {
          console.warn("Unexpected response status:", response.status);
          fetchComments();
        }
      } catch (error) {
        console.error("Error deleting comment:", error);
        toast.error(`Failed to delete comment: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  // Function format วันที่/เวลา ให้อ่านง่าย
  const formatDate = (dateString) => {
    if (!dateString) return "Invalid date";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", { // ใช้ locale ที่ต้องการ
      year: "numeric",
      month: "short", // ใช้ชื่อเดือนแบบย่อ หรือ 'long' สำหรับเต็ม
      day: "numeric",
      hour: "2-digit", // ใช้เลข 2 หลัก
      minute: "2-digit",
      // second: '2-digit', // ถ้าต้องการแสดงวินาที
      hour12: true, // ใช้รูปแบบ 12 ชั่วโมง (AM/PM)
    });
  };

  // Function แสดงผล Comments
  const renderComments = () => (
    <div className="comment-section box"> {/* Added 'box' class for consistency */}
      <h2>Comments</h2>
      {loading ? (
        <p>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p>No comments yet.</p> /* Added message for no comments */
      ) : (
        <div className="comments-list"> {/* Added a wrapper for comments */}
          {comments.map((comment) => (
            <div key={comment.comment_id} className="comment">
              <div className="comment-header">
                <span className="comment-name">{comment.member_name || 'Unknown User'}</span>
                <span className="comment-time">{formatDate(comment.comment_var_at)}</span>
              </div>
              <p className="comment-text">{comment.comment_var_text}</p>
              <div className="comment-footer">
                {/* อาจจะเพิ่มเงื่อนไขให้ลบได้เฉพาะ comment ของตัวเอง */}
                {/* {comment.member_name === loggedInUser && ( */}
                <button
                  className="delete-comment-button"
                  onClick={() => handleCommentDelete(comment.comment_id)}
                >
                  Delete
                </button>
                {/* )} */}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="comment-input">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows="3" // กำหนดจำนวนบรรทัดเริ่มต้น
        />
        <button onClick={handleCommentSubmit} disabled={!newComment.trim() || loading}>Post Comment</button> {/* Disable button if no text or loading */}
      </div>
    </div>
  );
  // Loading component
  const Loader = () => (
    <div className="Vali-loader-container">
      <div className="Vali-loader"></div>
      <p>Loading...</p>
    </div>
  );

  // Calculate validation progress
  const calculateProgress = () => {
    if (!requirementsDetails.length) return 0;
    // In a real app, you'd calculate based on completed validation steps
    // For demo, we'll assume fixed progress or progress based on uploaded files
    return uploadedFiles.length > 0 ? 75 : 25;
  };

  return (
    <div className="Vali-container">
      {/* Header */}
      <div className="Vali-header">
        <button className="Vali-back-button" onClick={() => navigate(`/Dashboard?project_id=${projectId}`)}>
          <span>←</span> Back to Dashboard
        </button>
        <h1 className="Vali-title">
          <span className="Vali-title-icon">📋</span> Requirement Validation
        </h1>
        <button className="Vali-save-button" onClick={handleSave}>
          Validate Requirements <span>✓</span>
        </button>
      </div>
      
      {/* Main content - two column layout */}
      <div className="Vali-content">
        <div className="Vali-main-column">
          {/* Requirements List */}
          <div className="Vali-box Vali-requirements">
            <h2><span className="Vali-icon">📝</span> Requirements List</h2>
            {loading ? (
              <Loader />
            ) : requirementsDetails.length > 0 ? (
              <table className="Vali-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Requirement Statement</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requirementsDetails.map((req) => (
                    <tr key={req.requirement_id}>
                      <td>REQ-{req.requirement_id.toString().padStart(3, "0")}</td>
                      <td>{req.requirement_name}</td>
                      <td><span className="Vali-type-badge">{req.requirement_type}</span></td>
                      <td><span className="Vali-status-badge">Pending Validation</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="Vali-empty-state">
                <p>No requirements found.</p>
              </div>
            )}
          </div>
          
          {/* Discussion Section */}
          <div className="Vali-comment-section">
            <h2><span className="Vali-icon">💬</span> Discussion</h2>
            {loading ? (
              <Loader />
            ) : comments.length > 0 ? (
              <div className="Vali-comments-list">
                {comments.map((comment) => (
                  <div key={comment.comment_id} className="Vali-comment">
                    <div className="Vali-comment-header">
                      <span className="Vali-comment-name">{comment.member_name}</span>
                      <span className="Vali-comment-time">{formatDate(comment.comment_var_at)}</span>
                    </div>
                    <p className="Vali-comment-text">{comment.comment_var_text}</p>
                    <div className="Vali-comment-footer">
                    <button
    className="Vali-delete-comment-button"
    onClick={() => handleCommentDelete(comment.comment_id)}
>
    Delete
</button>

                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="Vali-empty-state">
                <p>No comments yet. Start the conversation!</p>
              </div>
            )}
            <div className="Vali-comment-input">
              <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add your comment or validation notes here..." />
              <button onClick={handleCommentSubmit}>Post Comment</button>
            </div>
          </div>
        </div>
        
        {/* Right column */}
        <div className="Vali-side-column">
          {/* Validation Summary */}
          <div className="Vali-summary-card">
            <div className="Vali-summary-header">Validation Summary</div>
            <div className="Vali-summary-body">
              <div className="Vali-summary-item"><span className="Vali-summary-label">Requirements</span><span className="Vali-summary-value">{requirementsDetails.length}</span></div>
              <div className="Vali-summary-item"><span className="Vali-summary-label">Project ID</span><span className="Vali-summary-value">{projectId}</span></div>
              <div className="Vali-summary-item"><span className="Vali-summary-label">Validation Round</span><span className="Vali-summary-value">{validationId}</span></div>
            </div>
          </div>
          
          {/* Progress Tracking */}
          <div className="Vali-progress-card">
            <div className="Vali-progress-header">Validation Progress</div>
            <div className="Vali-progress-body">
              <div className="Vali-progress-bar">
                <div className="Vali-progress" style={{ width: `${calculateProgress()}%` }}></div>
              </div>
              <span className="Vali-progress-text">{calculateProgress()}% Complete</span>
            </div>
          </div>
          
          {/* File Upload Section */}
          <div className="Vali-document-card">
            <div className="Vali-document-header"><span className="Vali-icon">📄</span> Supporting Documents</div>
            <div className="Vali-document-body">
              <div className="Vali-file-drop-area">
                <input type="file" accept=".pdf" onChange={handleFileChange} id="file-input" />
                <label htmlFor="file-input" className="Vali-file-label">Drop PDF here or click to browse</label>
              </div>
              {attachedFile && (
                <div className="Vali-selected-file">
                  <span className="Vali-file-name">{attachedFile.name}</span>
                  <button className="Vali-upload-button" onClick={handleFileUpload} disabled={fileUploading}>{fileUploading ? "Uploading..." : "Upload"}</button>
                </div>
              )}
              {uploadedFiles.length > 0 && (
                <div className="Vali-uploaded-files">
                  <h3>Uploaded Files:</h3>
                  <ul>
                    {uploadedFiles.map((file) => (
                      <li key={file.file_validation_id}>
                        <span className="filename">{file.filename}</span>
                        <span className="upload-time"> - Uploaded at: {formatDate(file.upload_at)}</span>
                        <button onClick={() => handleFileDownload(file.file_validation_id, file.filename)} className="download-button">Download</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );  
};

export default ReqValidation;