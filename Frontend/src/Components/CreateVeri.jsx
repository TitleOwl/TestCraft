import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/CreateVeri.css";
import Joyride, { STATUS, CallBackProps } from 'react-joyride';

// Import icons
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

const CreateVeri = () => {
  const [workingRequirements, setWorkingRequirements] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedRequirements, setSelectedRequirements] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requirementsError, setRequirementsError] = useState(null);
  const [membersError, setMembersError] = useState(null);
  const [toastId, setToastId] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // สำหรับการค้นหา requirements
  const [filterType, setFilterType] = useState(""); // สำหรับกรองประเภท requirement

  // เพิ่ม state สำหรับ alert
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState("success");
  const [alertMessage, setAlertMessage] = useState("");

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();
  const [runCreateVeriTutorial, setRunCreateVeriTutorial] = useState(false);
  const [createVeriTutorialSteps, setCreateVeriTutorialSteps] = useState([
    {
      target: '.createveri-left-panel', // ชี้ไปที่ Panel ซ้าย
      content: 'ขั้นแรก เลือก Requirement ที่ต้องการส่งตรวจสอบจากรายการด้านซ้าย (เฉพาะสถานะ WORKING)',
      placement: 'right', // แสดงทางขวาของ Panel
      disableBeacon: true,
    },
    {
      target: '.createveri-right-panel', // ชี้ไปที่ Panel ขวา
      content: 'ถัดไป เลือกผู้ตรวจสอบ (Reviewers) จากรายชื่อทางด้านขวา ที่จะให้ตรวจสอบ Requirement ที่คุณเลือก',
      placement: 'left', // แสดงทางซ้ายของ Panel
    },
    {
      // ชี้ไปที่ Checkbox แรกในรายการ Reviewers
      target: '.createveri-reviewer-item:first-child input[type="checkbox"]',
      content: "คลิกช่องสี่เหลี่ยมหน้าชื่อผู้ตรวจสอบ หรือกด 'Select All Reviewers' เพื่อเลือก",
      placement: 'bottom',
    },
    {
      target: '.createveri-btn-create', // ชี้ไปที่ปุ่ม Create Verification
      content: 'เมื่อเลือก Requirement และ Reviewer ครบแล้ว กดปุ่มนี้เพื่อสร้างงาน Verification',
      placement: 'top', // แสดงด้านบนปุ่ม
    }
  ]);

  useEffect(() => {
    // ตรวจสอบว่าเคยแสดง Tutorial หน้านี้หรือยัง
    const tutorialShown = localStorage.getItem('createVeriTutorialShown');
    if (!tutorialShown) {
      // หน่วงเวลาเล็กน้อยเพื่อให้แน่ใจว่า elements โหลดเสร็จ โดยเฉพาะหลัง fetch data
      const timer = setTimeout(() => {
        setRunCreateVeriTutorial(true);
      }, 500); // ปรับ delay ได้ตามความเหมาะสม

      return () => clearTimeout(timer); // Clear timeout ถ้า component unmount ก่อนทำงาน
    }
  }, []); // ใส่ dependency array ว่างเพื่อให้ทำงานครั้งเดียวตอน mount

  const handleRestartCreateVeriTutorial = () => {
    setRunCreateVeriTutorial(true);
  };

  // ฟังก์ชันสำหรับแสดง alert (แก้ไขให้มีการ redirect)
  const showAlertMessage = (type, message) => {
    setAlertType(type);
    setAlertMessage(message);
    setShowAlert(true);

  };

  // Fetch working requirements
  useEffect(() => {
    if (projectId) {
      setLoading(true);
      axios
        .get(`http://localhost:3001/project/${projectId}/requirement`)
        .then((res) => {
          const working = res.data.filter(
            (requirement) => requirement.requirement_status === "WORKING"
          );
          setWorkingRequirements(working);
          setRequirementsError(null);
        })
        .catch(() => {
          setRequirementsError("Failed to load requirements. Please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [projectId]);

  // Fetch project members
  useEffect(() => {
    if (projectId) {
      setIsLoadingMembers(true);
      axios
        .get(`http://localhost:3001/projectname?project_id=${projectId}`)
        .then((res) => {
          if (Array.isArray(res.data)) {
            setMembers(res.data);
            setMembersError(null);
          } else {
            setMembersError("Invalid project member data.");
          }
        })
        .catch(() => {
          setMembersError("Failed to load project members.");
        })
        .finally(() => {
          setIsLoadingMembers(false);
        });
    }
  }, [projectId]);

  // Generalized handle select for requirements
  const handleSelect = (id, setter) => {
    setter((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // ฟังก์ชั่นเลือกทั้งหมด
  const handleSelectAll = () => {
    if (selectedRequirements.length === filteredRequirements.length) {
      // ถ้าเลือกทั้งหมดแล้ว ให้ยกเลิกการเลือกทั้งหมด
      setSelectedRequirements([]);
    } else {
      // ถ้ายังไม่ได้เลือกทั้งหมด ให้เลือกทั้งหมด
      setSelectedRequirements(filteredRequirements.map(req => req.requirement_id));
    }
  };

  // ฟังก์ชันสำหรับกรอง requirements ตามการค้นหาและประเภท
  const filteredRequirements = workingRequirements.filter(req => {
    const matchesSearch =
      req.requirement_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `REQ-0${req.requirement_id}`.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType ? req.requirement_type === filterType : true;

    return matchesSearch && matchesType;
  });

  // ดึงประเภท requirement ที่มีทั้งหมด
  const requirementTypes = [...new Set(workingRequirements.map(req => req.requirement_type))];

  const handleCreateVerification = async () => {
    const selectedReviewerNames = Object.keys(selectedReviewers).filter(
      (name) => selectedReviewers[name]
    );

    // --- การตรวจสอบ Input (เหมือนเดิม) ---
    if (!projectId) {
      toast.error("Invalid project ID.");
      showAlertMessage("error", "Invalid project ID.");
      return;
    }

    if (selectedRequirements.length === 0 || selectedReviewerNames.length === 0) {
      toast.warning("Please select at least one requirement and one reviewer.");
      showAlertMessage("warning", "Please select at least one requirement and one reviewer.");
      return;
    }

    const storedUsername = localStorage.getItem("username");
    const createBy = storedUsername;

    if (!createBy) {
      toast.error("No user found. Please login again.");
      showAlertMessage("error", "No user found. Please login again.");
      return;
    }

    // --- สร้าง Payload สำหรับ /createveri (เหมือนเดิม) ---
    const payload = {
      requirements: [...new Set(selectedRequirements)], // Remove duplicates
      reviewers: selectedReviewerNames.map((name) => `${name}: false`),
      project_id: projectId,
      create_by: createBy,
    };

    console.log("Payload for /createveri:", payload);

    try {
      setIsSubmitting(true); // Disable submit button

      // --- เรียก API /createveri ---
      const response = await axios.post("http://localhost:3001/createveri", payload);

      if (response.status === 201) {
        const toastId = "create-verification-toast";
        if (!toast.isActive(toastId)) {
          toast.success("Verification created successfully!");
        }
        // --- อัปเดต State ฝั่ง Frontend (เหมือนเดิม) ---
        setWorkingRequirements((prev) =>
          prev.filter((req) => !selectedRequirements.includes(req.requirement_id))
        );
        setSelectedRequirements([]);
        setSelectedReviewers({});

        // --- *** จุดที่แก้ไข: Loop เพื่อสร้าง History *** ---
        console.log("Starting history creation loop...");
        for (const requirementId of selectedRequirements) {
          // 1. ค้นหาข้อมูล requirement เต็มจาก state `workingRequirements`
          const requirementDetails = workingRequirements.find(
            (req) => req.requirement_id === requirementId
          );

          if (!requirementDetails) {
            console.error(`Could not find details for requirement ID: ${requirementId} in workingRequirements state. Skipping history creation.`);
            // อาจจะแจ้งเตือนผู้ใช้ หรือ log ไว้ แต่ไม่ควรหยุด process ทั้งหมด
            continue; // ข้ามไปทำ requirement ID ถัดไป
          }

          // 2. สร้าง historyReqData โดยใช้ข้อมูลที่พบ
          const historyReqData = {
            requirement_id: requirementId,
            requirement_name: requirementDetails.requirement_name,
            requirement_description: requirementDetails.requirement_description,
            requirement_type: requirementDetails.requirement_type,
            requirement_status: "WAITING FOR VERIFICATION",
          };

          console.log(`Sending history data for Req ID ${requirementId}:`, historyReqData);

          try {
            // 3. ส่งข้อมูลไปที่ historyReqWorking
            const historyResponse = await axios.post(
              "http://localhost:3001/historyReqWorking",
              historyReqData
            );

            if (historyResponse.status !== 200) {
              // Log หรือแจ้งเตือนเฉพาะส่วนถ้าการสร้าง history ของรายการนี้ล้มเหลว
              console.error(`Failed to add history for requirement ID: ${requirementId}. Status: ${historyResponse.status}`, historyResponse.data);
              // อาจจะเก็บ ID ที่มีปัญหาไว้แจ้งผู้ใช้ตอนท้าย
            } else {
              console.log(`History added successfully for Req ID ${requirementId}`);
            }
          } catch (historyError) {
            console.error(`Error sending history for requirement ID: ${requirementId}`, historyError.response?.data || historyError.message);
            // จัดการ error ของ history item นี้
          }
        }
        console.log("Finished history creation loop.");
        // --- จบส่วนแก้ไข ---

        // --- อัปเดตสถานะ Requirement ใน Backend ---
        console.log("Starting status update requests...");
        const updateResults = await Promise.allSettled(
          selectedRequirements.map((requirementId) =>
            axios.put(`http://localhost:3001/update-requirements-status-waitingfor-ver/${requirementId}`, {
              requirement_status: "WAITING FOR VERIFICATION",
            })
          )
        );
        console.log("Finished status update requests:", updateResults);
        // (อาจเพิ่มการตรวจสอบ updateResults เพื่อดูว่ามีรายการไหนอัปเดตไม่สำเร็จหรือไม่)

      } else {
        // กรณี /createveri ไม่สำเร็จ
        toast.error(response.data.message || "Failed to create verification(s).");
      }
    } catch (error) {
      // จัดการ Error ทั่วไป
      console.error("Error creating verification process:", error);
      toast.error(error.response?.data?.message || "An error occurred during the verification process.");
    } finally {
      setIsSubmitting(false); // Re-enable submit button
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // Dismiss any active toast message with the specific toastId
    toast.dismiss("create-verification-toast");
    navigate(`/Dashboard?project_id=${projectId}`);
  };

  // Handle checkbox for reviewers
  const handleCheckboxReviewer = (memberName) => {
    setSelectedReviewers((prevState) => ({
      ...prevState,
      [memberName]: !prevState[memberName],
    }));
  };

  // เลือกผู้ตรวจสอบทั้งหมด
  const handleSelectAllReviewers = () => {
    // รวบรวมรายชื่อทั้งหมด
    const allReviewers = {};
    members.forEach(member => {
      try {
        const memberInfo = member.project_member ? JSON.parse(member.project_member) : [];
        memberInfo.forEach(info => {
          allReviewers[info.name] = true;
        });
      } catch (e) {
        console.error("Invalid JSON in member data:", e);
      }
    });

    // ตรวจสอบว่าได้เลือกทุกคนแล้วหรือไม่
    const allSelected = Object.keys(allReviewers).every(name => selectedReviewers[name]);

    if (allSelected) {
      // ถ้าเลือกทั้งหมดแล้ว ให้ยกเลิกการเลือกทั้งหมด
      setSelectedReviewers({});
    } else {
      // ถ้ายังไม่ได้เลือกทั้งหมด ให้เลือกทั้งหมด
      setSelectedReviewers(allReviewers);
    }
  };

  return (
    <div className="createveri-container">
      <Joyride
        steps={createVeriTutorialSteps}
        run={runCreateVeriTutorial}
        continuous
        showProgress
        showSkipButton
        styles={{
          options: {
            zIndex: 10000, // ให้แสดงทับ elements อื่นๆ
          },
        }}
        callback={(data) => { // <--- ลบ : CallBackProps ออก
          const { status } = data; // data ยังคงมี property status และอื่นๆ เหมือนเดิม
          if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunCreateVeriTutorial(false);
            localStorage.setItem('createVeriTutorialShown', 'true');
          }
        }}
      />
      <div className="createveri-header">
        <button className="createveri-back-btn" onClick={handleCancel}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1>
          <FontAwesomeIcon icon={faClipboardCheck} className="createveri-title-icon" />
          Create Verification
        </h1>
        {/* ปุ่ม ? สำหรับเรียก Tutorial */}
        <button
          onClick={handleRestartCreateVeriTutorial}
          className="tutorial-help-button tutorial-help-button-corner" // ใช้ class เดิมหรือสร้างใหม่
          title="Show Tutorial"
          style={{ /* เพิ่ม style inline หรือใช้ class */
            position: 'absolute',
            top: '15px',
            right: '20px',
            fontSize: '1.6rem',
            background: 'none',
            border: 'none',
            color: 'gray', // ปรับสีตาม theme header
            cursor: 'pointer'

          }}
        >
          <FontAwesomeIcon icon={faQuestionCircle} />
        </button>
      </div>

      <div className="createveri-content">
        {/* Left Panel (Requirements Section) */}
        <div className="createveri-left-panel">
          <div className="createveri-panel-header">
            <h2>
              <FontAwesomeIcon icon={faClipboardCheck} /> Requirements
              {!loading && !requirementsError && (
                <span className="createveri-count-badge">
                  {workingRequirements.length}
                </span>
              )}
            </h2>

            <div className="createveri-tools">
              <div className="createveri-search">
                <FontAwesomeIcon icon={faSearch} className="createveri-search-icon" />
                <input
                  type="text"
                  placeholder="Search requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="createveri-search-input"
                />
                {searchQuery && (
                  <button
                    className="createveri-clear-search"
                    onClick={() => setSearchQuery("")}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>

              <div className="createveri-filter">
                <FontAwesomeIcon icon={faFilter} className="createveri-filter-icon" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="createveri-filter-select"
                >
                  <option value="">All Types</option>
                  {requirementTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="createveri-loading">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Loading requirements...</p>
            </div>
          ) : requirementsError ? (
            <div className="createveri-error-message">
              <FontAwesomeIcon icon={faTimes} />
              <p>{requirementsError}</p>
            </div>
          ) : workingRequirements.length === 0 ? (
            <div className="createveri-empty-state">
              <p>No requirements found in 'WORKING' status.</p>
            </div>
          ) : (
            <>
              <div className="createveri-select-all">
                <input
                  type="checkbox"
                  id="select-all-requirements"
                  checked={selectedRequirements.length === filteredRequirements.length && filteredRequirements.length > 0}
                  onChange={handleSelectAll}
                />
                <label htmlFor="select-all-requirements">Select All</label>
                <span className="createveri-selected-count">
                  {selectedRequirements.length} of {filteredRequirements.length} selected
                </span>
              </div>

              <div className="createveri-table-container">
                <table className="createveri-requirements-table">
                  <thead>
                    <tr>
                      <th className="createveri-checkbox-column">Select</th>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequirements.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="createveri-no-results">
                          No requirements match your search
                        </td>
                      </tr>
                    ) : (
                      filteredRequirements.map((req) => (
                        <tr key={req.requirement_id} className={selectedRequirements.includes(req.requirement_id) ? "selected-row" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedRequirements.includes(req.requirement_id)}
                              onChange={() =>
                                handleSelect(req.requirement_id, setSelectedRequirements)
                              }
                            />
                          </td>
                          <td className="req-id">REQ-{String(req.requirement_id).padStart(3, '0')}</td>
                          <td>{req.requirement_name}</td>
                          <td>
                            <span className={`req-type type-${req.requirement_type.toLowerCase().replace(/\s+/g, '-')}`}>
                              {req.requirement_type}
                            </span>
                          </td>
                          <td>
                            <span className="req-status status-working">
                              {req.requirement_status}
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

        {/* Right Panel (Reviewers Section) */}
        <div className="createveri-right-panel">
          <div className="createveri-panel-header">
            <h2>
              <FontAwesomeIcon icon={faUsers} /> Reviewers
            </h2>
          </div>

          {isLoadingMembers ? (
            <div className="createveri-loading">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Loading reviewers...</p>
            </div>
          ) : membersError ? (
            <div className="createveri-error-message">
              <FontAwesomeIcon icon={faTimes} />
              <p>{membersError}</p>
            </div>
          ) : members.length === 0 ? (
            <div className="createveri-empty-state">
              <p>No reviewers found.</p>
            </div>
          ) : (
            <div className="createveri-reviewers-container">
              <div className="createveri-select-all">
                <input
                  type="checkbox"
                  id="select-all-reviewers"
                  checked={
                    Object.keys(selectedReviewers).length > 0 &&
                    members.every(member => {
                      try {
                        const memberInfo = member.project_member ? JSON.parse(member.project_member) : [];
                        return memberInfo.every(info => selectedReviewers[info.name]);
                      } catch (e) {
                        return false;
                      }
                    })
                  }
                  onChange={handleSelectAllReviewers}
                />
                <label htmlFor="select-all-reviewers">Select All Reviewers</label>
              </div>

              <div className="createveri-reviewers-list">
                {members.map((member, index) => {
                  let memberInfo = [];
                  try {
                    memberInfo = member.project_member
                      ? JSON.parse(member.project_member)
                      : [];
                  } catch (e) {
                    console.error("Invalid JSON in member data:", e);
                    return null;
                  }

                  return (
                    <div key={index} className="createveri-members-group">
                      {memberInfo.map((info, roleIndex) => (
                        <div key={roleIndex} className="createveri-reviewer-item">
                          <input
                            type="checkbox"
                            id={`reviewer-${info.name}-${roleIndex}`}
                            checked={selectedReviewers[info.name] || false}
                            onChange={() => handleCheckboxReviewer(info.name)}
                          />
                          <label htmlFor={`reviewer-${info.name}-${roleIndex}`} className="createveri-reviewer-label">
                            <div className="createveri-reviewer-name">{info.name}</div>
                            <div className="createveri-reviewer-role">{info.roles}</div>
                          </label>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selection Summary */}
          <div className="createveri-summary">
            <h3>Selection Summary</h3>
            <div className="createveri-summary-item">
              <span>Requirements:</span>
              <span className="createveri-summary-count">{selectedRequirements.length}</span>
            </div>
            <div className="createveri-summary-item">
              <span>Reviewers:</span>
              <span className="createveri-summary-count">
                {Object.values(selectedReviewers).filter(Boolean).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="createveri-action-buttons">

        <button className="createveri-btn-cancel" onClick={handleCancel}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Requirements
        </button>
        <button
          className="createveri-btn-create"
          onClick={handleCreateVerification}
          disabled={isSubmitting || selectedRequirements.length === 0 || Object.values(selectedReviewers).filter(Boolean).length === 0}
        >
          {isSubmitting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Creating...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCheckCircle} /> Create Verification
            </>
          )}
        </button>
      </div>

      {/* Custom Alert Notification */}
      <div className={`createveri-alert ${showAlert ? 'show' : ''}`}>
        <div className={`createveri-alert-${alertType}`}>
          <div className="createveri-alert-content">
            <div className="createveri-alert-icon">
              {alertType === 'success' && <FontAwesomeIcon icon={faCheckCircle} />}
              {alertType === 'error' && <FontAwesomeIcon icon={faTimes} />}
              {alertType === 'warning' && <FontAwesomeIcon icon={faExclamationTriangle} />}
            </div>
            <div className="createveri-alert-message">
              {alertMessage}
            </div>
          </div>
          <button className="createveri-alert-close" onClick={() => setShowAlert(false)}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="createveri-alert-progress"></div>
      </div>
    </div>
  );
};

export default CreateVeri;