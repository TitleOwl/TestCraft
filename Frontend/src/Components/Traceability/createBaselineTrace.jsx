import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/traceabilityPage.css"; // ตรวจสอบ Path
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Import CSS ของ Toastify

// Helper function: แปลง Nested Data เป็น Flat Rows (แก้ไขให้รวมชื่อ)
const flattenNestedDataForTable = (data) => {
    const flatRows = [];
    if (!Array.isArray(data) || data.length === 0) return flatRows;

    data.forEach(req => {
        const reqId = req.RequirementID;
        // *** ดึงชื่อ Requirement ***
        const reqName = req.RequirementName || `Requirement ${reqId}`;
        const designs = Array.isArray(req.Designs) ? req.Designs : [];
        let reqRowCount = 0;
        let isFirstReqRow = true;

        // ใน CreateBaseline ไม่จำเป็นต้องแสดง Requirement ที่ไม่มี Design เลยก็ได้
        // แต่ถ้าต้องการแสดง ให้ปรับ Logic ตรงนี้ (ปัจจุบันคือข้ามไป)
        if (designs.length === 0) {
            // ถ้าต้องการแสดง Req ที่ไม่มี Design:
            /*
            reqRowCount = 1;
            flatRows.push({
                key: `req-${reqId}-no-design`,
                reqId: `REQ-${reqId}`,
                reqName: reqName, // << เพิ่ม reqName
                designId: "-", designName: "-",
                implId: "-", implFile: null,
                testCaseId: "-", testCaseName: "-",
                isFirstReqRow: true, reqRowSpan: 1,
                isFirstDesignRow: true, designRowSpan: 1,
                isFirstImplRow: true, implRowSpan: 1,
            });
            */
            return; // ข้าม Requirement ที่ไม่มี Design (ตามโค้ดเดิม)
        }

        designs.forEach(design => {
            const designId = design.DesignID;
            // *** ดึงชื่อ Design ***
            const designName = design.DiagramName || `Design ${designId}`;
            const implementations = Array.isArray(design.Implementations) ? design.Implementations : [];
            let designRowCount = 0;
            let isFirstDesignRow = true;

            if (implementations.length === 0) {
                designRowCount = 1;
                flatRows.push({
                    key: `req-${reqId}-design-${designId}-no-impl`,
                    reqId: `REQ-${reqId}`,
                    reqName: reqName, // << เพิ่ม reqName
                    designId: `DE-${designId}`,
                    designName: designName, // << เพิ่ม designName
                    implId: "-",
                    implFile: null,
                    testCaseId: "-",
                    testCaseName: "-", // << เพิ่ม testCaseName (เป็นค่าว่าง)
                    isFirstReqRow: isFirstReqRow, reqRowSpan: 0,
                    isFirstDesignRow: true, designRowSpan: 1,
                    isFirstImplRow: true, implRowSpan: 1,
                });
                reqRowCount += designRowCount;
                isFirstReqRow = false;
                return; // ไป Design ถัดไป (ตามโค้ดเดิม)
            }

            implementations.forEach(impl => {
                const implId = impl.ImplementID;
                const implFile = impl.ImplementFilename;
                const testCases = Array.isArray(impl.TestCases) ? impl.TestCases : [];
                let implRowCount = 0;
                let isFirstImplRow = true;

                if (testCases.length === 0) {
                    implRowCount = 1;
                    flatRows.push({
                        key: `req-${reqId}-design-${designId}-impl-${implId}-no-tc`,
                        reqId: `REQ-${reqId}`,
                        reqName: reqName, // << เพิ่ม reqName
                        designId: `DE-${designId}`,
                        designName: designName, // << เพิ่ม designName
                        implId: `IMP-${implId}`,
                        implFile: implFile,
                        testCaseId: "-",
                        testCaseName: "-", // << เพิ่ม testCaseName (เป็นค่าว่าง)
                        isFirstReqRow: isFirstReqRow, reqRowSpan: 0,
                        isFirstDesignRow: isFirstDesignRow, designRowSpan: 0,
                        isFirstImplRow: true, implRowSpan: 1,
                    });
                    designRowCount += implRowCount;
                    isFirstReqRow = false;
                    isFirstDesignRow = false;
                    // return ไม่ได้ ต้องให้ loop tc ทำงานต่อ (ถ้ามี)
                    // แก้ไข: ต้องไป implementation ถัดไป ไม่ใช่ return จาก design loop
                    // แต่เนื่องจากไม่มี test case เราจึงจบ loop ของ impl นี้ได้เลย
                    // ดังนั้น โค้ดเดิมที่ return ตรงนี้ถูกต้องแล้ว ถ้าไม่มี Test Case ใน Implementation นี้
                    // *** ตรวจสอบ Logic เดิม: ถ้าไม่มี TC ให้ไป Impl ถัดไป ***
                    // โค้ดเดิม: return; >> ทำให้ข้ามไป Impl ถัดไปเลย >> ถูกต้อง
                    return;
                }

                testCases.forEach(tc => {
                    const tcId = tc.TestCaseID;
                    // *** ดึงชื่อ Test Case ***
                    const tcName = tc.TestCaseName || `Test Case ${tcId}`;
                    implRowCount++;
                    flatRows.push({
                        key: `req-${reqId}-design-${designId}-impl-${implId}-tc-${tcId}`,
                        reqId: `REQ-${reqId}`,
                        reqName: reqName, // << เพิ่ม reqName
                        designId: `DE-${designId}`,
                        designName: designName, // << เพิ่ม designName
                        implId: `IMP-${implId}`,
                        implFile: implFile,
                        testCaseId: `TC-${tcId}`,
                        testCaseName: tcName, // << เพิ่ม testCaseName
                        isFirstReqRow: isFirstReqRow, reqRowSpan: 0,
                        isFirstDesignRow: isFirstDesignRow, designRowSpan: 0,
                        isFirstImplRow: isFirstImplRow, implRowSpan: 0, // span จะถูกตั้งค่าทีหลัง
                    });
                    isFirstReqRow = false;
                    isFirstDesignRow = false;
                    isFirstImplRow = false; // แถวถัดไปของ TC เดียวกัน ไม่ใช่แถวแรกของ Impl
                });

                // คำนวณ Impl Row Span (เหมือนเดิม)
                const firstImplIndex = flatRows.length - implRowCount;
                if (firstImplIndex >= 0 && flatRows[firstImplIndex]) {
                    flatRows[firstImplIndex].implRowSpan = implRowCount;
                }
                designRowCount += implRowCount;
            });

            // คำนวณ Design Row Span (เหมือนเดิม)
            const firstDesignIndex = flatRows.length - designRowCount;
            if (firstDesignIndex >= 0 && flatRows[firstDesignIndex]) {
                flatRows[firstDesignIndex].designRowSpan = designRowCount;
            }
            reqRowCount += designRowCount;
        });

        // คำนวณ Req Row Span (เหมือนเดิม)
        const firstReqIndex = flatRows.length - reqRowCount;
        if (firstReqIndex >= 0 && flatRows[firstReqIndex]) {
            flatRows[firstReqIndex].reqRowSpan = reqRowCount;
        }
    });

    // console.log("Flattened Rows with Names:", flatRows); // Log ดูผลลัพธ์
    return flatRows;
};


