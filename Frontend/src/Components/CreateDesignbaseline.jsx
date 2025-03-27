import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/CreateDesignbaseline.css";

const CreateDesignbaseline = () => {
  const [verifiedDesign, setVerifiedDesign] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDesign = async () => {
      if (!projectId) return;
  
      setLoading(true);
      setError(null);
  
      try {
        const response = await axios.get(
          `http://localhost:3001/designverified/${projectId}`
        );

        setVerifiedDesign(response.data);
      } catch {
        setError("Failed to load designs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDesign();
  }, [projectId]);  


  const handleSelect = (id) => {
    setSelectedDesign((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  };

  const handleCreateBaseline = async () => {
    if (!projectId) {
        Swal.fire({
            icon: "error",
            title: "Invalid project ID.",
        });
        return;
    }

    if (selectedDesign.length === 0) {
        Swal.fire({
            icon: "warning",
            title: "Please select at least one design.",
        });
        return;
    }

    if (isSubmitting) {
        Swal.fire({
            icon: "warning",
            title: "Submitting in progress. Please wait.",
        });
        return;
    }

    setIsSubmitting(true);

    const payload = { design_id: selectedDesign };

    try {
        const response = await axios.post("http://localhost:3001/createdesignbaseline", payload);

        if (response.status === 201) {
            Swal.fire({
                icon: "success",
                title: "Baseline set successfully!",
                timer: 2000,
                showConfirmButton: false,
            });

            setVerifiedDesign((prev) =>
                prev.map((design) =>
                    selectedDesign.includes(design.design_id)
                        ? { ...design, design_status: "BASELINE" }
                        : design
                )
            );

            await Promise.all(
                selectedDesign.map((designId) =>
                    axios.post("http://localhost:3001/addHistoryDesign", {
                        design_id: designId,
                        design_status: "BASELINE",
                    })
                )
            );

            setSelectedDesign([]);

            Swal.fire({
                icon: "success",
                title: "Design status updated to BASELINE!",
                timer: 2000,
                showConfirmButton: false,
            });

            navigate(`/DesignBaseline?project_id=${projectId}`);
        } else {
            throw new Error(response.data.message || "Failed to set baseline.");
        }
    } catch (error) {
        console.error("Error creating baseline:", error.response?.data || error.message);
        Swal.fire({
            icon: "error",
            title: error.response?.data?.message || "An error occurred. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }

    navigate(`/DesignBaseline?project_id=${projectId}`);
};

  const handleCancel = () => {
    navigate(`/DesignBaseline?project_id=${projectId}`);
  };

  return (
    <div className="create-baseline-container">
      <h1 className="create-baseline-title">Set Baseline</h1>
      <div className="create-baseline-content">
        <div className="create-baseline-left-panel">
          <h2 className="create-baseline-section-title">Designs</h2>
          {loading ? (
            <p className="create-baseline-loading-message">Loading designs...</p>
          ) : error ? (
            <p className="create-baseline-error-message">{error}</p>
          ) : verifiedDesign?.length === 0 ? (
            <p className="create-baseline-no-data">No verified designs found.</p>
          ) : (
            <table className="create-baseline-designs-table">
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
                {verifiedDesign.map((design) => (
                  <tr key={design.design_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedDesign.includes(design.design_id)}
                        onChange={() => handleSelect(design.design_id)}
                      />
                    </td>
                    <td>SD-0{design.design_id}</td>
                    <td>{design.diagram_name}</td>
                    <td>{design.design_type}</td>
                    <td>{design.design_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
  
      <div className="create-baseline-action-buttons">
        <button
          className="create-baseline-create-button"
          onClick={handleCreateBaseline}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Set Baseline"}
        </button>
  
        <button className="create-baseline-btn-cancel" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );  
};

export default CreateDesignbaseline;