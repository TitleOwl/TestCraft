import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faTrash, faTimes, faEdit, faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import axios from "axios";
import "./testcase_css/TestProcedures.css";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // or quill.bubble.css

const TestProcedures = () => {
  const [procedures, setProcedures] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [newStep, setNewStep] = useState({ required_action: "", expected_result: "", prerequisite: "" });
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const testcaseId = queryParams.get("testcase_id");
  const [isTableExpanded, setIsTableExpanded] = useState(true);

  useEffect(() => {
    fetchTestProcedures();
  }, [testcaseId]);

  const fetchTestProcedures = useCallback(() => {
    if (!testcaseId) { setProcedures([]); return; };
    axios.get(`http://localhost:3001/api/test-procedures?testcase_id=${testcaseId}`)
      .then((response) => { setProcedures(response.data || []); })
      .catch((error) => { console.error("Error fetching data:", error); setProcedures([]); });
  }, [testcaseId]);

  useEffect(() => { fetchTestProcedures(); }, [fetchTestProcedures]);

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

  const handleQuillChange = (content, fieldName) => {
    setNewStep(prev => ({ ...prev, [fieldName]: content }));
  };

  const handleSaveStep = useCallback(() => {
    if (!testcaseId) return;
    // newStep ตอนนี้เป็น object ที่มี HTML string
    const apiCall = editingStep
      ? axios.put(`http://localhost:3001/api/test-procedures/${editingStep.test_procedures_id}`, newStep)
      : axios.post("http://localhost:3001/api/test-procedures", { testcase_id: testcaseId, ...newStep });
    apiCall
      .then(() => { fetchTestProcedures(); handleCloseModal(); })
      .catch((error) => console.error(`Error ${editingStep ? 'updating' : 'saving'} data:`, error));
  }, [editingStep, newStep, testcaseId, fetchTestProcedures]);

  const handleDeleteStep = useCallback((id) => {
    if (window.confirm("Are you sure you want to delete this test procedure?")) {
      axios.delete(`http://localhost:3001/api/test-procedures/${id}`)
        .then(() => fetchTestProcedures())
        .catch((error) => console.error("Error deleting data:", error));
    }
  });

  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;
    const reorderedProcedures = Array.from(procedures);
    const [movedStep] = reorderedProcedures.splice(result.source.index, 1);
    reorderedProcedures.splice(result.destination.index, 0, movedStep);
    setProcedures(reorderedProcedures);
  });

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'], // เพิ่ม italic, underline
      [{ 'color': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }], // เพิ่ม list
      ['clean']
    ],
  };
  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'color',
    'list', 'bullet'
  ];

  return (
    <div className={`test-procedures-container-testprocedures ${isTableExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="test-procedures-header-testprocedures">
        <div className="test-procedures-header-actions-testprocedures">
          <h3>Test Step</h3>
          <button className="add-test-step-btn" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} /> Add Test Step
          </button>
        </div>
      </div>

      <div className={`table-wrapper-testprocedures ${isTableExpanded ? '' : 'collapsed'}`}>
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
              <tr key={proc.test_procedures_id}>
                <td>{index + 1}</td>
                <td><div className="procedure-content-display-testprocedures" dangerouslySetInnerHTML={{ __html: proc.required_action || '' }} /></td>
                <td><div className="procedure-content-display-testprocedures" dangerouslySetInnerHTML={{ __html: proc.expected_result || '' }} /></td>
                <td><div className="procedure-content-display-testprocedures" dangerouslySetInnerHTML={{ __html: proc.prerequisite || '' }} /></td>
                <td>
                  <button className="edit-btn-testprocedures" onClick={() => handleOpenModal(proc)}> <FontAwesomeIcon icon={faEdit} /> </button>
                  <button className="delete-btn-testprocedures" onClick={() => handleDeleteStep(proc.test_procedures_id)}> <FontAwesomeIcon icon={faTrash} /> </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Modal --- */}
      {isModalOpen && (
        <div className="modal-overlay-testprocedures">
          <div className="modal-content-testprocedures">
            {/* เพิ่ม Modal Header เพื่อให้มี Title และปุ่มปิดแยกส่วน */}
            <div className="modal-header-testprocedures">
              <h3 className="modal-title-testprocedures">{editingStep ? "Edit Test Step" : "Add Test Step"}</h3>
              <button className="modal-close-btn-testprocedures" onClick={handleCloseModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* เพิ่ม Modal Body เพื่อครอบ content */}
            <div className="modal-body-testprocedures">
              {/* ใช้ div ครอบ label และ editor แต่ละชุด */}
              <div className="modal-form-group-testprocedures">
                <label htmlFor="required_action_modal">Required Action</label>
                <ReactQuill
                  id="required_action_modal"
                  theme="snow"
                  value={newStep.required_action}
                  onChange={(content) => handleQuillChange(content, 'required_action')}
                  modules={quillModules}
                  formats={quillFormats}
                  className="modal-rte-testprocedures"
                  placeholder="Describe the action required..."
                />
              </div>

              <div className="modal-form-group-testprocedures">
                <label htmlFor="expected_result_modal">Expected Result</label>
                <ReactQuill
                  id="expected_result_modal"
                  theme="snow"
                  value={newStep.expected_result}
                  onChange={(content) => handleQuillChange(content, 'expected_result')}
                  modules={quillModules}
                  formats={quillFormats}
                  className="modal-rte-testprocedures"
                  placeholder="Describe the expected outcome..."
                />
              </div>

              <div className="modal-form-group-testprocedures">
                <label htmlFor="prerequisite_modal">Prerequisite</label>
                <ReactQuill
                  id="prerequisite_modal"
                  theme="snow"
                  value={newStep.prerequisite}
                  onChange={(content) => handleQuillChange(content, 'prerequisite')}
                  modules={quillModules}
                  formats={quillFormats}
                  className="modal-rte-testprocedures"
                  placeholder="List any prerequisites..."
                />
              </div>
            </div> {/* ปิด modal-body-testprocedures */}

            {/* เพิ่ม Modal Footer สำหรับปุ่ม */}
            <div className="modal-footer-testprocedures">
              <button className="save-btn-testprocedures" onClick={handleSaveStep}>
                <FontAwesomeIcon icon={editingStep ? faSave : faPlus} /> {editingStep ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestProcedures;