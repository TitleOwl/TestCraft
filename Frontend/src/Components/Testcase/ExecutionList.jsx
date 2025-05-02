import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import "./testcase_css/ExecutionList.css"; // ตรวจสอบ path ให้ถูกต้อง

const ExecutionList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const project_id = queryParams.get("project_id");
  const [testExecutions, setTestExecutions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (project_id) {
      axios
        // Endpoint นี้ส่ง test_execution_status มาแล้วตามโค้ด backend ที่ให้มา
        .get(`http://localhost:3001/api/testcase_executions?project_id=${project_id}`)
        .then((response) => {
          // ตรวจสอบข้อมูลที่ได้รับจาก API (optional)
          console.log("Fetched data:", response.data);
          setTestExecutions(response.data);
        })
        .catch((error) => console.error("Error fetching test executions:", error));
    }
  }, [project_id]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const options = { day: "2-digit", month: "long", year: "numeric" };
    return new Date(dateString).toLocaleDateString("th-TH", options);
  };

  // การกรองข้อมูลยังคงเหมือนเดิม
  const filteredExecutions = testExecutions.filter((execution) =>
    // ตรวจสอบว่า execution.testcase_id ไม่ใช่ null หรือ undefined ก่อนเรียก toString()
    execution.testcase_id?.toString().includes(searchTerm)
  );

  const handleNavigate = (execution) => {
    // เงื่อนไขการ navigate ยังคงตรวจสอบ testcase_status (สถานะของ Test Case ไม่ใช่สถานะ Execution)
    if (execution.testcase_status !== "BASELINE") {
      Swal.fire({
        icon: "warning",
        title: "ไม่สามารถดำเนินการได้", // อาจจะเปลี่ยนข้อความเป็น "ไม่สามารถดูรายละเอียด Execution ได้" หรือ "ไม่สามารถรันได้" ขึ้นอยู่กับปุ่ม View ทำอะไรต่อ
        text: "Test Case นี้ยังไม่อยู่ในสถานะ BASELINE",
        confirmButtonText: "ตกลง",
      });
    } else {
      // Navigate ไปยังหน้า TestExecution พร้อม testcase_id และ project_id
      console.log(`Navigating to TestExecution for testcase ${execution.testcase_id} with project_id ${project_id}`);
      navigate(`/TestExecution/${execution.testcase_id}?project_id=${project_id}`);
    }
  };

  return (
    <div className="execution-list">
      <button onClick={() => navigate(`/Dashboard?project_id=${project_id}`, { state: { selectedSection: "Testcase" } })}>
        Back
      </button>
      <h2>Test Execution</h2>
      <div className="search-bar-execution-list">
        <input
          type="text"
          placeholder="Search by Test Case ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <table>
        <thead>
          <tr>
            {/* ----- แก้ไข Headers ตรงนี้ ----- */}
            <th>Test Case ID</th>
            <th>Test Title</th>
            <th>Execute Status</th> {/* หัวข้อสำหรับสถานะ Execution */}
            <th>Completion Date</th> {/* หัวข้อสำหรับวันที่ */}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredExecutions.length > 0 ? (
            filteredExecutions.map((execution) => (
              // ควรใช้ key ที่ unique จริงๆ หาก test_execution_id มีในข้อมูล ควรใช้ตัวนั้น
              // แต่จาก query backend ที่ให้มา ไม่มี test_execution_id จึงใช้ testcase_id ไปก่อน
              <tr key={execution.testcase_id}>
                <td>TC-{execution.testcase_id.toString().padStart(3, "0")}</td>
                <td>{execution.testcase_name || "N/A"}</td>

                {/* ----- แสดง test_execution_status ตรงนี้ ----- */}
                <td>{execution.test_execution_status || "N/A"}</td>

                {/* ----- แสดง วันที่ ตรงนี้ ----- */}
                <td>{formatDate(execution.testcase_at)}</td>

                <td>
                  <button
                    className="execute-btn-execution-list"
                    onClick={() => handleNavigate(execution)}
                  >
                    View {/* หรือ Execute? ขึ้นอยู่กับหน้าที่ของปุ่ม */}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              {/* ----- colSpan ยังคงเป็น 5 เพราะมี 5 คอลัมน์ ----- */}
              <td colSpan="5" className="no-data-execution-list">
                No test executions found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ExecutionList;