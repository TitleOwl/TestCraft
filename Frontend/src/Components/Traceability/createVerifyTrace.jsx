import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./CSS/createVerifyTrace.css";

const CreateVerifyTrace = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState(null);
  const [traceabilityData, setTraceabilityData] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedRequirements, setSelectedRequirements] = useState([]);
  const [selectedDesigns, setSelectedDesigns] = useState([]);
  const [selectedImplements, setSelectedImplements] = useState([]);
  const [selectedTestCases, setSelectedTestCases] = useState([]);
  const [step, setStep] = useState(1); // ใช้สำหรับควบคุมการแสดง UI ของแต่ละขั้นตอน
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  useEffect(() => {
    const projectId = new URLSearchParams(window.location.search).get("project_id");
    if (projectId) {
      setIsLoadingMembers(true);
      axios
        .get(`http://localhost:3001/projectname?project_id=${projectId}`)
        .then((res) => {
          if (Array.isArray(res.data) && res.data[0].project_member) {
            const membersData = JSON.parse(res.data[0].project_member); // แปลง JSON string เป็นอาร์เรย์
            setMembers(membersData);
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
  }, []);

  // Fetch traceability data
  useEffect(() => {
    const projectId = new URLSearchParams(window.location.search).get("project_id");
    if (projectId) {
      axios
        .get("http://localhost:3001/traceability", { params: { projectId } })
        .then((response) => {
          setTraceabilityData(response.data);
        })
        .catch(() => {
          setTraceabilityData([]);
        });
    }
  }, []);

  const handleVerifyChange = (requirementId, designId, implementId, testCaseId) => {
    setSelectedRequirements((prev) =>
      prev.includes(requirementId)
        ? prev.filter((id) => id !== requirementId)
        : [...prev, requirementId]
    );

    setSelectedDesigns((prev) =>
      prev.includes(designId) ? prev.filter((id) => id !== designId) : [...prev, designId]
    );

    setSelectedImplements((prev) =>
      prev.includes(implementId) ? prev.filter((id) => id !== implementId) : [...prev, implementId]
    );

    setSelectedTestCases((prev) =>
      prev.includes(testCaseId) ? prev.filter((id) => id !== testCaseId) : [...prev, testCaseId]
    );
  };

  const handleMemberSelection = (memberName) => {
    setSelectedMembers((prev) =>
      prev.includes(memberName)
        ? prev.filter((name) => name !== memberName)
        : [...prev, memberName]
    );
  };

  const handleSaveVerification = async () => {
    const currentUser = localStorage.getItem("username");

    if (!currentUser) {
      alert("ไม่พบข้อมูลผู้ใช้ที่ล็อกอิน");
      return;
    }

    if (selectedMembers.length === 0) {
      alert("กรุณาเลือก member ก่อน");
      return;
    }

    if (selectedRequirements.length === 0) {
      alert("กรุณาเลือกข้อมูลที่ต้องการ Verify");
      return;
    }

    // ฟิลเตอร์สมาชิกที่ถูกเลือกออกมา
    const verificationData = {
      project_id: projectId,
      create_by: currentUser,
      requirement_id: selectedRequirements,
      design_id: selectedDesigns,
      implement_id: selectedImplements,
      testcase_id: selectedTestCases,
      verification_by: members.reduce((acc, member) => {
        // บันทึกเฉพาะสมาชิกที่เลือก
        if (selectedMembers.includes(member.name)) {
          acc[member.name] = false; // ตั้งค่าเป็น false สำหรับสมาชิกที่เลือก
        }
        return acc;
      }, {}),
      veritrace_status: "WAITING FOR VERIFICATION",
    };

    try {
      const response = await axios.post("http://localhost:3001/saveVerificationTrace", verificationData);
      if (response.data.success) {
        alert("บันทึกข้อมูลสำเร็จ!");

        // ✅ Reset ข้อมูลที่ต้องการหลังบันทึก
        setSelectedRequirements([]);
        setSelectedDesigns([]);
        setSelectedImplements([]);
        setSelectedTestCases([]);
        setSelectedMembers([]); // รีเซ็ท selectedMembers

        // เปลี่ยนกลับไปที่หน้า Traceability
        setStep(1); // กลับไปที่ขั้นตอน Traceability
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (error) {
      console.error(error);
      alert("เซิร์ฟเวอร์มีปัญหา");
    }
  };




  const handleNextStep = () => {
    if (selectedRequirements.length === 0) {
      alert("กรุณาเลือกข้อมูล Traceability");
      return;
    }
    setStep(2); // ไปขั้นตอนเลือกสมาชิก
  };

  const handleBackStep = () => {
    setStep(1); // กลับมาที่ขั้นตอนเลือก Traceability
  };

  return (
    <div className="create-verify-container">
      <h1>Create Verification Trace</h1>

      {step === 1 && (
        <>
          <h3>Select Traceability Data</h3>
          <table className="traceability-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Requirement ID</th>
                <th>Design ID</th>
                <th>Code Component ID</th>
                <th>Test Case ID</th>
              </tr>
            </thead>
            <tbody>
              {traceabilityData.map((item) => {
                const designIDs = item.DesignIDs ? item.DesignIDs.split(",") : [];
                const implementIDs = item.ImplementIDs ? item.ImplementIDs.split(",") : [];
                const testCaseIDs = item.TestCaseIDs ? item.TestCaseIDs.split(",") : [];

                return designIDs.map((designID, idx) => (
                  <tr key={item.RequirementID + idx}>
                    <td>
                      <input
                        type="checkbox"
                        onChange={() => handleVerifyChange(item.RequirementID, designID, implementIDs[idx], testCaseIDs[idx])}
                        checked={selectedRequirements.includes(item.RequirementID)}
                      />
                    </td>
                    <td>{`REQ-${item.RequirementID}`}</td>
                    <td>{`DE-${designID}`}</td>
                    <td>{`IMP-${implementIDs[idx]}`}</td>
                    <td>{`TC-${testCaseIDs[idx]}`}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>

          <button onClick={handleNextStep}>Next</button>
        </>
      )}

      {step === 2 && (
        <>
          {isLoadingMembers ? (
            <div>Loading project members...</div>
          ) : membersError ? (
            <div>{membersError}</div>
          ) : (
            <div>
              <h3>Select Members for Verification</h3>
              <div className="members-list">
                {members.map((member, index) => (
                  <div key={index} className="member-item">
                    <input
                      type="checkbox"
                      id={`member-${index}`}
                      onChange={() => handleMemberSelection(member.name)}
                      checked={selectedMembers.includes(member.name)} // ✅ อ้างอิง selectedMembers
                    />
                    <label htmlFor={`member-${index}`} className="member-label">
                      <span className="member-name">{member.name}</span>
                      <span className="member-roles">({member.roles.join(", ")})</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleSaveVerification}>Save Verification</button>
          <button onClick={handleBackStep}>Back</button>
        </>
      )}
    </div>
  );
};

export default CreateVerifyTrace;
