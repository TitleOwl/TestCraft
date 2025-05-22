import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import './CSS/ProjectConfig.css';
import { toast } from "react-toastify";
import DeletionLogSection from "../Components/DeletionLogSection";

const CriteriaSection = ({ title, newCriteria, setNewCriteria, criteriaList, loading, handleAdd, handleDelete, type }) => {
    return (
        <div className="criteria-section">
            <div className="criteria-header">
                <h2>{title}</h2>
                <div className="divider"></div>
            </div>

            <div className="criteria-input-container">
                <input
                    type="text"
                    value={newCriteria}
                    onChange={(e) => setNewCriteria(e.target.value)}
                    placeholder="Add New Criteria"
                    className="criteria-input"
                />
                <button
                    className="criteria-add-button"
                    onClick={handleAdd}
                >
                    <span className="add-icon">+</span>
                    <span>Add</span>
                </button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading criteria...</p>
                </div>
            ) : (
                <ul className="criteria-list">
                    {criteriaList && criteriaList.length > 0 ? (
                        criteriaList.map((criteria) => {
                            const id = type === "requirement" ? criteria.reqcri_id :
                                type === "design" ? criteria.design_cri_id :
                                    type === "testcase" ? criteria.testcasecri_id :
                                        type === "traceability" ? criteria.tracecriteria_id : null;

                            const name = type === "requirement" ? criteria.reqcri_name :
                                type === "design" ? criteria.design_cri_name :
                                    type === "testcase" ? criteria.testcasecri_name :
                                        type === "traceability" ? criteria.tracecriteria_name : '';

                            if (!id) {
                                console.warn("CriteriaSection: Could not determine ID for item. Check 'type' prop.", { type, criteria });
                                return null;
                            }

                            const updatedBy = criteria.last_updated_by || criteria.created_by || "Unknown";
                            const updatedAt = criteria.last_updated_at || criteria.created_at || null;
                            const formattedDate = updatedAt ? new Date(updatedAt).toLocaleString() : "Unknown date";

                            return (
                                <li key={id} className="criteria-item" style={{ display: "flex", justifyContent: "space-between", flexDirection: "column", padding: "8px 12px", borderBottom: "1px solid #ccc" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span className="criteria-text">{name || `(ID: ${id})`}</span>
                                        <button
                                            className="criteria-delete-button"
                                            onClick={() => handleDelete(id, type)}
                                            title="Delete"
                                            style={{ cursor: "pointer", color: "red", border: "none", background: "transparent", fontSize: "16px" }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <small style={{ color: "#666", marginTop: "4px", fontStyle: "italic" }}>
                                        Created by <strong>{updatedBy}</strong> on <strong>{formattedDate}</strong>
                                    </small>
                                </li>
                            );
                        })
                    ) : (
                        <li className="no-criteria">No criteria added yet</li>
                    )}
                </ul>
            )}
        </div>
    );
};


const ProjectConfig = () => {
    const [activeTab, setActiveTab] = useState("requirements");

    const [newReqCriteria, setNewReqCriteria] = useState("");
    const [reqcriList, setReqcriList] = useState([]);
    const [loadingReq, setLoadingReq] = useState(true);

    const [newDesignCriteria, setNewDesignCriteria] = useState("");
    const [designCriList, setDesignCriList] = useState([]);
    const [loadingDesign, setLoadingDesign] = useState(true);

    const [newTestcaseCriteria, setNewTestcaseCriteria] = useState("");
    const [testcaseCriList, setTestcaseCriList] = useState([]);
    const [loadingTestcase, setLoadingTestcase] = useState(true);

    const [newTraceabilityCriteria, setNewTraceabilityCriteria] = useState("");
    const [traceabilityCriList, setTraceabilityCriList] = useState([]);
    const [loadingTraceability, setLoadingTraceability] = useState(true);
    const [deletionLogs, setDeletionLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [selectedLogTableName, setSelectedLogTableName] = useState('requirement_criteria'); // Default table to show logs for
    const storedUsername = localStorage.getItem("username");

    const [projectId, setProjectId] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => {
        if (activeTab === "deletion_logs" && projectId && selectedLogTableName) {
            fetchDeletionLogs(selectedLogTableName);
        } else {
            setDeletionLogs([]); // Clear logs if not on deletion_logs tab
        }
    }, [activeTab, projectId, selectedLogTableName]); // Add selectedLogTableName as dependency

    // New fetch function for deletion logs
    const fetchDeletionLogs = async (tableName) => {
        setLoadingLogs(true);
        try {
            const response = await axios.get(`http://localhost:3001/deletionlogs`, {
                params: { table_name: tableName }
            });
            // Make sure the data structure matches your API response { data: results }
            setDeletionLogs(response.data.data || []);
        } catch (error) {
            console.error("Error fetching deletion logs:", error);
            toast.error(`Failed to fetch deletion logs for ${tableName}: ${error.response?.data?.message || error.message}`);
            setDeletionLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    };
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const id = queryParams.get('project_id');
        if (id) {
            setProjectId(id);
        } else {
            console.error("Project ID not found in URL.");
            toast.error("Project ID is missing. Cannot load configuration.");
        }
    }, [location]);

    useEffect(() => {
        if (projectId) {
            fetchReqCriteria(projectId);
            fetchDesignCriteria(projectId);
            fetchTestcaseCriteria(projectId);
            fetchTraceabilityCriteria(projectId);
        } else {
            setReqcriList([]);
            setDesignCriList([]);
            setTestcaseCriList([]);
            setTraceabilityCriList([]);
        }
    }, [projectId]);

    const fetchReqCriteria = async (projectId) => {
        setLoadingReq(true);
        try {
            const response = await axios.get(`http://localhost:3001/reqcriteria`, {
                params: { project_id: projectId }
            });
            setReqcriList(response.data || []);
        } catch (error) {
            console.error("Error fetching requirement criteria:", error);
            setReqcriList([]);
        } finally {
            setLoadingReq(false);
        }
    };

    const fetchDesignCriteria = async (projectId) => {
        setLoadingDesign(true);
        try {
            const response = await axios.get(`http://localhost:3001/designcriteria/${projectId}`);
            setDesignCriList(response.data || []);
        } catch (error) {
            console.error("Error fetching design criteria:", error);
            setDesignCriList([]);
        } finally {
            setLoadingDesign(false);
        }
    };

    const fetchTestcaseCriteria = async (projectId) => {
        if (!projectId) return;
        setLoadingTestcase(true);
        try {
            const response = await axios.get(`http://localhost:3001/testcasecriteria/${projectId}`);
            setTestcaseCriList(response.data || []);
        } catch (error) {
            console.error("Error fetching testcase criteria:", error);
            setTestcaseCriList([]);
        } finally {
            setLoadingTestcase(false);
        }
    };

    const fetchTraceabilityCriteria = async (projectId) => {
        if (!projectId) return;
        setLoadingTraceability(true);
        try {
            const response = await axios.get(`http://localhost:3001/tracecriteria/${projectId}`);
            if (Array.isArray(response.data)) {
                setTraceabilityCriList(response.data);
            } else if (response.data && Array.isArray(response.data.data)) {
                setTraceabilityCriList(response.data.data);
            } else {
                console.warn("Received unexpected data structure for traceability criteria:", response.data);
                setTraceabilityCriList([]);
            }
        } catch (error) {
            console.error("Error fetching traceability criteria:", error);
            setTraceabilityCriList([]);
        } finally {
            setLoadingTraceability(false);
        }
    };


    const handleAddReqCriteria = async () => {
        if (!newReqCriteria.trim()) {
            toast.warn("Please enter a requirement criteria name.");
            return;
        }
        if (!projectId) {
            toast.error("Project ID is missing, cannot add criteria.");
            return;
        }

        try {
            const response = await axios.post('http://localhost:3001/reqcriteria', {
                reqcri_name: newReqCriteria,
                project_id: projectId,
                created_by: storedUsername
            });

            const insertedId = response.data?.data?.insertId;
            if (insertedId) {
                setReqcriList((prevList) => [
                    ...prevList,
                    {
                        reqcri_id: insertedId,
                        reqcri_name: newReqCriteria,
                        project_id: projectId,
                        created_by: storedUsername,
                        created_at: new Date().toISOString(),
                    },
                ]);
                setNewReqCriteria("");
                toast.success("Requirement criteria added.");
            } else {
                toast.warn("Criteria added, but couldn't get ID immediately. Refetching list.");
                fetchReqCriteria(projectId); // Changed to fetchReqCriteria
                setNewReqCriteria("");
            }
        } catch (error) {
            console.error("Error adding requirement criteria:", error);
            toast.error(`Failed to add requirement criteria: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleAddDesignCriteria = async () => {
        if (!newDesignCriteria.trim()) {
            toast.warn("Please enter a design criteria name.");
            return;
        }
        if (!projectId) {
            toast.error("Project ID is missing, cannot add criteria.");
            return;
        }

        const username = localStorage.getItem("username");
        if (!username) {
            toast.error("User not logged in. Cannot add criteria.");
            return;
        }

        try {
            const response = await axios.post("http://localhost:3001/designcriteria", {
                design_cri_name: newDesignCriteria,
                project_id: projectId,
                last_updated_by: username,
            });

            const insertedId = response.data?.data?.insertId;
            if (insertedId) {
                setDesignCriList((prevList) => [
                    ...prevList,
                    {
                        design_cri_id: insertedId,
                        design_cri_name: newDesignCriteria,
                        project_id: projectId,
                        last_updated_by: username,
                        last_updated_at: new Date().toISOString(),
                    },
                ]);
                setNewDesignCriteria("");
                toast.success("Design criteria added.");
            } else {
                toast.warn("Criteria added, but couldn't get ID immediately. Refetching list.");
                fetchDesignCriteria(projectId);
                setNewDesignCriteria("");
            }
        } catch (error) {
            console.error("Error adding design criteria:", error);
            toast.error(`Failed to add design criteria: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleAddTestcaseCriteria = async () => {
        if (!newTestcaseCriteria.trim()) {
            toast.warn("Please enter a testcase criteria name.");
            return;
        }
        if (!projectId) {
            toast.error("Project ID is missing, cannot add criteria.");
            return;
        }

        const username = localStorage.getItem("username");
        if (!username) {
            toast.error("User not logged in. Cannot add criteria.");
            return;
        }

        try {
            const response = await axios.post("http://localhost:3001/testcasecriteria", {
                testcasecri_name: newTestcaseCriteria,
                project_id: projectId,
                last_updated_by: username,
            });

            const insertedId = response.data?.data?.insertId;
            if (insertedId) {
                setTestcaseCriList((prevList) => [
                    ...prevList,
                    {
                        testcasecri_id: insertedId,
                        testcasecri_name: newTestcaseCriteria,
                        project_id: projectId,
                        last_updated_by: username,
                        last_updated_at: new Date().toISOString(),
                    },
                ]);
                setNewTestcaseCriteria("");
                toast.success("Testcase criteria added.");
            } else {
                toast.warn("Criteria added, but couldn't get ID immediately. Refetching list.");
                fetchTestcaseCriteria(projectId);
                setNewTestcaseCriteria("");
            }
        } catch (error) {
            console.error("Error adding testcase criteria:", error);
            toast.error(`Failed to add testcase criteria: ${error.response?.data?.message || error.message}`);
        }
    };



    const handleAddTraceabilityCriteria = async () => {
        if (!newTraceabilityCriteria.trim()) {
            toast.warn("Please enter a traceability criteria name.");
            return;
        }
        if (!projectId) {
            toast.error("Project ID is missing, cannot add criteria.");
            return;
        }
        const currentUsername = localStorage.getItem("username");

        try {
            const response = await axios.post('http://localhost:3001/tracecriteria', {
                tracecriteria_name: newTraceabilityCriteria,
                project_id: projectId,
                last_updated_by: currentUsername
            });

            const insertedId = response.data?.data?.insertId;
            if (insertedId) {
                setTraceabilityCriList((prevList) => [
                    ...prevList,
                    {
                        tracecriteria_id: insertedId,
                        tracecriteria_name: newTraceabilityCriteria,
                        project_id: projectId,
                        last_updated_by: currentUsername,
                        last_updated_at: new Date().toISOString(),
                    },
                ]);
                setNewTraceabilityCriteria("");
                toast.success("Traceability criteria added.");
            } else {
                toast.warn("Criteria added, but couldn't get ID immediately. Refetching list.");
                fetchTraceabilityCriteria(projectId);
                setNewTraceabilityCriteria("");
            }
        } catch (error) {
            console.error("Error adding traceability criteria:", error);
            toast.error(`Failed to add traceability criteria: ${error.response?.data?.message || error.message}`);
        }
    };


    const handleDelete = async (id, type) => {
        if (!projectId) {
            console.error("Project ID is missing. Cannot delete.");
            toast.error("Cannot delete criteria: Project ID is missing.");
            return;
        }
        if (!id || !type) {
            console.error("Cannot delete: ID or type is missing.", { id, type });
            toast.error("Cannot delete criteria: Missing ID or type.");
            return;
        }

        if (!window.confirm(`Are you sure you want to delete this ${type} criteria? (ID: ${id})`)) {
            return;
        }

        let endpoint = "";
        switch (type) {
            case "requirement": endpoint = `http://localhost:3001/reqcriteria/${id}`; break;
            case "design": endpoint = `http://localhost:3001/designcriteria/${id}`; break;
            case "testcase": endpoint = `http://localhost:3001/testcasecriteria/${id}`; break;
            case "traceability": endpoint = `http://localhost:3001/tracecriteria/${id}`; break;
            default:
                console.error("Invalid criteria type for delete:", type);
                toast.error(`Cannot delete: Invalid criteria type "${type}".`);
                return;
        }

        // Get the current logged-in username
        const deletedBy = localStorage.getItem('username') || 'Unknown User';

        console.log(`Attempting to DELETE ${endpoint} with project_id and deleted_by in body data`);

        try {
            const response = await axios.delete(endpoint, {
                data: {
                    project_id: projectId, // Pass project_id in the request body
                    deleted_by: deletedBy // Pass the username to the backend
                }
            });

            console.log('Delete response status:', response.status);

            if (response.status === 200 || response.status === 204) {
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} criteria deleted successfully.`);

                switch (type) {
                    case "requirement":
                        setReqcriList((prevList) => prevList.filter(item => item.reqcri_id !== id));
                        break;
                    case "design":
                        setDesignCriList((prevList) => prevList.filter(item => item.design_cri_id !== id));
                        break;
                    case "testcase":
                        setTestcaseCriList((prevList) => prevList.filter(item => item.testcasecri_id !== id));
                        break;
                    case "traceability":
                        setTraceabilityCriList((prevList) => prevList.filter(item => item.tracecriteria_id !== id));
                        break;
                    default: break;
                }
            } else {
                toast.warning(`Delete request completed but returned status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error deleting ${type} criteria (ID: ${id}):`, error);
            const errorMsg = error.response?.data?.message || error.message || "An unknown error occurred";
            toast.error(`Failed to delete ${type} criteria: ${errorMsg}`);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "requirements":
                return (
                    <CriteriaSection
                        title="Software Requirement Specification Verification Criteria"
                        newCriteria={newReqCriteria}
                        setNewCriteria={setNewReqCriteria}
                        criteriaList={reqcriList}
                        loading={loadingReq}
                        handleAdd={handleAddReqCriteria}
                        handleDelete={handleDelete}
                        type="requirement"
                    />
                );
            case "design":
                return (
                    <CriteriaSection
                        title="Software Design Verification Criteria"
                        newCriteria={newDesignCriteria}
                        setNewCriteria={setNewDesignCriteria}
                        criteriaList={designCriList}
                        loading={loadingDesign}
                        handleAdd={handleAddDesignCriteria}
                        handleDelete={handleDelete}
                        type="design"
                    />
                );
            case "testcase":
                return (
                    <CriteriaSection
                        title="Testcase Verification Criteria"
                        newCriteria={newTestcaseCriteria}
                        setNewCriteria={setNewTestcaseCriteria}
                        criteriaList={testcaseCriList}
                        loading={loadingTestcase}
                        handleAdd={handleAddTestcaseCriteria}
                        handleDelete={handleDelete}
                        type="testcase"
                    />
                );
            case "traceability":
                return (
                    <CriteriaSection
                        title="Traceability Verification Criteria"
                        newCriteria={newTraceabilityCriteria}
                        setNewCriteria={setNewTraceabilityCriteria}
                        criteriaList={traceabilityCriList}
                        loading={loadingTraceability}
                        handleAdd={handleAddTraceabilityCriteria}
                        handleDelete={handleDelete}
                        type="traceability"
                    />
                );
            case "deletion_logs":
                return (
                    <DeletionLogSection
                        deletionLogs={deletionLogs}
                        loading={loadingLogs}
                        selectedLogTableName={selectedLogTableName}
                        setSelectedLogTableName={setSelectedLogTableName}
                    />
                );
            default:
                toast.warn(`Unknown tab selected: ${activeTab}. Defaulting to Requirements.`);
                setActiveTab("requirements");
                return null;
        }
    };

    return (
        <div className="project-config">
            <header className="config-header">
                <h1>Verification Criteria Setting</h1>
                <div className="header-actions">
                </div>
            </header>

            <div className="tabs-container">
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === "requirements" ? "active" : ""}`}
                        onClick={() => setActiveTab("requirements")}
                    >
                        Requirements
                    </button>
                    <button
                        className={`tab ${activeTab === "design" ? "active" : ""}`}
                        onClick={() => setActiveTab("design")}
                    >
                        Design
                    </button>
                    <button
                        className={`tab ${activeTab === "testcase" ? "active" : ""}`}
                        onClick={() => setActiveTab("testcase")}
                    >
                        Testcase
                    </button>
                    <button
                        className={`tab ${activeTab === "traceability" ? "active" : ""}`}
                        onClick={() => setActiveTab("traceability")}
                    >
                        Traceability
                    </button>
                    <button
                        className={`tab ${activeTab === "deletion_logs" ? "active" : ""}`}
                        onClick={() => setActiveTab("deletion_logs")}
                    >
                        **Deletion Logs**
                    </button>
                </div>
            </div>

            <main className="config-content">
                <div className="tab-content">
                    {!projectId ? (
                        <div className="loading-container">
                            <p>Waiting for Project ID...</p>
                        </div>
                    ) : (
                        renderTabContent()
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProjectConfig;