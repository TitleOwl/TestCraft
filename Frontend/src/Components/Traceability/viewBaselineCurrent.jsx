import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './CSS/traceabilityPage.css'; // ตรวจสอบ Path

// ==================================================================================
// === ใช้ Helper Function ตัวเดียวกับ CreateBaselineTrace (ที่รับ Nested Data) ===
// ==================================================================================
const flattenNestedDataForTable = (data) => {
    const flatRows = [];
    if (!Array.isArray(data) || data.length === 0) return flatRows;

    data.forEach(req => {
        const reqId = req.RequirementID;
        // ใช้ RequirementName ที่ Backend ส่งมา (ถ้าไม่มีใช้ชื่อเริ่มต้น)
        const reqName = req.RequirementName || `Requirement ${reqId}`;
        const designs = Array.isArray(req.Designs) ? req.Designs : [];
        let reqRowCount = 0; let isFirstReqRow = true;
        // ไม่ต้องส่ง veritraceId ใน context นี้ (ถ้าไม่จำเป็น)

        if (designs.length === 0) {
            reqRowCount = 1;
            flatRows.push({
                key: `req-${reqId}-no-design`,
                reqId: reqId, reqName: reqName, designId: "-", designName: "-",
                implId: null, implFile: null, testCaseId: "-", testCaseName: "-",
                isFirstReqRow: true, reqRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1,
            }); return;
        }

        designs.forEach((design) => {
            let designRowCount = 0; let isFirstDesignRow = true;
            const designId = design.DesignID;
            // ใช้ DiagramName ที่ Backend ส่งมา (ถ้าไม่มีใช้ชื่อเริ่มต้น)
            const designName = design.DiagramName || `Design ${designId}`;
            const implementations = Array.isArray(design.Implementations) ? design.Implementations : [];

            if (implementations.length === 0) {
                designRowCount = 1;
                flatRows.push({
                    key: `req-${reqId}-design-${designId}-no-impl`,
                    reqId: reqId, reqName: reqName, designId: designId, designName: designName,
                    implId: null, implFile: null, testCaseId: "-", testCaseName: "-",
                    isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1,
                }); reqRowCount += designRowCount; isFirstReqRow = false; return;
            }

            implementations.forEach((impl) => {
                let implRowCount = 0; let isFirstImplRow = true;
                const implId = impl.ImplementID;
                const implFile = impl.ImplementFilename; // ใช้ Filename ที่ Backend ส่งมา
                const testCases = Array.isArray(impl.TestCases) ? impl.TestCases : [];

                if (testCases.length === 0) {
                    implRowCount = 1;
                    flatRows.push({
                        key: `req-${reqId}-design-${designId}-impl-${implId}-no-tc`,
                        reqId: reqId, reqName: reqName, designId: designId, designName: designName,
                        implId: implId, implFile: implFile,
                        testCaseId: "-", testCaseName: "-",
                        isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: true, implRowSpan: 1,
                    }); designRowCount += implRowCount; isFirstReqRow = false; isFirstDesignRow = false; return;
                }

                testCases.forEach((tc) => {
                    implRowCount++;
                    const tcId = tc.TestCaseID;
                    // ใช้ TestCaseName ที่ Backend ส่งมา (ถ้าไม่มีใช้ชื่อเริ่มต้น)
                    const tcName = tc.TestCaseName || `Test Case ${tcId}`;

                    flatRows.push({
                        key: `req-${reqId}-design-${designId}-impl-${implId}-tc-${tcId}`,
                        reqId: reqId, reqName: reqName,
                        designId: designId, designName: designName,
                        implId: implId, implFile: implFile,
                        testCaseId: tcId, testCaseName: tcName, // ใส่ชื่อ Test Case
                        isFirstReqRow: isFirstReqRow, reqRowSpan: 0,
                        isFirstDesignRow: isFirstDesignRow, designRowSpan: 0,
                        isFirstImplRow: isFirstImplRow, implRowSpan: 0,
                    }); isFirstReqRow = false; isFirstDesignRow = false; isFirstImplRow = false;
                });
                // --- คำนวณ RowSpan (เหมือนเดิม) ---
                const firstImplRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqId}-design-${designId}-impl-${implId}`));
                if (firstImplRowIndex !== -1 && flatRows[firstImplRowIndex]) flatRows[firstImplRowIndex].implRowSpan = implRowCount;
                designRowCount += implRowCount;
            });
            const firstDesignRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqId}-design-${designId}`));
            if (firstDesignRowIndex !== -1 && flatRows[firstDesignRowIndex]) flatRows[firstDesignRowIndex].designRowSpan = designRowCount;
            reqRowCount += designRowCount;
        });
        const firstReqRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqId}`));
        if (firstReqRowIndex !== -1 && flatRows[firstReqRowIndex]) flatRows[firstReqRowIndex].reqRowSpan = reqRowCount;
    });
    console.log("Flattened Rows with Names (ViewBaselineRound):", flatRows); // Log เพิ่มเติม
    return flatRows;
};
// ==================================================================================

// --- Component หลัก ---
const ViewBaselineCurrent = () => {
    const [nestedData, setNestedData] = useState([]); // <<--- ใช้ State นี้เก็บ Nested Data
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const round = queryParams.get("round");

    // Fetch Data (คาดหวัง Nested Data จาก Backend ที่แก้แล้ว)
    useEffect(() => {
        setNestedData([]); // Clear old data
        if (projectId && round) {
            setLoading(true); setError('');
            // เรียก API ที่แก้แล้ว ให้คืนค่า Nested Data + Names
            axios.get(`http://localhost:3001/viewBaselineTraceDetail`, { params: { project_id: projectId, round: round } })
                .then(response => {
                    console.log("API Response (ViewBaselineRound):", response.data); // Log ดูข้อมูลที่ได้
                    if (response.data?.success && Array.isArray(response.data.data)) {
                        setNestedData(response.data.data); // <<--- เก็บ Nested Data
                        if (response.data.data.length === 0) {
                            console.log(`No baseline data found for project ${projectId}, round ${round}`);
                        }
                    } else {
                        setError(response.data.message || 'Invalid data format received.');
                        setNestedData([]);
                    }
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Error fetching baseline trace detail:', error);
                    setError('Error fetching baseline trace data');
                    setLoading(false);
                });
        } else {
            setError('Project ID and Round are required in the URL.');
            setLoading(false);
        }
    }, [projectId, round]);

    // คำนวณ Rows สำหรับแสดงผลจาก nestedData โดยใช้ Helper ตัวใหม่
    const displayRows = useMemo(() => flattenNestedDataForTable(nestedData), [nestedData]);

    // --- ส่วน Render ---
    if (loading) return <div className="loading">Loading baseline details...</div>;
    if (error) return <div className="error">{error}</div>;

    if (displayRows.length === 0) {
        return (
            <div className="traceability-container">
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Baseline Traceability Record for Round {round}</h2>
                <div className="no-data">No traceability data found for this baseline round.</div>
                <button className="" onClick={() => navigate(`/currentBaselineTrace?project_id=${projectId}`)}>Back</button>
            </div>
        );
    }

    return (
        <div className="traceability-container">
            <button className="back-button-viewbaselineround" onClick={() => navigate(`/currentBaselineTrace?project_id=${projectId}`)}>Back</button>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Baseline Traceability Record for Round {round}</h2>
            <table className="traceability-table">
                <thead>
                    <tr>
                        {/* ใช้ Header เดียวกัน */}
                        <th>Requirement ID / Name</th>
                        <th>Design ID / Name</th>
                        <th>Code Component ID / Filename</th>
                        <th>Test Case ID / Name</th>
                    </tr>
                </thead>
                <tbody>
                    {displayRows.map((row) => (
                        <tr key={row.key}>
                            {/* Requirement Cell */}
                            {row.isFirstReqRow && (
                                <td rowSpan={row.reqRowSpan} className="requirement-cell">
                                    <div className="reqid-trace">{`REQ-${row.reqId}`}</div>
                                    {row.reqName && row.reqName !== `Requirement ${row.reqId}` ? (
                                        <div className="reqname-trace" >{row.reqName}</div>
                                    ) : null}
                                </td>
                            )}
                            {/* Design Cell */}
                            {row.isFirstDesignRow && (
                                <td rowSpan={row.designRowSpan}>
                                    {row.designId !== "-" ? `DE-${row.designId}` : "-"}
                                    {row.designName && row.designName !== "-" && row.designName !== `Design ${row.designId}` ? (
                                        <><br /> <div className="reqname-trace" >{row.designName}</div></>
                                    ) : null}
                                </td>
                            )}
                            {/* Implementation Cell */}
                            {row.isFirstImplRow && (
                                <td rowSpan={row.implRowSpan}>
                                    {row.implId !== null && row.implId !== "-" ? (
                                        <>
                                            {`IMP-${row.implId}`}
                                            {row.implFile && row.implFile !== 'N/A' ? (
                                                <><br /> <div className="reqname-trace" >{row.implFile}</div></>
                                            ) : null}
                                        </>
                                    ) : (
                                        "-"
                                    )}
                                </td>
                            )}
                            {/* Test Case Cell */}
                            <td>
                                {row.testCaseId !== "-" ? `TC-${row.testCaseId}` : "-"}
                                {row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.testCaseId}` ? (
                                    <><br /> <div className="reqname-trace" >{row.testCaseName}</div></>
                                ) : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ViewBaselineCurrent;