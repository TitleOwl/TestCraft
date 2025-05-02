import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import ConfirmationModal from "./ConfirmationModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPen,
    faTrash,
    faEye,
    faPlus,
    faPlayCircle,
    faCheckCircle,
    faFileAlt, // Keep if used elsewhere, otherwise optional
    faHistory,
    faSearch,
    faTimes,
    // faSort, // Not used in current JSX
    // faFilter, // Not used in current JSX
    faHome,
    // faChevronRight, // Not used in current JSX
    faQuestionCircle, // For Tutorial
    faTable,
    faListAlt // For empty state
} from "@fortawesome/free-solid-svg-icons";
import Joyride, { STATUS } from 'react-joyride'; // <<< Added Joyride
import "./testcase_css/TestcasePage.css";
// import './testcase_css/ConfirmationModal.css'; // Ensure this is imported if used

const TestcasePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

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

    // --- Tutorial State ---
    const [runTutorial, setRunTutorial] = useState(false);
    const [tutorialSteps] = useState([
        {
            target: '.testcase-create-button',
            content: 'เริ่มต้นด้วยการสร้าง Test Case ใหม่โดยคลิกที่ปุ่มนี้',
            placement: 'bottom',
            disableBeacon: true,
        },
         {
            // Target the view button of the first row
            // Ensure table has data for this selector to work
            target: '.testcase-table tbody tr:first-child .testcase-view',
            content: 'คลิกเพื่อดูรายละเอียดของ Test Case และเพิ่ม Test Step',
            placement: 'left',
        },
        {
            // Target the edit button of the first row
            target: '.testcase-table tbody tr:first-child .testcase-edit',
            content: 'คลิกเพื่อแก้ไข Test Case นี้',
            placement: 'left',
        },
        {
            // Target the delete button of the first row
            target: '.testcase-table tbody tr:first-child .testcase-delete',
            content: 'คลิกเพื่อลบ Test Case',
            placement: 'left',
        },
        {
            // Target the Create Verification tab (assuming it's 2nd)
            target: '.testcase-tab-bar .testcase-tab:nth-child(2)',
            content: 'คลิกที่นี่เพื่อสร้างงานส่ง Test Case ให้ทีมตรวจสอบ (Verification)',
            placement: 'bottom',
        },
        {
            // Target the View Verification tab (assuming it's 3rd)
            target: '.testcase-tab-bar .testcase-tab:nth-child(3)',
            content: 'ดูรายการ Test Case ที่รอการตรวจสอบหรือตรวจสอบแล้วที่แท็บนี้',
            placement: 'bottom',
        },
        {
            // Target the Baseline tab (assuming it's 4th)
            target: '.testcase-tab-bar .testcase-tab:nth-child(4)',
            content: 'จัดการเวอร์ชันหลัก (Baseline) ของ Test Case ที่ผ่านการตรวจสอบแล้ว',
            placement: 'bottom',
        },
        {
          target: '.testcase-execution-button',
          content: 'ไปที่หน้า Test Execution เพื่อเริ่มหรือดูผลการทดสอบ Test Case',
          placement: 'bottom',
      },
    ]);

    const handleRestartTutorial = () => {
        setRunTutorial(true);
    };


    useEffect(() => {
        // Check if tutorial has been shown before
        const tutorialShown = localStorage.getItem('testcasePageTutorialShown');
        if (!tutorialShown) {
             const timer = setTimeout(() => {
                setRunTutorial(true); // Start tutorial on first visit
             }, 500); // Delay slightly
             return () => clearTimeout(timer);
        }

        fetchProjectDetails();
        fetchTestCases();
    }, [projectId]);

    // Filter test cases when search or filters change
    useEffect(() => {
        if (!testCases.length) {
            setFilteredTestCases([]);
            return;
        }

        let filtered = testCases.filter((test) =>
            test.testcase_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `TC-${test.testcase_id.toString().padStart(3, '0')}`.toLowerCase().includes(searchQuery.toLowerCase()) // Corrected ID format
        );

        // Apply status filter
        if (statusFilter) {
            filtered = filtered.filter(test => test.testcase_status === statusFilter);
        }

        // Apply priority filter
        if (priorityFilter) {
            filtered = filtered.filter(test => test.testcase_priority === priorityFilter);
        }

        setFilteredTestCases(filtered);
    }, [searchQuery, testCases, statusFilter, priorityFilter]);

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

        try {
            const response = await axios.get(`http://localhost:3001/testcases?project_id=${projectId}`);
            setTestCases(response.data);
            // Initialize filteredTestCases here after fetch
            // setFilteredTestCases(response.data); // Let the filter useEffect handle this
        } catch (error) {
            setError("Failed to load test cases.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return "Invalid date";
            }
            return date.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        } catch (error) {
            console.error("Date formatting error:", error);
            return "Date error";
        }
    };

    const handleCreateTestcase = () => {
        navigate(`/CreateTestcase?project_id=${projectId}`);
    };

    const handleTestExecution = () => {
        navigate(`/ExecutionList?project_id=${projectId}`);
    };

    const handleCreateVeri = () => {
        navigate(`/CreateVeriTest?project_id=${projectId}`);
    };

    const handleVerilist = () => {
        navigate(`/VeriTestcase?project_id=${projectId}`);
    };

    const handleBaselineTest = () => {
        navigate(`/TestcaseBaseline?project_id=${projectId}`);
    };

    const handleDeleteTestcase = (id) => {
        setTestCaseToDeleteId(id); // Store ID to delete
        setIsModalOpen(true);       // Open Modal
    };

    // --- Function to close Modal ---
    const closeModal = () => {
        setIsModalOpen(false);
        setTestCaseToDeleteId(null); // Clear stored ID
    };

    // --- Function called on delete confirmation in Modal ---
    const confirmDeletion = async () => {
        if (!testCaseToDeleteId) return; // Prevent if no ID

        const idToDelete = testCaseToDeleteId; // Store ID before closing Modal
        closeModal(); // Close Modal immediately

        try {
            await axios.delete(`http://localhost:3001/testcases/${idToDelete}`);

            // Update state after successful deletion
            setTestCases((prevTestCases) =>
                prevTestCases.filter((test) => test.testcase_id !== idToDelete)
            );

            // --- Use Toastify for Success ---
            toast.success("Test Case deleted successfully.", {
                // position: "top-right", // Optional: configure position
                 autoClose: 3000,     // Optional: auto close after 3 seconds
            });

        } catch (error) {
            console.error("Delete error:", error);
            // --- Use Toastify for Error ---
            toast.error("ลบ Test Case ไม่สำเร็จ ลองใหม่อีกครั้ง", {
                // position: "top-right",
                 autoClose: 5000,
            });
        }
    };

    return (
        <div className="testcase-container">
            {/* Joyride Component */}
            <Joyride
                steps={tutorialSteps}
                run={runTutorial}
                continuous
                showProgress
                showSkipButton
                styles={{
                    options: {
                        zIndex: 10000, // Ensure it's above other elements, including the modal
                    },
                }}
                callback={(data) => {
                    const { status } = data;
                    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
                        setRunTutorial(false);
                        localStorage.setItem('testcasePageTutorialShown', 'true'); // Mark as shown
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
                             {/* Tutorial Trigger Button */}
                             <button
                                onClick={handleRestartTutorial}
                                className="tutorial-help-button tutorial-help-button-corner" // Add appropriate classes
                                title="Show Tutorial"
                                style={{ marginLeft: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#007bff', fontSize: '1.2em' }} // Basic inline style example
                            >
                                <FontAwesomeIcon icon={faQuestionCircle} />
                            </button>
                        </div>
                    </div>
                    <div className="testcase-actions">
                        <button className="testcase-execution-button" onClick={handleTestExecution}>
                            <FontAwesomeIcon icon={faPlayCircle} style={{ marginRight: '8px' }} />
                            Test Execution
                        </button>
                    </div>
                </div>

                <div className="testcase-tab-bar">
                    <div
                        className={`testcase-tab ${activeTab === 'testcases' ? 'active' : ''}`}
                        onClick={() => setActiveTab('testcases')}
                    >
                        <FontAwesomeIcon icon={faTable} className="testcase-tab-icon" />
                        Test Cases
                    </div>

                    <div
                        className={`testcase-tab ${activeTab === 'createVeri' ? 'active' : ''}`}
                        onClick={handleCreateVeri}
                    >
                        <FontAwesomeIcon icon={faPlus} className="testcase-tab-icon" />
                        Create Verification
                    </div>

                    <div
                        className={`testcase-tab ${activeTab === 'viewVeri' ? 'active' : ''}`}
                        onClick={handleVerilist}
                    >
                        <FontAwesomeIcon icon={faCheckCircle} className="testcase-tab-icon" />
                        View Verification
                    </div>

                    <div
                        className={`testcase-tab ${activeTab === 'baseline' ? 'active' : ''}`}
                        onClick={handleBaselineTest}
                    >
                        <FontAwesomeIcon icon={faHistory} className="testcase-tab-icon" />
                        Baseline
                    </div>
                </div>
            </div>

            <div className="testcase-toolbar">
                <div className="testcase-toolbar-left">
                    <div className="testcase-search-container">
                        <FontAwesomeIcon icon={faSearch} className="testcase-search-icon" />
                        <input
                            type="text"
                            className="testcase-search-input"
                            placeholder="Search test cases by ID or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                className="testcase-clear-search-btn"
                                onClick={() => setSearchQuery('')}
                                title="Clear search"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        )}
                    </div>

                    <select
                        className="testcase-filter-select" // Target for Priority filter step
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                        <option value="">Filter by Priority</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>

                    <select
                        className="testcase-filter-select" // Target for Status filter step
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Filter by Status</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="VALIDATED">Validated</option>
                        <option value="WORKING">Working</option>
                        <option value="WAITING FOR VERIFICATION">Waiting for Verification</option>
                        <option value="WAITING FOR VALIDATION">Waiting for Validation</option>
                        <option value="BASELINE">Baseline</option>
                    </select>

                    {/* Moved Add Test Case button to the right for consistency? Or keep it here? Let's keep it here as per the code */}
                     <button className="testcase-create-button" onClick={handleCreateTestcase}>
                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
                        Add Test Case
                    </button>
                </div>
                 {/* If Add button should be on right, move it here
                 <div className="testcase-toolbar-right">
                    <button className="testcase-create-button" onClick={handleCreateTestcase}>
                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
                        Add Test Case
                    </button>
                </div>
                */}
            </div>

            <div className="testcase-content-card">
                <div className="testcase-card-header">
                    <div>
                        <h2 className="testcase-card-title">
                            <FontAwesomeIcon icon={faTable} className="testcase-card-icon" />
                            Test Cases
                        </h2>
                        <p className="testcase-card-description">
                            Manage and track all test cases for this project
                        </p>
                    </div>
                </div>

                <div className="testcase-table-container">
                    {loading ? (
                        <div className="testcase-loading-state">
                            <div className="testcase-loading-spinner"></div>
                            <p>Loading test cases...</p>
                        </div>
                    ) : error ? (
                        <div className="testcase-error-message">{error}</div>
                    ) : filteredTestCases.length === 0 ? (
                        <div className="testcase-empty-state">
                            <FontAwesomeIcon icon={faListAlt} className="testcase-empty-icon" />
                            <p className="testcase-empty-text">
                                No test cases found. Add some test cases or adjust your filters.
                            </p>
                            <button className="testcase-empty-button" onClick={handleCreateTestcase}>
                                <FontAwesomeIcon icon={faPlus} />
                                Add First Test Case
                            </button>
                        </div>
                    ) : (
                        <table className="testcase-table">
                            <thead>
                                <tr>
                                    <th>Test Case ID</th>
                                    <th>Title</th>
                                    <th>Priority</th>
                                    <th>Test Completion Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTestCases.map((test) => (
                                    <tr key={test.testcase_id}>
                                        <td className="testcase-id-cell"
                                            onClick={() =>
                                                navigate(`/TestcaseDetail?testcase_id=${test.testcase_id}&project_id=${projectId}`, {
                                                    state: { testcase: test },
                                                })
                                            }
                                        >
                                            TC-{test.testcase_id.toString().padStart(3, '0')}
                                        </td>

                                        <td className="testcase-name-cell">{test.testcase_name}</td>


                                        <td className="testcase-priority-cell">
                                            <span className={`testcase-priority-badge priority-${test.testcase_priority?.toLowerCase()}`}>
                                                {test.testcase_priority || "Not set"}
                                            </span>
                                        </td>

                                        <td className="testcase-date-cell">{formatDate(test.testcase_at)}</td>

                                        <td className="testcase-status-cell">
                                            <span
                                                className={`status-button
                                                    ${test.testcase_status === 'VERIFIED' ? 'status-verified' : ''}
                                                    ${test.testcase_status === 'VALIDATED' ? 'status-validated' : ''}
                                                    ${test.testcase_status === 'WORKING' ? 'status-working' : ''}
                                                    ${test.testcase_status === 'WAITING FOR VERIFICATION' ? 'status-waiting-ver' : ''}
                                                    ${test.testcase_status === 'WAITING FOR VALIDATION' ? 'status-val-inprogress' : ''}
                                                    ${test.testcase_status === 'BASELINE' ? 'status-baseline' : ''}
                                                `}
                                            >
                                                <span className="status-dot"></span>
                                                {test.testcase_status || "Not set"}
                                            </span>
                                        </td>

                                        <td className="testcase-actions-cell">
                                            <div className="testcase-actions">
                                                <button
                                                    className="testcase-view" // Target for View step
                                                    onClick={() =>
                                                        navigate(`/TestcaseDetail?testcase_id=${test.testcase_id}&project_id=${projectId}`, {
                                                            state: { testcase: test },
                                                        })
                                                    }
                                                    title="View"
                                                >
                                                    <FontAwesomeIcon icon={faEye} className="testcase-icon" />
                                                </button>

                                                <button
                                                    className="testcase-edit" // Target for Edit step
                                                    onClick={() =>
                                                        navigate(`/UpdateTestcase?testcase_id=${test.testcase_id}&project_id=${projectId}`)
                                                    }
                                                    title="Edit"
                                                >
                                                    <FontAwesomeIcon icon={faPen} className="testcase-icon" />
                                                </button>

                                                <button
                                                    className="testcase-delete" // Target for Delete step
                                                    onClick={() => handleDeleteTestcase(test.testcase_id)}
                                                    title="Delete"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} className="testcase-icon" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            {/* Confirmation Modal (ensure it's outside the main flow if needed) */}
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onConfirm={confirmDeletion}
                title="Confirm Deletion?"
                message="This Test Case will be permanently deleted. This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
};

export default TestcasePage;