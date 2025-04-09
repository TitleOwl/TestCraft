import React, { useEffect, useState } from "react";
import "./CSS/VeriVaView.css";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const VeriVaView = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const projectName = "ProjectName";
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/requirements");
      const result = await response.json();
      console.log("API Response:", result);
      setData(result);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const verifiedData = data.filter((row) => row.requirement_status === "VERIFIED");
  const validatedData = data.filter((row) => row.requirement_status === "VALIDATED");

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Verified & Validated Requirements", 14, 20);

    let yPosition = 30;

    yPosition = generateTablePDF(doc, "Verified Requirements", verifiedData, yPosition);
    generateTablePDF(doc, "Validated Requirements", validatedData, yPosition);

    doc.save(`${projectName}_requirements.pdf`);
  };

  const generateTablePDF = (doc, title, tableData, yPosition) => {
    if (tableData.length > 0) {
      doc.setFontSize(14);
      doc.text(title, 14, yPosition);
      yPosition += 10;

      const pdfTableData = tableData.map((req) => [
        `REQ-0${req.requirement_id}`,
        req.requirement_name,
        req.requirement_description,
        req.requirement_type,
        req.requirement_status,
      ]);

      doc.autoTable({
        head: [["REQ-ID", "Name", "Description", "Type", "Status"]],
        body: pdfTableData,
        startY: yPosition,
      });

      yPosition = doc.autoTable.previous.finalY + 10;
    }
    return yPosition;
  };

  const handleVerViewRequirement = (projectId, requirementId) => {
    if (projectId && requirementId) {
      navigate(`/VericriReqDetails?project_id=${projectId}&requirement_id=${requirementId}`);
    } else {
      console.error("Missing required parameters!");
      setError("Missing required parameters to view requirement details.");
    }
  };

const handleVarViewRequirement = (projectId, requirementId) => {
  if (projectId && requirementId) {
    // **** ต้องใช้ format นี้เท่านั้นเพื่อให้ useParams ทำงานได้ ****
    navigate(`/HistoryValidationReq/${requirementId}`);
  } else {
    console.error("Missing required parameters for Validation View!", { projectId, requirementId });
    setError("Missing required parameters to view validation details.");
  }
};

  const navigateBack = () => {
    navigate(`/Dashboard?project_id=${projectId}`, {
      state: { selectedSection: "Requirement" },
    });
  };

  const RequirementTable = ({ title, rows }) => (
    // Ensure rows is an array and has items
    Array.isArray(rows) && rows.length > 0 && (
      <div className="VeriVaView__table-container">
        <h2>{title}</h2>
        <table className="VeriVaView__table table-auto">
          <thead>
            <tr className="VeriVaView__table-header">
              <th className="VeriVaView__table-cell">Requirement ID</th>
              <th className="VeriVaView__table-cell">Requirement Name</th>
              <th className="VeriVaView__table-cell">Type</th>
              <th className="VeriVaView__table-cell">Status</th>
              {/* Show Action column header if it's Verified OR Validated table */}
              {(title === "Verified Requirements" || title === "Validated Requirements") && (
                <th className="VeriVaView__table-cell">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              // Add a check for row validity
              row && row.requirement_id ? (
                <tr key={row.requirement_id} className="VeriVaView__table-row text-center">
                  <td className="VeriVaView__table-cell">REQ-{row.requirement_id}</td>
                  <td className="VeriVaView__table-cell">{row.requirement_name || "N/A"}</td>
                  <td className="VeriVaView__table-cell">{row.requirement_type || "N/A"}</td>
                  <td className="VeriVaView__table-cell">{row.requirement_status}</td>

                  {/* Action Cell for VERIFIED requirements */}
                  {title === "Verified Requirements" && (
                    <td className="VeriVaView__table-cell">
                      <button
                        className="VeriVaView__view-button"
                        onClick={() => handleVerViewRequirement(row.project_id, row.requirement_id)}
                      >
                        View Verification
                      </button>
                    </td>
                  )}

                  {/* Action Cell for VALIDATED requirements */}
                  {title === "Validated Requirements" && (
                    <td className="VeriVaView__table-cell">
                      <button
                        className="VeriVaView__view-button VeriVaView__history-button" // Added specific class for potential styling
                        onClick={() => handleVarViewRequirement(row.project_id, row.requirement_id)} // Use the new handler
                      >
                        View Validation
                      </button>
                    </td>
                  )}
                  {/* If the Action column exists but this title doesn't need a button, render empty cell */}
                   {(title !== "Verified Requirements" && title !== "Validated Requirements" && (title === "Verified Requirements" || title === "Validated Requirements")) && (
                     <td className="VeriVaView__table-cell"></td>
                   )}
                </tr>
              ) : null // Render nothing if row or row.requirement_id is invalid
            ))}
          </tbody>
        </table>
      </div>
    )
  );

    return (
      <div className="VeriVaView">
        <h1 className="VeriVaView__title">Verification & Validation View</h1>
  
        <div className="VeriVaView__export-button-container">
          <button className="VeriVaView__back-btn" onClick={navigateBack}>
            <FontAwesomeIcon icon={faArrowLeft} /> Back
          </button>
          <button className="VeriVaView__export-button" onClick={handleExportPDF}>
            Export PDF
          </button>
        </div>
  
        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}
  
        <RequirementTable title="Verified Requirements" rows={verifiedData} />
        <RequirementTable title="Validated Requirements" rows={validatedData} />
      </div>
    );
  };  

export default VeriVaView;