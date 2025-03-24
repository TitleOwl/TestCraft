import React, { useEffect, useState } from 'react';
import axios from 'axios';
import "./CSS/traceabilityPage.css";
import { useNavigate, useLocation } from 'react-router-dom';

const SetBaselineTrace = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [verifiedData, setVerifiedData] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [selectedReviewers, setSelectedReviewers] = useState([]);

    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    useEffect(() => {
        const fetchData = async () => {
            console.log("🔍 Project ID from URL:", projectId); // ✅ Debug ค่า projectId

            try {
                const response = await axios.get('http://localhost:3001/getVerificationTrace');
                console.log("📥 API Response:", response.data); // ✅ ดูว่ามีข้อมูลอะไรบ้าง

                if (response.data.success) {
                    let filteredData = response.data.data.filter(
                        item => item.veritrace_status === "VERIFIED" && item.project_id == projectId
                    );

                    console.log("✅ Filtered Data (project_id =", projectId, "):", filteredData); // ✅ ตรวจสอบข้อมูลหลังกรอง

                    // เก็บเฉพาะข้อมูลรอบล่าสุดของแต่ละรอบ
                    const uniqueRounds = {};
                    filteredData.forEach(item => {
                        if (!uniqueRounds[item.create_round]) {
                            uniqueRounds[item.create_round] = item;
                        }
                    });

                    setVerifiedData(Object.values(uniqueRounds));
                } else {
                    alert('ไม่สามารถดึงข้อมูลได้');
                }
            } catch (error) {
                console.error('❌ Error fetching verification trace data', error);
                alert('เกิดข้อผิดพลาดในการดึงข้อมูล');
            }
        };

        fetchData();
    }, [projectId]); // ✅ เพิ่ม dependency `projectId` เพื่อให้โหลดใหม่เมื่อ `URL` เปลี่ยน

    const handleShowReviewers = (verificationBy) => {
        try {
            const parsedReviewers = JSON.parse(verificationBy);
            setSelectedReviewers(parsedReviewers);
            setShowPopup(true);
        } catch (error) {
            console.error("❌ Error parsing reviewers", error);
            alert("ไม่สามารถแสดงข้อมูล Reviewers ได้");
        }
    };

    return (
        <div className="traceability-container">
            <h1 className="traceability-title">Set Baseline Traceability</h1>
            <table className="traceability-table">
                <thead>
                    <tr>
                        <th>Round</th>
                        <th>Created By</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Reviewers</th>
                        <th>Action</th>
                        <th>Set Baseline</th>
                    </tr>
                </thead>
                <tbody>
                    {verifiedData.length === 0 ? (
                        <tr>
                            <td colSpan="7" style={{ textAlign: "center", color: "red" }}>
                                ❌ ไม่มีข้อมูลสำหรับโปรเจกต์นี้
                            </td>
                        </tr>
                    ) : (
                        verifiedData.map((item, index) => (
                            <tr key={index}>
                                <td>{item.create_round}</td>
                                <td>{item.create_by}</td>
                                <td>{new Date(item.verification_at).toLocaleDateString()}</td>
                                <td>{item.veritrace_status}</td>
                                <td>
                                    <button onClick={() => handleShowReviewers(item.verification_by)}>
                                        ดู Reviewers
                                    </button>
                                </td>
                                <td>
                                    <button onClick={() => alert('Verify')}>Verify</button>
                                </td>
                                <td>
                                    <button onClick={() => navigate(`/createBaselineTrace?project_id=${projectId}&round=${item.create_round}`)}>
                                        Set Baseline
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {showPopup && (
                <div className="popup-trace">
                    <div className="popup-trace-reviewer">
                        <h2>Reviewers</h2>
                        <ul>
                            {Object.entries(selectedReviewers).map(([reviewer, status], index) => (
                                <li key={index}>
                                    {reviewer} {status ?
                                        <span style={{ color: 'green', fontWeight: 'bold' }}>✅</span> :
                                        <span style={{ color: 'red', fontWeight: 'bold' }}>❌</span>
                                    }
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => setShowPopup(false)}>ปิด</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SetBaselineTrace;