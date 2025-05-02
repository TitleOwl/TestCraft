import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import './CSS/ProjectConfig.css'; // Keep CSS import
// import fetchFileIcon from "../Components/Implement/image/fetch-file.png"; // Removed: Implementation specific
import { toast } from "react-toastify";

// Removed FileTree Component - Was only used by FileExplorer

// CriteriaSection Component (Keep as it's used by other tabs)
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

                            return (
                                <li key={id} className="criteria-item">
                                    <span className="criteria-text">{name || `(ID: ${id})`}</span>
                                    <button
                                        className="criteria-delete-button"
                                        onClick={() => handleDelete(id, type)} // Pass type here
                                        title="Delete"
                                    >
                                        <span>✕</span>
                                    </button>
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

// Removed GitHubConfig Component - Was implementation specific
// Removed FileExplorer Component - Was implementation specific

const ProjectConfig = () => {
    // Tab state
    const [activeTab, setActiveTab] = useState("requirements"); // Default to requirements

    // Requirements criteria state
    const [newReqCriteria, setNewReqCriteria] = useState("");
    const [reqcriList, setReqcriList] = useState([]);
    const [loadingReq, setLoadingReq] = useState(true);

    // Design criteria state
    const [newDesignCriteria, setNewDesignCriteria] = useState("");
    const [designCriList, setDesignCriList] = useState([]);
    const [loadingDesign, setLoadingDesign] = useState(true);

    // Testcase criteria state
    const [newTestcaseCriteria, setNewTestcaseCriteria] = useState("");
    const [testcaseCriList, setTestcaseCriList] = useState([]);
    const [loadingTestcase, setLoadingTestcase] = useState(true);

    // Trace criteria state
    const [newTraceabilityCriteria, setNewTraceabilityCriteria] = useState("");
    const [traceabilityCriList, setTraceabilityCriList] = useState([]);
    const [loadingTraceability, setLoadingTraceability] = useState(true);

    // --- Removed GitHub repository state ---
    // const [repoLink, setRepoLink] = useState('');
    // const [fileNames, setFileNames] = useState([]);
    // const [loading, setLoading] = useState(false); // Might be reused? Check usage. Let's assume not needed for now.
    // const [expandedFolders, setExpandedFolders] = useState([]);
    // const [branches, setBranches] = useState([]);
    // const [selectedBranch, setSelectedBranch] = useState('');
    // const [searchTerm, setSearchTerm] = useState("");

    // Project state (Keep projectId)
    const [projectId, setProjectId] = useState(null);
    // const [implementConfig, setImplementConfig] = useState(null); // Removed
    // const [configId, setConfigId] = useState(null); // Removed
    // const [isSaved, setIsSaved] = useState(false); // Removed

    // const apiToken = process.env.REACT_APP_API_TOKEN; // Removed: Only used for GitHub fetch
    const location = useLocation();
    const navigate = useNavigate();

    // --- Removed filterFiles function ---

    // Initialize projectId from URL params
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const id = queryParams.get('project_id');
        if (id) {
            setProjectId(id);
        } else {
            console.error("Project ID not found in URL.");
            toast.error("Project ID is missing. Cannot load configuration.");
            // Optionally navigate away or show an error message component
            // navigate('/error-page');
        }
    }, [location]);

    // Fetch data based on projectId (Removed fetchImplementConfig call)
    useEffect(() => {
        if (projectId) {
            fetchReqCriteria(projectId);
            fetchDesignCriteria(projectId);
            fetchTestcaseCriteria(projectId);
            // fetchImplementConfig(projectId); // Removed
            fetchTraceabilityCriteria(projectId);
        }
        // Reset lists if projectId becomes null (e.g., navigating away)
        else {
            setReqcriList([]);
            setDesignCriList([]);
            setTestcaseCriList([]);
            setTraceabilityCriList([]);
        }
    }, [projectId]);

    // --- Removed useEffect hooks related to repoLink and implementConfig ---

    // --- Removed fetchImplementConfig function ---
    // --- Removed fetchBranchesFromRepo function ---
    // --- Removed handleRepoLinkChange function ---
    // --- Removed toggleFolder function ---
    // --- Removed isSourceCodeFile, isIgnoredFolder, isIgnoredFile functions ---
    // --- Removed fetchFilesFromRepo function ---
    // --- Removed buildFileTree function ---
    // --- Removed fetchFolderContents function ---


    // Fetch requirement criteria
    const fetchReqCriteria = async (projectId) => {
        setLoadingReq(true); // Set loading true at the start
        try {
            const response = await axios.get(`http://localhost:3001/reqcriteria`, {
                params: { project_id: projectId }
            });
            setReqcriList(response.data || []); // Ensure it's an array
        } catch (error) {
            console.error("Error fetching requirement criteria:", error);

             setReqcriList([]); // Set empty on error
        } finally {
            setLoadingReq(false);
        }
    };

    // Fetch design criteria
    const fetchDesignCriteria = async (projectId) => {
         setLoadingDesign(true);
        try {
            const response = await axios.get(`http://localhost:3001/designcriteria/${projectId}`);
            setDesignCriList(response.data || []); // Ensure it's an array
        } catch (error) {
            console.error("Error fetching design criteria:", error);
             setDesignCriList([]); // Set empty on error
        } finally {
            setLoadingDesign(false);
        }
    };

    // Fetch testcase criteria
    const fetchTestcaseCriteria = async (projectId) => {
        if (!projectId) return;
        setLoadingTestcase(true);
        try {
            const response = await axios.get(`http://localhost:3001/testcasecriteria/${projectId}`);
            setTestcaseCriList(response.data || []); // Ensure it's an array
        } catch (error) {
            console.error("Error fetching testcase criteria:", error);
             setTestcaseCriList([]); // Set empty on error
        } finally {
            setLoadingTestcase(false);
        }
    };

    // Fetch traceability criteria
    const fetchTraceabilityCriteria = async (projectId) => {
        if (!projectId) return;
         setLoadingTraceability(true);
        try {
            const response = await axios.get(`http://localhost:3001/tracecriteria/${projectId}`);
            // Adjust based on actual API response structure
            if (Array.isArray(response.data)) {
                setTraceabilityCriList(response.data);
            } else if (response.data && Array.isArray(response.data.data)) { // Example structure { success: true, data: [] }
                setTraceabilityCriList(response.data.data);
            } else {
                console.warn("Received unexpected data structure for traceability criteria:", response.data);
                setTraceabilityCriList([]);
            }
        } catch (error) {
            console.error("Error fetching traceability criteria:", error);
            setTraceabilityCriList([]); // Set empty on error
        } finally {
            setLoadingTraceability(false);
        }
    };


    // Add requirement criteria
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
            const response = await axios.post("http://localhost:3001/reqcriteria", {
                reqcri_name: newReqCriteria,
                project_id: projectId // Ensure projectId is sent
            });

            // Use returned ID if available, otherwise refetch might be needed
            const insertedId = response.data?.data?.insertId;
            if (insertedId) {
                setReqcriList((prevList) => [
                    ...prevList,
                    {
                        reqcri_id: insertedId,
                        reqcri_name: newReqCriteria,
                        project_id: projectId,
                    },
                ]);
                setNewReqCriteria(""); // Clear input on success
                toast.success("Requirement criteria added.");
            } else {
                 toast.warn("Criteria added, but couldn't get ID immediately. Refetching list.");
                 fetchReqCriteria(projectId); // Refetch if ID isn't returned directly
                 setNewReqCriteria("");
            }
        } catch (error) {
            console.error("Error adding requirement criteria:", error);
            toast.error(`Failed to add requirement criteria: ${error.response?.data?.message || error.message}`);
        }
    };

    // Add design criteria
    const handleAddDesignCriteria = async () => {
        if (!newDesignCriteria.trim()) {
            toast.warn("Please enter a design criteria name.");
            return;
        }
        if (!projectId) {
            toast.error("Project ID is missing, cannot add criteria.");
            return;
        }
        try {
             const response = await axios.post("http://localhost:3001/designcriteria", {
                design_cri_name: newDesignCriteria,
                project_id: projectId
            });

             const insertedId = response.data?.data?.insertId;
             if (insertedId) {
                 setDesignCriList((prevList) => [
                    ...prevList,
                    {
                        design_cri_id: insertedId,
                        design_cri_name: newDesignCriteria,
                        project_id: projectId,
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

    // Add testcase criteria
    const handleAddTestcaseCriteria = async () => {
        if (!newTestcaseCriteria.trim()) {
            toast.warn("Please enter a testcase criteria name.");
            return;
        }
        if (!projectId) {
             toast.error("Project ID is missing, cannot add criteria.");
            return;
        }

        try {
             const response = await axios.post("http://localhost:3001/testcasecriteria", {
                testcasecri_name: newTestcaseCriteria,
                project_id: projectId,
            });

            const insertedId = response.data?.data?.insertId;
             if (insertedId) {
                setTestcaseCriList((prevList) => [
                    ...prevList,
                    {
                        testcasecri_id: insertedId,
                        testcasecri_name: newTestcaseCriteria,
                        project_id: projectId,
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

    // Add traceability criteria
    const handleAddTraceabilityCriteria = async () => {
        if (!newTraceabilityCriteria.trim()) {
             toast.warn("Please enter a traceability criteria name.");
            return;
        }
        if (!projectId) {
             toast.error("Project ID is missing, cannot add criteria.");
            return;
        }

        try {
             const response = await axios.post('http://localhost:3001/tracecriteria', {
                tracecriteria_name: newTraceabilityCriteria,
                project_id: projectId
            });

             const insertedId = response.data?.data?.insertId;
             if (insertedId) {
                setTraceabilityCriList((prevList) => [
                    ...prevList,
                    {
                        tracecriteria_id: insertedId,
                        tracecriteria_name: newTraceabilityCriteria,
                        project_id: projectId,
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


    // Generic Delete Handler (Handles all criteria types)
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

        // Confirmation dialog
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

        console.log(`Attempting to DELETE ${endpoint} with project_id in body data`);

        try {
            // Send project_id in the 'data' property for DELETE requests using Axios
            const response = await axios.delete(endpoint, {
                data: { project_id: projectId } // Pass project_id in the request body
            });

            console.log('Delete response status:', response.status);

            // Handle successful deletion (200 OK or 204 No Content typically)
            if (response.status === 200 || response.status === 204) {
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} criteria deleted successfully.`);

                // Update the corresponding list in the state
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
                    default: break; // Should not happen due to earlier check
                }
            } else {
                // Handle unexpected success status codes
                toast.warning(`Delete request completed but returned status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error deleting ${type} criteria (ID: ${id}):`, error);
             // Provide specific feedback if possible
            const errorMsg = error.response?.data?.message || error.message || "An unknown error occurred";
            toast.error(`Failed to delete ${type} criteria: ${errorMsg}`);
        }
    };

    // --- Removed handleUpdateImplementConfig function ---
    // --- Removed handleSaveImplementConfig function ---
    // --- Removed console.log("Traceability List State:", traceabilityCriList); ---

    // Render tab content based on active tab (Removed 'implementation' case)
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
                        handleDelete={handleDelete} // Pass the generic handler
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
                        handleDelete={handleDelete} // Pass the generic handler
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
                        handleDelete={handleDelete} // Pass the generic handler
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
                        handleDelete={handleDelete} // Pass the generic handler
                        type="traceability"
                    />
                );
            // case "implementation": // Removed Implementation case
            //     return ( /* Implementation JSX was here */ );
            default:
                toast.warn(`Unknown tab selected: ${activeTab}. Defaulting to Requirements.`);
                 setActiveTab("requirements"); // Optionally reset to default if state is somehow invalid
                 return null; // Return null or default content while resetting
        }
    };

    return (
        <div className="project-config">
            <header className="config-header">
                <h1>Project Configuration</h1>
                <div className="header-actions">
                    {/* Actions relevant to all tabs can go here */}
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
                    {/* Removed Implementation Button */}
                    {/* <button
                        className={`tab ${activeTab === "implementation" ? "active" : ""}`}
                        onClick={() => setActiveTab("implementation")}
                    >
                        Implementation
                    </button> */}
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
                </div>
            </div>

            <main className="config-content">
                <div className="tab-content">
                     {/* Display message while waiting for projectId */}
                     {!projectId ? (
                        <div className="loading-container">
                            <p>Waiting for Project ID...</p>
                        </div>
                    ) : (
                        renderTabContent() // Render content only if projectId exists
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProjectConfig;