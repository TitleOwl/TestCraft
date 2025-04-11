import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

// --- ใช้ Path CSS ที่ถูกต้อง ---
import "./testcase_css/CreateVeriTest.css"; // <<--- ตรวจสอบ Path นี้ หรือเปลี่ยนเป็น Path ที่ถูกต้อง

// --- Import Icons ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardCheck,
  faUsers,
  faCheckCircle,
  faTimes,
  faArrowLeft,
  faSearch,
  faFilter,
  faSpinner,
  faExclamationTriangle,
  faQuestionCircle
} from '@fortawesome/free-solid-svg-icons';

const CreateVeriTest = () => {
  // --- State และ Hooks เดิม ---
  const [workingTestCase, setWorkingTestCase] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedTestCase, setSelectedTestCase] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testcaseError, setTestCaseError] = useState(null);
  const [membersError, setMembersError] = useState(null);

  // --- State สำหรับ Search/Filter (ถ้าต้องการ Implement) ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  // --- Fetch Logic เดิม ---
  useEffect(() => { /* ... โค้ด fetch testcase เดิม ... */
    if (projectId) {
      setLoading(true);
      axios.get(`http://localhost:3001/testcases?project_id=${projectId}`)
        .then((res) => {
          const filteredTestCases = res.data.filter(
            (testcase) => testcase.testcase_status === "WORKING"
          );
          setWorkingTestCase(filteredTestCases);
          setTestCaseError(null);
        })
        .catch(() => {
          setTestCaseError("Failed to load testcase. Please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [projectId]);
  useEffect(() => { /* ... โค้ด fetch members เดิม ... */
    if (projectId) {
      setIsLoadingMembers(true);
      axios.get(`http://localhost:3001/projectname?project_id=${projectId}`)
        .then((res) => {
          if (Array.isArray(res.data)) {
            setMembers(res.data);
            setMembersError(null);
          } else {
            console.error("Received non-array data for members:", res.data);
            setMembersError("Invalid project member data format.");
            setMembers([]);
          }
        })
        .catch(() => {
          setMembersError("Failed to load project members.");
          setMembers([]);
        })
        .finally(() => {
          setIsLoadingMembers(false);
        });
    }
  }, [projectId]);

  // --- Handlers เดิม ---
  const handleSelect = (id, setter) => { /* ... โค้ดเดิม ... */
    setter((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };
  const handleCheckboxReviewer = (memberName) => { /* ... โค้ดเดิม ... */
    setSelectedReviewers((prevState) => ({
      ...prevState,
      [memberName]: !prevState[memberName],
    }));
  };
  const handleBack = () => { /* ... โค้ดเดิม ... */
    navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } })
  };

  // --- Logic การ Filter (ถ้า Implement Search/Filter) ---
  const filteredTestCases = workingTestCase.filter(testcase => {
    const tcIdString = `SD-00${testcase.testcase_id}`;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (testcase.testcase_name && testcase.testcase_name.toLowerCase().includes(searchLower)) ||
      tcIdString.toLowerCase().includes(searchLower);
    const matchesType = filterType ? testcase.testcase_type === filterType : true;
    return matchesSearch && matchesType;
  });
  const testcaseTypes = [...new Set(workingTestCase.map(tc => tc.testcase_type))].filter(Boolean).sort();

  // --- Handler Select All (ปรับปรุงให้ใช้ Filtered Data) ---
  const handleSelectAllTestCases = () => {
    if (selectedTestCase.length === filteredTestCases.length && filteredTestCases.length > 0) {
      setSelectedTestCase([]);
    } else {
      setSelectedTestCase(filteredTestCases.map(tc => tc.testcase_id));
    }
  };
  const handleSelectAllReviewers = () => {
    const allReviewerNames = members.flatMap(member => {
      try {
        const memberInfo = member.project_member ? JSON.parse(member.project_member) : [];
        return memberInfo.map(info => info.name);
      } catch (e) { return []; }
    });
    const allSelected = allReviewerNames.length > 0 && allReviewerNames.every(name => selectedReviewers[name]);
    if (allSelected) {
      setSelectedReviewers({});
    } else {
      const newSelectedReviewers = {};
      allReviewerNames.forEach(name => { newSelectedReviewers[name] = true; });
      setSelectedReviewers(newSelectedReviewers);
    }
  };

  // --- handleCreateVerification (Logic เดิม) ---
  const handleCreateVerification = async () => { /* ... โค้ดเดิม ... */
    const selectedReviewerNames = Object.keys(selectedReviewers).filter(
      (name) => selectedReviewers[name]
    );

    if (!projectId) {
      toast.error("Invalid project ID.");
      return;
    }

    if (selectedTestCase.length === 0 || selectedReviewerNames.length === 0) {
      toast.warning("Please select at least one testcase and one reviewer.");
      return;
    }

    const storedUsername = localStorage.getItem("username");
    const createBy = storedUsername;

    if (!createBy) {
      toast.error("No user found. Please login again.");
      return;
    }

    try {
      console.log("Checking test procedures for:", selectedTestCase);
      const procedureChecks = selectedTestCase.map(testcaseId =>
        axios.get(`http://localhost:3001/api/test-procedures?project_id=${projectId}&testcase_id=${testcaseId}`)
      );
      await Promise.all(procedureChecks);
      console.log("Test procedures check passed.");

      const timestamp = new Date().toISOString();
      const payload = selectedTestCase.map((testcaseId) => ({
        veritestcase_id: null,
        project_id: projectId,
        create_by: createBy,
        testcase_id: testcaseId,
        veritestcase_at: timestamp,
        veritestcase_by: selectedReviewerNames.reduce((acc, reviewerName) => {
          acc[reviewerName] = false;
          return acc;
        }, {}),
      }));
      console.log("Payload for creation:", payload);

      setIsSubmitting(true);

      console.log("Updating test case statuses...");
      const statusUpdates = selectedTestCase.map(testcaseId =>
        axios.put(`http://localhost:3001/update-testcase-status-waitingfor-ver/${testcaseId}`, {
          testcase_status: "WAITING FOR VERIFICATION",
        })
      );
      await Promise.all(statusUpdates);
      console.log("Status updates completed.");

      console.log("Creating verification records...");
      const response = await axios.post("http://localhost:3001/createveritestcase", payload);
      console.log("Verification creation response:", response);

      if (response.status === 201) {
        toast.success("TestCase verification created successfully!");

        console.log("Adding history records...");
        const historyAdds = selectedTestCase.map(testcaseId =>
          axios.post("http://localhost:3001/addHistoryTestcase", {
            testcase_id: testcaseId,
            testcase_status: "WAITING FOR VERIFICATION",
          })
        );
        await Promise.all(historyAdds);
        console.log("History records added.");

        setWorkingTestCase((prev) =>
          prev.filter((testcase) => !selectedTestCase.includes(testcase.testcase_id))
        );
        setSelectedTestCase([]);
        setSelectedReviewers({});

      } else {
        console.error("Failed to create verification, status:", response.status, response.data);
        toast.error(response.data?.message || "Failed to create verification(s).");
      }
    } catch (error) {
      console.error("Error during verification process:", error);
      if (axios.isAxiosError(error) && error.config.url.includes('/api/test-procedures')) {
        console.error("Error specifically during test procedure check:", error.response?.data || error.message);
        Swal.fire({
          icon: "warning",
          title: "Cannot Create Verification",
          text: "Please add Test Steps to all selected test cases before creating a verification test.",
          confirmButtonText: "OK",
        });
      } else {
        toast.error(error.response?.data?.message || "An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- JSX Structure ที่ปรับปรุงแล้ว ---
  return (
    <div className="create-tc-veri-container"> {/* ใช้ Prefix ใหม่ */}
      {/* Header */}
      <div className="create-tc-veri-header">
        <button className="create-tc-veri-back-btn" onClick={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1>
          <FontAwesomeIcon icon={faClipboardCheck} className="create-tc-veri-title-icon" />
          Create Testcase Verification
        </h1>
        <button className="create-tc-veri-help-btn" title="Help" style={{ /* เพิ่ม style inline หรือใช้ class */
          position: 'absolute',
          top: '15px',
          right: '20px',
          fontSize: '1.6rem',
          background: 'none',
          border: 'none',
          color: 'gray', // ปรับสีตาม theme header
          cursor: 'pointer'
        }}>
          <FontAwesomeIcon icon={faQuestionCircle} />
        </button>
      </div>

      {/* Content */}
      <div className="create-tc-veri-content">
        {/* --- Left Panel (Test Cases) --- */}
        <div className="create-tc-veri-left-panel">
          {/* Panel Header */}
          <div className="create-tc-veri-panel-header">
            <h2>
              <FontAwesomeIcon icon={faClipboardCheck} /> Testcase
              {!loading && !testcaseError && (
                <span className="create-tc-veri-count-badge">
                  {workingTestCase.length}
                </span>
              )}
            </h2>
            {/* Search and Filter Tools */}
            <div className="create-tc-veri-tools">
              <div className="create-tc-veri-search">
                <FontAwesomeIcon icon={faSearch} className="create-tc-veri-search-icon" />
                <input
                  type="text"
                  placeholder="Search testcases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="create-tc-veri-search-input"
                />
                {searchQuery && (
                  <button
                    className="create-tc-veri-clear-search"
                    onClick={() => setSearchQuery("")}
                    title="Clear search"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>
              <div className="create-tc-veri-filter">
                <FontAwesomeIcon icon={faFilter} className="create-tc-veri-filter-icon" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="create-tc-veri-filter-select"
                >
                  <option value="">All Types</option>
                  {testcaseTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Loading/Error/Empty State */}
          {loading ? (
            <div className="create-tc-veri-loading">...</div>
          ) : testcaseError ? (
            <div className="create-tc-veri-error-message">...</div>
          ) : workingTestCase.length === 0 ? (
            <div className="create-tc-veri-empty-state">...</div>
          ) : (
            <>
              {/* Select All Row */}
              <div className="create-tc-veri-select-all">
                {/* --- เพิ่ม div ครอบ checkbox และ label --- */}
                <div className="create-tc-veri-select-all-left">
                  <input
                    type="checkbox"
                    className="create-tc-veri-checkbox"
                    // className="create-tc-veri-checkbox" // Class นี้อาจจะไม่จำเป็นถ้า CSS เจาะจงจาก container ได้
                    id="select-all-testcases"
                    checked={filteredTestCases.length > 0 && selectedTestCase.length === filteredTestCases.length}
                    onChange={handleSelectAllTestCases}
                    disabled={filteredTestCases.length === 0}
                  />
                  <label htmlFor="select-all-testcases">Select All</label>
                </div>
                {/* --- ^^^ จบส่วนที่ครอบ --- */}

                {/* --- Span ของ Count อยู่นอก div ที่ครอบ --- */}
                <span className="create-tc-veri-selected-count">
                  {selectedTestCase.length} of {filteredTestCases.length} selected
                </span>
              </div>

              {/* Test Case Table */}
              <div className="create-tc-veri-table-container">
                <table className="create-tc-veri-testcase-table">
                  <thead>
                    <tr>
                      <th className="create-tc-veri-checkbox-column">Select</th>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTestCases.length === 0 ? (
                      <tr><td colSpan="5" className="create-tc-veri-no-results">No results</td></tr>
                    ) : (
                      filteredTestCases.map((testcase) => (
                        <tr key={testcase.testcase_id} className={selectedTestCase.includes(testcase.testcase_id) ? "selected-row" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              className="create-tc-veri-checkbox"
                              checked={selectedTestCase.includes(testcase.testcase_id)}
                              onChange={() => handleSelect(testcase.testcase_id, setSelectedTestCase)}
                            />
                          </td>
                          <td className="tc-id">SD-00{testcase.testcase_id}</td>
                          <td>{testcase.testcase_name}</td>
                          <td>
                            {/* ใส่ span สำหรับ Badge */}
                            <span className={`tc-type-badge ${testcase.testcase_type
                              ? `type-${testcase.testcase_type.toLowerCase().replace(/\s+/g, '-')}`
                              : 'type-unknown'}`}>
                              {testcase.testcase_type || 'N/A'}
                            </span>
                          </td>
                          <td>
                            {/* ใส่ span สำหรับ Badge */}
                            <span className={`tc-status-badge status-${testcase.testcase_status?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                              {testcase.testcase_status || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* --- Right Panel (Reviewers) --- */}
        <div className="create-tc-veri-right-panel">
          <div className="create-tc-veri-panel-header">
            <h2><FontAwesomeIcon icon={faUsers} /> Reviewers</h2>
          </div>

          {isLoadingMembers ? (
            <div className="create-tc-veri-loading">...</div>
          ) : membersError ? (
            <div className="create-tc-veri-error-message">...</div>
          ) : members.length === 0 ? (
            <div className="create-tc-veri-empty-state">...</div>
          ) : (
            <div className="create-tc-veri-reviewers-container">
              {/* Select All Row for Reviewers - ใช้ Checkbox + Label */}
              <div className="create-tc-veri-select-all reviewer-select-all"> {/* มี class reviewer-select-all เพิ่มมาด้วย ดีมากครับ */}
                <input
                  type="checkbox"
                  className="create-tc-veri-checkbox"
                  id="select-all-reviewers"
                  checked={
                    /* ... Logic การเช็คสถานะ ... */
                    members.length > 0 &&
                    members.flatMap(member => { try { return JSON.parse(member.project_member || '[]').map(info => info.name); } catch { return []; } }).length > 0 &&
                    members.flatMap(member => { try { return JSON.parse(member.project_member || '[]').map(info => info.name); } catch { return []; } }).every(name => selectedReviewers[name])
                  }
                  onChange={handleSelectAllReviewers}
                  disabled={members.length === 0 || members.flatMap(member => { try { return JSON.parse(member.project_member || '[]').map(info => info.name); } catch { return []; } }).length === 0}
                />
                <label htmlFor="select-all-reviewers" className="select-all-reviewers">Select All Reviewers</label>
                {/* ไม่มี Span ของ Count ถูกต้องแล้ว */}
              </div>

              {/* Reviewers List */}
              <div className="create-tc-veri-reviewers-list">
                {members.map((member, index) => {
                  let memberInfo = [];
                  try {
                    memberInfo = typeof member.project_member === 'string'
                      ? JSON.parse(member.project_member)
                      : (Array.isArray(member.project_member) ? member.project_member : []);
                    if (!Array.isArray(memberInfo)) memberInfo = [];
                  } catch (e) { memberInfo = []; }

                  return memberInfo.map((info, roleIndex) => (
                    <div key={`reviewer-${index}-${roleIndex}`} className="create-tc-veri-reviewer-item">
                      <input
                        type="checkbox"
                        className="create-tc-veri-checkbox"
                        id={`reviewer-${info.name}-${roleIndex}`}
                        checked={selectedReviewers[info.name] || false}
                        onChange={() => handleCheckboxReviewer(info.name)}
                      />
                      <label htmlFor={`reviewer-${info.name}-${roleIndex}`} className="create-tc-veri-reviewer-label">
                        <span className="create-tc-veri-reviewer-name">{info.name}</span>
                        <span className="create-tc-veri-reviewer-role">{info.roles.join(", ")}</span> {/* Join roles with comma */}
                      </label>
                    </div>
                  ));
                })}
              </div>
            </div>
          )}

          {/* Selection Summary */}
          <div className="create-tc-veri-summary">
            <h3>Selection Summary</h3>
            <div className="create-tc-veri-summary-item">
              <span>Test Cases:</span>
              <span className="create-tc-veri-summary-count">{selectedTestCase.length}</span>
            </div>
            <div className="create-tc-veri-summary-item">
              <span>Reviewers:</span>
              <span className="create-tc-veri-summary-count">
                {Object.values(selectedReviewers).filter(Boolean).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="create-tc-veri-action-buttons">
        <button className="create-tc-veri-btn-cancel" onClick={handleBack} disabled={isSubmitting}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Test Case
        </button>
        <button
          className="create-tc-veri-btn-create"
          onClick={handleCreateVerification}
          disabled={isSubmitting || selectedTestCase.length === 0 || Object.values(selectedReviewers).filter(Boolean).length === 0}
        >
          {isSubmitting ? (
            <> <FontAwesomeIcon icon={faSpinner} spin /> Creating... </>
          ) : (
            <> <FontAwesomeIcon icon={faCheckCircle} /> Create Verification </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateVeriTest;