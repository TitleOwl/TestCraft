import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './CSS/traceabilityPage.css'; // ตรวจสอบ path CSS ให้ถูกต้อง

// ****** ฟังก์ชัน filterTraceabilityData (เหมือนเดิม) ******
const filterTraceabilityData = (data, searchTerm, searchTargetType) => {
    if (!data) return [];
    const lowerSearchTerm = searchTerm?.trim().toLowerCase() || '';

    if (!lowerSearchTerm || !searchTargetType) {
        return data;
    }

    const checkMatch = (item, term, idKey, nameKey, prefix = '') => {
        if (!item || !term) return false;
        const termWithoutPrefix = prefix && term.startsWith(prefix.toLowerCase())
            ? term.substring(prefix.length)
            : term;
        const idString = item[idKey]?.toString() || '';
        const idMatch = idString === term || (termWithoutPrefix && idString === termWithoutPrefix);

        const nameString = item[nameKey]?.toLowerCase() || '';
        const nameMatch = nameString.includes(term);

        return idMatch || nameMatch;
    };

    return data.filter(r => {
        switch (searchTargetType) {
            case 'req':
                return checkMatch(r, lowerSearchTerm, 'RequirementID', 'RequirementName', 'req-');
            case 'design':
                return r.Designs?.some(d => checkMatch(d, lowerSearchTerm, 'DesignID', 'DiagramName', 'de-'));
            case 'impl':
                return r.Designs?.some(d =>
                    d.Implementations?.some(i => checkMatch(i, lowerSearchTerm, 'ImplementID', 'ImplementFilename', 'imp-'))
                );
            case 'test':
                return r.Designs?.some(d =>
                    d.Implementations?.some(i =>
                        i.TestCases?.some(t => checkMatch(t, lowerSearchTerm, 'TestCaseID', 'TestCaseName', 'tc-'))
                    )
                );
            default:
                return true;
        }
    });
};
// ***********************************************************

// ===== generateForwardDisplayRows (เหมือนเดิม) =====
const generateForwardDisplayRows = (nestedData) => {
    const flatRows = [];
    if (!nestedData || nestedData.length === 0) return flatRows;
    let keyCounter = 0;

    nestedData.forEach(req => {
        let reqStartIndex = flatRows.length;
        let reqRowCount = 0;
        const reqId = req.RequirementID;
        const reqName = req.RequirementName || `Requirement ${reqId}`;
        const reqStatus = req.RequirementStatus || '-';

        if (!req.Designs || req.Designs.length === 0) {
            reqRowCount = 1;
            flatRows.push({
                key: `fwd-req-${reqId}-no-design-${keyCounter++}`,
                reqId, reqName, reqStatus,
                designId: "-", designName: "-", designStatus: "-",
                implId: "-", implFile: "-",
                testCaseId: "-", testCaseName: "-", testCaseStatus: "-",
                isFirstReqRow: true, reqRowSpan: 1,
                isFirstDesignRow: true, designRowSpan: 1,
                isFirstImplRow: true, implRowSpan: 1,
            });
        } else {
            req.Designs.forEach((design) => {
                let designStartIndex = flatRows.length;
                let designRowCount = 0;
                const designId = design.DesignID;
                const designName = design.DiagramName || `Design ${designId}`;
                const designStatus = design.DesignStatus || '-';

                if (!design.Implementations || design.Implementations.length === 0) {
                    designRowCount = 1;
                    flatRows.push({
                        key: `fwd-req-${reqId}-design-${designId}-no-impl-${keyCounter++}`,
                        reqId, reqName, reqStatus,
                        designId, designName, designStatus,
                        implId: "-", implFile: "-",
                        testCaseId: "-", testCaseName: "-", testCaseStatus: "-",
                        isFirstReqRow: reqRowCount === 0, reqRowSpan: 0,
                        isFirstDesignRow: true, designRowSpan: 1,
                        isFirstImplRow: true, implRowSpan: 1,
                    });
                    reqRowCount++;
                } else {
                    design.Implementations.forEach((impl) => {
                        let implStartIndex = flatRows.length;
                        let implRowCount = 0;
                        const implId = impl.ImplementID;
                        const implFile = impl.ImplementFilename || 'N/A';

                        if (!impl.TestCases || impl.TestCases.length === 0) {
                            implRowCount = 1;
                            flatRows.push({
                                key: `fwd-req-${reqId}-design-${designId}-impl-${implId}-no-tc-${keyCounter++}`,
                                reqId, reqName, reqStatus,
                                designId, designName, designStatus,
                                implId, implFile,
                                testCaseId: "-", testCaseName: "-", testCaseStatus: "-",
                                isFirstReqRow: reqRowCount === 0, reqRowSpan: 0,
                                isFirstDesignRow: designRowCount === 0, designRowSpan: 0,
                                isFirstImplRow: true, implRowSpan: 1,
                            });
                            reqRowCount++;
                            designRowCount++;
                        } else {
                            impl.TestCases.forEach((tc, tcIdx) => {
                                const tcId = tc.TestCaseID;
                                const tcName = tc.TestCaseName || `Test Case ${tcId}`;
                                const testCaseStatus = tc.TestCaseStatus || '-';

                                flatRows.push({
                                    key: `fwd-req-${reqId}-design-${designId}-impl-${implId}-tc-${tcId}-${keyCounter++}`,
                                    reqId, reqName, reqStatus,
                                    designId, designName, designStatus,
                                    implId, implFile,
                                    testCaseId: tcId, testCaseName: tcName, testCaseStatus,
                                    isFirstReqRow: reqRowCount === 0 && tcIdx === 0, reqRowSpan: 0,
                                    isFirstDesignRow: designRowCount === 0 && tcIdx === 0, designRowSpan: 0,
                                    isFirstImplRow: implRowCount === 0 && tcIdx === 0, implRowSpan: 0,
                                });
                                reqRowCount++;
                                designRowCount++;
                                implRowCount++;
                            });
                            if (implStartIndex < flatRows.length) flatRows[implStartIndex].implRowSpan = implRowCount;
                        }
                    });
                    if (designStartIndex < flatRows.length) flatRows[designStartIndex].designRowSpan = designRowCount;
                }
            });
            if (reqStartIndex < flatRows.length) flatRows[reqStartIndex].reqRowSpan = reqRowCount;
        }
        if (reqStartIndex < flatRows.length) flatRows[reqStartIndex].isFirstReqRow = true; // Ensure first row flag is always set
    });
    return flatRows;
};

