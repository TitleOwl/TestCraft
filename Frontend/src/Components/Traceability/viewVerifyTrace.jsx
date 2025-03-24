import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/viewVerifyTrace.css";

const ViewVerifyTrace = () => {
    const [verificationData, setVerificationData] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [selectedReviewers, setSelectedReviewers] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const storedUsername = localStorage.getItem("username");


    // ดึงค่า project_id จาก URL
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:3001/getVerificationTrace');
                if (response.data.success) {
                    // กรองเฉพาะข้อมูลที่ตรงกับ project_id ที่อยู่ใน URL
                    const filteredData = response.data.data.filter(item => item.project_id == projectId);
                    setVerificationData(filteredData);
                } else {
                    alert('ไม่สามารถดึงข้อมูลได้');
                }
            } catch (error) {
                console.error('Error fetching verification trace data', error);
                alert('เกิดข้อผิดพลาดในการดึงข้อมูล');
            }
        };

        fetchData();
    }, [projectId]); // ใช้ projectId เป็น dependency เพื่ออัปเดตข้อมูลเมื่อเปลี่ยน project

    const groupedData = verificationData.reduce((acc, item) => {
        const round = item.create_round;
        if (!acc[round]) {
            acc[round] = [];
        }
        acc[round].push(item);
        return acc;
    }, {});

    const handleVerifyClick = (round, projectId, verificationBy) => {
        const reviewers = JSON.parse(verificationBy);

        if (!Object.keys(reviewers).includes(storedUsername)) {
            toast.error("❌ Permission Denied: คุณไม่มีสิทธิ์ Verify ในรอบนี้", {
                position: "top-center",
                autoClose: 3000, // ปิดอัตโนมัติใน 3 วินาที
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            return;
        }

        // ถ้ามีสิทธิ์ให้ไปหน้า Verify
        navigate(`/verifyTrace?project_id=${projectId}&round=${round}`);
    };

    const handleShowReviewers = (verificationBy) => {
        const parsedReviewers = JSON.parse(verificationBy);
        setSelectedReviewers(parsedReviewers);
        setShowPopup(true);
    };


    return (
        <div>
            <button className="backviewveri-trace" onClick={() =>
                navigate(`/Dashboard?project_id=${projectId}`, {
                    state: { selectedSection: "Traceability" },
                })
            }>Back</button>
            <h1>Verification Traceability Record</h1>
            <table className="verification-table">
                <thead>
                    <tr>
                        <th>Round</th>
                        <th>Created By</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Reviewers</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(groupedData).map((round) => {
                        const roundItems = groupedData[round];
                        const firstItem = roundItems[0];
                        const date = new Date(firstItem.verification_at);
                        const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

                        const reviewers = Array.from(new Set(
                            roundItems.flatMap(item => Object.keys(JSON.parse(item.verification_by)))
                        ));

                        return (
                            <tr key={round}>
                                <td>{round}</td>
                                <td>{firstItem.create_by}</td>
                                <td>{formattedDate}</td>
                                <td>{firstItem.veritrace_status}</td>
                                <td>
                                    <button onClick={() => handleShowReviewers(firstItem.verification_by)}>ดู Reviewers</button>
                                </td>
                                <td>
                                    <button onClick={() => handleVerifyClick(round, firstItem.project_id, firstItem.verification_by)}>
                                        Verify
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
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

export default ViewVerifyTrace;