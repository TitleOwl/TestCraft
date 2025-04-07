import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import './CSS/ProjectConfig.css';
import fetchFileIcon from "../Components/Implement/image/fetch-file.png";
import { toast } from "react-toastify";

// File Tree Component with enhanced styling
const FileTree = ({ files, onSelect, expandedFolders, toggleFolder, parentPath = "", filterText }) => {
    return (
        <ul className="file-tree">
            {files.map((item) => {
                const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;

                return (
                    <li key={fullPath} className="file-item">
                        {item.type === "folder" ? (
                            <>
                                <div
                                    className="folder-label"
                                    onClick={() => toggleFolder(fullPath)}
                                    aria-expanded={expandedFolders.includes(fullPath)}
                                >
                                    <span className="folder-icon">
                                        {expandedFolders.includes(fullPath) ? "📂" : "📁"}
                                    </span>
                                    <span className="folder-name">{item.name}</span>
                                </div>

                                {expandedFolders.includes(fullPath) && item.children ? (
                                    <FileTree
                                        files={item.children}
                                        onSelect={onSelect}
                                        expandedFolders={expandedFolders}
                                        toggleFolder={toggleFolder}
                                        parentPath={fullPath}
                                        filterText={filterText}
                                    />
                                ) : null}
                            </>
                        ) : (
                            expandedFolders.includes(parentPath) && (
                                <div className="file-label">
                                    <span className="file-icon">📄</span>
                                    <span className="file-name">{item.name}</span>
                                </div>
                            )
                        )}
                    </li>
                );
            })}
        </ul>
    );
};

