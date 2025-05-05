import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./Overview.css"; // ตรวจสอบว่า import CSS ไฟล์นี้

const OverviewProject = () => {
  // --- State Variables ---
  const [totalRequirements, setTotalRequirements] = useState(0);
  const [totalBaselineRequirements, setTotalBaselineRequirements] = useState(0);
  const [totalDesign, setTotalDesign] = useState(0);
  const [totalBaselineDesign, setTotalBaselineDesign] = useState(0);
  const [totalImplementation, setTotalImplementation] = useState(0);
  const [totalTestcases, setTotalTestcases] = useState(0);
  const [totalBaselineTestcases, setTotalBaselineTestcases] = useState(0);
  const [projectName, setProjectName] = useState("Project"); // ตั้งค่าเริ่มต้น หรือดึงชื่อโปรเจกต์จริง
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Get Project ID ---
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  // --- Fetch Data ---
  useEffect(() => {
    if (projectId) {
      setLoading(true);
      setError(null);
      axios
        .get(`http://localhost:3001/overviewcount?project_id=${projectId}`)
        .then((response) => {
          const data = response.data || {};
          setTotalRequirements(data.total_requirements || 0);
          setTotalBaselineRequirements(data.total_baseline_requirements || 0);
          setTotalDesign(data.total_design || 0);
          setTotalBaselineDesign(data.total_baseline_design || 0);
          setTotalImplementation(data.total_implementation || 0);
          setTotalTestcases(data.total_testcases || 0);
          setTotalBaselineTestcases(data.total_baseline_testcases || 0);
          // หาก API ส่ง project_name มาด้วย ให้ uncomment บรรทัดนี้
          // setProjectName(data.project_name || `Project ${projectId}`);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching overview data:", err);
          setError("Could not fetch project data. Please try again later.");
          setLoading(false);
        });
    } else {
      setError("Project ID is missing.");
      setLoading(false);
    }
  }, [projectId]);

  // --- Define Colors (UPDATED to match CSS variables) ---
  // ใช้ค่า Hex code ที่ตรงกับ CSS Variables ที่กำหนดไว้
  const COLORS = {
    REQUIREMENTS: {
      BASELINE: "#0056B3",     // Corresponds to --req-color-primary
      NON_BASELINE: "#FFB74D", // Corresponds to --req-color-secondary
      PLACEHOLDER: "#e9ecef"   // Use the defined placeholder color
    },
    DESIGN: {
      BASELINE: "#d76000",     // Corresponds to --des-color-primary
      NON_BASELINE: "#42A5F5", // Corresponds to --des-color-secondary
      PLACEHOLDER: "#e9ecef"
    },
    TESTCASES: {
      BASELINE: "#10b981",     // Corresponds to --test-color-primary
      NON_BASELINE: "#BA68C8", // Corresponds to --test-color-secondary
      PLACEHOLDER: "#e9ecef"
    },
    LABEL_TEXT: "#ffffff", // สีข้อความ % บนกราฟ (ปรับได้ถ้าต้องการ)
  };

  // --- Prepare Data for Pie Charts (No changes needed here) ---
  const requirementsPieData = [
    { name: "Baseline", value: totalBaselineRequirements, color: COLORS.REQUIREMENTS.BASELINE },
    { name: "Non-Baseline", value: Math.max(0, totalRequirements - totalBaselineRequirements), color: COLORS.REQUIREMENTS.NON_BASELINE },
  ].filter(item => item.value > 0);
  const requirementsPlaceholderData = [{ name: "No Data", value: 1, color: COLORS.REQUIREMENTS.PLACEHOLDER }];

  const designPieData = [
    { name: "Baseline", value: totalBaselineDesign, color: COLORS.DESIGN.BASELINE },
    { name: "Non-Baseline", value: Math.max(0, totalDesign - totalBaselineDesign), color: COLORS.DESIGN.NON_BASELINE },
  ].filter(item => item.value > 0);
  const designPlaceholderData = [{ name: "No Data", value: 1, color: COLORS.DESIGN.PLACEHOLDER }];

  const testcasePieData = [
    { name: "Baseline", value: totalBaselineTestcases, color: COLORS.TESTCASES.BASELINE },
    { name: "Non-Baseline", value: Math.max(0, totalTestcases - totalBaselineTestcases), color: COLORS.TESTCASES.NON_BASELINE },
  ].filter(item => item.value > 0);
  const testcasePlaceholderData = [{ name: "No Data", value: 1, color: COLORS.TESTCASES.PLACEHOLDER }];

  // --- Custom Label Function (No changes needed here) ---
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // ไม่แสดง label ถ้า % น้อยไป หรือเป็น Placeholder
    if (percent < 0.05 || payload.name === "No Data") return null;

    // ลองปรับปรุงให้อ่านง่ายขึ้นบนสีเข้ม/อ่อนต่างกัน
    // อาจจะต้องเช็คสีพื้นหลัง (payload.color) แล้วเลือกสี text ขาว/ดำ
    // แต่เพื่อความง่าย ใช้สีขาวตามเดิมไปก่อน
    let labelColor = COLORS.LABEL_TEXT;

    return (
      <text x={x} y={y} fill={labelColor} textAnchor="middle" dominantBaseline="central" fontSize="12px" fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // --- Render Loading/Error (No changes needed here) ---
  if (loading) {
    return <div className="status-container loading-container">Loading project overview...</div>;
  }

  if (error) {
    return <div className="status-container error-container">{error}</div>;
  }

  // --- Render Dashboard (No changes needed in JSX structure) ---
  return (
    <div className="dashboard-overview-container">
      <header className="overview-header">
        <h1>{projectName} Overview</h1>

      </header>

      <div className="overview-cards-grid">

        {/* Requirements Card */}
        <div className="chart-card">
          <h3>Requirements Specification</h3>
          <div className="card-summary-inline">
            <div className="inline-stat">
              <span className="label">Total</span>
              <span className="value">{totalRequirements}</span>
            </div>
            <div className="inline-stat">
              <span className="label">Baseline</span>
              <span className="value">{totalBaselineRequirements}</span>
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={totalRequirements > 0 ? requirementsPieData : requirementsPlaceholderData}
                  cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel}
                  innerRadius={60} outerRadius={85}
                  fill="#8884d8" // Default fill, overridden by Cell
                  paddingAngle={totalRequirements > 0 && requirementsPieData.length > 1 ? 5 : 0}
                  dataKey="value" nameKey="name"
                  isAnimationActive={true}
                >
                  {(totalRequirements > 0 ? requirementsPieData : requirementsPlaceholderData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                  ))}
                </Pie>
                {totalRequirements > 0 && <Tooltip formatter={(value, name) => [`${value} items`, name]} />}
                {totalRequirements > 0 && <Legend iconType="circle" verticalAlign="bottom" height={36}/>}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Design Card */}
        <div className="chart-card">
          <h3>Software Design</h3>
           <div className="card-summary-inline">
            <div className="inline-stat">
              <span className="label">Total</span>
              <span className="value">{totalDesign}</span>
            </div>
            <div className="inline-stat">
              <span className="label">Baseline</span>
              <span className="value">{totalBaselineDesign}</span>
            </div>
          </div>
           <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={totalDesign > 0 ? designPieData : designPlaceholderData}
                  cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel}
                  innerRadius={60} outerRadius={85} fill="#ffc658" // Default fill, overridden by Cell
                  paddingAngle={totalDesign > 0 && designPieData.length > 1 ? 5 : 0}
                  dataKey="value" nameKey="name"
                  isAnimationActive={true}
                >
                   {(totalDesign > 0 ? designPieData : designPlaceholderData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                  ))}
                </Pie>
                {totalDesign > 0 && <Tooltip formatter={(value, name) => [`${value} items`, name]} />}
                {totalDesign > 0 && <Legend iconType="circle" verticalAlign="bottom" height={36}/>}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Implementation Summary Card */}
        <div className="chart-card implementation-summary-card">
          <h3>Code Component</h3>
          <div className="card-summary-single">
            <span className="label">Linked Artifacts</span>
            <span className="value">{totalImplementation}</span>
            <div className="implementation-icon">
               🔗
            </div>
          </div>
        </div>

        {/* Test Case Card */}
        <div className="chart-card">
          <h3>Test Cases</h3>
          <div className="card-summary-inline">
            <div className="inline-stat">
              <span className="label">Total</span>
              <span className="value">{totalTestcases}</span>
            </div>
            <div className="inline-stat">
              <span className="label">Baseline</span>
              <span className="value">{totalBaselineTestcases}</span>
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={totalTestcases > 0 ? testcasePieData : testcasePlaceholderData}
                  cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel}
                  innerRadius={60} outerRadius={85} fill="#0088FE" // Default fill, overridden by Cell
                  paddingAngle={totalTestcases > 0 && testcasePieData.length > 1 ? 5 : 0}
                  dataKey="value" nameKey="name"
                  isAnimationActive={true}
                >
                   {(totalTestcases > 0 ? testcasePieData : testcasePlaceholderData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                  ))}
                </Pie>
                {totalTestcases > 0 && <Tooltip formatter={(value, name) => [`${value} cases`, name]} />}
                {totalTestcases > 0 && <Legend iconType="circle" verticalAlign="bottom" height={36}/>}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div> {/* ปิด overview-cards-grid */}
    </div> // ปิด dashboard-overview-container
  );
};

export default OverviewProject;