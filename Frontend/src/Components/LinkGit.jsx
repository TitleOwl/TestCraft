import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom"; // Kept useLocation for projectId
import './CSS/LinkGit.css'; // Assuming this CSS is still relevant
import fetchFileIcon from "../Components/Implement/image/fetch-file.png";
import { toast } from "react-toastify"; // Kept if error handling uses it

// File Tree Component (No changes needed, used by FileExplorer)
const FileTree = ({ files, onSelect, expandedFolders, toggleFolder, parentPath = "", filterText }) => {
    // --- This component remains unchanged as it's needed by FileExplorer ---
    return (
        <ul className="file-tree">
            {files.map((item) => {
                const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;

                // Basic filter check (if filterText is provided)
                const matchesFilter = !filterText || item.name.toLowerCase().includes(filterText.toLowerCase());

                if (item.type === "folder") {
                     // Check if the folder itself matches or if any children match
                     const childrenMatch = item.children && item.children.some(child =>
                        child.name.toLowerCase().includes(filterText?.toLowerCase() ?? '') || child.type === 'folder' // Simplified check
                     );
                     const shouldDisplayFolder = matchesFilter || childrenMatch;

                     if (!shouldDisplayFolder && filterText) return null; // Hide folder if it and its children don't match filter

                    return (
                        <li key={fullPath} className="file-item">
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

                                {expandedFolders.includes(fullPath) && item.children && (
                                    <FileTree
                                        files={item.children}
                                        onSelect={onSelect}
                                        expandedFolders={expandedFolders}
                                        toggleFolder={toggleFolder}
                                        parentPath={fullPath}
                                        filterText={filterText} // Pass filterText down
                                    />
                                )}
                            </>
                        </li>
                    );
                } else if (item.type === "file") {
                    // Only show file if it's inside an expanded folder OR if there's no parent (root level)
                    // AND if it matches the filter text
                    const parentIsExpanded = parentPath ? expandedFolders.includes(parentPath) : true; // Root files always potentially visible
                    if (parentIsExpanded && matchesFilter) {
                        return (
                           <li key={fullPath} className="file-item">
                                <div className="file-label" onClick={() => onSelect && onSelect(item)}> {/* Optional: Add onClick for file selection */}
                                    <span className="file-icon">📄</span>
                                    <span className="file-name">{item.name}</span>
                                </div>
                           </li>
                        );
                    }
                    return null; // Hide file if parent folder is collapsed or doesn't match filter
                }
                 return null; // Should not happen with standard file/folder types
            })}
        </ul>
    );
};


// GitHub Repository Configuration Component (No changes needed)
const GitHubConfig = ({ repoLink, handleRepoLinkChange, branches, selectedBranch, setSelectedBranch, configId, handleUpdateImplementConfig, handleSaveImplementConfig }) => {
    // --- This component remains unchanged ---
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

// File Explorer Component (Minor update to pass filterText to FileTree)
const FileExplorer = ({ searchTerm, setSearchTerm, fetchFilesFromRepo, loading, repoLink, selectedBranch, fileNames, /* removed filteredFiles prop */ expandedFolders, toggleFolder }) => {

    // Filtering logic is now directly handled within FileTree based on filterText
    // Or, if you prefer filtering *before* passing to FileTree:
    const filterFilesForDisplay = (files, query) => {
        if (!query) return files;
        return files.map(file => {
            if (file.type === "folder") {
                const filteredChildren = filterFilesForDisplay(file.children || [], query);
                // Show folder if its name matches OR if it has children that match
                if (file.name.toLowerCase().includes(query.toLowerCase()) || filteredChildren.length > 0) {
                    return { ...file, children: filteredChildren };
                }
                return null;
            }
            // Show file if its name matches
            return file.name.toLowerCase().includes(query.toLowerCase()) ? file : null;
        }).filter(Boolean); // Remove null entries
    };

    const filesToDisplay = filterFilesForDisplay(fileNames, searchTerm);


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
                 // Use filesToDisplay (filtered list) OR pass searchTerm to FileTree
                ) : fileNames.length > 0 ? (
                    <FileTree
                        files={filesToDisplay} // Pass the filtered list
                        // files={fileNames} // Or pass the original list
                        // filterText={searchTerm} // And let FileTree filter internally
                        expandedFolders={expandedFolders}
                        toggleFolder={toggleFolder}
                        // No onSelect passed here, add if needed: onSelect={(file) => console.log('Selected:', file)}
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

// Main Component - Refactored for Implementation Only
const LinkGit = () => {
    // --- State only for Implementation ---
    const [repoLink, setRepoLink] = useState('');
    const [fileNames, setFileNames] = useState([]); // Raw file structure from API
    const [loading, setLoading] = useState(false); // Loading state for file fetching
    const [expandedFolders, setExpandedFolders] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [searchTerm, setSearchTerm] = useState(""); // Search term for file explorer

    // Project and Config state
    const [projectId, setProjectId] = useState(null);
    const [implementConfig, setImplementConfig] = useState(null);
    const [configId, setConfigId] = useState(null);
    // const [isSaved, setIsSaved] = useState(false); // Keep if needed for UI feedback

    // Utilities
    const apiToken = process.env.REACT_APP_API_TOKEN; // Ensure this is configured
    const location = useLocation();
    const navigate = useNavigate(); // Keep if navigation is needed

    // --- Removed filterFiles function - Filtering handled in FileExplorer/FileTree ---

    // Initialize projectId from URL params
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const id = queryParams.get('project_id');
        if (id) {
            console.log("Project ID from URL:", id);
            setProjectId(id);
        } else {
            console.warn("Project ID not found in URL query parameters.");
            // Handle case where project_id is missing, maybe redirect or show error
            // navigate('/some-error-page');
            toast.error("Project ID is missing in the URL.");
        }
    }, [location]); // Dependency on location

    // Fetch implementation config when projectId changes
    useEffect(() => {
        if (projectId) {
            console.log("Fetching implement config for project ID:", projectId);
            fetchImplementConfig(projectId);
        }
    }, [projectId]); // Dependency only on projectId

    // Fetch branches when repo link changes (and is valid)
    useEffect(() => {
        if (repoLink && repoLink.includes('github.com')) { // Basic check for valid URL format
            console.log("Repo link changed, fetching branches:", repoLink);
            fetchBranchesFromRepo();
        } else {
            setBranches([]); // Clear branches if link is removed or invalid
            setSelectedBranch(''); // Clear selected branch
        }
    }, [repoLink]); // Dependency only on repoLink

    // Update local state when implementConfig is fetched or updated
    useEffect(() => {
        if (implementConfig) {
            console.log("Implement config loaded:", implementConfig);
            setRepoLink(implementConfig.githubLink || ''); // Set default empty string if null/undefined
            setSelectedBranch(implementConfig.githubBranch || '');
            setConfigId(implementConfig.id || null); // Assuming 'id' is the key for config ID
        } else {
             // Optionally reset if config is null (e.g., no config found for project)
             // setRepoLink('');
             // setSelectedBranch('');
             // setConfigId(null);
        }
    }, [implementConfig]); // Dependency on implementConfig

    // Fetch implement config
    const fetchImplementConfig = async (currentProjectId) => {
        // Ensure projectId is valid before fetching
        if (!currentProjectId) {
            console.error("Cannot fetch implement config without a project ID.");
            return;
        }
        console.log(`Workspaceing config from http://localhost:3001/implementConfig/${currentProjectId}`);
        try {
            const response = await axios.get(`http://localhost:3001/implementConfig/${currentProjectId}`);
            if (response.data) {
                setImplementConfig(response.data); // Update state with fetched data
            } else {
                console.log("No implement config found for this project.");
                setImplementConfig(null); // Set to null if no data is returned
                setConfigId(null);
                setRepoLink('');
                setSelectedBranch('');
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log("Implement config endpoint returned 404 (Not Found).");
                setImplementConfig(null); // Treat 404 as no config exists
                setConfigId(null);
                setRepoLink('');
                setSelectedBranch('');
            } else {
                console.error("Error fetching implement config:", error);
                toast.error("Failed to load repository configuration."); // User feedback
            }
        }
    };

    // Fetch branches from GitHub
    const fetchBranchesFromRepo = async () => {
        if (!repoLink) return;
        // Basic validation for GitHub URL format
        if (!repoLink.startsWith('https://github.com/')) {
             console.warn("Invalid GitHub URL format:", repoLink);
             toast.warn("Invalid GitHub URL format.");
             setBranches([]);
             setSelectedBranch('');
             return;
        }
        const repoName = repoLink.replace('https://github.com/', '').replace('.git', '').split('/').slice(0, 2).join('/'); // Extract "user/repo"
        if (!repoName || repoName.split('/').length !== 2) {
            console.warn("Could not extract repository name from URL:", repoLink);
            toast.warn("Could not determine repository name from URL.");
             setBranches([]);
             setSelectedBranch('');
            return;
        }

        const apiUrl = `https://api.github.com/repos/${repoName}/branches`;
        console.log("Fetching branches from:", apiUrl);

        // Use a loading state specific to branches if needed, otherwise reuse main 'loading'
        // setLoading(true); // If reusing main loader

        try {
            const headers = {};
             // Add Authorization header ONLY if apiToken exists
             if (apiToken) {
                headers['Authorization'] = `token ${apiToken}`;
                console.log("Using API token for fetching branches.");
            } else {
                console.warn("REACT_APP_API_TOKEN is not set. Fetching branches anonymously (rate limits apply).");
                toast.info("Fetching branches without authentication token (rate limits may apply).")
            }

            const response = await fetch(apiUrl, { headers });

            if (response.ok) {
                const data = await response.json();
                console.log("Branches fetched successfully:", data);
                setBranches(data || []); // Ensure it's an array
                 // Optional: Automatically select branch if config exists and matches a fetched branch
                 if (implementConfig && implementConfig.githubBranch && data.some(b => b.name === implementConfig.githubBranch)) {
                    setSelectedBranch(implementConfig.githubBranch);
                 } else if (data.length > 0) {
                     // Optionally select the first branch or common branches like 'main' or 'master' if no config match
                     const defaultBranch = data.find(b => b.name === 'main') || data.find(b => b.name === 'master') || data[0];
                     if (defaultBranch && !selectedBranch) { // Only set if no branch is currently selected
                        // setSelectedBranch(defaultBranch.name);
                        // console.log(`Auto-selected default branch: ${defaultBranch.name}`);
                     }
                 }
            } else {
                console.error(`Failed to fetch branches: ${response.status} ${response.statusText}`);
                const errorData = await response.text(); // Get more details if possible
                console.error("Error details:", errorData);
                toast.error(`Failed to fetch branches: ${response.statusText}`);
                setBranches([]); // Clear branches on error
                setSelectedBranch('');
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
            toast.error('An error occurred while fetching branches.');
            setBranches([]); // Clear branches on error
            setSelectedBranch('');
        } finally {
            // setLoading(false); // If reusing main loader
        }
    };

    // Handle repo link input change
    const handleRepoLinkChange = (event) => {
        setRepoLink(event.target.value);
        // Don't fetch branches immediately here, let the useEffect handle it
        // Clear existing files when link changes significantly
        setFileNames([]);
        setExpandedFolders([]);
    };

    // Toggle folder open/close in the file tree
    const toggleFolder = (folderPath) => {
        setExpandedFolders((prev) => {
            if (prev.includes(folderPath)) {
                return prev.filter((path) => path !== folderPath);
            } else {
                // Add the folder and potentially its parent folders if needed for structure
                const pathsToAdd = [folderPath];
                // // Optional: Add parent paths if you want auto-expansion up the tree
                // let currentPath = folderPath;
                // while (currentPath.includes('/')) {
                //     currentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
                //     if (!prev.includes(currentPath)) {
                //         pathsToAdd.push(currentPath);
                //     }
                // }
                return [...prev, ...pathsToAdd];
            }
        });
    };

    // --- Filtering functions for GitHub files ---
    const isSourceCodeFile = (fileName) => {
        // More comprehensive list, adjust as needed
        const allowedExtensions = [
            '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.cs', // C#, added h/hpp
            '.html', '.css', '.scss', '.less', '.vue', '.go', '.php', '.rb', '.swift', // Added more web/backend
            '.kt', '.kts', '.dart', '.rs', '.sql', // Added Kotlin, Dart, Rust, SQL
            // Add config files if relevant? e.g., '.json', '.yaml', '.xml'
            // '.json', '.yaml', '.xml', '.properties', '.ini'
            ];
        return allowedExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    };

    const isIgnoredFolder = (folderName) => {
        const ignoredFolders = [
            'node_modules', '.git', '.github', 'dist', 'build', '__pycache__',
            '.vscode', '.idea', 'vendor', 'Pods', // Common IDE/dependency folders
            'target', // Java/Rust build output
            'bin', 'obj', // .NET build output
             'coverage', // Test coverage reports
             '.next', '.nuxt', // Next.js / Nuxt.js build folders
             'log', 'logs', // Log folders
             'temp', 'tmp' // Temporary folders
            ];
        return ignoredFolders.includes(folderName.toLowerCase());
    };

    const isIgnoredFile = (fileName) => {
        const lowerCaseFileName = fileName.toLowerCase();
        const ignoredFiles = [
            'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', // Node lockfiles
            'gemfile', 'gemfile.lock', // Ruby
            'requirements.txt', 'pipfile', 'pipfile.lock', 'poetry.lock', // Python
            'composer.json', 'composer.lock', // PHP
            'go.mod', 'go.sum', // Go
            'pom.xml', 'build.gradle', 'settings.gradle', // Java/Kotlin build files
            'project.pbxproj', // Xcode
             '.ds_store', // macOS system file
             'thumbs.db', // Windows system file
             '.gitignore', // Git ignore file itself
             'readme.md', 'license', 'contributing.md', // Common project meta files (consider keeping README?)
             '.env', // Environment variables (should NEVER be committed)
             '.env.local', '.env.development', '.env.production',
             // Add specific config files you want to ignore by default
             'dockerfile', 'docker-compose.yml',
             'webpack.config.js', 'babel.config.js', 'tsconfig.json', '.eslintrc.js', '.prettierrc.js', // Common tooling configs
             'vite.config.js', 'vite.config.ts',
            ];
        // Allow README.md, LICENSE to potentially be shown? Modify list above if needed.
         if (lowerCaseFileName === 'readme.md' || lowerCaseFileName === 'license') {
             return false; // Example: explicitly allow these common files
         }

        return ignoredFiles.includes(lowerCaseFileName);
    };
    // --- End Filtering functions ---


    // Recursive function to fetch directory contents, filtering ignored items
    const fetchAndBuildTreeRecursive = async (repoName, path = '') => {
        const apiUrl = `https://api.github.com/repos/${repoName}/contents/${path}?ref=${selectedBranch}`;
        // console.log("Fetching tree part:", apiUrl);

        try {
            const headers = {};
            if (apiToken) {
                 headers['Authorization'] = `token ${apiToken}`;
            }
             const response = await fetch(apiUrl, { headers });

            if (!response.ok) {
                console.error(`Failed to fetch contents for path "${path}": ${response.status} ${response.statusText}`);
                 // Handle rate limits specifically if possible (status 403/429)
                 if (response.status === 403 || response.status === 429) {
                    toast.error(`GitHub API rate limit exceeded while fetching /${path}. Please try again later or use an API token.`);
                 }
                return []; // Return empty for this branch on error
            }

            const items = await response.json();
            if (!Array.isArray(items)) {
                 console.error(`Invalid response format for path "${path}". Expected array, got:`, items);
                 return [];
            }

            const treePart = [];
            // Process items sequentially or in parallel (be mindful of rate limits with parallel)
            for (const item of items) {
                if (item.type === 'file') {
                    if (!isIgnoredFile(item.name) && isSourceCodeFile(item.name)) {
                        treePart.push({ name: item.name, type: 'file', path: item.path, size: item.size, sha: item.sha });
                    } else {
                        // console.log(`Ignoring file: ${item.path}`);
                    }
                } else if (item.type === 'dir') {
                    if (!isIgnoredFolder(item.name)) {
                        // Recursively fetch contents of the directory
                        const children = await fetchAndBuildTreeRecursive(repoName, item.path);
                        // Only add the folder to the tree if it's not empty after filtering
                        if (children.length > 0) {
                             treePart.push({ name: item.name, type: 'folder', path: item.path, children: children, sha: item.sha });
                        } else {
                           // console.log(`Ignoring empty or fully ignored folder: ${item.path}`);
                        }
                    } else {
                        // console.log(`Ignoring folder: ${item.path}`);
                    }
                }
            }
            // Sort files and folders alphabetically
             treePart.sort((a, b) => {
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name); // Sort by name if types are the same
                }
                return a.type === 'folder' ? -1 : 1; // Folders first
            });
            return treePart;

        } catch (error) {
            console.error(`Error fetching or building tree for path "${path}":`, error);
            toast.error(`Error fetching repository structure for /${path}.`);
            return []; // Return empty for this branch on error
        }
    };

    // Fetch files from GitHub repository root
    const fetchFilesFromRepo = async () => {
        if (!repoLink || !selectedBranch) {
            toast.warn("Please provide a repository URL and select a branch.");
            return;
        }
        if (!repoLink.includes('github.com')) {
            toast.error("Invalid GitHub URL format.");
            return;
        }

        const repoName = repoLink.replace('https://github.com/', '').replace('.git', '').split('/').slice(0, 2).join('/');
        if (!repoName || repoName.split('/').length !== 2) {
            toast.error("Could not determine repository name from URL.");
            return;
        }

        console.log(`Workspaceing files for ${repoName}, branch ${selectedBranch}`);
        setLoading(true);
        setFileNames([]); // Clear previous results
        setExpandedFolders([]); // Collapse all folders

        try {
            const fullTree = await fetchAndBuildTreeRecursive(repoName);
            console.log("Full file tree built:", fullTree);
            setFileNames(fullTree);

             // Automatically expand the first level folders for better UX, if any exist
             const firstLevelFolders = fullTree
                 .filter(item => item.type === 'folder')
                 .map(item => item.path); // Use path as the unique identifier
             setExpandedFolders(firstLevelFolders);
             console.log("Auto-expanded first level folders:", firstLevelFolders);

             if (fullTree.length === 0) {
                 toast.info("No source code files found in the repository (or all were ignored).");
             }

        } catch (error) {
            // Error handled within fetchAndBuildTreeRecursive, but catch here just in case
            console.error('Error fetching repository file tree:', error);
            toast.error(`Error fetching repository file tree: ${error.message}`);
            setFileNames([]); // Ensure file list is empty on error
        } finally {
            setLoading(false);
        }
    };

    // --- Removed CRUD functions for Requirements, Design, Testcase, Traceability ---
    // --- Removed handleDelete function as it was only for criteria ---

    // Update implement config
    const handleUpdateImplementConfig = async () => {
        if (!configId) {
            toast.error("Cannot update: Configuration ID is missing.");
            return;
        }
        if (!projectId){
             toast.error("Cannot update: Project ID is missing.");
             return;
        }
        if (!repoLink || !selectedBranch) {
            toast.warn("Please provide a GitHub repository link and select a branch.");
            return;
        }
         // Basic URL validation
         if (!repoLink.startsWith('https://github.com/')) {
            toast.error("Invalid GitHub URL format.");
            return;
        }

        console.log(`Updating implement config ID ${configId} for project ${projectId}`);
        try {
            const response = await axios.put(`http://localhost:3001/implementConfig/${configId}`, {
                githubLink: repoLink,
                githubBranch: selectedBranch,
                projectId: projectId // Send projectId for backend validation/association
            });

            if (response.status === 200) {
                toast.success("Repository configuration updated successfully!");
                setImplementConfig(response.data); // Update state with the response (might include updated fields)
                // setIsSaved(true); // Set flag if needed
                // No need to call fetchImplementConfig again if response.data is the updated config
            } else {
                 // Handle unexpected success statuses if necessary
                 console.warn("Update configuration responded with status:", response.status);
                 toast.warn(`Configuration updated, but received status: ${response.status}`);
                 fetchImplementConfig(projectId); // Refetch to be sure
            }
        } catch (error) {
            console.error("Error updating implement config:", error);
            const errorMsg = error.response?.data?.message || error.message || "An unknown error occurred";
            toast.error(`Failed to update configuration: ${errorMsg}`);
        }
    };

    // Save new implement config
    const handleSaveImplementConfig = async () => {
         if (configId) {
            toast.warn("Configuration already exists. Use the 'Update' button instead.");
            return;
        }
        if (!projectId){
             toast.error("Cannot save: Project ID is missing.");
             return;
        }
        if (!repoLink || !selectedBranch) {
            toast.warn("Please provide a GitHub repository link and select a branch.");
            return;
        }
         // Basic URL validation
         if (!repoLink.startsWith('https://github.com/')) {
            toast.error("Invalid GitHub URL format.");
            return;
        }

        console.log(`Saving new implement config for project ${projectId}`);
        try {
            const response = await axios.post("http://localhost:3001/implementConfig", {
                githubLink: repoLink,
                githubBranch: selectedBranch,
                projectId: projectId // Ensure projectId is sent
            });

            if (response.status === 201) { // Check for 201 Created status
                toast.success("Repository configuration saved successfully!");
                setImplementConfig(response.data); // Update state with the newly created config (including its ID)
                setConfigId(response.data.id); // Explicitly set the new config ID
                // setIsSaved(true); // Set flag if needed
            } else {
                // Handle unexpected success statuses if necessary
                 console.warn("Save configuration responded with status:", response.status);
                 toast.warn(`Configuration saved, but received status: ${response.status}`);
                 fetchImplementConfig(projectId); // Refetch to ensure correct state
            }
        } catch (error) {
            console.error("Error saving implement config:", error);
             const errorMsg = error.response?.data?.message || error.message || "An unknown error occurred";
            // Check for specific errors, e.g., duplicate config for the project if the backend enforces it
            if (error.response?.status === 409) { // Conflict
                toast.error(`Failed to save configuration: A configuration might already exist for this project. ${errorMsg}`);
                fetchImplementConfig(projectId); // Refresh to get the existing config
            } else {
                toast.error(`Failed to save configuration: ${errorMsg}`);
            }
        }
    };

    // --- Removed renderTabContent function and related tab state/logic ---

    return (
        <div className="project-config"> {/* Keep main container class */}
            <header className="config-header">
                <h1>Link To Github</h1> {/* Updated title */}
                <div className="header-actions">
                    {/* Add any header buttons if needed */}
                </div>
            </header>

            {/* Removed Tabs Container */}

            <main className="config-content">
                 {/* Render Implementation Section Directly */}
                 {!projectId ? (
                     <div className="loading-container">
                        <p style={{color: 'red'}}>Waiting for Project ID from URL...</p>
                     </div>
                 ) : (
                     <div className="implementation-section"> {/* Use a wrapper if needed */}
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
                            loading={loading} // Pass the file fetching loading state
                            repoLink={repoLink}
                            selectedBranch={selectedBranch}
                            fileNames={fileNames} // Pass the raw file names
                            expandedFolders={expandedFolders}
                            toggleFolder={toggleFolder}
                        />
                    </div>
                 )}
            </main>
        </div>
    );
};

export default LinkGit;