// --- Component หลัก (ส่วนอื่นเหมือนเดิม ยกเว้นส่วน Render ตาราง) ---
const CreateBaselineTrace = () => {
    const [nestedData, setNestedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const selectedRound = queryParams.get("round");

    // Fetch Data (เหมือนเดิม)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); setError(null); setNestedData([]);
            if (!projectId) { setError("Required Project ID is missing from URL."); setLoading(false); return; }
            if (!selectedRound) { setError("Required Round number is missing from URL."); setLoading(false); return; }
            const roundNumber = parseInt(selectedRound, 10);
            if (isNaN(roundNumber)) { setError("Invalid Round number in URL."); setLoading(false); return; }

            try {
                // ใช้ Endpoint เดิมที่คืนค่าชื่อมาแล้ว
                const response = await axios.get("http://localhost:3001/getTableVeriTracebyRound", {
                    params: { project_id: projectId, create_round: selectedRound },
                });
                console.log("API Response (CreateBaselineTrace):", response.data); // Log ดูข้อมูลที่ได้
                if (response.data?.success && Array.isArray(response.data.data)) {
                    setNestedData(response.data.data); // เก็บ Nested Data ที่มีชื่อแล้ว
                    if (response.data.data.length === 0) console.log(`No verification data found for project ${projectId}, round ${selectedRound}`);
                } else {
                    setError(response.data.message || "Failed to fetch valid verification data."); setNestedData([]);
                }
            } catch (err) {
                console.error("Error fetching verification data by round:", err);
                setError(`Error fetching data: ${err.response?.data?.message || err.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [projectId, selectedRound]);

    // คำนวณ Rows สำหรับแสดงผล (ใช้ helper function ที่แก้ไขแล้ว)
    const displayRows = useMemo(() => flattenNestedDataForTable(nestedData), [nestedData]);

    // Function สำหรับบันทึก Baseline (เหมือนเดิม)
    const handleSave = async () => {
        try {
            const storedUsername = localStorage.getItem("username");
            if (!storedUsername) {
                toast.error("User session expired. Please log in again."); // ใช้ toast.error
                return;
            }

            const sourceRoundInt = parseInt(selectedRound, 10);
            if (isNaN(sourceRoundInt)) {
                toast.error("Invalid source round number.");
                return;
            }

            // ดึง Round ล่าสุดของ Baseline (เหมือนเดิม)
            const maxRoundResult = await axios.get(`http://localhost:3001/getMaxBaselineRound/${projectId}`);
            let nextRound = 1;
            if (maxRoundResult.data && maxRoundResult.data.maxRound !== null) {
                nextRound = maxRoundResult.data.maxRound + 1;
            }

            console.log(`Saving baseline data as round ${nextRound} for project ${projectId} from source round ${selectedRound}`);

            // เตรียมข้อมูลที่จะบันทึก (เหมือนเดิม)
            const savePromises = [];
            nestedData.forEach(req => {
                const reqId = req.RequirementID;
                (req.Designs || []).forEach(design => {
                    const designId = design.DesignID;
                    (design.Implementations || []).forEach(impl => {
                        const implId = impl.ImplementID;
                        (impl.TestCases || []).forEach(tc => {
                            const tcId = tc.TestCaseID;
                            savePromises.push(
                                axios.post("http://localhost:3001/saveBaselineTrace", {
                                    project_id: projectId,
                                    requirement_id: reqId,
                                    design_id: designId,
                                    implement_id: implId,
                                    testcase_id: tcId,
                                    baselinetrace_by: storedUsername,
                                    baselinetrace_round: nextRound,
                                    create_round: sourceRoundInt
                                })
                            );
                        });
                        // --- จัดการกรณี Impl ไม่มี Test Case ---
                        if (!impl.TestCases || impl.TestCases.length === 0) {
                            savePromises.push(
                                axios.post("http://localhost:3001/saveBaselineTrace", {
                                    project_id: projectId,
                                    requirement_id: reqId,
                                    design_id: designId,
                                    implement_id: implId,
                                    testcase_id: null, // ส่ง null ถ้าไม่มี Test Case
                                    baselinetrace_by: storedUsername,
                                    baselinetrace_round: nextRound,
                                    create_round: sourceRoundInt
                                })
                            );
                        }
                    });
                    // --- จัดการกรณี Design ไม่มี Implementation ---
                    if (!design.Implementations || design.Implementations.length === 0) {
                        savePromises.push(
                            axios.post("http://localhost:3001/saveBaselineTrace", {
                                project_id: projectId,
                                requirement_id: reqId,
                                design_id: designId,
                                implement_id: null, // ส่ง null ถ้าไม่มี Implementation
                                testcase_id: null,
                                baselinetrace_by: storedUsername,
                                baselinetrace_round: nextRound,
                                create_round: sourceRoundInt
                            })
                        );
                    }
                });
                // --- จัดการกรณี Requirement ไม่มี Design (ถ้าต้องการบันทึก) ---
                // if (!req.Designs || req.Designs.length === 0) {
                //    savePromises.push( ... implement_id: null, testcase_id: null ... );
                // }
            });

            if (savePromises.length === 0) {
                toast.info("No traceability links found in the selected round to create a baseline.");
                return;
            }

            // 1. บันทึก Baseline (เหมือนเดิม)
            await Promise.all(savePromises);
            console.log(`Baseline round ${nextRound} records saved successfully.`);

            // 2. อัปเดตสถานะ (เหมือนเดิม)
            try {
                console.log(`Updating status for source round ${selectedRound} to BASELINE...`);
                const statusUpdatePayload = { project_id: projectId, create_round: selectedRound, new_status: "BASELINE" };
                const statusUpdateResponse = await axios.put('http://localhost:3001/updateVerificationStatusByRound', statusUpdatePayload);
                if (!statusUpdateResponse.data?.success) {
                    console.warn(`Failed to update status for source round ${selectedRound}:`, statusUpdateResponse.data?.message);
                    toast.warning(`Baseline created, but failed to update status of the original round ${selectedRound}.`);
                } else {
                    console.log(`Successfully updated status for source round ${selectedRound} to BASELINE.`);
                }
            } catch (statusUpdateError) {
                console.error(`Error updating status for source round ${selectedRound}:`, statusUpdateError.response?.data || statusUpdateError.message);
                toast.warning(`Baseline created, but an error occurred while updating the status of the original round ${selectedRound}.`);
            }

            // 3. แจ้งเตือนและ Navigate (เหมือนเดิม)
            toast.success(`Baseline round ${nextRound} created successfully.`, {
                onClose: () => { navigate(`/viewBaselineTrace?project_id=${projectId}`); }, autoClose: 2000
            });

        } catch (error) {
            console.error("Error saving baseline trace", error.response?.data || error.message);
            toast.error(`Error creating baseline: ${error.response?.data?.message || error.message}`);
        }
    };

    // --- ส่วน Render ---
    if (loading) return <div className="loading">Loading traceability data...</div>;
    if (error) return <div className="error">{error}</div>;

    // กรณีไม่มีข้อมูลที่จะแสดง (ปรับปรุงข้อความเล็กน้อย)
    if (displayRows.length === 0) {
        const noDataMessage = nestedData.length === 0
            ? `No verification data found for round ${selectedRound}. Cannot create baseline.`
            : `No valid traceability links (Req -> Design -> Impl -> TC) found in round ${selectedRound} to create a baseline.`;
        return (
            <div className="traceability-container">
                <h1 className="traceability-title">Create Baseline Trace</h1>
                <div className="no-data">{noDataMessage}</div>
                {/* เพิ่มปุ่ม Back ที่ชัดเจน */}
                <button type="button" onClick={() => navigate(`/versionVerTrace?project_id=${projectId}`)} className="back-button" style={{ marginTop: '20px' }}>
                    Back to Verification History
                </button>
            </div>
        );
    }

    // กรณีมีข้อมูล แสดงตาราง (แก้ไขส่วน tbody)
    return (
        <div className="traceability-container">
            <h1 className="traceability-title"> Create Baseline from Traceability Round {selectedRound} </h1>
            <table className="traceability-table">
                <thead>
                    <tr>
                        <th>Requirement ID / Name</th>
                        <th>Design ID / Name</th>
                        <th>Code Component ID / Name</th>
                        <th>Test Case ID / Name</th>
                    </tr>
                </thead>
                <tbody>
                    {/* --- แก้ไขการแสดงผลในแต่ละ Cell --- */}
                    {displayRows.map((row) => (
                        <tr key={row.key}>
                            {/* Requirement Cell */}
                            {row.isFirstReqRow && (
                                <td rowSpan={row.reqRowSpan} className="requirement-cell">
                                    <div className="reqid-trace">{row.reqId}</div>
                                    {/* แสดงชื่อ Requirement ถ้ามี */}
                                    {row.reqName && row.reqName !== `Requirement ${row.reqId.split('-')[1]}` ? (
                                        <div className="reqname-trace">{row.reqName}</div>
                                    ) : null}
                                </td>
                            )}
                            {/* Design Cell */}
                            {row.isFirstDesignRow && (
                                <td rowSpan={row.designRowSpan}>
                                    {row.designId}
                                    {/* แสดงชื่อ Design ถ้ามี */}
                                    {row.designName && row.designName !== "-" && row.designName !== `Design ${row.designId.split('-')[1]}` ? (
                                        <><br /><div className="reqname-trace">{row.designName}</div></>
                                    ) : null}
                                </td>
                            )}
                            {/* Implementation Cell */}
                            {row.isFirstImplRow && (
                                <td rowSpan={row.implRowSpan}>
                                    {row.implId !== "-" ? (
                                        <>
                                            {row.implId}
                                            {/* แสดงชื่อไฟล์ ถ้ามี */}
                                            {row.implFile && row.implFile !== 'N/A' ? (
                                                <><br /><div>{row.implFile}</div></>
                                            ) : null}
                                        </>
                                    ) : (
                                        "-"
                                    )}
                                </td>
                            )}
                            {/* Test Case Cell */}
                            <td>
                                {row.testCaseId}
                                {/* แสดงชื่อ Test Case ถ้ามี */}
                                {row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.testCaseId.split('-')[1]}` ? (
                                    <><br /><div className="reqname-trace">{row.testCaseName}</div></>
                                ) : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* --- ส่วนปุ่ม (เหมือนเดิม) --- */}
            <div className="button-container" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                {/* ทำให้ปุ่ม Back นำทางได้ถูกต้องมากขึ้น */}
                <button onClick={() => navigate(`/versionVerTrace?project_id=${projectId}`)} > Back </button>
                <button className="save-baseline-trace" onClick={handleSave}> Create New Baseline </button>
            </div>
        </div>
    );
};

export default CreateBaselineTrace;