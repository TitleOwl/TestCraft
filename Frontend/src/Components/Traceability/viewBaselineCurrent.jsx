import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns'; // Import date-fns (ถ้ายังไม่ได้ใช้ อาจลบออกได้)
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faStar, faFileLines, faSpinner, faExclamationTriangle // Import icons
} from '@fortawesome/free-solid-svg-icons';

// --- CSS Import ---
import './CSS/viewBaselineCurrent.css'; // <<--- Import CSS ใหม่

// --- Helper Function: flattenNestedDataForTable (แก้ไข Format ID ที่นี่) ---
const flattenNestedDataForTable = (data) => {
    const flatRows = [];
    if (!Array.isArray(data) || data.length === 0) return flatRows;

    // --- ฟังก์ชันช่วย Format ID (เหมือนเดิม) ---
    const formatId = (prefix, id) => {
        if (id === null || id === undefined || id === "-") return "-";
        const numId = Number(id);
        if (isNaN(numId)) return id.toString();
        return `${prefix}-${String(numId).padStart(3, '0')}`;
    };
    // --- สิ้นสุดฟังก์ชันช่วย ---

    data.forEach((req, reqIndex) => {
        if (!req || typeof req !== 'object') { console.warn("Skipping invalid req item", req); return; }
        const originalReqId = req.RequirementID; // <-- เก็บ ID ดั้งเดิม
        const reqName = req.RequirementName || `Requirement ${originalReqId}`;
        const designs = Array.isArray(req.Designs) ? req.Designs : [];

        let reqStartIndex = flatRows.length;
        let reqRowCount = 0;
        const formattedReqId = formatId("REQ", originalReqId); // Format จาก ID ดั้งเดิม

        if (designs.length === 0) {
            reqRowCount = 1;
            flatRows.push({
                key: `req-${originalReqId}-no-design-${reqIndex}`,
                reqId: formattedReqId, // <-- ใช้ค่าที่ Format แล้ว
                reqName: reqName,
                designId: "-", designName: "-",
                implId: "-", implFile: null,
                testCaseId: "-", testCaseName: "-",
                isFirstReqRow: true, reqRowSpan: 1,
                isFirstDesignRow: true, designRowSpan: 1,
                isFirstImplRow: true, implRowSpan: 1,
                originalReqId: originalReqId, originalDesignId: null, originalImplId: null, originalTcId: null
            });
        } else {
            designs.forEach((design, designIndex) => {
                if (!design || typeof design !== 'object') { console.warn("Skipping invalid design item", design); return; }
                const originalDesignId = design.DesignID; // <-- เก็บ ID ดั้งเดิม
                const designName = design.DiagramName || `Design ${originalDesignId}`;
                const implementations = Array.isArray(design.Implementations) ? design.Implementations : [];

                let designStartIndex = flatRows.length;
                let designRowCount = 0;
                const formattedDesignId = formatId("SD", originalDesignId); // <-- Format ที่นี่ (ใช้ SD)

                if (implementations.length === 0) {
                    designRowCount = 1;
                    flatRows.push({
                        key: `req-${originalReqId}-design-${originalDesignId}-no-impl-${designIndex}`,
                        reqId: formattedReqId, reqName: reqName,
                        designId: formattedDesignId, // <-- ใช้ค่าที่ Format แล้ว
                        designName: designName,
                        implId: "-", implFile: null,
                        testCaseId: "-", testCaseName: "-",
                        isFirstReqRow: (reqRowCount === 0), reqRowSpan: 0,
                        isFirstDesignRow: true, designRowSpan: 1,
                        isFirstImplRow: true, implRowSpan: 1,
                        originalReqId: originalReqId, originalDesignId: originalDesignId, originalImplId: null, originalTcId: null
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
                        const formattedImplId = formatId("SC", originalImplId); // <-- Format ที่นี่ (ใช้ SC)

                        if (testCases.length === 0) {
                            implRowCount = 1;
                            flatRows.push({
                                key: `req-${originalReqId}-design-${originalDesignId}-impl-${originalImplId}-no-tc-${implIndex}`,
                                reqId: formattedReqId, reqName: reqName,
                                designId: formattedDesignId, designName: designName,
                                implId: formattedImplId, // <-- ใช้ค่าที่ Format แล้ว
                                implFile: implFile,
                                testCaseId: "-", testCaseName: "-",
                                isFirstReqRow: (reqRowCount === 0), reqRowSpan: 0,
                                isFirstDesignRow: (designRowCount === 0), designRowSpan: 0,
                                isFirstImplRow: true, implRowSpan: 1,
                                originalReqId: originalReqId, originalDesignId: originalDesignId, originalImplId: originalImplId, originalTcId: null
                            });
                            designRowCount++;
                            reqRowCount++;
                        } else {
                            testCases.forEach((tc, tcIndex) => {
                                if (!tc || typeof tc !== 'object') { console.warn("Skipping invalid tc item", tc); return; }
                                implRowCount++;
                                const originalTcId = tc.TestCaseID; // <-- เก็บ ID ดั้งเดิม
                                const tcName = tc.TestCaseName || `Test Case ${originalTcId}`;
                                const formattedTcId = formatId("TC", originalTcId); // <-- Format ที่นี่ (ใช้ TC)

                                flatRows.push({
                                    key: `req-${originalReqId}-design-${originalDesignId}-impl-${originalImplId}-tc-${originalTcId}-${tcIndex}`,
                                    reqId: formattedReqId, reqName: reqName,
                                    designId: formattedDesignId, designName: designName,
                                    implId: formattedImplId, implFile: implFile,
                                    testCaseId: formattedTcId, // <-- ใช้ค่าที่ Format แล้ว
                                    testCaseName: tcName,
                                    isFirstReqRow: (reqRowCount === 0 && tcIndex === 0), reqRowSpan: 0,
                                    isFirstDesignRow: (designRowCount === 0 && tcIndex === 0), designRowSpan: 0,
                                    isFirstImplRow: (tcIndex === 0), implRowSpan: 0,
                                    originalReqId: originalReqId, originalDesignId: originalDesignId, originalImplId: originalImplId, originalTcId: originalTcId
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
            if (reqStartIndex === 0 || flatRows[reqStartIndex - 1]?.originalReqId !== originalReqId) {
                flatRows[reqStartIndex].isFirstReqRow = true;
            }
        }
    });
    return flatRows;
};


// --- Component หลัก: ViewBaselineCurrent ---
const ViewBaselineCurrent = () => {
    const [nestedData, setNestedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [projectName, setProjectName] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const round = queryParams.get("round"); // Round ของ Current Baseline ที่ส่งมา

    // Fetch Data
    useEffect(() => {
        setNestedData([]); // เคลียร์ข้อมูลเก่าก่อนเริ่ม Fetch
        if (projectId && round) {
            setLoading(true); setError(''); setProjectName('');

            // ใช้ Promise.all เพื่อ Fetch ข้อมูลพร้อมกัน
            Promise.all([
                // Fetch Project Name
                axios.get(`http://localhost:3001/projectname?project_id=${projectId}`),
                // Fetch Baseline Detail
                axios.get(`http://localhost:3001/viewBaselineTraceDetail`, { params: { project_id: projectId, round: round } })
            ])
                .then(([nameResponse, baselineResponse]) => {
                    // ตั้งชื่อ Project
                    setProjectName((nameResponse.data && nameResponse.data.length > 0) ? nameResponse.data[0].project_name : `Project ${projectId}`);

                    // ตั้งค่า Baseline Data
                    if (baselineResponse.data?.success && Array.isArray(baselineResponse.data.data)) {
                        setNestedData(baselineResponse.data.data);
                        if (baselineResponse.data.data.length === 0) {
                            setError('No traceability data found for this baseline round.'); // ตั้ง Error ถ้าไม่มีข้อมูล
                        }
                    } else {
                        setError(baselineResponse.data.message || 'Invalid data format received for baseline details.');
                        setNestedData([]);
                    }
                })
                .catch(errorInstance => {
                    console.error("Error fetching data:", errorInstance); // Log error จริงๆ
                    let errorMessage = 'Failed to load baseline details.'; // ข้อความ Default
                    if (errorInstance.response) { errorMessage = `Error: ${errorInstance.response.data?.message || `Status ${errorInstance.response.status}`}`; }
                    else if (errorInstance.request) { errorMessage = 'Error: No response from server.'; }
                    else { errorMessage = `Error: ${errorInstance.message}`; }
                    setError(errorMessage);
                    setNestedData([]);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setError('Project ID and Round are required.');
            setLoading(false);
            setProjectName(''); // เคลียร์ชื่อโปรเจกต์ด้วยถ้า ID ไม่มี
        }
    }, [projectId, round]); // Dependency ที่ถูกต้อง

    // Calculate display rows (ใช้ข้อมูลที่ Format แล้ว)
    const displayRows = useMemo(() => flattenNestedDataForTable(nestedData), [nestedData]);

    // Handle Back Button
    const handleBack = () => {
        // กลับไปหน้า Current Baseline Summary หรือ หน้าหลัก Traceability
        if (projectId) {
            navigate(`/currentBaselineTrace?project_id=${projectId}`);
        } else {
            navigate(-1); // Fallback to browser back
        }
    };

    // --- Render Logic ---
    return (
        <div className="vbc-container">
            {/* Header */}
            <div className="vbc-header">
                <button className="vbc-back-btn" onClick={handleBack} aria-label="Go back">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1 className="vbc-title">
                    <FontAwesomeIcon icon={faStar} className="vbc-title-icon" />
                    {/* แสดง Project Name */}
                    Current Traceability Baseline Details: {projectName} (Round {round || 'N/A'})
                </h1>
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
                            {/* --- ⬇️ tbody ใช้ข้อมูลจาก displayRows ซึ่งมี ID ที่ Format แล้ว --- */}
                            <tbody>
                                {displayRows.map((row) => (
                                    <tr key={row.key}>
                                        {/* Requirement Cell */}
                                        {row.isFirstReqRow && (
                                            <td rowSpan={row.reqRowSpan}>
                                                {/* แสดง ID ที่ Format แล้ว */}
                                                <div>{row.reqId}</div>
                                                {/* แสดงชื่อ ถ้ามี และไม่ซ้ำกับ Default (ใช้ original ID เปรียบเทียบ) */}
                                                {row.reqName && row.reqName !== `Requirement ${row.originalReqId}` && (
                                                    <div className="vbc-item-detail">{row.reqName}</div>
                                                )}
                                            </td>
                                        )}
                                        {/* Design Cell */}
                                        {row.isFirstDesignRow && (
                                            <td rowSpan={row.designRowSpan}>
                                                {/* แสดง ID ที่ Format แล้ว */}
                                                <div>{row.designId}</div>
                                                {/* แสดงชื่อ ถ้ามี และไม่ซ้ำกับ Default (ใช้ original ID เปรียบเทียบ) */}
                                                {row.designName && row.designName !== "-" && row.designName !== `Design ${row.originalDesignId}` && (
                                                    <div className="vbc-item-detail">{row.designName}</div>
                                                )}
                                            </td>
                                        )}
                                        {/* Implementation Cell */}
                                        {row.isFirstImplRow && (
                                            <td rowSpan={row.implRowSpan}>
                                                {/* แสดง ID ที่ Format แล้ว */}
                                                <div>{row.implId}</div>
                                                {/* แสดงชื่อไฟล์ ถ้ามี */}
                                                {row.implFile && row.implFile !== 'N/A' ? (
                                                    <div className="vbc-item-detail">{row.implFile}</div>
                                                ) : null}
                                            </td>
                                        )}
                                        {/* Test Case Cell */}
                                        <td>
                                            {/* แสดง ID ที่ Format แล้ว */}
                                            <div>{row.testCaseId}</div>
                                            {/* แสดงชื่อ ถ้ามี และไม่ซ้ำกับ Default (ใช้ original ID เปรียบเทียบ) */}
                                            {row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.originalTcId}` ? (
                                                <div className="vbc-item-detail">{row.testCaseName}</div>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* --- ⬆️ สิ้นสุด tbody --- */}
                        </table>
                    </div>
                )}
            </div> {/* End vbc-content */}
        </div> // End vbc-container
    );
};

export default ViewBaselineCurrent;