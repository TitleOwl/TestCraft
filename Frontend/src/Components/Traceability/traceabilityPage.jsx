import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    // --- Icons ---
    faSearch, faFilter, faTable, faExchangeAlt, faEye, faPen,
    faPlus, faTrash, faHome, faChevronRight, faQuestionCircle,
    faTimes, faColumns, faSort, faHistory, faCheckCircle,
    faLink, faProjectDiagram, faSpinner, faExclamationTriangle, // Warning icon
    faSortUp, faSortDown, faSync, faArrowsLeftRight,
    faEyeSlash, faChevronUp, faChevronDown, faSlidersH
} from "@fortawesome/free-solid-svg-icons";

// **** Import Tippy and its CSS ****
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css'; // Default minimal CSS
// import 'tippy.js/themes/light-border.css'; // Example theme

// --- Your CSS Import ---
import './CSS/traceabilityPage.css'; // Ensure this contains necessary styles

// ========================================================================
// Constants & Configuration
// ========================================================================
const columnKeyMap = {
    req: { id: 'reqId', name: 'reqName', status: 'reqStatus', sortKey: 'reqId', label: 'Requirement', prefix: 'REQ' },
    design: { id: 'designId', name: 'designName', status: 'designStatus', sortKey: 'designId', label: 'Design', prefix: 'SD' },
    impl: { id: 'implId', name: 'implFile',    /* status: null, */    sortKey: 'implId', label: 'Code Component', prefix: 'SC' },
    test: { id: 'testCaseId', name: 'testCaseName', status: 'testCaseStatus', sortKey: 'testCaseId', label: 'Test Case', prefix: 'TC' }
};
const headerLabels = {
    req: 'Requirement', design: 'Design', impl: 'Code Component', test: 'Test Case'
};
const tutorialSteps = [
    { target: '.TRACE-project-title', content: 'This area shows the project name and the current view (Traceability).', placement: 'bottom', },
    { target: '.TRACE-header-tab-bar', content: 'Switch between the official Traceability Record (Baseline) and Work Product Tracking (WIP) views here.', placement: 'bottom', },
    { target: '.TRACE-controls-area', content: 'Use these controls to search, filter, and customize the table view.', placement: 'bottom', },
    { target: '.TRACE-search-group', content: 'Search for specific items by ID (e.g., REQ-001) or name within the selected type (Requirement, Design, etc.). Remember to click Apply!', placement: 'right', },
    { target: '.TRACE-view-options-group', content: 'Adjust view options like trace direction (Forward/Backward), visible columns, and cell details.', placement: 'right', },
    { target: '.TRACE-table', content: 'This table displays the traceability links based on your selected view and options. Click headers to sort.', placement: 'top', },
];

// ========================================================================
// Helper Functions (Data Processing & Formatting)
// ========================================================================
const formatIdWithPrefix = (prefix, id) => {
    if (id === null || id === undefined || id === '-') return '-';
    return `${prefix}-${String(id).padStart(3, '0')}`;
};

const filterTraceabilityData = (data, searchTerm, searchTargetType) => {
    if (!data) return [];
    const lowerSearchTerm = searchTerm?.trim().toLowerCase() || '';
    if (!lowerSearchTerm || !searchTargetType) return data;

    const checkMatch = (item, term, idKey, nameKey, prefix = '') => {
        if (!item || !term) return false;
        const idValue = item[idKey];
        const nameValue = item[nameKey];
        const formattedId = (idValue !== null && idValue !== undefined && idValue !== '-') ? formatIdWithPrefix(prefix, idValue).toLowerCase() : '';
        const nameString = nameValue?.toLowerCase() || '';
        return (formattedId && formattedId.includes(term)) || nameString.includes(term);
    };

    return data.filter(r => {
        switch (searchTargetType) {
            case 'req': return checkMatch(r, lowerSearchTerm, 'RequirementID', 'RequirementName', 'REQ');
            case 'design': return r.Designs?.some(d => checkMatch(d, lowerSearchTerm, 'DesignID', 'DiagramName', columnKeyMap.design.prefix));
            case 'impl': return r.Designs?.some(d => d.Implementations?.some(i => checkMatch(i, lowerSearchTerm, 'ImplementID', 'ImplementFilename', columnKeyMap.impl.prefix)));
            case 'test': return r.Designs?.some(d => d.Implementations?.some(i => i.TestCases?.some(t => checkMatch(t, lowerSearchTerm, 'TestCaseID', 'TestCaseName', columnKeyMap.test.prefix))));
            default: return true;
        }
    });
};

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
        const baseKeyPrefix = `fwd-req-${reqId}`;

        if (!req.Designs || req.Designs.length === 0) {
            reqRowCount = 1;
            flatRows.push({
                key: `${baseKeyPrefix}-no-design-${keyCounter++}`, reqId, reqName, reqStatus,
                designId: "-", designName: "-", designStatus: "-", implId: "-", implFile: "-",
                testCaseId: "-", testCaseName: "-", testCaseStatus: "-",
                isFirstReqRow: true, reqRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1,
                isFirstImplRow: true, implRowSpan: 1, isFirstTestRow: true, testRowSpan: 1
            });
        } else {
            req.Designs.forEach((design) => {
                let designStartIndex = flatRows.length;
                let designRowCount = 0;
                const designId = design.DesignID;
                const designName = design.DiagramName || `Design ${designId}`;
                const designStatus = design.DesignStatus || '-';
                const designKeyPrefix = `${baseKeyPrefix}-design-${designId}`;

                if (!design.Implementations || design.Implementations.length === 0) {
                    designRowCount = 1;
                    flatRows.push({
                        key: `${designKeyPrefix}-no-impl-${keyCounter++}`, reqId, reqName, reqStatus,
                        designId, designName, designStatus, implId: "-", implFile: "-",
                        testCaseId: "-", testCaseName: "-", testCaseStatus: "-",
                        isFirstReqRow: reqRowCount === 0, reqRowSpan: 0,
                        isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1,
                        isFirstTestRow: true, testRowSpan: 1
                    });
                    reqRowCount++;
                } else {
                    design.Implementations.forEach((impl) => {
                        let implStartIndex = flatRows.length;
                        let implRowCount = 0;
                        const implId = impl.ImplementID;
                        const implFile = impl.ImplementFilename || 'N/A';
                        const implKeyPrefix = `${designKeyPrefix}-impl-${implId}`;

                        if (!impl.TestCases || impl.TestCases.length === 0) {
                            implRowCount = 1;
                            flatRows.push({
                                key: `${implKeyPrefix}-no-tc-${keyCounter++}`, reqId, reqName, reqStatus,
                                designId, designName, designStatus, implId, implFile,
                                testCaseId: "-", testCaseName: "-", testCaseStatus: "-",
                                isFirstReqRow: reqRowCount === 0, reqRowSpan: 0,
                                isFirstDesignRow: designRowCount === 0, designRowSpan: 0,
                                isFirstImplRow: true, implRowSpan: 1, isFirstTestRow: true, testRowSpan: 1
                            });
                            reqRowCount++; designRowCount++;
                        } else {
                            impl.TestCases.forEach((tc, tcIdx) => {
                                const tcId = tc.TestCaseID;
                                const tcName = tc.TestCaseName || `Test Case ${tcId}`;
                                const testCaseStatus = tc.TestCaseStatus || '-';
                                flatRows.push({
                                    key: `${implKeyPrefix}-tc-${tcId}-${keyCounter++}`, reqId, reqName, reqStatus,
                                    designId, designName, designStatus, implId, implFile,
                                    testCaseId: tcId, testCaseName: tcName, testCaseStatus,
                                    isFirstReqRow: reqRowCount === 0 && tcIdx === 0, reqRowSpan: 0,
                                    isFirstDesignRow: designRowCount === 0 && tcIdx === 0, designRowSpan: 0,
                                    isFirstImplRow: implRowCount === 0 && tcIdx === 0, implRowSpan: 0,
                                    isFirstTestRow: true, testRowSpan: 1
                                });
                                reqRowCount++; designRowCount++; implRowCount++;
                            });
                            if (implStartIndex < flatRows.length && implRowCount > 0) {
                                flatRows[implStartIndex].implRowSpan = implRowCount;
                                flatRows[implStartIndex].isFirstImplRow = true;
                            }
                        }
                    });
                    if (designStartIndex < flatRows.length && designRowCount > 0) {
                        flatRows[designStartIndex].designRowSpan = designRowCount;
                        flatRows[designStartIndex].isFirstDesignRow = true;
                    }
                }
            });
            if (reqStartIndex < flatRows.length && reqRowCount > 0) {
                flatRows[reqStartIndex].reqRowSpan = reqRowCount;
                flatRows[reqStartIndex].isFirstReqRow = true;
            }
        }
        if (reqStartIndex < flatRows.length && !flatRows[reqStartIndex].isFirstReqRow && reqRowCount > 0) {
            flatRows[reqStartIndex].isFirstReqRow = true;
        }
    });
    return flatRows;
};