// ===== generateBackwardDisplayRows (***** REVISED Flattening Logic *****) =====
const generateBackwardDisplayRows = (nestedData) => {
    const backwardMap = new Map();
    if (!nestedData || nestedData.length === 0) return [];

    // --- 1. Build the backward map ---
    //    (Logic is kept the same as previous version, ensure data capture is correct)
    nestedData.forEach(req => {
        const reqId = req.RequirementID; // Capture reqId here
        const reqName = req.RequirementName || `Requirement ${reqId}`;
        const reqStatus = req.RequirementStatus || '-';
        req.Designs?.forEach(design => {
            const designId = design.DesignID; // Capture designId
            const designName = design.DiagramName || `Design ${designId}`;
            const designStatus = design.DesignStatus || '-';
            design.Implementations?.forEach(impl => {
                const implId = impl.ImplementID; // Capture implId
                const implFile = impl.ImplementFilename || 'N/A';
                impl.TestCases?.forEach(tc => {
                    const tcId = tc.TestCaseID; // Capture tcId
                    const tcName = tc.TestCaseName || `Test Case ${tcId}`;
                    const testCaseStatus = tc.TestCaseStatus || '-';

                    // Get or create Test Case entry
                    if (!backwardMap.has(tcId)) {
                        backwardMap.set(tcId, { testCaseName: tcName, testCaseStatus, implementations: new Map() });
                    }
                    const testEntry = backwardMap.get(tcId);
                    testEntry.testCaseStatus = testCaseStatus; // Update status if seen again

                    // Get or create Implementation entry
                    if (!testEntry.implementations.has(implId)) {
                        testEntry.implementations.set(implId, { implFile, designs: new Map() });
                    }
                    const implEntry = testEntry.implementations.get(implId);

                    // Get or create Design entry
                    if (!implEntry.designs.has(designId)) {
                        implEntry.designs.set(designId, { designName, designStatus, requirements: new Map() });
                    }
                    const designEntry = implEntry.designs.get(designId);
                    designEntry.designStatus = designStatus; // Update status

                    // Get or create Requirement entry
                    if (!designEntry.requirements.has(reqId)) {
                        // *** Ensure all needed req details are stored ***
                        designEntry.requirements.set(reqId, { reqName, reqStatus });
                    }
                    // Optional: Update status if req is encountered again via another path
                    // designEntry.requirements.get(reqId).reqStatus = reqStatus;
                });
            });
        });
    });

    // --- 2. Flatten the map into rows with revised rowSpans/flags calculation ---
    const flatRows = [];
    let keyCounter = 0;

    Array.from(backwardMap.entries()).forEach(([testCaseId, testEntry], testIdx) => {
        const testItems = Array.from(testEntry.implementations.entries());
        let testTotalRowCount = 0; // Total rows this test case will span across all its children

        testItems.forEach(([implId, implEntry], implIdx) => {
            const designItems = Array.from(implEntry.designs.entries());
            let implTotalRowCount = 0; // Total rows this implementation will span across all its children

            designItems.forEach(([designId, designEntry], designIdx) => {
                const requirementItems = Array.from(designEntry.requirements.entries());
                // Each design needs at least one row, even if no requirements link back
                let designTotalRowCount = requirementItems.length || 1;

                if (requirementItems.length === 0) {
                    // --- Handle case where a Design has NO linked requirements ---
                    // Still create a row to show the Test->Impl->Design link exists
                    const isFirstTestOverall = testTotalRowCount === 0; // Is this the very first row for the Test Case?
                    const isFirstImplOverall = implTotalRowCount === 0; // Is this the very first row for the Implementation?

                    flatRows.push({
                        key: `bwd-tc-${testCaseId}-impl-${implId}-des-${designId}-no-req-${keyCounter++}`,
                        testCaseId, testCaseName: testEntry.testCaseName, testCaseStatus: testEntry.testCaseStatus,
                        implId, implFile: implEntry.implFile,
                        designId, designName: designEntry.designName, designStatus: designEntry.designStatus,
                        reqId: "-", reqName: "-", reqStatus: "-", // Placeholder for missing requirement
                        isFirstTestRow: isFirstTestOverall, testRowSpan: 0, // Span will be set later
                        isFirstImplRow: isFirstImplOverall, implRowSpan: 0, // Span will be set later
                        isFirstDesignRow: true, designRowSpan: 1, // Design spans only this 1 row
                    });
                    testTotalRowCount++; // Increment parent row counts
                    implTotalRowCount++;
                    // designTotalRowCount is already 1
                } else {
                    // --- Handle case where Design HAS linked requirements ---
                    requirementItems.forEach(([reqId, reqEntry], reqIdx) => {
                        const isFirstTestOverall = testTotalRowCount === 0; // Is this the very first row for the Test Case?
                        const isFirstImplOverall = implTotalRowCount === 0; // Is this the very first row for the Implementation?
                        const isFirstDesignOverall = reqIdx === 0; // Is this the first Requirement for THIS Design?

                        flatRows.push({
                            key: `bwd-tc-${testCaseId}-impl-${implId}-des-${designId}-req-${reqId}-${keyCounter++}`,
                            testCaseId, testCaseName: testEntry.testCaseName, testCaseStatus: testEntry.testCaseStatus,
                            implId, implFile: implEntry.implFile,
                            designId, designName: designEntry.designName, designStatus: designEntry.designStatus,
                            reqId, reqName: reqEntry.reqName, reqStatus: reqEntry.reqStatus, // Use stored req data
                            isFirstTestRow: isFirstTestOverall, testRowSpan: 0, // Span will be set later
                            isFirstImplRow: isFirstImplOverall, implRowSpan: 0, // Span will be set later
                            isFirstDesignRow: isFirstDesignOverall, designRowSpan: 0, // Span will be set later (for the first one)
                        });
                        testTotalRowCount++; // Increment parent row counts for each requirement row generated
                        implTotalRowCount++;
                    });
                    // Set the designRowSpan for the first requirement row of this design group
                    if (flatRows.length > 0 && requirementItems.length > 0) {
                        const firstDesignRowIndex = flatRows.length - requirementItems.length;
                        if (firstDesignRowIndex >= 0 && firstDesignRowIndex < flatRows.length) { // Bounds check
                            flatRows[firstDesignRowIndex].designRowSpan = requirementItems.length;
                        } else {
                            console.error("Backward Flattening: Error calculating firstDesignRowIndex", { len: flatRows.length, count: requirementItems.length });
                        }
                    }
                }
                // designTotalRowCount was calculated above, represents rows for THIS design instance
            }); // End Designs loop for one Implementation

            // Set the implRowSpan for the first row generated by this implementation across all its designs/requirements
            if (flatRows.length > 0 && implTotalRowCount > 0) {
                const firstImplRowIndex = flatRows.length - implTotalRowCount;
                if (firstImplRowIndex >= 0 && firstImplRowIndex < flatRows.length) { // Bounds check
                    flatRows[firstImplRowIndex].implRowSpan = implTotalRowCount;
                } else {
                    console.error("Backward Flattening: Error calculating firstImplRowIndex", { len: flatRows.length, count: implTotalRowCount });
                }
            }
        }); // End Implementations loop for one Test Case

        // Set the testRowSpan for the first row generated by this test case across all its implementations/designs/requirements
        if (flatRows.length > 0 && testTotalRowCount > 0) {
            const firstTestRowIndex = flatRows.length - testTotalRowCount;
            if (firstTestRowIndex >= 0 && firstTestRowIndex < flatRows.length) { // Bounds check
                flatRows[firstTestRowIndex].testRowSpan = testTotalRowCount;
            } else {
                console.error("Backward Flattening: Error calculating firstTestRowIndex", { len: flatRows.length, count: testTotalRowCount });
            }
        }
    }); // End Test Cases loop

    // Optional: Log the final generated rows for debugging
    // console.log("Generated Backward Rows:", JSON.stringify(flatRows, null, 2));

    return flatRows;
};


