import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import CommentVerTrace from './commentVerTrace';
import "./CSS/verifyTrace.css";         // <<--- ใช้ CSS ไฟล์นี้ (vt-)
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowLeft, faClipboardCheck, faListCheck, faCheck, faComment, faTimes,
    faInfoCircle, faTimesCircle, faExclamationTriangle, faCheckCircle, faSpinner, faSave, faBan,
    faTasks // ไอคอนสำหรับ Title
} from "@fortawesome/free-solid-svg-icons";

// --- Helper Function: flattenTraceabilityData (No change needed) ---
const flattenTraceabilityData = (nestedData) => {
    // ... (โค้ด flattenTraceabilityData ไม่ต้องแก้ไข) ...
    const flatRows = [];
    if (!Array.isArray(nestedData) || nestedData.length === 0) return flatRows;
    nestedData.forEach((req, reqIndex) => {
        if (!req || typeof req !== 'object') { console.warn("Skipping invalid req item"); return; }
        const reqId = req.RequirementID; const reqName = req.RequirementName || `Requirement ${reqId}`;
        const designs = Array.isArray(req.Designs) ? req.Designs : [];
        const veritraceId = req.veritrace_id;
        let reqRowCount = 0; let isFirstReqRow = true;
        if (designs.length === 0) {
            reqRowCount = 1;
            flatRows.push({ key: `req-${reqIndex}-no-design`, veritraceId: veritraceId, reqId: reqId, reqName: reqName, designId: "-", designName: "-", implId: null, implFile: null, testCaseId: "-", testCaseName: "-", isFirstReqRow: true, reqRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1 }); return;
        }
        designs.forEach((design, designIndex) => {
            if (!design || typeof design !== 'object') { console.warn("Skipping invalid design item"); return; }
            let designRowCount = 0; let isFirstDesignRow = true;
            const designId = design.DesignID; const designName = design.DiagramName || `Design ${designId}`;
            const implementations = Array.isArray(design.Implementations) ? design.Implementations : [];
            if (implementations.length === 0) {
                designRowCount = 1;
                flatRows.push({ key: `req-${reqIndex}-design-${designIndex}-no-impl`, veritraceId: veritraceId, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: null, implFile: null, testCaseId: "-", testCaseName: "-", isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1 }); reqRowCount += designRowCount; isFirstReqRow = false; return;
            }
            implementations.forEach((impl, implIndex) => {
                if (!impl || typeof impl !== 'object') { console.warn("Skipping invalid impl item"); return; }
                let implRowCount = 0; let isFirstImplRow = true;
                const implId = impl.ImplementID; const implFile = impl.ImplementFilename;
                const testCases = Array.isArray(impl.TestCases) ? impl.TestCases : [];
                if (testCases.length === 0) {
                    implRowCount = 1;
                    flatRows.push({ key: `req-${reqIndex}-design-${designIndex}-impl-${implIndex}-no-tc`, veritraceId: veritraceId, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: implId, implFile: implFile, testCaseId: "-", testCaseName: "-", isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: true, implRowSpan: 1 }); designRowCount += implRowCount; isFirstReqRow = false; isFirstDesignRow = false; return;
                }
                testCases.forEach((tc, tcIndex) => {
                    if (!tc || typeof tc !== 'object') { console.warn("Skipping invalid tc item"); return; }
                    implRowCount++; const tcId = tc.TestCaseID; const tcName = tc.TestCaseName || `Test Case ${tcId}`;
                    flatRows.push({ key: `req-${reqIndex}-design-${designIndex}-impl-${implIndex}-tc-${tcIndex}`, veritraceId: veritraceId, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: implId, implFile: implFile, testCaseId: tcId, testCaseName: tcName, isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: isFirstImplRow, implRowSpan: 0 }); isFirstReqRow = false; isFirstDesignRow = false; isFirstImplRow = false;
                });
                const firstImplRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqIndex}-design-${designIndex}-impl-${implIndex}`));
                if (firstImplRowIndex !== -1 && flatRows[firstImplRowIndex]) flatRows[firstImplRowIndex].implRowSpan = implRowCount;
                designRowCount += implRowCount;
            });
            const firstDesignRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqIndex}-design-${designIndex}`));
            if (firstDesignRowIndex !== -1 && flatRows[firstDesignRowIndex]) flatRows[firstDesignRowIndex].designRowSpan = designRowCount;
            reqRowCount += designRowCount;
        });
        const firstReqRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqIndex}`));
        if (firstReqRowIndex !== -1 && flatRows[firstReqRowIndex]) flatRows[firstReqRowIndex].reqRowSpan = reqRowCount;
    });
    return flatRows;
};

// --- Component VerifyTrace ---
const VerifyTrace = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // ... (State definitions remain the same) ...
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const createRound = queryParams.get("round");
    const [nestedVerificationData, setNestedVerificationData] = useState([]);
    const [traceCriteria, setTraceCriteria] = useState([]);
    const [checkboxState, setCheckboxState] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [currentUsername, setCurrentUsername] = useState(null);
    const [alertType, setAlertType] = useState(null);
    const [alertMessage, setAlertMessage] = useState("");
    const [showAlert, setShowAlert] = useState(false);
    const alertTimeoutRef = useRef(null);

    // --- Fetch Initial Data (Logic remains the same) ---
    const fetchInitialData = useCallback(async () => {
        // ... (Fetch logic is the same as previous VerifyTrace) ...
        setLoading(true); setError(null); setNestedVerificationData([]); setTraceCriteria([]); setCheckboxState({});
        const username = localStorage.getItem("username");
        setCurrentUsername(username);
        if (!projectId || !createRound) { setError("Project ID or Round is missing."); setLoading(false); return; }
        if (!username) { setError("User not identified."); setLoading(false); return; }
        let fetchedCriteria = [];
        try {
            const verifRes = await axios.get("http://localhost:3001/getTableVeriTracebyRound", { params: { project_id: projectId, create_round: createRound } });
            if (verifRes.data?.success && Array.isArray(verifRes.data.data)) { setNestedVerificationData(verifRes.data.data); }
            else { throw new Error(verifRes.data?.message || "Failed to fetch traceability data."); }
            const criteriaRes = await axios.get(`http://localhost:3001/tracecriteria/${projectId}`);
            if (criteriaRes.data.data && Array.isArray(criteriaRes.data.data)) { fetchedCriteria = criteriaRes.data.data; setTraceCriteria(fetchedCriteria); }
            else { setTraceCriteria([]); }
            const initialCheckboxState = fetchedCriteria.reduce((acc, criteria) => { acc[criteria.tracecriteria_id.toString()] = false; return acc; }, {});
            const storageKey = `checkboxState_Trace_${projectId}_${createRound}_${username}`;
            const storedStateRaw = localStorage.getItem(storageKey);
            let loadedState = initialCheckboxState;
            if (storedStateRaw) {
                try {
                    const parsedState = JSON.parse(storedStateRaw); const validStoredState = {};
                    const criteriaIds = new Set(fetchedCriteria.map(c => c.tracecriteria_id.toString()));
                    for (const key in parsedState) { if (criteriaIds.has(key)) { validStoredState[key] = parsedState[key]; } }
                    loadedState = { ...initialCheckboxState, ...validStoredState };
                } catch (e) { localStorage.removeItem(storageKey); loadedState = initialCheckboxState; }
            } else { loadedState = initialCheckboxState; }
            setCheckboxState(loadedState);
        } catch (fetchError) { setError("Failed to load data."); showCustomAlert("error", "Failed to load data."); }
        finally { setLoading(false); }
    }, [projectId, createRound]);

    useEffect(() => {
        fetchInitialData();
        return () => { if (alertTimeoutRef.current) { clearTimeout(alertTimeoutRef.current); } };
    }, [fetchInitialData]);

    // --- Flatten Data for Table ---
    const tableRows = useMemo(() => flattenTraceabilityData(nestedVerificationData), [nestedVerificationData]);

    // --- Handlers (Logic remains the same) ---
    const handleCheckboxChange = (id) => {
        // ... (Checkbox logic same as before) ...
        if (!currentUsername) return;
        const idStr = id.toString();
        const updatedState = { ...checkboxState, [idStr]: !checkboxState[idStr] };
        setCheckboxState(updatedState);
        const storageKey = `checkboxState_Trace_${projectId}_${createRound}_${currentUsername}`;
        try { localStorage.setItem(storageKey, JSON.stringify(updatedState)); }
        catch (e) { console.error("Failed to save checklist state:", e); }
    };
    const showCustomAlert = (type, message, duration = 5000) => {
        // ... (Alert logic same as before) ...
        setAlertType(type); setAlertMessage(message); setShowAlert(true);
        if (alertTimeoutRef.current) { clearTimeout(alertTimeoutRef.current); }
        alertTimeoutRef.current = setTimeout(() => { setShowAlert(false); }, duration);
    };
    const handleCloseAlert = () => {
        // ... (Alert logic same as before) ...
        setShowAlert(false);
        if (alertTimeoutRef.current) { clearTimeout(alertTimeoutRef.current); }
    };
    const navigateBack = useCallback(() => {
        // Ensure projectId is valid before navigating
        if (projectId) {
            navigate(`/viewVerifyTrace?project_id=${projectId}`);
        } else {
            console.error("Cannot navigate back, projectId is missing.");
            toast.error("Cannot navigate back, Project ID is missing."); // <-- ใช้ toast.error
            // navigate('/'); // Optional fallback
        }
    }, [navigate, projectId]);
    // --- ⬆️ สิ้นสุดการแก้ไข navigateBack ---

    const handleSave = async () => {
        if (!currentUsername) {
            toast.error("User not found."); // <-- ใช้ toast.error
            return;
        }
        if (traceCriteria.length === 0) {
            toast.info("No trace criteria to verify."); // <-- ใช้ toast.info
            return;
        }

        const allChecked = traceCriteria.every(criteria => checkboxState[criteria.tracecriteria_id.toString()] === true);

        if (!allChecked) {
            // แจ้งเตือนว่าบันทึก Progress แต่ยังไม่สมบูรณ์
            toast.warning("Checklist progress saved, but not all criteria are verified yet.", {
                onClose: () => navigateBack() // <-- นำทางหลังจาก Toast ปิด
            });
            return; // หยุดการทำงานต่อ ไม่ต้องส่งข้อมูลไป Backend
        }

        // --- ถ้า Checklist ครบ ดำเนินการต่อ ---
        setSaving(true);
        // setError(null); // อาจจะไม่ต้อง reset error ที่นี่

        const payload = { project_id: projectId, create_round: createRound, reviewer_name: currentUsername };

        try {
            const response = await axios.put('http://localhost:3001/update-round-verification', payload);
            if (response.data?.success) {
                const isSuccess = response.data.updated_count > 0 || response.data.message?.includes("เรียบร้อยแล้ว") || response.status === 200;
                const storageKey = `checkboxState_Trace_${projectId}_${createRound}_${currentUsername}`;
                localStorage.removeItem(storageKey); // ลบ state ที่เก็บไว้เมื่อสำเร็จ

                if (isSuccess) {
                    toast.success("Verification completed!", {
                        onClose: () => navigateBack() // <-- นำทางหลังจาก Toast ปิด
                    });
                } else {
                    // กรณี Backend ตอบ success แต่ไม่มีอะไรอัปเดต (อาจจะทำไปแล้ว)
                    toast.info(response.data.message || "Status might already be updated.", {
                        onClose: () => navigateBack() // <-- นำทางหลังจาก Toast ปิด
                    });
                }
            } else {
                // กรณี Backend ตอบ success: false
                throw new Error(response.data?.message || "Verification submission failed.");
            }
        } catch (saveError) {
            console.error("Save Error:", saveError);
            const errorMsg = saveError.response?.data?.message || saveError.message || "Failed to save status.";
            setError(errorMsg); // อาจจะยังเก็บ Error หลักไว้เผื่อแสดงที่อื่น
            toast.error(`Failed to save verification status: ${errorMsg}`); // <-- ใช้ toast.error
        } finally {
            setSaving(false);
        }
    };


    // --- Render Logic (ปรับโครงสร้าง JSX ให้เป็น 2 คอลัมน์บน + 1 ล่าง) ---
    return (
        // ใช้ vt-container และ ::before สำหรับ top bar
        <div className='vt-container'>
            {/* Header (ใช้โครงสร้างเหมือน reqveri แต่ class vt-) */}
            <div className="vt-header">
                <button className="vt-back-btn" onClick={() => navigate(`/viewVerifyTrace?project_id=${projectId}`)}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1 className="vt-title"> {/* Title อยู่กลาง */}
                    <FontAwesomeIcon icon={faTasks} className="vt-title-icon" />
                    Verify Traceability Record - Round {createRound}
                </h1>
                {/* ไม่ต้องมี User Indicator หรือจะใส่ก็ได้ */}
                {/* {currentUsername && <span className="vt-user-indicator">User: {currentUsername}</span>} */}
            </div>

            {/* Custom Alert Area */}
            {showAlert && (
                <div className={`vt-alert ${showAlert ? 'show' : ''}`} >
                    {/* ... โค้ด Alert เหมือนเดิม ... */}
                    <div className={`vt-alert-${alertType}`}>
                        <div className="vt-alert-content">
                            <div className="vt-alert-icon">
                                {alertType === 'success' && <FontAwesomeIcon icon={faCheckCircle} />}
                                {alertType === 'error' && <FontAwesomeIcon icon={faTimesCircle} />}
                                {alertType === 'warning' && <FontAwesomeIcon icon={faExclamationTriangle} />}
                                {alertType === 'info' && <FontAwesomeIcon icon={faInfoCircle} />}
                            </div>
                            <span className="vt-alert-message">{alertMessage}</span>
                        </div>
                        <button className="vt-alert-close" onClick={handleCloseAlert} aria-label="Close alert">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                    <div className="vt-alert-progress" style={{ animationDuration: '5s' }}></div>
                </div>
            )}

            {/* Content Area */}
            <div className="vt-content">
                {loading && (<div className="vt-loading"><div className="vt-spinner"></div><span>Loading...</span></div>)}
                {error && !loading && (
                    <div className="vt-box" style={{ borderColor: 'var(--vt-error)', marginBottom: '1.5rem' }}>
                        <h2 style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--vt-error-dark)', borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
                            <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: 'var(--vt-error)' }} /> Error
                        </h2>
                        <p style={{ padding: '1rem 1.25rem', color: 'var(--vt-error-dark)' }}>{error}</p>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* *** ใช้ vt-flex-container สำหรับ Checklist และ Comments *** */}
                        <div className="vt-flex-container">
                            {/* Checklist Box */}
                            <div className="vt-box"> {/* Use vt-box */}
                                <h2>
                                    <FontAwesomeIcon icon={faListCheck} className="vt-icon" />
                                    Traceability Criteria Checklist
                                </h2>
                                {traceCriteria.length > 0 ? (
                                    <ul className="vt-checklist"> {/* Use vt-checklist */}
                                        {traceCriteria.map((criteria) => (
                                            <li key={criteria.tracecriteria_id}>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        className="vt-checklist-checkbox" // Use correct class
                                                        checked={checkboxState[criteria.tracecriteria_id.toString()] || false}
                                                        onChange={() => handleCheckboxChange(criteria.tracecriteria_id)}
                                                        disabled={saving}
                                                        aria-labelledby={`trace-criteria-label-${criteria.tracecriteria_id}`}
                                                    />
                                                    {/* <span className="vt-custom-checkbox"></span> */} {/* Optional custom checkbox */}
                                                    <span id={`trace-criteria-label-${criteria.tracecriteria_id}`}>{criteria.tracecriteria_name}</span>
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vt-text-light)' }}>
                                        No trace criteria found.
                                    </div>
                                )}
                            </div>

                            {/* Comment Box */}
                            <div className="vt-box"> {/* Use vt-box */}
                                <h2>
                                    <FontAwesomeIcon icon={faComment} className="vt-icon" />
                                    Comments
                                </h2>
                                <div className="vt-comment-container"> {/* Use vt-comment-container */}
                                    <CommentVerTrace projectId={projectId} round={createRound} />
                                </div>
                            </div>
                        </div>

                        {/* Traceability Table (วางไว้ด้านล่าง) */}
                        {/* ใช้ vt-box สำหรับครอบ Table */}
                        <div className="vt-box vt-table-box">
                            <h2>
                                <FontAwesomeIcon icon={faTasks} className="vt-icon" />
                                Traceability Records for Verification
                            </h2>
                            {tableRows.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vt-text-light)' }}>
                                    No traceability data found.
                                </div>
                            ) : (
                                <div className="vt-table-wrapper">
                                    <table className="vt-table">
                                        <thead><tr><th>Requirement</th><th>Design</th><th>Code Component</th><th>Test Case</th></tr></thead>
                                        <tbody>
                                            {tableRows.map((row) => (
                                                <tr key={row.key}>
                                                    {/* Requirement Column */}
                                                    {row.isFirstReqRow && (
                                                        <td rowSpan={row.reqRowSpan}>
                                                            {/* Format REQ-XXX */}
                                                            <div>{row.reqId && row.reqId !== "-" ? `REQ-${String(row.reqId).padStart(3, '0')}` : "-"}</div>
                                                            {/* Display Name */}
                                                            {row.reqName && row.reqName !== `Requirement ${row.reqId}` && (<div className="vt-item-detail">{row.reqName}</div>)}
                                                        </td>
                                                    )}
                                                    {/* Design Column */}
                                                    {row.isFirstDesignRow && (
                                                        <td rowSpan={row.designRowSpan}>
                                                            {/* Format SD-XXX */}
                                                            <div>{row.designId && row.designId !== "-" ? `SD-${String(row.designId).padStart(3, '0')}` : "-"}</div>
                                                            {/* Display Name */}
                                                            {row.designName && row.designName !== "-" && row.designName !== `Design ${row.designId}` && (<div className="vt-item-detail">{row.designName}</div>)}
                                                        </td>
                                                    )}
                                                    {/* Code Component Column */}
                                                    {row.isFirstImplRow && (
                                                        <td rowSpan={row.implRowSpan}>
                                                            {row.implId !== null && row.implId !== "-" ? (
                                                                <>
                                                                    {/* Format SC-XXX */}
                                                                    <div>{`SC-${String(row.implId).padStart(3, '0')}`}</div>
                                                                    {/* Display Filename */}
                                                                    {row.implFile && row.implFile !== 'N/A' && (<div className="vt-item-detail">{row.implFile}</div>)}
                                                                </>
                                                            ) : (
                                                                /* Display "-" if ID is invalid */
                                                                <div>-</div>
                                                            )}
                                                        </td>
                                                    )}
                                                    {/* Test Case Column */}
                                                    <td>
                                                        {/* Format TC-XXX */}
                                                        <div>
                                                            {row.testCaseId !== null && row.testCaseId !== "-"
                                                                ? `TC-${String(row.testCaseId).padStart(3, '0')}` // Format if valid
                                                                : "-" // Display "-" if invalid
                                                            }
                                                        </div>
                                                        {/* Display Name */}
                                                        {row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.testCaseId}` && (
                                                            <div className="vt-item-detail">{row.testCaseName}</div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons (ใช้ vt-button-container) */}
                        <div className="vt-button-container" style={{ backgroundColor: 'white' }}>
                            <button className="vt-cancel-button" onClick={() => navigateBack()} disabled={saving}>
                                <FontAwesomeIcon icon={faArrowLeft} />
                                Back
                            </button>
                            <button className="vt-save-button" onClick={handleSave} disabled={saving || loading || traceCriteria.length === 0}>
                                <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
                                {saving ? "Saving..." : "Save Verification"}
                            </button>
                        </div>
                    </>
                )}
            </div> {/* End vt-content */}
        </div> // End vt-container
    );
};

export default VerifyTrace;