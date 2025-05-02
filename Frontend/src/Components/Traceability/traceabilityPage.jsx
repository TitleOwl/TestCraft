import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    // --- Core Icons ---
    faSearch, faFilter, faTable, faExchangeAlt, faEye, faPen,
    faPlus, faTrash, faHome, faChevronRight, faQuestionCircle,
    faLayerGroup, faTimes, faColumns, faSort, faHistory, faCheckCircle,
    faLink, faProjectDiagram, faSpinner, faExclamationTriangle,
    faSortUp, faSortDown, faSync, faArrowsLeftRight, faArrowsAltV,
    faEyeSlash, faChevronUp, faChevronDown, faSlidersH
    // REMOVED: faDownload, faFileExport, faFileCsv (as per original removal)
} from "@fortawesome/free-solid-svg-icons";

// --- CSS Import ---
// <<< ตรวจสอบ Path ของไฟล์ CSS ให้ถูกต้อง >>>
import './CSS/traceabilityPage.css';

// ========================================================================
// Constants & Configuration
// ========================================================================

/** Mapping for column data keys, labels, and sorting */
const columnKeyMap = {
    req: { id: 'reqId', name: 'reqName', status: 'reqStatus', sortKey: 'reqId', label: 'Requirement' },
    design: { id: 'designId', name: 'designName', status: 'designStatus', sortKey: 'designId', label: 'Design' },
    impl: { id: 'implId', name: 'implFile',     /* status: null, */       sortKey: 'implId', label: 'Code Component' },
    test: { id: 'testCaseId', name: 'testCaseName', status: 'testCaseStatus', sortKey: 'testCaseId', label: 'Test Case' }
};

/** Labels for table headers */
const headerLabels = {
    req: 'Requirement',
    design: 'Design',
    impl: 'Code Component',
    test: 'Test Case'
};

/** Tutorial steps configuration (Adjust content as needed) */
const tutorialSteps = [
    { target: '.TRACE-header-tab-bar', content: 'สลับมุมมองระหว่าง Traceability Record (Baseline) และ Work-In-Progress ปุ่มดำเนินการสำหรับ Baseline จะแสดงที่ด้านขวาตรงนี้เมื่อแท็บ Record ทำงานอยู่', placement: 'bottom', disableBeacon: true }, // Updated content
    { target: '.TRACE-header-actions', content: 'ใช้ปุ่มรีเฟรชเพื่ออัปเดตข้อมูล คลิกเครื่องหมายคำถาม (?) เพื่อเริ่ม Tutorial นี้ใหม่อีกครั้ง', placement: 'bottom' }, // Updated content
    { target: '.TRACE-controls-header', content: 'คลิกที่หัวข้อนี้ หรือปุ่ม แสดง/ซ่อน เพื่อขยายหรือย่อส่วนควบคุม', placement: 'bottom' },
    { target: '.TRACE-controls-content', content: 'เมื่อขยายแล้ว ใช้ส่วนควบคุมเหล่านี้ (จัดกลุ่มเป็นการ์ด) เพื่อค้นหา, กรองข้อมูล, และปรับแต่งตัวเลือกมุมมอง', placement: 'bottom' },
    { target: '.TRACE-sortable', content: 'คลิกที่หัวคอลัมน์เพื่อเรียงลำดับข้อมูล', placement: 'top', },
    { target: '.TRACE-view-options-group', content: 'ปรับแต่งมุมมองตารางของคุณ: ทิศทาง, การจัดกลุ่ม, คอลัมน์, รายละเอียดในเซลล์, ความหนาแน่นของแถว, หรือรีเซ็ตค่า', placement: 'top', },
    { target: '.TRACE-density-control-group', content: 'ปรับระยะห่างระหว่างแถว: ชิด (Compact), ปกติ (Normal), หรือ กว้าง (Spacious)', placement: 'top', },
    { target: '.TRACE-button-reset', content: 'รีเซ็ตตัวเลือกมุมมองทั้งหมดกลับไปเป็นค่าเริ่มต้น', placement: 'left', },
    { target: '.TRACE-wip-controls-group', content: 'ส่วน WIP ใช้ตัวกรองเพื่อค้นหารายการที่ยังไม่มีการเชื่อมโยง (Missing links)', placement: 'top' },
    { target: '.TRACE-wip-summary', content: 'สรุปความสมบูรณ์ของการเชื่อมโยง Traceability สำหรับรายการที่กำลังดำเนินการ', placement: 'top' },
    { target: '.TRACE-table', content: 'ตาราง Traceability หลัก คลิกไอคอนในเซลล์ (ในมุมมอง Record) เพื่อดู/แก้ไขรายการ', placement: 'top' },
    { target: '.TRACE-tutorial-button', content: 'เริ่ม Tutorial นี้ใหม่ได้ทุกเมื่อ', placement: 'left' },
];


// ========================================================================
// Helper Functions (Data Processing)
// ========================================================================

/**
 * Filters traceability data based on search term and target type.
 */
const filterTraceabilityData = (data, searchTerm, searchTargetType) => {
    if (!data) return []; const lowerSearchTerm = searchTerm?.trim().toLowerCase() || ''; if (!lowerSearchTerm || !searchTargetType) { return data; }
    const checkMatch = (item, term, idKey, nameKey, prefix = '') => { if (!item || !term) return false; const termWithoutPrefix = prefix && term.startsWith(prefix.toLowerCase()) ? term.substring(prefix.length) : term; const idString = item[idKey]?.toString() || ''; const idMatch = idString === term || (termWithoutPrefix && idString === termWithoutPrefix); const nameString = item[nameKey]?.toLowerCase() || ''; const nameMatch = nameString.includes(term); return idMatch || nameMatch; };
    return data.filter(r => { switch (searchTargetType) { case 'req': return checkMatch(r, lowerSearchTerm, 'RequirementID', 'RequirementName', 'req-'); case 'design': return r.Designs?.some(d => checkMatch(d, lowerSearchTerm, 'DesignID', 'DiagramName', 'de-')); case 'impl': return r.Designs?.some(d => d.Implementations?.some(i => checkMatch(i, lowerSearchTerm, 'ImplementID', 'ImplementFilename', 'imp-'))); case 'test': return r.Designs?.some(d => d.Implementations?.some(i => i.TestCases?.some(t => checkMatch(t, lowerSearchTerm, 'TestCaseID', 'TestCaseName', 'tc-')))); default: return true; } });
};

/**
 * Generates flattened rows for forward traceability display (Req -> Test).
 */
const generateForwardDisplayRows = (nestedData) => {
    const flatRows = []; if (!nestedData || nestedData.length === 0) return flatRows; let keyCounter = 0;
    nestedData.forEach(req => { let reqStartIndex = flatRows.length; let reqRowCount = 0; const reqId = req.RequirementID; const reqName = req.RequirementName || `Requirement ${reqId}`; const reqStatus = req.RequirementStatus || '-'; const baseKeyPrefix = `fwd-req-${reqId}`; if (!req.Designs || req.Designs.length === 0) { reqRowCount = 1; flatRows.push({ key: `${baseKeyPrefix}-no-design-${keyCounter++}`, reqId, reqName, reqStatus, designId: "-", designName: "-", designStatus: "-", implId: "-", implFile: "-", testCaseId: "-", testCaseName: "-", testCaseStatus: "-", isFirstReqRow: true, reqRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1, isFirstTestRow: true, testRowSpan: 1 }); } else { req.Designs.forEach((design) => { let designStartIndex = flatRows.length; let designRowCount = 0; const designId = design.DesignID; const designName = design.DiagramName || `Design ${designId}`; const designStatus = design.DesignStatus || '-'; const designKeyPrefix = `${baseKeyPrefix}-design-${designId}`; if (!design.Implementations || design.Implementations.length === 0) { designRowCount = 1; flatRows.push({ key: `${designKeyPrefix}-no-impl-${keyCounter++}`, reqId, reqName, reqStatus, designId, designName, designStatus, implId: "-", implFile: "-", testCaseId: "-", testCaseName: "-", testCaseStatus: "-", isFirstReqRow: reqRowCount === 0, reqRowSpan: 0, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1, isFirstTestRow: true, testRowSpan: 1 }); reqRowCount++; } else { design.Implementations.forEach((impl) => { let implStartIndex = flatRows.length; let implRowCount = 0; const implId = impl.ImplementID; const implFile = impl.ImplementFilename || 'N/A'; const implKeyPrefix = `${designKeyPrefix}-impl-${implId}`; if (!impl.TestCases || impl.TestCases.length === 0) { implRowCount = 1; flatRows.push({ key: `${implKeyPrefix}-no-tc-${keyCounter++}`, reqId, reqName, reqStatus, designId, designName, designStatus, implId, implFile, testCaseId: "-", testCaseName: "-", testCaseStatus: "-", isFirstReqRow: reqRowCount === 0, reqRowSpan: 0, isFirstDesignRow: designRowCount === 0, designRowSpan: 0, isFirstImplRow: true, implRowSpan: 1, isFirstTestRow: true, testRowSpan: 1 }); reqRowCount++; designRowCount++; } else { impl.TestCases.forEach((tc, tcIdx) => { const tcId = tc.TestCaseID; const tcName = tc.TestCaseName || `Test Case ${tcId}`; const testCaseStatus = tc.TestCaseStatus || '-'; flatRows.push({ key: `${implKeyPrefix}-tc-${tcId}-${keyCounter++}`, reqId, reqName, reqStatus, designId, designName, designStatus, implId, implFile, testCaseId: tcId, testCaseName: tcName, testCaseStatus, isFirstReqRow: reqRowCount === 0 && tcIdx === 0, reqRowSpan: 0, isFirstDesignRow: designRowCount === 0 && tcIdx === 0, designRowSpan: 0, isFirstImplRow: implRowCount === 0 && tcIdx === 0, implRowSpan: 0, isFirstTestRow: true, testRowSpan: 1 }); reqRowCount++; designRowCount++; implRowCount++; }); if (implStartIndex < flatRows.length && implRowCount > 0) { flatRows[implStartIndex].implRowSpan = implRowCount; flatRows[implStartIndex].isFirstImplRow = true; } } }); if (designStartIndex < flatRows.length && designRowCount > 0) { flatRows[designStartIndex].designRowSpan = designRowCount; flatRows[designStartIndex].isFirstDesignRow = true; } } }); if (reqStartIndex < flatRows.length && reqRowCount > 0) { flatRows[reqStartIndex].reqRowSpan = reqRowCount; flatRows[reqStartIndex].isFirstReqRow = true; } } if (reqStartIndex < flatRows.length && !flatRows[reqStartIndex].isFirstReqRow) { flatRows[reqStartIndex].isFirstReqRow = true; } });
    return flatRows;
};

/**
 * Generates flattened rows for backward traceability display (Test -> Req).
 */