// Mapping from state keys to row data keys (เหมือนเดิม)
const columnKeyMap = {
    req: { id: 'reqId', name: 'reqName', status: 'reqStatus' },
    design: { id: 'designId', name: 'designName', status: 'designStatus' },
    impl: { id: 'implId', name: 'implFile' /* No status for impl */ },
    test: { id: 'testCaseId', name: 'testCaseName', status: 'testCaseStatus' }
};

// ===== RenderTraceabilityTable Component (เหมือนเดิมจากเวอร์ชั่นก่อนหน้า) =====
const RenderTraceabilityTable = ({ title, rawData, showActionButtons, projectId, projectName }) => {
    const navigate = useNavigate();

    // --- Internal States ---
    const [searchTerm, setSearchTerm] = useState('');
    const [searchTargetType, setSearchTargetType] = useState('req');
    const [activeSearchTerm, setActiveSearchTerm] = useState('');
    const [activeSearchTargetType, setActiveSearchTargetType] = useState(searchTargetType);
    const [traceDirection, setTraceDirection] = useState('forward');

    // *** NEW State for Grouping and Column Visibility ***
    const [groupByColumn, setGroupByColumn] = useState('none'); // 'none', 'reqStatus', 'designStatus', 'testCaseStatus'
    const [visibleColumns, setVisibleColumns] = useState({
        req: true,
        design: true,
        impl: true,
        test: true,
    });
    const [isWipTable, setIsWipTable] = useState(!showActionButtons); // Simple flag based on prop

    // --- Handlers ---
    const handleSearchTermChange = useCallback((event) => { setSearchTerm(event.target.value); }, []);
    const handleTargetTypeChange = useCallback((event) => { setSearchTargetType(event.target.value); }, []);
    const applySearch = useCallback(() => {
        setActiveSearchTerm(searchTerm);
        setActiveSearchTargetType(searchTargetType);
    }, [searchTerm, searchTargetType]);
    const clearSearch = useCallback(() => {
        setSearchTerm(''); setSearchTargetType('req');
        setActiveSearchTerm(''); setActiveSearchTargetType('req');
    }, []);
    const handleViewVersion = useCallback((projId) => { navigate(`/versionVerTrace?project_id=${projId}`); }, [navigate]);

    // *** Handler for Column Visibility Change ***
    const handleColumnVisibilityChange = useCallback((event) => {
        const { name, checked } = event.target;
        setVisibleColumns(prev => ({ ...prev, [name]: checked }));
    }, []);

    // --- Memoized Data Processing ---
    const filteredData = useMemo(() =>
        filterTraceabilityData(rawData, activeSearchTerm, activeSearchTargetType),
        [rawData, activeSearchTerm, activeSearchTargetType]
    );

    // Generate initial flat rows with base rowSpans
    const baseDisplayRows = useMemo(() => {
        console.log(`[${title}] Generating BASE displayRows. Direction: ${traceDirection}.`);
        // *** Make sure the correct generate function is called ***
        return traceDirection === 'forward'
            ? generateForwardDisplayRows(filteredData)
            : generateBackwardDisplayRows(filteredData); // Calling the REVISED backward function
    }, [filteredData, traceDirection, title]);

    // Process rows for Grouping and final display structure
    const processedRows = useMemo(() => {
        // --- Grouping Logic (No change needed here) ---
        if (groupByColumn === 'none') {
            return baseDisplayRows.map(row => ({ ...row, type: 'data' }));
        }
        const groupKey = groupByColumn;
        if (!groupKey || groupKey === 'none') return baseDisplayRows.map(row => ({ ...row, type: 'data' }));;

        const sortedRows = [...baseDisplayRows].sort((a, b) => {
            const valA = a[groupKey] || ''; // Handle potential undefined status
            const valB = b[groupKey] || ''; // Handle potential undefined status
            // Simple alphabetical sort for status/groups
            return valA.localeCompare(valB);
        });

        const groupedRows = [];
        let currentGroupValue = null;
        sortedRows.forEach((row, index) => {
            const rowGroupValue = row[groupKey] || 'N/A'; // Group undefined/missing status as 'N/A'
            if (index === 0 || rowGroupValue !== currentGroupValue) {
                currentGroupValue = rowGroupValue;
                groupedRows.push({
                    key: `group-header-${groupKey}-${currentGroupValue}-${index}`,
                    type: 'groupHeader',
                    groupValue: currentGroupValue,
                    groupColumn: groupKey
                });
            }
            groupedRows.push({
                ...row,
                type: 'data',
                // Force rowSpans to 1 when grouping
                isFirstReqRow: true, reqRowSpan: 1,
                isFirstDesignRow: true, designRowSpan: 1,
                isFirstImplRow: true, implRowSpan: 1,
                isFirstTestRow: true, testRowSpan: 1, // Also force test row span for consistency
            });
        });
        return groupedRows;

    }, [baseDisplayRows, groupByColumn]);


    // --- Calculate Visible Column Count (for colSpan) ---
    const visibleColumnCount = useMemo(() => {
        return Object.values(visibleColumns).filter(Boolean).length;
    }, [visibleColumns]);

    // --- renderTableHeaders (No change needed) ---
    const renderTableHeaders = () => {
        const headers = traceDirection === 'forward'
            ? [
                { key: 'req', label: 'Requirement ID / Name' },
                { key: 'design', label: 'Design ID / Name' },
                { key: 'impl', label: 'Code Component ID / Filename' },
                { key: 'test', label: 'Test Case ID / Name' }
            ]
            : [ // Backward
                { key: 'test', label: 'Test Case ID / Name' },
                { key: 'impl', label: 'Code Component ID / Filename' },
                { key: 'design', label: 'Design ID / Name' },
                { key: 'req', label: 'Requirement ID / Name' }
            ];

        return (
            <tr>
                {headers.map(header =>
                    visibleColumns[header.key] ? <th key={header.key}>{header.label}</th> : null
                )}
            </tr>
        );
    };

    // --- renderTableBody (No change needed from previous version) ---
    const renderTableBody = () => {
        if (!processedRows || processedRows.length === 0) {
            return <tr><td colSpan={visibleColumnCount || 1} style={{ textAlign: 'center' }}>No data available for this section or filter/group criteria.</td></tr>;
        }

        const getRowSpan = (span) => span > 0 ? span : 1;

        const renderStatus = (status) => {
            if (!status || status === "-") return null;
            return (<><br /><span>Status: {status}</span></>);
        };

        // Helper to render a cell's content
        const renderCellContent = (row, colKey) => {
            const colConfig = columnKeyMap[colKey];
            if (!colConfig) return '-';

            const id = row[colConfig.id];
            const name = row[colConfig.name];
            const status = colConfig.status ? row[colConfig.status] : undefined;

            // Check if the primary ID for this cell is missing or placeholder
            if (id === "-" || id === undefined || id === null) {
                // If ID is missing, just return placeholder, don't try to render details/buttons
                return "-";
            }

            let idPrefix = '';
            if (colKey === 'req') idPrefix = 'REQ-';
            else if (colKey === 'design') idPrefix = 'DE-';
            else if (colKey === 'impl') idPrefix = 'IMP-';
            else if (colKey === 'test') idPrefix = 'TC-';

            let displayName = '';
            if (colKey === 'impl') {
                displayName = name && name !== 'N/A' ? name : '';
            } else {
                // Construct the default name pattern (e.g., "Requirement 123")
                const defaultNamePattern = `${colKey.charAt(0).toUpperCase() + colKey.slice(1)} ${id}`;
                // Display name only if it exists and is different from the default pattern and not "-"
                displayName = name && name !== defaultNamePattern && name !== '-' ? name : '';
            }


            return (
                <>
                    <div className="reqid-trace">{`${idPrefix}${id}`}</div>
                    {displayName && <div className="reqname-trace">{displayName}</div>}
                    {status !== undefined && renderStatus(status)}
                    {/* Action Buttons (View/Edit) */}
                    {showActionButtons && id !== "-" && ( // Redundant check for id !== "-", already handled above
                        <div className="action-buttons-cell">
                            {colKey === 'req' && <>
                                <button onClick={() => navigate(`/ViewEditReq?requirement_id=${id}`)} title={`View REQ-${id}`}>View</button>
                                <button onClick={() => navigate(`/UpdateRequirement?project_id=${projectId}&requirement_id=${id}`)} title={`Edit REQ-${id}`}>Edit</button>
                            </>}
                            {colKey === 'design' && <>
                                <button onClick={() => navigate(`/ViewDesign?project_id=${projectId}&design_id=${id}`)} title={`View DE-${id}`}>View</button>
                                <button onClick={() => navigate(`/UpdateDesign?project_id=${projectId}&design_id=${id}`)} title={`Edit DE-${id}`}>Edit</button>
                            </>}
                            {colKey === 'test' && <>
                                <button className="testcase-view" onClick={() => {
                                    const testcaseDataToSend = {
                                        testcase_id: id,
                                        testcase_name: row[colConfig.name], // Use row[colConfig.name] to get original name
                                        testcase_status: status,
                                        project_id: projectId
                                    };
                                    navigate(
                                        `/TestcaseDetail?testcase_id=${id}&project_id=${projectId}`,
                                        { state: { testcase: testcaseDataToSend, projectId: projectId } }
                                    );
                                }} title={`View TC-${id}`}>View</button>
                                <button className="testcase-edit" onClick={() => navigate(`/UpdateTestcase?testcase_id=${id}&project_id=${projectId}`)} title={`Edit TC-${id}`}>Edit</button>
                            </>}
                            {/* No View/Edit for Implementation currently */}
                        </div>
                    )}
                </>
            );
        };

        const columnOrder = traceDirection === 'forward'
            ? ['req', 'design', 'impl', 'test']
            : ['test', 'impl', 'design', 'req'];

        return processedRows.map((row) => {
            // Render Group Header Row
            if (row.type === 'groupHeader') {
                let groupLabel = 'Group';
                // Simplified labels
                if (row.groupColumn === 'reqStatus') groupLabel = 'Req Status';
                else if (row.groupColumn === 'designStatus') groupLabel = 'Design Status';
                else if (row.groupColumn === 'testCaseStatus') groupLabel = 'Test Status';
                return (
                    <tr key={row.key} className="group-header-row">
                        <td colSpan={visibleColumnCount || 1}>
                            {groupLabel}: <strong>{row.groupValue || 'N/A'}</strong>
                        </td>
                    </tr>
                );
            }

            // Render Data Row
            const useRowSpan = groupByColumn === 'none'; // Determine if rowSpan should be used

            return (
                <tr key={row.key}>
                    {columnOrder.map(colKey => {
                        if (!visibleColumns[colKey]) return null; // Skip hidden columns

                        // Determine if cell should render based on rowSpan logic (only when NOT grouping)
                        let shouldRenderCell = true;
                        if (useRowSpan) {
                            // Apply original logic for forward direction
                            if (traceDirection === 'forward') {
                                if (colKey === 'req' && !row.isFirstReqRow) shouldRenderCell = false;
                                else if (colKey === 'design' && !row.isFirstDesignRow) shouldRenderCell = false;
                                else if (colKey === 'impl' && !row.isFirstImplRow) shouldRenderCell = false;
                                // Test Case always renders its cell in forward (no span)
                            }
                            // Apply revised logic for backward direction (using flags set by new generateBackward)
                            else { // traceDirection === 'backward'
                                if (colKey === 'test' && !row.isFirstTestRow) shouldRenderCell = false;
                                else if (colKey === 'impl' && !row.isFirstImplRow) shouldRenderCell = false;
                                else if (colKey === 'design' && !row.isFirstDesignRow) shouldRenderCell = false;
                                // Requirement always renders its cell in backward (no span needed)
                            }
                        } // End if(useRowSpan)

                        if (shouldRenderCell) {
                            // Calculate rowSpan ONLY if grouping is OFF
                            let cellRowSpan = 1;
                            if (useRowSpan) {
                                // Use the rowSpan values calculated by the generate functions
                                if (colKey === 'req') cellRowSpan = getRowSpan(row.reqRowSpan); // Relevant for Forward
                                else if (colKey === 'design') cellRowSpan = getRowSpan(row.designRowSpan); // Relevant for Both
                                else if (colKey === 'impl') cellRowSpan = getRowSpan(row.implRowSpan); // Relevant for Both
                                else if (colKey === 'test') cellRowSpan = getRowSpan(row.testRowSpan); // Relevant for Backward
                            }

                            const cellClass = columnKeyMap[colKey]?.status ? `${colKey}-cell` : `${colKey}-cell no-status`;

                            return (
                                <td key={colKey} rowSpan={cellRowSpan} className={cellClass}>
                                    {renderCellContent(row, colKey)}
                                </td>
                            );
                        }
                        return null; // Cell is spanned by a previous row or hidden
                    })}
                </tr>
            );
        });
    }; // --- End renderTableBody ---

    const isFiltering = !!activeSearchTerm;

    // --- Render JSX for this table section (No change needed) ---
    return (
        <div className="traceability-section">
            {/* Controls Section */}
            <div className="traceability-controls individual-controls">
                {/* Search UI */}
                <div className="control-group search-group" >
                    <h4 className="control-group-title"><i className="fas fa-search"></i> Search This Section</h4>
                    <div className="control-row">
                        <select name="searchTargetType" value={searchTargetType} onChange={handleTargetTypeChange} aria-label={`Select search target type for ${title}`} className="search-select">
                            <option value="req">Requirement</option>
                            <option value="design">Design</option>
                            <option value="impl">Code Component</option>
                            <option value="test">Test Case</option>
                        </select>
                        <input type="text" value={searchTerm} onChange={handleSearchTermChange} placeholder={`Search`} className="search-input-traceability" aria-label={`Search term for ${title}`} />
                        <button onClick={applySearch} className='filter-button small-button'>Apply</button>
                        <button onClick={clearSearch} className='clear-button small-button'>Clear</button>
                    </div>
                </div>

                {/* Direction Switch */}
                {!isWipTable && (
                    <div className="control-group direction-group" >
                        <h4 className="control-group-title"><i className="fas fa-exchange-alt"></i> View Direction</h4>
                        <div className="control-row">
                            <button onClick={() => setTraceDirection('forward')} disabled={traceDirection === 'forward'} className={`direction-button small-button ${traceDirection === 'forward' ? 'active' : ''}`} title="View forward trace">
                                ▶ Forward
                            </button>
                            <button onClick={() => setTraceDirection('backward')} disabled={traceDirection === 'backward'} className={`direction-button small-button ${traceDirection === 'backward' ? 'active' : ''}`} title="View backward trace">
                                ◀ Backward
                            </button>
                        </div>
                    </div>
                )}

                {/* Column Visibility Control */}
                <div className="control-group visibility-group">
                    <h4 className="control-group-title"><i className="fas fa-eye"></i> Group by Columns</h4>
                    <div className="control-row checkbox-group">
                        {(traceDirection === 'forward' ? ['req', 'design', 'impl', 'test'] : ['test', 'impl', 'design', 'req']).map(colKey => {
                            let label = '';
                            if (colKey === 'req') label = 'Requirement';
                            else if (colKey === 'design') label = 'Design';
                            else if (colKey === 'impl') label = 'Code Component';
                            else if (colKey === 'test') label = 'Test Case';
                            return (
                                <label key={colKey} className="visibility-checkbox">
                                    <input type="checkbox" name={colKey} checked={visibleColumns[colKey]} onChange={handleColumnVisibilityChange} /> {label}
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* End Controls */}

            {/* Message when no rows */}
            {(!processedRows || processedRows.length === 0) && (
                <div className="no-data-message">
                    {isFiltering ? "No items match your current filter criteria." : isWipTable ? "No work items found or data not linked." : "No data in baseline or data not linked."}
                </div>
            )}

            {/* Table container */}
            {processedRows && processedRows.length > 0 && (
                <div className="traceability-table-container">
                    {/* Action Buttons Container */}
                    {showActionButtons && (
                        <div className="action-buttons-container main-actions">
                            <button className='verify-trace' onClick={() => navigate(`/createVerifyTrace?project_id=${projectId}`)}> Create Verification </button>
                            <button className='view-verify-trace' onClick={() => navigate(`/viewVerifyTrace?project_id=${projectId}`)}> View Verification </button>
                            <button className='baseline-trace' onClick={() => navigate(`/viewBaselineTrace?project_id=${projectId}`)}> Set Baseline </button>
                            <button className='version-ver-trace' onClick={() => handleViewVersion(projectId)}>History (Baseline)</button>
                            <button className='current-baseline-trace' onClick={() => navigate(`/currentBaselineTrace?project_id=${projectId}`)}>View Current Baseline</button>
                        </div>
                    )}
                    {/* Table */}
                    <table className="traceability-table">
                        <thead>{renderTableHeaders()}</thead>
                        <tbody>{renderTableBody()}</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


// ===== TraceabilityPage Component (เหมือนเดิมจากเวอร์ชั่นก่อนหน้า) =====
const TraceabilityPage = () => {
    // ... state, hooks, useEffect (mostly unchanged) ...
    const [baselineData, setBaselineData] = useState([]);
    const [nonBaselineData, setNonBaselineData] = useState([]); // Data for WIP
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [projectName, setProjectName] = useState('');
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    useEffect(() => {
        if (!projectId) {
            setFetchError("Project ID is missing from the URL.");
            setIsLoading(false);
            return;
        }
        const fetchAllData = async () => {
            setIsLoading(true);
            setFetchError(null);
            setBaselineData([]);
            setNonBaselineData([]);
            setProjectName('');

            const projectDetailsEndpoint = `http://localhost:3001/project/${projectId}`;
            const baselineEndpoint = `http://localhost:3001/traceability`; // Assumed API for Baseline
            const nonBaselineEndpoint = `http://localhost:3001/not-linked-non-baseline`; // Assumed API for WIP

            try {
                const results = await Promise.allSettled([
                    axios.get(projectDetailsEndpoint),
                    axios.get(baselineEndpoint, { params: { projectId } }),
                    axios.get(nonBaselineEndpoint, { params: { projectId } })
                ]);

                // Process Project Details
                if (results[0].status === 'fulfilled' && results[0].value.data?.project_name) {
                    setProjectName(results[0].value.data.project_name);
                } else {
                    console.warn("Could not fetch project name or project name is missing.");
                    setProjectName('Unknown Project');
                    if (results[0].status === 'rejected') {
                        console.error("Error fetching project details:", results[0].reason);
                    }
                }

                // Process Baseline Data
                if (results[1].status === 'fulfilled' && Array.isArray(results[1].value.data)) {
                    setBaselineData(results[1].value.data);
                } else {
                    console.warn("Baseline data is not an array or fetch failed.");
                    setBaselineData([]);
                    if (results[1].status === 'rejected') {
                        console.error("Error fetching baseline data:", results[1].reason);
                    }
                }

                // Process Non-Baseline (WIP) Data
                if (results[2].status === 'fulfilled' && Array.isArray(results[2].value.data)) {
                    setNonBaselineData(results[2].value.data);
                } else {
                    console.warn("Non-baseline (WIP) data is not an array or fetch failed.");
                    setNonBaselineData([]);
                    if (results[2].status === 'rejected') {
                        console.error("Error fetching non-baseline data:", results[2].reason);
                    }
                }

                if (results.some(r => r.status === 'rejected')) {
                    // Don't necessarily set a global fetch error if only one part failed,
                    // but log it. The component will show "No data" for the failed part.
                    // setFetchError("Failed to fetch some traceability data. Check console.");
                    console.error("One or more traceability fetches failed.");
                }

            } catch (err) {
                console.error("Unexpected error fetching traceability data:", err);
                setFetchError(`An unexpected error occurred: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [projectId]);

    if (isLoading) return <div className="loading-message"><p>Loading Traceability Data...</p></div>;
    if (fetchError && !isLoading) return <div className="error-message">{fetchError}</div>; // Show critical errors
    if (!projectName && !isLoading) return <div className="error-message">Project details not found for ID: {projectId}.</div>

    return (
        <div className="traceability-container">
            {/* Centered Main Title */}
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Traceability Matrix: {projectName}</h1>

            {/* --- Baseline Table Section --- */}
            <h2 className="section-title">
                Traceability Record (Baselining)
            </h2>
            <RenderTraceabilityTable
                title="Traceability Baselining"
                rawData={baselineData}
                showActionButtons={true}
                projectId={projectId}
                projectName={projectName}
            />

            <hr className="section-divider" />

            {/* --- Work in Progress Table Section --- */}
            <h2 className="section-title">
                Traceability Matrix (Work In Progress)
            </h2>
            <RenderTraceabilityTable
                title="Traceability Matrix (Work in Progress)"
                rawData={nonBaselineData}
                showActionButtons={false}
                projectId={projectId}
                projectName={projectName}
            />
        </div>
    );
};

export default TraceabilityPage;