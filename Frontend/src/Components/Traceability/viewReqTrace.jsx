import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../CSS/ViewEditReq.css';
import backtotrace from "../Traceability/image/arrow_left.png";

const ViewEditReq = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [requirement, setRequirement] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // ฟังก์ชันแยกวันที่และเวลา
    const formatDate = (dateString) => {
        const date = new Date(dateString);

        // จัดรูปแบบวันที่
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // เดือนเริ่มจาก 0
        const year = date.getFullYear();

        // จัดรูปแบบเวลา
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        const formattedDate = `${day}/${month}/${year}`; // วันที่ในรูปแบบ "DD/MM/YYYY"
        const formattedTime = `${hours}:${minutes}:${seconds}`; // เวลาในรูปแบบ "HH:mm:ss"

        return { date: formattedDate, time: formattedTime };
    };


    useEffect(() => {

        const fetchRequirement = async (requirementId) => {
            try {
                const response = await axios.get(`http://localhost:3001/requirement/${requirementId}`);

                setRequirement(response.data);
            } catch (error) {
                console.error('Error fetching requirement:', error);
            }
        };

        // ตรวจสอบค่า requirement จาก location หรือ URL
        if (location.state && location.state.requirement) {
            fetchRequirement(location.state.requirement.requirement_id);
            setRequirement(location.state.requirement);
            fetchHistory(location.state.requirement.requirement_id);
        } else if (location.search) {
            const queryParams = new URLSearchParams(location.search);
            const requirementId = queryParams.get('requirement_id');
            console.log('Fetched requirementId from URL:', requirementId);  // ตรวจสอบ requirement_id
            if (requirementId) {
                fetchRequirement(requirementId);
                fetchHistory(requirementId);  // ดึงประวัติ requirement
            }
        }
    }, [location]);

    // ดึงข้อมูล history ของ requirement
    const fetchHistory = async (requirementId) => {
        try {
            const response = await axios.get('http://localhost:3001/getHistoryByRequirementId', {
                params: { requirement_id: requirementId }
            });
            console.log('History Data:', response.data);  // ตรวจสอบข้อมูลที่ได้รับจาก API
            if (response.data && response.data.data) {
                setHistoryData(response.data.data);  // เก็บข้อมูลประวัติ
            } else {
                setHistoryData([]);  // ถ้าไม่มีข้อมูล
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false); // เปลี่ยนสถานะเมื่อโหลดเสร็จ
        }
    };

    const projectId = requirement?.project_id || 'defaultProjectId';

    if (!requirement) {
        return <p>Loading requirement data...</p>;
    }
    console.log("DST", historyData)
    console.log("DST2", requirement)

    return (
        <div>
            {/* First View Requirement Container */}
            <div className="view-requirement-container">
                <button
                    onClick={() =>
                        navigate(`/Dashboard?project_id=${projectId}`, {
                            state: { selectedSection: "Traceability" },
                        })
                    }
                    className="backreq-button"
                >
                    <img src={backtotrace} alt="backtoreq" className="backtoreq" />
                </button>
                <div className="view-requirement-header-with-button">
                    <h1 className="view-requirement-title">Requirement: {requirement.requirement_name}</h1>
                </div>

                <div className="view-requirement-header">
                    <p>
                        <strong className="view-requirement-label">ID:</strong> REQ-0{requirement.requirement_id}
                    </p>
                    <p>
                        <strong className="view-requirement-label">Type:</strong> {requirement.requirement_type}
                    </p>
                    <p>
                        <strong className="view-requirement-label">Status:</strong> {requirement.requirement_status}
                    </p>
                    <p>
                        <strong className="view-requirement-label">File ID:</strong>
                        <span>
                            {requirement.filereq_ids && requirement.filereq_ids.length > 0 ? (
                                <ul>
                                    {requirement.filereq_ids.map((filereq_id, index) => (
                                        <li
                                            key={index}
                                            className="file-item"
                                            onClick={() => {
                                                const file = {
                                                    filereq_id,  // จาก loop ที่คุณใช้ใน map
                                                    filereq_name: requirement.filereq_name || "ชื่อไฟล์ไม่สามารถดึงข้อมูลได้", // ให้แน่ใจว่า requirement.filereq_name มีข้อมูล
                                                    requirement_ids: requirement.requirement_id  // หรือข้อมูลที่จำเป็น
                                                };
                                                navigate(`/ViewFile?filereq_id=${file.filereq_id}`, { state: { file } });
                                            }}


                                        >
                                            {filereq_id}
                                        </li>
                                    ))}
                                </ul>



                            ) : (
                                <span>No File IDs available</span>
                            )}
                        </span>

                    </p>
                </div>
                <div className="view-requirement-text">
                    <p><strong className="view-requirement-description">Description:</strong></p>
                    <p className="view-requirement-paragraph">{requirement.requirement_description}</p>
                </div>
            </div>

            {/* Second View Requirement Container (History Table) */}
            <div className="view-requirement-container">
                <div className="view-requirement-header-with-button">
                    <h1 className="view-requirement-title">History Requirement: {requirement.requirement_name}</h1>
                </div>

                {/* Table for Requirement History */}
                <table className="requirement-history-table">
                    <thead>
                        <tr>
                            <th>Requirement Status</th>
                            <th>Date</th>
                            <th>Time</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loadingHistory ? (
                            <tr>
                                <td colSpan="3">Loading history...</td>
                            </tr>
                        ) : historyData.length > 0 ? (
                            historyData.map((history, index) => {
                                const { date, time } = formatDate(history.historyreq_at); // แยก date และ time
                                return (
                                    <tr key={index}>
                                        <td>{history.requirement_status}</td>
                                        <td>{date}</td> {/* แสดง Date */}
                                        <td>{time}</td> {/* แสดง Time */}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="3">No history available</td>
                            </tr>
                        )}
                    </tbody>

                </table>
            </div>
        </div>
    );
};

export default ViewEditReq;
