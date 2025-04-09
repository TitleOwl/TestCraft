import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import "./testcase_css/CreateTestcasebaseline.css";

const CreateTestcasebaseline = () => {
  const [verifiedTestcase, setVerifiedTestCase] = useState([]);
  const [selectedTestCase, setSelectedTestCase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTestcase = async () => {
      if (!projectId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(
          `http://localhost:3001/testcaseverified/${projectId}`
        );

        setVerifiedTestCase(response.data);
      } catch {
        setError("Failed to load testcases. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTestcase();
  }, [projectId]);

  const handleSelect = (id) => {
    setSelectedTestCase((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleCreateBaseline = async () => {
    if (!projectId) {
      toast.error("Invalid project ID.");
      return;
    }

    if (selectedTestCase.length === 0) {
      toast.warning("Please select at least one testcase.");
      return;
    }

    if (isSubmitting) {
      toast.warning("Submitting in progress. Please wait.");
      return;
    }

    setIsSubmitting(true);

    const payload = { testcase_id: selectedTestCase };

    try {
      const response = await axios.post(
        "http://localhost:3001/createtestcasebaseline",
        payload
      );

      if (response.status === 201) {
        toast.success("Baseline set successfully!", {
          onClose: () => {
            navigate(`/TestcaseBaseline?project_id=${projectId}`);
          }
        });

      setVerifiedTestCase((prev) =>
        prev.map((testcase) =>
          selectedTestCase.includes(testcase.testcase_id)
            ? { ...testcase, testcase_status: "BASELINE" }
            : testcase
        )
      );

      // Insert into historytestcase table
      await Promise.all(
        selectedTestCase.map((testcaseId) =>
          axios.post("http://localhost:3001/addHistorytestcase", {
            testcase_id: testcaseId,
            testcase_status: "BASELINE",
          })
        )
      );

      setSelectedTestCase([]);

      navigate(`/TestcaseBaseline?project_id=${projectId}`);
    } else {
      throw new Error(response.data.message || "Failed to set baseline.");
    }
  } catch (error) {
    console.error(
      "Error creating baseline:",
      error.response?.data || error.message
    );
    toast.error(
      error.response?.data?.message || "An error occurred. Please try again."
    );
  } finally {
    setIsSubmitting(false);
  }
};

const handleCancel = () => {
  navigate(`/TestcaseBaseline?project_id=${projectId}`);
};

return (
  <div className="create-baseline-container">
    <h1 className="create-baseline-title">Set Baseline</h1>
    <div className="create-baseline-content">
      <div className="create-baseline-left-panel">
        <h2 className="create-baseline-section-title">Testcases</h2>
        {loading ? (
          <p className="create-baseline-loading-message">
            Loading testcases...
          </p>
        ) : error ? (
          <p className="create-baseline-error-message">{error}</p>
        ) : verifiedTestcase?.length === 0 ? (
          <p className="create-baseline-no-data">
            No verified testcases found.
          </p>
        ) : (
          <table className="create-baseline-testcases-table">
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
              {verifiedTestcase.map((testcase) => (
                <tr key={testcase.testcase_id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedTestCase.includes(testcase.testcase_id)}
                      onChange={() => handleSelect(testcase.testcase_id)}
                    />
                  </td>
                  <td>SD-0{testcase.testcase_id}</td>
                  <td>{testcase.testcase_name}</td>
                  <td>{testcase.testcase_type}</td>
                  <td>{testcase.testcase_status}</td>
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

export default CreateTestcasebaseline;