const generateBackwardDisplayRows = (nestedData) => {
    const backwardMap = new Map();
    if (!nestedData || nestedData.length === 0) return [];
    let keyCounter = 0;

    nestedData.forEach(req => {
        const reqId = req.RequirementID, reqName = req.RequirementName || `Requirement ${reqId}`, reqStatus = req.RequirementStatus || '-';
        req.Designs?.forEach(design => {
            const designId = design.DesignID, designName = design.DiagramName || `Design ${designId}`, designStatus = design.DesignStatus || '-';
            design.Implementations?.forEach(impl => {
                const implId = impl.ImplementID, implFile = impl.ImplementFilename || 'N/A';
                impl.TestCases?.forEach(tc => {
                    const tcId = tc.TestCaseID, tcName = tc.TestCaseName || `Test Case ${tcId}`, testCaseStatus = tc.TestCaseStatus || '-';
                    if (!backwardMap.has(tcId)) backwardMap.set(tcId, { testCaseName: tcName, testCaseStatus, implementations: new Map() });
                    const testEntry = backwardMap.get(tcId); testEntry.testCaseStatus = testCaseStatus;
                    if (!testEntry.implementations.has(implId)) testEntry.implementations.set(implId, { implFile, designs: new Map() });
                    const implEntry = testEntry.implementations.get(implId);
                    if (!implEntry.designs.has(designId)) implEntry.designs.set(designId, { designName, designStatus, requirements: new Map() });
                    const designEntry = implEntry.designs.get(designId); designEntry.designStatus = designStatus;
                    if (!designEntry.requirements.has(reqId)) designEntry.requirements.set(reqId, { reqName, reqStatus });
                    designEntry.requirements.get(reqId).reqStatus = reqStatus;
                });
            });
        });
    });

    const flatRows = [];
    Array.from(backwardMap.entries()).forEach(([testCaseId, testEntry]) => {
        let testStartIndex = flatRows.length, testRowCount = 0;
        const testItems = Array.from(testEntry.implementations.entries()), baseKeyPrefix = `bwd-tc-${testCaseId}`;
        if (testItems.length === 0) {
            testRowCount = 1;
            flatRows.push({
                key: `${baseKeyPrefix}-no-impl-${keyCounter++}`, testCaseId, testCaseName: testEntry.testCaseName, testCaseStatus: testEntry.testCaseStatus,
                implId: "-", implFile: "-", designId: "-", designName: "-", designStatus: "-", reqId: "-", reqName: "-", reqStatus: "-",
                isFirstTestRow: true, testRowSpan: 1, isFirstImplRow: true, implRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstReqRow: true, reqRowSpan: 1
            });
        } else {
            testItems.forEach(([implId, implEntry]) => {
                let implStartIndex = flatRows.length, implRowCount = 0;
                const designItems = Array.from(implEntry.designs.entries()), implKeyPrefix = `${baseKeyPrefix}-impl-${implId}`;
                if (designItems.length === 0) {
                    implRowCount = 1;
                    flatRows.push({
                        key: `${implKeyPrefix}-no-design-${keyCounter++}`, testCaseId, testCaseName: testEntry.testCaseName, testCaseStatus: testEntry.testCaseStatus,
                        implId, implFile: implEntry.implFile, designId: "-", designName: "-", designStatus: "-", reqId: "-", reqName: "-", reqStatus: "-",
                        isFirstTestRow: testRowCount === 0, testRowSpan: 0, isFirstImplRow: true, implRowSpan: 1,
                        isFirstDesignRow: true, designRowSpan: 1, isFirstReqRow: true, reqRowSpan: 1
                    });
                    testRowCount++;
                } else {
                    designItems.forEach(([designId, designEntry]) => {
                        let designStartIndex = flatRows.length, designRowCount = 0;
                        const requirementItems = Array.from(designEntry.requirements.entries()), designKeyPrefix = `${implKeyPrefix}-design-${designId}`;
                        if (requirementItems.length === 0) {
                            designRowCount = 1;
                            flatRows.push({
                                key: `${designKeyPrefix}-no-req-${keyCounter++}`, testCaseId, testCaseName: testEntry.testCaseName, testCaseStatus: testEntry.testCaseStatus,
                                implId, implFile: implEntry.implFile, designId, designName: designEntry.designName, designStatus: designEntry.designStatus,
                                reqId: "-", reqName: "-", reqStatus: "-",
                                isFirstTestRow: testRowCount === 0, testRowSpan: 0, isFirstImplRow: implRowCount === 0, implRowSpan: 0,
                                isFirstDesignRow: true, designRowSpan: 1, isFirstReqRow: true, reqRowSpan: 1
                            });
                            testRowCount++; implRowCount++;
                        } else {
                            requirementItems.forEach(([reqId, reqEntry], reqIdx) => {
                                flatRows.push({
                                    key: `${designKeyPrefix}-req-${reqId}-${keyCounter++}`, testCaseId, testCaseName: testEntry.testCaseName, testCaseStatus: testEntry.testCaseStatus,
                                    implId, implFile: implEntry.implFile, designId, designName: designEntry.designName, designStatus: designEntry.designStatus,
                                    reqId, reqName: reqEntry.reqName, reqStatus: reqEntry.reqStatus,
                                    isFirstTestRow: testRowCount === 0 && reqIdx === 0, testRowSpan: 0,
                                    isFirstImplRow: implRowCount === 0 && reqIdx === 0, implRowSpan: 0,
                                    isFirstDesignRow: designRowCount === 0 && reqIdx === 0, designRowSpan: 0,
                                    isFirstReqRow: true, reqRowSpan: 1
                                });
                                testRowCount++; implRowCount++; designRowCount++;
                            });
                            if (designStartIndex < flatRows.length && designRowCount > 0) {
                                flatRows[designStartIndex].designRowSpan = designRowCount;
                                flatRows[designStartIndex].isFirstDesignRow = true;
                            }
                        }
                    });
                    if (implStartIndex < flatRows.length && implRowCount > 0) {
                        flatRows[implStartIndex].implRowSpan = implRowCount;
                        flatRows[implStartIndex].isFirstImplRow = true;
                    }
                }
            });
            if (testStartIndex < flatRows.length && testRowCount > 0) {
                flatRows[testStartIndex].testRowSpan = testRowCount;
                flatRows[testStartIndex].isFirstTestRow = true;
            }
        }
        if (testStartIndex < flatRows.length && !flatRows[testStartIndex].isFirstTestRow && testRowCount > 0) {
            flatRows[testStartIndex].isFirstTestRow = true;
        }
    });
    return flatRows;
};


