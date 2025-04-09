import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/createVerifyTrace.css";
import CommentVerTrace from './commentVerTrace';

const flattenTraceabilityData = (nestedData) => {
    const flatRows = [];
    if (!Array.isArray(nestedData) || nestedData.length === 0) return flatRows;

    nestedData.forEach(req => {
        if (!req || typeof req !== 'object') { console.warn("Skipping invalid req item"); return; }

        const reqId = req.RequirementID;
        const reqName = req.RequirementName || `Requirement ${reqId}`;
        const designs = Array.isArray(req.Designs) ? req.Designs : [];
        const veritraceId = req.veritrace_id;

        let reqRowCount = 0; let isFirstReqRow = true;

        if (designs.length === 0) {
            reqRowCount = 1;
            flatRows.push({
                key: `req-${reqId}-no-design`, veritraceId: veritraceId,
                reqId: reqId, reqName: reqName, designId: "-", designName: "-",
                implId: null, implFile: null, testCaseId: "-", testCaseName: "-",
                isFirstReqRow: true, reqRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1,
            }); return;
        }

        designs.forEach((design) => {
            if (!design || typeof design !== 'object') { console.warn("Skipping invalid design item"); return; }
            let designRowCount = 0; let isFirstDesignRow = true;
            const designId = design.DesignID;
            // ใช้ DiagramName หรือชื่อเริ่มต้น
            const designName = design.DiagramName || `Design ${designId}`;
            const implementations = Array.isArray(design.Implementations) ? design.Implementations : [];

            if (implementations.length === 0) {
                designRowCount = 1;
                flatRows.push({
                    key: `req-${reqId}-design-${designId}-no-impl`, veritraceId: veritraceId,
                    reqId: reqId, reqName: reqName, designId: designId, designName: designName,
                    implId: null, implFile: null, testCaseId: "-", testCaseName: "-",
                    isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1,
                }); reqRowCount += designRowCount; isFirstReqRow = false; return;
            }

            implementations.forEach((impl) => {
                if (!impl || typeof impl !== 'object') { console.warn("Skipping invalid impl item"); return; }
                let implRowCount = 0; let isFirstImplRow = true;
                const implId = impl.ImplementID; // เก็บ ID
                const implFile = impl.ImplementFilename; // เก็บ Filename
                const testCases = Array.isArray(impl.TestCases) ? impl.TestCases : [];

                if (testCases.length === 0) {
                    implRowCount = 1;
                    flatRows.push({
                        key: `req-${reqId}-design-${designId}-impl-${implId}-no-tc`, veritraceId: veritraceId,
                        reqId: reqId, reqName: reqName, designId: designId, designName: designName,
                        implId: implId, implFile: implFile, // ส่งต่อ ID และ File
                        testCaseId: "-", testCaseName: "-",
                        isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: true, implRowSpan: 1,
                    }); designRowCount += implRowCount; isFirstReqRow = false; isFirstDesignRow = false; return;
                }

                testCases.forEach((tc) => {
                    if (!tc || typeof tc !== 'object') { console.warn("Skipping invalid tc item"); return; }
                    implRowCount++;
                    const tcId = tc.TestCaseID;
                    const tcName = tc.TestCaseName || `Test Case ${tcId}`; // ใช้ชื่อ หรือชื่อเริ่มต้น

                    flatRows.push({
                        key: `req-${reqId}-design-${designId}-impl-${implId}-tc-${tcId}`, veritraceId: veritraceId,
                        reqId: reqId, reqName: reqName, // ส่งต่อ Name
                        designId: designId, designName: designName, // ส่งต่อ Name
                        implId: implId, implFile: implFile, // ส่งต่อ ID และ File
                        testCaseId: tcId, testCaseName: tcName, // ส่งต่อ Name
                        isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: isFirstImplRow, implRowSpan: 0,
                    }); isFirstReqRow = false; isFirstDesignRow = false; isFirstImplRow = false;
                });

                // คำนวณ Span (เหมือนเดิม)
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
    console.log("Flattened Rows with Names (VerifyTrace):", flatRows);
    return flatRows;
};

const VerifyTrace = () => {
    const navigate = useNavigate();
    const [nestedVerificationData, setNestedVerificationData] = useState([]);
    const [traceData, setTraceData] = useState([]);
    const [checkboxState, setCheckboxState] = useState({});
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const createRound = queryParams.get("round");
    // แก้ไข: ดึง username จาก localStorage ภายใน useEffect หรือตอนที่ต้องใช้จริงๆ  const currentUsername = localStorage.getItem("username");
    const [isLoading, setIsLoading] = useState(true); // ใช้ isLoading ตัวเดียว
    const [verificationError, setVerificationError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // --- Fetch Data Effect ---
    useEffect(() => {
        const currentUsername = localStorage.getItem("username"); // ดึง username ที่นี่

        const fetchData = async () => {
            setIsLoading(true);
            setVerificationError(null);
            setNestedVerificationData([]);
            setTraceData([]);
            setCheckboxState({});

            if (!projectId || !createRound) {
                setVerificationError("Project ID หรือ Round ไม่ถูกต้องใน URL"); setIsLoading(false); return;
            }
            if (!currentUsername) {
                setVerificationError("ไม่พบข้อมูลผู้ใช้ (Username) โปรดล็อกอิน"); setIsLoading(false); return;
            }

            let fetchedTraceCriteria = [];

            try {
                // 1. โหลด Verification Data (ใช้ API เดิมที่คืนค่า Nested + Names)
                console.log(`⏳[${projectId}-${createRound}] Fetching verification data...`);
                const verificationResponse = await axios.get("http://localhost:3001/getTableVeriTracebyRound", { params: { project_id: projectId, create_round: createRound } });
                console.log("Verification API Response:", verificationResponse.data); // Log ดูข้อมูลที่ได้

                if (verificationResponse.data?.success && Array.isArray(verificationResponse.data.data)) {
                    setNestedVerificationData(verificationResponse.data.data);
                    if (verificationResponse.data.data.length === 0) console.warn(`🟡[${projectId}-${createRound}] No verification data found.`);
                    else console.log(`✅[${projectId}-${createRound}] Verification data loaded.`);
                } else {
                    console.error(`❌[${projectId}-${createRound}] Failed to fetch verification data:`, verificationResponse.data?.message || 'No success flag or data is not array');
                    throw new Error(verificationResponse.data?.message || "ไม่สามารถดึงข้อมูล Verification หลักได้");
                }

                // 2. โหลด Trace Criteria (เหมือนเดิม)
                console.log(`⏳[${projectId}-${createRound}] Fetching trace criteria...`);
                const traceResponse = await axios.get(`http://localhost:3001/tracecriteria/${projectId}`);
                if (traceResponse.data.data && Array.isArray(traceResponse.data.data) && traceResponse.data.data.length > 0) {
                    fetchedTraceCriteria = traceResponse.data.data;
                    setTraceData(fetchedTraceCriteria);
                    console.log(`✅[${projectId}-${createRound}] Trace criteria loaded.`);
                } else {
                    console.warn(`🟡[${projectId}-${createRound}] No Trace Criteria found.`);
                    setTraceData([]);
                }

                // 3. โหลด Checklist State (เหมือนเดิม)
                console.log(`⏳[${projectId}-${createRound}] Fetching checklist state...`);
                let loadedState = null;

                // ลองโหลดจาก localStorage
                const localStorageKey = `checkboxState_${projectId}_${createRound}_${currentUsername}`;
                const localStateRaw = localStorage.getItem(localStorageKey);
                if (localStateRaw) {
                    console.log(`🟡[${projectId}-${createRound}] Loading checklist progress for user "${currentUsername}" from localStorage`);
                    try {
                        loadedState = JSON.parse(localStateRaw);
                    } catch (parseError) {
                        console.error("Error parsing localStorage state:", parseError);
                        localStorage.removeItem(localStorageKey);
                    }
                }

                if (loadedState === null && fetchedTraceCriteria.length > 0) {
                    console.log(`🟡[${projectId}-${createRound}] Using default checklist state (all false)`);
                    loadedState = fetchedTraceCriteria.reduce((acc, trace) => { acc[trace.tracecriteria_id] = false; return acc; }, {});
                }
                setCheckboxState(loadedState || {});
                console.log(`✅[${projectId}-${createRound}] Checklist state initialized.`);
            } catch (error) {
                console.error(`❌[${projectId}-${createRound}] Error during data fetching sequence:`, error);
                setVerificationError(error.message || "เกิดข้อผิดพลาดในการดึงข้อมูล");
            } finally {
                setIsLoading(false);
                console.log(`🏁[${projectId}-${createRound}] Fetch data finished. Loading: false`);
            }
        };

        fetchData();
    }, [projectId, createRound]); // ดึงข้อมูลใหม่ทุกครั้งที่ projectId หรือ createRound เปลี่ยน


    // --- Flatten Data (ใช้ Helper ที่อัปเดตแล้ว) ---
    const tableRows = useMemo(() => flattenTraceabilityData(nestedVerificationData), [nestedVerificationData]);

    // --- handleCheckboxChange (เหมือนเดิม) ---
    const handleCheckboxChange = (traceId) => {
        const currentUsername = localStorage.getItem("username"); // ดึงมาใช้ตรงนี้
        if (!currentUsername) { toast.error("ไม่พบข้อมูลผู้ใช้ ไม่สามารถบันทึกความคืบหน้าได้"); return; }
        setCheckboxState((prevState) => {
            const newState = { ...prevState, [traceId]: !prevState[traceId] };
            const localStorageKey = `checkboxState_${projectId}_${createRound}_${currentUsername}`;
            try {
                localStorage.setItem(localStorageKey, JSON.stringify(newState)); // บันทึกค่า state ใหม่
            } catch (error) { console.error("Error saving to localStorage:", error); }
            return newState;
        });
    };

    // --- handleSave (เหมือนเดิม ใช้ onClose) ---
    const handleSave = async () => {
        const currentUsername = localStorage.getItem("username"); // ดึงมาใช้ตรงนี้
        if (!currentUsername) { toast.warning("User information not found. Please log in first."); return; }

        // ตรวจสอบว่า traceData มีข้อมูลก่อนเช็ค every
        const allChecked = traceData.length > 0 && Object.values(checkboxState).every(Boolean);
        const requiredKeys = traceData.map(t => t.tracecriteria_id.toString()); // key ใน state เป็น string
        const currentKeys = Object.keys(checkboxState);
        const allRequiredKeysPresent = requiredKeys.every(key => currentKeys.includes(key));
        const allValuesChecked = allRequiredKeysPresent && requiredKeys.every(key => checkboxState[key] === true);


        if (!allValuesChecked) {
            // ปรับปรุงข้อความให้ชัดเจนขึ้น
            if (traceData.length === 0) {
                toast.info("ไม่พบ Trace Criteria ให้ตรวจสอบ");
            } else if (!allRequiredKeysPresent) {
                toast.info("ข้อมูล Checklist กำลังโหลด หรือ ยังไม่สมบูรณ์ โปรดรอสักครู่");
            } else {
                toast.success("Save Criteria Checklist.", {
                    onClose: () => {
                        setTimeout(() => {
                            navigate(`/viewVerifyTrace?project_id=${projectId}`);
                        }, 20);
                    }
                });
            }
            return;
        }


        const verificationPayload = { project_id: projectId, create_round: createRound, reviewer_name: currentUsername };

        try {
            const verificationResponse = await axios.put('http://localhost:3001/update-round-verification', verificationPayload);
            if (verificationResponse.data?.success) {
                const verificationLikelySuccessful = verificationResponse.data.updated_count > 0 || (verificationResponse.data.message && verificationResponse.data.message.includes("เรียบร้อยแล้ว"));
                if (verificationLikelySuccessful) {
                    toast.success("Verification completed successfully.", {
                        onClose: () => {
                            setTimeout(() => {
                                navigate(`/viewVerifyTrace?project_id=${projectId}`);
                            }, 30);
                        }
                    });
                    const localStorageKey = `checkboxState_${projectId}_${createRound}_${currentUsername}`;
                    localStorage.removeItem(localStorageKey);
                } else {
                    toast.info(verificationResponse.data.message || "Status already updated (possibly by others).");
                }
            } else {
                toast.error(verificationResponse.data?.message || "Unable to verify status.");
            }
        } catch (verificationError) {
            console.error("Verification API error:", verificationError);
            toast.error(verificationError.response?.data?.message || "An error occurred while submitting verification.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <button onClick={() => navigate(`/viewVerifyTrace?project_id=${projectId}`)} style={{ marginBottom: '10px' }}>Back to List</button>
            <h1>Verification Trace for Round {createRound}</h1>

            {isLoading && <div className="loading-message"><p>Loading Data...</p></div>}
            {verificationError && <div className="error-message">{verificationError}</div>}

            {/* ตาราง */}
            {!isLoading && !verificationError && tableRows.length === 0 && (
                <div className="no-data-message" style={{ marginBottom: '20px' }}>No verification data found for round {createRound}</div> // แก้ข้อความ
            )}
            {!isLoading && !verificationError && tableRows.length > 0 && (
                // ใช้ className="traceability-container" หรือ "traceability-table-container" ตามที่ต้องการ
                <div className="traceability-table-container" style={{ marginBottom: '20px' }}>
                    <table className="traceability-table">
                        <thead>
                            <tr>
                                {/* เพิ่ม Header ให้สื่อความหมาย */}
                                <th>Requirement ID / Name</th>
                                <th>Design ID / Name</th>
                                <th>Code Component ID / Filename</th>
                                <th>Test Case ID / Name</th>
                            </tr>
                        </thead>

                        <tbody>
                            {tableRows.map((row) => (
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
                                                        <><br /><div className="reqname-trace" >{row.implFile}</div></>
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
                                            <><br /><div className="reqname-trace" >{row.testCaseName}</div></>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}


            {/* Checklist (เหมือนเดิม) */}
            {!isLoading && !verificationError && traceData.length > 0 && ( // เพิ่มเงื่อนไข traceData.length > 0
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
                                        disabled={isSaving} // Disable เฉพาะตอน Saving
                                    />
                                    {trace.tracecriteria_name}
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {/* แสดงข้อความถ้าไม่มี Trace Criteria */}
            {!isLoading && !verificationError && traceData.length === 0 && (
                <div className="no-data-message" style={{ marginTop: '10px' }}>No Trace Criteria found for this project.</div>
            )}

            {/* ปุ่ม Save (เหมือนเดิม) */}
            {!isLoading && !verificationError && (
                <button onClick={handleSave} disabled={isSaving || traceData.length === 0}> {/* Disable ถ้าไม่มี Criteria */}
                    {isSaving ? 'SAVING...' : 'SAVE & VERIFY'} {/* ปรับข้อความปุ่ม */}
                </button>
            )}

            <div>
                <CommentVerTrace projectId={projectId} round={createRound} />
            </div>
        </div>
    );
};

export default VerifyTrace;