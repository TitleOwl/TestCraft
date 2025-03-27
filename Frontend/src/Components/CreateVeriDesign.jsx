import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2"; // Import SweetAlert2
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/CreateVeriDesign.css";

const CreateVeriDesign = () => {
  const [workingDesigns, setWorkingDesigns] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedDesigns, setSelectedDesigns] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [designsError, setDesignsError] = useState(null);
  const [membersError, setMembersError] = useState(null);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  // Fetch working designs
  useEffect(() => {
    if (projectId) {
      setLoading(true);
      axios
        .get(`http://localhost:3001/veridesign?project_id=${projectId}`)
        .then((res) => {
          setWorkingDesigns(res.data); // Set designs directly
          setDesignsError(null);
        })
        .catch(() => {
          setDesignsError("Failed to load designs. Please try again.");
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

  // Handle select for designs
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
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Invalid project ID.",
      });
      return;
    }

    if (selectedDesigns.length === 0 || selectedReviewerNames.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Warning",
        text: "Please select at least one design and one reviewer.",
      });
      return;
    }

    const storedUsername = localStorage.getItem("username");
    const createBy = storedUsername;

    if (!createBy) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No user found. Please login again.",
      });
      return;
    }

    // Create veridesign payload
    const timestamp = new Date().toISOString();
    const payload = selectedDesigns.map((designId) => ({
      veridesign_id: null, // Auto-incremented in the database
      project_id: projectId,
      create_by: createBy,
      design_id: designId,
      veridesign_at: timestamp,
      veridesign_status: "WAITING FOR VERIFICATION",
      veridesign_by: selectedReviewerNames.reduce((acc, reviewerName) => {
        acc[reviewerName] = false; // Set reviewer as false
        return acc;
      }, {}),
    }));

    try {
      setIsSubmitting(true); // Disable submit button

      // Update the status of designs to "WAITING FOR VERIFICATION"
      const updateResults = await Promise.allSettled(
        selectedDesigns.map((designId) =>
          axios.put(
            `http://localhost:3001/update-design-status-waitingfor-ver/${designId}`,
            {
              design_status: "WAITING FOR VERIFICATION", // Set status as "WAITING FOR VERIFICATION"
            }
          )
        )
      );

      console.log(updateResults); // ใช้ตัวแปรเพื่อป้องกัน warning

      // Create veridesign records in the backend
      const response = await axios.post(
        "http://localhost:3001/createveridesign",
        payload
      );

      if (response.status === 201) {
        // *********** เพิ่ม SweetAlert2 แจ้งเตือน ***************
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Design verification created successfully!",
          timer: 2000,
          timerProgressBar: true,
          didClose: () => {
            navigate(`/VeriDesign?project_id=${projectId}`);
          },
        });
        // *********** จบส่วนที่เพิ่ม ***************

        // Insert into historydesign table
        await Promise.all(
          selectedDesigns.map((designId) =>
            axios.post("http://localhost:3001/addHistoryDesign", {
              design_id: designId,
              design_status: "WAITING FOR VERIFICATION", // Log status
            })
          )
        );

        // Update UI after successful creation
        setWorkingDesigns((prev) =>
          prev.filter((design) => !selectedDesigns.includes(design.design_id))
        );

        setSelectedDesigns([]);
        setSelectedReviewers({});
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: response.data.message || "Failed to create verification(s).",
        });
      }
    } catch (error) {
      console.error("Error creating verification:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message || "An error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false); // Re-enable submit button
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
    <div className="createveridesign-container">
      <h1>Create Design Verification</h1>
      <div className="createveridesign-content">
        {/* Left Panel (Designs Section) */}
        <div className="createveridesign-left-panel">
          <h2>Designs</h2>
          {loading ? (
            <p>Loading designs...</p>
          ) : designsError ? (
            <p className="createveridesign-error-message">{designsError}</p>
          ) : workingDesigns.length === 0 ? (
            <p>No designs found in 'WORKING' status.</p>
          ) : (
            <table className="createveridesign-designs-table">
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
                {workingDesigns.map((design) => (
                  <tr key={design.design_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedDesigns.includes(design.design_id)}
                        onChange={() =>
                          handleSelect(design.design_id, setSelectedDesigns)
                        }
                      />
                    </td>
                    <td>SD-0{design.design_id}</td>
                    <td>{design.diagram_name}</td>
                    <td>{design.diagram_type}</td>
                    <td>{design.design_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Panel (Reviewers Section) */}
        <div className="createveridesign-right-panel">
          <h2>Reviewers</h2>
          {isLoadingMembers ? (
            <p>Loading reviewers...</p>
          ) : membersError ? (
            <p className="createveridesign-error-message">{membersError}</p>
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
                        <strong>{info.name}</strong>:{" "}
                        <span>{info.roles}</span>
                      </label>
                    </div>
                  ))}
                </div>
              );
            })
          )}
          {members.length === 0 && (
            <p>No reviewers are available for this project.</p>
          )}
        </div>
      </div>

      {/* Footer Section */}
      <div className="createveridesign-footer">
        <button
          className="createveridesign-button cancel-button"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          className="createveridesign-button create-button"
          onClick={handleCreateVerification}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
};

export default CreateVeriDesign;