import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import Swal from "sweetalert2";
import "./testcase_css/CreateTestcase.css";

const UpdateTestcase = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testcaseId = searchParams.get("testcase_id");
  const projectId = searchParams.get("project_id");

  const [testcase, setTestcase] = useState({
    testcase_name: "",
    testcase_des: "",
    testcase_type: "",
    testcase_priority: "",
    testcase_by: "",
    testcase_at: "",
    testcase_status: "WORKING",
    project_id: projectId || "",
    implement_id: "",
  });

  const [initialTestcase, setInitialTestcase] = useState({});
  const [implementFiles, setImplementFiles] = useState([]);
  const [selectedImplement, setSelectedImplement] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchTestcase = async () => {
      if (!testcaseId) return;
      try {
        const response = await axios.get(`http://localhost:3001/testcaseedit/${testcaseId}`);
        console.log("✅ Test Case Data:", response.data);
  
        const formattedDate = response.data.testcase_at
          ? new Date(response.data.testcase_at).toISOString().split("T")[0]
          : "";
  
        setTestcase({ ...response.data, testcase_at: formattedDate }); // ✅ ใส่ formattedDate
        setInitialTestcase({ ...response.data, testcase_at: formattedDate }); // ✅ เก็บค่าเริ่มต้น
        setSelectedImplement({
          value: response.data.implement_id,
          label: `Implement ID: ${response.data.implement_id}`
        });
      } catch (error) {
        console.error("❌ Error fetching test case:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchTestcase();
  }, [testcaseId]);
  
  const handleChange = (e) => {
    setTestcase({ ...testcase, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (selectedOption) => {
    setSelectedImplement(selectedOption);
    setTestcase({ ...testcase, implement_id: selectedOption?.value || "" });
  };

  const handleUpdateTestCase = async () => {
    const hasChanges = JSON.stringify(testcase) !== JSON.stringify(initialTestcase);

    if (!hasChanges) {
      Swal.fire({
        title: "No Changes Detected",
        text: "ไม่มีการเปลี่ยนแปลงข้อมูล",
        icon: "info",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const confirmUpdate = await Swal.fire({
      title: "ยืนยันการอัปเดต?",
      text: "คุณต้องการอัปเดต Test Case หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ตกลง",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirmUpdate.isConfirmed) return;

    try {
      await axios.put(`http://localhost:3001/testcaseedit/${testcaseId}`, testcase);
      Swal.fire({
        title: "อัปเดตสำเร็จ!",
        text: "Test Case ถูกอัปเดตเรียบร้อยแล้ว",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        navigate(`/Dashboard?project_id=${testcase.project_id}`);
      });
    } catch (error) {
      console.error("❌ Error updating test case:", error);
      Swal.fire("Error", "ไม่สามารถอัปเดต Test Case ได้ กรุณาลองใหม่อีกครั้ง", "error");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="create-testcase">
      <h2>Edit Test Case</h2>

      {[{ label: "Title", name: "testcase_name", value: testcase.testcase_name },
        { label: "Description", name: "testcase_des", value: testcase.testcase_des }].map(({ label, name, value }) => (
          <div key={name} className="create-testcase-form-group">
            <label>{label}:</label>
            <input type="text" name={name} value={value} onChange={handleChange} />
          </div>
        ))}

      <div className="create-testcase-form-group">
        <label>Test Type:</label>
        <select name="testcase_type" value={testcase.testcase_type} onChange={handleChange}>
          <option value="">Select Test Type</option>
          <option value="Functional Testing">Unit Test</option>
          <option value="Non-Functional Testing">Integration Test</option>
          <option value="Regression Testing">System Test</option>
          <option value="Performance Testing">Acceptance Test</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="create-testcase-form-group">
        <label>Priority:</label>
        <select name="testcase_priority" value={testcase.testcase_priority} onChange={handleChange}>
          <option value="">Select Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="create-testcase-form-group">
        <label>Test Completion Date:</label>
        <input type="date" name="testcase_at" value={testcase.testcase_at} onChange={handleChange} />
      </div>

      <div className="create-testcase-form-group">
        <label>Select Implement:</label>
        <Select
          options={implementFiles.map(item => ({
            value: item.implement_id,
            label: `${item.implement_filename} (ID: ${item.implement_id})`
          }))}
          value={selectedImplement}
          onChange={handleSelectChange}
        />
      </div>

      <div className="create-testcase-button-group">
        <button onClick={() => navigate(`/Dashboard?project_id=${testcase.project_id}`)} className="create-testcase-cancel-button">Cancel</button>
        <button onClick={handleUpdateTestCase} className="create-testcase-save-button">Update</button>
      </div>
    </div>
  );
};

export default UpdateTestcase;
