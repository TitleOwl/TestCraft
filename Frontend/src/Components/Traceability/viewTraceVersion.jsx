import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
// import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/createVerifyTrace.css";
import "./CSS/traceabilityPage.css";

// Helper function (เหมือนเดิม)
const flattenTraceabilityData = (nestedData) => {
    const flatRows = [];
    if (!Array.isArray(nestedData) || nestedData.length === 0) { return flatRows; }
    nestedData.forEach(req => {
        let reqRowCount = 0; let isFirstReqRow = true; const reqId = req.RequirementID; const reqName = req.RequirementName || `Requirement ${reqId}`; const designs = Array.isArray(req.Designs) ? req.Designs : []; const veritraceId = req.veritrace_id;
        if (designs.length === 0) { reqRowCount = 1; flatRows.push({ key: `req-${reqId}-no-design`, veritraceId: veritraceId, reqId: reqId, reqName: reqName, designId: "-", designName: "-", implId: null, implFile: null, testCaseId: "-", testCaseName: "-", isFirstReqRow: true, reqRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1, }); return; }
        designs.forEach((design) => {
            let designRowCount = 0; let isFirstDesignRow = true; const designId = design.DesignID; const designName = design.DiagramName || `Design ${designId}`; const implementations = Array.isArray(design.Implementations) ? design.Implementations : [];
            if (implementations.length === 0) { designRowCount = 1; flatRows.push({ key: `req-${reqId}-design-${designId}-no-impl`, veritraceId: veritraceId, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: null, implFile: null, testCaseId: "-", testCaseName: "-", isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1, }); reqRowCount += designRowCount; isFirstReqRow = false; return; }
            implementations.forEach((impl) => {
                let implRowCount = 0; let isFirstImplRow = true; const implId = impl.ImplementID; const implFile = impl.ImplementFilename; const testCases = Array.isArray(impl.TestCases) ? impl.TestCases : [];
                if (testCases.length === 0) { implRowCount = 1; flatRows.push({ key: `req-${reqId}-design-${designId}-impl-${implId}-no-tc`, veritraceId: veritraceId, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: implId, implFile: implFile, testCaseId: "-", testCaseName: "-", isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: true, implRowSpan: 1, }); designRowCount += implRowCount; isFirstReqRow = false; isFirstDesignRow = false; return; }
                testCases.forEach((tc) => {
                    implRowCount++; const tcId = tc.TestCaseID; const tcName = tc.TestCaseName || `Test Case ${tcId}`;
                    flatRows.push({ key: `req-${reqId}-design-${designId}-impl-${implId}-tc-${tcId}`, veritraceId: veritraceId, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: implId, implFile: implFile, testCaseId: tcId, testCaseName: tcName, isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: isFirstImplRow, implRowSpan: 0, }); isFirstReqRow = false; isFirstDesignRow = false; isFirstImplRow = false;
                });
                const firstImplRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqId}-design-${designId}-impl-${implId}`)); if (firstImplRowIndex !== -1 && flatRows[firstImplRowIndex]) flatRows[firstImplRowIndex].implRowSpan = implRowCount; designRowCount += implRowCount;
            });
            const firstDesignRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqId}-design-${designId}`)); if (firstDesignRowIndex !== -1 && flatRows[firstDesignRowIndex]) flatRows[firstDesignRowIndex].designRowSpan = designRowCount; reqRowCount += designRowCount;
        });
        const firstReqRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqId}`)); if (firstReqRowIndex !== -1 && flatRows[firstReqRowIndex]) flatRows[firstReqRowIndex].reqRowSpan = reqRowCount;
    });
    return flatRows;
};

// --- Component หลัก: ViewTraceVersion ---
const ViewTraceVersion = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const round = queryParams.get("round");

    // State หลัก
    const [nestedData, setNestedData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State สำหรับ Criteria และ Reviewers
    const [criteriaNames, setCriteriaNames] = useState([]);
    const [reviewerNames, setReviewerNames] = useState([]); // <<--- เปลี่ยน State เป็น Array
    const [isLoadingExtraData, setIsLoadingExtraData] = useState(true);
    const [extraDataError, setExtraDataError] = useState(null);

    // Fetch Data หลัก (เหมือนเดิม)
    useEffect(() => {
        setNestedData([]);
        if (projectId && round) {
            setIsLoading(true); setError(null);
            axios.get(`http://localhost:3001/getTableVeriTracebyRound`, { params: { project_id: projectId, create_round: round } })
                .then(response => {
                    if (response.data?.success && Array.isArray(response.data.data)) { setNestedData(response.data.data); if (response.data.data.length === 0) console.warn(`No verification data found for project ${projectId}, round ${round}`); }
                    else { setError(response.data.message || 'Invalid data format received for trace details.'); setNestedData([]); }
                })
                .catch(err => { console.error(`Error fetching verification data for round ${round}:`, err); setError(`Error fetching trace details: ${err.response?.data?.message || err.message}`); })
                .finally(() => { setIsLoading(false); });
        } else { setError("Project ID and Round are required in the URL."); setIsLoading(false); }
    }, [projectId, round]);

    // Fetch Criteria & Reviewers (แก้ไขการ set state)
    useEffect(() => {
        setCriteriaNames([]);
        setReviewerNames([]); // <<--- เคลียร์ reviewerNames
        if (projectId && round) {
            setIsLoadingExtraData(true);
            setExtraDataError(null);
            axios.get(`http://localhost:3001/showCriteriaTraceVersion`, { params: { project_id: projectId, create_round: round } })
                .then(response => {
                    console.log("Criteria/Reviewers API Response:", response.data);
                    if (response.data?.success && response.data.data) {
                        setCriteriaNames(Array.isArray(response.data.data.criteria) ? response.data.data.criteria : []);
                        // <<--- ใช้ setReviewerNames และดึงจาก response.data.data.reviewerNames ---
                        setReviewerNames(Array.isArray(response.data.data.reviewerNames) ? response.data.data.reviewerNames : []);
                    } else {
                        console.warn("No criteria/reviewers data found or invalid format:", response.data?.message);
                        setCriteriaNames([]);
                        setReviewerNames([]); // <<--- เคลียร์ reviewerNames
                    }
                })
                .catch(err => { console.error(`Error fetching criteria/reviewers for round ${round}:`, err); setExtraDataError(`Error fetching criteria/reviewers: ${err.response?.data?.message || err.message}`); })
                .finally(() => { setIsLoadingExtraData(false); });
        } else { setIsLoadingExtraData(false); }
    }, [projectId, round]);

    // คำนวณ Rows สำหรับตารางหลัก
    const tableRows = useMemo(() => flattenTraceabilityData(nestedData), [nestedData]);

    // --- Render Logic ---
    const combinedLoading = isLoading || isLoadingExtraData;
    if (combinedLoading) return <div className="loading">Loading details for round {round}...</div>;
    if (error) return <div className="error">{error}</div>; // แสดง Error หลัก

    return (
        <div className="verify-traceability" style={{ padding: '20px' }}>
            <button onClick={() => navigate(`/versionVerTrace?project_id=${projectId}`)}>Back to History</button>
            <h1>Traceability Record</h1>

            {/* ส่วนแสดงตาราง Traceability (เหมือนเดิม) */}
            {tableRows.length === 0 && !error ? ( <div className="no-data-message"> No traceability links found for this round. </div> )
             : !error && (
                 <div className="traceability-table-container" >
                     <table className="traceability-table">
                         <thead><tr> <th>Requirement ID / Name</th> <th>Design ID / Name</th> <th>Code Component ID / Filename</th> <th>Test Case ID / Name</th> </tr></thead>
                         <tbody>
                              {tableRows.map((row) => (
                                 <tr key={row.key}>
                                     {row.isFirstReqRow && (<td rowSpan={row.reqRowSpan} className="requirement-cell"><div className="reqid-trace">{`REQ-${row.reqId}`}</div>{row.reqName && row.reqName !== `Requirement ${row.reqId}` ? (<div className="reqname-trace" >({row.reqName})</div>) : null}</td>)}
                                     {row.isFirstDesignRow && (<td rowSpan={row.designRowSpan}>{row.designId !== "-" ? `DE-${row.designId}` : "-"}{row.designName && row.designName !== "-" && row.designName !== `Design ${row.designId}` ? (<><br /><span >({row.designName})</span></>) : null}</td>)}
                                     {row.isFirstImplRow && (<td rowSpan={row.implRowSpan}>{row.implId !== null && row.implId !== "-" ? (<>{`IMP-${row.implId}`}{row.implFile && row.implFile !== 'N/A' ? (<><br />({row.implFile})</>) : null}</>) : ("-")}</td>)}
                                     <td>{row.testCaseId !== "-" ? `TC-${row.testCaseId}` : "-"}{row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.testCaseId}` ? (<><br /><span >({row.testCaseName})</span></>) : null}</td>
                                 </tr>
                             ))}
                          </tbody>
                     </table>
                 </div>
             )}

             {/* --- Section for Criteria Display (เหมือนเดิม) --- */}
            <div className="criteria-section-viewtraceversion">
                <h3>Verification Criteria Used</h3>
                {isLoadingExtraData && <div className="loading">Loading criteria...</div>}
                {extraDataError && !error && <div className="error">{extraDataError}</div>}
                {!isLoadingExtraData && !extraDataError && (
                    criteriaNames.length > 0 ? (
                         <table className='criteria-table-viewtraceversion'>
                              <thead><tr><th>#</th><th>Criteria Name</th></tr></thead>
                              <tbody>{criteriaNames.map((name, index) => (<tr key={index}><td>{index + 1}</td><td>{name}</td></tr>))}</tbody>
                         </table>
                    ) : (<div className="no-data">No criteria information recorded for this round.</div>)
                )}
            </div>

            <div className="reviewer-section-viewtraceversion" >
                <h3>Verified By (Reviewers)</h3>
                {isLoadingExtraData && <div className="loading">Loading reviewers...</div>}
                {extraDataError && !error && <div className="error">{extraDataError}</div>}
                {!isLoadingExtraData && !extraDataError && (
                    // ใช้ reviewerNames.length
                    reviewerNames.length > 0 ? (
                        // แสดงเป็น ul/li หรือตารางคอลัมน์เดียว
                        <ul className="reviewer-list">
                            {/* วนลูป reviewerNames */}
                            {reviewerNames.map((name, index) => (
                                <li key={index}>{name}</li>
                            ))}
                        </ul>
                    ) : (
                        <div className="no-data">No specific reviewers recorded for this round.</div>
                    )
                )}
            </div>
        </div>
    );
};

export default ViewTraceVersion;