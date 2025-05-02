import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faListAlt,
  faCodeBranch,
  faPlus,
  faSearch,
  faTimes,
  faFileAlt,
  faEye,
  faTrash,
  faDownload,
  faTable,
  faQuestionCircle,
  faSyncAlt,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "react-modal";
import fetchfileimplement from "../Implement/image/fetch-file.png";
import Select from 'react-select';
import Joyride, { STATUS } from 'react-joyride';
import "./CSS/implementPage.css";

Modal.setAppElement("#root"); // For accessibility

const ImplementPage = () => {
  const navigate = useNavigate();
  const [repoLink, setRepoLink] = useState('');
  const [fileNames, setFileNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [selectedDesigns, setSelectedDesigns] = useState([]);
  const [fileDesigns, setFileDesigns] = useState({}); // เก็บข้อมูลที่จับคู่ไฟล์กับ design_id
  const [expandedFolders, setExpandedFolders] = useState([]);
  const [savedConfig, setSavedConfig] = useState(null);
  const [repoBranch, setRepoBranch] = useState('');
  const [fileStatuses, setFileStatuses] = useState({});
  const [modifiedFiles, setModifiedFiles] = useState([]);
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [relations, setRelations] = useState([]);
  const [editingRelation, setEditingRelation] = useState(null);
  const [editedDesignIds, setEditedDesignIds] = useState([]);
  const [activeTab, setActiveTab] = useState("mapping");
  const [projectName, setProjectName] = useState("");
  const [runTutorial, setRunTutorial] = useState(false);
  
  const apiToken = process.env.REACT_APP_API_TOKEN;
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  const tutorialSteps = [
    {
      target: '.imp-fetch-btn',
      content: 'Start by fetching files from your GitHub repository.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.imp-file-tree',
      content: 'Select files from your repository that you want to map to designs.',
      placement: 'right',
    },
    {
      target: '.imp-design-list',
      content: 'Choose designs to associate with your selected file.',
      placement: 'left',
    },
    {
      target: '.imp-save-btn',
      content: 'Save the relationship between your file and selected designs.',
      placement: 'top',
    },
    {
      target: '.imp-relation-table',
      content: 'View all your file-design relationships here.',
      placement: 'top',
    }
  ];

  const handleRestartTutorial = () => {
    setRunTutorial(true);
  };

  const filteredDesigns = designs.filter(design => {
    const searchLower = searchQuery.toLowerCase();
    return (
      design.design_id.toString().includes(searchLower) ||
      design.diagram_name.toLowerCase().includes(searchLower) ||
      design.design_type.toLowerCase().includes(searchLower)
    );
  });

  const fetchCommits = async () => {
    if (!repoLink) return;

    const repoName = repoLink.replace('https://github.com/', '').replace('.git', '');
    const apiUrl = `https://api.github.com/repos/${repoName}/commits?path=${selectedFilePath}`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${apiToken}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Commits data: ", data);

        const updatedFiles = data.map(commit => {
          if (commit.files && Array.isArray(commit.files)) {
            return commit.files;
          } else {
            return [];
          }
        }).flat();

        console.log("updatedFiles", updatedFiles);

        const modifiedFiles = updatedFiles.filter(file => {
          return file && file.filename === selectedFilePath;
        });
        return modifiedFiles.length > 0;
      }
    } catch (error) {
      console.error('Error fetching commits:', error);
    }
  };

  useEffect(() => {
    fetchCommits().then(modifiedFiles => {
      setModifiedFiles(modifiedFiles);
    });
  }, [repoLink, selectedFilePath]);

  const fetchImplementConfig = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/implementConfig/${projectId}`);
      setSavedConfig(response.data);

      if (response.data.githubLink) {
        setRepoLink(response.data.githubLink);
        localStorage.setItem("repoLink", response.data.githubLink);
      }
      if (response.data.githubBranch) {
        setRepoBranch(response.data.githubBranch);
        localStorage.setItem("repoBranch", response.data.githubBranch);
      }
    } catch (error) {
      console.error("Error fetching implement config:", error);
    }
  };

  // Fetch project name
  const fetchProjectName = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/project/${projectId}`);
      setProjectName(response.data.project_name);
    } catch (error) {
      console.error("Error fetching project name:", error);
    }
  };

  useEffect(() => {
    const storedRepoLink = localStorage.getItem("repoLink");
    const storedBranch = localStorage.getItem("repoBranch");

    if (storedRepoLink) setRepoLink(storedRepoLink);
    if (storedBranch) setRepoBranch(storedBranch);

    fetchProjectName();
    fetchImplementConfig();
    fetchDesigns();
  }, [projectId]);

  useEffect(() => {
    const storedFiles = localStorage.getItem("repoFiles");
    if (storedFiles) {
      setFileNames(JSON.parse(storedFiles));
    }
  }, []);

  const handleRepoLinkChange = (event) => {
    const value = event.target.value;
    setRepoLink(value);
    localStorage.setItem("repoLink", value);
  };

  const handleBranchChange = (event) => {
    const value = event.target.value;
    setRepoBranch(value);
    localStorage.setItem("repoBranch", value);
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => {
      if (prev.includes(folderPath)) {
        return prev.filter((path) => path !== folderPath);
      } else {
        return [...prev, folderPath];
      }
    });
  };

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

  const fetchFilesFromRepo = async () => {
    if (!repoLink) return;

    const repoName = repoLink.replace('https://github.com/', '').replace('.git', '');
    const apiUrl = `https://api.github.com/repos/${repoName}/contents`;

    try {
      setLoading(true);
      setLoadingPercentage(0);
      let loadedFilesCount = 0;

      const logResponse = await axios.post('http://localhost:3001/fetchfilelog', { project_id: projectId });

      if (logResponse.status !== 200) {
        throw new Error("Failed to create fetch log");
      }

      const fetchRound = logResponse.data.fetchRound;
      console.log(`Fetching files for project ${projectId}, round ${fetchRound}`);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${apiToken}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const totalFiles = data.length;
          const fileTree = await buildFileTree(repoName, data);

          for (let i = 0; i < totalFiles; i++) {
            loadedFilesCount += 1;
            const percentage = (loadedFilesCount / totalFiles) * 100;
            setLoadingPercentage(percentage);
            await new Promise(resolve => setTimeout(resolve, 80));
          }

          setLoadingPercentage(100);
          setFileNames(fileTree);
          localStorage.setItem("repoFiles", JSON.stringify(fileTree));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFileNames([]);
  }, []);

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

  const fetchDesigns = async () => {
    try {
      const response = await axios.get("http://localhost:3001/design", {
        params: { project_id: projectId },
      });

      const baselineDesigns = response.data.filter(design => design.design_status === 'BASELINE');
      setDesigns(baselineDesigns);
    } catch (error) {
      console.error("Error fetching designs:", error);
    }
  };

  const handleFileSelection = (filePath) => {
    const fileName = filePath.split('/').pop();
    console.log("handleFileSelection called with:", filePath, fileName);

    setSelectedFiles((prevSelectedFiles) => {
      let updatedSelectedFiles;

      if (prevSelectedFiles.includes(fileName)) {
        updatedSelectedFiles = prevSelectedFiles.filter((file) => file !== fileName);
        if (selectedFilePath === filePath) {
          setSelectedFilePath("");
        }
      } else {
        updatedSelectedFiles = [...prevSelectedFiles, fileName];
        setSelectedFilePath(filePath);
      }
      console.log("Selected Files (inside updater):", updatedSelectedFiles);
      return updatedSelectedFiles;
    });
  };

  const handleDesignSelection = (filePath, designId) => {
    console.log("Before:", selectedFiles);

    setSelectedFiles((prev) => {
      const isSelected = prev.includes(designId);
      const updatedFiles = isSelected
        ? prev.filter((id) => id !== designId)
        : [...prev, designId];

      console.log("After:", updatedFiles);
      return updatedFiles;
    });
  };

  const handleSave = async () => {
    console.log("🔍 Selected Files before save:", selectedFiles);
    console.log("🔍 Project ID:", projectId);

    if (!projectId) {
      alert("ไม่พบ project_id");
      return;
    }

    // แยกไฟล์ออกจาก designId
    const filePaths = selectedFiles.filter(file => typeof file === 'string');
    const designIds = selectedFiles.filter(file => typeof file === 'number');

    if (filePaths.length === 0 || designIds.length === 0) {
      alert("กรุณาเลือกไฟล์และดีไซน์ที่ต้องการก่อน");
      return;
    }

    // สร้าง array ของ objects ที่มีข้อมูลครบถ้วน
    const dataToSave = filePaths.map(filePath => {
      return {
        implement_filename: filePath,
        project_id: projectId,
        design_id: designIds
      };
    });

    console.log("📤 Data to Save:", JSON.stringify(dataToSave, null, 2));

    try {
      const response = await axios.post('http://localhost:3001/implementrelation', { data: dataToSave });

      if (response.status === 201) {
        alert("บันทึกข้อมูลสำเร็จ!");
        setSelectedFiles([]);
        setFileDesigns({});
      }
    } catch (error) {
      console.error("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleDeleteRelation = async (filename, timestamp) => {
    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to delete the relation for "${filename}" created at ${new Date(timestamp).toLocaleString('th-TH')}? This will remove all design mappings associated with this specific instance.`)) {
      return; // Stop if user cancels
    }

    console.log(`Attempting to delete relation for file: ${filename}, timestamp: ${timestamp}, project: ${projectId}`);

    try {
      // Construct the API endpoint. Adjust if your backend expects different parameters or structure.
      // This example assumes deletion based on filename, timestamp, and project_id.
      const response = await axios.delete('http://localhost:3001/implementrelation', {
        params: {
          implement_filename: filename,
          relation_at: timestamp, // Send the exact timestamp string
          project_id: projectId
        }
      });

      if (response.status === 200) {
        alert("Relation deleted successfully!");
        // The useEffect with setInterval should refresh the list automatically,
        // but you could manually trigger fetchRelations() here for immediate feedback if needed.
        // fetchRelations();
      } else {
         // Handle cases where the backend returns a success status code other than 200 if applicable
         console.warn("Relation deletion returned status:", response.status, response.data);
         alert("Relation deleted, but received an unexpected status code.");
      }
    } catch (error) {
      console.error("Error deleting relation:", error.response ? error.response.data : error.message);
      alert(`Failed to delete relation. ${error.response?.data?.message || error.message}`);
    }
  };
  
  useEffect(() => {
    const fetchRelations = async () => {
      try {
        const response = await axios.get('http://localhost:3001/implementmapdesign', {
          params: { project_id: projectId },
        });

        // กรองข้อมูล relations ตาม relation_at และจัดกลุ่ม design_id ตามเวลา
        const formattedRelations = response.data.data.reduce((acc, relation) => {
          const { implement_id, implement_filename, design_id, relation_at } = relation;
          const key = `${implement_filename}-${relation_at}`;

          if (!acc[key]) {
            acc[key] = {
              implement_id,
              implement_filename,
              design_ids: [design_id],
              relation_at,
            };
          } else {
            acc[key].design_ids.push(design_id);
          }

          return acc;
        }, {});

        // แปลง object เป็น array เพื่อแสดงผล
        const relationsArray = Object.values(formattedRelations);

        // แปลง design_ids ให้เป็น string โดยใช้ join
        const formattedRelationsArray = relationsArray.map(relation => ({
          ...relation,
          design_ids: relation.design_ids.join(','),
        }));

        setRelations(formattedRelationsArray);
      } catch (error) {
        console.error('Error fetching relations:', error);
      }
    };

    fetchRelations();
    const intervalId = setInterval(fetchRelations, 2000);

    return () => clearInterval(intervalId);
  }, [projectId]);

  const handleRefresh = () => {
    setSelectedFiles([]);
    setSelectedFilePath("");
  };

  return (
    <div className="imp-page-wrapper">
      <Joyride
        steps={tutorialSteps}
        run={runTutorial}
        continuous
        showProgress
        showSkipButton
        styles={{
          options: {
            zIndex: 10000,
          },
        }}
        callback={(data) => {
          const { status } = data;
          if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTutorial(false);
            localStorage.setItem('implementPageTutorialShown', 'true');
          }
        }}
      />

      {/* Enterprise Header - Similar to RequirementPage */}
      <div className="imp-enterprise-header">
        <div className="imp-header-top">
          <div className="imp-project-info">
            <div className="imp-project-breadcrumb">
              <FontAwesomeIcon icon={faHome} />
              / Projects / {projectName || "Loading..."}
            </div>
            <div className="imp-project-title">
              <h1 className="imp-project-name">{projectName || "Loading..."}</h1>
              <span className="imp-badge">CODE COMPONENT</span>
              <button
                onClick={handleRestartTutorial}
                className="imp-tutorial-help-button imp-tutorial-help-button-corner"
                title="Show Tutorial"
              >
                <FontAwesomeIcon icon={faQuestionCircle} />
              </button>
            </div>
          </div>
        </div>

        <div className="imp-header-tab-bar">
          <div
            className={`imp-header-tab ${activeTab === 'mapping' ? 'imp-active' : ''}`}
            onClick={() => setActiveTab('mapping')}
          >
            <FontAwesomeIcon icon={faCodeBranch} className="imp-tab-icon" />
            Code Component And Design Mapping
          </div>
          <div
            className={`imp-header-tab ${activeTab === 'relations' ? 'imp-active' : ''}`}
            onClick={() => setActiveTab('relations')}
          >
            <FontAwesomeIcon icon={faTable} className="imp-tab-icon" />
            Relationship List
          </div>
        </div>
      </div>

      <div className="imp-main-content">
        {/* Repository Section */}
        <div className="imp-repo-section">
          <div className="imp-card-header">
            <h2 className="imp-card-title">
              <FontAwesomeIcon icon={faCodeBranch} className="imp-card-icon" />
              GitHub Repository
            </h2>
            <div className="imp-repo-actions">
              <div className="imp-repo-inputs">
                <div className="imp-input-group">
                  <label>Repository Link:</label>
                  <input
                    type="text"
                    value={repoLink}
                    disabled
                    onChange={handleRepoLinkChange}
                    placeholder="e.g., username/repository"
                    className="imp-input"
                  />
                </div>
                <div className="imp-input-group">
                  <label>Branch:</label>
                  <input
                    type="text"
                    value={repoBranch}
                    disabled
                    onChange={handleBranchChange}
                    placeholder="e.g., main"
                    className="imp-input"
                  />
                </div>
              </div>
              <div className="imp-button-group">
                <button onClick={fetchFilesFromRepo} disabled={loading} className="imp-fetch-btn">
                      <FontAwesomeIcon icon={faSyncAlt} />
                      Fetch Files
                </button>
                <button onClick={handleRefresh} className="imp-refresh-btn">
                  <FontAwesomeIcon icon={faTimes} />
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Based on Active Tab */}
        {activeTab === 'mapping' && (
          <div className="imp-mapping-container">
            {/* Left Column - File Tree */}

            {/* Right Column - Design Selection */}
            <div className="imp-right-column">
              <div className="imp-designs-card">
                <div className="imp-card-header">
                  <h2 className="imp-card-title">
                    <FontAwesomeIcon icon={faTable} className="imp-card-icon" />
                    Design Selection
                  </h2>
                  <div className="imp-search-container">
                    <FontAwesomeIcon icon={faSearch} className="imp-search-icon" />
                    <input
                      type="text"
                      className="imp-search-input"
                      placeholder="Search designs by ID, name, or type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        className="imp-clear-search-btn"
                        onClick={() => setSearchQuery('')}
                        title="Clear search"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="imp-content-area">
                  <div className="imp-selected-file-info">
                    <h3>Selected File: {selectedFilePath ? selectedFilePath.split('/').pop() : "No file selected"}</h3>
                    <p>Please select a file first, then choose designs to associate with it.</p>
                  </div>
                  {filteredDesigns.length > 0 ? (
                    <ul className="imp-design-list">
                      {filteredDesigns.map((design) => (
                        <li key={design.design_id} className="imp-design-item">
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(design.design_id)}
                            onChange={() => {
                              if (selectedFilePath) {
                                handleDesignSelection(selectedFilePath, design.design_id);
                              }
                            }}
                            disabled={!selectedFilePath}
                            className="imp-checkbox"
                          />
                          <div className="imp-design-info">
                            <span className="imp-design-id">SD{design.design_id}</span>
                            <span className="imp-design-name">{design.diagram_name}</span>
                            <span className={`imp-design-type-badge imp-type-${design.design_type.toLowerCase().replace(/\s+/g, '-')}`}>
                              {design.design_type}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="imp-empty-state">
                      <FontAwesomeIcon icon={faTable} className="imp-empty-icon" />
                      <p>{searchQuery ? "No designs match your search." : "No baseline designs available."}</p>
                    </div>
                  )}
                  <div className="imp-actions-container">
                    <button 
                      onClick={handleSave} 
                      className="imp-save-btn"
                      disabled={!selectedFilePath || selectedFiles.filter(file => typeof file === 'number').length === 0}
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Save Mapping
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="imp-left-column">
              <div className="imp-files-card">
                <div className="imp-card-header">
                  <h2 className="imp-card-title">
                    <FontAwesomeIcon icon={faFileAlt} className="imp-card-icon" />
                    Repository Files
                  </h2>
                  <p className="imp-card-description">
                    Select files from your repository to map to design components
                  </p>
                </div>
                <div className="imp-content-area">
                  {loading ? (
                    <div className="imp-loading-state">
                      <div className="imp-loading-spinner"></div>
                      <p>Loading files...</p>
                      <div className="imp-progress-container">
                        <div
                          className="imp-progress-bar"
                          style={{ width: `${loadingPercentage}%` }}
                        ></div>
                      </div>
                      <p>{loadingPercentage.toFixed(2)}%</p>
                    </div>
                  ) : fileNames.length > 0 ? (
                    <div className="imp-file-explorer">
                      <FileTree
                        files={fileNames}
                        onSelect={handleFileSelection}
                        expandedFolders={expandedFolders}
                        toggleFolder={toggleFolder}
                        fileStatuses={fileStatuses}
                        selectedFiles={selectedFiles}
                      />
                    </div>
                  ) : (
                    <div className="imp-empty-state">
                      <FontAwesomeIcon icon={faFileAlt} className="imp-empty-icon" />
                      <p>No files loaded. Click "Fetch Files" to load repository files.</p>
                      <button onClick={fetchFilesFromRepo} className="imp-empty-button">
                        <FontAwesomeIcon icon={faSyncAlt} />
                        Fetch Files
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}


        {activeTab === 'relations' && (
          <div className="imp-relations-card">
            <div className="imp-card-header">
              <h2 className="imp-card-title">
                <FontAwesomeIcon icon={faCodeBranch} className="imp-card-icon" />
                File-Design Relations
              </h2>
              <p className="imp-card-description">
                View and manage relationships between implementation files and design components
              </p>
            </div>
            <div className="imp-content-area">
              {relations.length > 0 ? (
                <table className="imp-relation-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Filename</th>
                      <th>Design IDs</th>
                      <th>Created At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relations.map((relation, index) => {
                      const formattedDate = new Intl.DateTimeFormat('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        second: 'numeric',
                      }).format(new Date(relation.relation_at));

                      return (
                        <tr key={`${relation.implement_filename}-${relation.relation_at}`}> {/* Use a more stable key */}
                          <td data-label="#">{index + 1}</td>
                          <td data-label="Filename" className="imp-filename-cell">
                            <span className="imp-file-icon">📄</span>
                            {relation.implement_filename}
                          </td>
                          <td data-label="Design IDs">
                            {relation.design_ids.split(',').map(id => (
                              <span key={id} className="imp-design-chip">SD{id}</span>
                            ))}
                          </td>
                          <td data-label="Created At" className="imp-date-cell">
                            {formattedDate}
                          </td>
                          {/* --- Action Column --- */}
                          <td data-label="Action" className="imp-action-cell">
                            <button
                              className="imp-delete-btn" // Specific class name for styling
                              onClick={() => handleDeleteRelation(relation.implement_filename, relation.relation_at)}
                              title={`Delete relation for ${relation.implement_filename} created at ${formattedDate}`}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                              {/* Optional: Add text like " Delete" */}
                            </button>
                          </td>
                          {/* --- End Action Column --- */}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="imp-empty-state">
                  <FontAwesomeIcon icon={faCodeBranch} className="imp-empty-icon" />
                  <p>No file-design relations have been created yet.</p>
                  <p>Select a file and associate it with designs to create a relationship.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FileTree = ({ files, onSelect, expandedFolders, toggleFolder, parentPath = "", selectedFiles }) => {
  return (
    <ul className="imp-file-tree">
      {files.map((item) => {
        const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;

        return (
          <li key={fullPath} className="imp-file-item">
            {item.type === "folder" ? (
              <>
                <div 
                  className="imp-folder-label"
                  onClick={() => toggleFolder(fullPath)}
                  aria-expanded={expandedFolders && expandedFolders.includes(fullPath)}
                >
                  <span className="imp-folder-icon">
                    {expandedFolders && expandedFolders.includes(fullPath) ? "📂" : "📁"}
                  </span>
                  <span className="imp-folder-name">{item.name}</span>
                </div>
                {expandedFolders && expandedFolders.includes(fullPath) && item.children ? (
                  <FileTree
                    files={item.children}
                    onSelect={onSelect}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    parentPath={fullPath}
                    selectedFiles={selectedFiles}
                  />
                ) : null}
              </>
            ) : (
              <div className={`imp-file-label ${selectedFiles.includes(item.name) ? 'imp-file-selected' : ''}`}>
                <input
                  type="checkbox"
                  onChange={() => onSelect(fullPath)}
                  className="imp-checkbox"
                  checked={selectedFiles.includes(item.name)}
                />
                <span className="imp-file-icon">📄</span>
                <span className="imp-file-name">{item.name}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default ImplementPage;