// CriteriaSection Component for DRY code
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
                    {/* ใช้ criteriaList prop ที่ได้รับมา */}
                    {criteriaList && criteriaList.length > 0 ? (
                        criteriaList.map((criteria) => {
                            // เลือก ID และ Name ตาม 'type' prop ที่ได้รับมา

                            // --- *** แก้ไขจุดนี้ *** ---
                            const id = type === "requirement" ? criteria.reqcri_id :
                                type === "design" ? criteria.design_cri_id :
                                    type === "testcase" ? criteria.testcasecri_id :
                                        type === "traceability" ? criteria.tracecriteria_id : null; // <-- เปลี่ยนเป็น "traceability" และใส่ default null

                            const name = type === "requirement" ? criteria.reqcri_name :
                                type === "design" ? criteria.design_cri_name :
                                    type === "testcase" ? criteria.testcasecri_name :
                                        type === "traceability" ? criteria.tracecriteria_name : ''; // <-- เปลี่ยนเป็น "traceability" และใส่ default ''
                            // --- *** จบการแก้ไข *** ---


                            if (!id) { // ถ้าหา ID ไม่เจอ (อาจเพราะ type ผิดจากที่นี่ หรือส่ง prop มาผิด) ให้ข้ามไป
                                console.warn("CriteriaSection: Could not determine ID for item. Check 'type' prop.", { type, criteria });
                                return null;
                            }

                            return (
                                <li key={id} className="criteria-item">
                                    <span className="criteria-text">{name || `(ID: ${id})`}</span>
                                    <button
                                        className="criteria-delete-button"
                                        onClick={() => handleDelete(id, type)} // ใช้ handleDelete prop
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


// GitHub Repository Configuration Component
const GitHubConfig = ({ repoLink, handleRepoLinkChange, branches, selectedBranch, setSelectedBranch, configId, handleUpdateImplementConfig, handleSaveImplementConfig }) => {
    return (
        <div className="github-config">
            <div className="form-group">
                <label>GitHub Repository URL</label>
                <input
                    type="text"
                    value={repoLink}
                    onChange={handleRepoLinkChange}
                    placeholder="e.g., https://github.com/username/repository"
                    className="github-input"
                />
            </div>

            <div className="form-group">
                <label>Branch</label>
                <div className="select-wrapper">
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="branch-select"
                    >
                        <option value="">Select Branch</option>
                        {branches.map((branch) => (
                            <option key={branch.name} value={branch.name}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="action-buttons">
                {configId ? (
                    <button
                        onClick={handleUpdateImplementConfig}
                        className="update-button"
                    >
                        Update Repository Configuration
                    </button>
                ) : (
                    <button
                        onClick={handleSaveImplementConfig}
                        className="save-button"
                    >
                        Save Repository Configuration
                    </button>
                )}
            </div>
        </div>
    );
};

// File Explorer Component
const FileExplorer = ({ searchTerm, setSearchTerm, fetchFilesFromRepo, loading, repoLink, selectedBranch, fileNames, filteredFiles, expandedFolders, toggleFolder }) => {
    return (
        <div className="file-explorer">
            <div className="explorer-header">
                <h3>Repository Files</h3>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            <button
                onClick={fetchFilesFromRepo}
                disabled={loading || !repoLink || !selectedBranch}
                className="fetch-button"
            >
                <img src={fetchFileIcon} alt="Fetch" className="fetch-icon" />
                <span>{loading ? 'Loading Files...' : 'Fetch Repository Files'}</span>
            </button>

            <div className="file-container">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading files from repository...</p>
                    </div>
                ) : fileNames.length > 0 ? (
                    <FileTree
                        files={filteredFiles}
                        expandedFolders={expandedFolders}
                        toggleFolder={toggleFolder}
                    />
                ) : (
                    <div className="no-files">
                        <p>No files available</p>
                        <p className="no-files-hint">
                            Enter a GitHub repository URL, select a branch, and click "Fetch Repository Files"
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ProjectConfig = () => {
    // Tab state
    const [activeTab, setActiveTab] = useState("requirements");

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

    // GitHub repository state
    const [repoLink, setRepoLink] = useState('');
    const [fileNames, setFileNames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [searchTerm, setSearchTerm] = useState("");

    // Project state
    const [projectId, setProjectId] = useState(null);
    const [implementConfig, setImplementConfig] = useState(null);
    const [configId, setConfigId] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const apiToken = process.env.REACT_APP_API_TOKEN;
    const location = useLocation();
    const navigate = useNavigate();

    // Filter files function
    const filterFiles = (files, query) => {
        if (!query) return files;

        return files
            .map(file => {
                if (file.type === "folder") {
                    const filteredChildren = filterFiles(file.children || [], query);
                    if (file.name.toLowerCase().includes(query.toLowerCase()) || filteredChildren.length > 0) {
                        return { ...file, children: filteredChildren };
                    }
                    return null;
                }
                return file.name.toLowerCase().includes(query.toLowerCase()) ? file : null;
            })
            .filter(Boolean);
    };

    const filteredFiles = filterFiles(fileNames, searchTerm);

    // Initialize projectId from URL params
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const id = queryParams.get('project_id');
        if (id) {
            setProjectId(id);
        }
    }, [location]);

    // Fetch all data based on projectId
    useEffect(() => {
        if (projectId) {
            fetchReqCriteria(projectId);
            fetchDesignCriteria(projectId);
            fetchTestcaseCriteria(projectId);
            fetchImplementConfig(projectId);
            fetchTraceabilityCriteria(projectId);
        }
    }, [projectId]);

    // Fetch branches when repo link changes
    useEffect(() => {
        if (repoLink) {
            fetchBranchesFromRepo();
        }
    }, [repoLink]);

    // Update state when implementConfig changes
    useEffect(() => {
        if (implementConfig) {
            setRepoLink(implementConfig.githubLink);
            setSelectedBranch(implementConfig.githubBranch);
        }
    }, [implementConfig]);

    // Fetch implement config
    const fetchImplementConfig = async (projectId) => {
        try {
            const response = await axios.get(`http://localhost:3001/implementConfig/${projectId}`);
            if (response.data) {
                setImplementConfig(response.data);
                setConfigId(response.data.id);
                setRepoLink(response.data.githubLink);
                setSelectedBranch(response.data.githubBranch);
            }
        } catch (error) {
            console.error("Error fetching implement config:", error);
        }
    };

    // Fetch branches from GitHub
    const fetchBranchesFromRepo = async () => {
        if (!repoLink) return;
        const repoName = repoLink.replace('https://github.com/', '').replace('.git', '');
        const apiUrl = `https://api.github.com/repos/${repoName}/branches`;

        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${apiToken}`
                },
            });

            if (response.ok) {
                const data = await response.json();
                setBranches(data);
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    // Handle repo link change
    const handleRepoLinkChange = (event) => {
        setRepoLink(event.target.value);
    };

    // Toggle folder open/close
    const toggleFolder = (folderPath) => {
        setExpandedFolders((prev) => {
            if (prev.includes(folderPath)) {
                return prev.filter((path) => path !== folderPath);
            } else {
                return [...prev, folderPath];
            }
        });
    };

    // File filtering functions
    const isSourceCodeFile = (fileName) => {
        const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.html', '.css'];
        return allowedExtensions.some(ext => fileName.endsWith(ext));
    };

    const isIgnoredFolder = (folderName) => {
        const ignoredFolders = ['node_modules', '.git', '.github', 'dist', 'build', '__pycache__'];
        return ignoredFolders.includes(folderName);
    };

    const isIgnoredFile = (fileName) => {
        const ignoredFiles = ['package.json', 'package-lock.json', 'yarn.lock', '.gitignore', 'README.md'];
        return ignoredFiles.includes(fileName);
    };

    // Fetch files from GitHub
    const fetchFilesFromRepo = async () => {
        if (!repoLink || !selectedBranch) {
            alert("Please enter a repository link and select a branch");
            return;
        }

        const repoName = repoLink.replace('https://github.com/', '').replace('.git', '');
        const apiUrl = `https://api.github.com/repos/${repoName}/contents?ref=${selectedBranch}`;

        try {
            setLoading(true);
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${apiToken}`
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    const fileTree = await buildFileTree(repoName, data);
                    setFileNames(fileTree);
                    // Automatically expand the first level folders for better UX
                    const firstLevelFolders = data
                        .filter(item => item.type === 'dir' && !isIgnoredFolder(item.name))
                        .map(item => item.name);
                    setExpandedFolders(firstLevelFolders);
                }
            } else {
                throw new Error("Failed to fetch repository contents");
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert(`Error: ${error.message || "Failed to fetch repository contents"}`);
        } finally {
            setLoading(false);
        }
    };

    // Build file tree from GitHub API response
    const buildFileTree = async (repoName, items, parentPath = '') => {
        const tree = [];

        for (const item of items) {
            if (item.type === 'file' && isSourceCodeFile(item.name) && !isIgnoredFile(item.name)) {
                tree.push({ name: item.name, type: 'file', path: item.path });
            } else if (item.type === 'dir' && !isIgnoredFolder(item.name)) {
                const folderContents = await fetchFolderContents(repoName, item.path);
                tree.push({ name: item.name, type: 'folder', children: folderContents });
            }
        }

        return tree;
    };

    // Fetch folder contents from GitHub
    const fetchFolderContents = async (repoName, folderPath) => {
        const folderApiUrl = `https://api.github.com/repos/${repoName}/contents/${folderPath}`;

        try {
            const response = await fetch(folderApiUrl, {
                headers: {
                    'Authorization': `token ${apiToken}`
                },
            });

            const data = await response.json();
            if (Array.isArray(data)) {
                return await buildFileTree(repoName, data, folderPath);
            }
            return [];
        } catch (error) {
            console.error('Error fetching folder contents:', error);
            return [];
        }
    };

    // Fetch requirement criteria
    const fetchReqCriteria = async (projectId) => {
        try {
            setLoadingReq(true);
            const response = await axios.get(`http://localhost:3001/reqcriteria`, {
                params: { project_id: projectId }
            });
            setReqcriList(response.data);
        } catch (error) {
            console.error("Error fetching requirement criteria:", error);
        } finally {
            setLoadingReq(false);
        }
    };

    // Fetch design criteria
    const fetchDesignCriteria = async (projectId) => {
        try {
            setLoadingDesign(true);
            const response = await axios.get(`http://localhost:3001/designcriteria/${projectId}`);
            setDesignCriList(response.data);
        } catch (error) {
            console.error("Error fetching design criteria:", error);
        } finally {
            setLoadingDesign(false);
        }
    };

    // Fetch testcase criteria
    const fetchTestcaseCriteria = async (projectId) => {
        if (!projectId) return;

        try {
            setLoadingTestcase(true);
            const response = await axios.get(`http://localhost:3001/testcasecriteria/${projectId}`);
            setTestcaseCriList(response.data);
        } catch (error) {
            console.error("Error fetching testcase criteria:", error);
        } finally {
            setLoadingTestcase(false);
        }
    };

    const fetchTraceabilityCriteria = async (projectId) => {
        if (!projectId) return;
        try {
            // --- ใช้ Setter ที่ถูกต้อง ---
            setLoadingTraceability(true);
            const response = await axios.get(`http://localhost:3001/tracecriteria/${projectId}`);

            // --- ปรับการเช็ค response ให้เหมือนอันอื่น (คาดหวัง Array โดยตรง) ---
            if (Array.isArray(response.data)) { // สมมติว่า API คืน Array โดยตรง
                // --- ใช้ Setter ที่ถูกต้อง ---
                setTraceabilityCriList(response.data);
            } else if (response.data && Array.isArray(response.data.data)) { // หรือถ้า API คืน { success: true, data: [...] }
                setTraceabilityCriList(response.data.data);
            }
            else {
                console.error("Invalid data structure received for traceability criteria:", response.data);
                setTraceabilityCriList([]); // ตั้งค่าเป็น Array ว่างกรณีข้อมูลไม่ถูกต้อง
            }
        } catch (error) {
            console.error("Error fetching traceability criteria:", error);
            setTraceabilityCriList([]); // ตั้งค่าเป็น Array ว่างเมื่อเกิด Error
        } finally {
            // --- ใช้ Setter ที่ถูกต้อง ---
            setLoadingTraceability(false);
        }
    };


    // Add requirement criteria
    const handleAddReqCriteria = async () => {
        if (!newReqCriteria.trim()) {
            alert("Please enter a requirement criteria name");
            return;
        }
        if (!projectId) {
            alert("Project ID is required");
            return;
        }

        try {
            const response = await axios.post("http://localhost:3001/reqcriteria", {
                reqcri_name: newReqCriteria,
                project_id: projectId
            });

            if (response.status === 201) {
                setReqcriList((prevList) => [
                    ...prevList,
                    {
                        reqcri_id: response.data.data.insertId,
                        reqcri_name: newReqCriteria,
                        project_id: projectId,
                    },
                ]);
                setNewReqCriteria("");
            }
        } catch (error) {
            console.error("Error adding requirement criteria:", error);
            alert("Failed to add requirement criteria");
        }
    };

    // Add design criteria
    const handleAddDesignCriteria = async () => {
        if (newDesignCriteria.trim() === "") {
            alert("Please enter a design criteria name");
            return;
        }
        if (!projectId) {
            alert("Project ID is required");
            return;
        }
        try {
            const response = await axios.post("http://localhost:3001/designcriteria", {
                design_cri_name: newDesignCriteria,
                project_id: projectId
            });

            if (response.status === 201) {
                setDesignCriList((prevList) => [
                    ...prevList,
                    {
                        design_cri_id: response.data.data.insertId,
                        design_cri_name: newDesignCriteria,
                        project_id: projectId,
                    },
                ]);
                setNewDesignCriteria("");
            }
        } catch (error) {
            console.error("Error adding design criteria:", error);
            alert("Failed to add design criteria");
        }
    };

    // Add testcase criteria
    const handleAddTestcaseCriteria = async () => {
        if (newTestcaseCriteria.trim() === "") {
            alert("Please enter a testcase criteria name");
            return;
        }
        if (!projectId) {
            alert("Project ID is required");
            return;
        }

        try {
            const response = await axios.post("http://localhost:3001/testcasecriteria", {
                testcasecri_name: newTestcaseCriteria,
                project_id: projectId,
            });

            if (response.status === 201) {
                setTestcaseCriList((prevList) => [
                    ...prevList,
                    {
                        testcasecri_id: response.data.data.insertId,
                        testcasecri_name: newTestcaseCriteria,
                        project_id: projectId,
                    },
                ]);
                setNewTestcaseCriteria("");
            }
        } catch (error) {
            console.error("Error adding testcase criteria:", error);
            alert("Failed to add testcase criteria");
        }
    };

    const handleAddTraceabilityCriteria = async () => { // ไม่ต้องรับ argument ที่นี่
        // --- ใช้ State สำหรับค่าใหม่ ---
        if (!newTraceabilityCriteria.trim()) {
            alert("Please enter a traceability criteria name");
            return;
        }
        if (!projectId) {
            alert("Project ID is required");
            return;
        }

        try {
            const response = await axios.post('http://localhost:3001/tracecriteria', {
                // --- ใช้ State สำหรับค่าใหม่ ---
                tracecriteria_name: newTraceabilityCriteria,
                project_id: projectId
            });

            if (response.status === 201) {
                console.log('Tracecriteria created successfully:', response.data);
                // --- อัปเดต State traceabilityCriList ---
                // response.data.data ควรจะมี ID ที่เพิ่งสร้างกลับมา
                const insertedId = response.data?.data?.insertId; // ปรับตามโครงสร้าง response จริง
                if (insertedId) {
                    setTraceabilityCriList((prevList) => [
                        ...prevList,
                        {
                            tracecriteria_id: insertedId,
                            tracecriteria_name: newTraceabilityCriteria,
                            project_id: projectId,
                        },
                    ]);
                    setNewTraceabilityCriteria(""); // เคลียร์ Input field
                } else {
                    // ถ้าไม่มี ID กลับมา อาจจะต้อง fetch ใหม่
                    fetchTraceabilityCriteria(projectId);
                    setNewTraceabilityCriteria("");
                }
            } else {
                console.error('Failed to create tracecriteria:', response.data);
                alert("Failed to add traceability criteria");
            }
        } catch (error) {
            console.error("Error adding traceability criteria:", error);
            alert("Failed to add traceability criteria");
        }
    };


    const handleDelete = async (id, type) => {
        // --- ตรวจสอบว่ามี projectId ใน state ของ Component นี้ ---
        if (!projectId) { // projectId ควรเป็น state variable ใน ProjectConfig
            console.error("Project ID is missing in the component state. Cannot delete.");
            toast.error("Cannot delete criteria: Project ID is missing."); // ใช้ toast แทน alert
            return;
        }
        // ------------------------------------------------------

        // ใช้ window.confirm เหมือนเดิม หรือจะเปลี่ยนเป็น Modal อื่นๆ ก็ได้
        if (!window.confirm(`Are you sure you want to delete this ${type} criteria? (ID: ${id})`)) return;

        try {
            let endpoint = "";
            // --- ใช้ type ที่ถูกต้องตามที่ส่งให้ CriteriaSection ---
            if (type === "requirement") endpoint = `http://localhost:3001/reqcriteria/${id}`;
            else if (type === "design") endpoint = `http://localhost:3001/designcriteria/${id}`;
            else if (type === "testcase") endpoint = `http://localhost:3001/testcasecriteria/${id}`;
            else if (type === "traceability") endpoint = `http://localhost:3001/tracecriteria/${id}`; // <-- แก้จาก tracecriteria เป็น traceability ให้ตรงกัน
            // ---------------------------------------------------

            if (!endpoint) {
                console.error("Invalid criteria type for delete:", type);
                toast.error(`Cannot delete: Invalid criteria type "${type}".`);
                return;
            }

            console.log(`Attempting to DELETE ${endpoint} with project_id: ${projectId}`);

            // --- *** จุดแก้ไข: ส่ง project_id ไปใน property 'data' *** ---
            const response = await axios.delete(endpoint, {
                headers: {
                    // อาจจะต้องใส่ Header อื่นๆ ถ้า API ต้องการ เช่น Authorization
                },
                data: { // <--- ใส่ข้อมูลที่จะส่งใน body ของ DELETE request ที่ property นี้
                    project_id: projectId
                }
            });
            // --- *** จบจุดแก้ไข *** ---

            console.log('Delete response status:', response.status); // Log status

            // โดยทั่วไป DELETE สำเร็จมักจะตอบ 200 OK หรือ 204 No Content
            if (response.status === 200 || response.status === 204) {
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} criteria deleted successfully.`);

                // อัปเดตลิสต์ใน State หลังจากลบสำเร็จ (เหมือนเดิม)
                if (type === "requirement") {
                    setReqcriList((prevList) => prevList.filter(item => item.reqcri_id !== id));
                } else if (type === "design") {
                    setDesignCriList((prevList) => prevList.filter(item => item.design_cri_id !== id));
                } else if (type === "testcase") {
                    setTestcaseCriList((prevList) => prevList.filter(item => item.testcasecri_id !== id));
                } else if (type === "traceability") { // <-- แก้จาก tracecriteria เป็น traceability ให้ตรงกัน
                    setTraceabilityCriList((prevList) => prevList.filter(item => item.tracecriteria_id !== id));
                }
            } else {
                // อาจจะจัดการกับ status อื่นๆ ที่ไม่ใช่ error แต่ไม่ใช่ 200/204
                toast.warning(`Delete request completed with status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error deleting ${type} criteria (ID: ${id}):`, error);
            // แสดง error message ที่ได้จาก backend ถ้ามี
            toast.error(`Failed to delete ${type} criteria: ${error.response?.data?.message || error.message}`);
        }
    };

    // Update implement config
    const handleUpdateImplementConfig = async () => {
        if (!configId) {
            alert("Config ID is not valid");
            return;
        }

        if (!repoLink || !selectedBranch) {
            alert("Please enter a GitHub repository link and select a branch");
            return;
        }

        try {
            const response = await axios.put(`http://localhost:3001/implementConfig/${configId}`, {
                githubLink: repoLink,
                githubBranch: selectedBranch,
                projectId: projectId
            });

            if (response.status === 200) {
                alert("Configuration updated successfully");
                fetchImplementConfig(projectId);
                setIsSaved(true);
            } else {
                alert("Failed to update configuration");
            }
        } catch (error) {
            console.error("Error updating implement config:", error);
            alert("Failed to update configuration");
        }
    };

    // Save implement config
    const handleSaveImplementConfig = async () => {
        if (!repoLink || !selectedBranch || !projectId) {
            alert("Please enter a GitHub repository link, select a branch, and provide a Project ID");
            return;
        }

        try {
            const response = await axios.post("http://localhost:3001/implementConfig", {
                githubLink: repoLink,
                githubBranch: selectedBranch,
                projectId: projectId
            });

            if (response.status === 201) {
                alert("Configuration saved successfully");
                fetchImplementConfig(projectId);
                setIsSaved(true);
            } else {
                alert("Failed to save configuration");
            }
        } catch (error) {
            console.error("Error saving implement config:", error);
            alert("Failed to save configuration");
        }
    }; console.log("Traceability List State:", traceabilityCriList);

    // Render tab content based on active tab
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
            case "traceability": return (
                <CriteriaSection
                    title="Traceability Verification Criteria"
                    newCriteria={newTraceabilityCriteria}
                    setNewCriteria={setNewTraceabilityCriteria}
                    criteriaList={traceabilityCriList} // <<< ถูกต้อง: ส่ง State ที่ถูกต้องไปให้ Prop นี้
                    loading={loadingTraceability}    // <<< ถูกต้อง: ส่ง Loading State ที่ถูกต้อง
                    handleAdd={handleAddTraceabilityCriteria}
                    handleDelete={handleDelete}
                    type="traceability" // <<< *** จุดที่อาจต้องแก้ไข ***
                />
            );
            case "implementation":
                return (
                    <div className="implementation-section">
                        <div className="section-header">
                            <h2>GitHub Repository Configuration</h2>
                            <div className="divider"></div>
                        </div>

                        <GitHubConfig
                            repoLink={repoLink}
                            handleRepoLinkChange={handleRepoLinkChange}
                            branches={branches}
                            selectedBranch={selectedBranch}
                            setSelectedBranch={setSelectedBranch}
                            configId={configId}
                            handleUpdateImplementConfig={handleUpdateImplementConfig}
                            handleSaveImplementConfig={handleSaveImplementConfig}
                        />

                        <FileExplorer
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            fetchFilesFromRepo={fetchFilesFromRepo}
                            loading={loading}
                            repoLink={repoLink}
                            selectedBranch={selectedBranch}
                            fileNames={fileNames}
                            filteredFiles={filteredFiles}
                            expandedFolders={expandedFolders}
                            toggleFolder={toggleFolder}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="project-config">
            <header className="config-header">
                <h1>Project Configuration</h1>
                <div className="header-actions">
                    <button className="back-button" onClick={() => navigate(-1)}>
                        Back to Project
                    </button>
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
                        className={`tab ${activeTab === "implementation" ? "active" : ""}`}
                        onClick={() => setActiveTab("implementation")}
                    >
                        Implementation
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

                </div>
            </div>

            <main className="config-content">
                <div className="tab-content">
                    {renderTabContent()}
                </div>
            </main>
        </div>
    );
};

export default ProjectConfig;