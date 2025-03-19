import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Comment from "./Comment";
import "./CSS/ReqVerification.css";

const ReqVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const verificationId = queryParams.get("verification_id");
  const { selectedRequirements } = location.state || {};
  const [reqcriList, setReqcriList] = useState([]);
  const [requirementsDetails, setRequirementsDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkboxState, setCheckboxState] = useState({});

  useEffect(() => {
    console.log("Project ID:", projectId);
    console.log("Verification ID:", verificationId);
    console.log("Selected Requirements:", selectedRequirements);
  
    if (!projectId || !verificationId) {
      console.error("Project ID or Verification ID is missing.");
      navigate("/VerificationList");
      return;
    }
  
    fetchCriteria();
  
    if (selectedRequirements && selectedRequirements.length > 0) {
      fetchRequirementsDetails(selectedRequirements);
    }
  }, [projectId, verificationId, selectedRequirements, navigate]);
  
  const fetchCriteria = async () => {
    try {
      setLoading(true);
  
      // ✅ เปลี่ยนเป็นใช้ params แทนการใส่ projectId ใน URL
      const response = await axios.get("http://localhost:3001/reqcriteria", {
        params: { project_id: projectId },
      });
  
      console.log("Fetched criteria data:", response.data); // ✅ Debug
  
      const initialCheckboxState = response.data.reduce((acc, criteria) => {
        acc[criteria.reqcri_id] = false;
        return acc;
      }, {});
  
      setReqcriList(response.data);
      console.log("Initial checkbox state:", initialCheckboxState); // ✅ Debug
  
      const storedUsername = localStorage.getItem("username");
      if (storedUsername) {
        const storedCheckboxState = localStorage.getItem(
          `checkboxState_${storedUsername}_${projectId}`
        );
        console.log("Stored checkbox state:", storedCheckboxState); // ✅ Debug
  
        if (storedCheckboxState) {
          setCheckboxState(JSON.parse(storedCheckboxState));
        } else {
          setCheckboxState(initialCheckboxState);
        }
      }
    } catch (error) {
      console.error("Error fetching criteria:", error);
    } finally {
      setLoading(false);
    }
  };
  

  const fetchRequirementsDetails = async (requirements) => {
    try {
      const response = await axios.get("http://localhost:3001/requirements", {
        params: { requirement_ids: requirements },
      });
      setRequirementsDetails(response.data);
    } catch (error) {
      console.error("Error fetching requirements:", error);
    }
  };

  const handleCheckboxChange = (id) => {
    const updatedState = {
      ...checkboxState,
      [id]: !checkboxState[id],
    };
    setCheckboxState(updatedState);

    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      localStorage.setItem(
        `checkboxState_${storedUsername}_${projectId}_${verificationId}`,
        JSON.stringify(updatedState)
      );
    }
  };

  const handleSave = async () => {
    const allChecked = Object.values(checkboxState).every((value) => value);
  
    if (!allChecked) {
      toast.success("Criteria Checklist Saved", {
        position: "top-right",
        autoClose: 1500,
        onClose: () => navigate(`/VerificationList?project_id=${projectId}`),
      });
      return;
    }
  
    try {
      const storedUsername = localStorage.getItem("username");
      if (!storedUsername) {
        alert("Please log in first.");
        return;
      }
  
      const response = await axios.get("http://localhost:3001/verifications", {
        params: { project_id: projectId, verification_id: verificationId },
      });
  
      const verification = response.data.find((v) => v.id === parseInt(verificationId));
  
      if (verification) {
        const updatedVerificationBy = verification.verification_by.map((entry) => {
          const [username, status] = entry.split(":").map((item) => item.trim());
          if (username === storedUsername) {
            return `${username}: true`;
          }
          return entry;
        });
  
        await axios.put("http://localhost:3001/update-verification-true", {
          project_id: projectId,
          verification_id: verificationId,
          verification_by: updatedVerificationBy,
        });
  
        const allVerified = updatedVerificationBy.every((entry) => {
          const [, status] = entry.split(":").map((item) => item.trim());
          return status === "true";
        });
  
        if (allVerified) {
          const requirementIds = requirementsDetails.map((req) => req.requirement_id);
          
          console.log("Requirement IDs to update:", requirementIds);
  
          if (!requirementIds || requirementIds.length === 0) {
            console.error("No requirements found to update.");
            return;
          }
  
          try {
            const updateResponse = await axios.put(
              "http://localhost:3001/update-requirements-status-verified",
              {
                requirement_ids: requirementIds,
                requirement_status: "VERIFIED",
              }
            );
  
            console.log("Update response:", updateResponse.data);
  
            for (const requirementId of requirementIds) {
              const historyReqData = {
                requirement_id: requirementId,
                requirement_status: "VERIFIED",
              };
  
              const historyResponse = await axios.post(
                "http://localhost:3001/historyReqWorking",
                historyReqData
              );
  
              if (historyResponse.status !== 200) {
                console.error("Failed to add history for requirement:", requirementId);
              }
            }
  
            toast.success("All criteria verified! Status updated to VERIFIED.", {
              position: "top-right",
              autoClose: 1500,
              onClose: () => navigate(`/Dashboard?project_id=${projectId}`),
            });
          } catch (error) {
            console.error("Error updating requirement status:", error);
          }
        } else {
          toast.warning("Not all users have verified. Please wait for everyone to verify.", {
            position: "top-right",
            autoClose: 1800,
            onClose: () => navigate(`/VerificationList?project_id=${projectId}`),
          });
        }
      }
    } catch (error) {
      console.error("Error updating verification status:", error);
      toast.error("Failed to update verification status. Please try again.", {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };
  
  

  return (
    <div className="container">
      <h1 className="title">Verification Requirement</h1>

      <div className="flex-container">
        <div className="box">
          <h2>Checklist</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <ul className="checklist">
              {reqcriList.map((criteria) => (
                <li key={criteria.reqcri_id}>
                  <label>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={checkboxState[criteria.reqcri_id] || false}
                      onChange={() => handleCheckboxChange(criteria.reqcri_id)}
                    />
                    {criteria.reqcri_name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="box">
          <Comment verificationId={verificationId} />
        </div>
      </div>

      <div className="box requirements">
        <h2>Requirement</h2>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Requirements Statement</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {requirementsDetails.length > 0 ? (
              requirementsDetails.map((req, index) => (
                <tr key={index}>
                  <td>REQ-0{req.requirement_id}</td>
                  <td>{req.requirement_name}</td>
                  <td>{req.requirement_type}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">No requirements details found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="button-container">
        <button className="save-button" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
};

export default ReqVerification;
