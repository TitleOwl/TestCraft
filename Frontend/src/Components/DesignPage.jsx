import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import "./CSS/DesignPage.css"; // <<< Import CSS ที่มี Style ปุ่มวงกลม
import Swal from "sweetalert2";

const DesignPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- State Variables ---
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(""); 
    const [statusFilter, setStatusFilter] = useState("All"); 
    const [typeFilter, setTypeFilter] = useState("All"); 

    // --- Fetch Designs ---
    const fetchDesigns = async () => {
        setLoading(true); // Start loading
        try {
            const response = await axios.get("http://localhost:3001/design", {
                params: { project_id: projectId },
            });
             // Ensure response.data is an array
            if (Array.isArray(response.data)) {
                 setDesigns(response.data);
            } else {
                 console.error("Invalid data format received for designs:", response.data);
                 setDesigns([]); // Set empty array on invalid data
            }
        } catch (error) {
            console.error("Error fetching designs:", error);
            setDesigns([]); // Set empty array on error
            // Optionally show an error message to the user
            // Swal.fire("Error", "Could not fetch designs.", "error"); 
        } finally {
            setLoading(false);
        }
    };

    // --- Fetch on Mount/projectId change ---
    useEffect(() => {
        if (projectId) {
             fetchDesigns();
        } else {
             console.error("Project ID is missing!");
             setLoading(false);
             // Handle missing project ID case (e.g., navigate away or show error)
        }
    }, [projectId]); // Dependency array includes projectId

    // --- Handle Delete ---
    const handleDeleteDesign = async (designId) => {
        Swal.fire({
            title: "คุณแน่ใจหรือไม่?",
            text: "คุณต้องการลบ Design นี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33", // Use error color variable if defined in CSS
            cancelButtonColor: "#3085d6",  // Use secondary color variable if defined
            confirmButtonText: "ใช่, ลบ!",
            cancelButtonText: "ยกเลิก",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`http://localhost:3001/design/${designId}`);
                    Swal.fire({
                        title: "ลบสำเร็จ!",
                        text: "Design ถูกลบเรียบร้อยแล้ว", 
                        icon:"success",
                        timer: 1500, // Auto close after 1.5s
                        showConfirmButton: false
                    });
                    fetchDesigns(); // Refresh the list
                } catch (error) {
                    console.error("Error deleting design:", error);
                    Swal.fire("เกิดข้อผิดพลาด!", "ไม่สามารถลบ Design ได้ โปรดลองอีกครั้ง", "error");
                }
            }
        });
    };

    // --- Filter Logic ---
    const filteredDesigns = designs.filter((design) => {
        // Handle potential null values gracefully
        const diagramName = design.diagram_name || "";
        const designType = design.design_type || ""; // Assuming you search this too
        const diagramType = design.diagram_type || ""; 
        const designStatus = design.design_status || "";

        const searchTermLower = searchTerm.toLowerCase();

        // Search condition (checking diagram_name and design_type as per original code)
        const searchCondition =
            diagramName.toLowerCase().includes(searchTermLower) ||
            designType.toLowerCase().includes(searchTermLower);

        // Status filter condition
        const statusCondition = statusFilter === "All" || designStatus === statusFilter;

        // Type filter condition (using diagram_type)
        const typeCondition = typeFilter === "All" || diagramType === typeFilter;

        return searchCondition && statusCondition && typeCondition;
    });

    // --- JSX Return ---
    return (
        <div className="design-container">
            <header className="design-header">
                <h1>Software Design</h1>
                <div className="design-header-buttons">
                    {/* Other header buttons */}
                    <button className="design-btn" onClick={() => navigate(`/CreateVeriDesign?project_id=${projectId}`)}>Create Verification</button>
                    <button className="design-btn" onClick={() => navigate(`/VeriDesign?project_id=${projectId}`)}>List Verify</button>
                    <button
                        className="design-btn"
                        onClick={() => {
                            console.log("Navigating to VersionDesign with state:", designs); 
                            navigate(
                                `/VersionDesign?project_id=${projectId}`, 
                                { state: { designList: designs } }
                            );
                        }}
                    >
                        Version Control
                    </button>
                    <button className="design-btn" onClick={() => navigate(`/DesignBaseline?project_id=${projectId}`)}>Baseline</button>
                </div>
            </header>

            <section className="design-filters">
                <input
                    type="text"
                    placeholder="Search by Diagram Name or Type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="design-search-input" // Style this input
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="design-filter-select" // Style this select
                >
                    <option value="All">All Statuses</option>
                    <option value="WORKING">WORKING</option>
                    <option value="WAITING FOR VERIFICATION">WAITING FOR VERIFICATION</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="BASELINE">BASELINE</option>
                    {/* Add other relevant statuses */}
                </select>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="design-filter-select" // Style this select
                >
                    <option value="All">All Types</option>
                    <option value="Prototype">Prototype</option>
                    <option value="Flow Chart">Flow Chart</option>
                    <option value="ER Diagram">ER Diagram</option>
                    <option value="Pseudo Code">Pseudo Code</option>
                     {/* Add other relevant types */}
                </select>
                {/* Ensure consistent styling for this button */}
                <button className="design-btn" onClick={() => navigate(`/CreateDesign?project_id=${projectId}`)}>Add Design</button>
            </section>

            <section className="design-diagrams">
                {loading ? (
                    <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-color-muted)' }}>Loading diagrams...</p>
                ) : (
                    // Wrapper for responsiveness (horizontal scroll)
                    <div className="table-responsive-wrapper"> 
                        <table className="design-diagram-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Actions</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDesigns.length > 0 ? (
                                    filteredDesigns.map((design) => (
                                        <tr key={design.design_id}>
                                            <td>SD-0{design.design_id}</td>
                                            <td>{design.diagram_name || 'N/A'}</td>
                                            <td>{design.diagram_type || 'N/A'}</td>
                                            
                                            {/* --- Action Buttons Cell --- */}
                                            {/* JSX Structure remains the same - Styling is done via CSS */}
                                            <td>
                                                <button 
                                                    className="design-action-btn view" 
                                                    title="View Design"
                                                    onClick={() => navigate(`/ViewDesign?project_id=${projectId}&design_id=${design.design_id}`)}
                                                >
                                                    <FontAwesomeIcon icon={faEye} />
                                                </button>
                                                <button 
                                                    className="design-action-btn edit"
                                                    title="Edit Design"
                                                    onClick={() => navigate(`/UpdateDesign?project_id=${projectId}&design_id=${design.design_id}`)}
                                                >
                                                    <FontAwesomeIcon icon={faPen} />
                                                </button>
                                                <button 
                                                    className="design-action-btn delete" 
                                                    title="Delete Design"
                                                    onClick={() => handleDeleteDesign(design.design_id)}
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </td>
                                            {/* --- End Action Buttons Cell --- */}

                                            <td>
                                                {/* Ensure design_status exists before accessing toLowerCase() */}
                                                {design.design_status ? (
                                                    <span className={`status-btn ${design.design_status.toLowerCase().replace(/\s+/g, '-')}`}> 
                                                        {design.design_status}
                                                    </span>
                                                ) : (
                                                    <span className="status-btn unknown">Unknown</span> // Fallback style
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    // Row shown when no designs match filters or none exist
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-color-muted)', padding: '2rem' }}>
                                            {designs.length === 0 ? "No designs created for this project yet." : "No designs match the current filters."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div> // End table-responsive-wrapper
                )}
            </section>
        </div> // End design-container
    );
};

export default DesignPage;