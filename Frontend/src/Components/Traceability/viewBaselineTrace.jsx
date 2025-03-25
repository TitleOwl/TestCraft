import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ViewBaselineTrace = () => {
  const [baselineData, setBaselineData] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
      axios.get(`http://localhost:3001/viewBaselineTrace?project_id=${projectId}`)
        .then(response => {
          setProjectName(response.data.project_name); // ดึง project_name จาก response ที่ root ของ JSON
          setBaselineData(response.data.data); // ดึงข้อมูล baseline trace
          setLoading(false);
        })
        .catch(error => {
          console.error("Error fetching baseline data:", error);
          setError('Error fetching baseline data');
          setLoading(false);
        });
    }
  }, [projectId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  // กรองข้อมูลให้แสดงเพียงรอบเดียวต่อ `baselinetrace_round`
  const uniqueBaselineRounds = Array.from(new Set(baselineData.map(item => item.baselinetrace_round)))
    .map(round => baselineData.find(item => item.baselinetrace_round === round));

  const handleViewRound = (round) => {
    navigate(`/viewBaselineRound?project_id=${projectId}&round=${round}`);
  };

  return (
    <div>
      <button className="viewbaseline-to-trace" onClick={() =>
        navigate(`/Dashboard?project_id=${projectId}`, {
          state: { selectedSection: "Traceability" },
        })
      }>Back</button>

      <button className="setbaseline-trace" onClick={() => navigate(`/setBaselineTrace?project_id=${projectId}`)}>Set Baseline</button>
      <h2>Baseline Traceability Record for Project {projectName}</h2>
      <table>
        <thead>
          <tr>
            <th>Baseline Round</th>
            <th>Set Baseline By</th>
            <th>Set Baseline At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {uniqueBaselineRounds.map((item, index) => (
            <tr key={index}>
              <td>{`BL-${item.baselinetrace_round}`}</td>
              <td>{item.baselinetrace_by}</td>
              <td>{new Date(item.baselinetrace_at).toISOString().split('T')[0]}</td>
              <td>
                <button onClick={() => handleViewRound(item.baselinetrace_round)}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ViewBaselineTrace;