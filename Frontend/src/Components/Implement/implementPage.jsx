import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "../Implement/CSS/implementPage.css";
import { useLocation, useNavigate } from 'react-router-dom';
import fetchfileimplement from "../Implement/image/fetch-file.png";
import Select from 'react-select';

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
  const apiToken = process.env.REACT_APP_API_TOKEN;
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  const filteredDesigns = designs.filter(design => {
    const searchLower = searchQuery.toLowerCase();
    return (
      design.design_id.toString().includes(searchLower) ||  // ค้นหา Design ID
      design.diagram_name.toLowerCase().includes(searchLower) ||  // ค้นหาชื่อ
      design.design_type.toLowerCase().includes(searchLower)  // ค้นหาประเภท
    );
  });

  const fetchCommits = async () => {
    if (!repoLink) return;

    const repoName = repoLink.replace('https://github.com/', '').replace('.git', '');
    const apiUrl = `https://api.github.com/repos/${repoName}/commits?path=${selectedFilePath}`;
    // console.log("apiUrl", apiUrl) // Debug

    try {
      const response = await fetch(apiUrl, {
        headers: {
          // เปลี่ยนจาก hardcode token มาใช้ตัวแปร apiToken ที่ดึงมาจาก .env
          'Authorization': `token ${apiToken}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Commits data: ", data);

        // ป้องกัน error: ตรวจสอบ commit.files ก่อน
        const updatedFiles = data.map(commit => {
          if (commit.files && Array.isArray(commit.files)) {
            return commit.files;
          } else {
            // ถ้า commit.files ไม่มี, หรือไม่ใช่ array, return empty array
            return []; // สำคัญ: ต้อง return array เปล่า เพื่อให้ .flat() ทำงานได้
          }
        }).flat();

        console.log("updatedFiles", updatedFiles); // Debug: ดูว่า updatedFiles มีอะไรบ้าง

        const modifiedFiles = updatedFiles.filter(file => {
          // ป้องกัน error: ตรวจสอบ file ก่อนเข้าถึง file.filename
          return file && file.filename === selectedFilePath;
        });
        return modifiedFiles.length > 0;
      }
    } catch (error) {
      console.error('Error fetching commits:', error);
    }
  };


  useEffect(() => {
    // เรียกใช้ fetchCommits เพื่อดึงข้อมูลการเปลี่ยนแปลง
    fetchCommits().then(modifiedFiles => {
      setModifiedFiles(modifiedFiles); // อัพเดตไฟล์ที่ถูกเปลี่ยนแปลง
    });
  }, [repoLink, selectedFilePath]); // update เมื่อ repoLink หรือ selectedFilePath เปลี่ยน

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

  useEffect(() => {
    const storedRepoLink = localStorage.getItem("repoLink");
    const storedBranch = localStorage.getItem("repoBranch");

    if (storedRepoLink) setRepoLink(storedRepoLink);
    if (storedBranch) setRepoBranch(storedBranch);

    fetchImplementConfig();
    fetchDesigns(); // เรียก fetchDesigns ที่นี่
  }, [projectId]); // Fetch config and designs when projectId changes

  useEffect(() => {
    const storedFiles = localStorage.getItem("repoFiles");
    if (storedFiles) {
      setFileNames(JSON.parse(storedFiles)); // โหลดไฟล์เก่ามาใช้
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
        return prev.filter((path) => path !== folderPath); // ปิดโฟลเดอร์ที่ถูกกดซ้ำ
      } else {
        return [...prev, folderPath]; // เปิดโฟลเดอร์ที่ถูกกด
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

      // ส่ง POST ไปที่ `/fetchfilelog` เพื่อบันทึก log
      const logResponse = await axios.post('http://localhost:3001/fetchfilelog', { project_id: projectId });

      if (logResponse.status !== 200) {
        throw new Error("Failed to create fetch log");
      }

      const fetchRound = logResponse.data.fetchRound;
      console.log(`Fetching files for project ${projectId}, round ${fetchRound}`);

      const response = await fetch(apiUrl, {
        headers: {
          // เปลี่ยนจาก hardcode token มาใช้ตัวแปร apiToken ที่ดึงมาจาก .env
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
            await new Promise(resolve => setTimeout(resolve, 80)); // จำลองเวลาโหลด
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




  // เคลียร์ค่าเมื่อโหลดหน้าใหม่หรือไม่ใช้ค่าเก่า
  useEffect(() => {
    setFileNames([]); // รีเซ็ตค่า fileNames ที่โหลดเก่ามา
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
          // เปลี่ยนจาก hardcode token มาใช้ตัวแปร apiToken ที่ดึงมาจาก .env
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
        ? prev.filter((id) => id !== designId) // เอาออกถ้าถูกเลือกซ้ำ
        : [...prev, designId]; // เพิ่มเข้าไปถ้ายังไม่มี

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
        design_id: designIds // จัดเก็บ design_ids หลายๆ อัน
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
              design_ids: [design_id],  // initial array
              relation_at,
            };
          } else {
            acc[key].design_ids.push(design_id);  // add design_id
          }

          return acc;
        }, {});

        // แปลง object เป็น array เพื่อแสดงผล
        const relationsArray = Object.values(formattedRelations);

        // แปลง design_ids ให้เป็น string โดยใช้ join
        const formattedRelationsArray = relationsArray.map(relation => ({
          ...relation,
          design_ids: relation.design_ids.join(','), // เปลี่ยนจาก comma เป็น dash
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
    <div className="implement-page">
      <div className="implement-repo-branch-container"> {/* เพิ่ม container */}
        <label className="implement-label">
          Link Github Repository:
          <input
            type="text"
            value={repoLink}
            disabled
            onChange={handleRepoLinkChange}
            placeholder="e.g., username/repository"
            className="implement-input"
          />
        </label>
        <label className="implement-label">
          Github Branch:
          <input
            type="text"
            value={repoBranch}
            disabled
            onChange={handleBranchChange}
            placeholder="e.g., main"
            className="implement-input"
          />
        </label>
        <button onClick={fetchFilesFromRepo} disabled={loading} className="implement-fetch-btn">
          <img src={fetchfileimplement} alt="fetchfileimplement" className="fetchfileimplement" />  {loading ? 'Loading...' : 'Fetch Files'}
        </button>
      </div>

      <button onClick={handleRefresh} className="implement-refresh-btn">
        Refresh
      </button>
      <div className="implement-main-container">
        <div className="implement-left-column">
          <div className="implement-files-section">
            <h3 className="implement-section-title">Select Files from Repository:</h3>
            {loading ? (
              <div>
                <p>Loading files...</p>
                <div className="implement-progress-container">
                  <div
                    className="implement-progress-bar"
                    style={{ width: `${loadingPercentage}%` }}
                  ></div>
                </div>
                <p>{loadingPercentage.toFixed(2)}%</p>
              </div>
            ) : fileNames.length > 0 ? (
              <FileTree
                files={fileNames}
                onSelect={handleFileSelection}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                fileStatuses={fileStatuses}
                selectedFiles={selectedFiles} // ส่ง selectedFiles ไปยัง FileTree
              />
            ) : (
              <p className="implement-no-files">Please click "Fetch Files" first.</p>
            )}
          </div>
        </div>

        <div className="implement-right-column">
          <div className="implement-designs-section">
            <div className='filter-design'>
              Filter
              <input
                type="text"
                placeholder="Search by Design ID, Name, or Type"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <h3 className="implement-section-title">Selected Designs:</h3>
            {/* ตรงนี้จะเปลี่ยน */}
            {filteredDesigns.length > 0 ? (
              <ul className="implement-design-list">
                {filteredDesigns.map((design) => (
                  <li key={design.design_id} className="implement-design-item">
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(design.design_id)}
                      onChange={() => {
                        if (selectedFilePath) {
                          handleDesignSelection(selectedFilePath, design.design_id);
                        }
                      }}
                      className="implement-checkbox"
                    />
                    SD{design.design_id} - {design.diagram_name} - {design.design_type}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{selectedFilePath ? "No designs to be matched." : "No file selected."}</p>
            )}
            <button onClick={handleSave} className="implement-save-btn">
              Save
            </button>
          </div>

        </div>
      </div>

      <div className="implement-relation">
        <h2 className="relation-topic">File and Design Relations (Filename ↔ Design ID)</h2>
        {relations.length > 0 ? (
          <table className="relation-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Filename</th>
                <th>Design IDs</th>
                <th>Relation At</th>
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
                  <tr key={index}>
                    <td data-label="#">{index + 1}</td>
                    <td data-label="Filename">{relation.implement_filename}</td>
                    <td data-label="Design IDs"> {relation.design_ids}</td>
                    <td data-label="Relation At" className="relation-at">
                      {formattedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No relations found</p>
        )}
      </div>

    </div>
  );
};

const FileTree = ({ files, onSelect, expandedFolders, toggleFolder, parentPath = "", selectedFiles }) => {
  return (
    <ul className="implement-file-tree">
      {files.map((item) => {
        const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;

        return (
          <li key={fullPath} className="implement-file-item">
            {item.type === "folder" ? (
              <>
                <span
                  className="implement-folder-label"
                  onClick={() => toggleFolder(fullPath)}
                  aria-expanded={expandedFolders && expandedFolders.includes(fullPath)}
                >
                  {expandedFolders && expandedFolders.includes(fullPath) ? "📂" : "📁"} {item.name}
                </span>
                {expandedFolders && expandedFolders.includes(fullPath) && item.children ? (
                  <FileTree
                    files={item.children}
                    onSelect={onSelect}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    parentPath={fullPath}
                    selectedFiles={selectedFiles} // ส่ง selectedFiles ไปยัง FileTree
                  />
                ) : null}
              </>
            ) : (
              <>
                <input
                  type="checkbox"
                  onChange={() => onSelect(fullPath)}
                  className="implement-checkbox"
                  checked={selectedFiles.includes(item.name)} // ตรวจสอบว่าไฟล์ถูกเลือกหรือไม่
                />
                📄 {item.name}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
};


export default ImplementPage;
