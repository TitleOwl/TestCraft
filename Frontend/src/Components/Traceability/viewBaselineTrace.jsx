import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CSS/viewBaselineTrace.css'; // ตรวจสอบว่า path ถูกต้อง

const ViewBaselineTrace = () => {
  const [baselineData, setBaselineData] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // เก็บข้อความ Error ทั่วไป
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError('');
    setBaselineData([]);
    setProjectName(''); // รีเซ็ตชื่อโปรเจกต์ทุกครั้งที่โหลด

    if (projectId) {
      axios.get(`http://localhost:3001/viewBaselineTrace?project_id=${projectId}`)
        .then(response => {
          // เนื่องจาก Backend จะส่ง 200 OK เสมอถ้า project_id ถูกต้อง
          if (response.data && response.data.success) {
            setProjectName(response.data.project_name || ''); // ตั้งชื่อโปรเจกต์
            const data = Array.isArray(response.data.data) ? response.data.data : [];
            setBaselineData(data); // ตั้งข้อมูล baseline (อาจเป็น array ว่าง)
            setError(''); // เคลียร์ Error ถ้าสำเร็จ
          } else {
            // กรณี success: false หรือโครงสร้างไม่คาดคิดจาก Backend (แม้จะเป็น 200 OK)
            console.error("API responded success=false or unexpected structure:", response.data);
            setError(response.data?.message || 'Received unexpected data structure from server.');
            setBaselineData([]);
            setProjectName(''); // อาจจะเคลียร์ชื่อโปรเจกต์ด้วย
          }
        })
        .catch(errorInstance => {
          // .catch จะทำงานเมื่อเกิด Network Error หรือ Server ส่ง Status Code ที่ไม่ใช่ 2xx
          console.error("Error fetching baseline data:", errorInstance);
          let errorMessage = '';
          if (errorInstance.response) {
            // Server ตอบกลับมา แต่เป็น status error (เช่น 400, 404 Project Not Found, 500)
            errorMessage = `Error: ${errorInstance.response.data?.message || errorInstance.response.statusText || `Status code ${errorInstance.response.status}`}`;
            // ถ้าเป็น 404 Project Not Found อาจจะเคลียร์ projectName ด้วยก็ได้
            // if (errorInstance.response.status === 404) setProjectName('');
          } else if (errorInstance.request) {
            // Request ถูกส่งไป แต่ไม่ได้รับการตอบกลับ
            errorMessage = 'Error: No response from server. Please check network connection.';
          } else {
            // เกิดปัญหาตอนสร้าง Request
            errorMessage = `Error: ${errorInstance.message}`;
          }
          setError(errorMessage);
          setBaselineData([]);
          setProjectName(''); // เคลียร์ชื่อเมื่อเกิด Error
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setError('Project ID is missing in the URL.');
      setLoading(false);
    }
  }, [projectId]); // ทำงานใหม่เมื่อ projectId เปลี่ยน

  // คำนวณ unique rounds (เหมือนเดิม)
  const uniqueBaselineRounds = useMemo(() => {
    if (!Array.isArray(baselineData)) return [];
    const roundMap = new Map();
    baselineData.forEach(item => {
      if (item && typeof item.baselinetrace_round !== 'undefined') {
        if (!roundMap.has(item.baselinetrace_round)) {
          roundMap.set(item.baselinetrace_round, item);
        }
      }
    });
    return Array.from(roundMap.values());
  }, [baselineData]);

  const handleViewRound = (round) => {
    navigate(`/viewBaselineRound?project_id=${projectId}&round=${round}`);
  };

  // --- ส่วน Render ---
  return (
    <div className="view-baseline-container">
      {/* ===== ส่วนที่แสดงผลตลอดเวลา ===== */}
      <div className="button-controls">
        <button className="viewbaseline-to-trace" onClick={() =>
          navigate(`/Dashboard?project_id=${projectId}`, {
            state: { selectedSection: "Traceability" },
          })
        }>Back</button>

        <button className="setbaseline-trace" onClick={() => navigate(`/setBaselineTrace?project_id=${projectId}`)}>Set Baseline</button>
      </div>

      {/* แสดงชื่อโปรเจกต์ หรือสถานะ */}
      <h2>Baseline Traceability Record for Project: {projectName || (loading ? 'Loading...' : (error ? 'Error loading name' : 'N/A'))}</h2>
      {/* ===== จบส่วนที่แสดงผลตลอดเวลา ===== */}


      {/* ===== ส่วนเนื้อหาตาราง (แสดงตามเงื่อนไข) ===== */}
      <div className="table-container">
        {loading ? (
          // --- กรณีกำลังโหลด ---
          <div className="loading-message" style={{ textAlign: 'center', padding: '20px' }}>
            Loading baseline data...
          </div>
        ) : error ? (
          // --- กรณีเกิด Error อื่นๆ (ที่ไม่ใช่ Not Found ที่จัดการในตาราง) ---
          <div className="error-message" style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
            {error} {/* แสดง Error ทั่วไป */}
          </div>
        ) : (
          // --- ถ้าไม่ Loading และ ไม่มี Error ให้แสดงตาราง ---
          <table>
            <thead>
              <tr>
                <th>Baseline Round</th>
                <th>Set Baseline By</th>
                <th>Set Baseline At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {uniqueBaselineRounds.length > 0 ? (
                // --- ถ้ามีข้อมูล Baseline ---
                uniqueBaselineRounds.map((item) => ( // ใช้ item.baselinetrace_round เป็น key
                  <tr key={item.baselinetrace_round}>
                    <td>{`BL-${item.baselinetrace_round}`}</td>
                    <td>{item.baselinetrace_by || 'N/A'}</td>
                    <td>
                      {item.baselinetrace_at
                        ? new Date(item.baselinetrace_at).toISOString().split('T')[0]
                        : 'N/A'
                      }
                    </td>
                    <td>
                      <button onClick={() => handleViewRound(item.baselinetrace_round)}>View</button>
                    </td>
                  </tr>
                ))
              ) : (
                // --- ถ้าไม่มีข้อมูล Baseline (โหลดสำเร็จ แต่ data ว่าง) ---
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                    No baseline has been configured for this project
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {/* ===== จบส่วนเนื้อหาตาราง ===== */}
    </div>
  );
};

export default ViewBaselineTrace;