const generateBackwardDisplayRows = (nestedData) => {
    const backwardMap = new Map(); if (!nestedData || nestedData.length === 0) return [];
    nestedData.forEach(req => { const reqId = req.RequirementID; const reqName = req.RequirementName || `Requirement ${reqId}`; const reqStatus = req.RequirementStatus || '-'; req.Designs?.forEach(design => { const designId = design.DesignID; const designName = design.DiagramName || `Design ${designId}`; const designStatus = design.DesignStatus || '-'; design.Implementations?.forEach(impl => { const implId = impl.ImplementID; const implFile = impl.ImplementFilename || 'N/A'; impl.TestCases?.forEach(tc => { const tcId = tc.TestCaseID; const tcName = tc.TestCaseName || `Test Case ${tcId}`; const testCaseStatus = tc.TestCaseStatus || '-'; if (!backwardMap.has(tcId)) { backwardMap.set(tcId, { testCaseName: tcName, testCaseStatus, implementations: new Map() }); } const testEntry = backwardMap.get(tcId); testEntry.testCaseStatus = testCaseStatus; if (!testEntry.implementations.has(implId)) { testEntry.implementations.set(implId, { implFile, designs: new Map() }); } const implEntry = testEntry.implementations.get(implId); if (!implEntry.designs.has(designId)) { implEntry.designs.set(designId, { designName, designStatus, requirements: new Map() }); } const designEntry = implEntry.designs.get(designId); designEntry.designStatus = designStatus; if (!designEntry.requirements.has(reqId)) { designEntry.requirements.set(reqId, { reqName, reqStatus }); } designEntry.requirements.get(reqId).reqStatus = reqStatus; }); }); }); });
    const flatRows = []; let keyCounter = 0;
    Array.from(backwardMap.entries()).forEach(([testCaseId, testEntry]) => { let testStartIndex = flatRows.length; let testRowCount = 0; const testItems = Array.from(testEntry.implementations.entries()); const baseKeyPrefix = `bwd-tc-${testCaseId}`; if (testItems.length === 0) { testRowCount = 1; flatRows.push({ key: `${baseKeyPrefix}-no-impl-${keyCounter++}`, testCaseId, testCaseName: testEntry.testCaseName, testCaseStatus: testEntry.testCaseStatus, implId: "-", implFile: "-", designId: "-", designName: "-", designStatus: "-", reqId: "-", reqName: "-", reqStatus: "-", isFirstTestRow: true, testRowSpan: 1, isFirstImplRow: true, implRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstReqRow: true, reqRowSpan: 1 }); } else { testItems.forEach(([implId, implEntry]) => { let implStartIndex = flatRows.length; let implRowCount = 0; const designItems = Array.from(implEntry.designs.entries()); const implKeyPrefix = `${baseKeyPrefix}-impl-${implId}`; if (designItems.length === 0) { implRowCount = 1; flatRows.push({ key: `${implKeyPrefix}-no-design-${keyCounter++}`, testCaseId, testCaseName: testEntry.testCaseName, testCaseStatus: testEntry.testCaseStatus, implId, implFile: implEntry.implFile, designId: "-", designName: "-", designStatus: "-", reqId: "-", reqName: "-", reqStatus: "-", isFirstTestRow: testRowCount === 0, testRowSpan: 0, isFirstImplRow: true, implRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstReqRow: true, reqRowSpan: 1 }); testRowCount++; } else { designItems.forEach(([designId, designEntry]) => { let designStartIndex = flatRows.length; let designRowCount = 0; const requirementItems = Array.from(designEntry.requirements.entries()); const designKeyPrefix = `${implKeyPrefix}-design-${designId}`; if (requirementItems.length === 0) { designRowCount = 1; flatRows.push({ key: `${designKeyPrefix}-no-req-${keyCounter++}`, testCaseId, testCaseName: testEntry.testCaseName, testCaseStatus: testEntry.testCaseStatus, implId, implFile: implEntry.implFile, designId, designName: designEntry.designName, designStatus: designEntry.designStatus, reqId: "-", reqName: "-", reqStatus: "-", isFirstTestRow: testRowCount === 0, testRowSpan: 0, isFirstImplRow: implRowCount === 0, implRowSpan: 0, isFirstDesignRow: true, designRowSpan: 1, isFirstReqRow: true, reqRowSpan: 1 }); testRowCount++; implRowCount++; } else { requirementItems.forEach(([reqId, reqEntry], reqIdx) => { flatRows.push({ key: `${designKeyPrefix}-req-${reqId}-${keyCounter++}`, testCaseId, testCaseName: testEntry.testCaseName, testCaseStatus: testEntry.testCaseStatus, implId, implFile: implEntry.implFile, designId, designName: designEntry.designName, designStatus: designEntry.designStatus, reqId, reqName: reqEntry.reqName, reqStatus: reqEntry.reqStatus, isFirstTestRow: testRowCount === 0 && reqIdx === 0, testRowSpan: 0, isFirstImplRow: implRowCount === 0 && reqIdx === 0, implRowSpan: 0, isFirstDesignRow: designRowCount === 0 && reqIdx === 0, designRowSpan: 0, isFirstReqRow: true, reqRowSpan: 1 }); testRowCount++; implRowCount++; designRowCount++; }); if (designStartIndex < flatRows.length && designRowCount > 0) { flatRows[designStartIndex].designRowSpan = designRowCount; flatRows[designStartIndex].isFirstDesignRow = true; } } }); if (implStartIndex < flatRows.length && implRowCount > 0) { flatRows[implStartIndex].implRowSpan = implRowCount; flatRows[implStartIndex].isFirstImplRow = true; } } }); if (testStartIndex < flatRows.length && testRowCount > 0) { flatRows[testStartIndex].testRowSpan = testRowCount; flatRows[testStartIndex].isFirstTestRow = true; } } if (testStartIndex < flatRows.length && !flatRows[testStartIndex].isFirstTestRow) { flatRows[testStartIndex].isFirstTestRow = true; } });
    return flatRows;
};


