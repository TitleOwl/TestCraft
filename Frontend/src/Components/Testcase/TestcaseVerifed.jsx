import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./testcase_css/TestcaseVerifed.css";
import { Data } from "emoji-mart";
import trash_comment from "../../image/trash_comment.png";  // ไอคอนลบคอมเมนต์

const TestcaseVerifed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const veriTestcaseId = queryParams.get("veritestcase_id");
  const { selectedTestcase = [] } = location.state || {};
  const [testcasecriList, setTestcasecriList] = useState([]);
  const [testcaseDetails, setTestcaseDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkboxState, setCheckboxState] = useState({});
  const [veritestcaseBy, setVeritestcaseBy] = useState({});
  const storedUsername = localStorage.getItem("username");
  const testcaseId = queryParams.get("testcase_id");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState(null);


  // ดึงข้อมูล veritestcase_by
  const fetchVeriTestcaseBy = useCallback(async () => {
    // เพิ่ม Guard Clause เช็ค ID ที่จำเป็นก่อน fetch
    if (!projectId || !veriTestcaseId || !testcaseId) return;
    try {
      const response = await axios.get("http://localhost:3001/testcaseveri", {
        params: { project_id: projectId, veritestcase_id: veriTestcaseId, testcase_id: testcaseId },
      });
      const veritestcase = response.data.find(
        (item) => item.id === parseInt(veriTestcaseId) // ตรวจสอบ type ให้ตรงกัน
      );
      setVeritestcaseBy(veritestcase?.veritestcase_by || {});
    } catch (error) {
      console.error("Error fetching veritestcase_by:", error);
      toast.error("Failed to load reviewer status."); // แจ้งผู้ใช้
    }
  }, [projectId, veriTestcaseId, testcaseId]);


  const fetchCriteria = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await axios.get(`http://localhost:3001/testcasecriteria/${projectId}`);
      const initialCheckboxState = response.data.reduce((acc, criteria) => {
        acc[criteria.testcasecri_id] = false;
        return acc;
      }, {});
      setTestcasecriList(response.data);

      // อ่านค่าจาก localStorage แค่ครั้งเดียวตอนโหลด (การย้าย setLoading ออกไปช่วยป้องกัน loop ตรงนี้ด้วย)
      if (storedUsername) {
        const storedCheckboxState = localStorage.getItem(
          `checkboxState_${storedUsername}_${projectId}_${veriTestcaseId}`
        );
        setCheckboxState(
          storedCheckboxState ? JSON.parse(storedCheckboxState) : initialCheckboxState
        );
      } else {
        setCheckboxState(initialCheckboxState); // ถ้าไม่มี username ก็ใช้ค่าเริ่มต้น
      }
    } catch (error) {
      console.error("Error fetching testcase criteria:", error);
      toast.error("Failed to load criteria checklist."); // แจ้งผู้ใช้
    }
  }, [projectId, veriTestcaseId, storedUsername]); // Dependencies ของ fetchCriteria

  const fetchTestcaseDetails = useCallback(async () => {
    if (!testcaseId) return;
    try {
      const response = await axios.get("http://localhost:3001/verifytestcase", {
        params: { testcase_id: testcaseId },
      });
      setTestcaseDetails(response.data);
    } catch (error) {
      console.error("Error fetching testcase details:", error);
      toast.error("Failed to load test case details."); // แจ้งผู้ใช้
    }
  }, [testcaseId]); // Dependencies ของ fetchTestcaseDetails

  const fetchComments = useCallback(async () => {
    if (!veriTestcaseId) return;
    try {
      // *** ตรวจสอบ URL Endpoint นี้ให้แน่ใจว่าถูกต้องใน Backend ***
      const response = await axios.get("http://localhost:3001/get-commentveritestcase", {
        params: { veritestcase_id: veriTestcaseId },
      });
      setComments(response.data);
    } catch (error) {
      console.error("Error fetching comments:", error);
      if (error.response && error.response.status === 404) {
        // ถ้า 404 อาจจะไม่ใช่ error ร้ายแรง แค่ไม่มีข้อมูล หรือ endpoint ผิด
        console.warn("Comment endpoint not found (404). Check API route.");
        // toast.warn("Could not fetch comments (endpoint not found)."); // แจ้งเตือนเบาๆ หรือไม่ต้องแจ้งก็ได้
        setComments([]); // ให้เป็น array ว่าง
      } else {
        toast.error("Failed to fetch comments."); // แจ้ง Error อื่นๆ
        setComments([]); // ให้เป็น array ว่าง
      }
    }
  }, [veriTestcaseId]); // Dependencies ของ fetchComments

  const handleCheckboxChange = (id) => {
    setCheckboxState((prevState) => {
      const updatedState = { ...prevState, [id]: !prevState[id] };

      localStorage.setItem(
        `checkboxState_${storedUsername}_${projectId}_${veriTestcaseId}`,
        JSON.stringify(updatedState)
      );

      return updatedState;
    });
  };
  useEffect(() => {
    // เพิ่มการตรวจสอบ ID ทั้งหมดก่อนเริ่ม fetch
    if (!projectId || !veriTestcaseId || !testcaseId) {
      console.error("Project ID, Verification ID, or Testcase ID is missing in URL.");
      toast.error("Required information is missing. Please go back and try again.");
      setLoading(false); // หยุด loading
      // อาจจะ navigate กลับ หรือแสดงข้อความใหญ่ๆ
      // navigate(`/VeriTestcase?project_id=${projectId || ''}`); // ลอง navigate กลับหน้า list
      return;
    }

    setLoading(true); // เริ่ม loading ก่อน fetch
    setError(null); // เคลียร์ error เก่า

    // เรียก fetch ทั้งหมดพร้อมกัน
    Promise.all([
      fetchCriteria(),
      fetchTestcaseDetails(),
      fetchVeriTestcaseBy()
      // fetchComments() อาจจะเรียกแยกต่างหาก หรือรวมไปด้วยก็ได้
    ]).catch(err => {
      console.error("Error during initial data fetch group:", err);
      // อาจจะตั้งค่า error state รวมที่นี่
      // setError("Failed to load initial page data.");
    }).finally(() => {
      setLoading(false); // หยุด loading เมื่อ fetch ทั้งหมดเสร็จ (หรือ error)
    });

    // *** เอา selectedTestcase ออก, เพิ่ม testcaseId และ functions ที่ใช้ useCallback ***
  }, [projectId, veriTestcaseId, testcaseId, navigate, fetchCriteria, fetchTestcaseDetails, fetchVeriTestcaseBy]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSave = async () => {
    console.log("testcase_id:", testcaseId); // testcaseId จาก query params

    if (!storedUsername) {
      toast.warning("ข้อมูล reviewer ขาดหาย กรุณารีเฟรชหน้า");
      return;
    }

    // ✅ ตรวจสอบว่า checklist ทั้งหมดถูกเลือก
    const allChecked = testcasecriList.every(criteria => !!checkboxState[criteria.testcasecri_id]); // ใช้ !! เพื่อความแน่นอน
    if (!allChecked) {
      toast.success("Save Criteria Checklist", {
        onClose: () => {
          navigate(`/VeriTestcase?project_id=${projectId}`);
        }
      });
      return;
    }


    try {
      // 1️⃣ ดึงข้อมูลปัจจุบันของ veritestcase (เหมือนเดิม)
      const { data } = await axios.get("http://localhost:3001/testcaseveri", {
        params: { project_id: projectId, veritestcase_id: veriTestcaseId },
      });

      console.log("API Response Data:", data);

      // หาข้อมูลที่ตรงกับ veriTestcaseId (เหมือนเดิม)
      const veritestcaseData = data.find(item => item.id === parseInt(veriTestcaseId));

      if (!veritestcaseData) { // เหมือนเดิม
        toast.error(`ไม่พบข้อมูล veritestcase ID: ${veriTestcaseId} กรุณาตรวจสอบใหม่`);
        return;
      }

      // 2️⃣ ตรวจสอบข้อมูล reviewer ปัจจุบัน (เหมือนเดิม)
      let currentVeritestcaseBy = veritestcaseData.veritestcase_by || {};

      // 3️⃣ อัปเดต reviewer โดยไม่ลบคนอื่น (เหมือนเดิม)
      const updatedVeritestcaseBy = { ...currentVeritestcaseBy, [storedUsername]: true };
      console.log("Updated veritestcase_by:", updatedVeritestcaseBy);

      // 4️⃣ ส่งข้อมูลอัปเดต reviewer ไปยังเซิร์ฟเวอร์ (เหมือนเดิม)
      const updateReviewerResponse = await axios.put("http://localhost:3001/update-veritestcase-by", {
        veritestcaseid: parseInt(veriTestcaseId), // เหมือนเดิม
        veritestcaseby: updatedVeritestcaseBy,
      });

      console.log("📤 ส่งข้อมูลอัปเดต reviewer:", updateReviewerResponse.data);

      // เหมือนเดิม
      if (updateReviewerResponse.status !== 200 || updateReviewerResponse.data.message?.includes("ไม่พบข้อมูล")) {
        toast.error(`ไม่สามารถอัปเดตข้อมูล reviewer ได้: ${updateReviewerResponse.data.message || 'Unknown error'}`);
        return;
      }

      // 5️⃣ ตรวจสอบว่า reviewer ทุกคนตรวจสอบครบหรือยัง (เหมือนเดิม)
      const { data: newData } = await axios.get("http://localhost:3001/testcaseveri", {
        params: { project_id: projectId, veritestcase_id: veriTestcaseId },
      });

      console.log("Updated API Response Data (newData):", newData);

      // เหมือนเดิม
      const latestVeritestcaseData = newData.find(item => item.id === parseInt(veriTestcaseId));

      if (!latestVeritestcaseData || typeof latestVeritestcaseData.veritestcase_by !== 'object') {
        toast.error("ไม่สามารถดึงข้อมูล reviewer ล่าสุดหลังการอัปเดตได้");
        return;
      }

      const latestVeritestcaseBy = latestVeritestcaseData.veritestcase_by || {}; // เหมือนเดิม
      const allReviewed = Object.keys(latestVeritestcaseBy).length > 0 && // เหมือนเดิม
        Object.values(latestVeritestcaseBy).every(status => status === true);

      console.log("All Reviewed:", allReviewed);

      if (!allReviewed) { // เหมือนเดิม
        toast.info("Your review has been saved, but other reviewers have not completed theirs.", {
          onClose: () => {
            navigate(`/Dashboard?project_id=${projectId}`, {
              state: { selectedSection: "Testcase" }
            });
          }
        });
        return;
      }

      const testcaseIdsArray = testcaseId // เหมือนเดิม
        .split(",")
        .map(id => id.trim())
        .filter(id => id && !isNaN(id));

      if (testcaseIdsArray.length === 0) { // เหมือนเดิม
        toast.error("ไม่พบข้อมูล testcase ID ที่ถูกต้องใน query parameter");
        return;
      }
      console.log("Testcase IDs to verify:", testcaseIdsArray);

      // 6️⃣ อัปเดตสถานะเป็น VERIFIED (เหมือนเดิม)
      const updateStatusResponse = await axios.put("http://localhost:3001/update-testcase-status-verified", {
        testcase_ids: testcaseIdsArray.map(id => parseInt(id)), // เหมือนเดิม
        testcase_status: "VERIFIED",
      });

      // 7️⃣ ตรวจสอบผลการอัปเดตสถานะ และเพิ่มการบันทึกต่างๆ
      if (updateStatusResponse.data.message?.includes("VERIFIED successfully")) { // เหมือนเดิม
        console.log("✅ Status updated to VERIFIED successfully.");

        // ---- ส่วนบันทึกข้อมูลเพิ่มเติม ----
        try {
          console.log("Attempting to save verification results and history..."); // ปรับ log เล็กน้อย
          const criteriaNames = testcasecriList.map(c => c.testcasecri_name); // เหมือนเดิม
          const reviewerNames = Object.keys(latestVeritestcaseBy); // เหมือนเดิม

          // วนลูปบันทึกสำหรับแต่ละ testcase ID
          for (const tcId of testcaseIdsArray) {
            const currentTcIdInt = parseInt(tcId); // แปลงเป็น Int เก็บไว้ใช้ซ้ำ

            // --- บันทึก Verification Result (เหมือนเดิม) ---
            const verificationResultPayload = {
              testcase_id: currentTcIdInt,
              verification_checklist: JSON.stringify(criteriaNames),
              verify_by: JSON.stringify(reviewerNames),
              project_id: parseInt(projectId),
              veritestcase_id: parseInt(veriTestcaseId)
            };
            console.log("💾 Saving payload to /save-testcase-verification-result:", verificationResultPayload);
            await axios.post('http://localhost:3001/save-testcase-verification-result', verificationResultPayload);
            console.log(`✅ Saved verification result for testcase ID: ${currentTcIdInt}`); // เพิ่ม log ความสำเร็จ

            // ***** ส่วนที่เพิ่มเข้ามา *****
            // --- บันทึก History Testcase ---
            const historyPayload = {
              testcase_id: currentTcIdInt, // ใช้ ID ที่แปลงเป็น Int แล้ว
              testcase_status: "VERIFIED"  // สถานะที่ต้องการบันทึก
            };
            console.log("📜 Saving payload to /addHistoryTestcase:", historyPayload);
            await axios.post('http://localhost:3001/addHistoryTestcase', historyPayload);
            console.log(`✅ Saved history for testcase ID: ${currentTcIdInt}`); // เพิ่ม log ความสำเร็จ
            // ***** จบส่วนที่เพิ่มเข้ามา *****

          } // จบ loop for

          // Log รวมหลัง loop เสร็จ (เหมือนเดิม)
          console.log("✅ Successfully saved verification results and history for all testcases.");

          // เคลียร์ localStorage (เหมือนเดิม)
          if (storedUsername) {
            const storageKey = `checkboxState_${storedUsername}_${projectId}_${veriTestcaseId}`;
            localStorage.removeItem(storageKey);
            console.log("Cleared localStorage state:", storageKey);
          }

          // แจ้งเตือนสำเร็จ (เหมือนเดิม)
          toast.success("Status updated to VERIFIED", {
            autoClose: 1200,
            onClose: () => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } }),
          });

        } catch (saveError) { // เหมือนเดิม (catch นี้จะครอบคลุม error จาก history save ด้วย)
          console.error("❌ Error during saving process (verification result or history):", saveError);
          toast.error("Status updated, but failed to save results or history. Please contact admin.");
          // navigate(`/Dashboard?project_id=${projectId}`); // ส่วนนี้เหมือนเดิม
        }
        // ---- สิ้นสุดส่วนบันทึกข้อมูลเพิ่มเติม ----

      } else { // เหมือนเดิม
        toast.error(`ไม่สามารถอัปเดตสถานะ testcase เป็น VERIFIED ได้: ${updateStatusResponse.data.message || 'Unknown error'}`);
      }
    } catch (error) { // เหมือนเดิม
      console.error("Error during handleSave process:", error);
      if (error.response) {
        console.error("Error Response Data:", error.response.data);
        toast.error(`เกิดข้อผิดพลาด: ${error.response.data.message || 'ไม่สามารถดำเนินการได้'}`);
      } else {
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ หรือการประมวลผลบางอย่าง");
      }
    }
  }; // --- สิ้นสุด handleSave ---
  const handleSubmit = async () => {
    if (!newComment.trim()) {
      setError("กรุณาใส่ข้อความก่อนโพสต์");
      return;
    }

    try {
      const response = await axios.post("http://localhost:3001/commentveritestcase", {
        member_name: storedUsername,
        comvertestcase_text: newComment,
        veritestcase_id: veriTestcaseId
      });

      if (response.status === 201) {
        setNewComment("");  // เคลียร์ช่องคอมเมนต์หลังจากโพสต์สำเร็จ
        fetchComments(); // โหลดคอมเมนต์ใหม่
        toast.success("The comment has been successfully added.", {
          autoClose: 2000,
        });
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("เกิดข้อผิดพลาดในการโพสต์คอมเมนต์");
    }
  };

  const handleDelete = async (comvertestcase_id) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const response = await axios.delete(`http://localhost:3001/delete-commentveritestcase/${comvertestcase_id}`);

      if (response.status !== 200) {
        throw new Error(response.data.error || "Failed to delete comment");
      }

      toast.success("Comment deleted successfully", {
        autoClose: 2000,
      });

      // อัปเดตรายการคอมเมนต์หลังจากลบ
      setComments((prevComments) =>
        prevComments.filter((comment) => comment.comvertestcase_id !== comvertestcase_id)
      );
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Error deleting comment: " + error.message);
    }
  };

  return (
    <div className="testcaseveri-container">
      <button onClick={() => navigate(`/VeriTestcase?project_id=${projectId}`)}>
        Back
      </button>
      <h1 className="title-testcasever">Verification Requirement</h1>
      <div className="testcase-verified-container">
        {/* Checklist Section */}
        <div className="checklistveri-testcase-box">
          <h2 className="checklistveri-testcase-title">Testcase Verification Checklist</h2>
          {loading ? (
            <p className="checklistveri-testcase-loading">Loading...</p>
          ) : (
            <ul className="checklistveri-testcase-list">
              {testcasecriList.map((criteria) => (
                <li key={criteria.testcasecri_id} className="checklistveri-testcase-item">
                  <label className="checklistveri-testcase-label">
                    <input
                      type="checkbox"
                      className="checklistveri-testcase-checkbox"
                      checked={checkboxState[criteria.testcasecri_id] || false}
                      onChange={() => handleCheckboxChange(criteria.testcasecri_id)}
                    />
                    {criteria.testcasecri_name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Comment Section */}
        <div className="commentveritestcase-box">
          <div className="commentveritestcase-section">
            <h2 className="commentveritestcase-title">Comments ({comments.length})</h2>

            {/* Post a new comment */}
            <div className="commentveritestcase-input-container">
              <textarea
                placeholder={`Add comment as ${storedUsername}...`}
                className="commentveritestcase-textarea"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button className="commentveritestcase-submit-button" onClick={handleSubmit}>
                Submit
              </button>
            </div>

            {/* Error Message */}
            {error && <p className="commentveritestcase-error-message">{error}</p>}

            {/* Display comments */}
            {comments.length === 0 ? (
              <p className="commentveritestcase-no-comments"></p>
            ) : (
              comments.map((comment) => (
                <div key={comment.comvertestcase_id} className="commentveritestcase-item">
                  <div className="commentveritestcase-header">
                    <span className="commentveritestcase-name">{comment.member_name}</span>
                    <span className="commentveritestcase-time">{new Date(comment.comvertestcase_at).toLocaleString()}</span>
                  </div>
                  <p className="commentveritestcase-text">{comment.comvertestcase_text}</p>
                  <div className="commentveritestcase-footer">
                    <button
                      className="commentveritestcase-delete-button"
                      onClick={() => handleDelete(comment.comvertestcase_id)}
                    >
                      <img src={trash_comment} alt="Delete" className="commentveritestcase-trash" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>


      <div className="boxrequirement-testcaseveri">
        <h1 className="title-softwaretestcase">Testcase</h1>
        <table className="table-req-testcaseveri">
          <thead>
            <tr><th>ID</th><th>Testcase Name</th><th>Type</th></tr>
          </thead>
          <tbody>
            {testcaseDetails.length > 0 ? (
              testcaseDetails.map((testcase) => (
                <tr key={testcase.testcase_id}>
                  <td>TC-00{testcase.testcase_id}</td>
                  <td>{testcase.testcase_name || "N/A"}</td>
                  <td>{testcase.testcase_type || "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">No testcase details found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="button-container">
        <button onClick={handleSave} className="savetestcaseveri-button">Save</button>
      </div>
    </div>
  );
};

export default TestcaseVerifed;
