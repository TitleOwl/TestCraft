import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import "./testcase_css/ExecutionList.css"; // ตรวจสอบ path ให้ถูกต้อง

const ExecutionList = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const project_id = queryParams.get("project_id");
    const [testExecutions, setTestExecutions] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (project_id) {
            axios
                .get(`http://localhost:3001/api/testcase_executions?project_id=${project_id}`)
                .then((response) => {
                    console.log("Fetched data:", response.data);
                    setTestExecutions(response.data);
                })
                .catch((error) => console.error("Error fetching test executions:", error));
        }
    }, [project_id]);

    // ฟังก์ชัน formatDate ยังคงทำหน้าที่ format วันที่ที่ *มีอยู่*
    // หรือคืนค่าที่บอกว่า format ไม่ได้ (เช่น Invalid Date, Error)
    // หรืออาจจะคืนค่า null/undefined ถ้าไม่มี dateString มาแต่แรก
    const formatDate = (dateString) => {
        // ถ้าไม่มีข้อมูลวันที่แต่แรก ให้คืนค่า null เพื่อให้ส่วนแสดงผลจัดการต่อ
        if (!dateString) {
             return null;
        }

        const options = {
            day: "2-digit",
            month: "long", // หรือ 'short' หรือ 'numeric'
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false, // ใช้รูปแบบ 24 ชั่วโมง
            // locale ควรเป็น en-US หรือ en-GB เพื่อให้ชื่อเดือนเป็นภาษาอังกฤษ
            // timeZone: 'Asia/Bangkok' // Optional
        };

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.warn("Invalid date string received for formatting:", dateString);
                return "Invalid Date"; // คืนค่าเมื่อ format ไม่ได้จริงๆ
            }
            // ใช้ locale 'en-US' หรือ 'en-GB' เพื่อให้ผลลัพธ์เป็นภาษาอังกฤษ
            return date.toLocaleString("en-US", options);
        } catch (error) {
            console.error("Error formatting date:", dateString, error);
            return "Error"; // คืนค่าเมื่อเกิดข้อผิดพลาด
        }
    };

    const filteredExecutions = testExecutions.filter((execution) =>
        // ตรวจสอบให้แน่ใจว่า execution.testcase_id มีค่าก่อนเรียก toString()
        execution.testcase_id?.toString().includes(searchTerm) ||
        // หรือจะค้นหาจาก testcase_name ด้วยก็ได้ (ถ้าต้องการ)
        execution.testcase_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );


    const handleNavigate = (execution) => {
         // ควรเปรียบเทียบ status เป็นตัวพิมพ์ใหญ่ถ้า backend ส่งมาเป็นตัวพิมพ์ใหญ่
        if (execution.testcase_status !== "BASELINE") {
            Swal.fire({
                icon: "warning",
                title: "Cannot Proceed", // เปลี่ยนเป็นภาษาอังกฤษ
                text: "This Test Case is not yet in BASELINE status.", // เปลี่ยนเป็นภาษาอังกฤษ
                confirmButtonText: "OK", // เปลี่ยนเป็นภาษาอังกฤษ
            });
        } else {
            console.log(`Navigating to TestExecution for testcase ${execution.testcase_id} with project_id ${project_id}`);
            navigate(`/TestExecution/${execution.testcase_id}?project_id=${project_id}`);
        }
    };

    return (
        <div className="execution-list">
            <button onClick={() => navigate(`/Dashboard?project_id=${project_id}`, { state: { selectedSection: "Testcase" } })}>
                Back
            </button>
            <h2>Test Execution</h2>
            <div className="search-bar-execution-list">
                <input
                    type="text"
                    placeholder="Search by Test Case ID or Title" // ปรับ placeholder
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Execute Status</th>
                        <th>Recent Test Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredExecutions.length > 0 ? (
                        filteredExecutions.map((execution) => {
                            // พยายามหา key ที่ unique จริงๆ ถ้า testcase_id อาจซ้ำได้ในบางกรณี
                            // อาจใช้ execution.test_execution_id ถ้ามี
                            const rowKey = execution.test_execution_id || `exec-${execution.testcase_id}-${Math.random()}`;

                            // --- *** แก้ไขส่วนแสดงผลวันที่ตรงนี้ *** ---
                            const formattedDate = execution.recent_date ? formatDate(execution.recent_date) : null;

                            return (
                                <tr key={rowKey}>
                                    <td>TC-{execution.testcase_id?.toString().padStart(3, "0") ?? 'N/A'}</td>
                                    <td>{execution.testcase_name || "N/A"}</td>
                                    <td>{execution.test_execution_status || "N/A"}</td>
                                    <td>
                                        {formattedDate // ถ้า formatDate คืนค่ามา (ไม่ใช่ null) ให้แสดงค่านั้น
                                            ? formattedDate
                                            : "No execution date" // ถ้าไม่มีวันที่ ให้แสดงข้อความนี้
                                        }
                                    </td>
                                    <td>
                                        <button
                                            className="execute-btn-execution-list"
                                            onClick={() => handleNavigate(execution)}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            );
                         })
                    ) : (
                        <tr>
                            <td colSpan="5" className="no-data-execution-list">
                                {searchTerm ? "No test executions match your search." : "No test executions found for this project."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ExecutionList;