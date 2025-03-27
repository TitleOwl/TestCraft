import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import "./CSS/DesignPage.css";
import Swal from "sweetalert2";

const DesignPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(""); // state สำหรับเก็บค่าค้นหา
    const [statusFilter, setStatusFilter] = useState("All"); // state สำหรับเก็บค่าฟิลเตอร์สถานะ
    const [typeFilter, setTypeFilter] = useState("All"); // state สำหรับเก็บค่าฟิลเตอร์ประเภท

    const fetchDesigns = async () => {
        try {
            const response = await axios.get("http://localhost:3001/design", {
                params: { project_id: projectId },
            });
            setDesigns(response.data);
        } catch (error) {
            console.error("Error fetching designs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDesigns();
    }, [projectId]);

    const handleDeleteDesign = async (designId) => {
        Swal.fire({
            title: "คุณแน่ใจหรือไม่?",
            text: "คุณต้องการลบ Design นี้หรือไม่?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ใช่, ลบ!",
            cancelButtonText: "ยกเลิก",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`http://localhost:3001/design/${designId}`);
                    Swal.fire("ลบ!", "Design ถูกลบเรียบร้อยแล้ว", "success");
                    fetchDesigns();
                } catch (error) {
                    console.error("Error deleting design:", error);
                    Swal.fire("เกิดข้อผิดพลาด!", "ไม่สามารถลบ Design ได้", "error");
                }
            }
        });
    };

    // ฟังก์ชันสำหรับฟิลเตอร์ข้อมูล designs
    const filteredDesigns = designs.filter((design) => {
        // เงื่อนไขการค้นหา
        const searchCondition =
            design.diagram_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            design.design_type.toLowerCase().includes(searchTerm.toLowerCase());

        // เงื่อนไขการฟิลเตอร์สถานะ
        const statusCondition = statusFilter === "All" || design.design_status === statusFilter;

        // เงื่อนไขการฟิลเตอร์ประเภท
        const typeCondition = typeFilter === "All" || design.diagram_type === typeFilter;

        // คืนค่า true หากตรงตามเงื่อนไขทั้งหมด
        return searchCondition && statusCondition && typeCondition;
    });

    return (
        <div className="design-container">
            <header className="design-header">
                <h1>Software Design</h1>
                <div className="design-header-buttons">
                    <button className="design-btn" onClick={() => navigate(`/CreateVeriDesign?project_id=${projectId}`)}>Create Verification</button>
                    <button className="design-btn" onClick={() => navigate(`/VeriDesign?project_id=${projectId}`)}>View Verification</button>
                    <button className="design-btn" onClick={() => navigate(`/DesignBaseline?project_id=${projectId}`)}>Baseline</button>
                </div>
            </header>

            <section className="design-filters">
                <input
                    type="text"
                    placeholder="Search by Diagram Name or Type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="design-search-input"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="design-filter-select"
                >
                    <option value="All">All Statuses</option>
                    <option value="WORKING">WORKING</option>
                    <option value="WAITING FOR VERIFICATION">WAITING FOR VERIFICATION</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="BASELINE">BASELINE</option>
                </select>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="design-filter-select"
                >
                    <option value="All">All Type</option>
                    <option value="Prototype">Prototype</option>
                    <option value="Flow Chart">Flow Chart</option>
                    <option value="ER Diagram">ER Diagram</option>
                    <option value="Pseudo Code">Pseudo Code</option>
                </select>
                <button className="design-btn" onClick={() => navigate(`/CreateDesign?project_id=${projectId}`)}>Add Design</button>
            </section>

            <section className="design-diagrams">
                {loading ? (
                    <p>Loading diagrams...</p>
                ) : (
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
                            {filteredDesigns.map((design) => (
                                <tr key={design.design_id}>
                                    <td>SD-0{design.design_id}</td>
                                    <td>{design.diagram_name}</td>
                                    <td>{design.diagram_type}</td>
                                    <td>
                                        <button className="design-action-btn view">
                                            <FontAwesomeIcon icon={faEye} onClick={() => navigate(`/ViewDesign?project_id=${projectId}&design_id=${design.design_id}`)} />
                                        </button>
                                        <button className="design-action-btn edit">
                                            <FontAwesomeIcon icon={faPen} onClick={() => navigate(`/UpdateDesign?project_id=${projectId}&design_id=${design.design_id}`)} />
                                        </button>
                                        <button className="design-action-btn delete" onClick={() => handleDeleteDesign(design.design_id)}>
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </td>
                                    <td>
                                        <span className={`status-btn ${design.design_status.toLowerCase()}`}>
                                            {design.design_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
};

export default DesignPage;