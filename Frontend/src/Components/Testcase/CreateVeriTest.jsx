import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "./testcase_css/CreateVeriTest.css";

const CreateVeriTest = () => {
  const [workingTestCase, setWorkingTestCase] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedTestCase, setSelectedTestCase] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testcaseError, setTestCaseError] = useState(null);
  const [membersError, setMembersError] = useState(null);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

// Fetch working testcase
useEffect(() => {
    if (projectId) {
      setLoading(true);
      axios
        .get(`http://localhost:3001/testcases?project_id=${projectId}`)
        .then((res) => {
          const filteredTestCases = res.data.filter(
            (testcase) => testcase.testcase_status === "WORKING"
          );
          setWorkingTestCase(filteredTestCases); // Set only "WORKING" testcases
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

  // Handle select for testcase
  const handleSelect = (id, setter) => {
    setter((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };


const handleCreateVerification = async () => {
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

  // 🔎 ตรวจสอบว่าทุก testCase มี test_procedures หรือไม่
  try {
    const checkResults = await Promise.all(
      selectedTestCase.map((testcaseId) =>
        axios.get(`http://localhost:3001/api/test-procedures?project_id=${projectId}&testcase_id=${testcaseId}`)
      )
    );


    // ✅ ถ้ามี test_procedures ทุก testCase, ดำเนินการสร้าง verification ต่อไป
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

    setIsSubmitting(true);

    // อัปเดตสถานะ testcase -> "WAITING FOR VERIFICATION"
    await Promise.all(
      selectedTestCase.map((testcaseId) =>
        axios.put(`http://localhost:3001/update-testcase-status-waitingfor-ver/${testcaseId}`, {
          testcase_status: "WAITING FOR VERIFICATION",
        })
      )
    );

    // สร้าง verification records ใน backend
    const response = await axios.post("http://localhost:3001/createveritestcase", payload);

    if (response.status === 201) {
      toast.success("TestCase verification created successfully!", {
        position: "top-center",
      });

      // เพิ่มประวัติ testcase ลงใน historytestcase
      await Promise.all(
        selectedTestCase.map((testcaseId) =>
          axios.post("http://localhost:3001/addHistoryTestcase", {
            testcase_id: testcaseId,
            testcase_status: "WAITING FOR VERIFICATION",
          })
        )
      );

      // อัปเดต UI
      setWorkingTestCase((prev) =>
        prev.filter((testcase) => !selectedTestCase.includes(testcase.testcase_id))
      );

      setSelectedTestCase([]);
      setSelectedReviewers({});
    } else {
      toast.error(response.data.message || "Failed to create verification(s).", {
        position: "top-center",
      });
    }
  } catch (error) {
    console.error("Error checking test procedures:", error);
    
    // แสดงข้อผิดพลาดด้วย SweetAlert2
    Swal.fire({
      icon: "warning",
      title: "ไม่สามารถ Create Verification",
      text: "กรุณาเพิ่มขั้นตอนการทดสอบ Test Steps ก่อนดำเนินการสร้าง Verification Test",
      confirmButtonText: "OK",
    });
  } finally {
    setIsSubmitting(false);
  }
};


  // Handle cancel
  const handleCancel = () => {
    navigate(`/Dashboard?project_id=${projectId}`);
  };

  // Handle checkbox for reviewers
  const handleCheckboxReviewer = (memberName) => {
    setSelectedReviewers((prevState) => ({
      ...prevState,
      [memberName]: !prevState[memberName],
    }));
  };

  return (
    <div className="createveritestcase-container">
      <h1>Create Testcase Verification</h1>
      <div className="createveritestcase-content">
        {/* Left Panel (Designs Section) */}
        <div className="createveritestcase-left-panel">
          <h2>Testcase</h2>
          {loading ? (
            <p>Loading testcase...</p>
          ) : testcaseError ? (
            <p className="createveritestcase-error-message">{testcaseError}</p>
          ) : workingTestCase.length === 0 ? (
            <p>No testcase found in 'WORKING' status.</p>
          ) : (
            <table className="createveritestcase-testcase-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {workingTestCase.map((testcase) => (
                  <tr key={testcase.testcase_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedTestCase.includes(testcase.testcase_id)}
                        onChange={() =>
                          handleSelect(testcase.testcase_id, setSelectedTestCase)
                        }
                      />
                    </td>
                    <td>SD-00{testcase.testcase_id}</td>
                    <td>{testcase.testcase_name}</td>
                    <td>{testcase.testcase_type}</td>
                    <td>{testcase.testcase_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Panel (Reviewers Section) */}
        <div className="createveritestcase-right-panel">
          <h2>Reviewers</h2>
          {isLoadingMembers ? (
            <p>Loading reviewers...</p>
          ) : membersError ? (
            <p className="createveritestcase-error-message">{membersError}</p>
          ) : members.length === 0 ? (
            <p>No reviewers found.</p>
          ) : (
            members.map((member, index) => {
              let memberInfo = [];
              try {
                memberInfo = member.project_member
                  ? JSON.parse(member.project_member)
                  : [];
              } catch (e) {
                console.error("Invalid JSON in member data:", e);
                setMembersError("Invalid project member data.");
              }

              return (
                <div key={index}>
                  {memberInfo.map((info, roleIndex) => (
                    <div key={roleIndex}>
                      <input
                        type="checkbox"
                        id={info.name}
                        checked={selectedReviewers[info.name] || false}
                        onChange={() => handleCheckboxReviewer(info.name)}
                      />
                      <label htmlFor={info.name}>
                        <strong>{info.name}</strong>: <span>{info.roles}</span>
                      </label>
                    </div>
                  ))}
                </div>
              );
            })
          )}
          {members.length === 0 && <p>No reviewers are available for this project.</p>}
        </div>
      </div>

      {/* Footer Section */}
      <div className="createveritestcase-footer">
        <button
          className="createveritestcase-button cancel-button"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          className="createveritestcase-button create-button"
          onClick={handleCreateVerification}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
};

export default CreateVeriTest;