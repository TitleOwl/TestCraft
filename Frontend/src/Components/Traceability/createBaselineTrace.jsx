import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faLayerGroup, faSave, faTimes,
    faSpinner, faExclamationTriangle, faInfoCircle,
    faTasks
} from '@fortawesome/free-solid-svg-icons';

// --- CSS Import ---
import "./CSS/createBaselineTrace.css";

// --- Helper Function: flattenNestedDataForTable (แก้ไขให้เก็บ Original ID ด้วย) ---
const flattenNestedDataForTable = (data) => {
    const flatRows = [];
    if (!Array.isArray(data) || data.length === 0) return flatRows;

    const formatId = (prefix, id) => {
        if (id === null || id === undefined || id === "-") return "-";
        const numId = Number(id);
        if (isNaN(numId)) return id.toString();
        return `${prefix}-${String(numId).padStart(3, '0')}`;
    };

    data.forEach((req, reqIndex) => {
        if (!req || typeof req !== 'object') { console.warn("Skipping invalid req item", req); return; }
        const originalReqId = req.RequirementID; // <-- เก็บ ID ดั้งเดิม
        const reqName = req.RequirementName || `Requirement ${originalReqId}`;
        const designs = Array.isArray(req.Designs) ? req.Designs : [];
        const veritraceId = req.veritrace_id;

        let reqStartIndex = flatRows.length;
        let reqRowCount = 0;
        const formattedReqId = formatId("REQ", originalReqId); // Format จาก ID ดั้งเดิม

        if (designs.length === 0) {
            reqRowCount = 1;
            flatRows.push({
                key: `req-${originalReqId}-no-design-${reqIndex}`,
                reqId: formattedReqId,
                reqName: reqName,
                designId: "-", designName: "-",
                implId: "-", implFile: null,
                testCaseId: "-", testCaseName: "-",
                isFirstReqRow: true, reqRowSpan: 1,
                isFirstDesignRow: true, designRowSpan: 1,
                isFirstImplRow: true, implRowSpan: 1,
                // เพิ่ม Original IDs
                originalReqId: originalReqId,
                originalDesignId: null,
                originalImplId: null,
                originalTcId: null
            });
        } else {
            designs.forEach((design, designIndex) => {
                if (!design || typeof design !== 'object') { console.warn("Skipping invalid design item", design); return; }
                const originalDesignId = design.DesignID; // <-- เก็บ ID ดั้งเดิม
                const designName = design.DiagramName || `Design ${originalDesignId}`;
                const implementations = Array.isArray(design.Implementations) ? design.Implementations : [];

                let designStartIndex = flatRows.length;
                let designRowCount = 0;
                const formattedDesignId = formatId("SD", originalDesignId);

                if (implementations.length === 0) {
                    designRowCount = 1;
                    flatRows.push({
                        key: `req-${originalReqId}-design-${originalDesignId}-no-impl-${designIndex}`,
                        reqId: formattedReqId, reqName: reqName,
                        designId: formattedDesignId, designName: designName,
                        implId: "-", implFile: null,
                        testCaseId: "-", testCaseName: "-",
                        isFirstReqRow: (reqRowCount === 0), reqRowSpan: 0,
                        isFirstDesignRow: true, designRowSpan: 1,
                        isFirstImplRow: true, implRowSpan: 1,
                        originalReqId: originalReqId,
                        originalDesignId: originalDesignId,
                        originalImplId: null,
                        originalTcId: null
                    });
                    reqRowCount++;
                } else {
                    implementations.forEach((impl, implIndex) => {
                        if (!impl || typeof impl !== 'object') { console.warn("Skipping invalid impl item", impl); return; }
                        const originalImplId = impl.ImplementID; // <-- เก็บ ID ดั้งเดิม
                        const implFile = impl.ImplementFilename || 'N/A';
                        const testCases = Array.isArray(impl.TestCases) ? impl.TestCases : [];

                        let implStartIndex = flatRows.length;
                        let implRowCount = 0;
                        const formattedImplId = formatId("SC", originalImplId);

                        if (testCases.length === 0) {
                            implRowCount = 1;
                            flatRows.push({
                                key: `req-${originalReqId}-design-${originalDesignId}-impl-${originalImplId}-no-tc-${implIndex}`,
                                reqId: formattedReqId, reqName: reqName,
                                designId: formattedDesignId, designName: designName,
                                implId: formattedImplId, implFile: implFile,
                                testCaseId: "-", testCaseName: "-",
                                isFirstReqRow: (reqRowCount === 0), reqRowSpan: 0,
                                isFirstDesignRow: (designRowCount === 0), designRowSpan: 0,
                                isFirstImplRow: true, implRowSpan: 1,
                                originalReqId: originalReqId,
                                originalDesignId: originalDesignId,
                                originalImplId: originalImplId,
                                originalTcId: null
                            });
                            designRowCount++;
                            reqRowCount++;
                        } else {
                            testCases.forEach((tc, tcIndex) => {
                                if (!tc || typeof tc !== 'object') { console.warn("Skipping invalid tc item", tc); return; }
                                implRowCount++;
                                const originalTcId = tc.TestCaseID; // <-- เก็บ ID ดั้งเดิม
                                const tcName = tc.TestCaseName || `Test Case ${originalTcId}`;
                                const formattedTcId = formatId("TC", originalTcId);

                                flatRows.push({
                                    key: `req-${originalReqId}-design-${originalDesignId}-impl-${originalImplId}-tc-${originalTcId}-${tcIndex}`,
                                    reqId: formattedReqId, reqName: reqName,
                                    designId: formattedDesignId, designName: designName,
                                    implId: formattedImplId, implFile: implFile,
                                    testCaseId: formattedTcId, testCaseName: tcName,
                                    isFirstReqRow: (reqRowCount === 0 && tcIndex === 0), reqRowSpan: 0,
                                    isFirstDesignRow: (designRowCount === 0 && tcIndex === 0), designRowSpan: 0,
                                    isFirstImplRow: (tcIndex === 0), implRowSpan: 0,
                                    // เพิ่ม Original IDs
                                    originalReqId: originalReqId,
                                    originalDesignId: originalDesignId,
                                    originalImplId: originalImplId,
                                    originalTcId: originalTcId
                                });
                            });
                            if (implStartIndex < flatRows.length && implRowCount > 0) {
                                flatRows[implStartIndex].implRowSpan = implRowCount;
                            }
                            designRowCount += implRowCount;
                            reqRowCount += implRowCount;
                        }
                    });
                }
                if (designStartIndex < flatRows.length && designRowCount > 0) {
                    flatRows[designStartIndex].designRowSpan = designRowCount;
                }
            });
        }
        if (reqStartIndex < flatRows.length && reqRowCount > 0) {
            flatRows[reqStartIndex].reqRowSpan = reqRowCount;
            if (reqStartIndex === 0 || flatRows[reqStartIndex-1]?.originalReqId !== originalReqId) { // ใช้ original ID เช็ค
                 flatRows[reqStartIndex].isFirstReqRow = true;
            }
        }
    });
    return flatRows;
};


// --- Component หลัก ---
const CreateBaselineTrace = () => {
    // ... (ส่วน State, Hooks, Handlers, Fetch Data คงเดิม ไม่มีการเปลี่ยนแปลง) ...
    const [nestedData, setNestedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [projectName, setProjectName] = useState('');
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const selectedRound = queryParams.get("round");

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null); setNestedData([]); setProjectName('');
        if (!projectId || !selectedRound) {
            const msg = "Project ID or Source Round is missing from URL.";
            setError(msg); toast.error(msg); setLoading(false); return;
        }
        const roundNumber = parseInt(selectedRound, 10);
        if (isNaN(roundNumber)) {
            const msg = "Invalid Round number.";
            setError(msg); toast.error(msg); setLoading(false); return;
        }
        try {
            try {
                const nameResponse = await axios.get(`http://localhost:3001/projectname?project_id=${projectId}`);
                setProjectName((nameResponse.data && nameResponse.data.length > 0) ? nameResponse.data[0].project_name : `Project ${projectId}`);
            } catch (nameError) {
                 console.warn("Could not fetch project name:", nameError);
                 setProjectName(`Project ${projectId}`);
            }
            const response = await axios.get("http://localhost:3001/getTableVeriTracebyRound", { params: { project_id: projectId, create_round: selectedRound } });
            if (response.data?.success && Array.isArray(response.data.data)) {
                setNestedData(response.data.data);
                if (response.data.data.length === 0) {
                    const msg = `No data found in round ${selectedRound} to create a baseline.`;
                    setError(msg); toast.info(msg);
                }
            } else { throw new Error(response.data?.message || "Failed to fetch valid data."); }
        } catch (err) {
            console.error("Error fetching data:", err);
            const errorMsg = `Error fetching data: ${err.response?.data?.message || err.message}`;
            setError(errorMsg); toast.error(errorMsg);
        } finally { setLoading(false); }
    }, [projectId, selectedRound]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const displayRows = useMemo(() => flattenNestedDataForTable(nestedData), [nestedData]);

    const handleSave = async () => {
        setSaving(true);
        const storedUsername = localStorage.getItem("username");
        if (!storedUsername) { toast.error("User session expired. Please log in again."); setSaving(false); return; }
        const sourceRoundInt = parseInt(selectedRound, 10);
        if (isNaN(sourceRoundInt)) { toast.error("Invalid source round."); setSaving(false); return; }
        if (nestedData.length === 0 || displayRows.length === 0) { toast.info("No traceability links to create baseline from."); setSaving(false); return; }
        try {
            const maxRoundResult = await axios.get(`http://localhost:3001/getMaxBaselineRound/${projectId}`);
            let nextRound = (maxRoundResult.data?.maxRound !== null && !isNaN(parseInt(maxRoundResult.data.maxRound))) ? parseInt(maxRoundResult.data.maxRound, 10) + 1 : 1;
            console.log(`Determined next baseline round: ${nextRound}`);
            const savePromises = [];
            nestedData.forEach(req => { // <--- ใช้ req ที่นี่ถูกต้องแล้ว
                const reqId = req.RequirementID;
                const designs = req.Designs || [];
                if (designs.length === 0) { savePromises.push(axios.post("http://localhost:3001/saveBaselineTrace", { project_id: projectId, requirement_id: reqId, design_id: null, implement_id: null, testcase_id: null, baselinetrace_by: storedUsername, baselinetrace_round: nextRound, create_round: sourceRoundInt })); }
                else { designs.forEach(design => { // <--- ใช้ design ที่นี่ถูกต้อง
                        const designId = design.DesignID;
                        const implementations = design.Implementations || [];
                        if (implementations.length === 0) { savePromises.push(axios.post("http://localhost:3001/saveBaselineTrace", { project_id: projectId, requirement_id: reqId, design_id: designId, implement_id: null, testcase_id: null, baselinetrace_by: storedUsername, baselinetrace_round: nextRound, create_round: sourceRoundInt })); }
                        else { implementations.forEach(impl => { // <--- ใช้ impl ที่นี่ถูกต้อง
                                const implId = impl.ImplementID;
                                const testCases = impl.TestCases || [];
                                if (testCases.length === 0) { savePromises.push(axios.post("http://localhost:3001/saveBaselineTrace", { project_id: projectId, requirement_id: reqId, design_id: designId, implement_id: implId, testcase_id: null, baselinetrace_by: storedUsername, baselinetrace_round: nextRound, create_round: sourceRoundInt })); }
                                else { testCases.forEach(tc => { // <--- ใช้ tc ที่นี่ถูกต้อง
                                        const tcId = tc.TestCaseID;
                                        savePromises.push(axios.post("http://localhost:3001/saveBaselineTrace", { project_id: projectId, requirement_id: reqId, design_id: designId, implement_id: implId, testcase_id: tcId, baselinetrace_by: storedUsername, baselinetrace_round: nextRound, create_round: sourceRoundInt }));
                                    });
                                } });
                        } });
                } });
            if (savePromises.length === 0) { toast.info("No valid links found to save."); setSaving(false); return; }
            console.log(`Attempting to save ${savePromises.length} baseline records for round ${nextRound}...`);
            await Promise.all(savePromises);
            console.log(`Baseline round ${nextRound} records saved.`);
            try {
                const statusUpdatePayload = { project_id: projectId, create_round: selectedRound, new_status: "BASELINE" };
                await axios.put('http://localhost:3001/updateVerificationStatusByRound', statusUpdatePayload);
                console.log(`Updated status for source round ${selectedRound} to BASELINE.`);
            } catch (statusUpdateError) { console.error(`Error updating status for source round ${selectedRound}:`, statusUpdateError); toast.warning(`Baseline created, but failed to update status of source round ${selectedRound}.`); }
            toast.success(`Baseline round ${nextRound} created successfully!`, { onClose: () => { navigate(`/viewBaselineTrace?project_id=${projectId}`); }, autoClose: 2500 });
        } catch (error) { console.error("Error saving baseline trace", error); toast.error(`Error creating baseline: ${error.response?.data?.message || error.message}`);
        } finally { setSaving(false); }
    };

    const handleCancel = () => { navigate(-1); };

    // --- Render Logic ---
    return (
        <div className="cb-container">
            {/* Header */}
            <div className="cb-header">
                <button className="cb-back-btn" onClick={handleCancel} disabled={saving}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1 className="cb-title">
                    <FontAwesomeIcon icon={faLayerGroup} className="cb-title-icon" />
                    Create Baseline: {projectName} - from Round {selectedRound || '?'}
                </h1>
            </div>

            {/* Content Area */}
            <div className="cb-content">
                {loading && (<div className="cb-loading"><FontAwesomeIcon icon={faSpinner} spin size="2x" /><p>Loading verification data for Round {selectedRound}...</p></div>)}
                {error && !loading && (
                    <div className="cb-error-message">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                        <p>Error</p>
                        <span className="cb-error-details">{error}</span>
                        <button onClick={fetchData} className="cb-retry-button">Retry</button>
                    </div>
                )}
                 {!loading && !error && displayRows.length === 0 && (
                     <div className="cb-no-data">
                         <FontAwesomeIcon icon={faInfoCircle} size="2x" />
                         <p>No data available in Round {selectedRound} to create a baseline.</p>
                         <button onClick={handleCancel} className="cb-cancel-button">Go Back</button>
                     </div>
                 )}

                {!loading && !error && displayRows.length > 0 && (
                    <>
                        {/* Confirmation Table Section */}
                        <div className="cb-table-section">
                            <h2 className="cb-box-title">Confirm Traceability Record for New Baseline</h2>
                            <div className="cb-table-container">
                                <table className="cb-table">
                                    <thead><tr><th>Requirement</th><th>Design</th><th>Code Component</th><th>Test Case</th></tr></thead>
                                    {/* --- ⬇️ แก้ไขการแสดงผลชื่อให้ใช้ Original ID จาก row --- */}
                                    <tbody>
                                        {displayRows.map((row) => ( // ตัวแปรคือ 'row'
                                            <tr key={row.key}>
                                                {row.isFirstReqRow && (
                                                    <td rowSpan={row.reqRowSpan}>
                                                        <div>{row.reqId}</div> {/* แสดง ID ที่ Format แล้ว */}
                                                        {/* ใช้ row.originalReqId ในการเปรียบเทียบ */}
                                                        {row.reqName && row.reqName !== `Requirement ${row.originalReqId}` && (
                                                            <div className="cb-item-detail">{row.reqName}</div>
                                                        )}
                                                    </td>
                                                )}
                                                {row.isFirstDesignRow && (
                                                    <td rowSpan={row.designRowSpan}>
                                                         <div>{row.designId}</div> {/* แสดง ID ที่ Format แล้ว */}
                                                         {/* ใช้ row.originalDesignId ในการเปรียบเทียบ */}
                                                         {row.designName && row.designName !== "-" && row.designName !== `Design ${row.originalDesignId}` && (
                                                             <div className="cb-item-detail">{row.designName}</div>
                                                         )}
                                                     </td>
                                                )}
                                                {row.isFirstImplRow && (
                                                     <td rowSpan={row.implRowSpan}>
                                                         <div>{row.implId}</div> {/* แสดง ID ที่ Format แล้ว */}
                                                         {/* ส่วน File Name ไม่ต้องเปรียบเทียบ */}
                                                         {row.implFile && row.implFile !== 'N/A' ? (
                                                             <div className="cb-item-detail">{row.implFile}</div>
                                                         ) : null}
                                                     </td>
                                                )}
                                                <td>
                                                     <div>{row.testCaseId}</div> {/* แสดง ID ที่ Format แล้ว */}
                                                      {/* ใช้ row.originalTcId ในการเปรียบเทียบ */}
                                                     {row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.originalTcId}` ? (
                                                         <div className="cb-item-detail">{row.testCaseName}</div>
                                                     ) : null}
                                                 </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {/* --- ⬆️ สิ้นสุด tbody ที่แก้ไขแล้ว --- */}
                                </table>
                            </div>
                        </div>

                        {/* Action Buttons Area */}
                        <div className="cb-button-container">
                            <button className="cb-cancel-button" onClick={handleCancel} disabled={saving}>
                                <FontAwesomeIcon icon={faTimes} /> Cancel
                            </button>
                            <button className="cb-create-button" onClick={handleSave} disabled={saving || loading}>
                                <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
                                {saving ? "Creating..." : "Create New Baseline"}
                            </button>
                        </div>
                    </>
                )}
            </div> {/* End cb-content */}
        </div> // End cb-container
    );
};

export default CreateBaselineTrace;