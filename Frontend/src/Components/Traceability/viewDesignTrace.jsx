import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import '../CSS/ViewDesign.css';
import backtodesign from './image/arrow_left.png';

const ViewDesignTrace = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const designId = queryParams.get("design_id");

    const [designData, setDesignData] = useState({
        diagram_name: "",
        design_type: "",
        diagram_type: "",
        design_description: "",
        requirement_id: [],
        design_status: "",
    });
    const [baselineRequirements, setBaselineRequirements] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDesign = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/designedit`, {
                    params: { project_id: projectId, design_id: designId },
                });
                if (response.data.length > 0) {
                    const design = response.data[0];
                    setDesignData({
                        diagram_name: design.diagram_name,
                        design_type: design.design_type,
                        diagram_type: design.diagram_type,
                        design_description: design.design_description,
                        requirement_id: design.requirement_id ? JSON.parse(design.requirement_id) : [],
                        design_status: design.design_status || "WORKING",
                    });
                } else {
                    console.log("No design data found");
                }
            } catch (error) {
                console.error("Error fetching design:", error);
                alert("Failed to fetch design data");
            } finally {
                setLoading(false);
            }
        };

        const fetchRequirements = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/project/${projectId}/requirement`, {
                    params: { status: "BASELINE" },
                });
                setBaselineRequirements(response.data);
            } catch (error) {
                console.error("Error fetching requirements:", error);
                alert("Failed to fetch baseline requirements");
            }
        };

        const fetchHistory = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/getHistoryByDesignId`, {
                    params: { design_id: designId },
                });
                setHistoryData(response.data.data);  // Set history data
            } catch (error) {
                console.error("Error fetching history:", error);
                alert("Failed to fetch history");
            }
        };

        if (designId && projectId) {
            fetchDesign();
            fetchRequirements();
            fetchHistory(); // Call fetchHistory
        } else {
            console.error("Missing designId or projectId");
            setLoading(false);
        }
    }, [designId, projectId]);

    const formatDateTime = (datetime) => {
        const date = new Date(datetime);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    return (
        <>
            <div className="view-design-container">
                <button className="backtodesign-button" onClick={() =>
                    navigate(`/Dashboard?project_id=${projectId}`, {
                        state: { selectedSection: "Traceability" },
                    })
                }>
                    <img src={backtodesign} alt="backtodesign" className="backtodesign" />
                </button>
                <h1 className="view-design-title">View Design</h1>
                {loading ? (
                    <p className="loading-text">Loading...</p>
                ) : (
                    <div className="view-design-details">
                        <div className="view-design-item"><strong>Diagram Name:</strong> {designData.diagram_name}</div>
                        <div className="view-design-item"><strong>Design Type:</strong> {designData.design_type}</div>
                        <div className="view-design-item"><strong>Diagram Type:</strong> {designData.diagram_type}</div>
                        <div className="view-design-item"><strong>Design Description:</strong> {designData.design_description}</div>
                        <div className="view-design-item">
                            <strong>Requirements:</strong>
                            <ul>
                                {baselineRequirements
                                    .filter((req) => designData.requirement_id.includes(req.requirement_id))
                                    .map((req) => (
                                        <li key={req.requirement_id}>{`REQ-00${req.requirement_id}: ${req.requirement_name}`}</li>
                                    ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <div className="view-design-container">
                <h1 className="history-design-topic">History Design: {designData.diagram_name}</h1>
                {historyData.length > 0 ? (
                    <table className="history-table-design">
                        <thead>
                            <tr>
                                <th>Requirement Status</th>
                                <th>Date</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyData.map((history) => (
                                <tr key={history.history_id}>
                                    <td>{history.design_status}</td>
                                    <td>{formatDateTime(history.design_at).split(' ')[0]}</td>
                                    <td>{formatDateTime(history.design_at).split(' ')[1]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No history available</p>
                )}
            </div>
        </>
    );
};

export default ViewDesignTrace;