// ========================================================================
// RenderTraceabilityTable Sub-Component
// ========================================================================
const RenderTraceabilityTable = ({
    rawData,
    showActionButtons,
    projectId,
    isWipView = false
}) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchTargetType, setSearchTargetType] = useState('req');
    const [activeSearchTerm, setActiveSearchTerm] = useState('');
    const [activeSearchTargetType, setActiveSearchTargetType] = useState(searchTargetType);
    const [isFiltering, setIsFiltering] = useState(false);
    const [traceDirection, setTraceDirection] = useState('forward');
    const [visibleColumns, setVisibleColumns] = useState({ req: true, design: true, impl: true, test: true });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [showCellDetails, setShowCellDetails] = useState(true);
    const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);

    const defaultViewOptions = useMemo(() => ({
        direction: 'forward',
        columns: { req: true, design: true, impl: true, test: true },
        details: true,
        sort: { key: null, direction: 'ascending' }
    }), []);

    const filteredData = useMemo(() => filterTraceabilityData(rawData, activeSearchTerm, activeSearchTargetType), [rawData, activeSearchTerm, activeSearchTargetType]);
    const baseDisplayRows = useMemo(() => (traceDirection === 'forward' ? generateForwardDisplayRows(filteredData) : generateBackwardDisplayRows(filteredData)), [filteredData, traceDirection]);

    const processedRows = useMemo(() => {
        let processed = [...baseDisplayRows];
        if (sortConfig.key !== null) {
            const sortKeyInfo = Object.values(columnKeyMap).find(map => map.sortKey === sortConfig.key);
            if (sortKeyInfo) {
                const dataKey = sortKeyInfo.id;
                processed.sort((a, b) => {
                    const valA = a[dataKey], valB = b[dataKey];
                    const isAValid = valA !== '-' && valA != null, isBValid = valB !== '-' && valB != null;
                    if (!isAValid && !isBValid) return 0;
                    if (!isAValid) return sortConfig.direction === 'ascending' ? 1 : -1;
                    if (!isBValid) return sortConfig.direction === 'ascending' ? -1 : 1;
                    const isANumber = typeof valA === 'number', isBNumber = typeof valB === 'number';
                    let comparison = 0;
                    if (isANumber && isBNumber) comparison = valA - valB;
                    else comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                    return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
                });
            }
        }
        processed = processed.map((row, index) => ({ ...row, type: 'data', key: row.key || `d-${index}-${Math.random()}` }));
        processed = processed.map(row => {
            if (row.type === 'data' && isWipView) {
                const isUnlinkedForward = traceDirection === 'forward' && (row.designId === '-' || row.implId === '-' || row.testCaseId === '-');
                const isUnlinkedBackward = traceDirection === 'backward' && (row.implId === '-' || row.designId === '-' || row.reqId === '-');
                return { ...row, isUnlinked: isUnlinkedForward || isUnlinkedBackward };
            }
            return row;
        });
        return processed;
    }, [baseDisplayRows, sortConfig, isWipView, traceDirection]);

    const getDynamicColumnOrder = useCallback((direction) => (direction === 'forward' ? ['req', 'design', 'impl', 'test'] : ['test', 'impl', 'design', 'req']), []);
    const columnOrder = useMemo(() => getDynamicColumnOrder(traceDirection), [traceDirection, getDynamicColumnOrder]);
    const visibleColumnCount = useMemo(() => Object.values(visibleColumns).filter(Boolean).length, [visibleColumns]);

    useEffect(() => { setIsFiltering(!!activeSearchTerm); }, [activeSearchTerm]);

    const handleSearchTermChange = useCallback((event) => { setSearchTerm(event.target.value); }, []);
    const handleTargetTypeChange = useCallback((event) => { setSearchTargetType(event.target.value); }, []);
    const applySearch = useCallback(() => { setActiveSearchTerm(searchTerm); setActiveSearchTargetType(searchTargetType); }, [searchTerm, searchTargetType]);
    const clearSearch = useCallback(() => { setSearchTerm(''); setSearchTargetType('req'); setActiveSearchTerm(''); setActiveSearchTargetType('req'); }, []);
    const handleColumnVisibilityChange = useCallback((event) => { const { name, checked } = event.target; setVisibleColumns(prev => ({ ...prev, [name]: checked })); }, []);
    const requestSort = useCallback((key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        else if (sortConfig.key === key && sortConfig.direction === 'descending') { setSortConfig({ key: null, direction: 'ascending' }); return; }
        setSortConfig({ key, direction });
    }, [sortConfig]);
    const handleDirectionChange = useCallback((direction) => { setTraceDirection(direction); }, []);
    const handleShowDetailsChange = useCallback((event) => { setShowCellDetails(event.target.checked); }, []);
    const handleResetViewOptions = useCallback(() => { setTraceDirection(defaultViewOptions.direction); setVisibleColumns(defaultViewOptions.columns); setShowCellDetails(defaultViewOptions.details); setSortConfig(defaultViewOptions.sort); }, [defaultViewOptions]);
    const toggleControlsCollapse = useCallback(() => { setIsControlsCollapsed(prev => !prev); }, []);

    const renderWipSummary = () => {
        if (!isWipView || !processedRows) return null;
        const dataRows = processedRows.filter(row => row.type === 'data');
        if (dataRows.length === 0) {
            if (!isFiltering && (!rawData || rawData.length === 0)) return (<div className="TRACE-wip-summary"><div className="TRACE-wip-stat TRACE-success"><div className="TRACE-wip-stat-value">-</div><div className="TRACE-wip-stat-label">No WIP items found</div></div></div>);
            return null;
        }
        const uniqueReqIds = new Set(), uniqueDesignIds = new Set(), uniqueImplIds = new Set(), uniqueTestCaseIds = new Set();
        dataRows.forEach(row => {
            if (row.reqId && row.reqId !== '-') uniqueReqIds.add(row.reqId); if (row.designId && row.designId !== '-') uniqueDesignIds.add(row.designId);
            if (row.implId && row.implId !== '-') uniqueImplIds.add(row.implId); if (row.testCaseId && row.testCaseId !== '-') uniqueTestCaseIds.add(row.testCaseId);
        });
        return (
            <div className="TRACE-wip-summary">
                <div className="TRACE-wip-stat"><div className="TRACE-wip-stat-value">{uniqueReqIds.size}</div><div className="TRACE-wip-stat-label">Requirements</div></div>
                <div className="TRACE-wip-stat"><div className="TRACE-wip-stat-value">{uniqueDesignIds.size}</div><div className="TRACE-wip-stat-label">Designs</div></div>
                <div className="TRACE-wip-stat"><div className="TRACE-wip-stat-value">{uniqueImplIds.size}</div><div className="TRACE-wip-stat-label">Code Components</div></div>
                <div className="TRACE-wip-stat"><div className="TRACE-wip-stat-value">{uniqueTestCaseIds.size}</div><div className="TRACE-wip-stat-label">Test Cases</div></div>
            </div>
        );
    };

    const renderTableHeaders = () => (
        <tr>{columnOrder.map(colKey => {
            if (!visibleColumns[colKey]) return null;
            const columnConfig = columnKeyMap[colKey], isSortable = columnConfig && columnConfig.sortKey, isActiveSortCol = sortConfig.key === columnConfig?.sortKey;
            let sortIcon = faSort; if (isActiveSortCol) sortIcon = sortConfig.direction === 'ascending' ? faSortUp : faSortDown;
            return (<th key={colKey} className={`TRACE-th-${colKey} ${isSortable ? 'TRACE-sortable' : ''} ${isActiveSortCol ? 'TRACE-sorted' : ''}`} onClick={() => isSortable && requestSort(columnConfig.sortKey)} title={isSortable ? `Click to sort by ${headerLabels[colKey]}` : headerLabels[colKey]} aria-sort={isActiveSortCol ? (sortConfig.direction === 'ascending' ? 'ascending' : 'descending') : 'none'}>{headerLabels[colKey]}{isSortable && (<span className="TRACE-sort-icon"><FontAwesomeIcon icon={sortIcon} /></span>)}</th>);
        })}</tr>
    );

    const renderCellContent = (row, colKey) => {
        const cfg = columnKeyMap[colKey];
        if (!cfg) return <span className="TRACE-placeholder">-</span>;
        const id = row[cfg.id], name = row[cfg.name], status = cfg.status ? row[cfg.status] : undefined, basePrefix = cfg.prefix;
        if (id === "-" || id == null) return <span className="TRACE-placeholder">-</span>;
        const formattedId = formatIdWithPrefix(basePrefix, id);
        let displayName = '';
        if (showCellDetails) {
            if (colKey === 'impl') displayName = name && name !== 'N/A' ? name : '';
            else { const defaultNamePattern = new RegExp(`^${cfg.label}\\s+${id}$`, 'i'); displayName = name && name !== '-' && !defaultNamePattern.test(name) ? name : ''; }
        }

        let isItemAffected = false; // For items with status (REQ, Design, Test)
        let mismatchReason = '';   // For items with status

        // New variables for IMPL specific warning based on REQ/Design status
        let showImplSpecificWarning = false;
        let implSpecificWarningTooltip = '';

        const positiveStatuses = ['approved', 'passed', 'complete', 'verified', 'validated', 'baseline', 'done', 'closed'];
        const negativeStatuses = ['rejected', 'failed', 'error', 'blocked', 'cancelled', 'invalid'];

        // --- Logic for status-bearing items (REQ, Design, Test) to determine if they are 'affected' ---
        if (isWipView && cfg.status && status && status !== '-') { // This block is mainly for REQ, Design, Test as IMPL has no cfg.status
            const lowerItemStatus = String(status).toLowerCase();
            if (positiveStatuses.includes(lowerItemStatus)) {
                if (colKey === 'req' && lowerItemStatus === 'baseline') {
                    // REQ (Baseline) should not be marked 'affected' by its children's status in WIP (e.g. new 'Working' Design)
                    isItemAffected = false;
                    mismatchReason = '';
                } else {
                    // For non-baseline REQs, or for Design/Test cells:
                    // Check if their linked items (neighbors) have non-positive statuses.
                    const lowerReqStatus = String(row.reqStatus || '').toLowerCase();
                    const lowerDesignStatus = String(row.designStatus || '').toLowerCase();
                    const lowerTestCaseStatus = String(row.testCaseStatus || '').toLowerCase();
                    let hasNonPositiveNeighbor = false;
                    let neighborDetails = '';

                    // If current item (Design/Test) is positive, but linked REQ is not
                    if (colKey !== 'req' && row.reqId && row.reqId !== '-' && lowerReqStatus && lowerReqStatus !== '-' && !positiveStatuses.includes(lowerReqStatus)) {
                        hasNonPositiveNeighbor = true;
                        neighborDetails = `Linked Requirement ${formatIdWithPrefix(columnKeyMap.req.prefix, row.reqId)} is '${row.reqStatus}'.`;
                    }
                    // If current item (non-baseline REQ / Test) is positive, but linked Design is not
                    if (!hasNonPositiveNeighbor && colKey !== 'design' && row.designId && row.designId !== '-' && lowerDesignStatus && lowerDesignStatus !== '-' && !positiveStatuses.includes(lowerDesignStatus)) {
                        hasNonPositiveNeighbor = true;
                        neighborDetails = `Linked Design ${formatIdWithPrefix(columnKeyMap.design.prefix, row.designId)} is '${row.designStatus}'.`;
                    }
                    // If current item (non-baseline REQ / Design) is positive, but linked Test Case is not
                    if (!hasNonPositiveNeighbor && colKey !== 'test' && row.testCaseId && row.testCaseId !== '-' && lowerTestCaseStatus && lowerTestCaseStatus !== '-' && !positiveStatuses.includes(lowerTestCaseStatus)) {
                        hasNonPositiveNeighbor = true;
                        neighborDetails = `Linked Test Case ${formatIdWithPrefix(columnKeyMap.test.prefix, row.testCaseId)} is '${row.testCaseStatus}'.`;
                    }
                    
                    if (hasNonPositiveNeighbor) {
                        isItemAffected = true;
                        mismatchReason = neighborDetails;
                    }
                }
            }
        }

        // --- Logic for IMPL specific warning based on its precursors (REQ/Design status) ---
        if (isWipView && colKey === 'impl') {
            const lowerReqStatus = String(row.reqStatus || '').toLowerCase();
            const reqPrefix = columnKeyMap.req.prefix; // Get prefix from map
            const designPrefix = columnKeyMap.design.prefix; // Get prefix from map

            if (row.reqId && row.reqId !== '-' && lowerReqStatus && lowerReqStatus !== '-' && !positiveStatuses.includes(lowerReqStatus)) {
                showImplSpecificWarning = true;
                implSpecificWarningTooltip += `Linked Requirement ${formatIdWithPrefix(reqPrefix, row.reqId)} is '${row.reqStatus}'.\n`;
            }
            const lowerDesignStatus = String(row.designStatus || '').toLowerCase();
            if (row.designId && row.designId !== '-' && lowerDesignStatus && lowerDesignStatus !== '-' && !positiveStatuses.includes(lowerDesignStatus)) {
                showImplSpecificWarning = true;
                implSpecificWarningTooltip += `Linked Design ${formatIdWithPrefix(designPrefix, row.designId)} is '${row.designStatus}'.`;
            }
            implSpecificWarningTooltip = implSpecificWarningTooltip.trim();
        }
        // --- End of IMPL specific warning logic ---


        const affectedPopupContent = isItemAffected ? `Status inconsistency: This item (${formattedId}) is '${status}', but linked item needs attention (${mismatchReason}). Review required.` : '';
        const renderStatusBadge = (st, isAffectedFlag) => {
            if (!st || st === "-") return null;
            let statusClass = 'TRACE-status-neutral';
            const lowerStatus = String(st).toLowerCase();
            let isPositiveStatus = positiveStatuses.includes(lowerStatus);
            if (isPositiveStatus) statusClass = 'TRACE-status-positive';
            else if (negativeStatuses.includes(lowerStatus)) statusClass = 'TRACE-status-negative';
            if (isAffectedFlag && isPositiveStatus) statusClass += ' TRACE-status-affected'; // This makes REQ (Baseline) red if affected
            return (<span className={`TRACE-status-badge ${statusClass}`}>{st}</span>);
        };

        return (<>
            <div className="TRACE-item-id">{formattedId}</div>
            {displayName && <div className="TRACE-item-name">{displayName}</div>}

            {/* Display specific warning for Code Component (impl) if precursors are not positive */}
            {colKey === 'impl' && showImplSpecificWarning && showCellDetails && ( // Only show if details are enabled
                <Tippy content={<span style={{ whiteSpace: 'pre-wrap' }}>{implSpecificWarningTooltip}</span>} placement="top" arrow={true} animation="fade" theme="light-border" interactive={true}>
                    <span className="TRACE-custom-warning-indicator" style={{ cursor: 'help', marginLeft: '5px', color: '#ff7f0e' /* Example warning color: darkorange */ }}>
                        <FontAwesomeIcon icon={faExclamationTriangle} />
                    </span>
                </Tippy>
            )}

            {/* Existing logic for status display and generic 'affected' icon for items WITH status */}
            {showCellDetails && status !== undefined && ( // This block is skipped for IMPL as status is undefined
                <div className="TRACE-status-container">
                    {renderStatusBadge(status, isItemAffected)}
                    {isItemAffected && ( // This icon is for REQ, Design, Test if they are 'affected'
                        <Tippy content={<span style={{ whiteSpace: 'pre-wrap' }}>{affectedPopupContent}</span>} placement="top" arrow={true} animation="fade" theme="light-border" interactive={true}>
                            <span className="TRACE-affected-indicator" style={{ cursor: 'help', marginLeft: '5px' }}>
                                <FontAwesomeIcon icon={faExclamationTriangle} />
                            </span>
                        </Tippy>
                    )}
                </div>
            )}

            {showActionButtons && id !== "-" && (
                <div className="TRACE-inline-actions">
                    {colKey === 'req' && (<><button onClick={() => navigate(`/ViewEditReq?requirement_id=${id}`)} title={`View ${formattedId}`} className="TRACE-action-button TRACE-action-view"><FontAwesomeIcon icon={faEye} /></button><button onClick={() => navigate(`/UpdateRequirement?project_id=${projectId}&requirement_id=${id}`)} title={`Edit ${formattedId}`} className="TRACE-action-button TRACE-action-edit"><FontAwesomeIcon icon={faPen} /></button></>)}
                    {colKey === 'design' && (<><button onClick={() => navigate(`/ViewDesign?project_id=${projectId}&design_id=${id}`)} title={`View ${formattedId}`} className="TRACE-action-button TRACE-action-view"><FontAwesomeIcon icon={faEye} /></button><button onClick={() => navigate(`/UpdateDesign?project_id=${projectId}&design_id=${id}`)} title={`Edit ${formattedId}`} className="TRACE-action-button TRACE-action-edit"><FontAwesomeIcon icon={faPen} /></button></>)}
                    {colKey === 'test' && (<><button className="TRACE-action-button TRACE-action-view" onClick={() => navigate(`/TestcaseDetail?testcase_id=${id}&project_id=${projectId}`, { state: { testcase: { testcase_id: id, testcase_name: name, testcase_status: status, project_id: projectId }, projectId } })} title={`View ${formattedId}`}><FontAwesomeIcon icon={faEye} /></button><button className="TRACE-action-button TRACE-action-edit" onClick={() => navigate(`/UpdateTestcase?testcase_id=${id}&project_id=${projectId}`)} title={`Edit ${formattedId}`}><FontAwesomeIcon icon={faPen} /></button></>)}
                </div>
            )}
        </>);
    };

    const renderTableBody = () => {
        if (!processedRows || processedRows.length === 0) return (<tr><td colSpan={visibleColumnCount || 1} className="TRACE-no-data">{isFiltering ? "No items match the current filters." : (!rawData || rawData.length === 0) ? "No traceability data found for this project." : "No data available for the current view."}</td></tr>);
        const getRowSpanValue = (span) => (span > 0 ? span : 1);
        return processedRows.map((row) => {
            if (row.type === 'data') {
                const rowClasses = [row.isUnlinked ? 'TRACE-unlinked' : ''].filter(Boolean).join(' ');
                return (<tr key={row.key} className={rowClasses}>{columnOrder.map(colKey => {
                    if (!visibleColumns[colKey]) return null;
                    let shouldRenderCell = true, rowSpan = 1;
                    if (colKey === 'req' && !row.isFirstReqRow) shouldRenderCell = false;
                    else if (colKey === 'design' && !row.isFirstDesignRow) shouldRenderCell = false;
                    else if (colKey === 'impl' && !row.isFirstImplRow) shouldRenderCell = false;
                    else if (colKey === 'test' && !row.isFirstTestRow) shouldRenderCell = false;
                    if (shouldRenderCell) {
                        if (colKey === 'req') rowSpan = getRowSpanValue(row.reqRowSpan);
                        else if (colKey === 'design') rowSpan = getRowSpanValue(row.designRowSpan);
                        else if (colKey === 'impl') rowSpan = getRowSpanValue(row.implRowSpan);
                        else if (colKey === 'test') rowSpan = getRowSpanValue(row.testRowSpan);
                    }
                    if (shouldRenderCell) return (<td key={colKey} rowSpan={rowSpan} className={`TRACE-cell TRACE-cell-${colKey}`}>{renderCellContent(row, colKey)}</td>);
                    return null;
                })}</tr>);
            }
            return null;
        });
    };

    const renderControlsArea = () => (
        <div className={`TRACE-controls-area ${isControlsCollapsed ? 'TRACE-controls-collapsed' : ''}`}>
            <div className="TRACE-controls-header" onClick={toggleControlsCollapse} role="button" tabIndex={0} aria-expanded={!isControlsCollapsed} aria-controls="trace-controls-content">
                <h3 className="TRACE-controls-title"> <FontAwesomeIcon icon={faSlidersH} /> Controls & Options </h3>
                <button onClick={(e) => { e.stopPropagation(); toggleControlsCollapse(); }} className="TRACE-collapse-button" title={isControlsCollapsed ? 'Expand Controls' : 'Collapse Controls'} aria-expanded={!isControlsCollapsed} aria-controls="trace-controls-content" >
                    <FontAwesomeIcon icon={isControlsCollapsed ? faChevronDown : faChevronUp} /><span>{isControlsCollapsed ? 'Show' : 'Hide'}</span>
                </button>
            </div>
            <div className="TRACE-controls-content" id="trace-controls-content" style={{ display: isControlsCollapsed ? 'none' : '' }} >
                <div className="TRACE-control-card">
                    <div className="TRACE-control-group TRACE-search-group">
                        <h4 className="TRACE-control-group-title"><FontAwesomeIcon icon={faSearch} /> Search</h4>
                        <div className="TRACE-control-row">
                            <select name="searchTargetType" value={searchTargetType} onChange={handleTargetTypeChange} aria-label="Search target type" className="TRACE-select">
                                <option value="req">Requirement Specification</option><option value="design">Software Design</option>
                                <option value="impl">Code Component</option><option value="test">Test Case</option>
                            </select>
                            <input type="text" value={searchTerm} onChange={handleSearchTermChange} placeholder="Search Formatted ID (e.g. REQ-001) or Name..." className="TRACE-input" aria-label="Search term" />
                            <button onClick={applySearch} className="TRACE-button" title="Apply search"><FontAwesomeIcon icon={faFilter} /> Apply</button>
                            <button onClick={clearSearch} className="TRACE-button TRACE-button-clear" title="Clear search" disabled={!activeSearchTerm && !searchTerm}><FontAwesomeIcon icon={faTimes} /> Clear</button>
                        </div>
                    </div>
                </div>
                <div className="TRACE-control-card">
                    <div className="TRACE-control-group TRACE-view-options-group">
                        <div className="TRACE-view-options-header">
                            <h4 className="TRACE-control-group-title"><FontAwesomeIcon icon={faEye} /> View Options</h4>
                            <button onClick={handleResetViewOptions} className="TRACE-button TRACE-button-reset" title="Reset all view options to default"> <FontAwesomeIcon icon={faTimes} /> Reset View </button>
                        </div>
                        <div className="TRACE-view-options-subgroup">
                            <div className="TRACE-control-row">
                                <div className="TRACE-option-item">
                                    <label className="TRACE-control-label" title="Change trace direction"> <FontAwesomeIcon icon={faArrowsLeftRight} className="TRACE-option-label-icon" /> Direction: </label>
                                    <button onClick={() => handleDirectionChange('forward')} disabled={traceDirection === 'forward'} className={`TRACE-button TRACE-button-direction ${traceDirection === 'forward' ? 'active' : ''}`} title="Forward (REQ -> TEST)"><FontAwesomeIcon icon={faChevronRight} /> Fwd</button>
                                    <button onClick={() => handleDirectionChange('backward')} disabled={traceDirection === 'backward'} className={`TRACE-button TRACE-button-direction ${traceDirection === 'backward' ? 'active' : ''}`} title="Backward (TEST -> REQ)"><FontAwesomeIcon icon={faChevronRight} rotation={180} /> Bwd</button>
                                </div>
                            </div>
                        </div>
                        <div className="TRACE-view-options-subgroup">
                            <div className="TRACE-control-row TRACE-visibility-row">
                                <div className="TRACE-option-item TRACE-option-item-columns">
                                    <label className="TRACE-control-label" title="Show or hide columns"> <FontAwesomeIcon icon={faColumns} className="TRACE-option-label-icon" /> Columns: </label>
                                    <div className="TRACE-checkbox-group">{columnOrder.map(colKey => (<label key={colKey} className="TRACE-checkbox-label" title={`Show/Hide ${headerLabels[colKey]}`}><input type="checkbox" name={colKey} checked={visibleColumns[colKey]} onChange={handleColumnVisibilityChange} className="TRACE-checkbox" />{headerLabels[colKey]}</label>))}</div>
                                </div>
                                <div className="TRACE-option-item">
                                    <label className="TRACE-checkbox-label" title="Show/Hide cell details (Name, Status)"><input type="checkbox" checked={showCellDetails} onChange={handleShowDetailsChange} className="TRACE-checkbox" /><FontAwesomeIcon icon={showCellDetails ? faEye : faEyeSlash} className="TRACE-option-label-icon" /> Show Details</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`TRACE-table-section ${isWipView ? 'TRACE-wip-section' : 'TRACE-baseline-section'}`}>
            {renderControlsArea()}
            {isWipView && renderWipSummary()}
            {isFiltering && (<div className="TRACE-filter-indicator"><FontAwesomeIcon icon={faFilter} /> Filtering results for "{activeSearchTerm}" in {columnKeyMap[activeSearchTargetType]?.label || 'Unknown'}s.<button onClick={clearSearch} className="TRACE-clear-filter-inline" title="Clear filter">Clear</button></div>)}
            <div className="TRACE-table-container"><table className="TRACE-table" aria-live="polite" aria-relevant="all"><thead>{renderTableHeaders()}</thead><tbody>{renderTableBody()}</tbody></table></div>
        </div>
    );
};

