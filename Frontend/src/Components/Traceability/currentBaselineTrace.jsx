import React, { useEffect, useState } from 'react'; // ไม่จำเป็นต้องใช้ useMemo แล้ว
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './CSS/viewBaselineTrace.css'; // ใช้ Class เดิมจาก ViewBaselineTrace ได้
import { format } from 'date-fns'; // Import date-fns สำหรับจัดรูปแบบวันที่

// --- Component หลัก: CurrentBaselineTrace ---
// แสดงข้อมูลสรุปเฉพาะ Baseline Round ล่าสุด
const CurrentBaselineTrace = () => {
    // --- State ---
    const [latestBaselineEntry, setLatestBaselineEntry] = useState(null); // เก็บข้อมูลของรอบล่าสุดรอบเดียว
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const queryParams = new URLSearchParams(window.location.search);
    const projectId = queryParams.get("project_id");
    const navigate = useNavigate();

    // --- Effect: Fetch data and find latest ---
    useEffect(() => {
        setLoading(true);
        setError('');
        setLatestBaselineEntry(null); // รีเซ็ตข้อมูลเก่า
        setProjectName('');

        if (projectId) {
            // เรียก API ที่ดึง *รายการ* Baseline ทั้งหมด (เหมือน ViewBaselineTrace)
            axios.get(`http://localhost:3001/viewBaselineTrace?project_id=${projectId}`)
                .then(response => {
                    if (response.data && response.data.success) {
                        setProjectName(response.data.project_name || '');
                        const allBaselineData = Array.isArray(response.data.data) ? response.data.data : [];

                        if (allBaselineData.length > 0) {
                            // --- หากรองล่าสุด ---
                            // หาค่า baselinetrace_round สูงสุด
                            const maxRound = Math.max(...allBaselineData.map(item => item.baselinetrace_round));
                            // หา entry แรกที่ตรงกับรอบสูงสุดนั้น
                            const latestEntry = allBaselineData.find(item => item.baselinetrace_round === maxRound);

                            if (latestEntry) {
                                setLatestBaselineEntry(latestEntry); // เก็บข้อมูลรอบล่าสุดรอบเดียว
                                setError(''); // เคลียร์ Error ถ้าเจอข้อมูล
                            } else {
                                // กรณีนี้ไม่ควรเกิดถ้า maxRound มาจาก array เดียวกัน แต่ใส่ไว้กันพลาด
                                setError('Could not find details for the determined latest baseline round.');
                                setLatestBaselineEntry(null);
                            }
                        } else {
                            // ไม่มีข้อมูล Baseline เลยสำหรับโปรเจกต์นี้
                            setError('No baseline has been configured for this project.'); // ตั้ง Error เพื่อให้แสดงข้อความนี้
                            setLatestBaselineEntry(null);
                        }
                    } else {
                        // กรณี API ตอบ success: false หรือโครงสร้างผิด
                        console.error("API responded success=false or unexpected structure:", response.data);
                        setError(response.data?.message || 'Received unexpected data structure from server.');
                        setLatestBaselineEntry(null);
                        setProjectName('');
                    }
                })
                .catch(errorInstance => {
                    // จัดการ Error ทั่วไป (Network, Server Error อื่นๆ)
                    console.error("Error fetching baseline data:", errorInstance);
                    let errorMessage = '';
                    if (errorInstance.response) {
                        errorMessage = `Error: ${errorInstance.response.data?.message || errorInstance.response.statusText || `Status code ${errorInstance.response.status}`}`;
                    } else if (errorInstance.request) {
                        errorMessage = 'Error: No response from server. Please check network connection.';
                    } else {
                        errorMessage = `Error: ${errorInstance.message}`;
                    }
                    setError(errorMessage);
                    setLatestBaselineEntry(null);
                    setProjectName('');
                })
                .finally(() => {
                    setLoading(false); // หยุด Loading เมื่อเสร็จสิ้น
                });
        } else {
            // ไม่มี Project ID ใน URL
            setError('Project ID is missing in the URL.');
            setLoading(false);
        }
    }, [projectId]); // ทำงานใหม่เมื่อ projectId เปลี่ยน

    // --- Handler for View Button ---
    const handleViewRound = (round) => {
        // นำทางไปยังหน้า ViewBaselineRound เพื่อดู Detail ของรอบนั้น
        // ใช้ baselinetrace_round ที่ได้มา
        navigate(`/viewBaselineCurrent?project_id=${projectId}&round=${round}`);
    };

    // --- Render Logic ---
    return (
        <div className="view-baseline-container"> {/* ใช้ Class เดิม */}
            {/* ===== ส่วน Buttons และ Header (แสดงตลอด) ===== */}
            <div className="button-controls">
                {/* ปุ่ม Back อาจจะกลับไป Dashboard */}
                <button className="viewbaseline-to-trace" onClick={() =>
                    navigate(`/Dashboard?project_id=${projectId}`, {
                        state: { selectedSection: "Traceability" },
                    })
                }>Back</button>
            </div>

            {/* ปรับ Title ของหน้า */}
            <h2>Current Baseline Traceabiliity Record for Project: {projectName || (loading ? 'Loading...' : (error && !latestBaselineEntry ? '' : 'N/A'))}</h2>
            <div className="table-container">
                {loading ? (
                    <div className="loading-message" style={{ textAlign: 'center', padding: '20px' }}>
                        Loading latest baseline data...
                    </div>
                ) : error ? (
                    // แสดง Error จาก State (ซึ่งอาจเป็น "No baseline found" หรือ Error อื่น)
                    <div className="error-message" style={{ textAlign: 'center', padding: '20px', color: (error.startsWith('No baseline') ? 'grey' : 'red') }}> {/* สีเทาถ้าไม่พบ สีแดงถ้า Error อื่น */}
                        {error}
                    </div>
                ) : latestBaselineEntry ? ( // ตรวจสอบว่ามีข้อมูลรอบล่าสุดหรือไม่
                    // --- แสดงตารางที่มี *เฉพาะ* รอบล่าสุด ---
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
                            {/* แสดงแค่แถวเดียว โดยใช้ข้อมูลจาก latestBaselineEntry */}
                            <tr key={latestBaselineEntry.baselinetrace_round}>
                                <td>{`BL-${latestBaselineEntry.baselinetrace_round}`}</td>
                                <td>{latestBaselineEntry.baselinetrace_by || 'N/A'}</td>
                                <td>
                                    {latestBaselineEntry.baselinetrace_at
                                        // ใช้ format() จาก date-fns ที่ import มา
                                        ? format(new Date(latestBaselineEntry.baselinetrace_at), 'yyyy-MM-dd HH:mm:ss') // ปรับ format ตามต้องการ
                                        : 'N/A'
                                    }
                                </td>
                                <td>
                                    {/* ปุ่ม View จะนำทางไปดู Detail ของ Round นี้ */}
                                    <button onClick={() => handleViewRound(latestBaselineEntry.baselinetrace_round)}>View Details</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    // กรณี ไม่ Loading, ไม่มี Error แต่หา latestBaselineEntry ไม่เจอ (ไม่ควรเกิด ถ้าตั้ง Error ถูกต้อง)
                    <div className="no-data" style={{ textAlign: 'center', padding: '20px' }}>
                        No baseline information available.
                    </div>
                )}
            </div>
            {/* ===== จบส่วนเนื้อหาตาราง ===== */}
        </div>
    );
};

export default CurrentBaselineTrace;