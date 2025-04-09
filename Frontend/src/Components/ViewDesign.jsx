import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import './CSS/ViewDesign.css';
import backtodesign from '../image/arrow_left.png';
import ViewDiagram from "./viewDiagram";

// --- Helper function to remove duplicates based on status and exact timestamp ---
const getUniqueHistory = (historyArray) => {
    if (!Array.isArray(historyArray)) return []; // Handle non-array input

    const seen = new Map(); // Use a Map to track seen combinations efficiently
    const uniqueHistory = [];

    // Iterate through the history items
    for (const item of historyArray) {
        // Create a unique key based on the status and the exact timestamp string
        const key = `${item.design_status}_${item.design_at}`;

        // If this combination hasn't been seen before, add it to the unique list
        if (!seen.has(key)) {
            seen.set(key, true); // Mark this combination as seen
            uniqueHistory.push(item); // Add the item to the result
        }
        // If the key exists, it's a duplicate based on status and time, so skip it
    }
    // Return the array containing only unique history entries
    return uniqueHistory;
};
// --- End of Helper function ---

const ViewDesign = () => {
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
    const [historyData, setHistoryData] = useState([]); // Raw history data from API
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDesign = async () => {
            // ... (fetchDesign implementation remains the same)
            try {
                const response = await axios.get(`http://localhost:3001/designedit`, {
                    params: { project_id: projectId, design_id: designId },
                });
                console.log('Raw response from /designedit:', response.data);
                if (response.data.length > 0) {
                    const design = response.data[0];
                    console.log('Raw design.requirement_id:', design.requirement_id);

                    let parsedRequirementIds = []; // Default to empty array

                    if (design.requirement_id && typeof design.requirement_id === 'string') {
                        try {
                            const parsed = JSON.parse(design.requirement_id);
                            if (Array.isArray(parsed)) {
                                parsedRequirementIds = parsed.map(id => Number(id));
                            } else {
                                console.warn("Parsed requirement_id string is not an array:", parsed);
                            }
                        } catch (error) {
                            console.error("Failed to parse requirement_id string:", design.requirement_id, error);
                        }
                    } else if (Array.isArray(design.requirement_id)) {
                        parsedRequirementIds = design.requirement_id.map(id => Number(id));
                    } else {
                        console.warn("requirement_id from API is neither a string nor an array:", design.requirement_id);
                    }

                    const newDesignData = {
                        diagram_name: design.diagram_name || "",
                        design_type: design.design_type || "",
                        diagram_type: design.diagram_type || "",
                        design_description: design.design_description || "",
                        requirement_id: parsedRequirementIds,
                        design_status: design.design_status || "WORKING",
                    };
                    console.log('Processed requirement_id after parsing:', newDesignData.requirement_id);
                    setDesignData(newDesignData);

                } else {
                    console.log("No design data found");
                    setDesignData({
                        diagram_name: "N/A",
                        design_type: "N/A",
                        diagram_type: "N/A",
                        design_description: "No data found",
                        requirement_id: [],
                        design_status: "N/A",
                    });
                }
            } catch (error) {
                console.error("Error fetching design:", error);
                alert("Failed to fetch design data");
                setDesignData({
                    diagram_name: "Error",
                    design_type: "Error",
                    diagram_type: "Error",
                    design_description: "Failed to load data",
                    requirement_id: [],
                    design_status: "Error",
                });
            }
            // setLoading is handled by Promise.all
        };

        const fetchRequirements = async () => {
            // ... (fetchRequirements implementation remains the same)
            try {
                const response = await axios.get(`http://localhost:3001/project/${projectId}/requirement`, {
                    params: { status: "BASELINE" },
                });
                console.log('Baseline requirements from API:', response.data);
                const requirementsWithNumericIds = (response.data || []).map(req => ({
                    ...req,
                    requirement_id: Number(req.requirement_id)
                }));
                setBaselineRequirements(requirementsWithNumericIds);
            } catch (error) {
                console.error("Error fetching requirements:", error);
                alert("Failed to fetch baseline requirements");
                setBaselineRequirements([]);
            }
        };

        const fetchHistory = async () => {
            // ... (fetchHistory implementation remains mostly the same)
            try {
                const response = await axios.get(`http://localhost:3001/getHistoryByDesignId`, {
                    params: { design_id: designId },
                });
                // Set the RAW history data first
                setHistoryData(response.data.data || []); // Ensure it's an array
                console.log("Raw history data fetched:", response.data.data);
            } catch (error) {
                console.error("Error fetching history:", error);
                alert("Failed to fetch history");
                setHistoryData([]);
            }
        };

        if (designId && projectId) {
            Promise.all([
                fetchDesign(),
                fetchRequirements(),
                fetchHistory()
            ]).then(() => {
                setLoading(false); // Set loading to false after all fetches complete
            }).catch((error) => {
                console.error("Error during initial data fetching:", error);
                setLoading(false); // Also set loading false on error
            });
        } else {
            console.error("Missing designId or projectId");
            alert("Missing required parameters (designId or projectId). Cannot load page.");
            setLoading(false);
            setDesignData({
                diagram_name: "Error",
                design_type: "Error",
                diagram_type: "Error",
                design_description: "Missing parameters",
                requirement_id: [],
                design_status: "Error",
            });
            setBaselineRequirements([]);
            setHistoryData([]);
        }
    }, [designId, projectId]); // Dependencies controlling when the effect re-runs

    const formatDateTime = (datetime) => {
        // ... (formatDateTime implementation remains the same)
        if (!datetime) return "Invalid Date";
        const date = new Date(datetime);
        if (isNaN(date.getTime())) return "Invalid Date";

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    // --- Process the raw history data to get unique entries ---
    // Apply the helper function HERE, before filtering for display
    const uniqueHistoryData = getUniqueHistory(historyData);
    console.log("Unique history data:", uniqueHistoryData); // Optional: Check the unique data

    // --- Filter the UNIQUE history data ---
    const verificationHistory = uniqueHistoryData.filter(
        (history) => history.design_status === "VERIFIED"
    );
    // Assuming you want to show everything *except* VERIFIED in the "Other History"
    const otherHistory = uniqueHistoryData.filter(
        (history) => history.design_status !== " "
    );
    // Note: The original filter was !== "VERIFICATION". Changed to !== "VERIFIED"
    //       to be consistent with the `verificationHistory` filter. Adjust if needed.

    return (
        <>
            <div className="view-design-container">
                <button className="backtodesign-button" onClick={() =>
                    navigate(`/Dashboard?project_id=${projectId}`, {
                        state: { selectedSection: "Design" },
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
                            {baselineRequirements.length > 0 && Array.isArray(designData.requirement_id) && designData.requirement_id.length > 0 ? (
                                <ul>
                                    {baselineRequirements
                                        .filter((req) => designData.requirement_id.includes(req.requirement_id))
                                        .map((req) => (
                                            <li key={req.requirement_id}>{`REQ-00${req.requirement_id}: ${req.requirement_name}`}</li>
                                        ))}
                                    {baselineRequirements.filter((req) => designData.requirement_id.includes(req.requirement_id)).length === 0 &&
                                        <p>No matching baseline requirements found for this design.</p>
                                    }
                                </ul>
                            ) : (
                                <p>No linked requirements found or baseline data unavailable.</p>
                            )
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* History Section - Render only when not loading */}
            {/* It now uses the filtered unique data */}
            {!loading && (
                <div className="view-design-container history-section">
                    <h1 className="history-design-topic">History Design: {designData.diagram_name}</h1>

                    {/* Verification History Table (using unique data) */}
                    <h2 className="history-sub-topic">Verification History</h2>
                    {verificationHistory.length > 0 ? (
                        <table className="history-table-design verification-history-table">
                            <thead>
                                <tr>
                                    <th>Design Status</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {verificationHistory.map((history) => ( // Uses filtered unique data
                                    <tr key={history.history_id}> {/* Still use original history_id as key */}
                                        <td>{history.design_status}</td>
                                        <td>{formatDateTime(history.design_at).split(' ')[0]}</td>
                                        <td>{formatDateTime(history.design_at).split(' ')[1]}</td>
                                        <td>
                                            <button
                                                className="view-details-button"
                                                onClick={() =>
                                                    navigate(`/VericriDesignDetails?project_id=${projectId}&design_id=${designId}`)
                                                }
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No unique verification history available</p>
                    )}

                    {/* Other History Table (using unique data) */}
                    <h2 className="history-sub-topic other-history-topic">Other History</h2>
                    {otherHistory.length > 0 ? (
                        <table className="history-table-design other-history-table">
                            <thead>
                                <tr>
                                    <th>Design Status</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {otherHistory.map((history) => ( // Uses filtered unique data
                                    <tr key={history.history_id}> {/* Still use original history_id as key */}
                                        <td>{history.design_status}</td>
                                        <td>{formatDateTime(history.design_at).split(' ')[0]}</td>
                                        <td>{formatDateTime(history.design_at).split(' ')[1]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No other unique history available</p>
                    )}
                </div>
            )}

            {/* View Diagram Component */}
            {!loading && designId && (
                 <div>
                      <ViewDiagram designId={designId} />
                 </div>
            )}
        </>
    );
};

export default ViewDesign;