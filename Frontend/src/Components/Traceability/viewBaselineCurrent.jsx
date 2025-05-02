import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns'; // Import date-fns
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faStar, faFileLines, faSpinner, faExclamationTriangle // Import icons (use faStar for current)
} from '@fortawesome/free-solid-svg-icons';

// --- CSS Import ---
import './CSS/viewBaselineCurrent.css'; // <<--- Import CSS ใหม่

// Helper function: flattenNestedDataForTable (เหมือนเดิม)
const flattenNestedDataForTable = (data) => {
    const flatRows = [];
    if (!Array.isArray(data) || data.length === 0) return flatRows;
    data.forEach((req, reqIndex) => {
        if (!req || typeof req !== 'object') { console.warn("Skipping invalid req item"); return; }
        const reqId = req.RequirementID; const reqName = req.RequirementName || `Requirement ${reqId}`;
        const designs = Array.isArray(req.Designs) ? req.Designs : [];
        let reqRowCount = 0; let isFirstReqRow = true;
        if (designs.length === 0) {
            reqRowCount = 1;
            flatRows.push({ key: `req-${reqIndex}-no-design`, reqId: reqId, reqName: reqName, designId: "-", designName: "-", implId: null, implFile: null, testCaseId: "-", testCaseName: "-", isFirstReqRow: true, reqRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1 }); return;
        }
        designs.forEach((design, designIndex) => {
            if (!design || typeof design !== 'object') { console.warn("Skipping invalid design item"); return; }
            let designRowCount = 0; let isFirstDesignRow = true;
            const designId = design.DesignID; const designName = design.DiagramName || `Design ${designId}`;
            const implementations = Array.isArray(design.Implementations) ? design.Implementations : [];
            if (implementations.length === 0) {
                designRowCount = 1;
                flatRows.push({ key: `req-${reqIndex}-design-${designIndex}-no-impl`, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: null, implFile: null, testCaseId: "-", testCaseName: "-", isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1 }); reqRowCount += designRowCount; isFirstReqRow = false; return;
            }
            implementations.forEach((impl, implIndex) => {
                if (!impl || typeof impl !== 'object') { console.warn("Skipping invalid impl item"); return; }
                let implRowCount = 0; let isFirstImplRow = true;
                const implId = impl.ImplementID; const implFile = impl.ImplementFilename;
                const testCases = Array.isArray(impl.TestCases) ? impl.TestCases : [];
                if (testCases.length === 0) {
                    implRowCount = 1;
                    flatRows.push({ key: `req-${reqIndex}-design-${designIndex}-impl-${implIndex}-no-tc`, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: implId, implFile: implFile, testCaseId: "-", testCaseName: "-", isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: true, implRowSpan: 1 }); designRowCount += implRowCount; isFirstReqRow = false; isFirstDesignRow = false; return;
                }
                testCases.forEach((tc, tcIndex) => {
                    if (!tc || typeof tc !== 'object') { console.warn("Skipping invalid tc item"); return; }
                    implRowCount++; const tcId = tc.TestCaseID; const tcName = tc.TestCaseName || `Test Case ${tcId}`;
                    flatRows.push({ key: `req-${reqIndex}-design-${designIndex}-impl-${implIndex}-tc-${tcIndex}`, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: implId, implFile: implFile, testCaseId: tcId, testCaseName: tcName, isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: isFirstImplRow, implRowSpan: 0 }); isFirstReqRow = false; isFirstDesignRow = false; isFirstImplRow = false;
                });
                const firstImplRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqIndex}-design-${designIndex}-impl-${implIndex}`)); if (firstImplRowIndex !== -1 && flatRows[firstImplRowIndex]) flatRows[firstImplRowIndex].implRowSpan = implRowCount; designRowCount += implRowCount;
            });
            const firstDesignRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqIndex}-design-${designIndex}`)); if (firstDesignRowIndex !== -1 && flatRows[firstDesignRowIndex]) flatRows[firstDesignRowIndex].designRowSpan = designRowCount; reqRowCount += designRowCount;
        });
        const firstReqRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqIndex}`)); if (firstReqRowIndex !== -1 && flatRows[firstReqRowIndex]) flatRows[firstReqRowIndex].reqRowSpan = reqRowCount;
    });
    return flatRows;
};

// --- Component หลัก: ViewBaselineCurrent ---
const ViewBaselineCurrent = () => {
    const [nestedData, setNestedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [projectName, setProjectName] = useState(''); // เพิ่ม State ชื่อโปรเจกต์
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const round = queryParams.get("round"); // Round ของ Current Baseline ที่ส่งมา

    // Fetch Data
    useEffect(() => {
        setNestedData([]);
        if (projectId && round) {
            setLoading(true); setError(''); setProjectName(''); // Reset project name

            // Fetch Project Name
            axios.get(`http://localhost:3001/projectname?project_id=${projectId}`)
                .then(nameResponse => {
                    setProjectName((nameResponse.data && nameResponse.data.length > 0) ? nameResponse.data[0].project_name : `Project ${projectId}`);
                })
                .catch(nameError => { setProjectName(`Project ${projectId}`); });

            // Fetch Baseline Detail
            axios.get(`http://localhost:3001/viewBaselineTraceDetail`, { params: { project_id: projectId, round: round } })
                .then(response => {
                    if (response.data?.success && Array.isArray(response.data.data)) {
                        setNestedData(response.data.data);
                    } else { setError(response.data.message || 'Invalid data format.'); setNestedData([]); }
                })
                .catch(errorInstance => {
                     let errorMessage = '';
                      if (errorInstance.response) { errorMessage = `Error: ${errorInstance.response.data?.message || `Status ${errorInstance.response.status}`}`; }
                      else if (errorInstance.request) { errorMessage = 'Error: No response from server.'; }
                      else { errorMessage = `Error: ${errorInstance.message}`; }
                      setError(errorMessage); setNestedData([]);
                 })
                .finally(() => { setLoading(false); });
        } else { setError('Project ID and Round are required.'); setLoading(false); }
    }, [projectId, round]);

    // Calculate display rows
    const displayRows = useMemo(() => flattenNestedDataForTable(nestedData), [nestedData]);

    // Handle Back Button
    const handleBack = () => {
        // กลับไปหน้า Current Baseline Summary หรือ หน้าหลัก Traceability ก็ได้
        navigate(`/currentBaselineTrace?project_id=${projectId}`);
        // หรือ navigate(-1); ถ้าต้องการย้อนกลับแบบ Browser
        // หรือ navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Traceability" } });
    };

    // --- Render Logic ---
    return (
        // *** ใช้ Prefix vbc- ***
        <div className="vbc-container">
            {/* Header */}
            <div className="vbc-header">
                <button className="vbc-back-btn" onClick={handleBack} aria-label="Go back">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1 className="vbc-title">
                    <FontAwesomeIcon icon={faStar} className="vbc-title-icon" /> {/* Icon ดาว */}
                     Current Baseline Details (Round {round || 'N/A'})
                 </h1>
                 {/* แสดงชื่อโปรเจกต์เสริม */}
                 <span className="vbc-project-name">Project: {projectName || '...'}</span>
            </div>

            {/* Content Area */}
            <div className="vbc-content">
                {loading ? (
                    <div className="vbc-loading"> <FontAwesomeIcon icon={faSpinner} spin size="2x" /> <p>Loading details...</p> </div>
                ) : error ? (
                    <div className="vbc-error-message"> <FontAwesomeIcon icon={faExclamationTriangle} size="2x" /> <p>Error</p><span className="vbc-error-details">{error}</span> </div>
                ) : displayRows.length === 0 ? (
                    <div className="vbc-no-data"> <p>No traceability data found for this baseline round.</p> </div>
                ) : (
                    // Table Container
                    <div className="vbc-table-container">
                        <table className="vbc-table">
                            <thead>
                                <tr>
                                    <th>Requirement</th><th>Design</th><th>Code Component</th><th>Test Case</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayRows.map((row) => (
                                    <tr key={row.key}>
                                        {/* Requirement Cell */}
                                        {row.isFirstReqRow && (
                                            <td rowSpan={row.reqRowSpan}>
                                                <div className="vbc-req-id">{`REQ-${row.reqId}`}</div>
                                                {row.reqName && row.reqName !== `Requirement ${row.reqId}` && (<div className="vbc-item-detail">{row.reqName}</div>)}
                                            </td>
                                        )}
                                        {/* Design Cell */}
                                        {row.isFirstDesignRow && (
                                            <td rowSpan={row.designRowSpan}>
                                                {row.designId !== "-" ? `DE-${row.designId}` : "-"}
                                                {row.designName && row.designName !== "-" && row.designName !== `Design ${row.designId}` && (<div className="vbc-item-detail">{row.designName}</div>)}
                                            </td>
                                        )}
                                        {/* Implementation Cell */}
                                        {row.isFirstImplRow && (
                                            <td rowSpan={row.implRowSpan}>
                                                {row.implId !== null && row.implId !== "-" ? (<>{`IMP-${row.implId}`}{row.implFile && row.implFile !== 'N/A' && (<div className="vbc-item-detail">{row.implFile}</div>)}</>) : ("-")}
                                            </td>
                                        )}
                                        {/* Test Case Cell */}
                                        <td>
                                            {row.testCaseId !== "-" ? `TC-${row.testCaseId}` : "-"}
                                            {row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.testCaseId}` && (<div className="vbc-item-detail">{row.testCaseName}</div>)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div> {/* End vbc-content */}
        </div> // End vbc-container
    );
};

export default ViewBaselineCurrent;