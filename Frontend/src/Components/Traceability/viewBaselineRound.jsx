import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faFileLines, faSpinner, faExclamationTriangle // Import icons
} from '@fortawesome/free-solid-svg-icons';

import './CSS/viewBaselineRound.css'; // <<--- Import CSS for this component

// Helper Function: flattenNestedDataForTable (เหมือนเดิม)
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

// --- Main Component ---
const ViewBaselineRound = () => {
    const [nestedData, setNestedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const round = queryParams.get("round");

    // Fetch Data
    useEffect(() => {
        setNestedData([]); // Clear old data
        if (projectId && round) {
            setLoading(true); setError('');
            axios.get(`http://localhost:3001/viewBaselineTraceDetail`, { params: { project_id: projectId, round: round } })
                .then(response => {
                    console.log("API Response (ViewBaselineRound):", response.data);
                    if (response.data?.success && Array.isArray(response.data.data)) {
                        setNestedData(response.data.data);
                        if (response.data.data.length === 0) {
                            console.log(`No baseline data found for project ${projectId}, round ${round}`);
                            // Optional: Set an error or message if data is expected but empty
                            // setError(`No baseline data found for round ${round}.`);
                        }
                    } else {
                        setError(response.data.message || 'Invalid data format received.');
                        setNestedData([]);
                    }
                })
                .catch(errorInstance => {
                    console.error('Error fetching baseline trace detail:', errorInstance);
                     let errorMessage = '';
                     if (errorInstance.response) {
                         errorMessage = `Error: ${errorInstance.response.data?.message || `Status ${errorInstance.response.status}`}`;
                     } else if (errorInstance.request) {
                         errorMessage = 'Error: No response from server.';
                     } else {
                         errorMessage = `Error: ${errorInstance.message}`;
                     }
                     setError(errorMessage);
                     setNestedData([]);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setError('Project ID and Round are required in the URL.');
            setLoading(false);
        }
    }, [projectId, round]);

    // Calculate display rows
    const displayRows = useMemo(() => flattenNestedDataForTable(nestedData), [nestedData]);

    const handleBack = () => {
        navigate(`/viewBaselineTrace?project_id=${projectId}`);
    }

    // --- Render Logic ---
    return (
        <div className="vbr-container"> {/* Use vbr- prefix */}
            {/* Header */}
            <div className="vbr-header">
                <button className="vbr-back-btn" onClick={handleBack} aria-label="Back to Baseline List">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1 className="vbr-title">
                    <FontAwesomeIcon icon={faFileLines} className="vbr-title-icon" />
                    Baseline Traceability Details - Round {round || 'N/A'}
                </h1>
                {/* No extra buttons needed in this header */}
            </div>

            {/* Content Area */}
            <div className="vbr-content">
                {loading ? (
                    <div className="vbr-loading">
                        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                        <p>Loading baseline details...</p>
                    </div>
                ) : error ? (
                    <div className="vbr-error-message">
                         <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                         <p>Error Loading Data</p>
                         <span className="vbr-error-details">{error}</span>
                         {/* Optionally add retry button */}
                    </div>
                ) : displayRows.length === 0 ? (
                    // Specific message for no data *after* successful load
                    <div className="vbr-no-data">
                        <p>No traceability data found for this baseline round ({`BL-${round}`}).</p>
                        <span className="vbr-no-data-subtle">This baseline might be empty or data could not be retrieved.</span>
                    </div>
                ) : (
                    // Table Container
                    <div className="vbr-table-container">
                        <table className="vbr-table">
                            <thead>
                                <tr>
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
                                            <td rowSpan={row.reqRowSpan}>
                                                <div className="vbr-req-id">{`REQ-${row.reqId}`}</div>
                                                {row.reqName && row.reqName !== `Requirement ${row.reqId}` && (
                                                    <div className="vbr-item-detail">{row.reqName}</div>
                                                )}
                                            </td>
                                        )}
                                        {/* Design Cell */}
                                        {row.isFirstDesignRow && (
                                            <td rowSpan={row.designRowSpan}>
                                                {row.designId !== "-" ? `DE-${row.designId}` : "-"}
                                                {row.designName && row.designName !== "-" && row.designName !== `Design ${row.designId}` && (
                                                    <div className="vbr-item-detail">{row.designName}</div>
                                                )}
                                            </td>
                                        )}
                                        {/* Implementation Cell */}
                                        {row.isFirstImplRow && (
                                            <td rowSpan={row.implRowSpan}>
                                                {row.implId !== null && row.implId !== "-" ? (
                                                    <>
                                                        {`IMP-${row.implId}`}
                                                        {row.implFile && row.implFile !== 'N/A' && (
                                                            <div className="vbr-item-detail">{row.implFile}</div>
                                                        )}
                                                    </>
                                                ) : ( "-" )}
                                            </td>
                                        )}
                                        {/* Test Case Cell */}
                                        <td>
                                            {row.testCaseId !== "-" ? `TC-${row.testCaseId}` : "-"}
                                            {row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.testCaseId}` && (
                                                <div className="vbr-item-detail">{row.testCaseName}</div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div> {/* End vbr-content */}
        </div> // End vbr-container
    );
};

export default ViewBaselineRound;