// ========================================================================
// RenderTraceabilityTable Sub-Component
// Responsible for rendering the interactive traceability table.
// ========================================================================
const RenderTraceabilityTable = ({
    // title prop removed as it wasn't used in final layout
    rawData, // The raw nested data for this table (baseline or WIP)
    showActionButtons, // Whether to show view/edit buttons in cells
    projectId, // Current project ID
    // projectName prop removed as it wasn't used
    isWipView = false // Flag indicating if this is the WIP table
}) => {
    const navigate = useNavigate();

    // --- State Management ---
    const [searchTerm, setSearchTerm] = useState('');
    const [searchTargetType, setSearchTargetType] = useState('req');
    const [activeSearchTerm, setActiveSearchTerm] = useState('');
    const [activeSearchTargetType, setActiveSearchTargetType] = useState(searchTargetType);
    const [isFiltering, setIsFiltering] = useState(false);
    const [showUnlinkedOnly, setShowUnlinkedOnly] = useState(false);
    const [wipStatusFilter, setWipStatusFilter] = useState('all');
    const [traceDirection, setTraceDirection] = useState('forward');
    const [groupByColumn, setGroupByColumn] = useState('none');
    const [visibleColumns, setVisibleColumns] = useState({ req: true, design: true, impl: true, test: true });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [tableDensity, setTableDensity] = useState('normal');
    const [showCellDetails, setShowCellDetails] = useState(true);
    const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);

    // --- Derived State & Memoized Values ---
    const defaultViewOptions = useMemo(() => ({
        direction: 'forward', groupBy: 'none', columns: { req: true, design: true, impl: true, test: true },
        density: 'normal', details: true, sort: { key: null, direction: 'ascending' }
    }), []);

    const filteredData = useMemo(() => {
        let filtered = filterTraceabilityData(rawData, activeSearchTerm, activeSearchTargetType);
        if (isWipView) {
            if (wipStatusFilter !== 'all') {
                filtered = filtered.filter(item => {
                    const hasDesigns = item.Designs && item.Designs.length > 0;
                    const hasImplementations = hasDesigns && item.Designs.some(d => d.Implementations && d.Implementations.length > 0);
                    switch (wipStatusFilter) {
                        case 'missing-design': return item.RequirementID && !hasDesigns;
                        case 'missing-impl': return hasDesigns && item.Designs.some(d => !d.Implementations || d.Implementations.length === 0);
                        case 'missing-test': return hasImplementations && item.Designs.some(d => d.Implementations?.some(i => !i.TestCases || i.TestCases.length === 0));
                        case 'incomplete-chain':
                            const hasCompleteChain = item.RequirementID &&
                                hasDesigns &&
                                item.Designs.every(d => d.Implementations && d.Implementations.length > 0 &&
                                    d.Implementations.every(i => i.TestCases && i.TestCases.length > 0));
                            return !hasCompleteChain;
                        default: return true;
                    }
                });
            }
        }
        return filtered;
    }, [rawData, activeSearchTerm, activeSearchTargetType, isWipView, wipStatusFilter]);

    const baseDisplayRows = useMemo(() => (
        traceDirection === 'forward'
            ? generateForwardDisplayRows(filteredData)
            : generateBackwardDisplayRows(filteredData)
    ), [filteredData, traceDirection]);

    const processedRows = useMemo(() => {
        let processed = [...baseDisplayRows];
        if (sortConfig.key !== null) {
            const sortKeyInfo = Object.values(columnKeyMap).find(map => map.sortKey === sortConfig.key);
            if (sortKeyInfo) {
                const dataKey = sortKeyInfo.id;
                processed.sort((a, b) => {
                    const valA = a[dataKey]; const valB = b[dataKey];
                    const isANumber = typeof valA === 'number'; const isBNumber = typeof valB === 'number';
                    const isAValid = valA !== '-' && valA != null; const isBValid = valB !== '-' && valB != null;
                    if (!isAValid && !isBValid) return 0; if (!isAValid) return 1; if (!isBValid) return -1;
                    let comparison = 0;
                    if (isANumber && isBNumber) { comparison = valA - valB; }
                    else { comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase()); }
                    return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
                });
            }
        }
        if (groupByColumn !== 'none') {
            const groupKeyMap = { 'reqStatus': columnKeyMap.req.status, 'designStatus': columnKeyMap.design.status, 'testCaseStatus': columnKeyMap.test.status };
            const groupByKeyInData = groupKeyMap[groupByColumn] || groupByColumn;
            const groupedRows = []; let currentGroupValue = undefined; let groupCounter = 0;
            processed.sort((a, b) => {
                const vA = a[groupByKeyInData] || 'N/A'; const vB = b[groupByKeyInData] || 'N/A';
                if (vA === 'N/A' && vB !== 'N/A') return 1; if (vA !== 'N/A' && vB === 'N/A') return -1;
                return String(vA).toLowerCase().localeCompare(String(vB).toLowerCase());
            });
            processed.forEach((row, index) => {
                const rowGroupValue = row[groupByKeyInData] || 'N/A';
                if (index === 0 || rowGroupValue !== currentGroupValue) {
                    currentGroupValue = rowGroupValue;
                    groupedRows.push({ key: `gh-${groupByKeyInData}-${currentGroupValue}-${groupCounter++}`, type: 'groupHeader', groupValue: currentGroupValue, groupColumn: groupByColumn });
                }
                groupedRows.push({ ...row, type: 'data', key: row.key || `gd-${groupByKeyInData}-${index}-${Math.random()}`, isFirstReqRow: true, reqRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1, isFirstTestRow: true, testRowSpan: 1 });
            });
            processed = groupedRows;
        } else {
            processed = processed.map((row, index) => ({ ...row, type: 'data', key: row.key || `d-${index}-${Math.random()}` }));
        }
        processed = processed.map(row => {
            if (row.type === 'data' && isWipView) {
                const isUnlinkedForward = traceDirection === 'forward' && (row.designId === '-' || row.implId === '-' || row.testCaseId === '-');
                const isUnlinkedBackward = traceDirection === 'backward' && (row.implId === '-' || row.designId === '-' || row.reqId === '-');
                return { ...row, isUnlinked: isUnlinkedForward || isUnlinkedBackward };
            } return row;
        });
        if (isWipView && showUnlinkedOnly) {
            if (groupByColumn !== 'none') {
                const finalGroupedRows = []; let currentHeader = null; let groupHasUnlinked = false;
                for (const row of processed) {
                    if (row.type === 'groupHeader') {
                        if (currentHeader && groupHasUnlinked) { finalGroupedRows.push(currentHeader); }
                        currentHeader = row; groupHasUnlinked = false;
                    } else if (row.type === 'data' && row.isUnlinked) {
                        finalGroupedRows.push(row); groupHasUnlinked = true;
                    }
                }
                if (currentHeader && groupHasUnlinked) { finalGroupedRows.push(currentHeader); }
                processed = finalGroupedRows;
            } else {
                processed = processed.filter(row => row.type !== 'data' || row.isUnlinked);
            }
        }
        return processed;
    }, [baseDisplayRows, sortConfig, groupByColumn, isWipView, traceDirection, showUnlinkedOnly]);

    const getDynamicColumnOrder = useCallback((direction) => (
        direction === 'forward' ? ['req', 'design', 'impl', 'test'] : ['test', 'impl', 'design', 'req']
    ), []);
    const columnOrder = useMemo(() => getDynamicColumnOrder(traceDirection), [traceDirection, getDynamicColumnOrder]);
    const visibleColumnCount = useMemo(() => Object.values(visibleColumns).filter(Boolean).length, [visibleColumns]);

    useEffect(() => {
        setIsFiltering(!!activeSearchTerm || (isWipView && (wipStatusFilter !== 'all' || showUnlinkedOnly)));
    }, [activeSearchTerm, isWipView, wipStatusFilter, showUnlinkedOnly]);

    // --- Event Handlers ---
    const handleSearchTermChange = useCallback((event) => { setSearchTerm(event.target.value); }, []);
    const handleTargetTypeChange = useCallback((event) => { setSearchTargetType(event.target.value); }, []);
    const applySearch = useCallback(() => { setActiveSearchTerm(searchTerm); setActiveSearchTargetType(searchTargetType); }, [searchTerm, searchTargetType]);
    const clearSearch = useCallback(() => { setSearchTerm(''); setSearchTargetType('req'); setActiveSearchTerm(''); setActiveSearchTargetType('req'); if (isWipView) { setWipStatusFilter('all'); setShowUnlinkedOnly(false); } }, [isWipView]);
    const handleColumnVisibilityChange = useCallback((event) => { const { name, checked } = event.target; setVisibleColumns(prev => ({ ...prev, [name]: checked })); }, []);
    const handleGroupByChange = useCallback((event) => { setGroupByColumn(event.target.value); }, []);
    const handleUnlinkedFilterChange = useCallback((event) => { setShowUnlinkedOnly(event.target.checked); }, []);
    const handleWipStatusFilterChange = useCallback((event) => { setWipStatusFilter(event.target.value); }, []);
    const requestSort = useCallback((key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); }, [sortConfig]);
    const handleDirectionChange = useCallback((direction) => { setTraceDirection(direction); }, []);
    const handleDensityChange = useCallback((density) => { setTableDensity(density); }, []);
    const handleShowDetailsChange = useCallback((event) => { setShowCellDetails(event.target.checked); }, []);
    const handleResetViewOptions = useCallback(() => {
        setTraceDirection(defaultViewOptions.direction); setGroupByColumn(defaultViewOptions.groupBy); setVisibleColumns(defaultViewOptions.columns);
        setTableDensity(defaultViewOptions.density); setShowCellDetails(defaultViewOptions.details); setSortConfig(defaultViewOptions.sort);
    }, [defaultViewOptions]);
    const toggleControlsCollapse = useCallback(() => { setIsControlsCollapsed(prev => !prev); }, []);


    // --- Render Functions ---
    const renderWipSummary = () => {
        if (!isWipView || !processedRows || processedRows.length === 0) return null;
        const dataRows = processedRows.filter(row => row.type === 'data');
        if (dataRows.length === 0 && !isFiltering) {
            if (rawData?.length === 0) {
                return (<div className="TRACE-wip-summary"> <div className="TRACE-wip-stat TRACE-success"> <div className="TRACE-wip-stat-value">100%</div> <div className="TRACE-wip-stat-label">Complete</div> <small>(No WIP items found)</small> </div> </div>);
            } return null;
        }
        const totalItems = dataRows.length; const totalUnlinkedItems = dataRows.filter(row => row.isUnlinked).length;
        const percentageComplete = totalItems > 0 ? Math.round(((totalItems - totalUnlinkedItems) / totalItems) * 100) : 100;
        return (
            <div className="TRACE-wip-summary">
                <div className="TRACE-wip-stat"> <div className="TRACE-wip-stat-value">{totalItems}</div> <div className="TRACE-wip-stat-label">Displayed Items</div> </div>
                <div className={`TRACE-wip-stat ${totalUnlinkedItems > 0 ? 'TRACE-warning' : 'TRACE-success'}`}> <div className="TRACE-wip-stat-value">{totalUnlinkedItems}</div> <div className="TRACE-wip-stat-label">Unlinked</div> </div>
                <div className={`TRACE-wip-stat ${percentageComplete < 70 ? 'TRACE-warning' : (percentageComplete < 100 ? 'TRACE-neutral' : 'TRACE-success')}`}> <div className="TRACE-wip-stat-value">{percentageComplete}%</div> <div className="TRACE-wip-stat-label">Linked</div> </div>
            </div>);
    };

    const renderTableHeaders = () => {
        return (<tr> {columnOrder.map(colKey => { if (!visibleColumns[colKey]) return null; const columnConfig = columnKeyMap[colKey]; const isSortable = columnConfig && columnConfig.sortKey; const isActiveSortCol = sortConfig.key === columnConfig?.sortKey; return (<th key={colKey} className={`TRACE-th-${colKey} ${isSortable ? 'TRACE-sortable' : ''} ${isActiveSortCol ? 'TRACE-sorted' : ''}`} onClick={() => isSortable && requestSort(columnConfig.sortKey)} title={isSortable ? `Click to sort by ${headerLabels[colKey]}` : headerLabels[colKey]}> {headerLabels[colKey]} {isSortable && (<span className="TRACE-sort-icon"> {isActiveSortCol ? (sortConfig.direction === 'ascending' ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />) : <FontAwesomeIcon icon={faSort} />} </span>)} </th>); })} </tr>);
    };

    const renderCellContent = (row, colKey) => {
        const cfg = columnKeyMap[colKey]; if (!cfg) return <span className="TRACE-placeholder">-</span>; const id = row[cfg.id]; const name = row[cfg.name]; const status = cfg.status ? row[cfg.status] : undefined;
        if (id === "-" || id == null) { return <span className="TRACE-placeholder">-</span>; } let prefix = ''; if (colKey === 'req') prefix = 'REQ-'; else if (colKey === 'design') prefix = 'DE-'; else if (colKey === 'impl') prefix = 'IMP-'; else if (colKey === 'test') prefix = 'TC-';
        let displayName = ''; if (showCellDetails) { if (colKey === 'impl') { displayName = name && name !== 'N/A' ? name : ''; } else { const defaultNamePattern = `${colKey.charAt(0).toUpperCase() + colKey.slice(1)} ${id}`; displayName = name && name !== defaultNamePattern && name !== '-' ? name : ''; } }
        const renderStatusBadge = (st) => { if (!st || st === "-") return null; let statusClass = 'TRACE-status-neutral'; const lowerStatus = String(st).toLowerCase(); if (['approved', 'passed', 'complete', 'verified', 'validated', 'baseline', 'done', 'closed'].includes(lowerStatus)) { statusClass = 'TRACE-status-positive'; } else if (['rejected', 'failed', 'error', 'blocked', 'cancelled', 'invalid'].includes(lowerStatus)) { statusClass = 'TRACE-status-negative'; } return (<span className={`TRACE-status-badge ${statusClass}`}>{st}</span>); };
        return (<> <div className="TRACE-item-id">{`${prefix}${id}`}</div> {displayName && <div className="TRACE-item-name">{displayName}</div>} {showCellDetails && status !== undefined && renderStatusBadge(status)}
            {showActionButtons && id !== "-" && (<div className="TRACE-inline-actions">
                {colKey === 'req' && (<> <button onClick={() => navigate(`/ViewEditReq?requirement_id=${id}`)} title={`View ${prefix}${id}`} className="TRACE-action-button TRACE-action-view"><FontAwesomeIcon icon={faEye} /></button> <button onClick={() => navigate(`/UpdateRequirement?project_id=${projectId}&requirement_id=${id}`)} title={`Edit ${prefix}${id}`} className="TRACE-action-button TRACE-action-edit"><FontAwesomeIcon icon={faPen} /></button> </>)}
                {colKey === 'design' && (<> <button onClick={() => navigate(`/ViewDesign?project_id=${projectId}&design_id=${id}`)} title={`View ${prefix}${id}`} className="TRACE-action-button TRACE-action-view"><FontAwesomeIcon icon={faEye} /></button> <button onClick={() => navigate(`/UpdateDesign?project_id=${projectId}&design_id=${id}`)} title={`Edit ${prefix}${id}`} className="TRACE-action-button TRACE-action-edit"><FontAwesomeIcon icon={faPen} /></button> </>)}
                {colKey === 'impl' && (<span className="TRACE-placeholder" style={{ fontSize: '0.8em', color: 'var(--trace-text-light)' }}></span>)}
                {colKey === 'test' && (<> <button className="TRACE-action-button TRACE-action-view" onClick={() => navigate(`/TestcaseDetail?testcase_id=${id}&project_id=${projectId}`, { state: { testcase: { testcase_id: id, testcase_name: name, testcase_status: status, project_id: projectId }, projectId } })} title={`View ${prefix}${id}`}><FontAwesomeIcon icon={faEye} /></button> <button className="TRACE-action-button TRACE-action-edit" onClick={() => navigate(`/UpdateTestcase?testcase_id=${id}&project_id=${projectId}`)} title={`Edit ${prefix}${id}`}><FontAwesomeIcon icon={faPen} /></button> </>)}
            </div>)} </>);
    };

    const renderTableBody = () => {
        if (!processedRows || processedRows.length === 0) { return (<tr> <td colSpan={visibleColumnCount || 1} className="TRACE-no-data"> {isFiltering ? "No items match the current filters." : (rawData?.length === 0 ? "No traceability data found for this project." : "No data available for the current view.")} </td> </tr>); }
        const getRowSpanValue = (span) => (span > 0 ? span : 1);
        return processedRows.map((row) => {
            if (row.type === 'groupHeader') { let groupLabel = columnKeyMap[row.groupColumn]?.label || 'Group'; return (<tr key={row.key} className="TRACE-group-header"> <td colSpan={visibleColumnCount || 1}> <FontAwesomeIcon icon={faLayerGroup} className="TRACE-group-icon" /> {groupLabel}: <strong>{row.groupValue || 'N/A'}</strong> </td> </tr>); }
            const rowClasses = [`TRACE-density-${tableDensity}`, row.isUnlinked ? 'TRACE-unlinked' : '',].filter(Boolean).join(' ');
            const useRowSpanning = groupByColumn === 'none';
            return (<tr key={row.key} className={rowClasses}> {columnOrder.map(colKey => { if (!visibleColumns[colKey]) return null; let shouldRenderCell = true; let rowSpan = 1; if (useRowSpanning) { if (colKey === 'req' && !row.isFirstReqRow) shouldRenderCell = false; else if (colKey === 'design' && !row.isFirstDesignRow) shouldRenderCell = false; else if (colKey === 'impl' && !row.isFirstImplRow) shouldRenderCell = false; else if (colKey === 'test' && !row.isFirstTestRow) shouldRenderCell = false; if (shouldRenderCell) { if (colKey === 'req') rowSpan = getRowSpanValue(row.reqRowSpan); else if (colKey === 'design') rowSpan = getRowSpanValue(row.designRowSpan); else if (colKey === 'impl') rowSpan = getRowSpanValue(row.implRowSpan); else if (colKey === 'test') rowSpan = getRowSpanValue(row.testRowSpan); } } if (shouldRenderCell) { const cellClasses = `TRACE-cell TRACE-cell-${colKey}`; return (<td key={colKey} rowSpan={rowSpan} className={cellClasses}> {renderCellContent(row, colKey)} </td>); } return null; })} </tr>);
        });
    };

    const renderControlsArea = () => {
        return (
            <div className={`TRACE-controls-area ${isControlsCollapsed ? 'TRACE-controls-collapsed' : ''}`}>
                <div className="TRACE-controls-header" onClick={toggleControlsCollapse} role="button" tabIndex={0} aria-expanded={!isControlsCollapsed}>
                    <h3 className="TRACE-controls-title"> <FontAwesomeIcon icon={faSlidersH} /> Controls & Options </h3>
                    <button onClick={(e) => { e.stopPropagation(); toggleControlsCollapse(); }} className="TRACE-collapse-button" title={isControlsCollapsed ? 'Expand Controls' : 'Collapse Controls'} aria-expanded={!isControlsCollapsed}> <FontAwesomeIcon icon={isControlsCollapsed ? faChevronDown : faChevronUp} /> <span>{isControlsCollapsed ? 'Show' : 'Hide'}</span> </button>
                </div>
                <div className="TRACE-controls-content">
                    <div className="TRACE-control-card"> <div className="TRACE-control-group TRACE-search-group"> <h4 className="TRACE-control-group-title"><FontAwesomeIcon icon={faSearch} /> Search</h4> <div className="TRACE-control-row"> <select name="searchTargetType" value={searchTargetType} onChange={handleTargetTypeChange} aria-label="Search target type" className="TRACE-select"> <option value="req">Requirement</option> <option value="design">Design</option> <option value="impl">Code</option> <option value="test">Test Case</option> </select> <input type="text" value={searchTerm} onChange={handleSearchTermChange} placeholder="Search ID or Name..." className="TRACE-input" aria-label="Search term" /> <button onClick={applySearch} className="TRACE-button" title="Apply search"><FontAwesomeIcon icon={faFilter} /> Apply</button> <button onClick={clearSearch} className="TRACE-button TRACE-button-clear" title="Clear search & filters"><FontAwesomeIcon icon={faTimes} /> Clear</button> </div> </div> </div>
                    {isWipView && (<div className="TRACE-control-card"> <div className="TRACE-control-group TRACE-wip-controls-group"> <h4 className="TRACE-control-group-title"><FontAwesomeIcon icon={faFilter} /> Work in progress Filter</h4> <div className="TRACE-control-row"> <select value={wipStatusFilter} onChange={handleWipStatusFilterChange} className="TRACE-select" aria-label="Filter WIP status"> <option value="all">All Items</option> <option value="missing-design">Req - Missing Design</option> <option value="missing-impl">Design - Missing Impl</option> <option value="missing-test">Impl - Missing Test</option> <option value="incomplete-chain">Any Incomplete Chain</option> </select> <label className="TRACE-checkbox-label TRACE-unlinked-filter-label"> <input type="checkbox" checked={showUnlinkedOnly} onChange={handleUnlinkedFilterChange} /> Show Unlinked Only </label> </div> </div> </div>)}
                    <div className="TRACE-control-card"> <div className="TRACE-control-group TRACE-view-options-group"> <div className="TRACE-view-options-header"> <h4 className="TRACE-control-group-title"><FontAwesomeIcon icon={faEye} /> View Options</h4> <button onClick={handleResetViewOptions} className="TRACE-button TRACE-button-reset" title="Reset all view options to default"> <FontAwesomeIcon icon={faTimes} /> Reset View </button> </div>
                        <div className="TRACE-view-options-subgroup"> <div className="TRACE-control-row"> <div className="TRACE-option-item"> <label className="TRACE-control-label" title="Change trace direction"> <FontAwesomeIcon icon={faArrowsLeftRight} className="TRACE-option-label-icon" /> Direction: </label> <button onClick={() => handleDirectionChange('forward')} disabled={traceDirection === 'forward'} className={`TRACE-button TRACE-button-direction ${traceDirection === 'forward' ? 'active' : ''}`} title="Forward (REQ -> TEST)"><FontAwesomeIcon icon={faChevronRight} /> Fwd</button> <button onClick={() => handleDirectionChange('backward')} disabled={traceDirection === 'backward'} className={`TRACE-button TRACE-button-direction ${traceDirection === 'backward' ? 'active' : ''}`} title="Backward (TEST -> REQ)"><FontAwesomeIcon icon={faChevronRight} rotation={180} /> Bwd</button> </div> </div> </div>
                        <div className="TRACE-view-options-subgroup"> <div className="TRACE-control-row TRACE-visibility-row"> <div className="TRACE-option-item TRACE-option-item-columns"> <label className="TRACE-control-label" title="Show or hide columns"> <FontAwesomeIcon icon={faColumns} className="TRACE-option-label-icon" /> Columns: </label> <div className="TRACE-checkbox-group"> {['req', 'design', 'impl', 'test'].map(colKey => (<label key={colKey} className="TRACE-checkbox-label" title={`Show/Hide ${headerLabels[colKey]}`}> <input type="checkbox" name={colKey} checked={visibleColumns[colKey]} onChange={handleColumnVisibilityChange} className="TRACE-checkbox" /> {headerLabels[colKey]} </label>))} </div> </div> <div className="TRACE-option-item"> <label className="TRACE-checkbox-label" title="Show/Hide cell details (Name, Status)"> </label> </div> </div>
                        </div>
                    </div>
                    </div>
                </div> {/* End TRACE-controls-content */}
            </div>
        );
    }

    // ----- JSX Return for RenderTraceabilityTable -----
    return (
        <div className={`TRACE-table-section ${isWipView ? 'TRACE-wip-section' : 'TRACE-baseline-section'}`}>
            {renderControlsArea()}
            {isWipView && renderWipSummary()}
            <div className="TRACE-table-container">
                <table className="TRACE-table">
                    <thead>{renderTableHeaders()}</thead>
                    <tbody>{renderTableBody()}</tbody>
                </table>
            </div>
        </div>
    );
};


