import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const VerifyTrace = () => {
    const navigate = useNavigate();
    const [verificationData, setVerificationData] = useState([]);
    const [traceData, setTraceData] = useState([]);
    const [checkboxState, setCheckboxState] = useState({});
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const createRound = queryParams.get("round");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const verificationResponse = await axios.get(
                    "http://localhost:3001/getVerificationTrace",
                    { params: { project_id: projectId, create_round: createRound } }
                );

                if (verificationResponse.data.success) {
                    // จัดกลุ่มข้อมูลโดยใช้ requirement_id เป็นหลัก
                    const groupedData = verificationResponse.data.data.reduce((acc, item) => {
                        const key = item.requirement_id;

                        // สร้าง entry ใหม่ถ้ายังไม่มี
                        if (!acc[key]) {
                            acc[key] = {
                                ...item,
                                details: [] // เก็บรายละเอียดทั้งหมดที่เกี่ยวข้อง
                            };
                        }

                        // เพิ่มรายละเอียดลงไป
                        acc[key].details.push({
                            veritrace_id: item.veritrace_id,
                            design_id: item.design_id,
                            implement_id: item.implement_id,
                            testcase_id: item.testcase_id,
                            veritrace_status: item.veritrace_status,
                            verification_by: JSON.parse(item.verification_by)
                        });

                        return acc;
                    }, {});

                    // แปลงเป็น array เพื่อง่ายต่อการ render
                    const processedData = Object.values(groupedData);
                    setVerificationData(processedData);
                } else {
                    alert("ไม่พบข้อมูลในรอบนี้");
                }

                const traceResponse = await axios.get(`http://localhost:3001/tracecriteria/${projectId}`);

                if (traceResponse.data.data && traceResponse.data.data.length > 0) {
                    setTraceData(traceResponse.data.data);

                    const savedCheckboxState = JSON.parse(localStorage.getItem(`checkboxState_${projectId}_${createRound}`)) || {};
                    const initialCheckboxState = traceResponse.data.data.reduce((acc, trace) => {
                        acc[trace.tracecriteria_id] = savedCheckboxState[trace.tracecriteria_id] || false;
                        return acc;
                    }, {});

                    setCheckboxState(initialCheckboxState);
                } else {
                    alert("ไม่พบข้อมูล Trace Criteria");
                }
            } catch (error) {
                console.error("Error fetching verification trace data", error);
                alert("เกิดข้อผิดพลาดในการดึงข้อมูล");
            }
        };

        fetchData();
    }, [projectId, createRound]);

    const handleCheckboxChange = (traceId) => {
        setCheckboxState((prevState) => {
            const newState = { ...prevState, [traceId]: !prevState[traceId] };
            localStorage.setItem(`checkboxState_${projectId}_${createRound}`, JSON.stringify(newState));
            return newState;
        });
    };

    const handleSave = async () => {
        const storedUsername = localStorage.getItem("username");

        if (!storedUsername) {
            toast.warning("ไม่พบข้อมูล reviewer กรุณาล็อกอินใหม่", {
                position: "top-right",
                autoClose: 1500,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            return;
        }

        const allChecked = Object.values(checkboxState).every((checked) => checked === true);
        const selectedCheckboxes = Object.keys(checkboxState).filter(
            (key) => checkboxState[key] === true
        );

        if (!allChecked) {
            const resetCheckboxState = { ...checkboxState };
            for (const trace of traceData) {
                if (!selectedCheckboxes.includes(String(trace.tracecriteria_id))) {
                    resetCheckboxState[trace.tracecriteria_id] = false;
                }
            }
            setCheckboxState(resetCheckboxState);

            toast.success("Criteria Checklist Saved", {
                position: "top-right",
                autoClose: 1500,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                onClose: () => navigate(`/viewVerifyTrace?project_id=${projectId}`),
            });
            return;
        }

        try {
            const updateRequests = verificationData.flatMap((item) =>
                item.details.map(async (detail) => {
                    return axios.put("http://localhost:3001/update-verification-trace", {
                        veritrace_id: detail.veritrace_id,
                        reviewer_name: storedUsername,
                    });
                })
            );

            await Promise.all(updateRequests);

            toast.success("บันทึกข้อมูลสำเร็จ", {
                position: "top-right",
                autoClose: 1500,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                onClose: () => {
                    navigate(`/viewVerifyTrace?project_id=${projectId}`);
                },
            });
        } catch (error) {
            console.error("❌ Error saving verification:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล", {
                position: "top-right",
                autoClose: 1500,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        }
    };

    // ตรวจสอบ status การ verify
    const isVerified = verificationData.some((item) =>
        item.details.some(detail => detail.veritrace_status === "VERIFIED")
    );

    return (
        <div>
            <h1>Verification Trace for Round {createRound}</h1>

            {isVerified && (
                <div className="verified-banner">
                    ✅ VERIFIED
                </div>
            )}

            <table className="traceability-table">
                <thead>
                    <tr>
                        <th>Requirement ID</th>
                        <th>Design ID</th>
                        <th>Code Component ID</th>
                        <th>Test Case ID</th>
                    </tr>
                </thead>
                <tbody>
                    {verificationData.map((requirement) => {
                        const uniqueDetails = [];
                        const seen = new Set();

                        // กรองค่าซ้ำออก
                        requirement.details.forEach((detail) => {
                            const key = `${detail.design_id}-${detail.implement_id}-${detail.testcase_id}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                uniqueDetails.push(detail);
                            }
                        });

                        return uniqueDetails.map((detail, idx) => (
                            <tr key={`${requirement.requirement_id}-${idx}`}>
                                {idx === 0 && (
                                    <td rowSpan={uniqueDetails.length} className="requirement-cell">
                                        <div className="reqid-trace">{`REQ-${requirement.requirement_id}`}</div>
                                    </td>
                                )}
                                <td>{`DE-${detail.design_id}`}</td>
                                <td>{`IMP-${detail.implement_id}`}</td>
                                <td>{`TC-${detail.testcase_id}`}</td>
                            </tr>
                        ));
                    })}
                </tbody>
            </table>


            {!isVerified && (
                <div className="tracecriteria-checklist-box">
                    <h2 className="tracecriteria-checklist-title">Trace Criteria Checklist</h2>
                    <ul className="tracecriteria-checklist-list">
                        {traceData.map((trace) => (
                            <li key={trace.tracecriteria_id} className="tracecriteria-checklist-item">
                                <label className="tracecriteria-checklist-label">
                                    <input
                                        type="checkbox"
                                        className="tracecriteria-checklist-checkbox"
                                        checked={checkboxState[trace.tracecriteria_id] || false}
                                        onChange={() => handleCheckboxChange(trace.tracecriteria_id)}
                                    />
                                    {trace.tracecriteria_name}
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {!isVerified && <button onClick={handleSave}>SAVE</button>}
        </div>
    );
};

export default VerifyTrace;