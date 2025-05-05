import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import ConfirmationModal from "./ConfirmationModal"; // ตรวจสอบว่า path ถูกต้อง
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPen, faTrash, faEye, faPlus, faPlayCircle, faCheckCircle,
    faHistory, faSearch, faTimes, faHome, faQuestionCircle,
    faTable, faListAlt, faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";
import Joyride, { STATUS } from 'react-joyride';
import Tippy from '@tippyjs/react'; // <--- เพิ่ม Tippy import
import 'tippy.js/dist/tippy.css'; // <--- เพิ่ม CSS พื้นฐานของ Tippy
// import 'tippy.js/themes/light.css'; // <-- หรือเลือก theme อื่นถ้าต้องการ
import "./testcase_css/TestcasePage.css";
// import './testcase_css/ConfirmationModal.css'; // Ensure this is imported if used

const TestcasePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- State (เหมือนเดิม) ---
    const [testCases, setTestCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [projectName, setProjectName] = useState("Project Name");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [filteredTestCases, setFilteredTestCases] = useState([]);
    const [activeTab, setActiveTab] = useState("testcases");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [testCaseToDeleteId, setTestCaseToDeleteId] = useState(null);
    const [procedureStatus, setProcedureStatus] = useState({});
    const [checkingProcedures, setCheckingProcedures] = useState(false);

    // --- Tutorial State (เหมือนเดิม) ---
    const [runTutorial, setRunTutorial] = useState(false);
    const [tutorialSteps] = useState([
        { target: '.testcase-create-button', content: 'เริ่มต้นด้วยการสร้าง Test Case ใหม่โดยคลิกที่ปุ่มนี้', placement: 'bottom', disableBeacon: true, },
        { target: '.testcase-table tbody tr:first-child .testcase-name-cell .warning-icon', content: 'สัญลักษณ์นี้แจ้งว่า Test Case ยังไม่มี Test Procedure กรุณาคลิกปุ่ม View (รูปตา) หรือ ID เพื่อเข้าไปเพิ่ม', placement: 'top', },
        { target: '.testcase-table tbody tr:first-child .testcase-view', content: 'คลิกเพื่อดูรายละเอียดของ Test Case และเพิ่ม Test Step', placement: 'left', },
        { target: '.testcase-table tbody tr:first-child .testcase-edit', content: 'คลิกเพื่อแก้ไข Test Case นี้', placement: 'left', },
        { target: '.testcase-table tbody tr:first-child .testcase-delete', content: 'คลิกเพื่อลบ Test Case', placement: 'left', },
        { target: '.testcase-tab-bar .testcase-tab:nth-child(2)', content: 'คลิกที่นี่เพื่อสร้างงานส่ง Test Case ให้ทีมตรวจสอบ (Verification)', placement: 'bottom', },
        { target: '.testcase-tab-bar .testcase-tab:nth-child(3)', content: 'ดูรายการ Test Case ที่รอการตรวจสอบหรือตรวจสอบแล้วที่แท็บนี้', placement: 'bottom', },
        { target: '.testcase-tab-bar .testcase-tab:nth-child(4)', content: 'จัดการเวอร์ชันหลัก (Baseline) ของ Test Case ที่ผ่านการตรวจสอบแล้ว', placement: 'bottom', },
        { target: '.testcase-execution-button', content: 'ไปที่หน้า Test Execution เพื่อเริ่มหรือดูผลการทดสอบ Test Case', placement: 'bottom', },
    ]);

    const handleRestartTutorial = () => {
        setRunTutorial(true);
    };

    // --- Function checkProcedureStatusForCases (เหมือนเดิม) ---
    const checkProcedureStatusForCases = async (cases) => {
        if (!cases || cases.length === 0) {
            setProcedureStatus({});
            return;
        }
        setCheckingProcedures(true);
        const statusMap = {};
        const promises = cases.map(async (tc) => {
            try {
                await axios.get(`http://localhost:3001/api/test-procedures?testcase_id=${tc.testcase_id}`);
                statusMap[tc.testcase_id] = true;
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    statusMap[tc.testcase_id] = false;
                } else {
                    console.error(`Error checking procedures for TC-${tc.testcase_id}:`, err);
                    // Consider setting a specific error state, e.g., statusMap[tc.testcase_id] = 'error';
                }
            }
        });

        try {
            await Promise.all(promises);
            setProcedureStatus(statusMap);
        } catch (batchError) {
            console.error("Error during batch procedure check:", batchError);
        } finally {
            setCheckingProcedures(false);
        }
    };

    // --- useEffect for Tutorial (เหมือนเดิม) ---
    useEffect(() => {
        const tutorialShown = localStorage.getItem('testcasePageTutorialShown');
        if (!tutorialShown) {
            const timer = setTimeout(() => {
                setRunTutorial(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []);

    // --- useEffect for Initial Data Fetch ---
    useEffect(() => {
        fetchProjectDetails();
        fetchTestCases();
        // Removed eslint-disable-line
    }, [projectId]); // <--- ลบ eslint-disable-line ออกแล้ว

    // --- useEffect for Filtering (เหมือนเดิม) ---
    useEffect(() => {
        if (!testCases || !Array.isArray(testCases)) {
            setFilteredTestCases([]);
            return;
        }
        let filtered = testCases.filter((test) => {
            const nameMatch = (test.testcase_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            const idMatch = `TC-${test.testcase_id.toString().padStart(3, '0')}`.toLowerCase().includes(searchQuery.toLowerCase());
            return nameMatch || idMatch;
        });
        if (statusFilter) {
            filtered = filtered.filter(test => test.testcase_status === statusFilter);
        }
        if (priorityFilter) {
            filtered = filtered.filter(test => test.testcase_priority === priorityFilter);
        }
        setFilteredTestCases(filtered);
    }, [searchQuery, testCases, statusFilter, priorityFilter]);

    // --- Helper Functions (fetchProjectDetails, fetchTestCases, formatDate - เหมือนเดิม) ---
    const fetchProjectDetails = async () => {
        if (!projectId) return;
        try {
            const response = await axios.get(`http://localhost:3001/project/${projectId}`);
            setProjectName(response.data.project_name);
        } catch (error) {
            console.error("Error fetching project details:", error);
        }
    };

    const fetchTestCases = async () => {
        if (!projectId) return;
        setLoading(true);
        setError("");
        setProcedureStatus({});
        try {
            const response = await axios.get(`http://localhost:3001/testcases?project_id=${projectId}`);
            const fetchedTestCases = response.data || [];
            setTestCases(fetchedTestCases);
            if (fetchedTestCases.length > 0) {
                await checkProcedureStatusForCases(fetchedTestCases);
            } else {
                setProcedureStatus({});
            }
        } catch (error) {
            console.error("Error fetching test cases:", error);
            setError("Failed to load test cases. Please check the connection or try again.");
            setTestCases([]);
            setProcedureStatus({});
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "Invalid date";
            return date.toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
            });
        } catch (error) {
            console.error("Date formatting error:", error);
            return "Date error";
        }
    };

    // --- Navigation Handlers (เหมือนเดิม) ---
    const handleCreateTestcase = () => navigate(`/CreateTestcase?project_id=${projectId}`);
    const handleTestExecution = () => navigate(`/ExecutionList?project_id=${projectId}`);
    const handleCreateVeri = () => navigate(`/CreateVeriTest?project_id=${projectId}`);
    const handleVerilist = () => navigate(`/VeriTestcase?project_id=${projectId}`);
    const handleBaselineTest = () => navigate(`/TestcaseBaseline?project_id=${projectId}`);

    // --- Delete Handlers (เหมือนเดิม) ---
    const handleDeleteTestcase = (id) => {
        setTestCaseToDeleteId(id);
        setIsModalOpen(true);
    };
    const closeModal = () => {
        setIsModalOpen(false);
        setTestCaseToDeleteId(null);
    };
    const confirmDeletion = async () => {
        if (!testCaseToDeleteId) return;
        const idToDelete = testCaseToDeleteId;
        closeModal();
        try {
            await axios.delete(`http://localhost:3001/testcases/${idToDelete}`);
            setTestCases(prev => prev.filter(test => test.testcase_id !== idToDelete));
            setProcedureStatus(prev => {
                const newStatus = { ...prev };
                delete newStatus[idToDelete];
                return newStatus;
            });
            toast.success("Test Case deleted successfully.", { autoClose: 3000 });
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("ลบ Test Case ไม่สำเร็จ ลองใหม่อีกครั้ง", { autoClose: 5000 });
        }
    };

    // --- Styling Helpers (getPriorityClass, getStatusClass - เหมือนเดิม) ---
    const getPriorityClass = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'priority-high';
            case 'medium': return 'priority-medium';
            case 'low': return 'priority-low';
            default: return 'priority-notset';
        }
    };
    const getStatusClass = (status) => {
        switch (status) {
            case 'VERIFIED': return 'status-verified';
            case 'VALIDATED': return 'status-validated';
            case 'WORKING': return 'status-working';
            case 'WAITING FOR VERIFICATION': return 'status-waiting-ver';
            case 'WAITING FOR VALIDATION': return 'status-val-inprogress';
            case 'BASELINE': return 'status-baseline';
            default: return 'status-notset';
        }
    };


    // --- JSX Return ---
    return (
        <div className="testcase-container">
            <Joyride
                steps={tutorialSteps}
                run={runTutorial}
                continuous
                showProgress
                showSkipButton
                styles={{ options: { zIndex: 10000 } }}
                callback={(data) => {
                    const { status } = data;
                    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
                        setRunTutorial(false);
                        localStorage.setItem('testcasePageTutorialShown', 'true');
                    }
                }}
            />

            <div className="testcase-header">
                <div className="testcase-header-top">
                    <div className="testcase-project-info">
                        <div className="testcase-breadcrumb">
                            <FontAwesomeIcon icon={faHome} />
                            <span className="testcase-breadcrumb-divider">/</span>
                             Projects
                            <span className="testcase-breadcrumb-divider">/</span>
                            {projectName}
                        </div>
                        <div className="testcase-project-title">
                            <h1 className="testcase-project-name">{projectName || "Project"}</h1>
                            <span className="testcase-badge">TEST CASE MANAGEMENT</span>
                             {/* --- Tutorial Button ใช้ Tippy --- */}
                             <Tippy content="Show Tutorial" placement="bottom">
                                <button
                                    onClick={handleRestartTutorial}
                                    className="tutorial-help-button tutorial-help-button-corner"
                                    // title ถูกลบออก
                                    style={{
                                        marginLeft: '15px', border: 'none', color: '#fff',
                                        padding: '8px 12px', fontSize: '1.7em', cursor: 'pointer',
                                        transition: 'transform 0.2s ease', verticalAlign: 'middle'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <FontAwesomeIcon icon={faQuestionCircle} />
                                </button>
                             </Tippy>
                        </div>
                    </div>
                    <div className="testcase-actions">
                        {/* --- Test Execution Button ใช้ Tippy --- */}
                            <button className="testcase-execution-button" onClick={handleTestExecution}>
                                <FontAwesomeIcon icon={faPlayCircle} style={{ marginRight: '8px' }} />
                                 Test Execution
                            </button>
                    </div>
                </div>
                {/* Tab bar */}
                <div className="testcase-tab-bar">
                    <div className={`testcase-tab ${activeTab === 'testcases' ? 'active' : ''}`} onClick={() => setActiveTab('testcases')}>
                        <FontAwesomeIcon icon={faTable} className="testcase-tab-icon" /> Test Cases
                    </div>
                    
                         <div className={`testcase-tab ${activeTab === 'createVeri' ? 'active' : ''}`} onClick={handleCreateVeri}>
                             <FontAwesomeIcon icon={faPlus} className="testcase-tab-icon" /> Create Verification
                         </div>

                     
                         <div className={`testcase-tab ${activeTab === 'viewVeri' ? 'active' : ''}`} onClick={handleVerilist}>
                             <FontAwesomeIcon icon={faCheckCircle} className="testcase-tab-icon" /> View Verification
                         </div>

 
                         <div className={`testcase-tab ${activeTab === 'baseline' ? 'active' : ''}`} onClick={handleBaselineTest}>
                             <FontAwesomeIcon icon={faHistory} className="testcase-tab-icon" /> Baseline
                         </div>
                </div>
            </div>

            <div className="testcase-toolbar">
                <div className="testcase-toolbar-left">
                    <div className="testcase-search-container">
                        <FontAwesomeIcon icon={faSearch} className="testcase-search-icon" />
                        <input
                            type="text" className="testcase-search-input"
                            placeholder="Search test cases by ID or name..."
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        />
                         {searchQuery && (
                            // --- Clear Search Button ใช้ Tippy ---
                            <Tippy content="Clear search" placement="top">
                                <button className="testcase-clear-search-btn" onClick={() => setSearchQuery('')} >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </Tippy>
                         )}
                    </div>
                    {/* --- Filters (Dropdowns ไม่ต้องใช้ Tippy) --- */}
                    <select className="testcase-filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                        <option value="">Filter by Priority</option> <option value="High">High</option> <option value="Medium">Medium</option> <option value="Low">Low</option>
                    </select>
                    <select className="testcase-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">Filter by Status</option> <option value="VERIFIED">Verified</option> <option value="VALIDATED">Validated</option> <option value="WORKING">Working</option> <option value="WAITING FOR VERIFICATION">Waiting for Verification</option> <option value="WAITING FOR VALIDATION">Waiting for Validation</option> <option value="BASELINE">Baseline</option>
                    </select>
                    {/* --- Create Button (ไม่ต้องใช้ Tippy ถ้าข้อความชัดเจน) --- */}
                    <button className="testcase-create-button" onClick={handleCreateTestcase}>
                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} /> Add Test Case
                    </button>
                </div>
            </div>

            <div className="testcase-content-card">
                <div className="testcase-card-header">
                    <div>
                        <h2 className="testcase-card-title">
                            <FontAwesomeIcon icon={faTable} className="testcase-card-icon" /> Test Cases
                            {checkingProcedures && <span className="checking-procedures-indicator">(Checking steps...)</span>}
                        </h2>
                        <p className="testcase-card-description">
                            Manage and track all test cases for this project
                        </p>
                    </div>
                </div>

                <div className="testcase-table-container">
                    {loading ? (
                        <div className="testcase-loading-state">
                            <div className="testcase-loading-spinner"></div> <p>Loading test cases...</p>
                        </div>
                    ) : error ? (
                        <div className="testcase-error-message">{error}</div>
                    ) : filteredTestCases.length === 0 ? (
                        <div className="testcase-empty-state">
                            <FontAwesomeIcon icon={faListAlt} className="testcase-empty-icon" />
                            <p className="testcase-empty-text">
                                {testCases.length > 0 ? "No test cases match your current filters." : "No test cases found for this project."}
                            </p>
                            {testCases.length === 0 && (
                                <button className="testcase-empty-button" onClick={handleCreateTestcase}>
                                    <FontAwesomeIcon icon={faPlus} /> Add First Test Case
                                </button>
                            )}
                        </div>
                    ) : (
                        <table className="testcase-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Priority</th>
                                    <th>Test Completion Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTestCases.map((test) => (
                                    <tr key={test.testcase_id}>
                                        {/* --- Test Case ID Cell --- */}
                                        <td className="testcase-id-cell"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() =>
                                                navigate(`/TestcaseDetail?testcase_id=${test.testcase_id}&project_id=${projectId}`, {
                                                    state: { testcase: test },
                                                })
                                            }
                                        >
                                            TC-{test.testcase_id.toString().padStart(3, '0')}
                                        </td>

                                        {/* --- Title Cell --- */}
                                        <td className="testcase-name-cell">
                                            {test.testcase_name || 'N/A'}
                                            {/* --- Warning Icon ใช้ Tippy --- */}
                                            {procedureStatus[test.testcase_id] === false && (
                                                 <Tippy content="No test step found for this test case. Click View or ID to add." placement="top">
                                                    <span> {/* Tippy ต้องการ Child ที่เป็น Element */}
                                                        <FontAwesomeIcon
                                                            icon={faExclamationTriangle}
                                                            className="warning-icon"
                                                            style={{
                                                                marginLeft: '8px', color: '#ffcc00', fontSize: '0.9em', verticalAlign: 'middle'
                                                            }}
                                                            // title ถูกลบออก
                                                        />
                                                     </span>
                                                 </Tippy>
                                            )}
                                            {/* --- Spinner ใช้ Tippy --- */}
                                            {checkingProcedures && procedureStatus[test.testcase_id] === undefined && (
                                                <Tippy content="Checking procedures..." placement="top">
                                                     <span className="small-spinner" style={{ marginLeft: '8px' }}></span>
                                                 </Tippy>
                                            )}
                                        </td>

                                        {/* --- Priority Cell (เหมือนเดิม) --- */}
                                        <td className="testcase-priority-cell">
                                            <span className={`testcase-priority-badge ${getPriorityClass(test.testcase_priority)}`}>
                                                {test.testcase_priority || "Not set"}
                                            </span>
                                        </td>

                                        {/* --- Date Cell (เหมือนเดิม) --- */}
                                        <td className="testcase-date-cell">{formatDate(test.testcase_at)}</td>

                                        {/* --- Status Cell (เหมือนเดิม) --- */}
                                        <td className="testcase-status-cell">
                                            <span className={`status-button ${getStatusClass(test.testcase_status)}`}>
                                                <span className="status-dot"></span>
                                                {test.testcase_status || "Not set"}
                                            </span>
                                        </td>

                                        {/* --- Actions Cell ใช้ Tippy --- */}
                                        <td className="testcase-actions-cell">
                                            <div className="testcase-actions">
                                                 <Tippy content="View Details / Add Procedures" placement="top">
                                                    <button
                                                        className="testcase-view"
                                                        onClick={() =>
                                                            navigate(`/TestcaseDetail?testcase_id=${test.testcase_id}&project_id=${projectId}`, {
                                                                state: { testcase: test },
                                                            })
                                                        }
                                                        // title ถูกลบออก
                                                    >
                                                        <FontAwesomeIcon icon={faEye} className="testcase-icon" />
                                                    </button>
                                                 </Tippy>
                                                 <Tippy content="Edit Test Case" placement="top">
                                                    <button
                                                        className="testcase-edit"
                                                        onClick={() =>
                                                            navigate(`/UpdateTestcase?testcase_id=${test.testcase_id}&project_id=${projectId}`)
                                                        }
                                                        // title ถูกลบออก
                                                    >
                                                        <FontAwesomeIcon icon={faPen} className="testcase-icon" />
                                                    </button>
                                                </Tippy>
                                                 <Tippy content="Delete Test Case" placement="top">
                                                    <button
                                                        className="testcase-delete"
                                                        onClick={() => handleDeleteTestcase(test.testcase_id)}
                                                        // title ถูกลบออก
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="testcase-icon" />
                                                    </button>
                                                </Tippy>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            {/* Confirmation Modal (เหมือนเดิม) */}
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onConfirm={confirmDeletion}
                title="Confirm Deletion?"
                message="This Test Case will be permanently deleted, including any associated procedures. This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
};

export default TestcasePage;