// ========================================================================
// Main TraceabilityPage Component
// Handles overall page structure, data fetching, tabs, and tutorial.
// ========================================================================
const TraceabilityPage = () => {
    // --- State ---
    const [baselineData, setBaselineData] = useState([]);
    const [nonBaselineData, setNonBaselineData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [activeTab, setActiveTab] = useState('baseline');
    const [runTutorial, setRunTutorial] = useState(false);

    // --- Hooks ---
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const isMountedRef = useRef(true);

    // --- Event Handlers ---
    const handleRestartTutorial = () => { setRunTutorial(true); };
    const handleJoyrideCallback = (data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTutorial(false);
            localStorage.setItem('traceabilityPageTutorialShown', 'true');
        }
    };

    // --- Data Fetching ---
    const fetchData = useCallback(async (refresh = false) => {
        if (!projectId) {
            setFetchError("Project ID is missing in the URL."); setIsLoading(false); return;
        }
        if (refresh) { setIsRefreshing(true); } else { setIsLoading(true); } setFetchError(null);
        const projectDetailsEndpoint = `http://localhost:3001/project/${projectId}`;
        const baselineEndpoint = `http://localhost:3001/traceability`;
        const nonBaselineEndpoint = `http://localhost:3001/not-linked-non-baseline`;
        try {
            const results = await Promise.allSettled([axios.get(projectDetailsEndpoint), axios.get(baselineEndpoint, { params: { projectId } }), axios.get(nonBaselineEndpoint, { params: { projectId } })]);
            if (!isMountedRef.current) return; let currentFetchError = null;
            if (results[0].status === 'fulfilled' && results[0].value.data?.project_name) { setProjectName(results[0].value.data.project_name); }
            else { setProjectName(`Project ${projectId}`); if (results[0].status === 'rejected') { console.error("Project details fetch error:", results[0].reason); currentFetchError = "Failed to load project details."; } }
            if (results[1].status === 'fulfilled' && Array.isArray(results[1].value.data)) { setBaselineData(results[1].value.data); }
            else { setBaselineData([]); const errorMsg = results[1].reason?.response?.data?.message || results[1].reason?.message || "Failed to load Traceability Record data"; console.error("Baseline fetch error:", results[1].reason); currentFetchError = currentFetchError ? `${currentFetchError} & Record` : errorMsg; }
            if (results[2].status === 'fulfilled' && Array.isArray(results[2].value.data)) { setNonBaselineData(results[2].value.data); }
            else { setNonBaselineData([]); const errorMsg = results[2].reason?.response?.data?.message || results[2].reason?.message || "Failed to load Work In Progress data"; console.error("WIP fetch error:", results[2].reason); currentFetchError = currentFetchError ? `${currentFetchError} & WIP` : errorMsg; }
            setFetchError(currentFetchError);
        } catch (err) { if (isMountedRef.current) { console.error("General fetch error:", err); setFetchError(`A network or workspace error occurred: ${err.message}. Please check connection or try again.`); setProjectName(`Project ${projectId}`); setBaselineData([]); setNonBaselineData([]); } }
        finally { if (isMountedRef.current) { setIsLoading(false); setIsRefreshing(false); } }
    }, [projectId]);

    // --- Effects ---
    useEffect(() => {
        isMountedRef.current = true; fetchData();
        const tutorialShown = localStorage.getItem('traceabilityPageTutorialShown');
        if (!tutorialShown) { const timer = setTimeout(() => { if (isMountedRef.current) { setRunTutorial(true); } }, 700); return () => clearTimeout(timer); }
        return () => { isMountedRef.current = false; };
    }, [fetchData]);

    // --- Conditional Rendering ---
    if (isLoading && !isRefreshing) { return (<div className="TRACE-loading"><FontAwesomeIcon icon={faSpinner} spin size="3x" /><p>Loading Traceability Data...</p></div>); }
    if (!projectId) { return (<div className="TRACE-error critical"><FontAwesomeIcon icon={faExclamationTriangle} /> Error: Project ID is missing. Cannot load traceability page. Please ensure you accessed this page via a valid project link.</div>); }

    // --- JSX Return ---
    return (
        <div className="TRACE-page-wrapper">
            {/* --- Tutorial Component --- */}
            <Joyride
                steps={tutorialSteps} run={runTutorial} continuous showProgress showSkipButton
                styles={{ options: { zIndex: 10000, arrowColor: 'var(--trace-primary)', backgroundColor: 'var(--trace-bg-primary)', primaryColor: 'var(--trace-primary)', textColor: 'var(--trace-text-primary)' }, tooltipContainer: { textAlign: "left" }, buttonNext: { backgroundColor: "var(--trace-primary)" }, buttonBack: { marginRight: 10 } }}
                callback={handleJoyrideCallback}
            />

            {/* --- Page Header --- */}
            <div className="TRACE-enterprise-header">
                <div className="TRACE-header-top">
                    <div className="TRACE-project-info">
                        <div className="TRACE-project-breadcrumb"> <FontAwesomeIcon icon={faHome} /> / <span onClick={() => navigate('/projects')} className="TRACE-breadcrumb-link">Projects</span> / <span>{projectName || `Project ${projectId}`}</span> </div>
                        <div className="TRACE-project-title">
                            <h1 className="TRACE-project-name">{projectName || `Project ${projectId}`}</h1>
                            <span className="TRACE-badge"><FontAwesomeIcon icon={faLink} /> TRACEABILITY</span>
                        </div>
                    </div>
                    <div className="TRACE-header-actions">
                        <button onClick={handleRestartTutorial} className="TRACE-tutorial-button" title="Show Tutorial" style={{ color: 'white', fontSize: 'var(--trace-font-size-lg)' }}>
                            <FontAwesomeIcon icon={faQuestionCircle} />
                        </button>
                    </div>
                </div>

                {/* Tab Bar with Baseline Actions */}
                <div className="TRACE-header-tab-bar">
                    <div className={`TRACE-header-tab ${activeTab === 'baseline' ? 'TRACE-active' : ''}`} onClick={() => !isLoading && !isRefreshing && setActiveTab('baseline')} role="tab" aria-selected={activeTab === 'baseline'} tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isLoading && !isRefreshing && setActiveTab('baseline')}>
                        <FontAwesomeIcon icon={faTable} className="TRACE-tab-icon" /> Traceability Record 
                    </div>
                    <div className={`TRACE-header-tab ${activeTab === 'wip' ? 'TRACE-active' : ''}`} onClick={() => !isLoading && !isRefreshing && setActiveTab('wip')} role="tab" aria-selected={activeTab === 'wip'} tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isLoading && !isRefreshing && setActiveTab('wip')}>
                        <FontAwesomeIcon icon={faProjectDiagram} className="TRACE-tab-icon" /> Work Product Tracking
                    </div>

                    {/* Spacer */}
                    <div style={{ marginLeft: 'auto' }}></div>

                    {/* Moved Baseline Actions Container */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 var(--trace-space-md)', gap: 'var(--trace-space-sm)' }}>
                        {activeTab === 'baseline' && !isLoading && !isRefreshing && (
                            <>
                                <button className="TRACE-action-button" onClick={() => navigate(`/createVerifyTrace?project_id=${projectId}`)} title="Create Verification"><FontAwesomeIcon icon={faPlus} /> Create Verification</button>
                                <button className="TRACE-action-button" onClick={() => navigate(`/viewVerifyTrace?project_id=${projectId}`)} title="View Verification"><FontAwesomeIcon icon={faEye} /> View Verification</button>
                                <button className="TRACE-action-button" onClick={() => navigate(`/setBaselineTrace?project_id=${projectId}`)} title="Set Baseline"><FontAwesomeIcon icon={faTable} /> Set Baseline</button>
                                <button className="TRACE-action-button" onClick={() => navigate(`/versionVerTrace?project_id=${projectId}`)} title="Baseline History"><FontAwesomeIcon icon={faHistory} /> Baseline History</button>
                                <button className="TRACE-action-button" onClick={() => navigate(`/currentBaselineTrace?project_id=${projectId}`)} title="Current Baseline"><FontAwesomeIcon icon={faCheckCircle} /> Current Baseline</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Main Content Area --- */}
            <div className="TRACE-main-content">
                {fetchError && !isLoading && !isRefreshing && (<div className="TRACE-warning"> <FontAwesomeIcon icon={faExclamationTriangle} /> Warning: {fetchError}. Some data might be missing or outdated. Try refreshing. </div>)}
                <div className="TRACE-tab-content">
                    {!isLoading && activeTab === 'baseline' && (<RenderTraceabilityTable key="baseline-table" rawData={baselineData} showActionButtons={true} projectId={projectId} isWipView={false} />)}
                    {!isLoading && activeTab === 'wip' && (<RenderTraceabilityTable key="wip-table" rawData={nonBaselineData} showActionButtons={false} projectId={projectId} isWipView={true} />)}
                </div>
            </div>
        </div>
    );
};

export default TraceabilityPage;