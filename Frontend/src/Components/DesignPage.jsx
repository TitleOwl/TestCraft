import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEye,
    faPen,
    faTrash,
    faHome,         // Added
    faListAlt,      // Added
    faSearch,       // Added
    faCheckCircle,  // Added (for Verification List)
    faPlus,         // Added
    faHistory,      // Added (for Baseline)
    faTable,        // Added
    faTimes,        // Added (for clear search)
    faTimesCircle,  // Added for error state (or choose another)
    faQuestionCircle // <<< Added for Tutorial Button
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import Joyride, { STATUS } from 'react-joyride'; // <<< Added Joyride
import "./CSS/DesignPage.css"; // <<< Make sure this CSS file exists and is styled
// Optional: Add CSS for the tutorial button if needed
// import "./CSS/TutorialButton.css";

const DesignPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- State Variables ---
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Added error state
    const [projectName, setProjectName] = useState(""); // Added project name state
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState(""); // Default to empty string for "All"
    const [typeFilter, setTypeFilter] = useState("");   // Default to empty string for "All"
    const [activeTab, setActiveTab] = useState("designs"); // Added active tab state

    // --- Tutorial State ---
    const [runTutorial, setRunTutorial] = useState(false);
    const [tutorialSteps] = useState([
        {
            target: '.DSNadd-design-button',
            content: 'เริ่มต้นด้วยการเพิ่ม Design ใหม่ของโปรเจกต์โดยคลิกที่ปุ่มนี้ครับ',
            placement: 'bottom',
            disableBeacon: true,
        },

        {
            // Target the view button of the first row in the table body
            // Make sure there is at least one design for this step to work reliably
            target: '.DSNenterprise-table tbody tr:first-child .DSNview-button',
            content: 'คลิกไอคอนรูปตาเพื่อดูรายละเอียดของ Design นั้นๆ',
            placement: 'left', // Adjust placement as needed
        },
        {
            // Target the edit button of the first row
            target: '.DSNenterprise-table tbody tr:first-child .DSNedit-button',
            content: 'คลิกไอคอนรูปปากกาเพื่อแก้ไขข้อมูล Design',
            placement: 'left',
        },
        {
            // Target the create verification tab (assuming it's the 2nd tab)
            target: '.DSNheader-tab-bar .DSNheader-tab:nth-child(2)',
            content: 'เมื่อต้องการส่ง Design ให้ทีมตรวจสอบ (Verification) ให้คลิกที่แท็บนี้เพื่อสร้างงาน',
            placement: 'bottom',
        },
        {
            // Target the verification list tab (assuming it's the 3rd tab)
            target: '.DSNheader-tab-bar .DSNheader-tab:nth-child(3)',
            content: 'ดูรายการ Design ที่รอการตรวจสอบ หรือตรวจสอบแล้วได้ที่นี่',
            placement: 'bottom',
        },
        {
            // Target the baseline tab (assuming it's the 4th tab)
            target: '.DSNheader-tab-bar .DSNheader-tab:nth-child(4)',
            content: 'จัดการเวอร์ชันหลัก (Baseline) ของ Design ที่ผ่านการตรวจสอบแล้วที่นี่',
            placement: 'bottom',
        },
    ]);

    const handleRestartTutorial = () => {
        setRunTutorial(true);
    };

    // --- Fetch Project Name and Designs ---
    useEffect(() => {
        // Check if tutorial has been shown before for this page
        const tutorialShown = localStorage.getItem('designPageTutorialShown');
        if (!tutorialShown) {
            // Set a small delay to ensure the page elements are rendered before starting Joyride
            const timer = setTimeout(() => {
                 setRunTutorial(true); // Start tutorial on first visit after a short delay
            }, 500); // 500ms delay, adjust if needed
            return () => clearTimeout(timer); // Cleanup timer on component unmount
        }

        if (projectId) {
            setLoading(true);
            setError(null); // Reset error on new fetch
            let fetchedProjectName = ""; // Temp store project name

            // Fetch project name
            axios.get(`http://localhost:3001/project/${projectId}`)
                .then((res) => {
                    fetchedProjectName = res.data.project_name; // Store fetched name
                    setProjectName(res.data.project_name);
                })
                .catch((err) => {
                    console.error("Error fetching project name:", err);
                    setError("Failed to load project name."); // Set specific error
                    // Don't stop loading yet, try fetching designs
                })
                .finally(() => {
                    // Nested fetch for designs after project name attempt
                    axios.get("http://localhost:3001/design", { params: { project_id: projectId } })
                        .then(response => {
                            if (Array.isArray(response.data)) {
                                setDesigns(response.data);
                            } else {
                                console.error("Invalid data format received for designs:", response.data);
                                setDesigns([]);
                                setError(prevError => prevError ? prevError + " & Invalid design data." : "Invalid design data format.");
                            }
                        })
                        .catch(err => {
                            console.error("Error fetching designs:", err);
                            setDesigns([]);
                            setError(prevError => prevError ? prevError + " & Could not fetch designs." : "Could not fetch designs.");
                        })
                        .finally(() => {
                            setLoading(false); // Final loading state set here
                            // Optionally set project name in title if needed elsewhere
                            // document.title = `${fetchedProjectName || 'Project'} Designs`;
                        });
                });

        } else {
            console.error("Project ID is missing!");
            setError("Project ID is missing in the URL.");
            setLoading(false);
            setDesigns([]);
            setProjectName("");
            // Handle missing project ID case (e.g., navigate away or show specific error)
            // navigate('/projects'); // Example navigation
        }
    }, [projectId]); // Dependency array includes projectId

    // --- Handle Delete ---
    const handleDeleteDesign = async (designId) => {
        Swal.fire({
            title: "คุณแน่ใจหรือไม่?",
            text: "คุณต้องการลบ Design นี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ใช่, ลบ!",
            cancelButtonText: "ยกเลิก",
        }).then(async (result) => {
            if (result.isConfirmed) {
                setLoading(true); // Indicate loading during delete
                try {
                    await axios.delete(`http://localhost:3001/design/${designId}`);
                    Swal.fire({
                        title: "ลบสำเร็จ!",
                        text: "Design ถูกลบเรียบร้อยแล้ว",
                        icon: "success",
                        timer: 1500,
                        showConfirmButton: false
                    });
                    // Re-fetch designs after successful deletion
                    const response = await axios.get("http://localhost:3001/design", { params: { project_id: projectId } });
                    if (Array.isArray(response.data)) {
                        setDesigns(response.data);
                    } else {
                        setDesigns([]);
                    }
                    setError(null); // Clear any previous errors
                } catch (error) {
                    console.error("Error deleting design:", error);
                    setError("Failed to delete design."); // Set error state
                    Swal.fire("เกิดข้อผิดพลาด!", "ไม่สามารถลบ Design ได้ โปรดลองอีกครั้ง", "error");
                } finally {
                    setLoading(false); // Stop loading indicator
                }
            }
        });
    };

    // --- Filter Logic ---
    const filteredDesigns = designs.filter((design) => {
        const diagramName = design.diagram_name || "";
        // const designType = design.design_type || ""; // Not used in search currently
        const diagramType = design.diagram_type || "";
        const designStatus = design.design_status || "";

        // Format ID for search SD-001, SD-012 etc.
        const designIdString = design.design_id != null
            ? `SD-${design.design_id.toString().padStart(3, '0')}` // Use padStart(3, '0')
            : "";

        const searchTermLower = searchTerm.toLowerCase();

        // Search condition (ID, Name, Diagram Type)
        const searchCondition =
            designIdString.toLowerCase().includes(searchTermLower) ||
            diagramName.toLowerCase().includes(searchTermLower) ||
            diagramType.toLowerCase().includes(searchTermLower);

        // Status filter condition
        const statusCondition = !statusFilter || designStatus === statusFilter; // Check if filter is set

        // Type filter condition (using diagram_type)
        const typeCondition = !typeFilter || diagramType === typeFilter; // Check if filter is set

        return searchCondition && statusCondition && typeCondition;
    });

    // --- Navigation Handlers ---
    const handleCreateVeri = () => navigate(`/CreateVeriDesign?project_id=${projectId}`);
    const handleListVerify = () => navigate(`/VeriDesign?project_id=${projectId}`); // Changed from VeriDesign to ListVerify for clarity
    const handleBaseline = () => navigate(`/DesignBaseline?project_id=${projectId}`);
    const handleAddDesign = () => navigate(`/CreateDesign?project_id=${projectId}`);
    const handleViewDesign = (designId) => navigate(`/ViewDesign?project_id=${projectId}&design_id=${designId}`);
    const handleEditDesign = (designId) => navigate(`/UpdateDesign?project_id=${projectId}&design_id=${designId}`);


    // --- Helper Functions ---

    // Format Design ID
    const formatDesignId = (id) => {
        // Handle potential null/undefined/NaN IDs
        if (id == null) return 'SD-N/A';
        const idNum = Number(id);
        if (isNaN(idNum)) return 'SD-Invalid';
        return `SD-${idNum.toString().padStart(3, '0')}`; // Use 3 digits padding
    };

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        const statusClass = (status || 'unknown').toLowerCase().replace(/\s+/g, '-');
        return `DSNstatus-${statusClass}`; // e.g., DSNstatus-working, DSNstatus-verified
    };

    // Render Loading State
    const renderLoading = () => (
        <div className="DSNloading-state">
            <div className="DSNloading-spinner"></div>
            <p>Loading designs...</p>
        </div>
    );

    // Render Error State
    const renderError = () => (
        <div className="DSNerror-state">
            {/* Use an appropriate icon like faTimesCircle */}
            <FontAwesomeIcon icon={faTimesCircle} className="DSNerror-icon" />
            <p>Error: {error || "An unexpected error occurred."}</p>
            {/* Optional: Add a retry button */}
            {/* <button onClick={() => window.location.reload()}>Retry</button> */}
        </div>
    );

    // Render Empty State for Table
    const renderEmptyState = (message) => (
        <tr className="DSNempty-row">
            <td colSpan="5" className="DSNempty-cell">
                <FontAwesomeIcon icon={faTable} className="DSNempty-icon" />
                <p>{message}</p>
            </td>
        </tr>
    );


    // --- JSX Return ---
    return (
        <div className="DSNpage-wrapper"> {/* Wrapper class */}

             {/* Joyride Component */}
             <Joyride
                steps={tutorialSteps}
                run={runTutorial}
                continuous
                showProgress
                showSkipButton
                styles={{
                    options: {
                        zIndex: 10000, // Ensure it's above other elements
                    },
                }}
                callback={(data) => {
                    const { status } = data;
                    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
                        setRunTutorial(false);
                        localStorage.setItem('designPageTutorialShown', 'true'); // Mark as shown
                    }
                }}
            />

            {/* Enterprise Header */}
            <div className="DSNenterprise-header"> {/* Header class */}
                <div className="DSNheader-top"> {/* Top part of header */}
                    <div className="DSNproject-info"> {/* Project info container */}
                        <div className="DSNproject-breadcrumb"> {/* Breadcrumb */}
                            <FontAwesomeIcon icon={faHome} />
                             / Projects / {projectName || "Loading..."}
                        </div>
                        <div className="DSNproject-title"> {/* Project title area */}
                            <h1 className="DSNproject-name">{projectName || "Loading..."}</h1> {/* Project name */}
                            <span className="DSNpage-badge">SOFTWARE DESIGN</span> {/* Page badge */}
                             {/* Tutorial Trigger Button */}
                             <button
                                onClick={handleRestartTutorial}
                                className="tutorial-help-button tutorial-help-button-corner" // Use similar classes for styling
                                title="Show Tutorial"
                             >
                                <FontAwesomeIcon icon={faQuestionCircle} />
                             </button>
                        </div>
                    </div>
                    {/* Add user info/logout here if needed */}
                </div>

                <div className="DSNheader-tab-bar"> {/* Tab bar */}
                    <div
                        className={`DSNheader-tab ${activeTab === 'designs' ? 'DSNactive' : ''}`} // Designs tab
                        onClick={() => setActiveTab('designs')} // Keep focus on this page
                    >
                        <FontAwesomeIcon icon={faListAlt} className="DSNtab-icon" /> {/* Tab icon */}
                        Designs
                    </div>
                    <div
                        className={`DSNheader-tab ${activeTab === 'createVeri' ? 'DSNactive' : ''}`} // Create Verification tab
                        onClick={handleCreateVeri}
                    >
                        <FontAwesomeIcon icon={faPlus} className="DSNtab-icon" /> {/* Tab icon */}
                        Create Verification
                    </div>
                    <div
                        className={`DSNheader-tab ${activeTab === 'listVerify' ? 'DSNactive' : ''}`} // Verification List tab
                        onClick={handleListVerify}
                    >
                        <FontAwesomeIcon icon={faCheckCircle} className="DSNtab-icon" /> {/* Tab icon */}
                        Verification List
                    </div>
                     <div
                        className={`DSNheader-tab ${activeTab === 'baseline' ? 'DSNactive' : ''}`} // Baseline tab
                        onClick={handleBaseline}
                    >
                        <FontAwesomeIcon icon={faHistory} className="DSNtab-icon" /> {/* Tab icon */}
                        Baseline
                    </div>
                    {/* Add other relevant tabs for Design process if needed */}
                </div>
            </div>

            {/* Main Content */}
            <div className="DSNmain-content"> {/* Main content area */}
                {/* Toolbar Section */}
                <div className="DSNtoolbar-section"> {/* Toolbar container */}
                    <div className="DSNtoolbar-left"> {/* Left side of toolbar */}
                        <div className="DSNsearch-container"> {/* Search input container */}
                            <FontAwesomeIcon icon={faSearch} className="DSNsearch-icon" /> {/* Search icon */}
                            <input
                                type="text"
                                className="DSNsearch-input" // Search input field
                                placeholder="Search by ID, Name, or Type..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    className="DSNclear-search-btn" // Clear search button
                                    onClick={() => setSearchTerm('')}
                                    title="Clear search"
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            )}
                        </div>
                        <div className="DSNfilter-dropdown"> {/* Type filter dropdown */}
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="DSNfilter-select" // Select element
                            >
                                <option value="">All Types</option>
                                <option value="Prototype">Prototype</option>
                                <option value="Flow Chart">Flow Chart</option>
                                <option value="ER Diagram">ER Diagram</option>
                                <option value="Pseudo Code">Pseudo Code</option>
                                {/* Add other relevant types */}
                            </select>
                        </div>
                        <div className="DSNfilter-dropdown"> {/* Status filter dropdown */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="DSNfilter-select" // Select element
                            >
                                <option value="">All Statuses</option>
                                <option value="WORKING">WORKING</option>
                                <option value="WAITING FOR VERIFICATION">WAITING FOR VERIFICATION</option>
                                <option value="VERIFIED">VERIFIED</option>
                                <option value="BASELINE">BASELINE</option>
                                {/* Add other relevant statuses */}
                            </select>
                        </div>
                    </div>

                    <div className="DSNtoolbar-right"> {/* Right side of toolbar */}
                        <button className="DSNadd-design-button" onClick={handleAddDesign}> {/* Add Design button */}
                            <FontAwesomeIcon icon={faPlus} />
                            Add Design
                        </button>
                    </div>
                </div>

                {/* Designs Table Card */}
                <div className="DSNdesigns-card"> {/* Card container for the table */}
                    <div className="DSNcard-header"> {/* Card header */}
                         <div>
                             <h2 className="DSNcard-title"> {/* Card title */}
                                 <FontAwesomeIcon icon={faTable} className="DSNcard-icon" /> {/* Card icon */}
                                 Software Designs
                             </h2>
                              <p className="DSNcard-description"> {/* Card description */}
                                 Manage and track all software designs for this project.
                              </p>
                         </div>
                         {/* Optional: Add card actions like export here */}
                    </div>

                    <div className="DSNtable-container"> {/* Table container */}
                        {loading ? (
                            renderLoading()
                        ) : error ? (
                            renderError()
                        ) : (
                            <table className="DSNenterprise-table"> {/* Main table */}
                                <thead>
                                    <tr>
                                        <th className="DSNid-column">ID</th>     {/* ID column header */}
                                        <th className="DSNname-column">Name</th>   {/* Name column header */}
                                        <th className="DSNtype-column">Type</th>   {/* Type column header */}
                                        <th className="DSNstatus-column">Status</th> {/* Status column header */}
                                        <th className="DSNactions-column">Actions</th>{/* Actions column header */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDesigns.length > 0 ? (
                                        filteredDesigns.map((design) => (
                                            <tr key={design.design_id} className="DSNdesign-row"> {/* Table row for each design */}
                                                <td className="DSNdesign-id-cell" onClick={() => handleViewDesign(design.design_id)}> {/* ID cell */}
                                                    {formatDesignId(design.design_id)}
                                                </td>
                                                <td className="DSNdesign-name-cell" onClick={() => handleViewDesign(design.design_id)}> {/* Name cell */}
                                                    {design.diagram_name || 'N/A'}
                                                </td>
                                                <td className="DSNdesign-type-cell" onClick={() => handleViewDesign(design.design_id)}> {/* Type cell */}
                                                    {/* Optional: Add type badges like RequirementPage */}
                                                    {/* <span className={`DSNtype-badge ${getDesignTypeBadgeClass(design.diagram_type)}`}> */}
                                                         {design.diagram_type || 'N/A'}
                                                    {/* </span> */}
                                                </td>

                                                {/* --- Status Cell --- */}
                                                <td className="DSNdesign-status-cell"> {/* Status cell */}
                                                   <div className={`DSNstatus-badge ${getStatusBadgeClass(design.design_status)}`}> {/* Status badge */}
                                                          <span className="DSNstatus-dot"></span> {/* Status dot */}
                                                           {design.design_status || 'Unknown'}
                                                    </div>
                                                </td>
                                                {/* --- End Status Cell --- */}

                                                {/* --- Action Buttons Cell --- */}
                                                <td className="DSNdesign-actions-cell"> {/* Actions cell */}
                                                    <div className="DSNaction-buttons-group"> {/* Button group */}
                                                        <button
                                                            className="DSNaction-button DSNview-button" // View button
                                                            title="View Design"
                                                            onClick={() => handleViewDesign(design.design_id)}
                                                        >
                                                            <FontAwesomeIcon icon={faEye} />
                                                        </button>
                                                        <button
                                                            className="DSNaction-button DSNedit-button" // Edit button
                                                            title="Edit Design"
                                                            onClick={() => handleEditDesign(design.design_id)}
                                                        >
                                                            <FontAwesomeIcon icon={faPen} />
                                                        </button>
                                                        <button
                                                            className="DSNaction-button DSNdelete-button" // Delete button
                                                            title="Delete Design"
                                                            onClick={() => handleDeleteDesign(design.design_id)}
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </div>
                                                </td>
                                                {/* --- End Action Buttons Cell --- */}

                                            </tr>
                                        ))
                                    ) : (
                                        renderEmptyState(
                                             designs.length === 0
                                                ? "No designs created for this project yet."
                                                : "No designs match the current filters."
                                        )
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div> {/* End DSNtable-container */}
                </div> {/* End DSNdesigns-card */}
            </div> {/* End DSNmain-content */}
        </div> // End DSNpage-wrapper
    );
};

export default DesignPage;