const TraceabilityPage = () => {
    const [baselineData, setBaselineData] = useState([]);
    const [nonBaselineData, setNonBaselineData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [activeTab, setActiveTab] = useState('baseline');
    const [runTutorial, setRunTutorial] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const projectId = useMemo(() => queryParams.get("project_id"), [queryParams]);
    const isMountedRef = useRef(true);

    const handleRestartTutorial = () => { setRunTutorial(true); };
    const handleJoyrideCallback = (data) => { if ([STATUS.FINISHED, STATUS.SKIPPED].includes(data.status)) { setRunTutorial(false); localStorage.setItem('traceabilityPageTutorialShown', 'true'); } };

    const fetchData = useCallback(async (refresh = false) => {
        if (!projectId) { setFetchError("Project ID is missing in the URL."); setIsLoading(false); return; }
        if (refresh) setIsRefreshing(true); else setIsLoading(true);
        setFetchError(null);
        const projectDetailsEndpoint = `http://localhost:3001/project/${projectId}`;
        const baselineEndpoint = `http://localhost:3001/traceability`;
        const nonBaselineEndpoint = `http://localhost:3001/not-linked-non-baseline`;
        try {
            const results = await Promise.allSettled([
                axios.get(projectDetailsEndpoint),
                axios.get(baselineEndpoint, { params: { projectId } }),
                axios.get(nonBaselineEndpoint, { params: { projectId } })
            ]);
            if (!isMountedRef.current) return;
            let currentFetchError = null;
            if (results[0].status === 'fulfilled' && results[0].value.data?.project_name) setProjectName(results[0].value.data.project_name);
            else { setProjectName(`Project ${projectId}`); if (results[0].status === 'rejected') { console.error("Project details fetch error:", results[0].reason); currentFetchError = "Failed to load project details."; } }
            if (results[1].status === 'fulfilled' && Array.isArray(results[1].value.data)) setBaselineData(results[1].value.data);
            else { setBaselineData([]); const errorMsg = results[1].reason?.response?.data?.message || results[1].reason?.message || "Failed to load Traceability Record data"; console.error("Baseline fetch error:", results[1].reason); currentFetchError = currentFetchError ? `${currentFetchError} & Record` : errorMsg; }
            if (results[2].status === 'fulfilled' && Array.isArray(results[2].value.data)) setNonBaselineData(results[2].value.data);
            else { setNonBaselineData([]); const errorMsg = results[2].reason?.response?.data?.message || results[2].reason?.message || "Failed to load Work Product Tracking data"; console.error("WIP fetch error:", results[2].reason); currentFetchError = currentFetchError ? `${currentFetchError} & WIP` : errorMsg; }
            setFetchError(currentFetchError);
        } catch (err) {
            if (isMountedRef.current) { console.error("General fetch error:", err); setFetchError(`A network or configuration error occurred: ${err.message}. Please check connection or API endpoints.`); setProjectName(`Project ${projectId}`); setBaselineData([]); setNonBaselineData([]); }
        } finally { if (isMountedRef.current) { setIsLoading(false); setIsRefreshing(false); } }
    }, [projectId]);

    useEffect(() => {
        isMountedRef.current = true; fetchData();
        const tutorialShown = localStorage.getItem('traceabilityPageTutorialShown');
        if (!tutorialShown) { const timer = setTimeout(() => { if (isMountedRef.current) setRunTutorial(true); }, 700); return () => clearTimeout(timer); }
        return () => { isMountedRef.current = false; };
    }, [fetchData]);

    if (isLoading && !isRefreshing) return (<div className="TRACE-loading"><FontAwesomeIcon icon={faSpinner} spin size="3x" /><p>Loading Traceability Data...</p></div>);
    if (!projectId) return (<div className="TRACE-error critical"><FontAwesomeIcon icon={faExclamationTriangle} /> Error: Project ID is missing. Cannot load traceability page...</div>);

    return (
        <div className="TRACE-page-wrapper">
            <Joyride steps={tutorialSteps} run={runTutorial} continuous showProgress showSkipButton styles={{ options: { zIndex: 10000, arrowColor: 'var(--trace-primary)', backgroundColor: 'var(--trace-bg-primary)', primaryColor: 'var(--trace-primary)', textColor: 'var(--trace-text-primary)', }, tooltipContainer: { textAlign: "left", }, buttonNext: { backgroundColor: "var(--trace-primary)", }, buttonBack: { marginRight: 10, }, }} callback={handleJoyrideCallback} />
            <div className="TRACE-enterprise-header">
                <div className="TRACE-header-top">
                    <div className="TRACE-project-info">
                        <div className="TRACE-project-breadcrumb"><FontAwesomeIcon icon={faHome} /> / <span onClick={() => navigate('/projects')} className="TRACE-breadcrumb-link">Projects</span> / <span>{projectName || `Project ${projectId}`}</span></div>
                        <div className="TRACE-project-title"><h1 className="TRACE-project-name">{projectName || `Project ${projectId}`}</h1><span className="TRACE-badge"><FontAwesomeIcon icon={faLink} /> TRACEABILITY</span></div>
                    </div>
                    <div className="TRACE-header-actions">
                        <button onClick={() => fetchData(true)} className="TRACE-refresh-button TRACE-icon-button" title="Refresh Data" disabled={isLoading || isRefreshing}><FontAwesomeIcon icon={faSync} spin={isRefreshing} /></button>
                        <button onClick={handleRestartTutorial} className="TRACE-tutorial-button TRACE-icon-button" title="Show Tutorial"><FontAwesomeIcon icon={faQuestionCircle} /></button>
                    </div>
                </div>
                <div className="TRACE-header-tab-bar">
                    <div className={`TRACE-header-tab ${activeTab === 'baseline' ? 'TRACE-active' : ''}`} onClick={() => !isLoading && !isRefreshing && setActiveTab('baseline')} role="tab" aria-selected={activeTab === 'baseline'} tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isLoading && !isRefreshing && setActiveTab('baseline')}><FontAwesomeIcon icon={faTable} className="TRACE-tab-icon" /> Traceability Record</div>
                    <div className={`TRACE-header-tab ${activeTab === 'wip' ? 'TRACE-active' : ''}`} onClick={() => !isLoading && !isRefreshing && setActiveTab('wip')} role="tab" aria-selected={activeTab === 'wip'} tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isLoading && !isRefreshing && setActiveTab('wip')}><FontAwesomeIcon icon={faProjectDiagram} className="TRACE-tab-icon" /> Work Product Tracking</div>
                    <div className="TRACE-tab-bar-actions">{activeTab === 'baseline' && !isLoading && !isRefreshing && (<>
                        <button className="TRACE-action-button" onClick={() => navigate(`/createVerifyTrace?project_id=${projectId}`)} title="Create Verification"><FontAwesomeIcon icon={faPlus} /> Create Verification</button>
                        <button className="TRACE-action-button" onClick={() => navigate(`/viewVerifyTrace?project_id=${projectId}`)} title="View Verification"><FontAwesomeIcon icon={faEye} /> View Verification</button>
                        <button className="TRACE-action-button" onClick={() => navigate(`/setBaselineTrace?project_id=${projectId}`)} title="Set Baseline"><FontAwesomeIcon icon={faTable} /> Set Baseline</button>
                        <button className="TRACE-action-button" onClick={() => navigate(`/versionVerTrace?project_id=${projectId}`)} title="Baseline History"><FontAwesomeIcon icon={faHistory} /> Baseline History</button>
                        <button className="TRACE-action-button" onClick={() => navigate(`/currentBaselineTrace?project_id=${projectId}`)} title="Current Baseline"><FontAwesomeIcon icon={faCheckCircle} /> Current Baseline</button>
                    </>)}</div>
                </div>
            </div>
            <div className="TRACE-main-content">
                {fetchError && !isLoading && !isRefreshing && (<div className="TRACE-warning"><FontAwesomeIcon icon={faExclamationTriangle} /> Warning: {fetchError}. Some data might be missing or outdated.<button onClick={() => fetchData(true)} className="TRACE-retry-button" title="Retry Fetch">Retry</button></div>)}
                <div className="TRACE-tab-content">
                    {activeTab === 'baseline' && (<RenderTraceabilityTable key="baseline-table" rawData={baselineData} showActionButtons={true} projectId={projectId} isWipView={false} />)}
                    {activeTab === 'wip' && (<RenderTraceabilityTable key="wip-table" rawData={nonBaselineData} showActionButtons={false} projectId={projectId} isWipView={true} />)}
                </div>
            </div>
        </div>
    );
};

export default TraceabilityPage;