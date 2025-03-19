import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faTrash, faTimes, faEdit } from "@fortawesome/free-solid-svg-icons";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import axios from "axios";
import "./testcase_css/TestProcedures.css";

const TestProcedures = () => {
  const [procedures, setProcedures] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [newStep, setNewStep] = useState({ required_action: "", expected_result: "", prerequisite: "" });
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const testcaseId = queryParams.get("testcase_id");

  useEffect(() => {
    fetchTestProcedures();
  }, [testcaseId]);

  const fetchTestProcedures = () => {
    if (!testcaseId) return;

    axios.get(`http://localhost:3001/api/test-procedures?testcase_id=${testcaseId}`)
        .then((response) => {
            console.log("Fetched Data:", response.data);  // ✅ Debug Response Data
            setProcedures(response.data);
        })
        .catch((error) => {
            console.error("Error fetching data:", error.response?.status, error.response?.data);
        });
};

  const handleOpenModal = (step = null) => {
    setEditingStep(step);
    setNewStep(step ? { ...step } : { required_action: "", expected_result: "", prerequisite: "" });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStep(null);
    setNewStep({ required_action: "", expected_result: "", prerequisite: "" });
  };

  const handleChange = (e) => {
    setNewStep({ ...newStep, [e.target.name]: e.target.value });
  };

  const handleSaveStep = () => {
    if (!testcaseId) return;

    if (editingStep) {
      axios.put(`http://localhost:3001/api/test-procedures/${editingStep.test_procedures_id}`, newStep)
        .then(() => {
          fetchTestProcedures();
          handleCloseModal();
        })
        .catch((error) => console.error("Error updating data:", error));
    } else {
      axios.post("http://localhost:3001/api/test-procedures", {
        testcase_id: testcaseId,
        ...newStep
      })
      .then(() => {
        fetchTestProcedures();
        handleCloseModal();
      })
      .catch((error) => console.error("Error saving data:", error));
    }
  };

  const handleDeleteStep = (id) => {
    if (window.confirm("Are you sure you want to delete this test procedure?")) {
      axios.delete(`http://localhost:3001/api/test-procedures/${id}`)
        .then(() => fetchTestProcedures())
        .catch((error) => console.error("Error deleting data:", error));
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedProcedures = Array.from(procedures);
    const [movedStep] = reorderedProcedures.splice(result.source.index, 1);
    reorderedProcedures.splice(result.destination.index, 0, movedStep);
    setProcedures(reorderedProcedures);
  };

  return (
    <div className="test-procedures-container">
      <div className="test-procedures-header">
        <h3>Test Procedures</h3>
        <button className="add-test-step-btn" onClick={() => handleOpenModal()}>
          <FontAwesomeIcon icon={faPlus} /> Add Test Step
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="test-steps">
          {(provided) => (
            <div className="table-wrapper" {...provided.droppableProps} ref={provided.innerRef}>
              <table className="test-procedures-table">
                <thead>
                  <tr>
                    <th>Step No</th>
                    <th>Required Action</th>
                    <th>Expected Result</th>
                    <th>Prerequisite</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {procedures.map((proc, index) => (
                    <Draggable key={proc.test_procedures_id} draggableId={proc.test_procedures_id.toString()} index={index}>
                      {(provided) => (
                        <tr ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                          <td>{index + 1}</td>
                          <td>{proc.required_action}</td>
                          <td>{proc.expected_result}</td>
                          <td>{proc.prerequisite}</td>
                          <td>
                            <button className="edit-btn" onClick={() => handleOpenModal(proc)}>
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button className="delete-btn" onClick={() => handleDeleteStep(proc.test_procedures_id)}>
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </td>
                        </tr>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </tbody>
              </table>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-btn" onClick={handleCloseModal}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h3>{editingStep ? "Edit Test Step" : "Create Test Step"}</h3>
            <label>Required Action</label>
            <input type="text" name="required_action" value={newStep.required_action} onChange={handleChange} />

            <label>Expected Result</label>
            <input type="text" name="expected_result" value={newStep.expected_result} onChange={handleChange} />

            <label>Prerequisite</label>
            <input type="text" name="prerequisite" value={newStep.prerequisite} onChange={handleChange} />

            <button className="save-btn" onClick={handleSaveStep}>
              <FontAwesomeIcon icon={faSave} /> {editingStep ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestProcedures;