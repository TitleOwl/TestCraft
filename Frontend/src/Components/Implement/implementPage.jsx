import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faCodeBranch,
  faPlus,
  faSearch,
  faTimes,
  faFileAlt,
  faTrash,
  faTable,
  faQuestionCircle,
  faSyncAlt,
  faFolder,
  faFolderOpen,
  faFileCode,
  faLink
} from "@fortawesome/free-solid-svg-icons";
import Modal from "react-modal";
import Joyride, { STATUS } from 'react-joyride';
import "./CSS/implementPage.css"; // Make sure this CSS file exists and is styled

Modal.setAppElement("#root"); // For accessibility

const ImplementPage = () => {
  const navigate = useNavigate();
  const [repoLink, setRepoLink] = useState('');
  const [fileNames, setFileNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [designs, setDesigns] = useState([]);
  // State for selections (Designs First approach)
  const [selectedDesigns, setSelectedDesigns] = useState([]);
  const [selectedFilePaths, setSelectedFilePaths] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [savedConfig, setSavedConfig] = useState(null);
  const [repoBranch, setRepoBranch] = useState('');
  const [modifiedFiles, setModifiedFiles] = useState(false); // Simplified check
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [relations, setRelations] = useState([]); // State for relations grouped by filename
  const [activeTab, setActiveTab] = useState("mapping");
  const [projectName, setProjectName] = useState("");
  const [runTutorial, setRunTutorial] = useState(false);
  const formatDesignId = (id) => `SD-${String(id).padStart(3, '0')}`;
  const apiToken = process.env.REACT_APP_API_TOKEN; // Ensure this is in your .env
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  // Tutorial steps reflecting the current workflow
  const tutorialSteps = [
    { target: '.imp-fetch-btn', content: 'Start by fetching files from your GitHub repository.', placement: 'bottom', disableBeacon: true },
    { target: '.imp-design-list', content: '1. Select one or more Designs first.', placement: 'left' },
    { target: '.imp-file-tree', content: '2. Then, select one or more Files to map. (File selection is enabled only after you select at least one design)', placement: 'right' },
    { target: '.imp-save-btn', content: '3. Save the relationship between the selected designs and files.', placement: 'top' },
    { target: '.imp-relation-table', content: 'View your saved file-design relationships here (grouped by file).', placement: 'top' }
  ];

  const handleRestartTutorial = () => setRunTutorial(true);

  // Filter designs based on search input
  const filteredDesigns = designs.filter(design => {
    const searchLower = searchQuery.toLowerCase();
    const name = design.diagram_name || '';
    const type = design.design_type || '';
    return (
      design.design_id?.toString().includes(searchLower) ||
      name.toLowerCase().includes(searchLower) ||
      type.toLowerCase().includes(searchLower)
    );
  });

  // Optional: Check commit status (example checks first selected file)
  useEffect(() => {
    const checkFirstFileCommit = async () => {
      if (!repoLink || selectedFilePaths.length === 0 || !apiToken) {
        setModifiedFiles(false);
        return;
      }
      const firstFilePath = selectedFilePaths[0];
      const repoName = repoLink.replace('https://github.com/', '').replace('.git', '');
      const branchSha = repoBranch || 'HEAD';
      const apiUrl = `https://api.github.com/repos/${repoName}/commits?path=${firstFilePath}&sha=${branchSha}`;
      try {
        const response = await fetch(apiUrl, { headers: { 'Authorization': `token ${apiToken}` } });
        if (response.ok) {
          const data = await response.json();
          setModifiedFiles(Array.isArray(data) && data.length > 0);
        } else {
          setModifiedFiles(false);
        }
      } catch (error) {
        console.error('Error fetching commits:', error);
        setModifiedFiles(false);
      }
    };
    // Decide when to trigger this check, e.g., not automatically on every selection
    // checkFirstFileCommit();
  }, [repoLink, repoBranch, selectedFilePaths, apiToken]);

  // Fetch implement config from backend
  const fetchImplementConfig = async () => {
    if (!projectId) return;
    try {
      const response = await axios.get(`http://localhost:3001/implementConfig/${projectId}`);
      setSavedConfig(response.data);
      if (response.data.githubLink) { setRepoLink(response.data.githubLink); localStorage.setItem("repoLink", response.data.githubLink); }
      if (response.data.githubBranch) { setRepoBranch(response.data.githubBranch); localStorage.setItem("repoBranch", response.data.githubBranch); }
    } catch (error) { console.error("Error fetching implement config:", error); }
  };

  // Fetch project name from backend
  const fetchProjectName = async () => {
    if (!projectId) return;
    try {
      const response = await axios.get(`http://localhost:3001/project/${projectId}`);
      setProjectName(response.data.project_name);
    } catch (error) { console.error("Error fetching project name:", error); }
  };

  // Initial data loading on component mount or projectId change
  useEffect(() => {
    const storedRepoLink = localStorage.getItem("repoLink");
    const storedBranch = localStorage.getItem("repoBranch");
    if (storedRepoLink) setRepoLink(storedRepoLink);
    if (storedBranch) setRepoBranch(storedBranch);
    if (projectId) {
      fetchProjectName();
      fetchImplementConfig();
      fetchDesigns();
    } else {
      console.error("Project ID is missing from URL.");
      // Handle missing project ID, e.g., show error or redirect
    }
  }, [projectId]);

  // Load cached file tree from local storage
  useEffect(() => {
    const storedFiles = localStorage.getItem("repoFiles");
    if (storedFiles) { try { setFileNames(JSON.parse(storedFiles)); } catch (e) { console.error("Failed to parse stored files:", e); localStorage.removeItem("repoFiles"); } }
  }, []);

  // Handlers for repo inputs (if they were editable)
  const handleRepoLinkChange = (event) => { /* Update state if needed */ };
  const handleBranchChange = (event) => { /* Update state if needed */ };

  // Toggle folder expansion in the file tree
  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  // Utility functions to filter files/folders
  const isSourceCodeFile = (fileName) => { const ext = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.cs', '.html', '.css', '.scss', '.go', '.php']; return ext.some(e => fileName.toLowerCase().endsWith(e)); };
  const isIgnoredFolder = (folderName) => { const ign = ['node_modules', '.git', '.github', 'dist', 'build', '__pycache__', 'target', 'vendor', '.vscode', '.idea']; return ign.includes(folderName); };
  const isIgnoredFile = (fileName) => { const ign = ['package.json', 'package-lock.json', 'yarn.lock', '.gitignore', 'readme.md', 'license', 'dockerfile']; const lower = fileName.toLowerCase(); return ign.some(i => lower === i || lower.endsWith('.log')); };

  // Fetch file structure from GitHub
  const fetchFilesFromRepo = async () => {
    if (!repoLink || !apiToken) { alert("Repository Link or API Token is missing."); return; }
    const repoName = repoLink.replace('https://github.com/', '').replace('.git', '');
    const branchParam = repoBranch ? `?ref=${repoBranch}` : '';
    const apiUrl = `https://api.github.com/repos/${repoName}/contents${branchParam}`;
    console.log("Fetching file tree from:", apiUrl);

    try {
      setLoading(true); setLoadingPercentage(0); setFileNames([]);
      setSelectedDesigns([]); setSelectedFilePaths([]); setExpandedFolders({}); // Reset states
      try { await axios.post('http://localhost:3001/fetchfilelog', { project_id: projectId }); } catch (logError) { console.warn("Could not log fetch start:", logError); }

      // Recursive function to fetch directory contents
      const fetchAll = async (url) => {
        const response = await fetch(url, { headers: { 'Authorization': `token ${apiToken}` } });
        if (!response.ok) {
          if (response.status === 403) { const rst = response.headers.get('X-RateLimit-Reset'); throw new Error(`GitHub API rate limit exceeded. Try again after ${rst ? new Date(rst * 1000).toLocaleTimeString() : 'unknown'}.`); }
          if (response.status === 404) { throw new Error(`Repository or branch not found at ${url}. Check link/branch.`); }
          throw new Error(`GitHub API error ${response.status}: ${response.statusText || 'Unknown error'}`);
        }
        const items = await response.json();
        if (!Array.isArray(items)) return [];

        let children = []; let totalInLevel = items.length || 1; let processedInLevel = 0;
        for (const item of items) {
          // Basic progress update (can be inaccurate for deep trees)
          processedInLevel++; setLoadingPercentage(prev => Math.min(99, prev + (100 / totalInLevel) * 0.05));

          if (item.type === 'file' && isSourceCodeFile(item.name) && !isIgnoredFile(item.name)) {
            children.push({ name: item.name, type: 'file', path: item.path });
          } else if (item.type === 'dir' && !isIgnoredFolder(item.name)) {
            const folderChildren = await fetchAll(item.url); // Recursively fetch subfolder
            if (folderChildren.length > 0) { // Only add folder if it's not empty after filtering
              children.push({ name: item.name, type: 'folder', path: item.path, children: folderChildren });
            }
          }
          await new Promise(resolve => setTimeout(resolve, 25)); // Small delay between requests
        } return children;
      }; // End fetchAll

      const fileTree = await fetchAll(apiUrl); // Start the recursive fetch
      setLoadingPercentage(100); setFileNames(fileTree);
      localStorage.setItem("repoFiles", JSON.stringify(fileTree)); // Cache the result

    } catch (error) {
      console.error('Error fetching files:', error);
      alert(`Workspace Files Error: ${error.message}`);
      setFileNames([]); localStorage.removeItem("repoFiles"); // Clear cache on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch available designs from backend
  const fetchDesigns = async () => {
    if (!projectId) return;
    try {
      const response = await axios.get("http://localhost:3001/design", { params: { project_id: projectId } });
      // Filter for designs that are marked as BASELINE and have an ID
      const baselineDesigns = response.data.filter(design => design.design_status === 'BASELINE' && design.design_id != null);
      setDesigns(baselineDesigns);
    } catch (error) { console.error("Error fetching designs:", error); setDesigns([]); }
  };

  // Handler for selecting/deselecting multiple files in the tree
  const handleFileSelection = (fullPath) => {
    setSelectedFilePaths((prevPaths) => {
      if (prevPaths.includes(fullPath)) return prevPaths.filter((p) => p !== fullPath); // Deselect
      else return [...prevPaths, fullPath]; // Select
    });
  };

  // Handler for selecting/deselecting designs
  const handleDesignSelection = (designId) => {
    setSelectedDesigns((prevDesigns) => {
      if (prevDesigns.includes(designId)) return prevDesigns.filter((id) => id !== designId); // Deselect
      else return [...prevDesigns, designId]; // Select
    });
  };

  // Handler for saving the current selection (Many Files <-> Many Designs)
  const handleSave = async () => {
    console.log("💾 Saving Mapping...");
    if (selectedDesigns.length === 0 || selectedFilePaths.length === 0) {
      alert("⚠️ Please select at least one Design and one File.");
      return;
    }
    if (!projectId) {
      alert("❌ Project ID is missing. Cannot save.");
      return;
    }

    // Create payload: map each selected file path to all selected designs
    // --- MODIFICATION START: Extract filename only ---
    const dataToSave = selectedFilePaths.map(filePath => {
      // Extract filename from the full path
      const filenameOnly = filePath.split('/').pop(); // Gets the last part after splitting by '/'

      return {
        implement_filename: filenameOnly, // <-- Use filenameOnly here
        project_id: parseInt(projectId, 10),
        design_id: selectedDesigns // Send the array of design IDs
      };
    });
    // --- MODIFICATION END ---

    console.log("📤 Payload to save (Filename only):", JSON.stringify(dataToSave, null, 2));
    try {
      const response = await axios.post('http://localhost:3001/implementrelation', { data: dataToSave });
      if (response.status === 201 || response.status === 200) {
        alert("✅ Mapping saved successfully!");
        setSelectedDesigns([]); // Clear selections
        setSelectedFilePaths([]);
      } else {
        alert(`⚠️ Save successful, but received status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Error saving mapping:", error.response ? error.response.data : error.message);
      alert(`❌ Error saving mapping: ${error.response?.data?.message || error.message}`);
    }
  };

  // Handler for deleting a relation instance (requires backend support for this exact signature)
  const handleDeleteRelation = async (filename, timestamp) => {
    // Note: This deletes based on the specific timestamp shown (latest for the group if grouped by filename)
    if (!window.confirm(`Delete relation instance for "${filename}" created around ${new Date(timestamp).toLocaleString('th-TH')}?`)) return;
    console.log(`Attempting to delete relation: file=${filename}, time=${timestamp}, project=${projectId}`);
    try {
      const response = await axios.delete('http://localhost:3001/implementrelation', {
        params: { implement_filename: filename, relation_at: timestamp, project_id: projectId }
      });
      if (response.status === 200) {
        alert("🗑️ Relation instance deleted successfully!");
        // The list will refresh automatically via the interval timer
      } else {
        alert(`Deletion completed with unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting relation:", error.response ? error.response.data : error.message);
      alert(`❌ Failed to delete relation instance: ${error.response?.data?.message || error.message}`);
    }
  };

  // useEffect to Fetch and Group Relations by FILENAME for Display
  useEffect(() => {
    const fetchRelations = async () => {
      if (!projectId) return;
      try {
        const response = await axios.get('http://localhost:3001/implementmapdesign', {
          params: { project_id: projectId },
        });

        if (response.data && Array.isArray(response.data.data)) {
          const groupedByFilename = response.data.data.reduce((acc, relation) => {
            const { implement_filename, design_id, relation_at } = relation;
            if (!implement_filename || design_id == null || !relation_at) return acc;
            const key = implement_filename;
            if (!acc[key]) {
              acc[key] = { implement_filename, design_ids: new Set(), latest_relation_at: relation_at };
            } else {
              if (new Date(relation_at) > new Date(acc[key].latest_relation_at)) { acc[key].latest_relation_at = relation_at; }
            }
            acc[key].design_ids.add(design_id);
            return acc;
          }, {});

          let relationsArray = Object.values(groupedByFilename).map(group => ({
            implement_filename: group.implement_filename,
            relation_at: group.latest_relation_at, // This timestamp will be used for sorting
            design_ids: Array.from(group.design_ids).sort((a, b) => a - b).join(','),
          }));

          // ***** CHANGE SORTING LOGIC HERE *****
          // Sort the final array by the latest relation timestamp (descending - newest first)
          relationsArray.sort((a, b) => {
            return new Date(b.relation_at) - new Date(a.relation_at);
          });
          // ***** END CHANGE SORTING LOGIC *****

          setRelations(relationsArray);
        } else { setRelations([]); }
      } catch (error) { console.error('Error fetching relations:', error); setRelations([]); }
    };
    fetchRelations();
    const intervalId = setInterval(fetchRelations, 5000);
    return () => clearInterval(intervalId);
  }, [projectId]);
  // --- End useEffect ---

  // Handler to clear current design and file selections
  const handleRefresh = () => {
    setSelectedDesigns([]);
    setSelectedFilePaths([]);
  };

  // Helper function to display summary of selected files
  const displaySelectedFilePaths = () => {
    if (selectedFilePaths.length === 0) return "No files selected.";
    if (selectedFilePaths.length === 1) return `1 file selected: ${selectedFilePaths[0].split('/').pop()}`;
    return `${selectedFilePaths.length} files selected`;
  };

  // --- Component JSX ---
  return (
    <div className="imp-page-wrapper">
      {/* Tutorial Component */}
      <Joyride
        steps={tutorialSteps}
        run={runTutorial}
        continuous showProgress showSkipButton
        styles={{ options: { zIndex: 10000 } }}
        callback={(data) => {
          const { status } = data;
          if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTutorial(false);
            localStorage.setItem('implementPageTutorialShown', 'true'); // Persist tutorial seen status
          }
        }}
      />

      {/* Page Header */}
      <div className="imp-enterprise-header">
        <div className="imp-header-top">
          <div className="imp-project-info">
            <div className="imp-project-breadcrumb"><FontAwesomeIcon icon={faHome} /> / Projects / {projectName || "..."}</div>
            <div className="imp-project-title">
              <h1 className="imp-project-name">{projectName || "Loading..."}</h1>
              <span className="imp-badge">CODE COMPONENT</span>
              <button onClick={handleRestartTutorial} className="imp-tutorial-help-button imp-tutorial-help-button-corner" title="Show Tutorial"><FontAwesomeIcon icon={faQuestionCircle} /></button>
            </div>
          </div>
        </div>
        {/* Tab Navigation */}
        <div className="imp-header-tab-bar">
          <div className={`imp-header-tab ${activeTab === 'mapping' ? 'imp-active' : ''}`} onClick={() => setActiveTab('mapping')}><FontAwesomeIcon icon={faCodeBranch} className="imp-tab-icon" /> Code Component And Design Mapping</div>
          <div className={`imp-header-tab ${activeTab === 'relations' ? 'imp-active' : ''}`} onClick={() => setActiveTab('relations')}><FontAwesomeIcon icon={faTable} className="imp-tab-icon" /> Relationship List</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="imp-main-content">
        {/* GitHub Repository Section */}
        <div className="imp-repo-section">
          <div className="imp-card-header">
            <h2 className="imp-card-title"><FontAwesomeIcon icon={faCodeBranch} className="imp-card-icon" /> GitHub Repository</h2>
            <div className="imp-repo-actions">
              <div className="imp-repo-inputs">
                <div className="imp-input-group"><label>Repository Link:</label><input type="text" value={repoLink} readOnly className="imp-input" /></div>
                <div className="imp-input-group"><label>Branch:</label><input type="text" value={repoBranch} readOnly className="imp-input" /></div>
              </div>
              <div className="imp-button-group">
                <button onClick={fetchFilesFromRepo} disabled={loading || !repoLink} className="imp-fetch-btn">
                  <FontAwesomeIcon icon={faSyncAlt} spin={loading} /> {loading ? 'Fetching...' : 'Fetch Files'}
                </button>
              </div>
            </div>
          </div>
          {/* Loading Progress Bar */}
          {loading && (
            <div className="imp-loading-indicator-bar">
              <div className="imp-loading-spinner-small"></div>
              <p>Loading files ({loadingPercentage.toFixed(0)}%)...</p>
              <div className="imp-progress-container-bar">
                <div className="imp-progress-bar-bar" style={{ width: `${loadingPercentage}%` }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons (Save/Clear) - Only on Mapping Tab */}
        {activeTab === 'mapping' && (
          <div className="imp-actions-container">
            <button onClick={handleRefresh} className="imp-refresh-btn" title="Clear selections"><FontAwesomeIcon icon={faTimes} /> Clear Selection</button>
            <button
              onClick={handleSave}
              className="imp-save-btn"
              disabled={selectedDesigns.length === 0 || selectedFilePaths.length === 0 || loading} // Enable only when both designs and files are selected
              title={selectedDesigns.length === 0 ? "Select designs first" : selectedFilePaths.length === 0 ? "Select one or more files" : "Save the mapping"}
            > <FontAwesomeIcon icon={faPlus} /> Save Mapping </button>
          </div>
        )}

        {/* Content based on Active Tab */}
        {activeTab === 'mapping' && (
          <div className="imp-mapping-container">

            {/* Design Selection Column */}
            <div className="imp-right-column imp-design-selection-column">
              <div className="imp-designs-card">
                <div className="imp-card-header">
                  <h2 className="imp-card-title"><FontAwesomeIcon icon={faTable} className="imp-card-icon" /> Design Selection</h2>
                  <div className="imp-search-container">
                    <FontAwesomeIcon icon={faSearch} className="imp-search-icon" />
                    <input type="text" className="imp-search-input" placeholder="Search designs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    {searchQuery && (<button className="imp-clear-search-btn" onClick={() => setSearchQuery('')} title="Clear"><FontAwesomeIcon icon={faTimes} /></button>)}
                  </div>
                </div>
                <div className="imp-content-area">
                  <div className="imp-selected-info-box">
                    <p>⚠️ Software design baseline must be selected before file selection is enabled.</p>
                    {selectedDesigns.length > 0 && (
                      <div>
                        <strong>Selected Designs:</strong> {selectedDesigns.map(id => formatDesignId(id)).join(', ')}
                      </div>
                    )}
                  </div>
                  {/* Design List */}
                  {designs.length === 0 && !loading && (<div className="imp-empty-state"><FontAwesomeIcon icon={faTable} className="imp-empty-icon" size="2x" /><p>No 'BASELINE' designs found for this project.</p></div>)}
                  {filteredDesigns.length > 0 ? (
                    <ul className="imp-design-list">
                      {filteredDesigns.map((design) => (
                        <li key={design.design_id} className="imp-design-item">
                          <input type="checkbox" id={`design-${design.design_id}`} checked={selectedDesigns.includes(design.design_id)} onChange={() => handleDesignSelection(design.design_id)} className="imp-checkbox" />
                          <label htmlFor={`design-${design.design_id}`} className="imp-design-info">
                            <span className="imp-design-id">{formatDesignId(design.design_id)}</span>
                            <span className="imp-design-name">{design.diagram_name}</span>
                            <span className={`imp-design-type-badge imp-type-${design.design_type?.toLowerCase().replace(/\s+/g, '-') || 'unk'}`}>{design.design_type || 'N/A'}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : (designs.length > 0 && <div className="imp-empty-state"><FontAwesomeIcon icon={faSearch} className="imp-empty-icon" size="2x" /><p>No designs match your search.</p></div>)}
                </div>
              </div>
            </div>

            {/* File Selection Column */}
            <div className="imp-left-column imp-file-selection-column">
              <div className="imp-files-card">
                <div className="imp-card-header">
                  <h2 className="imp-card-title"><FontAwesomeIcon icon={faFileAlt} className="imp-card-icon" /> Repository Files</h2>
                  <p className="imp-card-description">Select files from repository to map to software design.</p>
                </div>
                <div className="imp-content-area">
                  {fileNames.length > 0 && !loading ? (
                    <>
                      <div className="imp-selected-info-box">
                        <div><strong>Status:</strong> {displaySelectedFilePaths()}</div>
                      </div>
                      <div className="imp-file-explorer">
                        {/* Render File Tree */}
                        <FileTree
                          files={fileNames}
                          onSelect={handleFileSelection} // Pass handler for multi-select
                          selectedFilePaths={selectedFilePaths} // Pass array of selected paths
                          filesDisabled={selectedDesigns.length === 0} // Determine if file selection should be disabled
                          expandedFolders={expandedFolders}
                          toggleFolder={toggleFolder}
                        />
                      </div>
                    </>
                  ) : !loading ? (
                    <div className="imp-empty-state">
                      <FontAwesomeIcon icon={faFileCode} className="imp-empty-icon" size="2x" />
                      <p>No files loaded. Click "Fetch Files" above.</p>
                      <button onClick={fetchFilesFromRepo} disabled={loading || !repoLink} className="imp-empty-button">
                        <FontAwesomeIcon icon={faSyncAlt} spin={loading} /> {loading ? 'Fetching...' : 'Fetch Files'}
                      </button>
                    </div>
                  ) : null /* Don't show empty state during loading */}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Relations List Tab Content */}
        {activeTab === 'relations' && (
          <div className="imp-relations-card">
            <div className="imp-card-header">
              <h2 className="imp-card-title"><FontAwesomeIcon icon={faLink} className='icon-link-sctosd' /> Code Component-Software Design Relations</h2>
              <p className="imp-card-description">View and manage relationships between code component and software design.</p>
            </div>
            <div className="imp-content-area">
              {relations.length > 0 ? (
                <table className="imp-relation-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Filename</th>
                      <th>Design IDs</th>
                      <th>Link Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Render relations grouped by filename */}
                    {relations.map((relation, index) => {
                      let formattedDate = 'N/A'; // Default if date is invalid
                      try {
                        const date = new Date(relation.relation_at);
                        if (!isNaN(date)) {
                          const pad = (n) => n.toString().padStart(2, '0');
                          const yyyy = date.getFullYear();
                          const mm = pad(date.getMonth() + 1);
                          const dd = pad(date.getDate());
                          const hh = pad(date.getHours());
                          const min = pad(date.getMinutes());
                          const ss = pad(date.getSeconds());

                          formattedDate = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
                        }
                      } catch (e) {
                        console.error("Date formatting error for relation:", relation, e);
                      }

                      return (
                        <tr key={relation.implement_filename}> {/* Key is filename for grouped view */}
                          <td data-label="#">{index + 1}</td>
                          <td data-label="Filename" className="imp-filename-cell">
                            <FontAwesomeIcon icon={faFileCode} className='imp-relation-file-icon' /> {relation.implement_filename}
                          </td>
                          {/* Render all associated design IDs */}
                          <td data-label="Design IDs">
                            {(relation.design_ids || '').split(',').map(id => id.trim()).filter(id => id).map(id => (
                              <span key={id} className="imp-design-chip">{formatDesignId(id)}</span>
                            ))}
                          </td>
                          <td data-label="Latest Update" className="imp-date-cell">{formattedDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="imp-empty-state">
                  <FontAwesomeIcon icon={faCodeBranch} className="imp-empty-icon" size="2x" />
                  <p>No relationships have been created yet.</p>
                  <p>Go to the mapping tab to create relationships.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div> {/* End imp-main-content */}
    </div> // End imp-page-wrapper
  );
};


// FileTree Component (Handles display, multi-selection via checkbox, disabled state)
const FileTree = ({
  files, onSelect, selectedFilePaths, filesDisabled, expandedFolders, toggleFolder, parentPath = ""
}) => {
  return (
    <ul className="imp-file-tree">
      {files.map((item) => {
        const currentFullPath = item.path || (parentPath ? `${parentPath}/${item.name}` : item.name);
        // Determine if the current file/folder path is selected
        const isSelected = selectedFilePaths.includes(currentFullPath);

        return (
          <li key={currentFullPath} className={`imp-file-tree-item ${item.type === 'folder' ? 'imp-folder-item' : 'imp-file-item'}`}>
            {item.type === "folder" ? (
              // Render folder item
              <>
                <div className="imp-folder-label" onClick={() => toggleFolder(currentFullPath)} style={{ cursor: 'pointer' }} aria-expanded={!!expandedFolders[currentFullPath]}>
                  <span className="imp-folder-icon"><FontAwesomeIcon icon={expandedFolders[currentFullPath] ? faFolderOpen : faFolder} className='folder-icon-sc' /></span>
                  <span className="imp-folder-name">{item.name}</span>
                </div>
                {/* Recursively render children if folder is expanded */}
                {expandedFolders[currentFullPath] && item.children && item.children.length > 0 && (
                  <FileTree
                    files={item.children}
                    onSelect={onSelect}
                    selectedFilePaths={selectedFilePaths}
                    filesDisabled={filesDisabled} // Pass disabled state down
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    parentPath={currentFullPath} // Pass the correct parent path for nested items
                  />
                )}
              </>
            ) : (
              // Render file item with checkbox
              <div className={`imp-file-label ${isSelected ? 'imp-file-selected' : ''} ${filesDisabled ? 'imp-file-disabled' : ''}`}>
                <input
                  type="checkbox"
                  id={`file-${currentFullPath.replace(/[^a-zA-Z0-9]/g, '-')}`} // Generate unique ID for label association
                  onChange={() => onSelect(currentFullPath)} // Call selection handler with the full path
                  checked={isSelected} // Set checked state based on whether path is in the selected array
                  disabled={filesDisabled} // Disable checkbox if file selection is disabled
                  className="imp-checkbox"
                  style={{ marginRight: '8px' }} // Add some spacing
                />
                <label htmlFor={`file-${currentFullPath.replace(/[^a-zA-Z0-9]/g, '-')}`} className="imp-file-label-content" style={{ cursor: filesDisabled ? 'not-allowed' : 'pointer' }}>
                  <span className="imp-file-icon"><FontAwesomeIcon icon={faFileCode} className="code-icon" /></span>
                  <span className="imp-file-name">{item.name}</span>
                </label>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default ImplementPage;