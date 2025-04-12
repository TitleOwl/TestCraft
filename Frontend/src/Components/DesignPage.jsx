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
    faTimesCircle   // Added for error state (or choose another)
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import "./CSS/DesignPage.css"; // <<< Make sure this CSS file exists and is styled

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

    // --- Fetch Project Name and Designs ---
    useEffect(() => {
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

        // Format ID for search SD-001, SD-012 etc. <<<< CORRECTED HERE
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

    // Format Design ID <<<< CORRECTED HERE
    const formatDesignId = (id) => {
        // Handle potential null/undefined/NaN IDs
        if (id == null) return 'SD-N/A';
        const idNum = Number(id);
        if (isNaN(idNum)) return 'SD-Invalid';
        return `SD-${idNum.toString().padStart(3, '0')}`; // Changed 1 to 3
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
        <div className="DSNpage-wrapper"> {/* Changed class */}

            {/* Enterprise Header */}
            <div className="DSNenterprise-header"> {/* Changed class */}
                <div className="DSNheader-top"> {/* Changed class */}
                    <div className="DSNproject-info"> {/* Changed class */}
                        <div className="DSNproject-breadcrumb"> {/* Changed class */}
                            <FontAwesomeIcon icon={faHome} />
                             / Projects / {projectName || "Loading..."}
                        </div>
                        <div className="DSNproject-title"> {/* Changed class */}
                            <h1 className="DSNproject-name">{projectName || "Loading..."}</h1> {/* Changed class */}
                            <span className="DSNpage-badge">SOFTWARE DESIGN</span> {/* Changed class */}
                            {/* Add tutorial button here if needed */}
                        </div>
                    </div>
                    {/* Add user info/logout here if needed */}
                </div>

                <div className="DSNheader-tab-bar"> {/* Changed class */}
                    <div
                        className={`DSNheader-tab ${activeTab === 'designs' ? 'DSNactive' : ''}`} // Changed class
                        onClick={() => setActiveTab('designs')} // Keep focus on this page
                    >
                        <FontAwesomeIcon icon={faListAlt} className="DSNtab-icon" /> {/* Changed class */}
                        Designs
                    </div>
                    <div
                        className={`DSNheader-tab ${activeTab === 'createVeri' ? 'DSNactive' : ''}`} // Changed class
                        onClick={handleCreateVeri}
                    >
                        <FontAwesomeIcon icon={faPlus} className="DSNtab-icon" /> {/* Changed class */}
                        Create Verification
                    </div>
                    <div
                        className={`DSNheader-tab ${activeTab === 'listVerify' ? 'DSNactive' : ''}`} // Changed class
                        onClick={handleListVerify}
                    >
                        <FontAwesomeIcon icon={faCheckCircle} className="DSNtab-icon" /> {/* Changed class */}
                        Verification List
                    </div>
                     <div
                        className={`DSNheader-tab ${activeTab === 'baseline' ? 'DSNactive' : ''}`} // Changed class
                        onClick={handleBaseline}
                    >
                        <FontAwesomeIcon icon={faHistory} className="DSNtab-icon" /> {/* Changed class */}
                        Baseline
                    </div>
                     {/* Add other relevant tabs for Design process if needed */}
                </div>
            </div>

            {/* Main Content */}
            <div className="DSNmain-content"> {/* Changed class */}
                {/* Toolbar Section */}
                <div className="DSNtoolbar-section"> {/* Changed class */}
                    <div className="DSNtoolbar-left"> {/* Changed class */}
                        <div className="DSNsearch-container"> {/* Changed class */}
                            <FontAwesomeIcon icon={faSearch} className="DSNsearch-icon" /> {/* Changed class */}
                            <input
                                type="text"
                                className="DSNsearch-input" // Changed class
                                placeholder="Search by ID, Name, or Type..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    className="DSNclear-search-btn" // Changed class
                                    onClick={() => setSearchTerm('')}
                                    title="Clear search"
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            )}
                        </div>
                        <div className="DSNfilter-dropdown"> {/* Changed class */}
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="DSNfilter-select" // Changed class
                            >
                                <option value="">All Types</option>
                                <option value="Prototype">Prototype</option>
                                <option value="Flow Chart">Flow Chart</option>
                                <option value="ER Diagram">ER Diagram</option>
                                <option value="Pseudo Code">Pseudo Code</option>
                                {/* Add other relevant types */}
                            </select>
                        </div>
                        <div className="DSNfilter-dropdown"> {/* Changed class */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="DSNfilter-select" // Changed class
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

                    <div className="DSNtoolbar-right"> {/* Changed class */}
                        <button className="DSNadd-design-button" onClick={handleAddDesign}> {/* Changed class */}
                            <FontAwesomeIcon icon={faPlus} />
                            Add Design
                        </button>
                    </div>
                </div>

                {/* Designs Table Card */}
                <div className="DSNdesigns-card"> {/* Changed class */}
                    <div className="DSNcard-header"> {/* Changed class */}
                         <div>
                            <h2 className="DSNcard-title"> {/* Changed class */}
                                <FontAwesomeIcon icon={faTable} className="DSNcard-icon" /> {/* Changed class */}
                                Software Designs
                            </h2>
                             <p className="DSNcard-description"> {/* Changed class */}
                                Manage and track all software designs for this project.
                             </p>
                         </div>
                         {/* Optional: Add card actions like export here */}
                    </div>

                    <div className="DSNtable-container"> {/* Changed class */}
                        {loading ? (
                            renderLoading()
                        ) : error ? (
                            renderError()
                        ) : (
                            <table className="DSNenterprise-table"> {/* Changed class */}
                                <thead>
                                    <tr>
                                        <th className="DSNid-column">ID</th>      {/* Changed class */}
                                        <th className="DSNname-column">Name</th>    {/* Changed class */}
                                        <th className="DSNtype-column">Type</th>    {/* Changed class */}
                                        <th className="DSNstatus-column">Status</th>  {/* Changed class */}
                                        <th className="DSNactions-column">Actions</th>{/* Changed class */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDesigns.length > 0 ? (
                                        filteredDesigns.map((design) => (
                                            <tr key={design.design_id} className="DSNdesign-row"> {/* Changed class */}
                                                <td className="DSNdesign-id-cell" onClick={() => handleViewDesign(design.design_id)}> {/* Changed class */}
                                                    {formatDesignId(design.design_id)}
                                                </td>
                                                <td className="DSNdesign-name-cell" onClick={() => handleViewDesign(design.design_id)}> {/* Changed class */}
                                                    {design.diagram_name || 'N/A'}
                                                </td>
                                                <td className="DSNdesign-type-cell" onClick={() => handleViewDesign(design.design_id)}> {/* Changed class */}
                                                    {/* Optional: Add type badges like RequirementPage */}
                                                    {/* <span className={`DSNtype-badge ${getDesignTypeBadgeClass(design.diagram_type)}`}> */}
                                                        {design.diagram_type || 'N/A'}
                                                    {/* </span> */}
                                                </td>

                                                {/* --- Status Cell --- */}
                                                <td className="DSNdesign-status-cell"> {/* Changed class */}
                                                   <div className={`DSNstatus-badge ${getStatusBadgeClass(design.design_status)}`}> {/* Changed class */}
                                                         <span className="DSNstatus-dot"></span> {/* Changed class */}
                                                          {design.design_status || 'Unknown'}
                                                    </div>
                                                </td>
                                                {/* --- End Status Cell --- */}

                                                {/* --- Action Buttons Cell --- */}
                                                <td className="DSNdesign-actions-cell"> {/* Changed class */}
                                                    <div className="DSNaction-buttons-group"> {/* Changed class */}
                                                        <button
                                                            className="DSNaction-button DSNview-button" // Changed class
                                                            title="View Design"
                                                            onClick={() => handleViewDesign(design.design_id)}
                                                        >
                                                            <FontAwesomeIcon icon={faEye} />
                                                        </button>
                                                        <button
                                                            className="DSNaction-button DSNedit-button" // Changed class
                                                            title="Edit Design"
                                                            onClick={() => handleEditDesign(design.design_id)}
                                                        >
                                                            <FontAwesomeIcon icon={faPen} />
                                                        </button>
                                                        <button
                                                            className="DSNaction-button DSNdelete-button" // Changed class
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